#!/usr/bin/env python3
"""Build data/towns_research_v2.json from towns_research.json with RECHECK resolutions.
Primary-source evidence only. ASCII punctuation.
"""
from __future__ import annotations

import copy
import json
import os
from typing import Any

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "towns_research.json")
DST = os.path.join(ROOT, "towns_research_v2.json")
FRAG = os.path.join(ROOT, "research_fragments")

CARTERET_PDF = "https://www.carteret.net/wp-content/uploads/2026/01/2026-Sanitation-Calendar.pdf"
CARTERET_MAP = "https://www.carteret.net/wp-content/uploads/2023/05/Recycling-District-Map.pdf"
SUMMER = "June 1 through August 31 (2026 calendar shows extra summer day each Thursday/Monday/Friday/Tuesday from first week of June through last week of August)"


def row(
    stream: str,
    weekday: str | None,
    week_pattern: str | None,
    area_note: str | None,
    source_url: str,
    source_date: str,
    **extra: Any,
) -> dict:
    out = {
        "stream": stream,
        "weekday": weekday,
        "week_pattern": week_pattern,
        "area_note": area_note,
        "source_url": source_url,
        "source_date": source_date,
    }
    out.update(extra)
    return out


def load_json(path: str) -> Any:
    if not os.path.exists(path):
        return None
    return json.load(open(path, encoding="utf-8-sig"))


def patch_carteret(t: dict) -> None:
    # Split "plus summer" into year-round + summer-extra rows (merge-friendly weekdays).
    # Districts from 2026 Sanitation Calendar pages 1-8; summer months Jun-Aug from calendar grids.
    schedules = []
    # Sanitation A / Recycling 1,2,3: Monday + summer Thursday
    for rec_dist, rec_pat in [
        ("1", "1st and 3rd Monday of the month"),
        ("2", "1st and 3rd Tuesday of the month"),
        ("3", "2nd and 4th Monday of the month"),
    ]:
        schedules.append(
            row(
                "trash",
                "Monday",
                "every week",
                f"Sanitation District A / Recycling District {rec_dist}. Street boundaries: use Recycling District Map PDF and address search on borough public works page (map is graphic; street index on map).",
                CARTERET_PDF,
                "2026",
            )
        )
        schedules.append(
            row(
                "trash",
                "Thursday",
                "every week",
                f"Sanitation District A / Recycling District {rec_dist}; summer extra day only. {SUMMER}.",
                CARTERET_PDF,
                "2026",
                summer_range={"start": "2026-06-01", "end": "2026-08-31"},
            )
        )
        schedules.append(
            row(
                "recycling",
                "Monday" if "Monday" in rec_pat else "Tuesday",
                rec_pat + "; includes bulk paper/junk mail pickup",
                f"Sanitation District A / Recycling District {rec_dist}",
                CARTERET_PDF,
                "2026",
            )
        )
    # B/4 Thursday + summer Monday
    schedules += [
        row(
            "trash",
            "Thursday",
            "every week",
            "Sanitation District B / Recycling District 4. Street boundaries: Recycling District Map PDF.",
            CARTERET_PDF,
            "2026",
        ),
        row(
            "trash",
            "Monday",
            "every week",
            f"Sanitation District B / Recycling District 4; summer extra day only. {SUMMER}.",
            CARTERET_PDF,
            "2026",
            summer_range={"start": "2026-06-01", "end": "2026-08-31"},
        ),
        row(
            "recycling",
            "Tuesday",
            "2nd and 4th Tuesday of the month; includes bulk paper/junk mail pickup",
            "Sanitation District B / Recycling District 4",
            CARTERET_PDF,
            "2026",
        ),
    ]
    # C/5 and C/6 Tuesday + summer Friday
    for dist, rday, rpat in [
        ("5", "Wednesday", "1st and 3rd Wednesday of the month"),
        ("6", "Thursday", "1st and 3rd Thursday of the month"),
    ]:
        schedules += [
            row(
                "trash",
                "Tuesday",
                "every week",
                f"Sanitation District C / Recycling District {dist}. Street boundaries: Recycling District Map PDF.",
                CARTERET_PDF,
                "2026",
            ),
            row(
                "trash",
                "Friday",
                "every week",
                f"Sanitation District C / Recycling District {dist}; summer extra day only. {SUMMER}.",
                CARTERET_PDF,
                "2026",
                summer_range={"start": "2026-06-01", "end": "2026-08-31"},
            ),
            row(
                "recycling",
                rday,
                rpat + "; includes bulk paper/junk mail pickup",
                f"Sanitation District C / Recycling District {dist}",
                CARTERET_PDF,
                "2026",
            ),
        ]
    # D/7 and D/8 Friday + summer Tuesday
    for dist, rday, rpat in [
        ("7", "Wednesday", "2nd and 4th Wednesday of the month"),
        ("8", "Thursday", "2nd and 4th Thursday of the month"),
    ]:
        schedules += [
            row(
                "trash",
                "Friday",
                "every week",
                f"Sanitation District D / Recycling District {dist}. Street boundaries: Recycling District Map PDF.",
                CARTERET_PDF,
                "2026",
            ),
            row(
                "trash",
                "Tuesday",
                "every week",
                f"Sanitation District D / Recycling District {dist}; summer extra day only. {SUMMER}.",
                CARTERET_PDF,
                "2026",
                summer_range={"start": "2026-06-01", "end": "2026-08-31"},
            ),
            row(
                "recycling",
                rday,
                rpat + "; includes bulk paper/junk mail pickup",
                f"Sanitation District D / Recycling District {dist}",
                CARTERET_PDF,
                "2026",
            ),
        ]
    t["schedules"] = schedules
    t["holiday_rule"] = (
        "2026 calendar: please refer to calendar for any change of pickup during holidays. "
        "Observed on District A/1 grids: Presidents Day Mon Feb 16 -> Tue Feb 17; "
        "Memorial Day Mon May 25 -> Tue May 26; Labor Day Mon Sep 7 -> Tue Sep 8; "
        "Columbus Day Mon Oct 12 -> Tue Oct 13. MLK Day Mon Jan 19 kept on calendar (no shift marked)."
    )
    t["overrides"] = [
        {"date": "2026-02-16", "to": "2026-02-17", "reason": "Presidents Day (District A Monday sanitation shifted on calendar)"},
        {"date": "2026-05-25", "to": "2026-05-26", "reason": "Memorial Day (District A Monday sanitation shifted on calendar)"},
        {"date": "2026-09-07", "to": "2026-09-08", "reason": "Labor Day (District A Monday sanitation shifted on calendar)"},
        {"date": "2026-10-12", "to": "2026-10-13", "reason": "Columbus Day (District A Monday sanitation shifted on calendar)"},
    ]
    t["notes"] = (
        "2026 Sanitation Calendar (8 district pages). Summer extra day is June-August only "
        f"(verified on District A calendar grids; first extra Thu 2026-06-04, last Thu 2026-08-27). "
        f"District street map: {CARTERET_MAP} (graphic; numbered districts 1-8). "
        "Address spreadsheet page returned WordPress critical error during recheck. "
        "Dropoff hours from publicworks page."
    )
    t["status"] = "complete"
    if t.get("dropoff"):
        t["dropoff"][0]["accepts_text"] = None  # materials list not on publicworks page fetched
        t["dropoff"][0]["source_url"] = "https://www.carteret.net/publicworks/"


