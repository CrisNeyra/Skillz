from datetime import datetime
import re

from sqlalchemy.orm import Session, joinedload

from app.models import (
    Comment,
    CustomizationSettings,
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


def media_to_out(m: MediaPost | None) -> MediaOut | None:
    if m is None:
        return None
    return MediaOut.model_validate(m)


def build_layout(media: list[MediaPost]) -> LayoutSlots:
    by_slot = {m.slot: m for m in media if m.is_active}
    return LayoutSlots(
        hero=media_to_out(by_slot.get("hero")),
        left=[media_to_out(by_slot.get(f"left_{i}")) for i in range(1, 4)],
        right=[media_to_out(by_slot.get(f"right_{i}")) for i in range(1, 4)],
    )


def get_profile_by_username(db: Session, username: str) -> Profile | None:
    user = db.query(User).filter(User.username == username.lower()).first()
    if not user:
        return None
    return (
        db.query(Profile)
        .options(
            joinedload(Profile.customization),
            joinedload(Profile.media_posts),
            joinedload(Profile.skills).joinedload(ProfileSkill.skill_tag),
            joinedload(Profile.skills).joinedload(ProfileSkill.endorsements),
            joinedload(Profile.diplomas),
            joinedload(Profile.experiences),
            joinedload(Profile.links),
            joinedload(Profile.comments).joinedload(Comment.author),
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


def serialize_profile(profile: Profile, viewer: User | None = None) -> ProfileBundle:
    customization = profile.customization or CustomizationSettings(
        profile_id=profile.id, font_family="Space Grotesk", bg_color="#ffffff"
    )
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
    comments = [
        CommentOut(
            id=c.id,
            body=c.body,
            author_username=c.author.username,
            author_id=c.author_id,
            parent_id=c.parent_id,
            created_at=c.created_at or datetime.utcnow(),
        )
        for c in sorted(profile.comments, key=lambda x: x.created_at or datetime.utcnow(), reverse=True)
    ]
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
        layout=build_layout(list(profile.media_posts)),
        skills=skills,
        diplomas=[DiplomaOut.model_validate(d) for d in profile.diplomas],
        experiences=[ExperienceOut.model_validate(e) for e in profile.experiences],
        links=[LinkOut.model_validate(link) for link in sorted(profile.links, key=lambda l: l.sort_order)],
        comments=comments,
        is_owner=bool(viewer and viewer.id == profile.user_id),
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
