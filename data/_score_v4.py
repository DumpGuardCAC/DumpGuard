"""Score v4 against merge shapes; quality checks. Standalone classify copy."""
from __future__ import annotations

import datetime as dt
import json
import re
from pathlib import Path

DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
MONTHS = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
]


def days_of(w):
    if not w:
        return None
    w = w.lower()
    if "(" in w or "plus" in w or " or " in w:
        return None
    return [DAYS.index(d) for d in DAYS if re.search(r"\b" + d + r"s?\b", w)] or None


def wd_of(date):
    return (dt.date.fromisoformat(date).weekday() + 1) % 7


def summer(text):
    m = re.search(
        r"(" + "|".join(MONTHS) + r")\s+1\s+through\s+(" + "|".join(MONTHS) + r")\b(?!\s+\d)",
        text,
        re.I,
    )
    if not m:
        return None
    a, b = MONTHS.index(m.group(1).lower()) + 1, MONTHS.index(m.group(2).lower()) + 1
    return list(range(a, b + 1)) if a <= b else None


def classify(s, wds):
    if str(s.get("source_date")) not in ("2026", "standing"):
        return None
    p = (s.get("week_pattern") or "").strip()
    q = p.lower()
    text = s.get("area_note") or ""
    if re.fullmatch(r"\d{4}-\d\d-\d\d", p):
        return {"kind": "D", "date": p}
    if not wds:
        return None
    if re.search(r"appointment|\bplus\b|alternating white|white week", q + " " + text.lower()):
        return None
    if re.search(r"booklet lists|conflict", text.lower()):
        return None
    bare = re.sub(r"\([^)]*\)", "", q).strip(" ;")
    if bare in ("weekly", "every week"):
        if re.search(r"\bonly\b", text, re.I):
            ms = summer(text)
            if ms and re.search(r"summer|extra", text, re.I):
                return {"kind": "W", "months": ms}
            return None
        return {"kind": "W"}
    if (
        re.search(r"every other|bi-?weekly|alternating weeks", q)
        and s.get("anchor_date")
        and len(wds) == 1
        and wd_of(s["anchor_date"]) == wds[0]
    ):
        return {"kind": "B", "anchor": s["anchor_date"]}
    m = re.match(
        r"^(\d)(?:st|nd|rd|th)\s*(?:and|&)\s*(\d)(?:st|nd|rd|th)\s+\w+( of the month)?(;.*)?$",
        q,
    )
    if m:
        return {"kind": "M", "nth": [int(m.group(1)), int(m.group(2))]}
    return None


HOLIDAYS = {
    "2026-01-01",
    "2026-01-19",
    "2026-02-16",
    "2026-05-25",
    "2026-07-04",
    "2026-09-07",
    "2026-10-12",
    "2026-11-11",
    "2026-11-26",
    "2026-12-25",
    "2027-01-01",
}

R = json.loads(Path("towns_research_v4.json").read_text(encoding="utf-8-sig"))


def trash_status(town):
    trash = [s for s in town.get("schedules") or [] if s.get("stream") == "trash"]
    if not trash:
        return "n"
    if any(classify(s, days_of(s.get("weekday"))) for s in trash):
        return "y"
    if any((s.get("week_pattern") or "") == "custom" and not s.get("weekday") for s in trash):
        return "private"
    return "n"


def recycling_status(town):
    rec = [s for s in town.get("schedules") or [] if s.get("stream") == "recycling"]
    if any(classify(s, days_of(s.get("weekday"))) for s in rec):
        return "y"
    return "n"


print("town|trash|recycling|ok|held|why")
tot_ok = tot_h = 0
mismatches = []
holiday_flags = []

for slug, town in R.items():
    ok = held = 0
    reasons = []
    for s in town.get("schedules") or []:
        c = classify(s, days_of(s.get("weekday")))
        if c:
            ok += 1
        else:
            held += 1
            if len(reasons) < 6:
                reasons.append(
                    f"{s.get('stream')}: wp={str(s.get('week_pattern'))[:36]!r} | {(s.get('area_note') or '')[:50]}"
                )
        if s.get("anchor_date") and s.get("weekday"):
            wds = days_of(s["weekday"])
            if wds and wd_of(s["anchor_date"]) != wds[0]:
                mismatches.append(f"{slug}: anchor {s['anchor_date']} vs {s['weekday']}")
        wp = s.get("week_pattern") or ""
        if re.fullmatch(r"\d{4}-\d\d-\d\d", wp):
            if s.get("weekday"):
                wds = days_of(s["weekday"])
                if wds and wd_of(wp) != wds[0]:
                    mismatches.append(f"{slug}: ISO {wp} vs {s['weekday']}")
            if wp in HOLIDAYS:
                holiday_flags.append(f"{slug} {s.get('stream')} {wp}")
    tot_ok += ok
    tot_h += held
    print(f"{slug}|{trash_status(town)}|{recycling_status(town)}|{ok}|{held}|{' ;; '.join(reasons[:3])}")

print("TOTAL", tot_ok, tot_h)
print("MISMATCHES", len(mismatches))
for m in mismatches[:25]:
    print(" ", m)
print("HOLIDAY_ISO", len(holiday_flags))
for h in holiday_flags[:20]:
    print(" ", h)
