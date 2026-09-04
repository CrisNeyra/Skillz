from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user, get_db
from app.core.rate_limit import limit_ai
from app.models import AiSuggestionEvent, Profile, ProfileSkill, User
from app.schemas import (
    ProfileCoachResponse,
    SuggestCaptionRequest,
    SuggestCaptionResponse,
    SuggestProfileCopyRequest,
    SuggestProfileCopyResponse,
    SuggestSkillsResponse,
    SuggestionEventUpdate,
)
from app.services.ai_assist import profile_coach, suggest_caption, suggest_skills_from_profile
from app.services.profile_copy_ai import suggest_profile_copy

router = APIRouter(prefix="/ai", tags=["ai"])


def _load_profile(db: Session, user_id: int) -> Profile:
    profile = (
        db.query(Profile)
        .options(
            joinedload(Profile.skills).joinedload(ProfileSkill.skill_tag),
            joinedload(Profile.experiences),
            joinedload(Profile.media_posts),
            joinedload(Profile.diplomas),
        )
        .filter(Profile.user_id == user_id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return profile


@router.post("/suggest-profile-copy", response_model=SuggestProfileCopyResponse)
def suggest_profile_copy_endpoint(
    payload: SuggestProfileCopyRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SuggestProfileCopyResponse:
    limit_ai(user.id)
    return suggest_profile_copy(db, user.id, _load_profile(db, user.id), payload)


@router.post("/suggest-skills", response_model=SuggestSkillsResponse)
def suggest_skills_endpoint(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SuggestSkillsResponse:
    limit_ai(user.id)
    return suggest_skills_from_profile(db, user.id, _load_profile(db, user.id))


@router.post("/suggest-caption", response_model=SuggestCaptionResponse)
def suggest_caption_endpoint(
    payload: SuggestCaptionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SuggestCaptionResponse:
    limit_ai(user.id)
    return suggest_caption(
        db,
        user.id,
        _load_profile(db, user.id),
        slot=payload.slot,
        hint=payload.hint,
    )


@router.get("/profile-coach", response_model=ProfileCoachResponse)
def profile_coach_endpoint(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProfileCoachResponse:
    limit_ai(user.id)
    return profile_coach(_load_profile(db, user.id))


@router.patch("/suggestion-events/{event_id}")
def update_suggestion_event(
    event_id: int,
    payload: SuggestionEventUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    event = db.get(AiSuggestionEvent, event_id)
    if not event or event.user_id != user.id:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    event.accepted = payload.accepted
    db.commit()
    return {"ok": True, "accepted": event.accepted}
