"""Exit criterion: every town has trash AND recycling classify-ok OR custom informational."""
from __future__ import annotations

import datetime as dt
import json
import re
from pathlib import Path

DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
R = json.loads(Path("data/towns_research_v5.json").read_text(encoding="utf-8"))


def days_of(w):
    if not w:
        return None
    w = w.lower()
    if "(" in w or "plus" in w or " or " in w:
        return None
    return [DAYS.index(d) for d in DAYS if re.search(r"\b" + d + r"s?\b", w)] or None


def wd_of(date):
    return (dt.date.fromisoformat(date).weekday() + 1) % 7


def classify(s, wds):
    if str(s.get("source_date")) not in ("2026", "standing"):
        return None
    p = (s.get("week_pattern") or "").strip()
    q = p.lower()
    text = s.get("area_note") or ""
    if re.fullmatch(r"\d{4}-\d\d-\d\d", p):
        return {"kind": "D"}
    if not wds:
        return None
    if re.search(r"appointment|\bplus\b|alternating white|white week", q + " " + text.lower()):
        return None
    if re.search(r"booklet lists|conflict", text.lower()):
        return None
    bare = re.sub(r"\([^)]*\)", "", q).strip(" ;")
    if bare in ("weekly", "every week"):
        if re.search(r"\bonly\b", text, re.I):
            return None
        return {"kind": "W"}
    if (
        re.search(r"every other|bi-?weekly|alternating weeks", q)
        and s.get("anchor_date")
        and len(wds) == 1
        and wd_of(s["anchor_date"]) == wds[0]
    ):
        return {"kind": "B"}
    m = re.match(
        r"^(\d)(?:st|nd|rd|th)\s*(?:and|&)\s*(\d)(?:st|nd|rd|th)\s+\w+( of the month)?(;.*)?$",
        q,
    )
    if m:
        return {"kind": "M"}
    return None


def stream_status(town, stream):
    rows = [s for s in (town.get("schedules") or []) if s.get("stream") == stream]
    if any(classify(s, days_of(s.get("weekday"))) for s in rows):
        return "classify-ok"
    if any((s.get("week_pattern") or "") == "custom" and not s.get("weekday") for s in rows):
        return "custom-informational"
    return "FAIL"


print("town|trash|recycling|exit")
fails = []
for slug, t in sorted(R.items()):
    tr = stream_status(t, "trash")
    rc = stream_status(t, "recycling")
    ok = tr != "FAIL" and rc != "FAIL"
    mark = "PASS" if ok else "FAIL"
    print(f"{slug}|{tr}|{rc}|{mark}")
    if not ok:
        fails.append({"town": slug, "trash": tr, "recycling": rc})

print("FAILS", json.dumps(fails, indent=2))
