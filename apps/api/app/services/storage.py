from pathlib import Path

from app.core.config import get_settings

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads"


def cloudinary_configured() -> bool:
    settings = get_settings()
    return bool(
        settings.cloudinary_cloud_name
        and settings.cloudinary_api_key
        and settings.cloudinary_api_secret
    )


def ensure_upload_dir() -> Path:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    return UPLOAD_ROOT
