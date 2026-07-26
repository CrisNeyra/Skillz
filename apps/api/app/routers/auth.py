import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.rate_limit import limit_auth
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    safe_decode,
    verify_password,
)
from app.models import CustomizationSettings, Profile, User
from app.schemas import (
    EnterRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from app.services.profile_service import slugify

router = APIRouter(prefix="/auth", tags=["auth"])

DEFAULT_BG = "#ffffff"
DEFAULT_FONT = "Space Grotesk"


def _issue_tokens(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


def _unique_username(db: Session, display_name: str) -> str:
    base = slugify(display_name).replace("-", "_")[:24] or "talent"
    candidate = base
    while db.query(User).filter(User.username == candidate).first():
        candidate = f"{base}_{secrets.token_hex(2)}"
    return candidate


@router.post("/enter", response_model=TokenResponse)
def enter_by_name(
    payload: EnterRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Entrada MVP: solo nombre visible. Reabre perfil si el nombre ya existe."""
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
        user = db.get(User, existing.user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="Usuario no disponible")
        return _issue_tokens(user)

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
    return _issue_tokens(user)


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
    return _issue_tokens(user)


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    limit_auth(request)
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    return _issue_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    data = safe_decode(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Refresh token inválido")
    user = db.get(User, int(data["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return _issue_tokens(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user
