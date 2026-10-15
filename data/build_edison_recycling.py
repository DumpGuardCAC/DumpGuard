"""Replace the Edison recycling row in towns.json with 10 per-section rows (RS 1-10) for 2026.

Source: Township of Edison 2026 Garbage & Recycling Calendar, monthly pages (data/sources/edison_2026_calendar_guide.pdf).
Read from the rendered calendar pages, January to December 2026.

Pattern seen on every month page:
  - RS 1-5 are collected Mon-Fri of one week, RS 6-10 Mon-Fri of the next, alternating all year.
  - RS n is collected on weekday ((n-1) % 5) + 1 (1=Mon .. 5=Fri).
  - Week of Mon Jan 5 2026 is an RS 6-10 week.
  - On a holiday, only the section whose day is the holiday moves; the rest of the week is unchanged.

Overrides: [{"date": original, "to": new or null, "reason": text}]. Consumers drop `date` from the series
(if present) and add `to`. Dates outside the RRULE range (Jan 1 2026, Jan 1 2027) are still listed.
"""
import json
from datetime import date, timedelta
from pathlib import Path

TOWNS = Path(__file__).with_name("towns.json")
SOURCE = "https://www.edisonnj.org/Departments/DPW/Garbage-Recycling%202026%20Calendar%20for%20web.pdf"
VERIFIED = "2026-10-06"
ANCHOR_B = date(2026, 1, 5)  # Monday of an RS 6-10 week
BYDAY = ["MO", "TU", "WE", "TH", "FR"]

# (holiday, day the affected section is collected instead, name). Moves read from the calendar pages.
HOLIDAYS = [
    (date(2026, 1, 1), date(2026, 1, 2), "New Year's Day"),
    (date(2026, 1, 19), date(2026, 1, 20), "Martin Luther King Jr. Day"),
    (date(2026, 2, 12), date(2026, 2, 13), "Lincoln's Birthday"),
    (date(2026, 2, 16), date(2026, 2, 17), "Presidents' Day"),
    (date(2026, 4, 3), date(2026, 4, 2), "Good Friday"),
    (date(2026, 5, 25), date(2026, 5, 26), "Memorial Day"),
    (date(2026, 7, 3), date(2026, 7, 2), "Independence Day (observed)"),
    (date(2026, 9, 7), date(2026, 9, 8), "Labor Day"),
    (date(2026, 10, 12), date(2026, 10, 13), "Columbus Day"),
    (date(2026, 11, 3), date(2026, 11, 2), "Election Day"),
    (date(2026, 11, 11), date(2026, 11, 10), "Veterans Day"),
    (date(2026, 11, 26), date(2026, 11, 25), "Thanksgiving Day"),
    (date(2026, 11, 27), date(2026, 11, 25), "Day after Thanksgiving"),
    (date(2026, 12, 25), date(2026, 12, 24), "Christmas Day"),
    (date(2027, 1, 1), date(2026, 12, 31), "New Year's Day"),
]


def section_for(d: date) -> int:
    """RS number collected on calendar date d (assuming a normal week)."""
    monday = d - timedelta(days=d.weekday())
    b_week = ((monday - ANCHOR_B).days // 7) % 2 == 0
    return d.weekday() + 1 + (5 if b_week else 0)


def rows():
    out = []
    for rs in range(1, 11):
        wd = (rs - 1) % 5  # 0 = Monday
        first = ANCHOR_B + timedelta(days=wd) if rs > 5 else ANCHOR_B + timedelta(days=7 + wd)
        overrides = [
            {"date": h.isoformat(), "to": to.isoformat(), "reason": name}
            for h, to, name in HOLIDAYS
            if section_for(h) == rs
        ]
        out.append({
            "region": "edison",
            "stream": "recycling",
            "weekday": (wd + 1) % 7,  # 0 = Sunday in the schema
            "week_pattern": "biweekly",
            "area_key": f"rs-{rs}",
            "area_note": f"Recycling Section {rs}",
            "dtstart": first.isoformat(),
            "rrule": f"FREQ=WEEKLY;INTERVAL=2;BYDAY={BYDAY[wd]};UNTIL=20261231",
            "overrides": overrides,
            "notes_en": "Single stream curbside, every other week. Set out the evening before. Put cardboard next to the bin, not in it. No plastic bags. Condos and apartments: ask your management office. Holiday weeks: see the dates listed for your section. Find your section on the township guide map or call 732-248-7288.",
            "notes_es": "",
            "source_url": SOURCE,
            "status": "verified",
            "last_verified": VERIFIED,
        })
    return out


# Leaf and grass collection run on the section's own weekday (guide p.4): RS 1&5 Mon, 7&8 Tue, 4&6 Wed, 2&9 Thu, 3&10 Fri.
YARD_DAY = {1: 0, 5: 0, 7: 1, 8: 1, 4: 2, 6: 2, 2: 3, 9: 3, 3: 4, 10: 4}
YARD_PROGRAMS = [
    ("grass", date(2026, 4, 6), "20261002", "Grass clippings, Apr 6 to Oct 2, municipal garbage areas only. Paper bags or open containers, no plastic bags, max 50 lb. Holiday weeks may shift."),
    ("leaf", date(2026, 10, 19), "20261211", "Leaves, Oct 19 to Dec 11. Paper bags or open containers, no plastic bags, max 50 lb. Holiday weeks may shift."),
]


def yard_rows():
    out = []
    for rs in range(1, 11):
        wd = YARD_DAY[rs]
        for kind, start, until, note in YARD_PROGRAMS:
            out.append({
                "region": "edison", "stream": "yard", "weekday": (wd + 1) % 7, "week_pattern": "weekly",
                "area_key": f"rs-{rs}", "area_note": f"Recycling Section {rs} ({kind})",
                "dtstart": (start + timedelta(days=wd)).isoformat(),
                "rrule": f"FREQ=WEEKLY;BYDAY={BYDAY[wd]};UNTIL={until}", "overrides": [],
                "notes_en": note, "notes_es": "", "source_url": SOURCE, "status": "verified", "last_verified": VERIFIED,
            })
    return out


def main():
    data = json.loads(TOWNS.read_text(encoding="utf-8"))
    kept = [s for s in data["schedules"]
            if not (s["region"] == "edison" and s["stream"] in ("recycling", "yard"))]
    data["schedules"] = kept + rows() + yard_rows()
    TOWNS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    # Sanity: every date the guide shows for 2026 should map to the section list above.
    assert section_for(date(2026, 2, 2)) == 6 and section_for(date(2026, 2, 9)) == 1
    assert section_for(date(2026, 12, 31)) == 4 and section_for(date(2026, 8, 31)) == 6
    print(f"wrote {len(rows())} edison recycling rows")


if __name__ == "__main__":
    main()
