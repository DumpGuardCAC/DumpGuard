#!/usr/bin/env python3
"""Build recheck_anchors_holidays.json from primary sources (pass 2)."""
from __future__ import annotations

import json
import re
import ssl
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOWNS_PATH = ROOT / "towns_research.json"
OUT = Path(__file__).resolve().parent / "recheck_anchors_holidays.json"

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def fetch(url: str) -> str | None:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, context=CTX, timeout=45) as r:
            return r.read().decode("utf-8", "replace")
    except Exception:
        return None


def strip_html(html: str) -> str:
    t = re.sub(r"(?is)<script.*?>.*?</script>", " ", html)
    t = re.sub(r"(?is)<style.*?>.*?</style>", " ", t)
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"\s+", " ", t)
    return t.strip()


def plus14(anchor: str, nxt: str) -> bool:
    a = datetime.strptime(anchor, "%Y-%m-%d")
    b = datetime.strptime(nxt, "%Y-%m-%d")
    return (b - a).days == 14


def anchor_row(
    town: str,
    zone: str,
    weekday: str,
    anchor_date: str,
    next_date: str,
    source_url: str,
    notes: str | None = None,
) -> dict:
    return {
        "town": town,
        "zone": zone,
        "weekday": weekday,
        "anchor_date": anchor_date,
        "next_date": next_date,
        "next_interval_days": (
            datetime.strptime(next_date, "%Y-%m-%d")
            - datetime.strptime(anchor_date, "%Y-%m-%d")
        ).days,
        "confirmed_plus_14": plus14(anchor_date, next_date),
        "source_url": source_url,
        "notes": notes,
    }


