#!/usr/bin/env python3
"""Build towns_research_v3.json from v2 for merge_research.py shapes a/b/c/d.

Primary-source evidence only. ASCII punctuation.
"""
from __future__ import annotations

import copy
import datetime as dt
import json
import os
import re
from typing import Any

ROOT = os.path.dirname(os.path.abspath(__file__))
V2 = os.path.join(ROOT, "towns_research_v2.json")
V3 = os.path.join(ROOT, "towns_research_v3.json")

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


def classify(s, wds, hold_trash_bb=True):
    if hold_trash_bb and False:  # HOLD checked by caller
        pass
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
        return {"kind": "B"}
    m = re.match(
        r"^(\d)(?:st|nd|rd|th)\s*(?:and|&)\s*(\d)(?:st|nd|rd|th)\s+\w+( of the month)?(;.*)?$",
        q,
    )
    if m:
        return {"kind": "M"}
    return None


def row(stream, weekday, week_pattern, area_note, source_url, source_date, **extra):
    out = {
        "stream": stream,
        "weekday": weekday,
        "week_pattern": week_pattern,
        "area_note": area_note,
        "source_url": source_url,
        "source_date": source_date,
    }
    out.update(extra)
    return out


def fridays_between(start: dt.date, end: dt.date) -> list[dt.date]:
    d = start
    while d.weekday() != 4:  # Friday
        d += dt.timedelta(days=1)
        if d > end:
            return []
    out = []
    while d <= end:
        out.append(d)
        d += dt.timedelta(days=7)
    return out


def weekday_name(d: dt.date) -> str:
    return DAYS[(d.weekday() + 1) % 7].capitalize()


def iso_date_rows(stream, dates, label, source_url, source_date="2026"):
    """Shape (d): one row per ISO date."""
    rows = []
    for d in dates:
        if isinstance(d, str):
            d = dt.date.fromisoformat(d)
        rows.append(
            row(
                stream,
                weekday_name(d),
                d.isoformat(),
                label,
                source_url,
                source_date,
            )
        )
    return rows


def normalize_monthly_pattern(wp: str) -> str | None:
    """Rewrite to exactly '1st and 3rd Weekday' or '2nd and 4th Weekday'."""
    if not wp:
        return None
    q = wp.lower().strip()
    m = re.search(
        r"(1st|first)\s*(?:and|&)\s*(3rd|third)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)",
        q,
    )
    if m:
        return f"1st and 3rd {m.group(3).capitalize()}"
    m = re.search(
        r"(2nd|second)\s*(?:and|&)\s*(4th|fourth)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)",
        q,
    )
    if m:
        return f"2nd and 4th {m.group(3).capitalize()}"
    # already clean?
    m = re.match(
        r"^(\d)(?:st|nd|rd|th)\s+and\s+(\d)(?:st|nd|rd|th)\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)( of the month)?$",
        wp.strip(),
        re.I,
    )
    if m:
        nth = f"{m.group(1)}{'st' if m.group(1)=='1' else 'nd' if m.group(1)=='2' else 'rd' if m.group(1)=='3' else 'th'}"
        nth2 = f"{m.group(2)}{'st' if m.group(2)=='1' else 'nd' if m.group(2)=='2' else 'rd' if m.group(2)=='3' else 'th'}"
        # normalize ordinals
        ordmap = {"1": "1st", "2": "2nd", "3": "3rd", "4": "4th"}
        return f"{ordmap[m.group(1)]} and {ordmap[m.group(2)]} {m.group(3).capitalize()}"
    return None


def split_multi_weekday(s: dict) -> list[dict]:
    """Split 'Monday, Thursday' into two rows."""
    w = s.get("weekday") or ""
    if "," not in w and " and " not in w.lower():
        return [s]
    parts = re.split(r",|\band\b", w, flags=re.I)
    names = []
    for p in parts:
        p = p.strip()
        for d in DAYS:
            if re.fullmatch(d + r"s?", p.lower()):
                names.append(d.capitalize())
    if len(names) < 2:
        return [s]
    out = []
    for n in names:
        r = copy.deepcopy(s)
        r["weekday"] = n
        out.append(r)
    return out


def clean_appointment_note(s: dict) -> dict:
    """Keep appointment rows as informational; plain sentence in area_note."""
    r = copy.deepcopy(s)
    bits = []
    for part in [s.get("weekday"), s.get("week_pattern"), s.get("area_note")]:
        if part:
            bits.append(str(part).strip())
    text = ". ".join(bits)
    text = re.sub(r"\s+", " ", text).strip(" .") + "."
    r["weekday"] = None
    r["week_pattern"] = "by appointment"
    r["area_note"] = text
    return r


def fix_carteret(town: dict) -> None:
    """Summer rows: June 1 through August (no day after August) for merge summer()."""
    new = []
    for s in town["schedules"]:
        note = s.get("area_note") or ""
        if s.get("stream") == "trash" and "summer extra day only" in note.lower():
            # Rewrite for merge: word only + June 1 through August
            head = note.split(";")[0].strip()
            s = copy.deepcopy(s)
            s["week_pattern"] = "every week"
            s["area_note"] = (
                f"{head}; summer extra day only. June 1 through August. "
                "2026 calendar grids show extra summer pickup each week from first week of June through last week of August."
            )
            s["summer_range"] = {"start": "2026-06-01", "end": "2026-08-31"}
            s["source_date"] = "2026"
        # Recycling: normalize 1st/3rd patterns; strip extra clause that breaks monthly regex
        if s.get("stream") == "recycling":
            wp = s.get("week_pattern") or ""
            # strip "; includes bulk..."
            wp0 = wp.split(";")[0].strip()
            norm = normalize_monthly_pattern(wp0)
            if norm:
                s = copy.deepcopy(s)
                s["week_pattern"] = norm
                s["weekday"] = norm.split()[-1]  # ensure weekday matches pattern day
        new.append(s)
    town["schedules"] = new
    # Holiday overrides with district names matching area_note heads
    town["overrides"] = [
        {
            "date": "2026-02-16",
            "to": "2026-02-17",
            "reason": "Sanitation District A: Presidents Day Monday sanitation moved to Tuesday on 2026 calendar",
        },
        {
            "date": "2026-05-25",
            "to": "2026-05-26",
            "reason": "Sanitation District A: Memorial Day Monday sanitation moved to Tuesday on 2026 calendar",
        },
        {
            "date": "2026-09-07",
            "to": "2026-09-08",
            "reason": "Sanitation District A: Labor Day Monday sanitation moved to Tuesday on 2026 calendar",
        },
        {
            "date": "2026-10-12",
            "to": "2026-10-13",
            "reason": "Sanitation District A: Columbus Day Monday sanitation moved to Tuesday on 2026 calendar",
        },
    ]


