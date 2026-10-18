"""Build towns_research_v4.json from v3: P1 trash gaps, P2 holds, overrides, quality fixes."""
from __future__ import annotations

import copy
import datetime as dt
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
V3 = ROOT / "towns_research_v3.json"
V4 = ROOT / "towns_research_v4.json"

# Python date.weekday(): Monday=0 .. Sunday=6
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def weekday_name(d: dt.date) -> str:
    return DAYS[d.weekday()]


def row(stream, weekday, week_pattern, area_note, source_url, source_date, **extra):
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


def iso_date_rows(stream, dates, label, source_url, source_date="2026"):
    rows = []
    for d in dates:
        if isinstance(d, str):
            d = dt.date.fromisoformat(d)
        rows.append(
            row(stream, weekday_name(d), d.isoformat(), label, source_url, source_date)
        )
    return rows


def mondays_tue_wed(start: dt.date, end: dt.date, weekday: int) -> list[str]:
    """weekday Mon=0..Sun=6."""
    d = start
    while d.weekday() != weekday:
        d += dt.timedelta(days=1)
    out = []
    while d <= end:
        out.append(d.isoformat())
        d += dt.timedelta(days=7)
    return out


def info_trash(note: str, url: str) -> dict:
    return row("trash", None, "custom", note, url, "standing")


def fix_old_bridge(town: dict) -> None:
    url = "https://www.oldbridge.com/page/recycling-information/"
    # Remove existing trash custom if any; add informational
    town["schedules"] = [s for s in town["schedules"] if s.get("stream") != "trash"]
    town["schedules"].insert(
        0,
        info_trash(
            "Garbage is privatized in Old Bridge. Residents can hire the garbage company of their choice.",
            url,
        ),
    )
    # Ward-specific holiday overrides only (from 2026 ward PDF columns)
    town["overrides"] = [
        {
            "date": "2026-05-25",
            "to": "2026-05-30",
            "reason": "Ward 1: Memorial Day recycling moved to Saturday May 30 (2026 ward PDF Monday column May 11, 30*)",
        },
        {
            "date": "2026-05-25",
            "to": "2026-05-30",
            "reason": "Exception: Central Park and surrounding streets (Stone Ct, Aimy Ct, Rachele Ct): Memorial Day recycling moved to Saturday May 30 (Monday pickup)",
        },
        {
            "date": "2026-11-26",
            "to": "2026-11-28",
            "reason": "Ward 5: Thanksgiving recycling moved to Saturday Nov 28 (2026 ward PDF Thursday column Nov 12, 28*)",
        },
        {
            "date": "2026-12-25",
            "to": "2026-12-26",
            "reason": "Ward 6: Christmas recycling moved to Saturday Dec 26 (2026 ward PDF Friday column Dec 11, 26*)",
        },
    ]
    town["notes"] = (
        "Municipal curbside trash not provided; garbage privatized per recycling-information page. "
        "2026 MCIA bi-weekly recycling from ward calendar PDF. Holiday overrides limited to wards "
        "whose regular weekday matches the holiday (Mon Memorial Day, Thu Thanksgiving, Fri Christmas)."
    )
    town["dpw"]["hauler"] = (
        "Curbside recycling: Middlesex County Improvement Authority (MCIA); "
        "household garbage: private company chosen by resident"
    )


def fix_piscataway(town: dict) -> None:
    url = "https://www.piscatawaynj.org/departments/public_works/recycling_and_solid_waste.php"
    town["schedules"] = [s for s in town["schedules"] if s.get("stream") != "trash"]
    town["schedules"].insert(
        0,
        info_trash(
            "Household trash is picked up through private trash haulers which residents must retain. "
            "Companies that service Piscataway: Grand Sanitation (908) 222-1566; Republic Residential "
            "Services (908) 561-8380; Republic Commercial and Industrial Services (732) 545-8988; "
            "RGB Disposal (732) 968-1131; Total Trash Removal (908) 756-3867; Waste Management (908) 879-5616. "
            "Township does not regulate or endorse these companies.",
            url,
        ),
    )
    # Clean bulk appointment note
    for s in town["schedules"]:
        if s.get("stream") == "bulk":
            s["weekday"] = None
            s["week_pattern"] = "by appointment"
            s["area_note"] = (
                "By appointment January through first week of October; 2 bulk and 1 branch pickup "
                "per household per year for homeowners with Piscataway Service Card; call DPW "
                "732-562-2390 to schedule; not for businesses or multi-family dwellings."
            )
            s["source_date"] = "standing"
    town["notes"] = (
        "No municipal household trash weekday; private haulers listed on recycling_and_solid_waste.php. "
        "2026 recycling map PDF sections and biweekly anchors verified."
    )


