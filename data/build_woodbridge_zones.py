"""Add Woodbridge special-pickup rows (brush, leaf, Christmas tree) by street zone, plus a street -> zone lookup file.

Source: Woodbridge Township 2026 Sanitation & Recycling Calendar, "Street Index" (printed pp.33-39; text in
data/sources/woodbridge_2026_calendar_text.txt). Each box is one "RD n Zone m" with its streets and the free pick-up dates:
brush (two dates in April), leaves (seven dates Oct to Dec) and Christmas trees (two dates in Jan 2026 and two in Jan 2027).
Dates are printed per zone, so they are stored as one-off dates (collection_schedules.dates), not a repeating rule.

Run after build_woodbridge.py. Writes:
  data/towns.json                      one 'yard' row per zone (area_key zone:rd4-z1 ...) plus zone:unknown
  data/woodbridge_street_index.json    {zones: {key: {rd, zone, towns, streets}}} for the app's street lookup
"""
import json
import re
from datetime import datetime
from pathlib import Path

from parse_wb_index import parse

HERE = Path(__file__).parent
TOWNS = HERE / "towns.json"
INDEX = HERE / "woodbridge_street_index.json"
SOURCE = "https://www.twp.woodbridge.nj.us/1272/Recycling-Calendar"
VERIFIED = "2026-10-06"
MONTHS = {m: i for i, m in enumerate("jan feb mar apr may jun jul aug sep oct nov dec".split(), 1)}


def md(text, year=2026):
    m = re.fullmatch(r"([A-Za-z]+)\s*(\d+)", text.strip())
    return f"{year}-{MONTHS[m.group(1)[:3].lower()]:02d}-{int(m.group(2)):02d}"


def trees(entries):
    out = []
    for e in entries:
        m = re.fullmatch(r"([A-Za-z]+)\s*(\d+)\s*&\s*(\d+),\s*(\d{4})", e.strip())
        for day in (m.group(2), m.group(3)):
            out.append(md(f"{m.group(1)} {day}", int(m.group(4))))
    return out


NOTE = ("Free special pick-ups for your street zone: brush in April, bagged leaves Oct to Dec, Christmas trees in January. "
        "Brush: branches no longer than 4 ft, bundled and tied. Leaves: biodegradable paper leaf bags only, leaves only. "
        "Put material out the night before. Find your zone in the street index of the township calendar. Questions: Sanitation 732-738-1311 ext. 3600.")


def main():
    zones = parse()
    rows, index = [], {}
    for z in zones:
        key = f"rd{z['rd']}-z{z['zone']}"
        index[key] = {"rd": z["rd"], "zone": z["zone"], "towns": z["towns"], "streets": z["streets"]}
        dates = ([{"date": md(d), "label": "Brush"} for d in z["brush"]]
                 + [{"date": md(d.replace("Dec17", "Dec 17")), "label": "Leaves"} for d in z["leaves"]]
                 + [{"date": d, "label": "Christmas tree"} for d in trees(z["trees"])])
        dates.sort(key=lambda d: d["date"])
        rows.append({
            "region": "woodbridge", "stream": "yard", "weekday": None, "week_pattern": "custom",
            "area_key": f"zone:{key}", "area_note": f"RD {z['rd']} Zone {z['zone']}: streets in {', '.join(z['towns'])}",
            "dates": dates, "notes_en": NOTE, "notes_es": "", "source_url": SOURCE, "status": "verified", "last_verified": VERIFIED,
        })
    rows.append({
        "region": "woodbridge", "stream": "yard", "weekday": None, "week_pattern": "custom",
        "area_key": "zone:unknown", "area_note": "I do not know my street zone",
        "notes_en": "Brush, leaf and Christmas tree days depend on your street. Look your street up in the Street Index of the township 2026 calendar (RD and Zone numbers) or call Sanitation at 732-738-1311 ext. 3600.",
        "notes_es": "", "source_url": SOURCE, "status": "verified", "last_verified": VERIFIED,
    })
    data = json.loads(TOWNS.read_text(encoding="utf-8"))
    data["schedules"] = [s for s in data["schedules"] if not (s["region"] == "woodbridge" and s.get("area_key", "").startswith("zone:"))] + rows
    TOWNS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    INDEX.write_text(json.dumps({"source": SOURCE, "last_verified": VERIFIED, "year": 2026, "zones": index}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"woodbridge zones: {len(rows)} rows, {sum(len(v['streets']) for v in index.values())} street entries")


if __name__ == "__main__":
    main()
