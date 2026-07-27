import pytest
from fastapi import HTTPException

from app.core.config import get_settings
from app.models import User
from app.schemas import MediaConfirm
from app.services.media_validation import validate_media_confirm


@pytest.fixture()
def media_settings(monkeypatch):
    monkeypatch.setenv("API_PUBLIC_URL", "http://testserver")
    monkeypatch.setenv("CLOUDINARY_CLOUD_NAME", "")
    monkeypatch.setenv("CLOUDINARY_API_KEY", "")
    monkeypatch.setenv("CLOUDINARY_API_SECRET", "")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _user(username: str = "alice") -> User:
    return User(
        id=1,
        email=f"{username}@example.com",
        username=username,
        hashed_password="x",
        is_active=True,
    )


def test_validate_media_confirm_accepts_owned_local_url(media_settings):
    payload = MediaConfirm(
        cloudinary_public_id="local/alice/hero/abc123.png",
        url="http://testserver/media/files/local_alice_hero_abc123.png",
        media_type="image",
        slot="hero",
    )
    validate_media_confirm(_user(), payload)


def test_validate_media_confirm_rejects_foreign_public_id(media_settings):
    payload = MediaConfirm(
        cloudinary_public_id="local/bob/hero/abc123.png",
        url="http://testserver/media/files/local_bob_hero_abc123.png",
        media_type="image",
        slot="hero",
    )
    with pytest.raises(HTTPException) as exc:
        validate_media_confirm(_user(), payload)
    assert exc.value.status_code == 400
    assert "public_id" in exc.value.detail


def test_media_confirm_endpoint_rejects_foreign_asset(client):
    register = client.post(
        "/auth/register",
        json={
            "email": "media@example.com",
            "username": "media_user",
            "password": "password123",
            "display_name": "Media User",
        },
    )
    token = register.json()["access_token"]
    response = client.post(
        "/media/confirm",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "cloudinary_public_id": "local/other/hero/abc.png",
            "url": "http://testserver/media/files/x.png",
            "media_type": "image",
            "slot": "hero",
        },
    )
    assert response.status_code == 400