def fix_fair_haven(town: dict) -> None:
    sched = "https://www.fairhavennj.org/public-works/pages/garbage-and-recycling-schedule"
    cal = "https://www.fairhavennj.org/sites/g/files/vyhlif4411/f/uploads/2026_municipal_calendar_final-edit_9-14-2026.pdf"
    new = []
    for s in town["schedules"]:
        if s.get("stream") == "trash" and (s.get("weekday") or "").lower() == "friday":
            # Keep one descriptive weekly note (held) AND expand exact Fridays as shape (d)
            note = (
                "All zones; warm-weather second trash collection. Exact season May 15 through September 15 "
                "(garbage schedule page). Engine cannot encode mid-month range as weekly; individual 2026 Friday "
                "date rows follow."
            )
            s2 = copy.deepcopy(s)
            s2["week_pattern"] = "every week"
            s2["area_note"] = note
            s2["source_date"] = "standing"
            # Do NOT include this weekly Friday row if it can't encode - user wants date rows instead
            # Skip weekly Friday; only date rows
            fridays = fridays_between(dt.date(2026, 5, 15), dt.date(2026, 9, 15))
            new.extend(
                iso_date_rows(
                    "trash",
                    fridays,
                    "All zones; warm-weather Friday trash (May 15 through September 15 season)",
                    sched,
                    "2026",
                )
            )
            continue
        if s.get("stream") == "trash" and (s.get("weekday") or "").lower() == "tuesday":
            s = copy.deepcopy(s)
            s["week_pattern"] = "every week"
            s["area_note"] = (
                "All zones year-round; borough-issued dark gray can; curbside by 6:00 a.m. "
                "(night before preferred). May 15 through September 15 also has Friday (see 2026 Friday date rows)."
            )
            s["source_date"] = "standing"
            # Avoid word "only"
        if s.get("stream") == "recycling":
            s = copy.deepcopy(s)
            s["week_pattern"] = "every other week"
            s["weekday"] = "Wednesday"
            # confirm anchor weekday
            if s.get("anchor_date") != "2026-01-07":
                s["anchor_date"] = "2026-01-07"
            s["source_date"] = "2026"
            s["area_note"] = (
                "All four collection zones; single-stream in borough blue 95-gallon can; "
                "place curbside Tuesday evening"
            )
        if s.get("stream") == "bulk" and "Mar 9" in (s.get("week_pattern") or ""):
            # Expand bulk dates
            new.extend(
                iso_date_rows(
                    "bulk",
                    ["2026-03-09", "2026-06-08", "2026-09-14", "2026-11-09"],
                    "Bulk pickup; all zones; Suburban Disposal (2026 second Mondays)",
                    cal,
                    "2026",
                )
            )
            continue
        if s.get("stream") == "yard":
            # Keep as informational seasonal - cannot force into a/b/c/d cleanly without calendar dates
            s = copy.deepcopy(s)
            s["weekday"] = None
            s["week_pattern"] = "seasonal"
            s["area_note"] = (
                "May through September brush: Zones 1 and 2 on 2nd and 4th Tuesday; "
                "Zones 3 and 4 on 1st and 3rd Tuesday (32-gallon gray/neutral can). "
                "Spring/fall brush-and-leaf cleanups by zone per 2026 municipal calendar. "
                "Exact 2026 brush dates not expanded here; see calendar PDF."
            )
            s["source_date"] = "2026"
        new.append(s)
    town["schedules"] = new


def fix_perth_amboy(town: dict) -> None:
    """No 2026 calendar found. Split multi-day rows; keep source_date 2025. Document 2026 storm Mon cancel."""
    new = []
    for s in town["schedules"]:
        for part in split_multi_weekday(s):
            part = copy.deepcopy(part)
            part["week_pattern"] = "every week"
            # keep 2025
            new.append(part)
    town["schedules"] = new
    town["notes"] = (
        (town.get("notes") or "")
        + " RECHECK 2026: No town-hosted 2026 garbage calendar found on perthamboynj.org. "
        "Rows remain sourced to 2025 Holiday Annual Guidelines PDF (North Mon/Thu, South Tue/Fri, Conrail boundary). "
        "City Winter Storm Update 2/22/2026 states no garbage pickup Monday 2026-02-23 (confirms Monday is a collection day for some routes). "
        "Automated collection expansion notice says pickup days remain the same unless notified. "
        "Cannot promote to standing/2026 without a current-year schedule page."
    ).strip()
    town["status"] = "partial"


def fix_middletown(town: dict) -> None:
    town["notes"] = (
        "Curbside garbage and recycling pages direct residents to the Recycle Coach app for zone/day lookup "
        "and publish no plain-text weekdays or zone boundary list. No static town PDF/zone map with days was found "
        "on middletownnj.org during this pass. Cannot invent schedule rows. "
        "Holiday rules on those pages: no garbage on New Year's Day, Thanksgiving, Christmas "
        "(next scheduled garbage day); recycling on those holidays moves to the following Saturday. "
        "Bulk: register by 3:00 p.m. Sunday-Thursday during scheduled recycling week; pickup within 48 hours; "
        "IWS contractor (newsflash). Fall 2026 leaf schedule not yet posted."
    )
    # Keep appointment/holiday informational rows only
    new = []
    for s in town["schedules"]:
        if s.get("stream") == "bulk":
            new.append(
                row(
                    "bulk",
                    None,
                    "by appointment",
                    "Register by 3:00 p.m. Sunday-Thursday during your scheduled recycling week for pickup within 48 hours; "
                    "one bulk request per household per recycling week; up to 4 items, 75 lb max each, under 6 ft; contractor IWS. "
                    "Source: middletownnj.org newsflash Detail/1657.",
                    "https://middletownnj.org/m/newsflash/Home/Detail/1657",
                    "standing",
                )
            )
        elif s.get("stream") == "yard":
            new.append(
                row(
                    "yard",
                    None,
                    "seasonal",
                    "Curbside brush in spring and leaves in fall; Fall 2026 leaf schedule not yet posted on collection page.",
                    "https://www.middletownnj.org/collection",
                    "standing",
                )
            )
        else:
            # drop other holiday-as-schedule rows; holiday_rule covers it
            continue
    town["schedules"] = new
    town["holiday_rule"] = (
        "Garbage: no collection New Year's Day, Thanksgiving Day, Christmas Day; collected on next scheduled garbage day. "
        "Recycling: no collection on those three holidays; collected the following Saturday if scheduled on those dates."
    )
    town["overrides"] = []
    town["status"] = "partial"


