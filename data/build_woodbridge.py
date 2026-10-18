"""Add Woodbridge Township facilities and curbside schedules to towns.json.

Source: Woodbridge Township 2026 Sanitation & Recycling Calendar (44-page guide linked from
https://www.twp.woodbridge.nj.us/1272/Recycling-Calendar, PDF text saved in data/sources/woodbridge_2026_calendar_text.txt).
Read from the rendered pages: the "How to use your calendar" table (printed p.5) and the month pages, Jan 2026 to Jan 2027.

Service: once a week, trash and recycling on different days, set by NEIGHBORHOOD (the guide says "locate your town").
  SWD 1 Monday    Iselin, Woodbridge                                                   (trash)
  SWD 2 Tuesday   Avenel, Colonia                                                      (trash)
  SWD 3 Wednesday Fords, Hopelawn, Keasbey, Menlo Park Terrace, Port Reading, Sewaren  (trash)
  RD 4  Thursday  Avenel, Colonia, Iselin                                              (recycling)
  RD 5  Friday    Fords, Hopelawn, Keasbey, Menlo Park Terrace, Port Reading, Sewaren, Woodbridge (recycling)

Holidays: the holiday's own pickup AND every later pickup that week move one day later (Friday's RD 5 moves to
Saturday). Read on the calendar pages for: New Year's 2026, MLK 2026, Presidents' Day, Good Friday, Memorial Day,
Juneteenth, Independence Day observed, Labor Day, Columbus Day, Election Day, Veterans Day, Thanksgiving, Christmas,
New Year's 2027, MLK 2027. Lincoln's Birthday is not a holiday there.
Not entered: brush / leaf / Christmas tree days (set per street index, RD zones 1-14) and the bulk pickup fee
(the only fee text found is a 2017 news post).
"""
import json
from datetime import date, timedelta
from pathlib import Path

TOWNS = Path(__file__).with_name("towns.json")
SOURCE = "https://www.twp.woodbridge.nj.us/1272/Recycling-Calendar"
VERIFIED = "2026-10-06"
UNTIL = "20270131"

# slot -> (index Mon=0, stream)
SLOTS = {"SWD 1": (0, "trash"), "SWD 2": (1, "trash"), "SWD 3": (2, "trash"), "RD 4": (3, "recycling"), "RD 5": (4, "recycling")}
BYDAY = ["MO", "TU", "WE", "TH", "FR"]
# neighborhood key -> (label, trash district, recycling district)
AREAS = {
    "avenel": ("Avenel", "SWD 2", "RD 4"),
    "colonia": ("Colonia", "SWD 2", "RD 4"),
    "fords": ("Fords", "SWD 3", "RD 5"),
    "hopelawn": ("Hopelawn", "SWD 3", "RD 5"),
    "iselin": ("Iselin", "SWD 1", "RD 4"),
    "keasbey": ("Keasbey", "SWD 3", "RD 5"),
    "menlo-park-terrace": ("Menlo Park Terrace", "SWD 3", "RD 5"),
    "port-reading": ("Port Reading", "SWD 3", "RD 5"),
    "sewaren": ("Sewaren", "SWD 3", "RD 5"),
    "woodbridge": ("Woodbridge", "SWD 1", "RD 5"),
}
HOLIDAYS = [
    (date(2026, 1, 1), "New Year's Day"), (date(2026, 1, 19), "Martin Luther King Jr. Day"),
    (date(2026, 2, 16), "Presidents' Day"), (date(2026, 4, 3), "Good Friday"),
    (date(2026, 5, 25), "Memorial Day"), (date(2026, 6, 19), "Juneteenth"),
    (date(2026, 7, 3), "Independence Day (observed)"), (date(2026, 9, 7), "Labor Day"),
    (date(2026, 10, 12), "Columbus Day"), (date(2026, 11, 3), "Election Day"),
    (date(2026, 11, 11), "Veterans Day"), (date(2026, 11, 26), "Thanksgiving Day"),
    (date(2026, 12, 25), "Christmas Day"),
    (date(2027, 1, 1), "New Year's Day"), (date(2027, 1, 18), "Martin Luther King Jr. Day"),
]
NOTES = {
    "trash": "Trash, once a week, in your township cart. Put the cart out after 4 p.m. the day before and bring it in by 9 p.m. on collection day. Only items inside the cart are collected, nothing beside it. No bulk items unless you scheduled a pickup (732-738-1311 ext. 3600). Holiday weeks: pickups move one day later (see dates).",
    "recycling": "Single stream recycling, once a week, in the blue township cart. Do not bag recyclables. Put the cart out after 4 p.m. the day before and bring it in by 9 p.m. on collection day. Only items inside the cart are collected. Holiday weeks: pickups move one day later (see dates). Questions: Recycling Office 732-738-1311 ext. 3035.",
}


