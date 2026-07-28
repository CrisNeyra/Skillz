"""AI helpers: skills suggest, captions, profile coach."""

from __future__ import annotations

import re
from time import perf_counter

from sqlalchemy.orm import Session

from app.models import AiSuggestionEvent, MediaPost, Profile
from app.schemas import (
    ProfileCoachResponse,
    SuggestCaptionResponse,
    SuggestSkillsResponse,
)
from app.services.profile_service import slugify

SKILL_LEXICON = [
    "Python",
    "TypeScript",
    "JavaScript",
    "React",
    "Next.js",
    "FastAPI",
    "Node",
    "SQL",
    "PostgreSQL",
    "Docker",
    "AWS",
    "Figma",
    "UI Design",
    "UX Research",
    "DevOps",
    "Machine Learning",
    "Go",
    "Swift",
    "Kotlin",
    "CSS",
    "Tailwind",
]


def _log_event(db: Session, user_id: int, feature: str, model: str, started: float) -> int:
    event = AiSuggestionEvent(
        user_id=user_id,
        feature=feature,
        model=model,
        latency_ms=int((perf_counter() - started) * 1000),
        accepted=None,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event.id


def suggest_skills_from_profile(db: Session, user_id: int, profile: Profile) -> SuggestSkillsResponse:
    started = perf_counter()
    text = " ".join(
        filter(
            None,
            [
                profile.headline or "",
                profile.bio or "",
                " ".join(e.role for e in profile.experiences),
                " ".join(e.description or "" for e in profile.experiences),
            ],
        )
    )
    existing = {ps.skill_tag.slug for ps in profile.skills if ps.skill_tag}
    found: list[str] = []
    sources: list[str] = []
    lower = text.lower()
    for name in SKILL_LEXICON:
        slug = slugify(name)
        if slug in existing:
            continue
        if name.lower() in lower or slug.replace("-", " ") in lower:
            found.append(name)
            sources.append("bio" if profile.bio else "headline")
    if not found and profile.experiences:
        for e in profile.experiences[:3]:
            role_words = re.findall(r"[A-Za-z][A-Za-z+#.]{2,}", e.role)
            for w in role_words[:2]:
                if slugify(w) not in existing and w not in found:
                    found.append(w.title())
                    sources.append("experiences")
    found = found[:8]
    event_id = _log_event(db, user_id, "suggest_skills", "heuristic", started)
    return SuggestSkillsResponse(
        skills=found,
        sources=list(dict.fromkeys(sources)) or ["profile"],
        event_id=event_id,
    )


def suggest_caption(
    db: Session,
    user_id: int,
    profile: Profile,
    *,
    slot: str | None = None,
    hint: str | None = None,
) -> SuggestCaptionResponse:
    started = perf_counter()
    media = None
    if slot:
        media = next((m for m in profile.media_posts if m.slot == slot and m.is_active), None)
    parts = []
    if hint:
        parts.append(hint.strip())
    if profile.headline:
        parts.append(profile.headline)
    if profile.skills:
        parts.append(", ".join(ps.skill_tag.name for ps in profile.skills[:3] if ps.skill_tag))
    caption = " · ".join(parts) if parts else f"{profile.display_name} · Skillz"
    if media and media.caption:
        caption = media.caption
    caption = caption[:280]
    event_id = _log_event(db, user_id, "suggest_caption", "heuristic", started)
    return SuggestCaptionResponse(caption=caption, event_id=event_id)


def profile_coach(profile: Profile) -> ProfileCoachResponse:
    gaps: list[str] = []
    tips: list[str] = []
    score = 100
    if not (profile.headline and profile.headline.strip()):
        gaps.append("headline")
        tips.append("Agregá un headline claro (rol + especialidad).")
        score -= 20
    if not (profile.bio and profile.bio.strip()):
        gaps.append("bio")
        tips.append("Escribí una bio corta o usá Sugerir con IA.")
        score -= 20
    if len(profile.skills) < 3:
        gaps.append("skills")
        tips.append("Sumá al menos 3 skills para discovery.")
        score -= 15
    active_media = [m for m in profile.media_posts if m.is_active]
    if len(active_media) < 1:
        gaps.append("media")
        tips.append("Subí al menos una foto de trabajo al hero o flyer.")
        score -= 20
    if not profile.experiences and not profile.diplomas:
        gaps.append("career")
        tips.append("Cargá experiencia o formación para reforzar credibilidad.")
        score -= 15
    if not profile.linkedin_url and not profile.github_url and not profile.contact_email:
        gaps.append("contacts")
        tips.append("Agregá un contacto público (LinkedIn, GitHub o email).")
        score -= 10
    if score < 40:
        tips.append("Completá el onboarding para mejorar la primera impresión.")
    return ProfileCoachResponse(score=max(0, score), tips=tips[:6], gaps=gaps)
