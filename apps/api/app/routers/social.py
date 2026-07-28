"""Follow graph, activity feed, search, similar profiles, notifications."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user, get_db, get_optional_user
from app.models import (
    ActivityEvent,
    Follow,
    MediaPost,
    Notification,
    Profile,
    User,
)
from app.schemas import (
    ActivityEventOut,
    ActivityFeedOut,
    FollowStatusOut,
    NotificationOut,
    SearchResultOut,
    SimilarProfileOut,
    UserCardOut,
)
from app.services.activity import notify, record_activity
from app.services.cache import invalidate_profile
from app.services.matching import similar_profiles
from app.services.profile_service import get_profile_by_username

router = APIRouter(tags=["social"])


def _card(profile: Profile) -> UserCardOut:
    return UserCardOut(
        id=profile.user_id,
        username=profile.user.username,
        display_name=profile.display_name,
        headline=profile.headline,
        avatar_url=profile.avatar_url,
    )


@router.post("/social/follow/{username}", response_model=FollowStatusOut)
def follow_user(
    username: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FollowStatusOut:
    target = db.query(User).filter(User.username == username.lower()).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if target.id == user.id:
        raise HTTPException(status_code=400, detail="No podés seguirte a vos mismo")
    existing = (
        db.query(Follow)
        .filter(Follow.follower_id == user.id, Follow.following_id == target.id)
        .first()
    )
    if not existing:
        db.add(Follow(follower_id=user.id, following_id=target.id))
        profile = get_profile_by_username(db, target.username)
        record_activity(
            db,
            actor=user,
            event_type="follow",
            summary=f"@{user.username} empezó a seguir a @{target.username}",
            profile=profile,
            ref_id=target.id,
        )
        notify(
            db,
            user_id=target.id,
            actor=user,
            notif_type="follow",
            body=f"@{user.username} te sigue",
            ref_id=user.id,
        )
        db.commit()
        invalidate_profile(target.username)
        invalidate_profile(user.username)
    return _follow_status(db, user, target)


@router.delete("/social/follow/{username}", response_model=FollowStatusOut)
def unfollow_user(
    username: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FollowStatusOut:
    target = db.query(User).filter(User.username == username.lower()).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    row = (
        db.query(Follow)
        .filter(Follow.follower_id == user.id, Follow.following_id == target.id)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()
        invalidate_profile(target.username)
        invalidate_profile(user.username)
    return _follow_status(db, user, target)


def _follow_status(db: Session, viewer: User, target: User) -> FollowStatusOut:
    following = (
        db.query(Follow)
        .filter(Follow.follower_id == viewer.id, Follow.following_id == target.id)
        .first()
        is not None
    )
    return FollowStatusOut(
        following=following,
        follower_count=db.query(Follow).filter(Follow.following_id == target.id).count(),
        following_count=db.query(Follow).filter(Follow.follower_id == target.id).count(),
    )


@router.get("/social/followers/{username}", response_model=list[UserCardOut])
def list_followers(username: str, db: Session = Depends(get_db)) -> list[UserCardOut]:
    target = db.query(User).filter(User.username == username.lower()).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    rows = (
        db.query(Follow)
        .filter(Follow.following_id == target.id)
        .order_by(Follow.created_at.desc())
        .limit(100)
        .all()
    )
    out: list[UserCardOut] = []
    for row in rows:
        follower = db.get(User, row.follower_id)
        if follower and follower.profile:
            out.append(_card(follower.profile))
    return out


@router.get("/social/following/{username}", response_model=list[UserCardOut])
def list_following(username: str, db: Session = Depends(get_db)) -> list[UserCardOut]:
    target = db.query(User).filter(User.username == username.lower()).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    rows = (
        db.query(Follow)
        .filter(Follow.follower_id == target.id)
        .order_by(Follow.created_at.desc())
        .limit(100)
        .all()
    )
    out: list[UserCardOut] = []
    for row in rows:
        followed = db.get(User, row.following_id)
        if followed and followed.profile:
            out.append(_card(followed.profile))
    return out


@router.get("/social/feed", response_model=ActivityFeedOut)
def activity_feed(
    cursor: int | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ActivityFeedOut:
    following_ids = [
        r.following_id
        for r in db.query(Follow).filter(Follow.follower_id == user.id).all()
    ]
    actor_ids = following_ids + [user.id]
    q = (
        db.query(ActivityEvent)
        .filter(ActivityEvent.actor_user_id.in_(actor_ids))
        .order_by(ActivityEvent.id.desc())
    )
    if cursor:
        q = q.filter(ActivityEvent.id < cursor)
    events = q.limit(limit + 1).all()
    has_more = len(events) > limit
    events = events[:limit]
    items: list[ActivityEventOut] = []
    for ev in events:
        actor = db.get(User, ev.actor_user_id)
        if not actor:
            continue
        profile_username = None
        media_url = None
        if ev.profile_id:
            prof = db.get(Profile, ev.profile_id)
            if prof and prof.user:
                profile_username = prof.user.username
        if ev.event_type == "media" and ev.ref_id:
            media = db.get(MediaPost, ev.ref_id)
            if media:
                media_url = media.url
        items.append(
            ActivityEventOut(
                id=ev.id,
                event_type=ev.event_type,
                summary=ev.summary,
                actor_username=actor.username,
                actor_display_name=actor.profile.display_name if actor.profile else actor.username,
                profile_username=profile_username,
                ref_id=ev.ref_id,
                created_at=ev.created_at or datetime.now(timezone.utc),
                media_url=media_url,
            )
        )
    return ActivityFeedOut(
        items=items,
        next_cursor=items[-1].id if has_more and items else None,
    )


@router.get("/search", response_model=SearchResultOut)
def search_profiles(
    q: str = Query(min_length=1, max_length=80),
    cursor: int | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    _viewer: User | None = Depends(get_optional_user),
) -> SearchResultOut:
    term = f"%{q.strip().lower()}%"
    query = (
        db.query(Profile)
        .join(User, Profile.user_id == User.id)
        .options(joinedload(Profile.user))
        .filter(
            or_(
                User.username.ilike(term),
                Profile.display_name.ilike(term),
                Profile.headline.ilike(term),
                Profile.location.ilike(term),
            )
        )
        .order_by(Profile.id.desc())
    )
    if cursor:
        query = query.filter(Profile.id < cursor)
    rows = query.limit(limit + 1).all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    items = [_card(p) for p in rows]
    return SearchResultOut(
        items=items,
        next_cursor=rows[-1].id if has_more and rows else None,
    )


@router.get("/social/similar/{username}", response_model=list[SimilarProfileOut])
def get_similar(
    username: str,
    limit: int = Query(default=8, ge=1, le=20),
    db: Session = Depends(get_db),
) -> list[SimilarProfileOut]:
    return similar_profiles(db, username, limit=limit)


@router.get("/notifications", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[NotificationOut]:
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.id.desc())
        .limit(50)
        .all()
    )
    out: list[NotificationOut] = []
    for n in rows:
        actor = db.get(User, n.actor_user_id) if n.actor_user_id else None
        out.append(
            NotificationOut(
                id=n.id,
                notif_type=n.notif_type,
                body=n.body,
                actor_username=actor.username if actor else None,
                ref_id=n.ref_id,
                read_at=n.read_at,
                created_at=n.created_at or datetime.now(timezone.utc),
            )
        )
    return out


@router.get("/notifications/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    count = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.read_at.is_(None))
        .count()
    )
    return {"count": count}


@router.post("/notifications/read-all")
def read_all(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    now = datetime.now(timezone.utc)
    (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.read_at.is_(None))
        .update({"read_at": now})
    )
    db.commit()
    return {"ok": True}
