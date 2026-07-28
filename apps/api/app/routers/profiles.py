from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db, get_optional_user
from app.models import User
from app.schemas import CustomizationOut, CustomizationUpdate, ProfileBundle, ProfileUpdate
from app.services.cache import get_cached_profile, invalidate_profile, set_cached_profile
from app.services.profile_service import (
    ensure_customization,
    get_profile_by_username,
    serialize_profile,
)

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.patch("/me", response_model=ProfileBundle)
def update_my_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProfileBundle:
    profile = get_profile_by_username(db, user.username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(profile, key, value)
    db.commit()
    invalidate_profile(user.username)
    profile = get_profile_by_username(db, user.username)
    return serialize_profile(profile, user, db=db)


@router.post("/me/onboarding/complete", response_model=ProfileBundle)
def complete_onboarding(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProfileBundle:
    profile = get_profile_by_username(db, user.username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    profile.onboarding_completed = True
    db.commit()
    invalidate_profile(user.username)
    profile = get_profile_by_username(db, user.username)
    return serialize_profile(profile, user, db=db)


@router.get("/me/customization", response_model=CustomizationOut)
def get_my_customization(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CustomizationOut:
    profile = get_profile_by_username(db, user.username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    settings = ensure_customization(db, profile)
    return CustomizationOut.model_validate(settings)


@router.patch("/me/customization", response_model=CustomizationOut)
def update_my_customization(
    payload: CustomizationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CustomizationOut:
    profile = get_profile_by_username(db, user.username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    settings = ensure_customization(db, profile)
    data = payload.model_dump(exclude_unset=True)
    if "font_family" in data and data["font_family"] is not None:
        allowed = get_settings().allowed_fonts
        if data["font_family"] not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Fuente no permitida. Usá una de: {', '.join(allowed)}",
            )
    for key, value in data.items():
        setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    invalidate_profile(user.username)
    return CustomizationOut.model_validate(settings)


@router.get("/{username}", response_model=ProfileBundle)
def get_public_profile(
    username: str,
    db: Session = Depends(get_db),
    viewer: User | None = Depends(get_optional_user),
) -> ProfileBundle:
    if username == "me":
        raise HTTPException(status_code=400, detail="Usá /profiles/me con autenticación")
    if viewer is None:
        cached = get_cached_profile(username)
        if cached:
            return ProfileBundle.model_validate(cached)
    profile = get_profile_by_username(db, username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    ensure_customization(db, profile)
    profile = get_profile_by_username(db, username)
    bundle = serialize_profile(profile, viewer, db=db)
    if viewer is None:
        set_cached_profile(username, bundle.model_dump(mode="json"))
    return bundle
