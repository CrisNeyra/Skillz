"""Social graph smoke tests."""

from app.schemas import FollowStatusOut, SearchResultOut
from app.services.matching import jaccard


def test_follow_status_schema():
    out = FollowStatusOut(following=True, follower_count=2, following_count=1)
    assert out.following is True


def test_search_schema_defaults():
    out = SearchResultOut(items=[], next_cursor=None)
    assert out.items == []


def test_jaccard_ranking_order():
    a = {"python", "fastapi", "sql"}
    close = jaccard(a, {"python", "fastapi"})
    far = jaccard(a, {"figma"})
    assert close > far
