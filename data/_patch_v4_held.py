"""P2D/E: tighten remaining held rows where source supports a/b/c/d."""
from __future__ import annotations

import copy
import json
from pathlib import Path

from build_towns_research_v4 import iso_date_rows, row

path = Path("towns_research_v4.json")
R = json.loads(path.read_text(encoding="utf-8-sig"))

# Union Beach fall leaves: Section A Wednesday, Section B Tuesday — expand Oct-Dec 2026
# (merge weekly+months requires word "only" plus summer/extra; fall leaves are neither)
import datetime as dt

def weekdays_in_range(start, end, weekday):
    d = start
    while d.weekday() != weekday:
        d += dt.timedelta(days=1)
    out = []
    while d <= end:
        out.append(d.isoformat())
        d += dt.timedelta(days=7)
    return out

ub = R["union-beach"]
new = []
for s in ub["schedules"]:
    if s.get("stream") == "yard" and (
        "Section A" in (s.get("area_note") or "")
        or "Section B" in (s.get("area_note") or "")
        or s.get("week_pattern") == "seasonal"
    ):
        # replace once
        if any(
            "Section A fall leaf" in (x.get("area_note") or "") for x in new
        ):
            continue
        src = s["source_url"]
        start, end = dt.date(2026, 10, 1), dt.date(2026, 12, 31)
        new.extend(
            iso_date_rows(
                "yard",
                weekdays_in_range(start, end, 2),  # Wednesday
                "Section A fall leaf collection (paper bags)",
                src,
            )
        )
        new.extend(
            iso_date_rows(
                "yard",
                weekdays_in_range(start, end, 1),  # Tuesday
                "Section B fall leaf collection (paper bags)",
                src,
            )
        )
        continue
    if s.get("stream") == "other":
        s = copy.deepcopy(s)
        s["weekday"] = None
        s["week_pattern"] = "by appointment"
        s["area_note"] = (
            "By appointment; appliances, electronics, and metals curbside; call 732-264-1133; "
            "refrigerator doors must be removed."
        )
        s["source_date"] = "standing"
    new.append(s)
ub["schedules"] = new

# Keansburg bulk: one item on garbage day — cannot be shape a alone without weekday duplication;
# keep informational with rule in area_note
for s in R["keansburg"]["schedules"]:
    if s.get("stream") == "bulk":
        s["weekday"] = None
        s["week_pattern"] = "custom"
        s["area_note"] = (
            "One bulk item per household garbage pickup day; furniture allowed; construction "
            "materials excluded; larger items may need to be cut or broken down; Public Works "
            "732-787-0215 Ext. 451."
        )
        s["source_date"] = "standing"
    if s.get("stream") == "yard":
        s["weekday"] = None
        s["week_pattern"] = "seasonal"
        s["area_note"] = (
            "Leaves and branches at curb during months listed on Leaf and Branch Pick Up schedule; "
            "schedule not published on municipal Public Works page as of research; do not bag leaves."
        )

# Little Silver: brush Jan-Oct continuous on trash days is not a clean shape without zone days;
# leave informational. Electronics drop-off informational.
for s in R["little-silver"]["schedules"]:
    if s.get("stream") == "bulk":
        s["weekday"] = None
        s["week_pattern"] = "custom"
        s["area_note"] = (
            "Bulk on second trash pickup of the week (Thursday for Zone 1, Friday for Zone 2); "
            "max 3 items; furniture and carpeting; no appliances, electronics, or construction material."
        )
        s["source_date"] = "standing"
    if s.get("stream") == "other":
        s["weekday"] = None
        s["week_pattern"] = "custom"
        s["area_note"] = (
            "Electronics drop-off at Public Works Yard only (not curbside); TVs, computers, printers, "
            "phones, microwaves, air conditioners, and related items in designated green container."
        )
        s["source_date"] = "2026"

# Neptune City bulk similar
for s in R["neptune-city"]["schedules"]:
    if s.get("stream") == "bulk":
        s["weekday"] = None
        s["week_pattern"] = "custom"
        s["area_note"] = (
            "Up to 3 bulk items on second trash pickup of the week (Thursday for Zone 1, Friday for "
            "Zone 2); mattresses and box springs must be in plastic; rugs cut, rolled, tied, max 30 lbs each."
        )
        s["source_date"] = "standing"

