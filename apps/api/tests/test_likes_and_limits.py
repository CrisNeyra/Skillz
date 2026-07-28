"""Smoke tests for likes schema and write rate limits."""

from fastapi import HTTPException

from app.core.rate_limit import MemoryRateLimiter, limit_comment, limit_upload
from app.schemas import LikeStatusOut, MediaOut, CommentOut


def test_like_status_schema():
    out = LikeStatusOut(liked=True, like_count=3)
    assert out.liked is True
    assert out.like_count == 3


def test_media_out_defaults_likes():
    m = MediaOut(
        id=1,
        url="http://x",
        media_type="image",
        slot="hero",
        caption=None,
        cloudinary_public_id="p",
    )
    assert m.like_count == 0
    assert m.liked_by_me is False


def test_comment_out_defaults_likes():
    from datetime import datetime, timezone

    c = CommentOut(
        id=1,
        body="hola",
        author_username="a",
        author_id=1,
        parent_id=None,
        created_at=datetime.now(timezone.utc),
    )
    assert c.like_count == 0


def test_memory_limiter_trips():
    limiter = MemoryRateLimiter(max_calls=2, window_seconds=60)
    limiter.check("k")
    limiter.check("k")
    try:
        limiter.check("k")
        raised = False
    except HTTPException as exc:
        raised = True
        assert exc.status_code == 429
    assert raised


def test_limit_comment_and_upload_callable():
    # Should not raise under normal usage in fresh process
    limit_comment(999001)
    limit_upload(999001)