def patch_old_bridge(t: dict) -> None:
    pdf = "https://5il.co/3symt"
    page = "https://www.oldbridge.com/page/recycling-information/"
    t["schedules"] = [
        row(
            "recycling",
            "Monday",
            "every other week",
            "Ward 1; confirm ward at gis.oldbridge.com (WHAT WARD AM I IN?)",
            pdf,
            "2026",
            anchor_date="2026-01-05",
        ),
        row(
            "recycling",
            "Tuesday",
            "every other week",
            "Ward 2; confirm ward at gis.oldbridge.com",
            pdf,
            "2026",
            anchor_date="2026-01-06",
        ),
        row(
            "recycling",
            "Wednesday",
            "every other week",
            "Wards 3 and 4; confirm ward at gis.oldbridge.com",
            pdf,
            "2026",
            anchor_date="2026-01-07",
        ),
        row(
            "recycling",
            "Thursday",
            "every other week",
            "Ward 5; confirm ward at gis.oldbridge.com",
            pdf,
            "2026",
            anchor_date="2026-01-08",
        ),
        row(
            "recycling",
            "Friday",
            "every other week",
            "Ward 6; confirm ward at gis.oldbridge.com",
            pdf,
            "2026",
            anchor_date="2026-01-09",
        ),
        row(
            "recycling",
            "Monday",
            "every other week",
            "Exception: Central Park and surrounding streets (Stone Ct, Aimy Ct, Rachele Ct) collected Mondays though mapped in Ward 3",
            pdf,
            "2026",
            anchor_date="2026-01-05",
        ),
        row(
            "recycling",
            "Tuesday",
            "every other week",
            "Exception: The Arbors section, Sonoma Court, and Lakeridge West collected Tuesdays though mapped in Ward 4",
            pdf,
            "2026",
            anchor_date="2026-01-06",
        ),
    ]
    t["holiday_rule"] = (
        "If a holiday falls on your recycling day, it will be picked up that Saturday. "
        "2026 PDF moves: May 25 -> Sat May 30; Nov 26 -> Sat Nov 28; Dec 25 -> Sat Dec 26."
    )
    t["overrides"] = [
        {"date": "2026-05-25", "to": "2026-05-30", "reason": "Memorial Day recycling moved to Saturday (2026 ward PDF)"},
        {"date": "2026-11-26", "to": "2026-11-28", "reason": "Thanksgiving recycling moved to Saturday (2026 ward PDF)"},
        {"date": "2026-12-25", "to": "2026-12-26", "reason": "Christmas recycling moved to Saturday (2026 ward PDF)"},
    ]
    t["notes"] = (
        "No municipal curbside trash schedule; garbage privatized (recycling-information page). "
        f"2026 MCIA bi-weekly recycling from ward calendar PDF ({pdf}); linked from {page}. "
        "Anchor dates are first 2026 pickup per ward column; next listed date is +14 days."
    )
    t["status"] = "partial"
    if t.get("dropoff"):
        t["dropoff"][0]["accepts_text"] = (
            "Extra cardboard accepted at Recycling Center (open 3 days per week per 2026 PDF notes)"
        )


