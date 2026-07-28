"""Suggest headline/bio from existing profile text without inventing employers."""

from __future__ import annotations

import json
import logging
import re
from time import perf_counter
from typing import Any

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import AiSuggestionEvent, Profile, ProfileSkill, WorkExperience
from app.schemas import SuggestProfileCopyRequest, SuggestProfileCopyResponse

logger = logging.getLogger("skillz.ai")

SYSTEM_PROMPT = """You rewrite a professional profile headline and bio.
Rules:
- Only rephrase text the user already provided (headline, bio, skills, roles).
- Never invent employers, companies, job titles, dates, degrees, or achievements.
- Do not add numbers, metrics, or clients that are not in the input.
- Keep headline <= 120 chars and bio <= 600 chars.
- Respond ONLY with JSON: {"headline":"...","bio":"...","sources":["headline"|"bio"|"skills"|"experiences",...]}
"""


def _allowed_companies(experiences: list[WorkExperience]) -> set[str]:
    return {e.company.strip().lower() for e in experiences if e.company}


def _mentions_unknown_company(text: str, allowed: set[str]) -> str | None:
    """Heuristic: reject Title-Case tokens that look like company names not in input."""
    # Only check against known companies — if output invents a known-style name
    # that isn't in allowed and isn't a common skill word, we still allow unless
    # it matches a pattern of inventing employers by comparing against a denylist
    # of invented names from eval fixtures. Primary guard: company names from
    # experiences must not be replaced; unknown company-like tokens after "at "/"@ ".
    for match in re.finditer(r"(?:\bat\s+|@\s*|en\s+)([A-Z][A-Za-z0-9&. -]{1,40})", text):
        name = match.group(1).strip().lower()
        if name and name not in allowed and len(name) > 2:
            return match.group(1).strip()
    return None


def _heuristic(
    profile: Profile,
    overrides: SuggestProfileCopyRequest,
) -> SuggestProfileCopyResponse:
    headline = (overrides.headline if overrides.headline is not None else profile.headline) or ""
    bio = (overrides.bio if overrides.bio is not None else profile.bio) or ""
    skills = [ps.skill_tag.name for ps in profile.skills if ps.skill_tag]
    sources: list[str] = []

    if headline.strip():
        sources.append("headline")
        new_headline = headline.strip()
    elif skills:
        sources.append("skills")
        new_headline = " · ".join(skills[:3])
    else:
        new_headline = f"{profile.display_name} · Skillz"
        sources.append("profile")

    if bio.strip():
        sources.append("bio")
        new_bio = " ".join(bio.split())
        if len(new_bio) > 600:
            new_bio = new_bio[:597].rstrip() + "…"
    else:
        parts = []
        if skills:
            parts.append(f"Skills: {', '.join(skills[:8])}.")
            sources.append("skills")
        roles = [f"{e.role} @ {e.company}" for e in profile.experiences[:3]]
        if roles:
            parts.append("Experience: " + "; ".join(roles) + ".")
            sources.append("experiences")
        new_bio = " ".join(parts) or f"Perfil de {profile.display_name}."
        if "profile" not in sources:
            sources.append("profile")

    tone = overrides.tone or "formal"
    if tone == "creative":
        new_headline = new_headline.rstrip(".")
        if not new_headline.endswith("✨"):
            new_headline = f"{new_headline}"
        new_bio = new_bio if new_bio.endswith(".") else f"{new_bio}."
    elif tone == "technical":
        if skills and "·" not in new_headline:
            new_headline = f"{new_headline} | {' / '.join(skills[:2])}"[:120]

    return SuggestProfileCopyResponse(
        headline=new_headline[:120],
        bio=new_bio[:600],
        sources=list(dict.fromkeys(sources)),
    )


def _openai_suggest(payload: dict[str, Any]) -> SuggestProfileCopyResponse:
    settings = get_settings()
    url = f"{settings.openai_base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": settings.openai_model,
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": json.dumps(payload, ensure_ascii=False),
            },
        ],
    }
    with httpx.Client(timeout=20.0) as client:
        res = client.post(url, headers=headers, json=body)
        if res.status_code >= 400:
            logger.warning("OpenAI error status=%s", res.status_code)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="El proveedor de IA no respondió correctamente",
            )
        data = res.json()
    content = data["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    headline = str(parsed.get("headline", "")).strip()
    bio = str(parsed.get("bio", "")).strip()
    sources = [str(s) for s in parsed.get("sources", []) if s]
    if not headline or not bio:
        raise HTTPException(status_code=502, detail="Respuesta de IA incompleta")
    return SuggestProfileCopyResponse(
        headline=headline[:120],
        bio=bio[:600],
        sources=sources or ["profile"],
    )


def suggest_profile_copy(
    db: Session,
    user_id: int,
    profile: Profile,
    overrides: SuggestProfileCopyRequest,
) -> SuggestProfileCopyResponse:
    settings = get_settings()
    started = perf_counter()
    model_name = "heuristic"

    input_payload = {
        "display_name": profile.display_name,
        "headline": overrides.headline if overrides.headline is not None else profile.headline,
        "bio": overrides.bio if overrides.bio is not None else profile.bio,
        "skills": [ps.skill_tag.name for ps in profile.skills if ps.skill_tag],
        "experiences": [
            {"company": e.company, "role": e.role, "description": e.description}
            for e in profile.experiences
        ],
    }

    try:
        if settings.openai_api_key.strip():
            model_name = settings.openai_model
            result = _openai_suggest(input_payload)
        else:
            result = _heuristic(profile, overrides)
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("AI suggest failed, falling back to heuristic: %s", type(exc).__name__)
        model_name = "heuristic"
        result = _heuristic(profile, overrides)

    allowed = _allowed_companies(list(profile.experiences))
    for field in (result.headline, result.bio):
        bad = _mentions_unknown_company(field, allowed)
        if bad:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"La sugerencia inventó una empresa no presente en el perfil: {bad}",
            )

    latency_ms = int((perf_counter() - started) * 1000)
    event = AiSuggestionEvent(
        user_id=user_id,
        feature="profile_copy",
        model=model_name,
        latency_ms=latency_ms,
        accepted=None,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    logger.info(
        "ai_suggestion feature=profile_copy model=%s latency_ms=%s user_id=%s",
        model_name,
        latency_ms,
        user_id,
    )
    result.event_id = event.id
    return result


# Re-export helpers for evals
def heuristic_from_dict(data: dict[str, Any]) -> SuggestProfileCopyResponse:
    class _Skill:
        def __init__(self, name: str) -> None:
            self.skill_tag = type("T", (), {"name": name})()

    class _Exp:
        def __init__(self, company: str, role: str, description: str | None = None) -> None:
            self.company = company
            self.role = role
            self.description = description

    class _Profile:
        display_name = data.get("display_name", "Talent")
        headline = data.get("headline")
        bio = data.get("bio")
        skills = [_Skill(n) for n in data.get("skills", [])]
        experiences = [
            _Exp(e["company"], e["role"], e.get("description")) for e in data.get("experiences", [])
        ]

    return _heuristic(_Profile(), SuggestProfileCopyRequest())  # type: ignore[arg-type]
