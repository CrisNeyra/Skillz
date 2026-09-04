"""Auth smoke tests for login identifier and production flag."""

from app.core.config import get_settings
from app.schemas import LoginRequest


def test_login_request_accepts_username_field():
    req = LoginRequest(login="testuser", password="12345678")
    assert req.identifier() == "testuser"
    legacy = LoginRequest(email="a@b.com", password="12345678")
    assert legacy.identifier() == "a@b.com"


def test_is_production_flag(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "environment", "production")
    assert settings.is_production is True
    monkeypatch.setattr(settings, "environment", "development")
    assert settings.is_production is False


def test_looks_deployed_with_https_cors(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "environment", "development")
    monkeypatch.setattr(settings, "cors_origins", "https://skillz.vercel.app")
    monkeypatch.setattr(settings, "database_url", "sqlite:///./skillz.db")
    assert settings.looks_deployed is True
    monkeypatch.setattr(settings, "cors_origins", "http://localhost:3000")
    assert settings.looks_deployed is False