def patch_piscataway(t: dict) -> None:
    pdf = "https://cms9files.revize.com/piscatawaytownshipnj/Document_Center/Department/Public%20Works/Division%20of%20Recycling%20%26%20Solid%20Waste/Recycling%20curbside%20pick-up%20map%202026.pdf"
    t["schedules"] = [
        row(
            "recycling",
            "Monday",
            "every other week",
            "Sec 4, 5, 6, 7. MONDAYS bordered by North Randolphville Road on the north; Overbrook Avenue on the east; River Road on the south; William Street and Baekland Avenue on the west.",
            pdf,
            "2026",
            anchor_date="2026-01-05",
        ),
        row(
            "recycling",
            "Tuesday",
            "every other week",
            "Sec 1, 2, 3, 10. TUESDAYS bordered by the City of Plainfield on the north; South Avenue, Center Street, Marsh Avenue and West 4th Street on the east; North Randolphville Road and the RR tracks on the south; West 7th Street and New Brunswick Avenue on the west.",
            pdf,
            "2026",
            anchor_date="2026-01-06",
        ),
        row(
            "recycling",
            "Wednesday",
            "every other week",
            "Sec 8, 9. WEDNESDAY bordered by Stelton Road and New Durham Road on the north; Hoes Lane and Centennial Avenue on the east; River Road on the south; Brotherhood Road and Ethel Road on the west.",
            pdf,
            "2026",
            anchor_date="2026-01-07",
        ),
        row(
            "bulk",
            None,
            "by appointment January through first week of October; 2 bulk and 1 branch pickup per household per year",
            "Homeowners with Piscataway Service Card only; not for businesses or multi-family dwellings. Call DPW 732-562-2390 to schedule.",
            "https://www.piscatawaynj.org/departments/public_works/bulk_pick-up.php",
            "standing",
        ),
    ]
    t["holiday_rule"] = (
        "If collection day falls on any holidays, collection is rescheduled for the following Saturday. "
        "Memorial Day 2026 Monday-section pickup moved to May 30 (marked on 2026 map PDF)."
    )
    t["overrides"] = [
        {"date": "2026-05-25", "to": "2026-05-30", "reason": "Memorial Day Monday recycling -> Saturday May 30 (2026 map PDF)"},
    ]
    t["notes"] = (
        "No municipal household trash weekday; private haulers only (recycling_and_solid_waste.php lists Grand Sanitation, Republic, RGB, Total Trash Removal, Waste Management). "
        "2026 recycling map PDF boundaries and date columns verified; anchors are first January dates; next dates are +14 days."
    )
    t["status"] = "partial"
    t["dpw"]["hauler"] = "Private haulers (resident-chosen); see township recycling_and_solid_waste page"
    if t.get("dropoff"):
        t["dropoff"][0]["accepts_text"] = None  # leave for agent merge if found


def patch_south_plainfield(t: dict) -> None:
    curbside = "https://www.southplainfieldnj.com/spnj/Departments/Departments/Recycling/Curbside"
    t["schedules"] = [
        row(
            "recycling",
            "Thursday",
            "every other week",
            "Thursday recycling district; street assignment via Recycling Districts PDF linked from Curbside page (PDF not fully re-transcribed in this pass).",
            curbside,
            "2026",
            anchor_date="2026-01-08",
        ),
        row(
            "recycling",
            "Friday",
            "every other week",
            "Friday recycling district; street assignment via Recycling Districts PDF linked from Curbside page.",
            curbside,
            "2026",
            anchor_date="2026-01-09",
        ),
        row(
            "bulk",
            None,
            "by appointment; 2 free curbside bulk pickups per year for homeowners; call DPW 908-755-2187",
            "No bulk pickups during 8 weeks of fall leaf bag collection; max pile 3 ft W x 3 ft H x 8 ft L",
            "https://www.southplainfieldnj.com/spnj/Departments/Departments/Public%20Works%20Department/Bulk%20Waste/",
            "standing",
        ),
        row(
            "yard",
            None,
            "mid-October through mid-December curbside leaf bag collection",
            "Leaves in biodegradable paper bags at curb; brush/leaves/grass also accepted at yard waste site with decal",
            curbside,
            "standing",
        ),
        row(
            "other",
            None,
            "2026 compactor open dates",
            "Apr 4, Apr 18, May 9, Jun 6, Jun 20, Aug 29, Oct 3, Nov 7 (7:00 a.m.-3:00 p.m.; bulky waste only). Kenneth Avenue; 2 free visits per year with coupon; closed Jan-Mar, Jul, Sep, Dec",
            "https://www.southplainfieldnj.com/spnj/Departments/Departments/Public%20Works%20Department/Compactor%20Hours/",
            "2026",
        ),
    ]
    t["holiday_rule"] = (
        "No collection Thanksgiving Day; Thursday makeup 2026-11-28. "
        "No collection Christmas Day; Friday makeup 2026-12-26. "
        "Storm cancel -> following Saturday (Curbside page)."
    )
    t["overrides"] = [
        {"date": "2026-11-26", "to": "2026-11-28", "reason": "Thanksgiving; Thursday district makeup per Curbside 2026 table"},
        {"date": "2026-12-25", "to": "2026-12-26", "reason": "Christmas; Friday district makeup per Curbside 2026 table"},
    ]
    t["notes"] = (
        "No municipal curbside household garbage day on official site. "
        "2026 curbside recycling table on Curbside page; anchors Jan 8 (Thu) and Jan 9 (Fri); next dates +14 days."
    )
    t["status"] = "partial"
    if t.get("dropoff"):
        for d in t["dropoff"]:
            if "Mazepa" in (d.get("name") or "") or "Kenneth" in (d.get("address") or ""):
                d["accepts_text"] = (
                    "Curbside recyclables separated at drop-off: Bottles and Cans; Corrugated Cardboard; "
                    "Mixed Office Paper / Newspaper. Residents only (not businesses) also: used clothes, "
                    "used motor oil (up to 5 gallons), used cooking oil, household rechargeable batteries, "
                    "cell phones, left-over paint (3rd Saturday monthly), appliances, computers, monitors, "
                    "printers/fax machines, TVs, scrap metal. Not accepted: propane tanks, non-recyclables, HHW."
                )
                d["residents_only"] = False  # open to residents and businesses for basic recyclables
                d["hours"] = "Tue 11:00 a.m.-7:00 p.m.; Thu/Fri/Sat 8:00 a.m.-4:00 p.m.; closed Borough holidays"


