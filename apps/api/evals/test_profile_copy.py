"""Eval: heuristic profile-copy must not invent employers from forbidden list."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from app.services.profile_copy_ai import heuristic_from_dict

FIXTURES = Path(__file__).parent / "profile_copy"


def _load_fixtures() -> list[dict]:
    files = sorted(FIXTURES.glob("*.json"))
    return [json.loads(p.read_text(encoding="utf-8")) for p in files]


@pytest.mark.parametrize("fixture", _load_fixtures(), ids=lambda f: f["id"])
def test_heuristic_does_not_invent_companies(fixture: dict) -> None:
    result = heuristic_from_dict(fixture["input"])
    text = f"{result.headline}\n{result.bio}"
    allowed = {
        e["company"].lower()
        for e in fixture["input"].get("experiences", [])
        if e.get("company")
    }
    for company in fixture["forbidden_companies"]:
        # Whole-word / case-insensitive match
        pattern = re.compile(rf"\b{re.escape(company)}\b", re.IGNORECASE)
        if pattern.search(text) and company.lower() not in allowed:
            pytest.fail(f"Inventó empresa prohibida '{company}' en: {text!r}")


def test_fixture_count() -> None:
    assert len(_load_fixtures()) >= 10