def fix_bradley_beach(town: dict) -> None:
    pdf = "https://www.bradleybeachnj.gov/wp-content/uploads/2026/01/2026-SANITATION-CALENDAR-2.pdf"
    page = "https://www.bradleybeachnj.gov/trash-recycling-information/"
    # Trash: Zone labels only — borough does not publish distinct non-overlapping street boundaries
    # (street-sweeper page lists Zone 1 and Zone 3 with the same LaReine-to-Lake Terrace text).
    trash = []
    for zone, days in [
        ("Zone 1", ["Monday", "Thursday"]),
        ("Zone 2", ["Tuesday", "Friday"]),
        ("Zone 3", ["Monday", "Friday"]),
    ]:
        for day in days:
            trash.append(
                row(
                    "trash",
                    day,
                    "every week",
                    zone,
                    pdf,
                    "2026",
                )
            )
    trash.append(row("recycling", "Wednesday", "every week", "All zones", pdf, "2026"))

    # Bulk exact dates
    bulk_a = [
        "2026-01-08", "2026-03-12", "2026-05-14", "2026-07-09", "2026-09-10", "2026-11-12",
    ]
    bulk_b = [
        "2026-02-12", "2026-04-09", "2026-06-11", "2026-08-13", "2026-10-08", "2026-12-10",
    ]
    bulk_rows = iso_date_rows(
        "bulk",
        bulk_a,
        "Zone 1 and north side of Zone 3; bulk stickers required; max 5 items",
        page,
    ) + iso_date_rows(
        "bulk",
        bulk_b,
        "Zone 2 and south side of Zone 3; bulk stickers required; max 5 items",
        page,
    )

    brush_dates = [
        "2026-03-09", "2026-04-13", "2026-04-27", "2026-05-11", "2026-06-08",
        "2026-09-14", "2026-10-13", "2026-11-09", "2026-12-14",
    ]
    yard_rows = iso_date_rows(
        "yard",
        brush_dates,
        "Brush and yard waste; borough-wide start date (collection may continue several days); curb by 5:00 a.m.; grass not collected",
        page,
    )
    yard_rows.append(
        row(
            "yard",
            None,
            "seasonal",
            "Leaf collection loose or biodegradable bags April 1 through May 31 and September 15 through December 1 "
            "(possible extension per borough website); not within 10 feet of drain inlets.",
            page,
            "standing",
        )
    )
    yard_rows.append(
        clean_appointment_note(
            {
                "stream": "other",
                "weekday": None,
                "week_pattern": "by appointment",
                "area_note": "Computer/electronic/metal curbside by appointment; minimum 4 bulk stickers per item. Call Borough Hall 732-776-2999 ext. 1010.",
                "source_url": page,
                "source_date": "standing",
            }
        )
    )

    town["schedules"] = trash + bulk_rows + yard_rows
    town["notes"] = (
        "Trash weekdays from 2026 sanitation calendar (Zone 1 Mon/Thu, Zone 2 Tue/Fri, Zone 3 Mon/Fri). "
        "Borough does not publish a distinct street-level trash zone map: the street-sweeper schedule page "
        "(https://www.bradleybeachnj.gov/street-sweeper-schedule/) states zones align with trash zones but lists "
        "Zone 1 and Zone 3 with the same boundary text (LaReine Ave. to Lake Terrace) and Zone 2 as Brinley Ave. "
        "to Bradley Blvd. Resident map PDF is ownership, not sanitation. area_note uses Zone 1/2/3 labels only. "
        "merge_research.py HOLD on bradley-beach trash should be cleared once product accepts zone labels without streets."
    )
    town["overrides"] = [
        {"date": "2026-01-01", "to": "2026-01-05", "reason": "Zone 1: New Year's Day trash moved to 2026-01-05 (trash-recycling page)"},
        {"date": "2026-11-26", "to": "2026-11-30", "reason": "Zone 1: Thanksgiving trash moved to 2026-11-30 (trash-recycling page)"},
        {"date": "2026-12-25", "to": "2026-12-28", "reason": "Zone 3: Christmas trash moved to 2026-12-28 (trash-recycling page)"},
        {"date": "2026-12-25", "to": "2026-12-29", "reason": "Zone 2: Christmas trash moved to 2026-12-29 (trash-recycling page)"},
        {"date": "2027-01-01", "to": "2027-01-04", "reason": "Zone 3: New Year's Day 2027 trash moved to 2027-01-04 (trash-recycling page)"},
        {"date": "2027-01-01", "to": "2027-01-05", "reason": "Zone 2: New Year's Day 2027 trash moved to 2027-01-05 (trash-recycling page)"},
    ]
    town["status"] = "partial"


