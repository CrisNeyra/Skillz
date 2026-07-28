from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user, get_db
from app.core.rate_limit import limit_comment
from app.models import (
    Comment,
    CommentLike,
    CommentReport,
    Diploma,
    Endorsement,
    ExternalLink,
    ProfileSkill,
    User,
    WorkExperience,
)
from app.schemas import (
    CommentCreate,
    CommentOut,
    CommentReportIn,
    DiplomaIn,
    DiplomaOut,
    ExperienceIn,
    ExperienceOut,
    LikeStatusOut,
    LinkIn,
    LinkOut,
    PaginatedComments,
    SkillCreate,
    SkillOut,
)
from app.services.activity import notify, record_activity
from app.services.cache import invalidate_profile
from app.services.profile_service import comment_to_out, get_or_create_skill_tag, get_profile_by_username

router = APIRouter(tags=["feed"])


@router.post("/profiles/me/skills", response_model=SkillOut)
def add_skill(
    payload: SkillCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SkillOut:
    profile = get_profile_by_username(db, user.username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    tag = get_or_create_skill_tag(db, payload.name)
    existing = (
        db.query(ProfileSkill)
        .filter(ProfileSkill.profile_id == profile.id, ProfileSkill.skill_tag_id == tag.id)
        .first()
    )
    if existing:
        existing.level = payload.level
        db.commit()
        db.refresh(existing)
        invalidate_profile(user.username)
        return SkillOut(
            id=existing.id,
            name=tag.name,
            slug=tag.slug,
            level=existing.level,
            is_verified=existing.is_verified,
            endorsement_count=len(existing.endorsements),
        )
    ps = ProfileSkill(profile_id=profile.id, skill_tag_id=tag.id, level=payload.level)
    db.add(ps)
    record_activity(
        db,
        actor=user,
        event_type="skill",
        summary=f"@{user.username} agregó la skill {tag.name}",
        profile=profile,
    )
    db.commit()
    db.refresh(ps)
    invalidate_profile(user.username)
    return SkillOut(
        id=ps.id,
        name=tag.name,
        slug=tag.slug,
        level=ps.level,
        is_verified=ps.is_verified,
        endorsement_count=0,
    )


@router.delete("/profiles/me/skills/{skill_id}")
def delete_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    profile = get_profile_by_username(db, user.username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    ps = db.get(ProfileSkill, skill_id)
    if not ps or ps.profile_id != profile.id:
        raise HTTPException(status_code=404, detail="Skill no encontrada")
    db.delete(ps)
    db.commit()
    invalidate_profile(user.username)
    return {"ok": True}


@router.post("/skills/{skill_id}/endorse")
def endorse_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    ps = db.get(ProfileSkill, skill_id)
    if not ps:
        raise HTTPException(status_code=404, detail="Skill no encontrada")
    owner_profile = get_profile_by_username(db, user.username)
    if owner_profile and ps.profile_id == owner_profile.id:
        raise HTTPException(status_code=400, detail="No podés endosar tu propia skill")
    existing = (
        db.query(Endorsement)
        .filter(Endorsement.profile_skill_id == skill_id, Endorsement.endorser_id == user.id)
        .first()
    )
    if existing:
        return {"ok": True, "already": True}
    db.add(Endorsement(profile_skill_id=skill_id, endorser_id=user.id))
    owner = ps.profile.user if ps.profile else None
    if owner:
        notify(
            db,
            user_id=owner.id,
            actor=user,
            notif_type="endorse",
            body=f"@{user.username} endosó tu skill",
            ref_id=skill_id,
        )
        invalidate_profile(owner.username)
    db.commit()
    return {"ok": True}


@router.post("/profiles/me/diplomas", response_model=DiplomaOut)
def add_diploma(
    payload: DiplomaIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DiplomaOut:
    profile = get_profile_by_username(db, user.username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    item = Diploma(profile_id=profile.id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    invalidate_profile(user.username)
    return DiplomaOut.model_validate(item)


@router.post("/profiles/me/experiences", response_model=ExperienceOut)
def add_experience(
    payload: ExperienceIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ExperienceOut:
    profile = get_profile_by_username(db, user.username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    item = WorkExperience(profile_id=profile.id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    invalidate_profile(user.username)
    return ExperienceOut.model_validate(item)


@router.post("/profiles/me/links", response_model=LinkOut)
def add_link(
    payload: LinkIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LinkOut:
    profile = get_profile_by_username(db, user.username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    item = ExternalLink(profile_id=profile.id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    invalidate_profile(user.username)
    return LinkOut.model_validate(item)


@router.get("/profiles/{username}/comments", response_model=PaginatedComments)
def list_comments(
    username: str,
    cursor: int | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
) -> PaginatedComments:
    profile = get_profile_by_username(db, username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    q = (
        db.query(Comment)
        .options(joinedload(Comment.author), joinedload(Comment.likes))
        .filter(Comment.profile_id == profile.id)
        .order_by(Comment.id.desc())
    )
    if cursor:
        q = q.filter(Comment.id < cursor)
    rows = q.limit(limit + 1).all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    items = [comment_to_out(c) for c in rows]
    return PaginatedComments(
        items=items,
        next_cursor=items[-1].id if has_more and items else None,
    )


@router.post("/profiles/{username}/comments", response_model=CommentOut)
def add_comment(
    username: str,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CommentOut:
    limit_comment(user.id)
    profile = get_profile_by_username(db, username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    comment = Comment(
        profile_id=profile.id,
        author_id=user.id,
        body=payload.body,
        parent_id=payload.parent_id,
    )
    db.add(comment)
    record_activity(
        db,
        actor=user,
        event_type="comment",
        summary=f"@{user.username} comentó en el perfil de @{username}",
        profile=profile,
    )
    notify(
        db,
        user_id=profile.user_id,
        actor=user,
        notif_type="comment",
        body=f"@{user.username} comentó tu perfil",
    )
    db.commit()
    db.refresh(comment)
    invalidate_profile(username)
    return CommentOut(
        id=comment.id,
        body=comment.body,
        author_username=user.username,
        author_id=user.id,
        parent_id=comment.parent_id,
        created_at=comment.created_at,
        like_count=0,
        liked_by_me=False,
    )


@router.post("/comments/{comment_id}/like", response_model=LikeStatusOut)
def like_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LikeStatusOut:
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    existing = (
        db.query(CommentLike)
        .filter(CommentLike.comment_id == comment_id, CommentLike.user_id == user.id)
        .first()
    )
    if not existing:
        db.add(CommentLike(comment_id=comment_id, user_id=user.id))
        notify(
            db,
            user_id=comment.author_id,
            actor=user,
            notif_type="like_comment",
            body=f"@{user.username} le dio like a tu comentario",
            ref_id=comment_id,
        )
        db.commit()
    count = db.query(CommentLike).filter(CommentLike.comment_id == comment_id).count()
    return LikeStatusOut(liked=True, like_count=count)


@router.delete("/comments/{comment_id}/like", response_model=LikeStatusOut)
def unlike_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LikeStatusOut:
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    existing = (
        db.query(CommentLike)
        .filter(CommentLike.comment_id == comment_id, CommentLike.user_id == user.id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
    count = db.query(CommentLike).filter(CommentLike.comment_id == comment_id).count()
    return LikeStatusOut(liked=False, like_count=count)


@router.post("/comments/{comment_id}/report")
def report_comment(
    comment_id: int,
    payload: CommentReportIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    existing = (
        db.query(CommentReport)
        .filter(CommentReport.comment_id == comment_id, CommentReport.reporter_id == user.id)
        .first()
    )
    if existing:
        return {"ok": True, "already": True}
    db.add(
        CommentReport(
            comment_id=comment_id,
            reporter_id=user.id,
            reason=payload.reason,
        )
    )
    db.commit()
    return {"ok": True}
