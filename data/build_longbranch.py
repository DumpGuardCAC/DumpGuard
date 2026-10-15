"""Add Long Branch curbside schedules (garbage, recycling, bulk) to towns.json.

Source: City of Long Branch 2026 Calendar (13 image-only pages, Jan 2026 to Jan 2027), linked as "2026 Calendar" from
https://longbranch.org/291/Garbage-Pickup (PDF: https://longbranch.org/DocumentCenter/View/4683/2026-Calendar).
Every month page was read from the rendered image. Legend on each page:
  South Zone  Mon  A  garbage + recycling, Brighton Ave to Broadway
              Tue  B  garbage + recycling, Brighton Ave to Deal border
  North Zone  Thu  A  garbage + recycling, Joline Ave to Monmouth Beach border
              Fri  B  garbage + recycling, Joline Ave to Broadway
  Bulk (Wednesdays): North Zone on the 1st and 3rd Wednesday, South Zone on the 2nd and 4th, none on a 5th Wednesday
  (the calendar prints "NO BULK PICKUP" on Apr 29, Jul 29, Sep 30, Dec 30). Held for all 13 months.

Every week, all year. The calendar prints a pickup on MLK, Presidents' Day, Good Friday, Memorial Day, Juneteenth,
Independence Day observed (Jul 3), Labor Day, Columbus Day, Election Day and Veterans Day. The only days marked
"NO PICKUP", with no make-up day, are Thu Jan 1 2026, Thu Nov 26 2026, Fri Dec 25 2026 and Fri Jan 1 2027.
Yard rows (citywide) from longbranch.org/288 (brush), /293 (leaves), /292 (grass), fetched 2026-10-06.
Not entered: "sanitation cancellation" notices and "sanitation cancellation" (weather) notices.
"""
import json
from datetime import date
from pathlib import Path

TOWNS = Path(__file__).with_name("towns.json")
SOURCE = "https://longbranch.org/DocumentCenter/View/4683/2026-Calendar"
VERIFIED = "2026-10-06"
UNTIL = "20270131"
BYDAY_IDX = {"MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4}

# key -> (label, description, weekday code, zone, first date)
AREAS = {
    "south-a": ("South Zone A", "Brighton Ave to Broadway (Mondays)", "MO", "south", date(2026, 1, 5)),
    "south-b": ("South Zone B", "Brighton Ave to Deal border (Tuesdays)", "TU", "south", date(2026, 1, 6)),
    "north-a": ("North Zone A", "Joline Ave to Monmouth Beach border (Thursdays)", "TH", "north", date(2026, 1, 1)),
    "north-b": ("North Zone B", "Joline Ave to Broadway (Fridays)", "FR", "north", date(2026, 1, 2)),
}
NO_PICKUP = {
    "north-a": [("2026-01-01", "New Year's Day"), ("2026-11-26", "Thanksgiving Day")],
    "north-b": [("2026-12-25", "Christmas Day"), ("2027-01-01", "New Year's Day")],
}
BULK_RULE = {"north": "1WE,3WE", "south": "2WE,4WE"}
BULK_DAYS = {"north": "1st and 3rd Wednesday", "south": "2nd and 4th Wednesday"}

TRASH_NOTE = ("Garbage and recycling are collected on the same day, every week. There is no make-up day when a holiday is marked "
              "NO PICKUP. Check the dates listed. Public Works can cancel collection for weather; watch the city website.")
REC_NOTE = ("Single stream recycling, every week, on your garbage day. Put cans, bottles and paper loose in a reusable container, "
            "never in plastic bags. Cardboard and newspaper can be tied in bundles of 50 lb or less (max 8 bundles of cardboard). "
            "Do not put paint or liquids in cardboard boxes.")


def overrides(key):
    return [{"date": d, "to": None, "reason": r} for d, r in NO_PICKUP.get(key, [])]


def schedule_rows():
    rows = []
    for key, (label, desc, day, zone, first) in AREAS.items():
        idx = BYDAY_IDX[day]
        base = {"region": "long-branch", "area_key": key, "area_note": f"{label}: {desc}", "source_url": SOURCE,
                "status": "verified", "last_verified": VERIFIED, "notes_es": ""}
        for stream, note in (("trash", TRASH_NOTE), ("recycling", REC_NOTE)):
            rows.append({**base, "stream": stream, "weekday": (idx + 1) % 7, "week_pattern": "weekly",
                         "dtstart": first.isoformat(), "rrule": f"FREQ=WEEKLY;BYDAY={day};UNTIL={UNTIL}",
                         "overrides": overrides(key), "notes_en": note})
        # first bulk Wednesday of the calendar year for this zone
        bulk_first = date(2026, 1, 7) if zone == "north" else date(2026, 1, 14)
        rows.append({**base, "stream": "bulk", "weekday": 3, "week_pattern": "custom",
                     "dtstart": bulk_first.isoformat(), "rrule": f"FREQ=MONTHLY;BYDAY={BULK_RULE[zone]};UNTIL={UNTIL}",
                     "overrides": [],
                     "notes_en": (f"Bulk pickup for the {zone.title()} Zone: {BULK_DAYS[zone]} of each month, no fifth-Wednesday pickup. "
                                  "Put items out after 5 p.m. the day before. Up to 8 items (furniture, appliances with doors removed, carpet, "
                                  "water heaters, metal) plus up to 4 rimless car tires 16 in. or smaller. No construction material. "
                                  "Mattresses and box springs must be sealed in plastic with tape, put out no more than 24 hours ahead. "
                                  "Or take 8 items to the drop-off center on Atlantic Ave with proof of residency.")})
    base = {"region": "long-branch", "stream": "yard", "weekday": None, "week_pattern": "custom", "area_key": "",
            "notes_es": "", "status": "verified", "last_verified": VERIFIED}
    rows.append({**base, "area_note": "Brush (citywide)", "source_url": "https://longbranch.org/288",
                 "notes_en": "Brush is collected March 15 to June 1 and September 15 to December 31. The rest of the year, call Public Works at 732-571-6520 to arrange a brush pickup. "
                             "Maximum per collection: 8 ft by 4 ft by 3 ft. Larger amounts need a private dumpster. Landscapers must remove their own brush. "
                             "Year-round you can bring brush to the Atlantic Ave Recycling Center with ID showing you live in Long Branch."})
    rows.append({**base, "area_note": "Leaves (citywide)", "source_url": "https://longbranch.org/293",
                 "notes_en": "November, December, April and May: pile leaves at the edge of the street, no more than 3 ft into the road, not blocking walkways or traffic. "
                             "All other months: leaves go only in paper bags, 50 lb or less when full, kept separate from brush. Leaves that are not piled or bagged properly are not collected."})
    rows.append({**base, "area_note": "Grass clippings (citywide)", "source_url": "https://longbranch.org/292",
                 "notes_en": "The City does not pick up grass clippings. Leave them on the lawn, compost them, or take them to the Monmouth County Reclamation Center ($3 per car load). "
                             "Never leave clippings in the road: they wash into storm drains and cause flooding. Lawn services may not put clippings in the roadway."})
    return rows


def main():
    data = json.loads(TOWNS.read_text(encoding="utf-8"))
    data["schedules"] = [s for s in data["schedules"] if s["region"] != "long-branch"] + schedule_rows()
    TOWNS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"long-branch: {len(schedule_rows())} schedule rows")


if __name__ == "__main__":
    main()