def patch_aberdeen(t: dict) -> None:
    trash_page = "https://www.aberdeennj.org/271/Trash-Recycling"
    storm = "https://www.aberdeennj.org/437/Winter-Storm-Information-Center"
    # First days from official Winter Storm Information Center Feb 2026 notices:
    # Mon 2026-02-23 cancelled with double collection Thu 2/26 (Section I second day);
    # Tue 2026-02-24 cancelled with collection on regular second day Thu/Fri (Section II).
    t["schedules"] = [
        row(
            "trash",
            "Monday",
            "every week",
            "Section I first collection day (Cliffwood Beach, Cliffwood, River Gardens, Oakshades, Freneau, Heritage Estates). First weekday derived from official Winter Storm Information Center 2026 notices naming Monday as a cancelled first pickup with Thursday makeup; second day Thursday stated on Trash/Recycling.",
            storm,
            "2026",
        ),
        row(
            "trash",
            "Thursday",
            "every week",
            "Section I second collection day / bulk day (Trash/Recycling page).",
            trash_page,
            "standing",
        ),
        row(
            "trash",
            "Tuesday",
            "every week",
            "Section II first collection day (Strathmore, High School Area, Woodbrook Drive, Randall Way, Storyland, Santa Fe, Heather Glenn). First weekday from Winter Storm Information Center notice cancelling Tuesday 2026-02-24 first pickup.",
            storm,
            "2026",
        ),
        row(
            "trash",
            "Friday",
            "every week",
            "Section II second collection day / bulk day (Trash/Recycling page).",
            trash_page,
            "standing",
        ),
        row(
            "bulk",
            "Thursday",
            "every week",
            "Section I; limit two items per pick-up; effective January 1, 2018 (still on current Trash/Recycling page).",
            trash_page,
            "standing",
        ),
        row(
            "bulk",
            "Friday",
            "every week",
            "Section II; limit two items per pick-up; effective January 1, 2018 (still on current Trash/Recycling page).",
            trash_page,
            "standing",
        ),
    ]
    t["holiday_rule"] = (
        "When recycling or garbage day falls on New Year's Day, Thanksgiving, or Christmas Day, "
        "pick-up on the next scheduled pick-up day (Trash/Recycling)."
    )
    t["overrides"] = []
    t["notes"] = (
        "Curbside recycling weekdays not published as standing plain text on Trash/Recycling (Recycle Coach linked; not used for weekdays). "
        "Condo/apartment complexes excluded from township contracted hauler. "
        "First trash weekdays are supported by 2026 DPW storm notices on the township site, not a permanent schedule page; flagged in notes."
    )
    t["status"] = "partial"
    if t.get("dropoff"):
        t["dropoff"][0]["accepts_text"] = (
            "All cans, bottles, jars, cardboard, newspapers, office paper and mixed paper; "
            "electronics (TVs, computers, laptops, power tools, microwaves, stereos, sound systems, fans, camcorders, vacuums); "
            "brush, metal, concrete and asphalt; refrigerators, air conditioners, stoves, washers and dryers, water heaters. "
            "Aberdeen residents only; IDs checked."
        )
        t["dropoff"][0]["residents_only"] = True


def patch_fair_haven(t: dict) -> None:
    sched = "https://www.fairhavennj.org/public-works/pages/garbage-and-recycling-schedule"
    cal = "https://www.fairhavennj.org/sites/g/files/vyhlif4411/f/uploads/2026_municipal_calendar_final-edit_9-14-2026.pdf"
    recycl = "https://www.fairhavennj.org/recycling"
    t["schedules"] = [
        row(
            "trash",
            "Tuesday",
            "every week",
            "All zones year-round; borough-issued dark gray can; curbside by 6:00 a.m. (night before preferred). Sep 16-May 14 is Tuesday-only season; May 15-Sep 15 also has Friday.",
            sched,
            "standing",
        ),
        row(
            "trash",
            "Friday",
            "every week",
            "All zones; warm-weather second collection only. Exact season: May 15 through September 15.",
            sched,
            "standing",
            summer_range={"start": "05-15", "end": "09-15"},
        ),
        row(
            "recycling",
            "Wednesday",
            "every other week",
            "All four collection zones; single-stream in borough blue 95-gallon can; place curbside Tuesday evening",
            cal,
            "2026",
            anchor_date="2026-01-07",
        ),
        row(
            "bulk",
            "Monday",
            "2026 second Monday: Mar 9, Jun 8, Sep 14, Nov 9",
            "Curbside bulk; Suburban Disposal pickup per Public Works page",
            cal,
            "2026",
        ),
        row(
            "yard",
            "Tuesday",
            "May-September brush only: Zones 1 and 2 on 2nd and 4th Tuesday; Zones 3 and 4 on 1st and 3rd Tuesday (32-gallon gray/neutral can)",
            "Spring/fall brush-and-leaf cleanups by zone per 2026 municipal calendar",
            cal,
            "2026",
        ),
    ]
    t["holiday_rule"] = (
        "Refer to Municipal Calendar for holiday schedule changes. "
        "There is no less than seven days between collection days (garbage schedule page)."
    )
    t["overrides"] = []
    t["notes"] = (
        "Trash encoded as Tuesday weekly year-round plus Friday only May 15-Sep 15 (exact range from garbage schedule page). "
        "Recycling every other Wednesday; 2026 municipal calendar shows Jan 7 and Jan 21 (+14 days)."
    )
    t["status"] = "complete"
    if t.get("dropoff"):
        t["dropoff"][0]["accepts_text"] = (
            "Cardboard and other recyclables accepted at Public Works facility (recycling page). "
            "E-waste via third-party Monmouth Wire link; clothing via Helpsy bin (not municipal materials list)."
        )
        t["dropoff"][0]["hours"] = "Monday-Friday 7:00 a.m.-3:30 p.m.; Saturday 9:00 a.m.-3:00 p.m."