def overrides_for(slot_idx):
    out = []
    for h, name in HOLIDAYS:
        if h.weekday() > slot_idx:
            continue  # this slot comes before the holiday in its week, so it does not move
        orig = h - timedelta(days=h.weekday()) + timedelta(days=slot_idx)
        out.append({"date": orig.isoformat(), "to": (orig + timedelta(days=1)).isoformat(), "reason": name})
    return out


def first_date(slot_idx):
    d = date(2026, 1, 1)
    while d.weekday() != slot_idx:
        d += timedelta(days=1)
    return d


def schedule_rows():
    rows = []
    for key, (label, swd, rd) in AREAS.items():
        for code in (swd, rd):
            idx, stream = SLOTS[code]
            rows.append({
                "region": "woodbridge", "stream": stream, "weekday": (idx + 1) % 7, "week_pattern": "weekly",
                "area_key": key, "area_note": label,
                "dtstart": first_date(idx).isoformat(),
                "rrule": f"FREQ=WEEKLY;BYDAY={BYDAY[idx]};UNTIL={UNTIL}",
                "overrides": overrides_for(idx),
                "notes_en": f"{NOTES[stream]} ({code}.)", "notes_es": "",
                "source_url": SOURCE, "status": "verified", "last_verified": VERIFIED,
            })
    rows.append({
        "region": "woodbridge", "stream": "bulk", "weekday": None, "week_pattern": "custom", "area_key": "",
        "area_note": "Township-wide, by appointment",
        "notes_en": "Bulk pickup (furniture, mattresses, carpeting, garbage cans, refrigerators, freezers, washers, dryers, playsets, ride-on toys) is scheduled by calling Sanitation at 732-738-1311 ext. 3600, Mon-Fri 7:30 a.m.-3:30 p.m. The township page lists no fee or item limit; ask when you call. Or drop items at the Convenience Center (Mon-Sat 8 a.m.-2 p.m., residents only).",
        "notes_es": "", "source_url": SOURCE, "status": "verified", "last_verified": VERIFIED,
    })
    return rows


def facility_rows():
    base = {
        "region": "woodbridge", "address": "225 Smith Street, Keasbey, NJ 08832", "zip": "08832",
        "hours": "Mon-Sat 8 a.m.-2 p.m.; closed Sundays and holidays",
        "residents_only": True, "notes_es": "", "status": "verified", "source_url": "https://www.twp.woodbridge.nj.us/798/The-Convenience-and-Recycling-Center", "last_verified": VERIFIED,
    }
    return [
        {**base, "key": "woodbridge-recycling-center", "name": "Woodbridge Recycling Center",
         "phone": "732-738-1311 ext. 3035",
         "accepts": ["cardboard_paper", "glass", "metal", "rigid_plastic", "soft_plastic_foam", "other"],
         "notes_en": "Woodbridge residents only, proof of residency required; check in with the guard. Accepts all single-stream recyclables, shredded paper, Styrofoam, plastic bags and film wrap, cooking oil, textiles, cardboard, and bulky rigid plastic (no plastic with metal, fabric or motors attached). No commercial vehicles, commercial plates, out-of-state plates, box trucks or rental vehicles. Township main number: 732-634-4500."},
        {**base, "key": "woodbridge-convenience-center", "name": "Woodbridge Convenience Center",
         "phone": "732-738-1311 ext. 3600",
         "accepts": ["metal", "ewaste_hazard", "other"],
         "notes_en": "Same site as the Recycling Center. Woodbridge residents only, proof of residency required. Accepts appliances, mixed metals, bulky items, brush, leaves, propane tanks, electronics, paint, tires and motor oil. Small homeowner repair debris (concrete, asphalt, brick, lumber, sheetrock) has monthly limits, call first. No commercial vehicles, out-of-state plates, box trucks or rental vehicles. Township main number: 732-634-4500. Saturdays are busy."},
    ]


def main():
    data = json.loads(TOWNS.read_text(encoding="utf-8"))
    data["facilities"] = [f for f in data["facilities"] if f["region"] != "woodbridge"] + facility_rows()
    # keep the street-zone rows written by build_woodbridge_zones.py
    data["schedules"] = [s for s in data["schedules"]
                         if not (s["region"] == "woodbridge" and not s.get("area_key", "").startswith("zone:"))] + schedule_rows()
    TOWNS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"woodbridge: {len(schedule_rows())} schedule rows, {len(facility_rows())} facilities")


if __name__ == "__main__":
    main()
