import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db
from app.core.rate_limit import limit_upload
from app.models import MediaLike, MediaPost, User
from app.schemas import LayoutUpdate, LikeStatusOut, MediaConfirm, MediaOut
from app.services.cloudinary_service import create_upload_signature
from app.services.media_validation import validate_media_confirm
from app.services.cache import invalidate_profile
from app.services.profile_service import (
    VALID_SLOTS,
    ensure_customization,
    get_profile_by_username,
    media_to_out,
)
from app.services.activity import notify, record_activity
from app.services.storage import UPLOAD_ROOT, cloudinary_configured, ensure_upload_dir

router = APIRouter(tags=["media"])

ALLOWED_IMAGE = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_VIDEO = {".mp4", ".webm", ".mov"}
MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
}
MAX_BYTES = 40 * 1024 * 1024


def _detect_media(file: UploadFile) -> tuple[str, str]:
    """Return (media_type, suffix) for png/jpg/webp/gif/mp4…"""
    suffix = Path(file.filename or "").suffix.lower()
    content_type = (file.content_type or "").split(";")[0].strip().lower()

    if suffix in ALLOWED_IMAGE or content_type in {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
    }:
        if suffix not in ALLOWED_IMAGE:
            suffix = MIME_TO_EXT.get(content_type, ".jpg")
        return "image", suffix

    if suffix in ALLOWED_VIDEO or content_type in {
        "video/mp4",
        "video/webm",
        "video/quicktime",
    }:
        if suffix not in ALLOWED_VIDEO:
            suffix = MIME_TO_EXT.get(content_type, ".mp4")
        return "video", suffix

    raise HTTPException(
        status_code=400,
        detail="Formato no soportado. Usá PNG, JPG, WEBP, GIF, MP4 o WEBM.",
    )


