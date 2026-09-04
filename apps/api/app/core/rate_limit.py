"""Rate limiter with Redis when REDIS_URL is set; in-memory fallback for local dev."""

from __future__ import annotations

from collections import defaultdict, deque
from time import time

from fastapi import HTTPException, Request, status

from app.core.config import get_settings

_redis = None
_redis_failed = False


class MemoryRateLimiter:
    def __init__(self, max_calls: int = 20, window_seconds: int = 60) -> None:
        self.max_calls = max_calls
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> None:
        now = time()
        q = self._hits[key]
        while q and now - q[0] > self.window:
            q.popleft()
        if len(q) >= self.max_calls:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demasiados intentos. Probá de nuevo en un minuto.",
            )
        q.append(now)


memory_limiter = MemoryRateLimiter(max_calls=30, window_seconds=60)
_memory_limiters: dict[tuple[int, int], MemoryRateLimiter] = {}


def _memory_for(max_calls: int, window_seconds: int) -> MemoryRateLimiter:
    key = (max_calls, window_seconds)
    limiter = _memory_limiters.get(key)
    if limiter is None:
        limiter = MemoryRateLimiter(max_calls=max_calls, window_seconds=window_seconds)
        _memory_limiters[key] = limiter
    return limiter


def _get_redis():
    global _redis, _redis_failed
    if _redis_failed:
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
        _redis_failed = True
        return None


def _check_redis(key: str, max_calls: int, window_seconds: int) -> None:
    client = _get_redis()
    if client is None:
        _memory_for(max_calls, window_seconds).check(key)
        return
    redis_key = f"rl:{key}"
    count = int(client.incr(redis_key))
    if count == 1:
        client.expire(redis_key, window_seconds)
    if count > max_calls:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Probá de nuevo en un minuto.",
        )


def limit_auth(request: Request) -> None:
    client = request.client.host if request.client else "unknown"
    _check_redis(f"auth:{client}", max_calls=30, window_seconds=60)


def limit_ai(user_id: int) -> None:
    _check_redis(f"ai:{user_id}", max_calls=20, window_seconds=60)


def limit_comment(user_id: int) -> None:
    _check_redis(f"comment:{user_id}", max_calls=30, window_seconds=60)


def limit_upload(user_id: int) -> None:
    _check_redis(f"upload:{user_id}", max_calls=40, window_seconds=60)
