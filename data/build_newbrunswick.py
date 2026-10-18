"""Replace the New Brunswick placeholder rows in towns.json with real 2026 schedules for Zone 1 and Zone 2.

Source: City of New Brunswick "2026 Residential Collection Schedule" (8-page flyer, English and Spanish), linked from
https://www.cityofnewbrunswick.org/residents/departments/engineering_and_public_works/trash_and_recycling_info_.php
Saved text: data/sources/nb_2026_schedule_text.txt. Read from the rendered pages 1-3.

Zones (page 1 map; the city divides streets at a boundary, reference streets are printed on the map):
  Zone 1  Trash Monday AND Thursday (weekly)   Recycling every other Monday
  Zone 2  Trash Tuesday AND Friday (weekly)    Recycling every other Tuesday
  Livingston Ave: odd house numbers are Zone 1, even are Zone 2.

Recycling dates are printed month by month (page 2); this script asserts the RRULE reproduces them.
Printed typo: Zone 1 September reads "12, 21". Sept 12 is a Saturday; the every-other-Monday pattern gives Sept 7
(Labor Day) and Sept 21, so Sept 7 is treated as a holiday with no confirmed make-up day.

Holidays (page 3, trash only): no trash on the holiday; a make-up day is listed for most. Applied to the zone whose
trash day falls on the holiday. July 3 (Fri) and Veterans Day (Wed, no pickup that day) have no make-up listed.
"""
import json
from datetime import date, timedelta
from pathlib import Path

TOWNS = Path(__file__).with_name("towns.json")
SOURCE = "https://www.cityofnewbrunswick.org/New%20Brunswick%202026%20Recycling_Trash%20(002).pdf"
VERIFIED = "2026-10-06"
UNTIL = "20270131"