def patch_bradley_beach(t: dict) -> None:
    pdf = "https://www.bradleybeachnj.gov/wp-content/uploads/2026/01/2026-SANITATION-CALENDAR-2.pdf"
    page = "https://www.bradleybeachnj.gov/trash-recycling-information/"
    # Clean non-overlapping zones from calendar: Mon Z1&Z3, Tue Z2, Thu Z1, Fri Z2&Z3
    t["schedules"] = [
        row(
            "trash",
            "Monday",
            "every week",
            "Zone 1",
            pdf,
            "2026",
        ),
        row(
            "trash",
            "Thursday",
            "every week",
            "Zone 1",
            pdf,
            "2026",
        ),
        row(
            "trash",
            "Tuesday",
            "every week",
            "Zone 2",
            pdf,
            "2026",
        ),
        row(
            "trash",
            "Friday",
            "every week",
            "Zone 2",
            pdf,
            "2026",
        ),
        row(
            "trash",
            "Monday",
            "every week",
            "Zone 3",
            pdf,
            "2026",
        ),
        row(
            "trash",
            "Friday",
            "every week",
            "Zone 3",
            pdf,
            "2026",
        ),
        row(
            "recycling",
            "Wednesday",
            "every week",
            "All zones",
            pdf,
            "2026",
        ),
        row(
            "bulk",
            "Thursday",
            "second Thursday monthly alternating zones",
            "2026: Jan 8, Mar 12, May 14, Jul 9, Sep 10, Nov 12 = Zone 1 and north side of Zone 3; "
            "Feb 12, Apr 9, Jun 11, Aug 13, Oct 8, Dec 10 = Zone 2 and south side of Zone 3; "
            "bulk stickers required; max 5 items",
            page,
            "2026",
        ),
        row(
            "yard",
            None,
            "2026 designated brush/yard dates",
            "Mar 9, Apr 13, Apr 27, May 11, Jun 8, Sep 14, Oct 13 (Tuesday after Columbus Day), Nov 9, Dec 14; "
            "collection may continue several days after each date. Brush/yard waste at curb by 5:00 a.m.; grass not collected.",
            page,
            "2026",
        ),
        row(
            "yard",
            None,
            "seasonal leaf collection",
            "Loose or biodegradable bags Apr 1-May 31 and Sep 15-Dec 1 (possible extension per borough website); not within 10 feet of drain inlets",
            page,
            "standing",
        ),
        row(
            "other",
            None,
            "by appointment",
            "Computer/electronic/metal curbside by appointment; minimum 4 bulk stickers per item. Call Borough Hall 732-776-2999 ext. 1010.",
            page,
            "standing",
        ),
    ]
    t["holiday_rule"] = (
        "2026 calendar: Jan 1 New Year's Day - no Zone 1 Thursday garbage; Boro and Recycle Yard closed. "
        "MLK Day Jan 19 listed with Zone 1 and Zone 3 garbage still marked; Boro/Recycle Yard closed."
    )
    t["overrides"] = [
        {"date": "2026-01-01", "to": None, "reason": "New Year's Day; no Zone 1 garbage on calendar"},
    ]
    t["notes"] = (
        "Trash zones de-overlapped: Zone 1 Mon+Thu; Zone 2 Tue+Fri; Zone 3 Mon+Fri "
        "(derived from calendar labels Zone 1 and Zone 3 / Zone 2 / Zone 1 / Zone 2 and Zone 3). "
        "Street-level zone boundaries not published on borough site reviewed; status remains partial for map."
    )
    t["status"] = "partial"


