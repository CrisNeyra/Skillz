from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token, create_refresh_token, safe_decode
from app.models import RefreshToken, User
from app.schemas import TokenResponse


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


def issue_tokens(db: Session, user: User) -> TokenResponse:
    settings = get_settings()
    access = create_access_token(str(user.id))
    refresh, jti = create_refresh_token(str(user.id))
    db.add(
        RefreshToken(
            user_id=user.id,
            jti=jti,
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    db.commit()
    return TokenResponse(access_token=access, refresh_token=refresh)


def revoke_all_refresh_tokens(db: Session, user_id: int) -> None:
    now = datetime.now(UTC)
    (
        db.query(RefreshToken)
        .filter(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .update({RefreshToken.revoked_at: now}, synchronize_session=False)
    )
    db.commit()


def rotate_refresh_token(db: Session, refresh_token: str) -> TokenResponse:
    data = safe_decode(refresh_token)
    if not data or data.get("type") != "refresh" or not data.get("jti"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido",
        )

    jti = str(data["jti"])
    record = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido",
        )

    now = datetime.now(UTC)
    if record.revoked_at is not None:
        revoke_all_refresh_tokens(db, record.user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token revocado",
        )

    if _aware(record.expires_at) <= now:
        record.revoked_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expirado",
        )

    user = db.get(User, int(data["sub"]))
    if not user or not user.is_active or user.id != record.user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
        )

    settings = get_settings()
    access = create_access_token(str(user.id))
    new_refresh, new_jti = create_refresh_token(str(user.id))
    record.revoked_at = now
    record.replaced_by_jti = new_jti
    db.add(
        RefreshToken(
            user_id=user.id,
            jti=new_jti,
            expires_at=now + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    db.commit()
    return TokenResponse(access_token=access, refresh_token=new_refresh)
