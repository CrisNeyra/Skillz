"""Simple in-memory rate limiter for auth endpoints."""

from collections import defaultdict, deque
from time import time

from fastapi import HTTPException, Request, status


class RateLimiter:
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


auth_limiter = RateLimiter(max_calls=30, window_seconds=60)


def limit_auth(request: Request) -> None:
    client = request.client.host if request.client else "unknown"
    auth_limiter.check(f"auth:{client}")
