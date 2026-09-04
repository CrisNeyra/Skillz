from datetime import datetime
import re

from sqlalchemy.orm import Session, joinedload

from app.models import (
    Comment,
    CustomizationSettings,
    Follow,
    MediaPost,
    Profile,
    ProfileSkill,
    SkillTag,
    User,
)
from app.schemas import (
    CommentOut,
    CustomizationOut,
    DiplomaOut,
    ExperienceOut,
    LayoutSlots,
    LinkOut,
    MediaOut,
    ProfileBundle,
    ProfilePublic,
    SkillOut,
)

VALID_SLOTS = {
    "hero",
    "left_1",
    "left_2",
    "left_3",
    "right_1",
    "right_2",
    "right_3",
}


def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "skill"


def media_to_out(m: MediaPost | None, viewer_id: int | None = None) -> MediaOut | None:
    if m is None:
        return None
    likes = list(getattr(m, "likes", []) or [])
    return MediaOut(
        id=m.id,
        url=m.url,
        media_type=m.media_type,
        slot=m.slot,
        caption=m.caption,
        cloudinary_public_id=m.cloudinary_public_id,
        like_count=len(likes),
        liked_by_me=bool(viewer_id and any(lk.user_id == viewer_id for lk in likes)),
    )


def build_layout(media: list[MediaPost], viewer_id: int | None = None) -> LayoutSlots:
    by_slot = {m.slot: m for m in media if m.is_active}
    return LayoutSlots(
        hero=media_to_out(by_slot.get("hero"), viewer_id),
        left=[media_to_out(by_slot.get(f"left_{i}"), viewer_id) for i in range(1, 4)],
        right=[media_to_out(by_slot.get(f"right_{i}"), viewer_id) for i in range(1, 4)],
    )


def comment_to_out(c: Comment, viewer_id: int | None = None) -> CommentOut:
    likes = list(getattr(c, "likes", []) or [])
    return CommentOut(
        id=c.id,
        body=c.body,
        author_username=c.author.username,
        author_id=c.author_id,
        parent_id=c.parent_id,
        created_at=c.created_at or datetime.utcnow(),
        like_count=len(likes),
        liked_by_me=bool(viewer_id and any(lk.user_id == viewer_id for lk in likes)),
    )


def get_profile_by_username(db: Session, username: str) -> Profile | None:
    user = db.query(User).filter(User.username == username.lower()).first()
    if not user:
        return None
    return (
        db.query(Profile)
        .options(
            joinedload(Profile.customization),
            joinedload(Profile.media_posts).joinedload(MediaPost.likes),
            joinedload(Profile.skills).joinedload(ProfileSkill.skill_tag),
            joinedload(Profile.skills).joinedload(ProfileSkill.endorsements),
            joinedload(Profile.diplomas),
            joinedload(Profile.experiences),
            joinedload(Profile.links),
            joinedload(Profile.user),
        )
        .filter(Profile.user_id == user.id)
        .first()
    )


def ensure_customization(db: Session, profile: Profile) -> CustomizationSettings:
    if profile.customization:
        return profile.customization
    settings = CustomizationSettings(
        profile_id=profile.id, font_family="Space Grotesk", bg_color="#ffffff"
    )
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


def serialize_profile(
    profile: Profile,
    viewer: User | None = None,
    db: Session | None = None,
    comments_limit: int = 20,
) -> ProfileBundle:
    customization = profile.customization or CustomizationSettings(
        profile_id=profile.id, font_family="Space Grotesk", bg_color="#ffffff"
    )
    viewer_id = viewer.id if viewer else None
    comment_rows: list[Comment] = []
    next_cursor = None
    if db is not None:
        q = (
            db.query(Comment)
            .options(joinedload(Comment.author), joinedload(Comment.likes))
            .filter(Comment.profile_id == profile.id)
            .order_by(Comment.id.desc())
            .limit(comments_limit + 1)
        )
        comment_rows = q.all()
        if len(comment_rows) > comments_limit:
            next_cursor = comment_rows[comments_limit - 1].id
            comment_rows = comment_rows[:comments_limit]
    comments = [comment_to_out(c, viewer_id) for c in comment_rows]
    skills = [
        SkillOut(
            id=ps.id,
            name=ps.skill_tag.name,
            slug=ps.skill_tag.slug,
            level=ps.level,
            is_verified=ps.is_verified,
            endorsement_count=len(ps.endorsements),
        )
        for ps in profile.skills
    ]

    follower_count = 0
    following_count = 0
    is_following = False
    if db is not None:
        follower_count = (
            db.query(Follow).filter(Follow.following_id == profile.user_id).count()
        )
        following_count = (
            db.query(Follow).filter(Follow.follower_id == profile.user_id).count()
        )
        if viewer and viewer.id != profile.user_id:
            is_following = (
                db.query(Follow)
                .filter(
                    Follow.follower_id == viewer.id,
                    Follow.following_id == profile.user_id,
                )
                .first()
                is not None
            )

    return ProfileBundle(
        profile=ProfilePublic(
            id=profile.id,
            display_name=profile.display_name,
            headline=profile.headline,
            bio=profile.bio,
            avatar_url=profile.avatar_url,
            location=profile.location,
            username=profile.user.username,
            linkedin_url=getattr(profile, "linkedin_url", None),
            github_url=getattr(profile, "github_url", None),
            contact_email=getattr(profile, "contact_email", None),
        ),
        customization=CustomizationOut.model_validate(customization),
        layout=build_layout(list(profile.media_posts), viewer_id),
        skills=skills,
        diplomas=[DiplomaOut.model_validate(d) for d in profile.diplomas],
        experiences=[ExperienceOut.model_validate(e) for e in profile.experiences],
        links=[LinkOut.model_validate(link) for link in sorted(profile.links, key=lambda l: l.sort_order)],
        comments=comments,
        is_owner=bool(viewer and viewer.id == profile.user_id),
        is_following=is_following,
        follower_count=follower_count,
        following_count=following_count,
        onboarding_completed=bool(getattr(profile, "onboarding_completed", False)),
        comments_next_cursor=next_cursor,
    )


def get_or_create_skill_tag(db: Session, name: str) -> SkillTag:
    slug = slugify(name)
    tag = db.query(SkillTag).filter(SkillTag.slug == slug).first()
    if tag:
        return tag
    tag = SkillTag(name=name.strip(), slug=slug)
    db.add(tag)
    db.flush()
    return tag
