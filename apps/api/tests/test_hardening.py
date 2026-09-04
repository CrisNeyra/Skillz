"""Security and limiter hardening tests."""

from pathlib import Path

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.core.rate_limit import _memory_for
from app.routers.media import resolve_upload_path
from app.schemas import LinkIn, RegisterRequest
from app.services.storage import UPLOAD_ROOT


def test_resolve_upload_rejects_traversal(monkeypatch, tmp_path: Path):
    monkeypatch.setattr("app.routers.media.UPLOAD_ROOT", tmp_path)
    with pytest.raises(HTTPException) as exc:
        resolve_upload_path("../secret.txt")
    assert exc.value.status_code == 400
    safe = tmp_path / "ok.bin"
    safe.write_bytes(b"x")
    assert resolve_upload_path("ok.bin") == safe.resolve()


def test_memory_limiters_are_independent():
    a = _memory_for(2, 60)
    b = _memory_for(5, 60)
    assert a is not b
    a.check("same-key")
    a.check("same-key")
    with pytest.raises(HTTPException):
        a.check("same-key")
    b.check("same-key")
    b.check("same-key")
    b.check("same-key")


def test_register_password_requires_letter_and_digit():
    with pytest.raises(ValidationError):
        RegisterRequest(
            email="a@b.com",
            username="userone",
            password="abcdefgh",
            display_name="A",
        )
    req = RegisterRequest(
        email="a@b.com",
        username="userone",
        password="123456Ab",
        display_name="A",
    )
    assert req.password == "123456Ab"


def test_link_url_must_be_http():
    with pytest.raises(ValidationError):
        LinkIn(label="x", url="javascript:alert(1)")
    link = LinkIn(label="x", url="https://example.com/me")
    assert str(link.url).startswith("https://")


def test_upload_root_constant_exists():
    assert isinstance(UPLOAD_ROOT, Path)
