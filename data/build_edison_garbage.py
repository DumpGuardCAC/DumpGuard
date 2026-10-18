"""Replace the Edison trash placeholder with municipal garbage rows by collection weekday, for 2026.

Source: Township of Edison 2026 Garbage & Recycling Calendar (data/sources/edison_2026_calendar_guide.pdf), printed p.4 and
the monthly pages (p.11-22), all read from rendered pages.

What the guide does and does not say:
  - Municipal garbage is collected on Monday, Tuesday, Thursday or Friday depending on the district. The guide has NO
    street-to-day table or district map; it says to use the Recycle Coach app or call Public Works (732-248-7288).
    So the user picks their garbage day (group "garbage") separately from their recycling section (rs-N).
  - Multi-family (condos, townhouses, apartments) and "private garbage districts" use private haulers; the township
    does not schedule them (garbage:private).
  - Holiday moves are printed on the month pages. Monday holiday: Monday's garbage moves to Tuesday and Tuesday's to
    Wednesday. Tuesday holiday: Tuesday's moves to Wednesday. Thursday holiday: Thursday's moves to the Wednesday before.
    Friday holiday: Friday's moves to Thursday (and, for Good Friday and July 3 only, Thursday's moves to Wednesday).
  - Thanksgiving week: the calendar prints "WEEK OF 11/23 - THERE WILL BE ONE GARBAGE PICK-UP" and no garbage day. Thursday and
    Friday garbage are therefore shown as not collected and the row says to confirm with Public Works.
  - Veterans Day (Wed): no garbage day is affected.
"""
import json
from datetime import date
from pathlib import Path

TOWNS = Path(__file__).with_name("towns.json")
SOURCE = "https://www.edisonnj.org/Departments/DPW/Garbage-Recycling%202026%20Calendar%20for%20web.pdf"
VERIFIED = "2026-10-06"
DAYS = {"mon": ("MO", 0, "Monday"), "tue": ("TU", 1, "Tuesday"), "thu": ("TH", 3, "Thursday"), "fri": ("FR", 4, "Friday")}

# original date -> (new date or None, reason), per garbage weekday, read from the month pages
MOVES = {
    "mon": [("2026-01-19", "2026-01-20", "Martin Luther King Jr. Day"), ("2026-02-16", "2026-02-17", "Presidents' Day"),
            ("2026-05-25", "2026-05-26", "Memorial Day"), ("2026-09-07", "2026-09-08", "Labor Day"),
            ("2026-10-12", "2026-10-13", "Columbus Day")],
    "tue": [("2026-01-20", "2026-01-21", "Martin Luther King Jr. Day (Monday's pickup moved a day)"),
            ("2026-02-17", "2026-02-18", "Presidents' Day (Monday's pickup moved a day)"),
            ("2026-05-26", "2026-05-27", "Memorial Day (Monday's pickup moved a day)"),
            ("2026-09-08", "2026-09-09", "Labor Day (Monday's pickup moved a day)"),
            ("2026-10-13", "2026-10-14", "Columbus Day (Monday's pickup moved a day)"),
            ("2026-11-03", "2026-11-04", "Election Day")],
    "thu": [("2026-01-01", "2025-12-31", "New Year's Day"), ("2026-02-12", "2026-02-11", "Lincoln's Birthday"),
            ("2026-04-02", "2026-04-01", "Good Friday week"), ("2026-07-02", "2026-07-01", "Independence Day (observed) week"),
            ("2026-11-26", None, "Thanksgiving week has only one garbage pick-up; confirm with Public Works 732-248-7288")],
    "fri": [("2026-04-03", "2026-04-02", "Good Friday"), ("2026-07-03", "2026-07-02", "Independence Day (observed)"),
            ("2026-11-27", None, "Thanksgiving week has only one garbage pick-up; confirm with Public Works 732-248-7288"),
            ("2026-12-25", "2026-12-24", "Christmas Day"), ("2027-01-01", "2026-12-31", "New Year's Day")],
}

NOTE = ("Municipal garbage, once a week, in your Township-supplied can. Put it out after 6 p.m. the night before and take the "
        "empty can in by the evening of collection day. Bagged household garbage only, no recyclables, leaves or grass. "
        "Not sure of your garbage day? It depends on your address: check the Recycle Coach app or call Public Works "
        "732-248-7288. Holiday weeks: see the dates listed.")


def rows():
    out = []
    for key, (code, idx, name) in DAYS.items():
        first = date(2026, 1, 1)
        while first.weekday() != idx:
            first = date.fromordinal(first.toordinal() + 1)
        out.append({
            "region": "edison", "stream": "trash", "weekday": (idx + 1) % 7, "week_pattern": "weekly",
            "area_key": f"garbage:{key}", "area_note": f"Garbage {name}: municipal garbage district collected on {name}s",
            "dtstart": first.isoformat(), "rrule": f"FREQ=WEEKLY;BYDAY={code};UNTIL=20261231",
            "overrides": [{"date": d, "to": to, "reason": r} for d, to, r in MOVES[key]],
            "notes_en": NOTE, "notes_es": "", "source_url": SOURCE, "status": "verified", "last_verified": VERIFIED,
        })
    base = {"region": "edison", "stream": "trash", "weekday": None, "week_pattern": "custom", "notes_es": "",
            "source_url": SOURCE, "status": "verified", "last_verified": VERIFIED}
    out.append({**base, "area_key": "garbage:private", "area_note": "Private hauler: condos, townhouses, apartments and private garbage districts",
                "notes_en": "Garbage here is collected by a private hauler, not the Township, and the Township does not schedule bulk or special pick-ups for these areas. Ask your management office or hauler for your days. Recycling and the yard programs still follow your recycling section."})
    out.append({**base, "area_key": "garbage:unknown", "area_note": "I do not know my garbage day",
                "notes_en": "Garbage day depends on your address and the Township has not published a street list. Use the Recycle Coach app (search your address on edisonnj.gov under Public Works) or call Public Works at 732-248-7288, Monday to Friday 8 a.m. to 4:30 p.m."})
    return out


def main():
    data = json.loads(TOWNS.read_text(encoding="utf-8"))
    data["schedules"] = [s for s in data["schedules"] if not (s["region"] == "edison" and s["stream"] == "trash")] + rows()
    TOWNS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"edison garbage: {len(rows())} rows")


if __name__ == "__main__":
    main()