def patch_union_beach(t: dict) -> None:
    pdf = "https://www.unionbeachnj.gov/ubnj/News%20%26%20Announcements/2026%20Trash%20and%20Recycling%20Collection%20Calendar.pdf"
    pw = "https://www.unionbeachnj.gov/ubnj/Departments/Public%20Works/"
    sec_a_streets = (
        "2nd, 3rd, 4th, 5th, 6th, 7th, 8th, 9th, 10th, Ash, Aspen, Bay, Bayview (#100-499), Beach, Broadway, "
        "Campbell, Center, Central (#100-499), Chingarora, Dock, Edmunds, Ellison, Florence (#100-1400), Floyd, "
        "Front, Gateway, Herbert, Henry, Johnson (#1-99), Kathleen, Locust, Lorillard (#100-499), Maple, Oak, Pine, "
        "Park (#100-499), Poole (#100-599), Prospect (#100-499), Raritan, State, St. James, St. Johns, Spruce (#400-799), "
        "Victoria, Vista Shores, West"
    )
    sec_b_streets = (
        "Anderson, Arlington, Asbury, Aumack, Bank, Bayview (#600-999), Beachview, Branch, Brook, Cambridge, "
        "Central (#500-999), Chomic, Clark, Columbia, Dibling, Donnelly, Fr. Fitzpatrick, Florence (#1500-1799), "
        "Harris, Harrison, Haug, Heckelmann, High, Isabelle, Jersey, Johnson (#300-499), Lorillard (#500-999), "
        "Morningside, Newark, Ocean, Orange, Park (#500-999), Patterson, Poole (#600-699), Private, Prospect (#500-899), "
        "Rose, Route 36, Seagate, Seaview, Scholer, Shore, Spruce (#900-1000), Stone, Sullivan, Sydney, Union, "
        "Washington, Wesley, Willow, Wilson"
    )
    # Corrected from 2026 calendar image: Section A recycling starts Jan 14; Section B Jan 7
    t["schedules"] = [
        row(
            "trash",
            "Tuesday",
            "every week",
            f"Section A: {sec_a_streets}. Up to 3 cans/bags, max 50 lb each. No pickup Friday Dec 25, 2026.",
            pdf,
            "2026",
        ),
        row(
            "trash",
            "Friday",
            "every week",
            f"Section A: {sec_a_streets}. Up to 3 cans/bags, max 50 lb each. No pickup Friday Dec 25, 2026.",
            pdf,
            "2026",
        ),
        row(
            "trash",
            "Monday",
            "every week",
            f"Section B: {sec_b_streets}. Up to 3 cans/bags, max 50 lb each. No pickup Thu Jan 1 or Thu Nov 26, 2026.",
            pdf,
            "2026",
        ),
        row(
            "trash",
            "Thursday",
            "every week",
            f"Section B: {sec_b_streets}. Up to 3 cans/bags, max 50 lb each. No pickup Thu Jan 1 or Thu Nov 26, 2026.",
            pdf,
            "2026",
        ),
        row(
            "recycling",
            "Wednesday",
            "every other week",
            "Section A; cans/bottles, bundled cardboard and newspaper; no plastic bags",
            pdf,
            "2026",
            anchor_date="2026-01-14",
        ),
        row(
            "recycling",
            "Wednesday",
            "every other week",
            "Section B; cans/bottles, bundled cardboard and newspaper; no plastic bags",
            pdf,
            "2026",
            anchor_date="2026-01-07",
        ),
        row(
            "bulk",
            "Wednesday",
            "every other week",
            "Section A bulk (furniture, mattresses, couches, other plastics); limit 3 items. 2026 dates start Jan 7.",
            pdf,
            "2026",
            anchor_date="2026-01-07",
        ),
        row(
            "bulk",
            "Wednesday",
            "every other week",
            "Section B bulk (furniture, mattresses, couches, other plastics); limit 3 items. 2026 dates start Jan 14.",
            pdf,
            "2026",
            anchor_date="2026-01-14",
        ),
        row(
            "yard",
            None,
            "Fall curbside leaf collection (paper bags only)",
            "Section A on Wednesdays; Section B on Tuesdays per 2026 calendar. Branches/brush with regular garbage when properly bundled (FAQ).",
            pdf,
            "2026",
        ),
        row(
            "other",
            None,
            "by appointment",
            "Appliances, electronics, and metals curbside by appointment (732-264-1133); refrigerator doors must be removed",
            pw,
            "standing",
        ),
    ]
    t["holiday_rule"] = (
        "Section A: no trash Friday Dec 25, 2026. Section B: no trash Thu Jan 1 or Thu Nov 26, 2026."
    )
    t["overrides"] = [
        {"date": "2026-01-01", "to": None, "reason": "Section B no trash (calendar)"},
        {"date": "2026-11-26", "to": None, "reason": "Section B no trash Thanksgiving (calendar)"},
        {"date": "2026-12-25", "to": None, "reason": "Section A no trash Christmas (calendar)"},
    ]
    t["notes"] = (
        "Trash zones are exclusive Section A vs Section B street lists from 2026 calendar (address ranges on shared street names). "
        "CORRECTED vs prior research: Section A recycling anchor 2026-01-14; Section B recycling anchor 2026-01-07 "
        "(verified on calendar image). Bulk weeks are the opposite of each section's recycling weeks."
    )
    t["status"] = "complete"
    if t.get("dropoff"):
        t["dropoff"][0]["accepts_text"] = (
            "Recycling center drop-off hours published on Public Works page; materials detail not fully listed on calendar page."
        )


def patch_loch_arbour(t: dict) -> None:
    page = "https://www.locharbournj.us/trash-recycling"
    t["schedules"] = [
        row("bulk", "Monday", "2026-01-26", None, page, "2026"),
        row("bulk", "Monday", "2026-03-09", None, page, "2026"),
        row("bulk", "Monday", "2026-05-11", None, page, "2026"),
        row("bulk", "Monday", "2026-07-13", None, page, "2026"),
        row("bulk", "Monday", "2026-09-14", None, page, "2026"),
        row("bulk", "Monday", "2026-11-16", None, page, "2026"),
    ]
    t["holiday_rule"] = None
    t["overrides"] = []
    t["notes"] = (
        "Weekly curbside trash and recycling weekdays are NOT published on locharbournj.us. "
        "Deal refuse page returned HTTP 500; do not infer Deal weekdays. Sanitation contact Deal 732-531-1454 on village contacts."
    )
    t["status"] = "partial"


def patch_middletown(t: dict) -> None:
    # Keep bulk/yard/holiday; no invented trash/recycling weekdays
    t["holiday_rule"] = (
        "Garbage: no collection New Year's Day, Thanksgiving Day, Christmas Day; collected on next scheduled garbage day. "
        "Recycling: no collection on those three holidays; collected the following Saturday if scheduled on those dates."
    )
    t["overrides"] = []
    t["notes"] = (
        "Curbside garbage and recycling pages do not publish weekday or zone days in plain text; "
        "they direct residents to Recycle Coach address lookup. 2017 CivicAlerts weekdays excluded. "
        "Fall 2026 leaf schedule not yet posted."
    )
    t["status"] = "partial"