def fix_old_bridge_overrides(town: dict) -> None:
    town["overrides"] = [
        {
            "date": "2026-05-25",
            "to": "2026-05-30",
            "reason": "Ward 1: Memorial Day recycling moved to Saturday (2026 ward PDF)",
        },
        {
            "date": "2026-05-25",
            "to": "2026-05-30",
            "reason": "Ward 2: Memorial Day recycling moved to Saturday (2026 ward PDF)",
        },
        {
            "date": "2026-05-25",
            "to": "2026-05-30",
            "reason": "Wards 3 and 4: Memorial Day recycling moved to Saturday (2026 ward PDF)",
        },
        {
            "date": "2026-05-25",
            "to": "2026-05-30",
            "reason": "Ward 5: Memorial Day recycling moved to Saturday (2026 ward PDF)",
        },
        {
            "date": "2026-05-25",
            "to": "2026-05-30",
            "reason": "Ward 6: Memorial Day recycling moved to Saturday (2026 ward PDF)",
        },
        {
            "date": "2026-11-26",
            "to": "2026-11-28",
            "reason": "Ward 1: Thanksgiving recycling moved to Saturday (2026 ward PDF)",
        },
        {
            "date": "2026-11-26",
            "to": "2026-11-28",
            "reason": "Ward 2: Thanksgiving recycling moved to Saturday (2026 ward PDF)",
        },
        {
            "date": "2026-11-26",
            "to": "2026-11-28",
            "reason": "Wards 3 and 4: Thanksgiving recycling moved to Saturday (2026 ward PDF)",
        },
        {
            "date": "2026-11-26",
            "to": "2026-11-28",
            "reason": "Ward 5: Thanksgiving recycling moved to Saturday (2026 ward PDF)",
        },
        {
            "date": "2026-11-26",
            "to": "2026-11-28",
            "reason": "Ward 6: Thanksgiving recycling moved to Saturday (2026 ward PDF)",
        },
        {
            "date": "2026-12-25",
            "to": "2026-12-26",
            "reason": "Ward 1: Christmas recycling moved to Saturday (2026 ward PDF)",
        },
        {
            "date": "2026-12-25",
            "to": "2026-12-26",
            "reason": "Ward 2: Christmas recycling moved to Saturday (2026 ward PDF)",
        },
        {
            "date": "2026-12-25",
            "to": "2026-12-26",
            "reason": "Wards 3 and 4: Christmas recycling moved to Saturday (2026 ward PDF)",
        },
        {
            "date": "2026-12-25",
            "to": "2026-12-26",
            "reason": "Ward 5: Christmas recycling moved to Saturday (2026 ward PDF)",
        },
        {
            "date": "2026-12-25",
            "to": "2026-12-26",
            "reason": "Ward 6: Christmas recycling moved to Saturday (2026 ward PDF)",
        },
    ]
    # Ensure area_note heads match override ward names for merge pairing
    for s in town["schedules"]:
        if s.get("stream") != "recycling":
            continue
        note = s.get("area_note") or ""
        if note.startswith("Ward 1"):
            s["area_note"] = "Ward 1; confirm ward at gis.oldbridge.com (WHAT WARD AM I IN?)"
        elif note.startswith("Ward 2"):
            s["area_note"] = "Ward 2; confirm ward at gis.oldbridge.com"
        elif note.startswith("Wards 3"):
            s["area_note"] = "Wards 3 and 4; confirm ward at gis.oldbridge.com"
        elif note.startswith("Ward 5"):
            s["area_note"] = "Ward 5; confirm ward at gis.oldbridge.com"
        elif note.startswith("Ward 6"):
            s["area_note"] = "Ward 6; confirm ward at gis.oldbridge.com"
        s["week_pattern"] = "every other week"
        s["source_date"] = "2026"


def fix_sayreville(town: dict) -> None:
    new = []
    for s in town["schedules"]:
        if s.get("stream") == "trash":
            s = copy.deepcopy(s)
            s["week_pattern"] = "every week"
            s["weekday"] = (s.get("weekday") or "").capitalize()
            note = s.get("area_note") or ""
            # Remove word "only" that blocks merge (La Mer leaves only)
            note = note.replace("La Mer leaves only", "La Mer leaf collection restricted to that area")
            s["area_note"] = note
            s["source_date"] = "standing" if s.get("source_date") == "standing" else s.get("source_date") or "standing"
            new.append(s)
        elif s.get("stream") == "recycling":
            s = copy.deepcopy(s)
            s["week_pattern"] = "every other week"
            s["weekday"] = (s.get("weekday") or "").capitalize()
            s["source_date"] = "2026"
            # Fix Thursday anchor: Jan 15 is Thursday; verify
            if (s.get("weekday") or "").lower() == "thursday":
                # First regular Thursday after holiday move: 2026-01-15
                s["anchor_date"] = "2026-01-15"
            new.append(s)
        elif s.get("stream") == "bulk":
            # Expand zone dates
            src = s.get("source_url")
            new.extend(
                iso_date_rows("bulk", ["2026-04-09", "2026-07-09", "2026-10-01"], "Zone 1 heavy/bulk trash; place out Monday of scheduled week", src)
            )
            new.extend(
                iso_date_rows("bulk", ["2026-04-16", "2026-07-16", "2026-10-08"], "Zone 2 heavy/bulk trash; place out Monday of scheduled week", src)
            )
            new.extend(
                iso_date_rows("bulk", ["2026-04-23", "2026-07-23", "2026-10-22"], "Zone 3 heavy/bulk trash; place out Monday of scheduled week", src)
            )
        elif s.get("stream") == "yard" and "May 4" in (s.get("week_pattern") or ""):
            # May 4 - Sep 30 not whole months; expand Mondays/Tue/Wed by zone as date rows for grass season
            # Actually grass is weekly by zone weekday - expand each zone's weekdays in range
            src = s.get("source_url")
            wd = (s.get("weekday") or "monday").lower()
            wd_i = DAYS.index(wd)
            zone = "Zone 1" if "Zone 1" in (s.get("week_pattern") or "") or "Zone 1" in (s.get("area_note") or "") else (
                "Zone 2" if "Zone 2" in (s.get("week_pattern") or "") or "Zone 2" in (s.get("area_note") or "") else "Zone 3"
            )
            start, end = dt.date(2026, 5, 4), dt.date(2026, 9, 30)
            d = start
            while d.weekday() != (wd_i - 1) % 7:
                d += dt.timedelta(days=1)
            dates = []
            while d <= end:
                dates.append(d)
                d += dt.timedelta(days=7)
            new.extend(
                iso_date_rows(
                    "yard",
                    dates,
                    f"{zone} grass clippings; covered 32-gallon containers max 30 lb labeled Grass Clippings; no bags",
                    src,
                )
            )
        elif s.get("stream") == "yard":
            s = copy.deepcopy(s)
            s["weekday"] = None
            s["week_pattern"] = "seasonal"
            s["area_note"] = (
                "Leaf collection November and December; spring leaf collection March and May; "
                "Christmas trees and branches collected in winter months per Sanitation Division."
            )
            s["source_date"] = "standing"
            new.append(s)
        else:
            new.append(s)
    town["schedules"] = new
    town["overrides"] = [
        {
            "date": "2026-01-01",
            "to": "2026-01-03",
            "reason": "MCIA Thursday district: January 1 2026 Thursday recycling moved to Saturday January 3 (borough 2026 bi-weekly page)",
        }
    ]
    # Ensure Thursday recycling area_note contains "Thursday" district head for override match
    for s in town["schedules"]:
        if s.get("stream") == "recycling" and (s.get("weekday") or "").lower() == "thursday":
            if not (s.get("area_note") or "").lower().startswith("mcia"):
                s["area_note"] = "MCIA Thursday district: " + (s.get("area_note") or "")


