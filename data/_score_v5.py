"""Score towns_research_v5.json against merge_research classify shapes."""
from __future__ import annotations

import datetime as dt
import json
import re
from pathlib import Path

DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
MONTHS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
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


def main():
    path = Path(__file__).with_name("towns_research_v5.json")
    R = json.loads(path.read_text(encoding="utf-8-sig"))
    total_ok = total_held = 0
    print(f"{'slug':22} {'tr':8} {'rc':4} {'ok':4} {'held':4} ov")
    for slug, t in sorted(R.items()):
        sch = t.get("schedules") or []
        ok = held = 0
        held_detail = []
        for s in sch:
            c = classify(s, days_of(s.get("weekday")))
            if c:
                ok += 1
            elif (s.get("week_pattern") or "") == "custom" and not s.get("weekday"):
                pass
            else:
                held += 1
                held_detail.append(s)
        tr, rc = trash_status(t), recycling_status(t)
        ov = len(t.get("holiday_overrides") or [])
        total_ok += ok
        total_held += held
        print(f"{slug:22} {tr:8} {rc:4} {ok:4} {held:4} {ov}")
        if held and (tr == "n" or rc == "n" or held <= 8):
            for s in held_detail[:6]:
                print(
                    "  HELD",
                    s.get("stream"),
                    s.get("weekday"),
                    s.get("week_pattern"),
                    "sd",
                    s.get("source_date"),
                    "anch",
                    s.get("anchor_date"),
                    (s.get("area_note") or "")[:65],
                )
    print("TOTAL ok", total_ok, "held", total_held)


if __name__ == "__main__":
    main()