def main() -> None:
    towns = json.loads(TOWNS_PATH.read_text(encoding="utf-8-sig"))

    ob_pdf = "https://5il.co/3symt"
    pisc_pdf = "https://cms9files.revize.com/piscatawaytownshipnj/Document_Center/Department/Public%20Works/Division%20of%20Recycling%20%26%20Solid%20Waste/Recycling%20curbside%20pick-up%20map%202026.pdf"
    say_url = "https://www.sayreville.com/cn/webpage.cfm?tpid=18888"
    sa_pdf = "https://www.southamboynj.gov/_Content/pdf/2026-Recycling-Schedule.pdf"
    sp_url = "https://www.southplainfieldnj.com/spnj/Departments/Departments/Recycling/Curbside"
    fh_pdf = "https://www.fairhavennj.org/sites/g/files/vyhlif4411/f/uploads/2026_municipal_calendar_final-edit_9-14-2026.pdf"
    haz_pdf = "https://www.hazlettwp.org/DocumentCenter/View/10520/Green-Booklet-2026-PDF"
    key_pdf = "https://keyportonline.com/wp-content/uploads/2026/04/2026_Recycling_Schedule_and_Map.pdf"
    ls_pdf = "https://www.littlesilvernj.gov/DocumentCenter/View/886"
    nc_pdf = "https://www.neptunecitynj.com/sites/g/files/vyhlif5316/f/uploads/2026_calendar.pdf"
    nt_pdf = "https://neptunetownship.org/sites/default/files/2026%20DPW%20CALENDAR%20Town%20Website%20%281%29.pdf"
    ub_pdf = "https://www.unionbeachnj.gov/ubnj/News%20%26%20Announcements/2026%20Trash%20and%20Recycling%20Collection%20Calendar.pdf"
    matawan_pdf = "https://www.matawanborough.com/matawan/Borough%20SERVICES/Recycling/NEW%20TRASH%20CONTRACT%20INFORMATION%20DATES%20AND%20SCHEDULE%202026.pdf"

    alternating = []

    # Old Bridge wards (2026 curbside recycling PDF)
    for ward, wd, a, n in [
        ("1", "monday", "2026-01-05", "2026-01-19"),
        ("2", "tuesday", "2026-01-06", "2026-01-20"),
        ("3_and_4", "wednesday", "2026-01-07", "2026-01-21"),
        ("5", "thursday", "2026-01-08", "2026-01-22"),
        ("6", "friday", "2026-01-09", "2026-01-23"),
    ]:
        alternating.append(anchor_row("old-bridge", f"Ward {ward}", wd, a, n, ob_pdf))
    alternating.append(
        anchor_row(
            "old-bridge",
            "Central Park exception (Ward 3 map)",
            "monday",
            "2026-01-05",
            "2026-01-19",
            ob_pdf,
            "Stone Ct, Aimy Ct, Rachele Ct; Monday pickup though mapped Ward 3.",
        )
    )
    alternating.append(
        anchor_row(
            "old-bridge",
            "Arbors exception (Ward 4 map)",
            "tuesday",
            "2026-01-06",
            "2026-01-20",
            ob_pdf,
            "Arbors, Sonoma Court, Lakeridge West; Tuesday though mapped Ward 4.",
        )
    )

    # Piscataway sections
    for zone, wd, a, n in [
        ("Sec 4,5,6,7", "monday", "2026-01-05", "2026-01-19"),
        ("Sec 1,2,3,10", "tuesday", "2026-01-06", "2026-01-20"),
        ("Sec 8,9", "wednesday", "2026-01-07", "2026-01-21"),
    ]:
        alternating.append(anchor_row("piscataway", zone, wd, a, n, pisc_pdf))

    # Sayreville MCIA districts
    alternating.append(
        anchor_row("sayreville", "MCIA Tuesday district", "tuesday", "2026-01-13", "2026-01-27", say_url)
    )
    alternating.append(
        anchor_row("sayreville", "MCIA Wednesday district", "wednesday", "2026-01-14", "2026-01-28", say_url)
    )
    alternating.append(
        anchor_row(
            "sayreville",
            "MCIA Thursday district",
            "thursday",
            "2026-01-03",
            "2026-01-15",
            say_url,
            "Jan 1 2026 Thursday moved to Saturday Jan 3 per borough 2026 page.",
        )
    )
    alternating.append(
        anchor_row("sayreville", "MCIA Friday district", "friday", "2026-01-02", "2026-01-16", say_url)
    )

    alternating.append(
        anchor_row("south-amboy", "Borough-wide MCIA", "friday", "2026-01-02", "2026-01-16", sa_pdf)
    )
    alternating.append(
        anchor_row("south-plainfield", "Thursday recycling district", "thursday", "2026-01-08", "2026-01-22", sp_url)
    )
    alternating.append(
        anchor_row("south-plainfield", "Friday recycling district", "friday", "2026-01-09", "2026-01-23", sp_url)
    )
    alternating.append(
        anchor_row("fair-haven", "All zones", "wednesday", "2026-01-07", "2026-01-21", fh_pdf)
    )

    # Hazlet zones (Green Booklet 2026 center schedule)
    hazlet = [
        ("1", "tuesday", "2026-01-06", "2026-01-20"),
        ("2", "tuesday", "2026-01-13", "2026-01-27"),
        ("3", "wednesday", "2026-01-07", "2026-01-21"),
        ("4", "wednesday", "2026-01-14", "2026-01-28"),
        ("5", "thursday", "2026-01-08", "2026-01-22"),
        ("6", "thursday", "2026-01-05", "2026-01-15", "Jan 5 is Monday; zone 6 list uses holiday-shifted dates."),
        ("7", "friday", "2026-01-09", "2026-01-23"),
        ("8", "friday", "2026-01-02", "2026-01-16"),
    ]
    for item in hazlet:
        zone, wd, a, n = item[:4]
        note = item[4] if len(item) > 4 else None
        alternating.append(anchor_row("hazlet", f"Zone {zone}", wd, a, n, haz_pdf, note))

    alternating.append(
        anchor_row("keyport", "Zones 1-2", "wednesday", "2026-01-07", "2026-01-21", key_pdf)
    )
    alternating.append(
        anchor_row("keyport", "Zones 3-4", "wednesday", "2026-01-14", "2026-01-28", key_pdf)
    )
    alternating.append(
        anchor_row("little-silver", "Zone 1", "wednesday", "2026-01-07", "2026-01-21", ls_pdf)
    )
    alternating.append(
        anchor_row("little-silver", "Zone 2", "wednesday", "2026-01-14", "2026-01-28", ls_pdf)
    )
    alternating.append(
        anchor_row(
            "neptune-city",
            "Zone 1 (east of Union Ave)",
            "wednesday",
            "2026-01-14",
            "2026-01-28",
            nc_pdf,
        )
    )
    alternating.append(
        anchor_row(
            "neptune-city",
            "Zone 2 (west of Union Ave)",
            "wednesday",
            "2026-01-07",
            "2026-01-21",
            nc_pdf,
        )
    )

    for sub, wd, a, n, note in [
        ("A1", "monday", "2026-01-12", "2026-01-26", None),
        ("A2", "monday", "2026-01-05", "2026-01-21", "Jan 19 pickup moved to Wed Jan 21 (MLK)."),
        ("B1", "tuesday", "2026-01-13", "2026-01-27", None),
        ("B2", "tuesday", "2026-01-06", "2026-01-20", None),
        ("C1", "friday", "2026-01-02", "2026-01-16", None),
        ("C2", "friday", "2026-01-09", "2026-01-23", None),
        ("D1", "thursday", "2026-01-15", "2026-01-29", "Jan 1 D1 moved to Wed Dec 31 2025 per calendar."),
        ("D2", "thursday", "2026-01-08", "2026-01-22", None),
    ]:
        alternating.append(
            anchor_row("neptune-township", f"Recycling sub-zone {sub}", wd, a, n, nt_pdf, note)
        )

    alternating.append(
        anchor_row("union-beach", "Section A", "wednesday", "2026-01-14", "2026-01-28", ub_pdf)
    )
    alternating.append(
        anchor_row("union-beach", "Section B", "wednesday", "2026-01-07", "2026-01-21", ub_pdf)
    )

    # Matawan white/blue after May 11 2026 (contract PDF)
    for zone, wd, white, blue in [
        ("1_and_2", "thursday", "2026-05-14", "2026-05-21"),
        ("3_and_4", "wednesday", "2026-05-13", "2026-05-20"),
    ]:
        alternating.append(
            {
                "town": "matawan",
                "zone": f"Zone {zone}",
                "weekday": wd,
                "week_type": "White Week (commingled)",
                "anchor_date": white,
                "next_same_type_date": "2026-05-28" if wd == "thursday" else "2026-05-27",
                "next_same_type_interval_days": 14,
                "confirmed_plus_14_same_type": True,
                "source_url": matawan_pdf,
                "notes": "Contract effective May 11 2026; first White Week after May 11.",
            }
        )
        alternating.append(
            {
                "town": "matawan",
                "zone": f"Zone {zone}",
                "weekday": wd,
                "week_type": "Blue Week (mixed paper/newspaper/cardboard)",
                "anchor_date": blue,
                "next_same_type_date": "2026-06-04" if wd == "thursday" else "2026-06-03",
                "next_same_type_interval_days": 14,
                "confirmed_plus_14_same_type": True,
                "source_url": matawan_pdf,
                "notes": "First Blue Week after May 11 2026.",
            }
        )

    holiday_rules: dict[str, dict] = {}

    def add_holiday(slug: str, source_url: str, **fields):
        holiday_rules[slug] = {"source_url": source_url, **fields}

    add_holiday(
        "old-bridge",
        ob_pdf,
        holiday_rule="If a Holiday falls on your recycling day, pickup that Saturday.",
        override_dates_2026=[
            {"holiday": "Memorial Day 2026-05-25", "pickup": "2026-05-30"},
            {"holiday": "Thanksgiving 2026-11-26", "pickup": "2026-11-28"},
            {"holiday": "Christmas 2026-12-25", "pickup": "2026-12-26"},
        ],
    )
    add_holiday(
        "piscataway",
        pisc_pdf,
        holiday_rule="If collection day falls on a holiday, collection rescheduled for the following Saturday.",
        override_dates_2026=[{"holiday": "Memorial Day 2026-05-25", "pickup": "2026-05-30"}],
    )
    add_holiday(
        "sayreville",
        say_url,
        holiday_rule="Municipal Public Works holidays do NOT affect MCIA recycling collection.",
    )
    add_holiday("south-amboy", sa_pdf, holiday_rule="2026 dates listed on borough PDF; MCIA hotline for weather changes.")
    add_holiday(
        "south-plainfield",
        sp_url,
        holiday_rule="No collection Thanksgiving or Christmas; makeup dates on calendar table.",
        override_dates_2026=[
            {"holiday": "Thanksgiving 2026-11-26", "thursday_district_pickup": "2026-11-28"},
            {"holiday": "Christmas 2026-12-25", "friday_district_pickup": "2026-12-26"},
        ],
    )
    add_holiday(
        "fair-haven",
        fh_pdf,
        holiday_rule="Borough office/DPW holiday closures listed on 2026 municipal calendar; check website for collection shifts.",
    )
    add_holiday(
        "hazlet",
        haz_pdf,
        holiday_rule="Recycling yard closed on listed holidays; zone recycling dates shifted per Green Booklet (e.g. Nov 3 zone 2 to Nov 2).",
        override_dates_2026=[
            {"note": "Apr 3 zone 7 to Apr 6"},
            {"note": "Nov 26 zone 5 to Nov 23"},
            {"note": "Nov 27 zone 7 to Nov 30"},
            {"note": "Dec 24 zone 5 to Dec 21"},
            {"note": "Dec 25 zone 7 to Dec 28"},
            {"note": "June 19 zone 8 to June 22"},
            {"note": "July 3 zone 8 to July 6"},
            {"note": "Nov 3 zone 2 to Nov 2"},
            {"note": "Nov 11 zone 3 to Nov 9"},
        ],
    )
    add_holiday(
        "keyport",
        "https://keyportonline.com/wp-content/uploads/2026/04/2026_Recycling_Schedule_and_Map.pdf",
        holiday_rule="No garbage/recycling pickup New Year's Day, Christmas Day, or Thanksgiving Day; following day when weather permits.",
    )
    add_holiday(
        "little-silver",
        ls_pdf,
        holiday_rule="No trash or recycling curbside collection on Thanksgiving Day, Christmas Day, or New Year's Day.",
    )
    add_holiday(
        "neptune-city",
        nc_pdf,
        holiday_rule="No recycling or garbage collection Thanksgiving, Christmas, New Year's, or July 4.",
    )
    add_holiday(
        "neptune-township",
        nt_pdf,
        holiday_rule="Neptune Township: garbage/recycling on holiday moved to Wednesday same week. Ocean Grove: garbage canceled that day; if holiday is Wednesday OG recycling moves to Friday.",
    )
    add_holiday(
        "union-beach",
        ub_pdf,
        holiday_rule="2026 calendar lists no-trash overrides only.",
        override_dates_2026=[
            {"section": "A", "note": "No trash pickup 2026-12-25 (Friday)"},
            {"section": "B", "note": "No trash pickup 2026-01-01 and 2026-11-26 (Thursdays)"},
        ],
    )
    add_holiday(
        "matawan",
        matawan_pdf,
        holiday_rule="If pickup missed due to holiday or severe weather, remaining pickups that week move one day later.",
        holidays_closed=[
            "New Years Day",
            "Memorial Day",
            "Labor Day",
            "Thanksgiving Day",
            "Christmas Day",
            "New Years Day 2027",
        ],
    )

    # Additional towns (33) - from primary schedule source_urls in towns_research
    per_town_holiday_sources = {
        "carteret": (
            "https://www.carteret.net/wp-content/uploads/2026/01/2026-Sanitation-Calendar.pdf",
            "See 2026 Sanitation Calendar for holiday week shifts.",
        ),
        "highland-park": (
            "https://www.hpboro.com/departments/public-works/recycling-1183",
            "Collection date subject to change in the event of a holiday.",
        ),
        "metuchen": (
            "https://metuchennj.org/departments/dpw/public-works-calendars/1753-october-december-2026-calendar/file",
            "Holiday-week shifts on 2026 DPW calendar PDFs.",
        ),
        "perth-amboy": (
            "https://cdnsm5-hosted.civiclive.com/UserFiles/Servers/Server_11204924/File/Departments/Public%20Works/2025/Holiday%20Annual%20Guidelines%20Dates%202025_LLdocx.pdf",
            "If holiday falls on regularly scheduled garbage day, service resumes next scheduled collection day.",
            [{"holiday": "2026-01-01", "note": "Listed in 2025 holiday guidelines PDF"}],
        ),
        "aberdeen": (
            "https://www.aberdeennj.org/271/Trash-Recycling",
            "If recycling or garbage day falls on New Year's Day, Thanksgiving, or Christmas Day, pick-up on the next scheduled pick-up day.",
        ),
        "allenhurst": (
            "https://www.allenhurstnj.org/264/Public-Works",
            "No explicit holiday override text on Public Works page (undated).",
        ),
        "atlantic-highlands": (
            "https://www.atlantichighlands.org/departments/public-works/",
            "See borough 2026 sanitation calendar PDF on Public Works page for holiday trash delays.",
        ),
        "bradley-beach": (
            "https://www.bradleybeachnj.gov/departments/public-works/",
            "2026 sanitation calendar PDF on site; holiday trash delays on Public Works page.",
        ),
        "deal": ("https://www.dealborough.com/public-works", "See Deal refuse/recycling pages (undated)."),
        "highlands": (
            "https://highlandsnj.gov/wp-content/uploads/2026/02/22936_BoroHighlands_Calendar_2026_PROOF_06P.pdf",
            "No trash pickup Thanksgiving, Christmas, and New Year's Day (2026 calendar).",
        ),
        "interlaken": (
            "https://www.interlakenboro.com/public-works.html",
            "On holidays, pick up will be the next day.",
        ),
        "keansburg": (
            "https://www.keansburgnj.gov/departments/public-works/",
            "No curbside collection Thanksgiving, Christmas, or New Year's Day.",
        ),
        "loch-arbour": (
            "https://www.locharbournj.us/trash-recycling",
            "Bulk schedule only on village site; trash/recycling weekdays via Deal (not restated on Loch Arbour page).",
        ),
        "middletown": (
            "https://www.middletownnj.org/571/Curbside-Garbage-Collection",
            "No garbage on New Year's Day, Thanksgiving, Christmas; next scheduled garbage day. Recycling on those holidays collected following Saturday if scheduled.",
        ),
        "monmouth-beach": (
            "https://www.monmouthbeach.org/departments/public-works/",
            "No pickup Thanksgiving, Christmas, or New Year's Day; next regularly scheduled day.",
        ),
        "oceanport": (
            "https://www.oceanportnj.org/departments/public-works",
            "See borough site; 2026 holiday garbage/recycling schedule referenced on Public Works page.",
        ),
        "red-bank": (
            "https://www.redbanknj.org/208/Public-Utilities",
            "Public Utilities page (undated); no 2026 override table on fetched page.",
        ),
        "rumson": (
            "https://www.rumsonnj.gov/departments/public-works/",
            "See Rumson Public Works / 2026 calendar references on borough site.",
        ),
        "sea-bright": (
            "https://www.seabrightnj.org/departments/public-works/",
            "No pickup Thanksgiving Day on weekly schedules listed on Public Works page.",
        ),
        "west-long-branch": (
            "https://www.westlongbranch.org/1345/Garbage-Collection",
            "No collection New Year's Day, Independence Day, Election Day, Thanksgiving, Christmas. Recycling: no pickup Thanksgiving, Christmas, or New Year's Day (next regular day).",
        ),
    }
    for slug, val in per_town_holiday_sources.items():
        if slug in holiday_rules:
            continue
        if len(val) == 2:
            url, rule = val
            overrides = None
        else:
            url, rule, overrides = val
        entry = {"source_url": url, "holiday_rule": rule}
        if overrides:
            entry["override_dates_2026"] = overrides
        holiday_rules[slug] = entry

    zip_shared = {
        "07711": {
            "towns": ["Allenhurst Borough", "Loch Arbour Village"],
            "source_url": "https://www.allenhurstnj.org/264/Public-Works",
            "source_note": "Both municipalities list 07711 on official contact/Public Works pages.",
        },
        "07735": {
            "towns": ["Aberdeen Township", "Keyport Borough", "Union Beach Borough"],
            "source_url": "https://www.aberdeennj.org/271/Trash-Recycling",
            "source_note": "Aberdeen and Keyport zips in towns_research; Union Beach Contact Us lists 07735.",
        },
        "07734": {
            "towns": ["Hazlet Township", "Keansburg Borough"],
            "source_url": "https://www.hazlettwp.org/866/Mobile-Home-Parks",
            "source_note": "Hazlet 07734 mobile-home page; Keansburg contact lists 07734.",
        },
        "07732": {
            "towns": ["Highlands Borough", "Keyport Borough"],
            "source_url": "https://keyportonline.com/departments/public-works/",
            "source_note": "Keyport DPW address Keyport NJ 07732; Highlands DPW lists 07732.",
        },
        "07747": {
            "towns": ["Aberdeen Township", "Matawan Borough"],
            "source_url": "https://www.matawanborough.com/matawan/Borough%20SERVICES/Recycling/",
            "source_note": "Both municipalities publish 07747 on official recycling/ trash pages.",
        },
        "07753": {
            "towns": ["Neptune City Borough", "Neptune Township"],
            "source_url": "https://neptunetownship.org/departments/public-works",
            "source_note": "Both use 07753 on official public works pages.",
        },
        "07760": {
            "towns": ["Rumson Borough", "Sea Bright Borough"],
            "source_url": "https://www.rumsonnj.gov/",
            "source_note": "Rumson and Sea Bright official sites list 07760.",
        },
        "07701": {
            "towns": [
                "Red Bank Borough",
                "Middletown Township",
                "Shrewsbury Borough",
                "Fair Haven Borough",
            ],
            "source_url": "https://www.redbanknj.org/Faq.aspx?QID=83",
            "source_note": "Red Bank FAQ: 07701 is mail delivery only; many addresses are in Middletown, Shrewsbury, or Fair Haven.",
        },
    }

    dropoff_entries = []
    for slug, town in towns.items():
        for i, d in enumerate(town.get("dropoff") or []):
            url = d.get("source_url")
            html = fetch(url) if url else None
            text = strip_html(html) if html else ""
            accepts = None
            residents_only = d.get("residents_only")
            proof_required = None

            if slug == "piscataway" and "mini-dump" in (url or ""):
                accepts = (
                    "Township Mini-Dump page lists accepted/not accepted materials; "
                    "requires Piscataway Service Card."
                )
                residents_only = True
                proof_required = "Piscataway Service Card"
            elif slug == "hazlet" and text:
                m = re.search(
                    r"(WHAT IS RECYCLABLE\?.*?)(WHAT CAN BE COMMINGLED|$)",
                    text,
                    re.I | re.S,
                )
                if m:
                    accepts = m.group(1)[:1200]
                residents_only = True
            elif slug == "union-beach" and text:
                if "residents ONLY" in text:
                    residents_only = True
                    proof_required = "Identification if asked; sign in at office"
            elif slug == "south-plainfield" and "Curbside" in (url or ""):
                accepts = (
                    "Drop-off: newspaper, mixed paper, cardboard (flattened), glass bottles, "
                    "aluminum/steel/tin cans, plastic bottles/jugs/jars/tubs (separated by material at site). "
                    "Residents only extras: clothes, used motor oil (up to 5 gal), cooking oil, rechargeable batteries, "
                    "cell phones, paint (3rd Sat/month), appliances, computers, monitors, printers, TVs, scrap metal."
                )
                residents_only = False
            elif slug == "old-bridge" and text:
                accepts = None
            elif slug == "keyport" and "recycling" in (url or ""):
                accepts = (
                    "Saturdays 9:00 a.m.-12:00 noon drop-off of recyclables and pick-up of leaf bags "
                    "(Keyport recycling page / 2026 schedule PDF)."
                )
                residents_only = True

            dropoff_entries.append(
                {
                    "town": slug,
                    "index": i,
                    "name": d.get("name"),
                    "source_url": url,
                    "hours": d.get("hours"),
                    "residents_only": residents_only,
                    "proof_required": proof_required,
                    "accepts_text": accepts,
                }
            )

    source_dates: dict[str, list] = {}
    for slug, town in towns.items():
        updates = []
        for j, s in enumerate(town.get("schedules") or []):
            sd = s.get("source_date")
            stream = s.get("stream")
            wd = s.get("weekday")
            if sd != "undated":
                continue
            new_val = None
            reason = None
            if stream in ("trash", "recycling") and wd and s.get("week_pattern") in (
                "weekly",
                "every week",
            ):
                new_val = "standing"
                reason = "Standing weekly day on official page; no calendar year on source."
            elif stream in ("trash", "recycling") and wd:
                new_val = "standing"
                reason = "Weekday published without document year."
            if new_val:
                updates.append(
                    {
                        "schedule_index": j,
                        "stream": stream,
                        "weekday": wd,
                        "source_date": new_val,
                        "reason": reason,
                        "source_url": s.get("source_url"),
                    }
                )
        if updates:
            source_dates[slug] = updates

    out = {
        "meta": {
            "pass": 2,
            "generated": "2026-10-18",
            "description": "DumpGuard NJ recheck: alternating-week anchors, holidays, ZIP sharing, drop-off, source dates.",
            "primary_sources_only": True,
        },
        "alternating_recycling_anchors": alternating,
        "holiday_rules": holiday_rules,
        "zip_shared_with": zip_shared,
        "dropoff": dropoff_entries,
        "source_dates": source_dates,
    }

    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=True), encoding="utf-8")
    print("Wrote", OUT, "anchors", len(alternating), "holidays", len(holiday_rules))


if __name__ == "__main__":
    main()
