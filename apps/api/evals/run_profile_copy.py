"""CLI: python -m evals.run_profile_copy"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.profile_copy_ai import heuristic_from_dict  # noqa: E402

FIXTURES = Path(__file__).parent / "profile_copy"


def main() -> int:
    failed = 0
    for path in sorted(FIXTURES.glob("*.json")):
        fixture = json.loads(path.read_text(encoding="utf-8"))
        result = heuristic_from_dict(fixture["input"])
        text = f"{result.headline}\n{result.bio}"
        allowed = {
            e["company"].lower()
            for e in fixture["input"].get("experiences", [])
            if e.get("company")
        }
        bad = []
        for company in fixture["forbidden_companies"]:
            if re.search(rf"\b{re.escape(company)}\b", text, re.I) and company.lower() not in allowed:
                bad.append(company)
        status = "FAIL" if bad else "ok"
        if bad:
            failed += 1
        print(f"[{status}] {fixture['id']}: headline={result.headline!r} bad={bad}")
    print(f"\n{failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