ZONES = {
    "zone-1": {"label": "Zone 1", "trash": ("MO", "TH"), "rec": "MO", "rec_start": date(2026, 1, 12)},
    "zone-2": {"label": "Zone 2", "trash": ("TU", "FR"), "rec": "TU", "rec_start": date(2026, 1, 13)},
}
DAY_IDX = {"MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4}

# (holiday, make-up day or None, name) from page 3.
HOLIDAYS = [
    (date(2026, 1, 1), date(2025, 12, 31), "New Year's Day"),
    (date(2026, 1, 19), date(2026, 1, 21), "Martin Luther King Jr. Day"),
    (date(2026, 2, 16), date(2026, 2, 18), "Presidents' Day"),
    (date(2026, 5, 25), date(2026, 5, 27), "Memorial Day"),
    (date(2026, 6, 19), date(2026, 6, 20), "Juneteenth"),
    (date(2026, 7, 3), None, "Independence Day (observed)"),
    (date(2026, 9, 7), date(2026, 9, 9), "Labor Day"),
    (date(2026, 10, 12), date(2026, 10, 14), "Columbus Day"),
    (date(2026, 11, 26), date(2026, 11, 25), "Thanksgiving Day"),
    (date(2026, 12, 25), date(2026, 12, 26), "Christmas Day"),
    (date(2027, 1, 1), date(2027, 1, 2), "New Year's Day"),
]

# Printed recycling dates (page 2), as (month, day) lists.
PRINTED = {
    "zone-1": "1:12,26 2:9,23 3:9,23 4:6,20 5:4,18 6:1,15,29 7:13,27 8:10,24 9:21 10:5,19 11:2,16,30 12:14,28",
    "zone-2": "1:13,27 2:10,24 3:10,24 4:7,21 5:5,19 6:2,16,30 7:14,28 8:11,25 9:8,22 10:6,20 11:3,17 12:1,15,29",
}

TRASH_NOTE = ("Trash twice a week. Put trash curbside after 5 p.m. the night before. Up to 3 containers or bags per home "
              "per collection day, cans no bigger than 32 gallons, 50 lb max each. Bulk items, extra bags, scrap metal, "
              "appliances and brush need an appointment: reserve online at cityofnewbrunswick.org/bulkpickup or call "
              "732-745-5059. No trash on city holidays; see the dates listed. Questions: Public Works 732-745-5105.")
REC_NOTE = ("Single stream recycling, every other week. Put it curbside after 5 p.m. the night before, loose in a bin, "
            "never in bags (bagged recycling is not collected). Missed pickup: leave it at the curb and call the MCIA at "
            "1-800-488-6242 by noon the next day, or the Recycling Division at 732-745-5059.")


def trash_overrides(days):
    out = []
    for h, makeup, name in HOLIDAYS:
        if h.weekday() < 5 and ("MO TU WE TH FR".split()[h.weekday()]) in days:
            out.append({"date": h.isoformat(), "to": makeup.isoformat() if makeup else None, "reason": name})
    return out


def rec_dates(z):
    d, out = z["rec_start"], []
    while d <= date(2026, 12, 31):
        out.append(d)
        d += timedelta(days=14)
    return out


def rows():
    out = []
    for key, z in ZONES.items():
        got = {}
        for d in rec_dates(z):
            got.setdefault(d.month, []).append(d.day)
        printed = {int(m): [int(x) for x in v.split(",")] for m, v in (p.split(":") for p in PRINTED[key].split())}
        for m in range(1, 13):
            want = printed[m]
            have = got.get(m, [])
            if key == "zone-1" and m == 9:
                assert have == [7, 21] and want == [21]  # printed "12, 21" is a typo for 7, 21
            else:
                assert have == want, (key, m, have, want)

        t_days = z["trash"]
        out.append({
            "region": "new-brunswick", "stream": "trash", "weekday": (DAY_IDX[t_days[0]] + 1) % 7, "week_pattern": "weekly",
            "area_key": key, "area_note": f"{z['label']} ({t_days[0].title()} and {t_days[1].title()})",
            "dtstart": date(2026, 1, 1).isoformat(),
            "rrule": f"FREQ=WEEKLY;BYDAY={','.join(t_days)};UNTIL={UNTIL}",
            "overrides": trash_overrides(t_days),
            "notes_en": TRASH_NOTE, "notes_es": "", "source_url": SOURCE, "status": "verified", "last_verified": VERIFIED,
        })
        rec_overrides = []
        if key == "zone-1":
            rec_overrides = [{"date": "2026-09-07", "to": None,
                              "reason": "Labor Day. The city calendar prints Sept 12 here (a typo, Sept 12 is a Saturday); call 732-745-5059 to confirm the make-up day"}]
        out.append({
            "region": "new-brunswick", "stream": "recycling", "weekday": (DAY_IDX[z["rec"]] + 1) % 7, "week_pattern": "biweekly",
            "area_key": key, "area_note": f"{z['label']} (every other {z['rec'].title()})",
            "dtstart": z["rec_start"].isoformat(),
            "rrule": f"FREQ=WEEKLY;INTERVAL=2;BYDAY={z['rec']};UNTIL=20261231",
            "overrides": rec_overrides,
            "notes_en": REC_NOTE, "notes_es": "", "source_url": SOURCE, "status": "verified", "last_verified": VERIFIED,
        })
    out.append({
        "region": "new-brunswick", "stream": "bulk", "weekday": None, "week_pattern": "custom", "area_key": "",
        "area_note": "City-wide, by appointment",
        "notes_en": "Furniture, mattresses (fully wrapped in plastic), rugs, scrap metal, appliances and brush are collected by appointment only. Reserve online at cityofnewbrunswick.org/bulkpickup or call 732-745-5059. Up to 6 cans, bags or bulk items per unit per pickup. Brush: bundles under 4 ft and 50 lb, branches up to 5 in. thick, never in bags. No car parts.",
        "notes_es": "", "source_url": SOURCE, "status": "verified", "last_verified": VERIFIED,
    })
    trees = [{"date": d, "label": "Christmas tree pickup"} for d in
             ("2026-01-07", "2026-01-14", "2026-01-21", "2026-01-28", "2027-01-06", "2027-01-13", "2027-01-20", "2027-01-27")]
    out.append({
        "region": "new-brunswick", "stream": "yard", "weekday": 3, "week_pattern": "custom", "rrule": None, "dates": trees,
        "area_key": "", "area_note": "City-wide: leaves, Christmas trees",
        "notes_en": "Leaves are collected curbside in spring and fall by leaf zone, in PAPER bags only, never plastic. Pick up 20 free paper bags per property "
                    "(more cost $5 per bundle of 10, check or money order). The leaf-zone dates are on the city's printed schedule: call the Recycling Division at 732-745-5059 to confirm yours. "
                    "Real, bare Christmas trees go curbside Tuesday night for pickup every Wednesday in January (dates listed). Artificial trees need a bulk appointment. Brush is by appointment, see the bulk entry.",
        "notes_es": "", "source_url": "https://www.cityofnewbrunswick.org/residents/departments/engineering_and_public_works/recycling_-_by_item.php",
        "status": "verified", "last_verified": VERIFIED,
    })
    return out


def main():
    data = json.loads(TOWNS.read_text(encoding="utf-8"))
    data["schedules"] = [s for s in data["schedules"] if s["region"] != "new-brunswick"] + rows()
    TOWNS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"new-brunswick: {len(rows())} schedule rows")


if __name__ == "__main__":
    main()
