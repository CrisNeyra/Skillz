"""Redis helpers for profile cache (optional; no-op without REDIS_URL)."""

from __future__ import annotations

import json
import logging
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger("skillz.cache")

_redis = None
_failed = False
PROFILE_TTL = 60


def _client():
    global _redis, _failed
    if _failed:
        return None
    if _redis is not None:
        return _redis
    url = get_settings().redis_url.strip()
    if not url:
        return None
    try:
        import redis

        client = redis.Redis.from_url(url, decode_responses=True, socket_connect_timeout=1.5)
        client.ping()
        _redis = client
        return _redis
    except Exception:
        _failed = True
        logger.warning("Redis cache unavailable; continuing without cache")
        return None


def profile_cache_key(username: str) -> str:
    return f"profile:bundle:{username.lower()}"


def get_cached_profile(username: str) -> dict[str, Any] | None:
    client = _client()
    if not client:
        return None
    try:
        raw = client.get(profile_cache_key(username))
        return json.loads(raw) if raw else None
    except Exception:
        return None


def set_cached_profile(username: str, payload: dict[str, Any]) -> None:
    client = _client()
    if not client:
        return
    try:
        client.setex(profile_cache_key(username), PROFILE_TTL, json.dumps(payload, default=str))
    except Exception:
        pass


def invalidate_profile(username: str) -> None:
    client = _client()
    if not client:
        return
    try:
        client.delete(profile_cache_key(username))
    except Exception:
        pass
