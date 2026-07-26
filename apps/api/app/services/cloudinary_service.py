import time

import cloudinary
from cloudinary.utils import api_sign_request
from fastapi import HTTPException, status

from app.core.config import get_settings


def configure_cloudinary() -> None:
    settings = get_settings()
    if not settings.cloudinary_cloud_name:
        return
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )


def create_upload_signature(username: str, slot: str) -> dict:
    settings = get_settings()
    if not settings.cloudinary_cloud_name or not settings.cloudinary_api_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudinary no está configurado. Definí CLOUDINARY_* en .env",
        )
    timestamp = int(time.time())
    folder = f"{settings.cloudinary_folder}/{username}/{slot}"
    params_to_sign = {"timestamp": timestamp, "folder": folder}
    signature = api_sign_request(params_to_sign, settings.cloudinary_api_secret)
    return {
        "timestamp": timestamp,
        "signature": signature,
        "folder": folder,
        "api_key": settings.cloudinary_api_key,
        "cloud_name": settings.cloudinary_cloud_name,
    }