# Interlaken metals appointment already cleaned by builder path — ensure
for s in R["interlaken"]["schedules"]:
    if s.get("stream") == "other":
        s["weekday"] = None
        s["week_pattern"] = "by appointment"
        s["area_note"] = (
            "Metals on 4th Monday of each month; call Borough Hall 732-531-7405 for appointment; "
            "$15 fee for freon items."
        )
        s["source_date"] = "standing"

# Rumson bulk appointment
for s in R["rumson"]["schedules"]:
    if s.get("stream") == "bulk":
        s["weekday"] = None
        s["week_pattern"] = "by appointment"
        s["area_note"] = (
            "By appointment; 1st and 3rd Wednesday January through October; max 2 pickups per year "
            "(5 cu yd each); call Public Works 732-842-8941."
        )
        s["source_date"] = "standing"

# Highland Park / Metuchen bulk
for slug in ("highland-park", "metuchen"):
    for s in R[slug]["schedules"]:
        if s.get("stream") == "bulk":
            s["weekday"] = None
            s["week_pattern"] = "by appointment"
            if slug == "highland-park":
                s["area_note"] = (
                    "By appointment; Wednesdays in April, May, June, September and October; max two "
                    "collections per household per year; Public Works 732-514-1277."
                )
            else:
                s["area_note"] = (
                    "By appointment; call 732-632-8519; 3-item limit."
                )
            s["source_date"] = "standing"

# Deal bulk registration
for s in R["deal"]["schedules"]:
    if s.get("stream") == "bulk":
        s["weekday"] = None
        s["week_pattern"] = "by appointment"
        s["area_note"] = (
            "Monthly bulk starting the 15th (following Monday if 15th is Saturday or Sunday); "
            "register by calling 848-288-1815 with address by 4:30 p.m. on the 14th; place near "
            "normal garbage location by day before pickup."
        )
        s["source_date"] = "standing"
    if s.get("stream") == "yard":
        s["weekday"] = None
        s["week_pattern"] = "not provided"
        s["area_note"] = (
            "Borough does not provide leaf or brush pickup; yard waste must not be placed in street."
        )
        s["source_date"] = "standing"

# Monmouth Beach
for s in R["monmouth-beach"]["schedules"]:
    if s.get("stream") == "bulk":
        s["weekday"] = None
        s["week_pattern"] = "by appointment"
        s["area_note"] = (
            "By appointment; registration closes 2:30 PM Tuesday; four pickups per household per year; "
            "place at curb day prior to collection; Public Works 732-229-5513."
        )
        s["source_date"] = "standing"

# Oceanport
for s in R["oceanport"]["schedules"]:
    if s.get("stream") == "bulk":
        s["weekday"] = None
        s["week_pattern"] = "by appointment"
        s["area_note"] = (
            "By appointment via Citizen Request form; DPW assigns pickup date; Public Works 732-222-8221."
        )
        s["source_date"] = "standing"
    if s.get("stream") == "other":
        s["weekday"] = None
        s["week_pattern"] = "by appointment"
        s["area_note"] = (
            "Electronics pickup by appointment; max 3 items; Public Works 732-222-8221."
        )
        s["source_date"] = "standing"

# Sea Bright appliance
for s in R["sea-bright"]["schedules"]:
    if s.get("stream") == "other" and "appointment" in (s.get("week_pattern") or "").lower():
        s["weekday"] = None
        s["week_pattern"] = "by appointment"
        s["area_note"] = (
            "Residential appliance pick-up: $25 fee per appliance; appointment and form/fee at "
            "Borough Hall (732-842-0099 ext. 119)."
        )
        s["source_date"] = "standing"

# West Long Branch bulky metal — 4th week not a/b/c/d
for s in R["west-long-branch"]["schedules"]:
    if s.get("stream") == "bulk":
        s["weekday"] = None
        s["week_pattern"] = "custom"
        s["area_note"] = (
            "Bulky metal (washers, dryers, miscellaneous metal) borough-wide during the 4th week of "
            "each month; Public Works 732-571-5967."
        )
        s["source_date"] = "standing"

path.write_text(json.dumps(R, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("patched held/appointment notes")
print("UB yard", [s for s in R["union-beach"]["schedules"] if s["stream"] == "yard"])