def fix_south_plainfield(town: dict) -> None:
    url = "https://www.southplainfieldnj.com/spnj/Departments/Departments/Recycling/Curbside"
    town["schedules"] = [s for s in town["schedules"] if s.get("stream") != "trash"]
    town["schedules"].insert(
        0,
        info_trash(
            "Borough official Curbside page publishes recycling collection only (every other week by "
            "Thursday or Friday recycling district); no municipal household garbage weekday schedule "
            "is published. Recycling Coordinator 908-755-2187. For bulk, call DPW 908-755-2187.",
            url,
        ),
    )
    for s in town["schedules"]:
        if s.get("stream") == "bulk":
            s["weekday"] = None
            s["week_pattern"] = "by appointment"
            s["area_note"] = (
                "By appointment; 2 free curbside bulk pickups per year for homeowners; call DPW "
                "908-755-2187; no bulk during 8 weeks of fall leaf bag collection; max pile "
                "3 ft W x 3 ft H x 8 ft L; apartments and condo/townhouse complexes not included."
            )
            s["source_date"] = "standing"
        if s.get("stream") == "yard" and s.get("week_pattern") == "seasonal":
            s["area_note"] = (
                "Mid-October through mid-December curbside leaf bag collection; leaves in biodegradable "
                "paper bags; brush/leaves/grass also accepted at yard waste site with decal; call "
                "DPW 908-755-2187."
            )
    # Overrides: match area_note district wording
    town["overrides"] = [
        {
            "date": "2026-11-26",
            "to": "2026-11-28",
            "reason": "Thursday recycling district: Thanksgiving makeup 2026-11-28 (Curbside 2026 table)",
        },
        {
            "date": "2026-12-25",
            "to": "2026-12-26",
            "reason": "Friday recycling district: Christmas makeup 2026-12-26 (Curbside 2026 table)",
        },
    ]
    town["notes"] = (
        "No municipal household garbage weekday on official site; Curbside 2026 table is recycling only. "
        "Recycling Thu/Fri districts with anchors Jan 8 and Jan 9."
    )


