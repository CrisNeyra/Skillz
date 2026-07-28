from urllib.parse import urlparse

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.models import User
from app.schemas import MediaConfirm
from app.services.storage import cloudinary_configured


def validate_media_confirm(user: User, payload: MediaConfirm) -> None:
    """Reject confirm payloads that don't belong to the authenticated user."""
    settings = get_settings()
    public_id = payload.cloudinary_public_id.strip()
    url = payload.url.strip()

    if not public_id or not url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="public_id y url son requeridos",
        )

    owned_prefixes = (
        f"{settings.cloudinary_folder}/{user.username}/",
        f"local/{user.username}/",
    )
    if not public_id.startswith(owned_prefixes):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="public_id no pertenece a este usuario",
        )

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL de media inválida",
        )

    host = parsed.netloc.lower()
    allowed_hosts: set[str] = set()

    api_host = urlparse(settings.api_public_url).netloc.lower()
    if api_host:
        allowed_hosts.add(api_host)

    if cloudinary_configured() and settings.cloudinary_cloud_name:
        cloud = settings.cloudinary_cloud_name.lower()
        allowed_hosts.add("res.cloudinary.com")
        allowed_hosts.add(f"{cloud}-res.cloudinary.com")

    if host not in allowed_hosts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL de media no permitida",
        )

    if "res.cloudinary.com" in host:
        path_parts = [p for p in parsed.path.split("/") if p]
        if not path_parts or path_parts[0].lower() != settings.cloudinary_cloud_name.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="URL de Cloudinary no coincide con la cuenta configurada",
            )
        if user.username not in parsed.path:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="URL de Cloudinary no pertenece a este usuario",
            )