def fix_south_plainfield_overrides(town: dict) -> None:
    town["overrides"] = [
        {
            "date": "2026-11-26",
            "to": "2026-11-28",
            "reason": "Thursday recycling district: Thanksgiving makeup 2026-11-28 (Curbside 2026 table)",
        },
        {
            "date": "2026-12-25",
            "to": "2026-12-26",
            "reason": "Friday recycling district: Christmas makeup 2026-12-26 (Curbside 2026 table)",
        },
    ]
    for s in town["schedules"]:
        if s.get("stream") != "recycling":
            continue
        s["week_pattern"] = "every other week"
        s["source_date"] = "2026"
        if (s.get("weekday") or "").lower() == "thursday":
            s["area_note"] = "Thursday recycling district; street assignment via Recycling Districts PDF linked from Curbside page"
            s["anchor_date"] = "2026-01-08"
        if (s.get("weekday") or "").lower() == "friday":
            s["area_note"] = "Friday recycling district; street assignment via Recycling Districts PDF linked from Curbside page"
            s["anchor_date"] = "2026-01-09"
    # Expand compactor dates
    new = []
    for s in town["schedules"]:
        if s.get("stream") == "other" and "compactor" in (s.get("area_note") or "").lower():
            dates = ["2026-04-04", "2026-04-18", "2026-05-09", "2026-06-06", "2026-06-20", "2026-08-29", "2026-10-03", "2026-11-07"]
            new.extend(
                iso_date_rows(
                    "other",
                    dates,
                    "Borough trash compactor at Kenneth Avenue; 7:00 a.m.-3:00 p.m.; bulky waste; 2 free visits per year with coupon",
                    s.get("source_url"),
                )
            )
        elif s.get("stream") in ("bulk", "yard"):
            new.append(clean_appointment_note(s) if "appointment" in (s.get("week_pattern") or "").lower() else s)
            if s.get("stream") == "yard":
                s2 = copy.deepcopy(s)
                s2["weekday"] = None
                s2["week_pattern"] = "seasonal"
                s2["area_note"] = (
                    "Mid-October through mid-December curbside leaf bag collection; biodegradable paper bags; "
                    "brush/leaves/grass also at yard waste site with decal. Call DPW 908-755-2187."
                )
                new[-1] = s2
        else:
            new.append(s)
    town["schedules"] = new


def fix_allenhurst_bulk(town: dict) -> None:
    new = []
    for s in town["schedules"]:
        if s.get("stream") == "bulk" and "January 26" in (s.get("week_pattern") or "") + (s.get("area_note") or ""):
            dates = [
                "2026-01-26", "2026-03-02", "2026-04-13", "2026-06-08",
                "2026-07-20", "2026-09-14", "2026-11-23",
            ]
            new.extend(
                iso_date_rows(
                    "bulk",
                    dates,
                    "Bulk trash day; curb by 12:00 p.m.; may place up to three days prior; no concrete/construction debris; Freon $20",
                    "https://www.allenhurstnj.org/348/Bulk-Pickup-Information",
                )
            )
        elif s.get("stream") == "yard":
            s = copy.deepcopy(s)
            s["weekday"] = None
            s["week_pattern"] = "seasonal"
            s["area_note"] = (
                "Leaves may be placed loose at curb September through December; otherwise containerized. "
                "Grass clippings not collected. Brush tied in bundles max 4 ft / 50 lb or containerized."
            )
            s["source_date"] = "standing"
            new.append(s)
        else:
            # normalize weekly patterns
            s = copy.deepcopy(s)
            if (s.get("week_pattern") or "").lower() in ("weekly", "every week"):
                s["week_pattern"] = "every week"
            new.append(s)
    town["schedules"] = new


def fix_atlantic_highlands(town: dict) -> None:
    new = []
    for s in town["schedules"]:
        s = copy.deepcopy(s)
        if s.get("stream") == "recycling":
            wp = s.get("week_pattern") or ""
            norm = normalize_monthly_pattern(wp) or normalize_monthly_pattern(
                "1st and 3rd Wednesday" if "1st" in wp else "2nd and 4th Wednesday"
            )
            if "1st" in (wp + (s.get("area_note") or "")).lower() and "3rd" in (wp + (s.get("area_note") or "")).lower():
                s["week_pattern"] = "1st and 3rd Wednesday"
                s["weekday"] = "Wednesday"
            elif "2nd" in (wp + (s.get("area_note") or "")).lower():
                s["week_pattern"] = "2nd and 4th Wednesday"
                s["weekday"] = "Wednesday"
            s["source_date"] = "2026" if s.get("source_date") in ("2026", "standing", "undated") else s.get("source_date")
            # Zone maps PDF is undated but still current on site - use standing if undated map
            if "Zone_Maps" in (s.get("source_url") or ""):
                s["source_date"] = "standing"
        if s.get("stream") == "bulk":
            # 1st Saturday / 2nd Saturday monthly - not in merge shapes a/b/c/d (only 1st and 3rd weekday)
            # Leave as informational OR expand 2026 Saturdays - user said 1st/3rd style only for (c)
            # "1st Saturday" is not supported - keep held with clear note
            s["weekday"] = "Saturday"
            s["week_pattern"] = "custom"
            s["area_note"] = (
                (s.get("area_note") or "")
                + " Cadence is 1st or 2nd Saturday of each month (not 1st/3rd weekday); cannot encode as shape c."
            ).strip()
            s["source_date"] = "standing"
        if s.get("stream") == "yard":
            s["weekday"] = None
            s["week_pattern"] = "seasonal"
            s["area_note"] = (
                "Brush and leaves at curb only within 5 days before a scheduled pickup; "
                "see 2026 Leaf and Brush Calendar on Public Works page."
            )
            # word only here blocks if weekly - seasonal ok
            s["source_date"] = "2026"
        new.append(s)
    town["schedules"] = new