def fix_hazlet(town: dict) -> None:
    booklet = "https://www.hazlettwp.org/DocumentCenter/View/10520/Green-Booklet-2026-PDF"
    bulk_page = "https://www.hazlettwp.org/665/Bulk-Item-Collection"
    town["schedules"] = [
        s
        for s in town["schedules"]
        if not (
            s.get("stream") == "trash"
            or (s.get("stream") == "yard" and s.get("week_pattern") == "seasonal")
            or (s.get("stream") == "other" and s.get("week_pattern") == "custom")
        )
    ]
    town["schedules"].insert(
        0,
        info_trash(
            "Township residents arrange household garbage with private trash companies; the township "
            "does not publish municipal curbside garbage weekdays. A 2021 municipal waste survey and "
            "2022 bulk announcement describe privately contracted trash service (Bulk Item Collection page).",
            bulk_page,
        ),
    )
    # Brush/leaf ISO from Green Booklet schedule pages (hazlet_p8, p9, p12, p13)
    brush = {
        1: ["2026-01-13", "2026-03-10", "2026-05-05", "2026-07-14", "2026-09-01", "2026-10-20", "2026-12-01"],
        2: ["2026-01-20", "2026-03-17", "2026-05-12", "2026-07-07", "2026-09-08", "2026-10-27", "2026-12-08"],
        3: ["2026-01-14", "2026-03-11", "2026-05-06", "2026-07-15", "2026-09-02", "2026-10-21", "2026-12-02"],
        4: ["2026-01-21", "2026-03-18", "2026-05-13", "2026-07-08", "2026-09-09", "2026-10-28", "2026-12-09"],
        5: ["2026-01-15", "2026-03-12", "2026-05-07", "2026-07-16", "2026-09-03", "2026-10-22", "2026-12-03"],
        6: ["2026-01-22", "2026-03-19", "2026-05-14", "2026-07-09", "2026-09-10", "2026-10-29", "2026-12-10"],
        7: ["2026-01-16", "2026-03-13", "2026-05-08", "2026-07-17", "2026-09-04", "2026-10-23", "2026-12-04"],
        8: ["2026-01-23", "2026-03-20", "2026-05-15", "2026-07-10", "2026-09-11", "2026-10-30", "2026-12-11"],
    }
    metal = {
        (1, 2): ["2026-01-05", "2026-04-06", "2026-08-17", "2026-12-14"],
        (3, 4): ["2026-01-06", "2026-04-07", "2026-08-18", "2026-12-15"],
        (5, 6): ["2026-01-07", "2026-04-08", "2026-08-19", "2026-12-16"],
        (7, 8): ["2026-01-08", "2026-04-09", "2026-08-20", "2026-12-17"],
    }
    for z, dates in brush.items():
        town["schedules"].extend(
            iso_date_rows(
                "yard",
                dates,
                f"Zone {z} brush and leaf; place out no earlier than 7 days before; brush max 4 ft length and 4 in diameter; leaves in brown paper biodegradable bags",
                booklet,
            )
        )
    for (za, zb), dates in metal.items():
        town["schedules"].extend(
            iso_date_rows(
                "other",
                dates,
                f"Zones {za} and {zb} white metal; curbside by 7:00 a.m. on scheduled day; or drop off at recycling yard",
                booklet,
            )
        )
    for s in town["schedules"]:
        if s.get("stream") == "bulk":
            s["weekday"] = None
            s["week_pattern"] = "by appointment"
            note = s.get("area_note") or ""
            if "Zones 1-4" in note or "Zones 1–4" in note or "1-4" in note:
                s["area_note"] = (
                    "By appointment; Zones 1-4; two free curbside bulk pickups per year; "
                    "appointments from Feb 23 2026; pickups begin Mar 3 2026 (Tuesdays); "
                    "program pauses Thanksgiving week through March 1; condo/townhouse/trailer "
                    "parks not included; call DPW 732-217-8654."
                )
            else:
                s["area_note"] = (
                    "By appointment; Zones 5-8; two free curbside bulk pickups per year; "
                    "first 2026 pickup day Thursday Mar 5; program pauses Thanksgiving week "
                    "through March 1; condo/townhouse/trailer parks not included; call DPW "
                    "732-217-8654."
                )
            s["source_date"] = "2026"
    town["notes"] = (
        "No municipal curbside trash weekdays; residents use private trash companies (Bulk Item "
        "Collection page). Recycling/brush/metal from Green Booklet 2026 schedule pages."
    )
    town["dpw"]["hauler"] = "Private trash companies (resident-chosen); township provides recycling and bulk"


def fix_perth_amboy(town: dict) -> None:
    # No 2026 calendar found on city Public Works; keep 2025 rows, strengthen notes
    town["notes"] = (
        "No 2026 garbage holiday/sanitation calendar PDF found on "
        "https://www.perthamboynj.org/government/departments/public_works as of v4 research. "
        "Trash rows retained from 2025 Holiday Annual Guidelines PDF (North Mon/Thu, South Tue/Fri, "
        "Conrail boundary). source_date remains 2025 so merge keeps them hidden until a 2026 source "
        "is published. Recycling weekdays not published as standing text on recycling_guidelines page."
    )


def fix_middletown(town: dict) -> None:
    url = "https://www.middletownnj.org/571/Curbside-Garbage-Collection"
    town["schedules"] = [s for s in town["schedules"] if s.get("stream") != "trash"]
    town["schedules"].insert(
        0,
        info_trash(
            "Township provides curbside garbage in township black carts but publishes no static "
            "weekday or zone list; residents must enter their address in the Recycle Coach app to "
            "find their zone. No garbage collection on New Years Day, Thanksgiving Day, or Christmas "
            "Day; collected on the next scheduled collection day.",
            url,
        ),
    )
    for s in town["schedules"]:
        if s.get("stream") == "bulk":
            s["weekday"] = None
            s["week_pattern"] = "by appointment"
            s["area_note"] = (
                "Register by 3:00 p.m. Sunday-Thursday during your scheduled recycling week for "
                "pickup within 48 hours; one bulk request per household per recycling week; up to "
                "4 items, 75 lb max each, under 6 ft; contractor IWS."
            )
            s["source_date"] = "standing"
        if s.get("stream") == "yard":
            s["weekday"] = None
            s["week_pattern"] = "seasonal"
            s["area_note"] = (
                "Curbside brush in spring and leaves in fall; Fall 2026 leaf schedule not yet posted "
                "on collection page as of research."
            )
    town["notes"] = (
        "Garbage and recycling weekdays are Recycle Coach address-lookup only; no static PDF or "
        "zone day list on township collection pages. Informational trash row documents that fact."
    )


