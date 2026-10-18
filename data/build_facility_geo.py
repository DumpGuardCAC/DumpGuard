"""Adds lat, lng and a structured hours schedule to each facility in towns.json.
Coordinates: US Census geocoder (rooftop match) except Woodbridge, which Census could not match; that one is OpenStreetMap
(house-level node for 225 Smith St, Keasbey). Rotating-site facilities have no fixed point.
Hours are the same text already verified in `hours`, written as data. days: 0=Sunday .. 6=Saturday. Times are local (NJ).
Run after the other build_*.py scripts and before apply_spanish.py."""
import json
from pathlib import Path

D = Path(__file__).parent

def week(days, o, c):
    return {"days": days, "open": o, "close": c}

GEO = {
    "monmouth-hhw": (40.231546, -74.112526, [week([2, 3, 5], "11:00", "16:00"), week([6], "08:00", "16:00")]),
    "long-branch-drop-off": (40.312588, -73.997570, [week([1, 2, 3, 4, 5], "07:30", "15:00"), week([6], "09:00", "13:00")]),
    "asbury-park-recycling-center": (40.214463, -74.013991, [week([1, 2, 3, 4, 5], "16:00", "20:00"), week([0, 6], "10:00", "14:00")]),
    "edison-recycling-center": (40.540288, -74.383869, [week([1, 2, 3, 4, 5, 6], "06:30", "14:00")]),
    "new-brunswick-second-saturday": (40.483774, -74.463607, [{"nth": 2, "day": 6, "open": "08:00", "close": "12:00"}]),
    "woodbridge-recycling-center": (40.514821, -74.301688, [week([1, 2, 3, 4, 5, 6], "08:00", "14:00")]),
    "woodbridge-convenience-center": (40.514821, -74.301688, [week([1, 2, 3, 4, 5, 6], "08:00", "14:00")]),
    # Event days only (2026 schedule from the county PDF); no fixed location.
    "middlesex-hhw": (None, None, [{"date": d, "open": "08:00", "close": "14:00"} for d in
                                   ("2026-03-15", "2026-05-16", "2026-06-28", "2026-09-19", "2026-11-15")]),
}

path = D / "towns.json"
towns = json.loads(path.read_text(encoding="utf8"))
for f in towns["facilities"]:
    lat, lng, hours = GEO[f["key"]]
    f["lat"], f["lng"], f["hours_struct"] = lat, lng, hours
assert {f["key"] for f in towns["facilities"]} == set(GEO), "facility list changed; update GEO"
path.write_text(json.dumps(towns, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
print("geo + structured hours written for", len(GEO), "facilities")
