"""Skill-overlap similarity matching (no embeddings required)."""

from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from app.models import Profile, ProfileSkill, User
from app.schemas import SimilarProfileOut


def skill_slugs(profile: Profile) -> set[str]:
    return {ps.skill_tag.slug for ps in profile.skills if ps.skill_tag}


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def similar_profiles(
    db: Session,
    username: str,
    *,
    limit: int = 8,
    exclude_user_id: int | None = None,
) -> list[SimilarProfileOut]:
    user = db.query(User).filter(User.username == username.lower()).first()
    if not user or not user.profile:
        return []
    source = (
        db.query(Profile)
        .options(joinedload(Profile.skills).joinedload(ProfileSkill.skill_tag), joinedload(Profile.user))
        .filter(Profile.user_id == user.id)
        .first()
    )
    if not source:
        return []
    source_skills = skill_slugs(source)
    if not source_skills:
        return []

    candidates = (
        db.query(Profile)
        .options(joinedload(Profile.skills).joinedload(ProfileSkill.skill_tag), joinedload(Profile.user))
        .filter(Profile.user_id != user.id)
        .limit(200)
        .all()
    )
    ranked: list[SimilarProfileOut] = []
    for p in candidates:
        if exclude_user_id and p.user_id == exclude_user_id:
            continue
        other = skill_slugs(p)
        score = jaccard(source_skills, other)
        if score <= 0:
            continue
        shared = sorted(source_skills & other)
        ranked.append(
            SimilarProfileOut(
                username=p.user.username,
                display_name=p.display_name,
                headline=p.headline,
                avatar_url=p.avatar_url,
                shared_skills=shared[:6],
                score=round(score, 4),
            )
        )
    ranked.sort(key=lambda x: x.score, reverse=True)
    return ranked[:limit]