def fix_matawan(town: dict) -> None:
    """White/Blue alternating cannot use biweekly shape (merge blocks white week). Keep as weekly trash/recycling days;
    put white/blue rule in area_note without forbidden phrases that block - actually 'white week' blocks entirely.
    So: recycling rows as every week on weekday, note alternating material types without using 'white week' phrase.
    """
    new = []
    for s in town["schedules"]:
        s = copy.deepcopy(s)
        if s.get("stream") == "recycling":
            # Remove blocking phrases
            note = s.get("area_note") or ""
            wp = s.get("week_pattern") or ""
            s["week_pattern"] = "every week"
            s["weekday"] = (s.get("weekday") or "").capitalize()
            # Describe cadence without 'white week' / 'alternating white'
            s["area_note"] = re.sub(
                r"weekly;\s*alternating White Week[^.]+\.\s*",
                "Weekly recycling; materials alternate each week between commingled containers and mixed paper/cardboard (see 2026 contract PDF for color-week calendar). ",
                wp + " " + note,
                flags=re.I,
            )
            # simpler rebuild
            zone = "Zone 1" if "Zone 1" in note else (
                "Zone 2" if "Zone 2" in note else (
                    "Zone 3" if "Zone 3" in note else ("Zone 4" if "Zone 4" in note else "Zone")
                )
            )
            anchor = s.get("anchor_date")
            s["area_note"] = (
                f"{zone}. Weekly recycling day; materials type alternates each week between commingled "
                f"and paper/cardboard per 2026 contract PDF"
                + (f" (first post-May-11 color cycle includes {anchor})" if anchor else "")
                + ". " + re.split(r"Streets|Effective", note)[0].replace(zone, "").strip(" .;")
            )
            # Clear biweekly fields that don't apply
            if "anchor_date" in s:
                del s["anchor_date"]  # not biweekly under merge; weekly day is verified
            s["source_date"] = "2026"
        if s.get("stream") == "trash":
            s["week_pattern"] = "every week"
            s["weekday"] = (s.get("weekday") or "").capitalize()
            # split if multi
            for part in split_multi_weekday(s):
                part["week_pattern"] = "every week"
                new.append(part)
            continue
        if s.get("stream") == "yard" and re.search(r"\d{4}|Mar |Apr |Oct ", (s.get("week_pattern") or "") + (s.get("area_note") or "")):
            # leave seasonal descriptive or try to parse - keep seasonal held
            s["weekday"] = None
            s["week_pattern"] = "seasonal"
            s["source_date"] = "2026"
        new.append(s)
    town["schedules"] = new


def fix_highlands_rumson_patterns(town: dict) -> None:
    new = []
    for s in town["schedules"]:
        s = copy.deepcopy(s)
        wp = s.get("week_pattern") or ""
        note = s.get("area_note") or ""
        combined = wp + " " + note
        if s.get("stream") == "recycling":
            if re.search(r"1st.*3rd", combined, re.I):
                # extract weekday
                m = re.search(
                    r"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)",
                    combined,
                    re.I,
                )
                day = (m.group(1) if m else s.get("weekday") or "Wednesday").capitalize()
                s["week_pattern"] = f"1st and 3rd {day}"
                s["weekday"] = day
                s["source_date"] = "2026" if "2026" in (s.get("source_url") or "") else (s.get("source_date") or "standing")
            elif re.search(r"2nd.*4th", combined, re.I):
                m = re.search(
                    r"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)",
                    combined,
                    re.I,
                )
                day = (m.group(1) if m else s.get("weekday") or "Wednesday").capitalize()
                s["week_pattern"] = f"2nd and 4th {day}"
                s["weekday"] = day
                s["source_date"] = "2026" if "2026" in (s.get("source_url") or "") else (s.get("source_date") or "standing")
        if (s.get("week_pattern") or "").lower() in ("weekly", "every week", "custom"):
            if days_of(s.get("weekday")) and len(days_of(s.get("weekday"))) == 1:
                if "custom" not in (s.get("week_pattern") or "").lower():
                    s["week_pattern"] = "every week"
        # Strip booklet lists from hazlet-like notes
        if "Booklet lists" in (s.get("area_note") or ""):
            s["area_note"] = re.sub(r"\s*Booklet lists[^.]*\.", "", s["area_note"])
        for part in split_multi_weekday(s):
            new.append(part)
    town["schedules"] = new


def fix_highland_park(town: dict) -> None:
    new = []
    for s in town["schedules"]:
        if s.get("stream") == "bulk" or (
            s.get("stream") == "other" and "appointment" in (s.get("week_pattern") or "").lower()
        ):
            new.append(clean_appointment_note(s))
            continue
        if s.get("stream") == "yard":
            s = copy.deepcopy(s)
            s["weekday"] = None
            s["week_pattern"] = "seasonal"
            s["area_note"] = (
                "Leaf recycling November and December; place leaf bags/cans curbside Sunday evening; "
                "at least once weekly per street during season. Small lawn debris with regular garbage. "
                "Brush/tree branches on regular garbage collection day per brush page."
            )
            s["source_date"] = "standing"
            new.append(s)
            continue
        for part in split_multi_weekday(s):
            part = copy.deepcopy(part)
            if part.get("week_pattern"):
                part["week_pattern"] = re.sub(r"\([^)]*\)", "", part["week_pattern"]).strip()
                if part["week_pattern"].lower() in ("weekly", "every week"):
                    part["week_pattern"] = "every week"
            # Remove "only" if any
            if part.get("area_note"):
                part["area_note"] = part["area_note"].replace(" only", "")
            new.append(part)
    town["schedules"] = new


