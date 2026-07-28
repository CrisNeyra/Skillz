"""Matching evals: Jaccard skill overlap ranking."""

from app.services.matching import jaccard


def test_jaccard_identical():
    assert jaccard({"react", "python"}, {"react", "python"}) == 1.0


def test_jaccard_disjoint():
    assert jaccard({"a"}, {"b"}) == 0.0


def test_jaccard_partial():
    score = jaccard({"react", "next", "css"}, {"react", "vue"})
    assert 0 < score < 1


def test_jaccard_empty():
    assert jaccard(set(), {"a"}) == 0.0
