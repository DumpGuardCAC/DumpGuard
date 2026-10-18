#!/usr/bin/env python3
import json

path = r"C:\Users\DagaV\Desktop\CAC\data\towns_research.json"
d = json.load(open(path, encoding="utf-8"))

# Fix Interlaken weekdays from public-works.html
il = d["interlaken"]
il["schedules"] = [
    {
        "stream": "trash",
        "weekday": "Monday, Thursday",
        "week_pattern": "every week",
        "area_note": "Borough-wide regular refuse. On holidays, pick up will be the next day.",
        "source_url": "https://www.interlakenboro.com/public-works.html",
        "source_date": "undated",
    },
    {
        "stream": "recycling",
        "weekday": "Tuesday",
        "week_pattern": "1st and 3rd Tuesday",
        "area_note": "ALL RECYCLABLES: bottles, cans, glass, plastic, corrugated cardboard, newspaper & mixed paper. Curbside before 7:00 AM. Cardboard must be broken down. Bottles/cans/glass/plastic in container not exceeding 42 gallons; newspaper and mixed paper bundled separately.",
        "source_url": "https://www.interlakenboro.com/public-works.html",
        "source_date": "undated",
    },
    {
        "stream": "bulk",
        "weekday": "Monday",
        "week_pattern": "4th Monday of each month except October, November and December; if bulk day falls on holiday, next day",
        "area_note": "Place curbside before 7:00 AM (not before 7 PM evening prior). Electronics (TVs, computers) may go out on bulk days. Items that fit in trash can are NOT bulk.",
        "source_url": "https://www.interlakenboro.com/public-works.html",
        "source_date": "undated",
    },
    {
        "stream": "other",
        "weekday": "Monday",
        "week_pattern": "4th Monday of each month; call Borough Hall 732-531-7405 for appointment; $15 fee for freon items",
        "area_note": "Metals",
        "source_url": "https://www.interlakenboro.com/public-works.html",
        "source_date": "undated",
    },
    {
        "stream": "yard",
        "weekday": "Monday, Tuesday, Wednesday, Thursday",
        "week_pattern": "every week (Mon-Thu brush/leaves; Tue-Thu grass/dirt)",
        "area_note": "Brush, branches, leaves: Mon-Thu; no limbs over 4 feet; one pile per household 1 foot from curb. Grass clippings and dirt: Tue-Thu in containers up to 40 pounds; must be containerized.",
        "source_url": "https://www.interlakenboro.com/public-works.html",
        "source_date": "undated",
    },
]
il["notes"] = (
    "Schedule from borough Public Works page (undated). No municipal drop-off listed on borough site. "
    "Max 40 lb per item/receptacle. Items may not be left curbside Friday afternoon through 7pm Sunday."
)
il["status"] = "complete"

# Middletown: strip 2017-only weekday trash/recycling
md = d["middletown"]
kept = []
for s in md.get("schedules") or []:
    sd = str(s.get("source_date") or "")
    url = s.get("source_url") or ""
    if s.get("stream") in ("trash", "recycling"):
        if sd.startswith("2017") or (sd[:4].isdigit() and int(sd[:4]) < 2026):
            continue
        if "CivicAlerts" in url:
            continue
    kept.append(s)
urls = {s.get("source_url") for s in kept}
if "https://www.middletownnj.org/571/Curbside-Garbage-Collection" not in urls:
    kept.append(
        {
            "stream": "other",
            "weekday": None,
            "week_pattern": "No garbage collection on New Years day, Thanksgiving day and Christmas day; collected on next scheduled garbage collection day",
            "area_note": "Current page directs residents to Recycle Coach for zone; does not state weekday days in plain text.",
            "source_url": "https://www.middletownnj.org/571/Curbside-Garbage-Collection",
            "source_date": "undated",
        }
    )
if "https://www.middletownnj.org/583/Curbside-Recycling-Collection" not in urls:
    kept.append(
        {
            "stream": "other",
            "weekday": None,
            "week_pattern": "No recycling on New Years day, Thanksgiving day and Christmas day; collected the following Saturday if scheduled on those dates",
            "area_note": "Single-stream in Township blue carts; no plastic bags; cardboard broken down inside cart. Page directs to Recycle Coach for schedule.",
            "source_url": "https://www.middletownnj.org/583/Curbside-Recycling-Collection",
            "source_date": "undated",
        }
    )
md["schedules"] = kept
md["notes"] = (
    "Current township garbage/recycling pages do not state weekday or zone days in plain text; "
    "they direct residents to Recycle Coach and a zone map without a published weekday legend. "
    "Older 2017 CivicAlerts weekday schedules were excluded under the pre-2026 rule. "
    "Bulk rules from Sept 2025 newsflash retained if present. Fall 2026 leaf schedule not yet posted. "
    "Missing: trash weekday, recycling weekday."
)
md["status"] = "partial"

la = d["loch-arbour"]
la["notes"] = (
    "Village 2026 bulk Mondays listed on locharbournj.us/trash-recycling. "
    "Sanitation provided via Borough of Deal (contacts page: 732-531-1454). "
    "Deal DPW page states Deal garbage Mon/Wed/Fri and recycling Tue/Thu, but Loch Arbour pages "
    "do not explicitly restate those weekly days for Loch Arbour addresses, so trash/recycling "
    "weekdays left null. Older locharbour.us FAQ (Tue/Fri trash; 1st/3rd Wed recycling) appears "
    "outdated (2018 bulk dates) and was not used."
)
la["status"] = "partial"

for s in d["deal"].get("schedules") or []:
    if s.get("stream") == "yard" and not s.get("week_pattern"):
        s["week_pattern"] = "not provided by borough"
        s["weekday"] = None

json.dump(d, open(path, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
print("patched", path)


def missing(t):
    miss = []
    if not t.get("official_site"):
        miss.append("official_site")
    streams = {s.get("stream") for s in (t.get("schedules") or [])}
    if "trash" not in streams:
        miss.append("trash schedule")
    if "recycling" not in streams:
        miss.append("recycling schedule")
    if not t.get("zips"):
        miss.append("zips")
    dpw = t.get("dpw") or {}
    if not (dpw.get("phone") or dpw.get("address")):
        miss.append("dpw")
    return ", ".join(miss)


def stale(t):
    flags = set()
    for s in t.get("schedules") or []:
        sd = str(s.get("source_date") or "")
        if sd == "undated" or not sd:
            flags.add("undated")
        elif sd[:4].isdigit() and int(sd[:4]) < 2026:
            flags.add("pre-2026:" + sd[:4])
    return "; ".join(sorted(flags))


print(
    "town".ljust(22),
    "status".ljust(12),
    "#sched".rjust(6),
    "#zips".rjust(5),
    "stale/undated",
)
print("-" * 100)
for k, t in d.items():
    st = stale(t)
    flag = ("FLAG: " + st) if st else ""
    print(
        k.ljust(22),
        str(t.get("status")).ljust(12),
        str(len(t.get("schedules") or [])).rjust(6),
        str(len(t.get("zips") or [])).rjust(5),
        flag,
        missing(t),
    )
