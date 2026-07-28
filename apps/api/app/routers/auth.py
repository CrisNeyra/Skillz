import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db
from app.core.rate_limit import limit_auth
from app.core.security import hash_password, verify_password
from app.models import CustomizationSettings, Profile, User
from app.schemas import (
    EnterRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from app.services.auth_service import issue_tokens, rotate_refresh_token
from app.services.profile_service import slugify

router = APIRouter(prefix="/auth", tags=["auth"])

DEFAULT_BG = "#ffffff"
DEFAULT_FONT = "Space Grotesk"


def _unique_username(db: Session, display_name: str) -> str:
    base = slugify(display_name).replace("-", "_")[:24] or "talent"
    candidate = base
    while db.query(User).filter(User.username == candidate).first():
        candidate = f"{base}_{secrets.token_hex(2)}"
    return candidate


@router.post("/enter", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def enter_by_name(
    payload: EnterRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Crea un perfil nuevo solo con nombre. Deshabilitado en production."""
    if get_settings().is_production:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    limit_auth(request)
    name = " ".join(payload.display_name.split())
    if not name:
        raise HTTPException(status_code=400, detail="Ingresá un nombre")

    existing = (
        db.query(Profile)
        .filter(func.lower(Profile.display_name) == name.lower())
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ese nombre ya existe. Registrate o iniciá sesión con email y contraseña.",
        )

    username = _unique_username(db, name)
    user = User(
        email=f"{username}-{uuid.uuid4().hex[:8]}@users.skillz.app",
        username=username,
        hashed_password=hash_password(secrets.token_urlsafe(24)),
    )
    db.add(user)
    db.flush()

    profile = Profile(user_id=user.id, display_name=name)
    db.add(profile)
    db.flush()
    db.add(
        CustomizationSettings(
            profile_id=profile.id,
            font_family=DEFAULT_FONT,
            bg_color=DEFAULT_BG,
        )
    )
    db.commit()
    db.refresh(user)
    return issue_tokens(db, user)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    limit_auth(request)
    username = payload.username.lower()
    if db.query(User).filter(User.email == payload.email.lower()).first():
        raise HTTPException(status_code=400, detail="Email ya registrado")
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Username no disponible")

    user = User(
        email=payload.email.lower(),
        username=username,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.flush()

    profile = Profile(user_id=user.id, display_name=payload.display_name)
    db.add(profile)
    db.flush()
    db.add(
        CustomizationSettings(
            profile_id=profile.id,
            font_family=DEFAULT_FONT,
            bg_color=DEFAULT_BG,
        )
    )
    db.commit()
    db.refresh(user)
    return issue_tokens(db, user)


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    limit_auth(request)
    try:
        identifier = payload.identifier().lower()
    except ValueError:
        raise HTTPException(status_code=400, detail="Email o usuario requerido") from None

    user = (
        db.query(User)
        .filter((User.email == identifier) | (User.username == identifier))
        .first()
    )
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    return issue_tokens(db, user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    payload: RefreshRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    limit_auth(request)
    return rotate_refresh_token(db, payload.refresh_token)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user
