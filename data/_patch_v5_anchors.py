"""Patch towns_research_v5.json: fix every-other-week recycling anchors and ISO weekday mismatches.

Anchors are never invented. They come from:
  1) listed 2026 dates in area_note (first date on the stated weekday), or
  2) primary-source tables below (Green Booklet PNGs/PDF txt, ward PDF, map PDF, calendars).

Merge indexing: days_of maps monday->1 (Sunday=0). Anchor must satisfy
  (date.weekday()+1)%7 == days_of(weekday)[0].
"""
from __future__ import annotations

import datetime as dt
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PATH = ROOT / "towns_research_v5.json"

DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
PY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
MONTH = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}

# (slug, area_note head prefix -> first 2026 collection ON stated weekday)
# Verified from local primary sources / official pages (see comments).
SOURCE_ANCHORS: dict[tuple[str, str], tuple[str, str]] = {
    # hazlet Green Booklet 2026 (hazlet_p8/p9/p12/p13): first weekday collection, skip holiday shifts
    ("hazlet", "Zone 1"): ("Tuesday", "2026-01-06"),
    ("hazlet", "Zone 2"): ("Tuesday", "2026-01-13"),
    ("hazlet", "Zone 3"): ("Wednesday", "2026-01-07"),
    ("hazlet", "Zone 4"): ("Wednesday", "2026-01-14"),
    ("hazlet", "Zone 5"): ("Thursday", "2026-01-08"),
    ("hazlet", "Zone 6"): ("Thursday", "2026-01-15"),  # Jan 5 Mon is holiday-shifted; first Thu is Jan 15
    ("hazlet", "Zone 7"): ("Friday", "2026-01-09"),
    ("hazlet", "Zone 8"): ("Friday", "2026-01-02"),
    # old-bridge 2026 recycling PDF ward columns
    ("old-bridge", "Ward 1"): ("Monday", "2026-01-05"),
    ("old-bridge", "Ward 2"): ("Tuesday", "2026-01-06"),
    ("old-bridge", "Wards 3 and 4"): ("Wednesday", "2026-01-07"),
    ("old-bridge", "Ward 5"): ("Thursday", "2026-01-08"),
    ("old-bridge", "Ward 6"): ("Friday", "2026-01-09"),
    ("old-bridge", "Exception: Central Park"): ("Monday", "2026-01-05"),
    ("old-bridge", "Exception: The Arbors"): ("Tuesday", "2026-01-06"),
    # piscataway 2026 curb map PDF
    ("piscataway", "Sec 4, 5, 6, 7"): ("Monday", "2026-01-05"),
    ("piscataway", "Sec 1, 2, 3, 10"): ("Tuesday", "2026-01-06"),
    ("piscataway", "Sec 8, 9"): ("Wednesday", "2026-01-07"),
    # south-plainfield Curbside page 2026 table
    ("south-plainfield", "Thursday recycling district"): ("Thursday", "2026-01-08"),
    ("south-plainfield", "Friday recycling district"): ("Friday", "2026-01-09"),
    # keyport 2026 Recycling Schedule and Map
    ("keyport", "Zones 1 and 2"): ("Wednesday", "2026-01-07"),
    ("keyport", "Zones 3 and 4"): ("Wednesday", "2026-01-14"),
    # little-silver 2026 Residential Recycling Schedule
    ("little-silver", "Zone 1"): ("Wednesday", "2026-01-07"),
    ("little-silver", "Zone 2"): ("Wednesday", "2026-01-14"),
    # union-beach 2026 Trash and Recycling Collection Calendar
    ("union-beach", "Section A"): ("Wednesday", "2026-01-14"),
    ("union-beach", "Section B"): ("Wednesday", "2026-01-07"),
    # sayreville MCIA bi-weekly page; Thu Jan 1 moved to Sat Jan 3 -> first regular Thu is Jan 15
    ("sayreville", "MCIA county program"): ("Tuesday", "2026-01-13"),
    ("sayreville", "MCIA: Laurel Park"): ("Wednesday", "2026-01-14"),
    ("sayreville", "MCIA: Lower Sayreville"): ("Thursday", "2026-01-15"),
    ("sayreville", "MCIA: Sayreville proper"): ("Friday", "2026-01-02"),
    # neptune-township 2026 Street Index / January calendar
    ("neptune-township", "Recycling sub-zone A1"): ("Monday", "2026-01-12"),
    ("neptune-township", "Recycling sub-zone A2"): ("Monday", "2026-01-05"),
    ("neptune-township", "Recycling sub-zone B1"): ("Tuesday", "2026-01-13"),
    ("neptune-township", "Recycling sub-zone B2"): ("Tuesday", "2026-01-06"),
    ("neptune-township", "Recycling sub-zone C1"): ("Friday", "2026-01-02"),
    ("neptune-township", "Recycling sub-zone C2"): ("Friday", "2026-01-09"),
    ("neptune-township", "Recycling sub-zone D1"): ("Thursday", "2026-01-15"),
    ("neptune-township", "Recycling sub-zone D2"): ("Thursday", "2026-01-08"),
}