def patch_hazlet(t: dict) -> None:
    booklet = "https://www.hazlettwp.org/DocumentCenter/View/10520/Green-Booklet-2026-PDF"
    # Zone recycling dates from Green Booklet 2026 (local PDF extract). Zone 1 first dates Jan 6 and 20 (+14).
    # Weekday: Jan 6 2026 = Tuesday.
    zone_anchors = {
        1: ("Tuesday", "2026-01-06"),
        2: ("Tuesday", "2026-01-13"),
        3: ("Wednesday", "2026-01-07"),
        4: ("Wednesday", "2026-01-14"),
        5: ("Thursday", "2026-01-08"),
        6: ("Thursday", "2026-01-15"),
        7: ("Friday", "2026-01-02"),
        8: ("Friday", "2026-01-09"),
    }
    schedules = []
    for z, (wd, anchor) in zone_anchors.items():
        schedules.append(
            row(
                "recycling",
                wd,
                "every other week",
                f"Zone {z}; locate street in Green Booklet 2026 alphabetical list. Follow zone printed recycling dates for 2026.",
                booklet,
                "2026",
                anchor_date=anchor,
            )
        )
    schedules += [
        row(
            "bulk",
            "Tuesday",
            "by appointment; Zones 1-4; two free curbside bulk pickups per year; program pauses mid-November through early spring; first 2026 day Tue Mar 3",
            "Condominium/Townhouses and Trailer Parks not included per Bulk Item Pickup 2026 page",
            "https://www.hazlettwp.org/695/Bulk-Item-Pickup-in-2026",
            "2026",
        ),
        row(
            "bulk",
            "Thursday",
            "by appointment; Zones 5-8; two free curbside bulk pickups per year; first 2026 day Thu Mar 5",
            "Condominium/Townhouses and Trailer Parks not included",
            "https://www.hazlettwp.org/695/Bulk-Item-Pickup-in-2026",
            "2026",
        ),
        row(
            "yard",
            None,
            "custom; six curbside brush/leaf collections per year per zone on Green Booklet 2026 dates",
            "Place out no earlier than seven days before scheduled date; brush max 4 ft length and 4 in diameter; leaves in brown paper biodegradable bags",
            "https://www.hazlettwp.org/235/What-Is-Recyclable",
            "2026",
        ),
        row(
            "other",
            None,
            "custom; white metal four curbside collections per year per zone on Green Booklet 2026 dates, or drop off at recycling yard",
            "Curbside by 7:00 a.m. on scheduled day",
            "https://www.hazlettwp.org/610/White-Metal-Collection",
            "2026",
        ),
    ]
    t["schedules"] = schedules
    t["holiday_rule"] = (
        "Green Booklet lists recycling holiday moves (e.g. June 19 zone 8 -> June 22; July 3 zone 8 -> July 6; "
        "Nov 3 zone 2 -> Nov 2; Nov 11 zone 3 -> Nov 9; and other listed shifts). Recycling yard closed on listed holidays."
    )
    t["overrides"] = []
    t["notes"] = (
        "No municipal curbside trash weekday in Green Booklet note (private haulers). "
        "Recycling zone weekday inferred from first 2026 date in booklet for each zone; street list in booklet center sheet."
    )
    t["status"] = "partial"


def apply_zip_shared(data: dict) -> None:
    shared = {
        "07711": ["Allenhurst", "Loch Arbour"],
        "07735": ["Aberdeen", "Keyport", "Union Beach"],
        "07734": ["Hazlet", "Keansburg"],
        "07732": ["Highlands", "Keyport"],
        "07747": ["Aberdeen", "Matawan"],
        "07753": ["Neptune City", "Neptune Township"],
        "07760": ["Rumson", "Sea Bright"],
        "07701": ["Red Bank", "Middletown Township", "Shrewsbury Borough", "Fair Haven Borough"],
    }
    name_of = {slug: v.get("name") for slug, v in data.items()}
    for slug, town in data.items():
        for z in town.get("zips") or []:
            zipc = z.get("zip")
            if zipc in shared:
                others = [n for n in shared[zipc] if n != town.get("name")]
                z["shared_with"] = others


def add_anchor_known(data: dict) -> None:
    """Attach anchor_date to known every-other-week rows already having date lists in area_note/week_pattern."""
    known = {
        ("south-amboy", "recycling"): "2026-01-02",
        ("keyport", "recycling", "Zones 1"): "2026-01-07",
        ("keyport", "recycling", "Zones 3"): "2026-01-14",
        ("little-silver", "recycling", "Zone 1"): "2026-01-07",
        ("little-silver", "recycling", "Zone 2"): "2026-01-14",
        ("neptune-city", "recycling", "Zone 1"): "2026-01-14",
        ("neptune-city", "recycling", "Zone 2"): "2026-01-07",
    }
    for slug, town in data.items():
        for s in town.get("schedules") or []:
            if s.get("anchor_date"):
                continue
            note = (s.get("area_note") or "") + " " + (s.get("week_pattern") or "")
            if slug == "south-amboy" and s.get("stream") == "recycling":
                s["anchor_date"] = "2026-01-02"
                s["week_pattern"] = "every other week"
                s["weekday"] = "Friday"
            elif slug == "keyport" and s.get("stream") == "recycling":
                if "Zones 1" in note or "Zone 1" in note:
                    s["anchor_date"] = "2026-01-07"
                    s["week_pattern"] = "every other week"
                elif "Zones 3" in note or "Zone 3" in note:
                    s["anchor_date"] = "2026-01-14"
                    s["week_pattern"] = "every other week"
            elif slug == "little-silver" and s.get("stream") == "recycling":
                if "Zone 1" in note:
                    s["anchor_date"] = "2026-01-07"
                    s["week_pattern"] = "every other week"
                elif "Zone 2" in note:
                    s["anchor_date"] = "2026-01-14"
                    s["week_pattern"] = "every other week"
            elif slug == "neptune-city" and s.get("stream") == "recycling":
                if "Zone 1" in note or "East of Union" in note:
                    s["anchor_date"] = "2026-01-14"
                    s["week_pattern"] = "every other week"
                elif "Zone 2" in note or "West of Union" in note:
                    s["anchor_date"] = "2026-01-07"
                    s["week_pattern"] = "every other week"