def _upsert_media(
    db: Session,
    profile_id: int,
    *,
    public_id: str,
    url: str,
    media_type: str,
    slot: str,
    caption: str | None = None,
) -> MediaPost:
    existing = (
        db.query(MediaPost)
        .filter(MediaPost.profile_id == profile_id, MediaPost.slot == slot)
        .first()
    )
    if existing:
        existing.cloudinary_public_id = public_id
        existing.url = url
        existing.media_type = media_type
        existing.caption = caption
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return existing

    media = MediaPost(
        profile_id=profile_id,
        cloudinary_public_id=public_id,
        url=url,
        media_type=media_type,
        slot=slot,
        caption=caption,
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return media


@router.get("/media/status")
def media_status() -> dict:
    return {
        "provider": "cloudinary" if cloudinary_configured() else "local",
        "cloudinary": cloudinary_configured(),
    }


@router.post("/media/sign")
def sign_upload(slot: str, user: User = Depends(get_current_user)) -> dict:
    if slot not in VALID_SLOTS and slot not in {"flyer", "bg"}:
        raise HTTPException(status_code=400, detail="Slot inválido")
    if not cloudinary_configured():
        return {"provider": "local", "slot": slot}
    data = create_upload_signature(user.username, slot)
    data["provider"] = "cloudinary"
    return data


@router.post("/media/upload", response_model=MediaOut | dict)
async def upload_local(
    slot: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upload local (MVP) o flyer/bg/slots cuando Cloudinary no está configurado."""
    limit_upload(user.id)
    if slot not in VALID_SLOTS and slot not in {"flyer", "bg"}:
        raise HTTPException(status_code=400, detail="Slot inválido")

    profile = get_profile_by_username(db, user.username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")

    # Flyer/bg solo imágenes
    media_type, suffix = _detect_media(file)
    if slot in {"flyer", "bg"} and media_type != "image":
        raise HTTPException(status_code=400, detail="El flyer solo acepta PNG o JPG")

    raw = await file.read()
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="Archivo demasiado grande (máx 40MB)")

    ensure_upload_dir()
    public_id = f"local/{user.username}/{slot}/{uuid.uuid4().hex}{suffix}"
    dest = UPLOAD_ROOT / public_id.replace("/", "_")
    dest.write_bytes(raw)
    settings = get_settings()
    url = f"{settings.api_public_url.rstrip('/')}/media/files/{dest.name}"

    if slot == "flyer":
        customization = ensure_customization(db, profile)
        customization.flyer_url = url
        customization.flyer_public_id = public_id
        db.commit()
        return {"ok": True, "url": url, "slot": "flyer", "media_type": media_type}

    if slot == "bg":
        customization = ensure_customization(db, profile)
        customization.bg_image_url = url
        db.commit()
        return {"ok": True, "url": url, "slot": "bg", "media_type": media_type}

    media = _upsert_media(
        db,
        profile.id,
        public_id=public_id,
        url=url,
        media_type=media_type,
        slot=slot,
    )
    record_activity(
        db,
        actor=user,
        event_type="media",
        summary=f"@{user.username} subió media en {slot}",
        profile=profile,
        ref_id=media.id,
    )
    db.commit()
    invalidate_profile(user.username)
    out = media_to_out(media, user.id)
    assert out is not None
    return out


@router.get("/media/files/{filename}")
def serve_local_file(filename: str):
    path = UPLOAD_ROOT / filename
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return FileResponse(path)


@router.post("/media/confirm", response_model=MediaOut)
def confirm_media(
    payload: MediaConfirm,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MediaOut:
    limit_upload(user.id)
    if payload.slot not in VALID_SLOTS:
        raise HTTPException(status_code=400, detail="Slot inválido")
    validate_media_confirm(user, payload)
    profile = get_profile_by_username(db, user.username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")

    media = _upsert_media(
        db,
        profile.id,
        public_id=payload.cloudinary_public_id,
        url=payload.url,
        media_type=payload.media_type,
        slot=payload.slot,
        caption=payload.caption,
    )
    record_activity(
        db,
        actor=user,
        event_type="media",
        summary=f"@{user.username} subió media en {payload.slot}",
        profile=profile,
        ref_id=media.id,
    )
    db.commit()
    invalidate_profile(user.username)
    out = media_to_out(media, user.id)
    assert out is not None
    return out


@router.post("/media/{media_id}/like", response_model=LikeStatusOut)
def like_media(
    media_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LikeStatusOut:
    media = db.get(MediaPost, media_id)
    if not media or not media.is_active:
        raise HTTPException(status_code=404, detail="Media no encontrado")
    existing = (
        db.query(MediaLike)
        .filter(MediaLike.media_id == media_id, MediaLike.user_id == user.id)
        .first()
    )
    if not existing:
        db.add(MediaLike(media_id=media_id, user_id=user.id))
        owner = media.profile.user if media.profile else None
        if owner:
            notify(
                db,
                user_id=owner.id,
                actor=user,
                notif_type="like_media",
                body=f"@{user.username} le dio like a tu media",
                ref_id=media_id,
            )
            invalidate_profile(owner.username)
        db.commit()
    count = db.query(MediaLike).filter(MediaLike.media_id == media_id).count()
    return LikeStatusOut(liked=True, like_count=count)


@router.delete("/media/{media_id}/like", response_model=LikeStatusOut)
def unlike_media(
    media_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LikeStatusOut:
    media = db.get(MediaPost, media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media no encontrado")
    existing = (
        db.query(MediaLike)
        .filter(MediaLike.media_id == media_id, MediaLike.user_id == user.id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        if media.profile and media.profile.user:
            invalidate_profile(media.profile.user.username)
    count = db.query(MediaLike).filter(MediaLike.media_id == media_id).count()
    return LikeStatusOut(liked=False, like_count=count)


@router.delete("/media/{media_id}")
def delete_media(
    media_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    profile = get_profile_by_username(db, user.username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    media = db.get(MediaPost, media_id)
    if not media or media.profile_id != profile.id:
        raise HTTPException(status_code=404, detail="Media no encontrado")
    media.is_active = False
    db.commit()
    return {"ok": True}


@router.put("/profiles/me/layout")
def update_layout(
    payload: LayoutUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    profile = get_profile_by_username(db, user.username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    for slot, media_id in payload.slots.items():
        if slot not in VALID_SLOTS:
            raise HTTPException(status_code=400, detail=f"Slot inválido: {slot}")
        if media_id is None:
            continue
        media = db.get(MediaPost, media_id)
        if not media or media.profile_id != profile.id:
            raise HTTPException(status_code=400, detail=f"Media {media_id} inválido")
        prev = (
            db.query(MediaPost)
            .filter(
                MediaPost.profile_id == profile.id,
                MediaPost.slot == slot,
                MediaPost.id != media_id,
            )
            .all()
        )
        for p in prev:
            p.is_active = False
        media.slot = slot
        media.is_active = True
    db.commit()
    return {"ok": True}