def fix_loch_arbour(town: dict) -> None:
    contacts = "https://www.locharbournj.us/departments-services/pages/departments-services-contacts"
    trash_page = "https://www.locharbournj.us/trash-recycling"
    town["schedules"] = [s for s in town["schedules"] if s.get("stream") != "trash"]
    town["schedules"].insert(
        0,
        info_trash(
            "Village Sanitation contact is Borough of Deal (732-531-1454) per Departments and Services "
            "Contacts; Loch Arbour trash-recycling page lists 2026 bulk Mondays only and does not "
            "state weekly trash or recycling weekdays. Do not infer Deal borough days.",
            contacts,
        ),
    )
    town["notes"] = (
        "Sanitation administered via Borough of Deal contact on village contacts page; weekly "
        "trash/recycling weekdays are not published on locharbournj.us. Bulk 2026 Mondays from "
        "village trash-recycling page retained as shape (d)."
    )
    town["dpw"]["hauler"] = "Borough of Deal (sanitation contact 732-531-1454); weekdays not restated on Loch Arbour site"


def fix_sayreville_grass(town: dict) -> None:
    """Relabel Mon/Tue/Wed grass ISO rows as Zone 1/2/3 per sanitation page."""
    url = "https://www.sayreville.com/cn/webpage.cfm?tpid=8945"
    start, end = dt.date(2026, 5, 4), dt.date(2026, 9, 30)
    # Drop existing grass ISO rows
    kept = []
    for s in town["schedules"]:
        note = s.get("area_note") or ""
        if s.get("stream") == "yard" and "grass clippings" in note.lower() and str(
            s.get("week_pattern", "")
        ).startswith("2026-"):
            continue
        kept.append(s)
    town["schedules"] = kept
    zones = {
        1: (0, "Zone 1 grass clippings; Mondays May 4 through September 30; covered 32-gallon containers max 30 lb labeled Grass Clippings; no bags"),
        2: (1, "Zone 2 grass clippings; Tuesdays May 4 through September 30; covered 32-gallon containers max 30 lb labeled Grass Clippings; no bags"),
        3: (2, "Zone 3 grass clippings; Wednesdays May 4 through September 30; covered 32-gallon containers max 30 lb labeled Grass Clippings; no bags"),
    }
    for _z, (wd, label) in zones.items():
        dates = mondays_tue_wed(start, end, wd)
        town["schedules"].extend(iso_date_rows("yard", dates, label, url))
    # Leaf stays seasonal informational
    for s in town["schedules"]:
        if s.get("stream") == "yard" and s.get("week_pattern") == "seasonal":
            s["area_note"] = (
                "Leaf collection November and December; spring leaf collection March and May; "
                "Christmas trees and branches collected in winter months per Sanitation Division; "
                "no single weekday published for leaf routes."
            )
    # Sayreville Jan 1 override: keep MCIA Thursday district wording aligned with recycling area_note
    for o in town.get("overrides") or []:
        if o.get("date") == "2026-01-01":
            o["reason"] = (
                "MCIA Thursday district: January 1 2026 Thursday recycling moved to Saturday "
                "January 3 (borough 2026 bi-weekly page)"
            )


def fix_keyport_yard(town: dict) -> None:
    url = "https://keyportonline.com/departments/public-works/"
    # Ensure sections 3-4 present
    has_34 = any(
        "Sections 3 and 4" in (s.get("area_note") or "")
        for s in town["schedules"]
        if s.get("stream") == "yard"
    )
    if not has_34:
        dates = [
            "2026-04-22",
            "2026-05-13",
            "2026-06-17",
            "2026-09-23",
            "2026-10-21",
            "2026-11-18",
            "2026-12-16",
        ]
        town["schedules"].extend(
            iso_date_rows(
                "yard",
                dates,
                "Sections 3 and 4 leaf and branch curbside",
                url,
            )
        )