def days_of(w: str | None) -> list[int] | None:
    if not w:
        return None
    w = w.lower()
    if "(" in w or "plus" in w or " or " in w:
        return None
    return [DAYS.index(d) for d in DAYS if re.search(r"\b" + d + r"s?\b", w)] or None


def wd_of(date: str) -> int:
    return (dt.date.fromisoformat(date).weekday() + 1) % 7


def area_head(note: str) -> str:
    note = (note or "").strip()
    m = re.search(r"[;:]|\.\s", note)
    if not m:
        return note
    return note[: m.start()].strip(" .")


def parse_listed_2026_dates(note: str) -> list[dt.date]:
    """Parse '2026 dates: Jan 7, 21; Feb 4, 18; ...' from area_note."""
    m = re.search(r"2026 dates?:\s*(.+?)(?:\.\s|Note:|$)", note or "", re.I | re.S)
    if not m:
        return [dt.date.fromisoformat(x) for x in re.findall(r"2026-\d{2}-\d{2}", note or "")]
    blob = m.group(1)
    dates: list[dt.date] = []
    cur_month: int | None = None
    for part in re.split(r";", blob):
        part = part.strip()
        if not part:
            continue
        mm = re.match(r"([A-Za-z]+)\.?\s+(.+)", part)
        if mm:
            key = mm.group(1).lower()
            mon = MONTH.get(key) or MONTH.get(key[:3])
            if mon:
                cur_month = mon
                days_str = mm.group(2)
            else:
                days_str = part
        else:
            days_str = part
        if not cur_month:
            continue
        for d in re.findall(r"\d{1,2}", days_str):
            try:
                dates.append(dt.date(2026, cur_month, int(d)))
            except ValueError:
                pass
    return dates


def first_on_weekday(dates: list[dt.date], weekday_name: str) -> str | None:
    wds = days_of(weekday_name)
    if not wds or len(wds) != 1:
        return None
    want = wds[0]
    for d in dates:
        if wd_of(d.isoformat()) == want:
            return d.isoformat()
    return None


def lookup_source(slug: str, note: str) -> tuple[str, str] | None:
    note = note or ""
    for (s, prefix), pair in SOURCE_ANCHORS.items():
        if s != slug:
            continue
        if note.startswith(prefix) or area_head(note).startswith(prefix.rstrip(":")):
            return pair
    return None


def is_biweekly(pattern: str) -> bool:
    return bool(re.search(r"every other|bi-?weekly|alternating weeks", (pattern or ""), re.I))


def needs_anchor_fix(s: dict) -> bool:
    """True if every-other-week recycling row is missing anchor or weekday/anchor mismatch."""
    if s.get("stream") != "recycling" or not is_biweekly(s.get("week_pattern") or ""):
        return False
    ad = s.get("anchor_date")
    wds = days_of(s.get("weekday"))
    if not ad:
        return True
    if not wds or len(wds) != 1:
        return True
    return wd_of(ad) != wds[0]