def merge_agent_fragments(data: dict) -> list[str]:
    changed = []
    for name in [
        "recheck_nine.json",
        "recheck_anchors_holidays.json",
        "recheck_bradley_union.json",
    ]:
        frag = load_json(os.path.join(FRAG, name))
        if not frag:
            continue
        # Soft merge: only fill missing holiday_rule / accepts_text / zips if agent provided
        for slug, entry in frag.items():
            if slug not in data or not isinstance(entry, dict):
                continue
            if entry.get("schedules") and entry.get("replace_schedules"):
                data[slug]["schedules"] = entry["schedules"]
                changed.append(f"{slug}:schedules:{name}")
            for field in ("holiday_rule", "overrides", "notes", "status"):
                if entry.get(field) is not None and field not in ("notes",):
                    if not data[slug].get(field):
                        data[slug][field] = entry[field]
                        changed.append(f"{slug}:{field}:{name}")
            if entry.get("dropoff_accepts"):
                for i, txt in entry["dropoff_accepts"].items():
                    try:
                        data[slug]["dropoff"][int(i)]["accepts_text"] = txt
                    except Exception:
                        pass
    return changed


def main() -> None:
    data = json.load(open(SRC, encoding="utf-8-sig"))
    changed_towns = set()

    patchers = {
        "carteret": patch_carteret,
        "old-bridge": patch_old_bridge,
        "piscataway": patch_piscataway,
        "south-plainfield": patch_south_plainfield,
        "aberdeen": patch_aberdeen,
        "fair-haven": patch_fair_haven,
        "bradley-beach": patch_bradley_beach,
        "union-beach": patch_union_beach,
        "loch-arbour": patch_loch_arbour,
        "middletown": patch_middletown,
        "hazlet": patch_hazlet,
    }
    for slug, fn in patchers.items():
        fn(data[slug])
        changed_towns.add(slug)

    add_anchor_known(data)
    for slug in ("south-amboy", "keyport", "little-silver", "neptune-city"):
        changed_towns.add(slug)

    apply_zip_shared(data)
    for slug, town in data.items():
        for z in town.get("zips") or []:
            if z.get("shared_with"):
                changed_towns.add(slug)

    # Standing source_date for undated weekly rows that are permanent rules
    for slug, town in data.items():
        for s in town.get("schedules") or []:
            if s.get("source_date") == "undated":
                # Do not invent year; mark standing when weekday is a named weekly day
                wp = (s.get("week_pattern") or "").lower()
                if "every week" in wp or wp == "weekly":
                    s["source_date"] = "standing"
                    changed_towns.add(slug)

    agent_changes = merge_agent_fragments(data)

    # Ensure holiday_rule key exists on all
    for town in data.values():
        town.setdefault("holiday_rule", None)
        town.setdefault("overrides", [])

    json.dump(data, open(DST, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    open(DST, "a", encoding="utf-8").write("\n")

    # Final table
    print("WROTE", DST)
    print("CHANGED_TOWNS", sorted(changed_towns))
    print("AGENT_MERGES", agent_changes)
    print()
    print("town|trash|recycling|zones|anchors|unresolved|reason")
    for slug, town in data.items():
        sched = town.get("schedules") or []
        trash_rows = [s for s in sched if s.get("stream") == "trash" and s.get("weekday")]
        rec_rows = [s for s in sched if s.get("stream") == "recycling" and (s.get("weekday") or s.get("anchor_date"))]
        trash_y = "y" if trash_rows else "n"
        rec_y = "y" if rec_rows else "n"
        # zone count: unique area_note prefixes for trash+recycling
        zones = set()
        for s in trash_rows + rec_rows:
            note = (s.get("area_note") or "").split(";")[0].strip()
            if note:
                zones.add(note[:60])
        anchors = sum(1 for s in sched if s.get("anchor_date"))
        unresolved = []
        if slug in (
            "old-bridge",
            "piscataway",
            "south-plainfield",
            "hazlet",
            "middletown",
            "loch-arbour",
        ) and not trash_rows:
            unresolved.append("no municipal trash weekdays published")
        if slug == "loch-arbour":
            unresolved.append("no weekly trash/recycling on village site")
        if slug == "middletown":
            unresolved.append("Recycle Coach only; no plain-text days")
        if slug == "carteret" and "graphic" in (town.get("notes") or ""):
            unresolved.append("district street boundaries graphic map only")
        if slug == "bradley-beach":
            unresolved.append("zone street boundaries not published")
        if slug == "aberdeen" and "storm notices" in (town.get("notes") or ""):
            unresolved.append("first trash day from 2026 storm notices not standing schedule page")
        reason = "; ".join(unresolved) if unresolved else ""
        print(
            f"{slug}|{trash_y}|{rec_y}|{len(zones)}|{anchors}|{len(unresolved)}|{reason}"
        )


if __name__ == "__main__":
    main()