def fix_bradley_beach(town: dict) -> None:
    town["notes"] = (
        "Trash weekdays from 2026 sanitation calendar (Zone 1 Mon/Thu, Zone 2 Tue/Fri, Zone 3 Mon/Fri). "
        "Borough does not publish distinct non-overlapping street boundaries for trash zones: "
        "street-sweeper page lists Zone 1 and Zone 3 with the same boundary text (LaReine Ave. to "
        "Lake Terrace) and Zone 2 as Brinley Ave. to Bradley Blvd. area_note uses Zone 1/2/3 labels only."
    )
    # Verify overrides fall on zone weekdays; keep as-is if valid
    # Zone 1: Mon+Thu — Jan 1 2026 is Thursday OK; Thanksgiving Nov 26 Thursday OK
    # Zone 2: Tue+Fri — Christmas Dec 25 Friday OK; NY2027 Jan 1 Friday OK
    # Zone 3: Mon+Fri — Christmas Dec 25 Friday OK; NY2027 Jan 1 Friday OK
    for s in town["schedules"]:
        if s.get("stream") == "other" and "appointment" in (s.get("week_pattern") or "").lower():
            s["weekday"] = None
            s["week_pattern"] = "by appointment"
            s["area_note"] = (
                "Computer/electronic/metal curbside by appointment; minimum 4 bulk stickers per item; "
                "call Borough Hall 732-776-2999 ext. 1010."
            )
            s["source_date"] = "standing"
        if s.get("stream") == "yard" and s.get("week_pattern") == "seasonal":
            s["area_note"] = (
                "Leaf collection loose or biodegradable bags April 1 through May 31 and September 15 "
                "through December 1 (possible extension per borough website); not within 10 feet of drain inlets."
            )


def clean_appointment_notes(town: dict) -> None:
    for s in town.get("schedules") or []:
        # Never rewrite informational private/custom trash rows
        if s.get("stream") == "trash" and (s.get("week_pattern") or "") == "custom":
            continue
        wp = (s.get("week_pattern") or "").lower()
        if "appointment" not in wp and "appointment" not in (s.get("area_note") or "").lower():
            continue
        if s.get("week_pattern") not in (None, "by appointment", "custom") and not wp.startswith("by appointment"):
            continue
        note = s.get("area_note") or ""
        note = re.sub(
            r"^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\.?\s*",
            "",
            note,
            flags=re.I,
        )
        note = re.sub(r"^custom\.\s*", "", note, flags=re.I)
        note = re.sub(r"^by appointment\.?\s*", "By appointment; ", note, flags=re.I)
        note = re.sub(r";\s*;+", "; ", note)
        note = re.sub(r"\s+", " ", note).strip()
        if note and not note[0].isupper():
            note = note[0].upper() + note[1:]
        s["area_note"] = note
        if "appointment" in wp or s.get("weekday") is None:
            s["week_pattern"] = "by appointment"
            s["weekday"] = None


def ascii_punct(text: str) -> str:
    if not text:
        return text
    repl = {
        "\u2013": "-",
        "\u2014": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u00a0": " ",
        "\u2026": "...",
    }
    for a, b in repl.items():
        text = text.replace(a, b)
    return text


def scrub_ascii(town: dict) -> None:
    for k, v in list(town.items()):
        if isinstance(v, str):
            town[k] = ascii_punct(v)
    for s in town.get("schedules") or []:
        for k, v in list(s.items()):
            if isinstance(v, str):
                s[k] = ascii_punct(v)
    for o in town.get("overrides") or []:
        for k, v in list(o.items()):
            if isinstance(v, str):
                o[k] = ascii_punct(v)


CHANGED: list[str] = []


def main() -> None:
    data = json.loads(V3.read_text(encoding="utf-8-sig"))

    fix_old_bridge(data["old-bridge"]); CHANGED.append("old-bridge")
    fix_piscataway(data["piscataway"]); CHANGED.append("piscataway")
    fix_south_plainfield(data["south-plainfield"]); CHANGED.append("south-plainfield")
    fix_hazlet(data["hazlet"]); CHANGED.append("hazlet")
    fix_perth_amboy(data["perth-amboy"]); CHANGED.append("perth-amboy")
    fix_middletown(data["middletown"]); CHANGED.append("middletown")
    fix_loch_arbour(data["loch-arbour"]); CHANGED.append("loch-arbour")
    fix_sayreville_grass(data["sayreville"]); CHANGED.append("sayreville")
    fix_keyport_yard(data["keyport"]); CHANGED.append("keyport")
    fix_bradley_beach(data["bradley-beach"]); CHANGED.append("bradley-beach")

    for slug, town in data.items():
        clean_appointment_notes(town)
        scrub_ascii(town)
        town.setdefault("holiday_rule", None)
        town.setdefault("overrides", [])

    V4.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("WROTE", V4)
    print("CHANGED", sorted(set(CHANGED)))


if __name__ == "__main__":
    main()
