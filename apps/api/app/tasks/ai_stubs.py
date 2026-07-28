"""Stubs and re-exports for AI background jobs."""

from app.services.ai_assist import suggest_caption, suggest_skills_from_profile
from app.services.profile_copy_ai import suggest_profile_copy

__all__ = [
    "suggest_profile_copy",
    "suggest_skills_from_bio",
    "auto_caption_media",
    "suggest_caption",
    "suggest_skills_from_profile",
]


def suggest_skills_from_bio(bio: str) -> list[str]:
    from app.services.ai_assist import SKILL_LEXICON

    lower = (bio or "").lower()
    return [name for name in SKILL_LEXICON if name.lower() in lower][:8]


def auto_caption_media(public_id: str) -> str | None:
    _ = public_id
    return None