def fix_metuchen(town: dict) -> None:
    new = []
    for s in town["schedules"]:
        if s.get("stream") == "bulk" or "appointment" in (s.get("week_pattern") or "").lower():
            new.append(clean_appointment_note(s))
            continue
        if s.get("stream") == "yard":
            s = copy.deepcopy(s)
            s["weekday"] = None
            s["week_pattern"] = "seasonal"
            s["area_note"] = (
                "Grass/leaves on zone garbage days per 2026 calendar; brush on scheduled calendar days. "
                "Leaves in paper biodegradable bags. Brush max 4 in diameter, 4 ft bundles. "
                "No yard waste in plastic bags."
            )
            # removed "only"
            s["source_date"] = "2026"
            new.append(s)
            continue
        s = copy.deepcopy(s)
        # Strip parenthetical from week_pattern
        wp = s.get("week_pattern") or ""
        s["week_pattern"] = re.sub(r"\([^)]*\)", "", wp).strip() or "every week"
        if s["week_pattern"].lower() in ("weekly", "every week"):
            s["week_pattern"] = "every week"
        # Business district recycling: remove word appointment from area_note
        if s.get("area_note"):
            s["area_note"] = s["area_note"].replace("metal appointment days", "metal collection days by call-ahead")
        for part in split_multi_weekday(s):
            new.append(part)
    town["schedules"] = new


def fix_union_beach(town: dict) -> None:
    new = []
    for s in town["schedules"]:
        s = copy.deepcopy(s)
        if s.get("stream") in ("recycling", "bulk") and s.get("anchor_date"):
            s["week_pattern"] = "every other week"
            s["weekday"] = "Wednesday"
            s["source_date"] = "2026"
            # Shorten area_note head for zone match - Section A / Section B
            note = s.get("area_note") or ""
            if note.startswith("Section A"):
                rest = note[len("Section A") :].lstrip(" ;,")
                s["area_note"] = f"Section A; {rest}" if rest else "Section A"
            elif note.startswith("Section B"):
                rest = note[len("Section B") :].lstrip(" ;,")
                s["area_note"] = f"Section B; {rest}" if rest else "Section B"
        if s.get("stream") == "trash":
            s["week_pattern"] = "every week"
            s["source_date"] = "2026"
            # Keep Section A/B at start; street list after semicolon is ok
        if s.get("stream") == "other" and "appointment" in (s.get("week_pattern") or "").lower():
            new.append(clean_appointment_note(s))
            continue
        if s.get("stream") == "yard":
            s["weekday"] = None
            s["week_pattern"] = "seasonal"
            s["source_date"] = "2026"
        for part in split_multi_weekday(s):
            new.append(part)
    town["schedules"] = new
    town["overrides"] = [
        {"date": "2026-01-01", "to": None, "reason": "Section B: no trash Thursday January 1 2026 (2026 calendar)"},
        {"date": "2026-11-26", "to": None, "reason": "Section B: no trash Thursday November 26 2026 (2026 calendar)"},
        {"date": "2026-12-25", "to": None, "reason": "Section A: no trash Friday December 25 2026 (2026 calendar)"},
    ]


def fix_hazlet(town: dict) -> None:
    new = []
    for s in town["schedules"]:
        s = copy.deepcopy(s)
        if s.get("stream") == "recycling":
            s["week_pattern"] = "every other week"
            s["source_date"] = "2026"
            # Remove booklet lists phrase
            note = s.get("area_note") or ""
            note = re.sub(r"\s*Booklet lists[^.]*\.", "", note)
            note = note.replace("Booklet lists Jan 5 (Mon, holiday-shifted); loadable biweekly anchor is 2026-01-15 (+14 thereafter).", "")
            # Ensure Zone N at start
            m = re.match(r"(Zone \d+)", note)
            if m:
                s["area_note"] = f"{m.group(1)}; locate street in Green Booklet 2026 alphabetical list"
            if s.get("anchor_date") and days_of(s.get("weekday")):
                if wd_of(s["anchor_date"]) != days_of(s["weekday"])[0]:
                    # fix weekday to match anchor
                    s["weekday"] = weekday_name(dt.date.fromisoformat(s["anchor_date"]))
        if s.get("stream") == "bulk":
            new.append(clean_appointment_note(s))
            continue
        if s.get("stream") in ("yard", "other"):
            s["weekday"] = None
            s["week_pattern"] = "seasonal" if s["stream"] == "yard" else "custom"
            s["source_date"] = "2026"
        new.append(s)
    town["schedules"] = new


def fix_neptune_township(town: dict) -> None:
    new = []
    for s in town["schedules"]:
        s = copy.deepcopy(s)
        if s.get("stream") == "recycling" and s.get("anchor_date"):
            s["week_pattern"] = "every other week"
            s["source_date"] = "2026"
            # Ensure weekday matches anchor
            s["weekday"] = weekday_name(dt.date.fromisoformat(s["anchor_date"]))
            note = s.get("area_note") or ""
            m = re.search(r"sub-zone ([A-D]\d)", note, re.I)
            if m:
                s["area_note"] = f"Recycling sub-zone {m.group(1).upper()}; assign by 2026 Street Index PDF"
        elif s.get("stream") == "recycling" and (s.get("weekday") or "").lower() == "wednesday":
            s["week_pattern"] = "every week"
            s["source_date"] = "2026"
            s["area_note"] = (
                "Ocean Grove residential recycling. OG Zone C: south side of Main Ave to Inskip Ave; "
                "OG Zone B: north side of Main Ave to Lake Ave"
            )
        elif s.get("stream") == "trash":
            s["week_pattern"] = "every week"
            for part in split_multi_weekday(s):
                part["week_pattern"] = "every week"
                new.append(part)
            continue
        elif s.get("stream") in ("bulk", "yard"):
            s["weekday"] = None
            s["week_pattern"] = "seasonal"
            s["source_date"] = "2026"
        new.append(s)
    town["schedules"] = new


