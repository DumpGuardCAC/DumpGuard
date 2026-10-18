"""Replace the Asbury Park trash / recycling / bulk rows in towns.json with per-zone rows.

Source: City of Asbury Park "Weekly Curbside Collection Schedule for Residential Garbage, Bulk Waste & Recycling"
(zone map PDF, stamped "11.23" in its corner, so the city may have revised it since; confirm with Public Works,
732-775-0900). Table read from the rendered PDF page.

Zone | Garbage                                  | Bulk | Recycling
1    | Mon & Thu                                | Thu  | Tue
1A   | Oct 1-Apr 30 Mon & Fri; May 1-Sep 30 Mon, Wed & Fri | Thu | Tue
2    | Tue & Fri                                | Fri  | Wed
2A   | Oct 1-Apr 30 Mon & Fri; May 1-Sep 30 Mon, Wed & Fri | Fri | Wed
3    | Wed & Sat                                | Sat  | Thu

Household garbage is canceled on New Year's Day, Thanksgiving and Christmas; recycling is canceled on municipal
holidays. Canceled pickups happen on the next scheduled pickup day.
"""
import json
from pathlib import Path

TOWNS = Path(__file__).with_name("towns.json")
SOURCE = "https://www.cityofasburypark.com/DocumentCenter/View/264/Garbage-and-Recycling-Collection-Map-with-Zones-PDF"
VERIFIED = "2026-10-06"
DAY = {"Mon": (1, "MO"), "Tue": (2, "TU"), "Wed": (3, "WE"), "Thu": (4, "TH"), "Fri": (5, "FR"), "Sat": (6, "SA")}
WINTER = "BYMONTH=10,11,12,1,2,3,4"
SUMMER = "BYMONTH=5,6,7,8,9"

ZONES = {
    "1": "Areas east of, and including, Grand Ave",
    "1A": "Cookman Ave and Lake Ave between Grand Ave and Heck St; all east and west streets between and including Ocean Ave and Kingsley St",
    "2": "All areas between Grand Ave and Comstock St / Prospect Ave",
    "2A": "All of Main Street; Central Business District bounded by Main St, Summerfield Ave, Lake Ave and Grand Ave",
    "3": "All areas west of, and including, Comstock St / Prospect Ave",
}

# (zone, stream, days, season) ; season None = year round
PLAN = [
    ("1", "trash", ["Mon", "Thu"], None), ("1", "bulk", ["Thu"], None), ("1", "recycling", ["Tue"], None),
    ("1A", "trash", ["Mon", "Fri"], "winter"), ("1A", "trash", ["Mon", "Wed", "Fri"], "summer"),
    ("1A", "bulk", ["Thu"], None), ("1A", "recycling", ["Tue"], None),
    ("2", "trash", ["Tue", "Fri"], None), ("2", "bulk", ["Fri"], None), ("2", "recycling", ["Wed"], None),
    ("2A", "trash", ["Mon", "Fri"], "winter"), ("2A", "trash", ["Mon", "Wed", "Fri"], "summer"),
    ("2A", "bulk", ["Fri"], None), ("2A", "recycling", ["Wed"], None),
    ("3", "trash", ["Wed", "Sat"], None), ("3", "bulk", ["Sat"], None), ("3", "recycling", ["Thu"], None),
]

NOTES = {
    "trash": "Household garbage. Set out after 5 p.m. the day before; remove by 6 p.m. on collection day. Canceled on New Year's Day, Thanksgiving and Christmas; the pickup then happens on the next scheduled day.",
    "recycling": "Single stream, do not bag. Max 60 lb per container. Set out after 5 p.m. the day before. Canceled on municipal holidays; the pickup then happens on the next scheduled day.",
    "bulk": "Weekly, limit 3 items. No TVs, electronics, white goods or yard waste (see the city's recycling page). Call 732-775-0900 to confirm.",
}


def rows():
    out = []
    for zone, stream, days, season in PLAN:
        for d in days:
            num, code = DAY[d]
            parts = [f"FREQ=WEEKLY;BYDAY={code}"]
            if season:
                parts.append(WINTER if season == "winter" else SUMMER)
            span = {"winter": " (Oct 1 to Apr 30)", "summer": " (May 1 to Sep 30)"}.get(season, "")
            out.append({
                "region": "asbury-park",
                "stream": stream,
                "weekday": num % 7,
                "week_pattern": "weekly",
                "area_key": f"zone-{zone.lower()}",
                "area_note": f"Zone {zone}{span}: {ZONES[zone]}",
                "rrule": ";".join(parts),
                "notes_en": NOTES[stream],
                "notes_es": "",
                "source_url": SOURCE,
                "status": "verified",
                "last_verified": VERIFIED,
            })
    return out


def main():
    data = json.loads(TOWNS.read_text(encoding="utf-8"))
    kept = [s for s in data["schedules"]
            if not (s["region"] == "asbury-park" and s["stream"] in ("trash", "recycling", "bulk"))]
    new = rows()
    data["schedules"] = kept + new
    TOWNS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {len(new)} asbury park rows")


if __name__ == "__main__":
    main()