def compute_anchor(slug: str, s: dict) -> tuple[str | None, str | None]:
    """Return (weekday, anchor) from listed dates or source table. None if unknown."""
    note = s.get("area_note") or ""
    weekday = s.get("weekday")
    listed = parse_listed_2026_dates(note)
    if listed and weekday:
        a = first_on_weekday(listed, weekday)
        if a:
            return weekday, a
    src = lookup_source(slug, note)
    if src:
        return src
    # If weekday known but no listed dates: refuse to invent
    return weekday, None


def fix_iso_weekday(s: dict) -> tuple[str | None, str | None]:
    """If week_pattern is ISO date and weekday name mismatches date, return (old, new) weekday."""
    p = (s.get("week_pattern") or "").strip()
    if not re.fullmatch(r"\d{4}-\d\d-\d\d", p):
        return None, None
    exp = PY_NAMES[dt.date.fromisoformat(p).weekday()]
    wn = s.get("weekday")
    if wn and wn.lower() == exp.lower():
        return None, None
    if wn == exp:
        return None, None
    return wn, exp


def main() -> None:
    data = json.loads(PATH.read_text(encoding="utf-8-sig"))
    changes: list[tuple[str, str, str, str | None, str | None]] = []

    for slug, town in data.items():
        schedules = town.get("schedules") or []
        for s in schedules:
            # --- ISO weekday name vs date ---
            old_wd, new_wd = fix_iso_weekday(s)
            if new_wd is not None:
                head = area_head(s.get("area_note") or "")[:80]
                changes.append((slug, s.get("stream") or "", head, f"weekday:{old_wd}", f"weekday:{new_wd}"))
                s["weekday"] = new_wd

            # --- every-other-week recycling anchors ---
            if s.get("stream") != "recycling" or not is_biweekly(s.get("week_pattern") or ""):
                continue

            old_anchor = s.get("anchor_date")
            note = s.get("area_note") or ""
            head = area_head(note)[:80]

            # Prefer source table for priority towns (authoritative), else listed dates
            src = lookup_source(slug, note)
            listed = parse_listed_2026_dates(note)
            new_weekday = s.get("weekday")
            new_anchor = None

            if src:
                new_weekday, new_anchor = src
            elif listed and s.get("weekday"):
                new_anchor = first_on_weekday(listed, s["weekday"])
            elif needs_anchor_fix(s):
                new_weekday, new_anchor = compute_anchor(slug, s)

            if new_weekday and new_weekday != s.get("weekday"):
                # only change weekday when source table says so and current mismatches anchor rules
                if needs_anchor_fix(s) or (old_anchor and wd_of(old_anchor) != (days_of(new_weekday) or [None])[0]):
                    changes.append((slug, "recycling", head, f"weekday:{s.get('weekday')}", f"weekday:{new_weekday}"))
                    s["weekday"] = new_weekday

            if new_anchor and new_anchor != old_anchor:
                # Apply when missing, mismatched, or source disagrees with stored value
                wds = days_of(s.get("weekday"))
                mismatch = (not old_anchor) or (wds and len(wds) == 1 and wd_of(old_anchor) != wds[0])
                source_override = src is not None and old_anchor != new_anchor
                if mismatch or source_override:
                    # Guard: never write an anchor that fails weekday check
                    if wds and len(wds) == 1 and wd_of(new_anchor) != wds[0]:
                        continue
                    changes.append((slug, "recycling", head, old_anchor, new_anchor))
                    s["anchor_date"] = new_anchor
            elif needs_anchor_fix(s) and not new_anchor:
                # cannot invent
                pass

    PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Wrote {PATH}")
    print(f"changes: {len(changes)}")
    for c in changes:
        print(c)


if __name__ == "__main__":
    main()