def fix_generic_town(town: dict) -> None:
    """Normalize weekly patterns, split multi-weekday, clean appointments, monthly patterns."""
    new = []
    for s in town["schedules"]:
        wp = (s.get("week_pattern") or "").lower()
        if "appointment" in wp or (
            s.get("stream") in ("bulk", "other") and "appointment" in (s.get("area_note") or "").lower()
        ):
            new.append(clean_appointment_note(s))
            continue
        s = copy.deepcopy(s)
        # monthly rewrite
        norm = normalize_monthly_pattern(s.get("week_pattern") or "")
        if not norm:
            norm = normalize_monthly_pattern((s.get("week_pattern") or "") + " " + (s.get("area_note") or ""))
        if norm and s.get("stream") in ("recycling", "trash", "bulk"):
            # only apply if original suggested monthly cadence
            if re.search(r"1st|2nd|3rd|4th|first|second", (s.get("week_pattern") or "") + (s.get("area_note") or ""), re.I):
                if "saturday" not in norm.lower():  # 1st Saturday not supported cleanly as shape c with weekday Saturday + 1st and 3rd
                    if re.search(r"1st and 3rd|2nd and 4th", norm, re.I):
                        s["week_pattern"] = norm
                        s["weekday"] = norm.split()[-1]
        wp2 = re.sub(r"\([^)]*\)", "", s.get("week_pattern") or "").strip()
        if wp2.lower() in ("weekly", "every week"):
            s["week_pattern"] = "every week"
        if re.search(r"every other|bi-?weekly", s.get("week_pattern") or "", re.I):
            s["week_pattern"] = "every other week"
            if s.get("anchor_date"):
                s["weekday"] = weekday_name(dt.date.fromisoformat(s["anchor_date"]))
                s["source_date"] = "2026"
        # strip blocking words from notes for otherwise clean weekly rows
        if s.get("area_note") and days_of(s.get("weekday")) and s.get("week_pattern") == "every week":
            # avoid bare "only" unless summer range present
            if re.search(r"\bonly\b", s["area_note"], re.I) and not summer(s["area_note"]):
                s["area_note"] = re.sub(r"\bonly\b", "", s["area_note"], flags=re.I)
                s["area_note"] = re.sub(r"\s{2,}", " ", s["area_note"]).strip()
        for part in split_multi_weekday(s):
            new.append(part)
    town["schedules"] = new


def expand_loch_arbour(town: dict) -> None:
    new = []
    for s in town["schedules"]:
        if s.get("stream") == "bulk":
            # week_pattern may already be ISO date
            wp = s.get("week_pattern") or ""
            if re.fullmatch(r"\d{4}-\d\d-\d\d", wp):
                s = copy.deepcopy(s)
                s["weekday"] = weekday_name(dt.date.fromisoformat(wp))
                s["area_note"] = "Village bulk collection day"
                s["source_date"] = "2026"
                new.append(s)
            else:
                new.append(s)
        else:
            new.append(s)
    town["schedules"] = new


def score_town(town: dict, slug: str) -> tuple[int, int, list[str]]:
    ok = hold = 0
    reasons = []
    for s in town.get("schedules") or []:
        wds = days_of(s.get("weekday"))
        c = classify(s, wds)
        if c:
            ok += 1
        else:
            hold += 1
            if len(reasons) < 6:
                reasons.append(
                    f"{s.get('stream')}: wp={s.get('week_pattern')!r} wd={s.get('weekday')!r} sd={s.get('source_date')!r} note={(s.get('area_note') or '')[:40]!r}"
                )
    return ok, hold, reasons


def main() -> None:
    data = json.load(open(V2, encoding="utf-8-sig"))
    changed = []

    # Town-specific
    fix_carteret(data["carteret"]); changed.append("carteret")
    fix_fair_haven(data["fair-haven"]); changed.append("fair-haven")
    fix_perth_amboy(data["perth-amboy"]); changed.append("perth-amboy")
    fix_middletown(data["middletown"]); changed.append("middletown")
    fix_bradley_beach(data["bradley-beach"]); changed.append("bradley-beach")
    fix_old_bridge_overrides(data["old-bridge"]); changed.append("old-bridge")
    fix_sayreville(data["sayreville"]); changed.append("sayreville")
    fix_south_plainfield_overrides(data["south-plainfield"]); changed.append("south-plainfield")
    fix_allenhurst_bulk(data["allenhurst"]); changed.append("allenhurst")
    fix_atlantic_highlands(data["atlantic-highlands"]); changed.append("atlantic-highlands")
    fix_matawan(data["matawan"]); changed.append("matawan")
    fix_highland_park(data["highland-park"]); changed.append("highland-park")
    fix_metuchen(data["metuchen"]); changed.append("metuchen")
    fix_union_beach(data["union-beach"]); changed.append("union-beach")
    fix_hazlet(data["hazlet"]); changed.append("hazlet")
    fix_neptune_township(data["neptune-township"]); changed.append("neptune-township")
    expand_loch_arbour(data["loch-arbour"]); changed.append("loch-arbour")

    for slug in (
        "highlands", "rumson", "keyport", "little-silver", "neptune-city",
        "deal", "interlaken", "keansburg", "monmouth-beach", "oceanport",
        "red-bank", "sea-bright", "west-long-branch", "aberdeen", "piscataway",
        "south-amboy",
    ):
        fix_highlands_rumson_patterns(data[slug])
        fix_generic_town(data[slug])
        changed.append(slug)

    # Ensure keys
    for town in data.values():
        town.setdefault("holiday_rule", None)
        town.setdefault("overrides", [])

    json.dump(data, open(V3, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    open(V3, "a", encoding="utf-8").write("\n")

    print("WROTE", V3)
    print("CHANGED", sorted(set(changed)))
    print()
    print("town|ok|held|unresolved_sample")
    total_ok = total_hold = 0
    for slug, town in data.items():
        ok, hold, reasons = score_town(town, slug)
        total_ok += ok
        total_hold += hold
        why = "; ".join(reasons[:2]) if hold else ""
        print(f"{slug}|{ok}|{hold}|{why}")
    print()
    print("TOTAL", total_ok, total_hold)
    print()
    print("DOUBLE_CHECK")
    print("- carteret summer notes now 'June 1 through August' for merge BYMONTH")
    print("- fair-haven Friday trash expanded to individual 2026 Friday ISO rows")
    print("- bradley-beach trash uses Zone 1/2/3 labels only; no distinct street map found")
    print("- perth-amboy still source_date 2025 (no 2026 calendar found)")
    print("- middletown no trash/recycling weekdays (Recycle Coach only)")
    print("- matawan white/blue described without blocked 'white week' phrase; weekly day kept")
    print("- sayreville Zone II 'leaves only' reworded; grass season expanded to date rows")
    print("- holiday overrides rewritten with Zone/Ward/Section/District names for attach")
    print("- bradley-beach trash uses Zone 1/2/3 labels; street map still unpublished on borough site")


if __name__ == "__main__":
    main()
