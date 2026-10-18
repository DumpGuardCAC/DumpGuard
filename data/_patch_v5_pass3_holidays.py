"""Pass 3: ensure holiday_overrides + parallel overrides for explicit makeup dates.

Only encodes original+new dates that sources state explicitly (not 'next day' prose alone).
Already done elsewhere: bradley-beach (6), sayreville MCIA Jan 1.
"""
from __future__ import annotations

import copy
import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PATH = ROOT / "towns_research_v5.json"

REPORT: list[str] = []


def weekday_name(iso: str) -> str:
    return dt.date.fromisoformat(iso).strftime("%A")


def ho(
    original: str,
    new: str,
    reason: str,
    stream: str = "recycling",
) -> dict:
    return {
        "original_date": original,
        "new_date": new,
        "stream": stream,
        "reason": reason,
    }


def to_overrides(holiday_overrides: list[dict]) -> list[dict]:
    return [
        {"date": o["original_date"], "to": o["new_date"], "reason": o["reason"]}
        for o in holiday_overrides
    ]


def set_both(town: dict, rows: list[dict]) -> None:
    town["holiday_overrides"] = rows
    town["overrides"] = to_overrides(rows)


def patch_old_bridge(town: dict) -> None:
    """PDF footnote: *May 25->May 30, *Nov 26->Nov 28, *Dec 25->Dec 26 (ward weekday columns)."""
    # Quote: "*May 25 moved to Sat. May 30 *Nov. 26 moved to Sat. Nov. 28 *Dec. 25 moved to Sat. Dec. 26"
    rows = [
        ho(
            "2026-05-25",
            "2026-05-30",
            "Ward 1: Memorial Day recycling moved to Saturday May 30 "
            "(*May 25 moved to Sat. May 30; Monday column May 11, 30*)",
        ),
        ho(
            "2026-05-25",
            "2026-05-30",
            "Exception: Central Park and surrounding streets (Stone Ct, Aimy Ct, Rachele Ct): "
            "Memorial Day recycling moved to Saturday May 30 (Monday pickup; "
            "*May 25 moved to Sat. May 30)",
        ),
        ho(
            "2026-11-26",
            "2026-11-28",
            "Ward 5: Thanksgiving recycling moved to Saturday Nov 28 "
            "(*Nov. 26 moved to Sat. Nov. 28; Thursday column Nov 12, 28*)",
        ),
        ho(
            "2026-12-25",
            "2026-12-26",
            "Ward 6: Christmas recycling moved to Saturday Dec 26 "
            "(*Dec. 25 moved to Sat. Dec. 26; Friday column Dec 11, 26*)",
        ),
    ]
    assert weekday_name("2026-05-25") == "Monday"
    assert weekday_name("2026-11-26") == "Thursday"
    assert weekday_name("2026-12-25") == "Friday"
    set_both(town, rows)
    for r in rows:
        REPORT.append(
            f"old-bridge ADD {r['original_date']}->{r['new_date']} | {r['reason']}"
        )


def patch_hazlet(town: dict) -> None:
    """Green Booklet 'Recycling changes due to holidays' — zone-specific explicit moves."""
    # Quotes from hazlet_green_booklet_2026.pdf.txt
    moves = [
        (
            "2026-04-03",
            "2026-04-06",
            "Zone 7",
            "APR. 3rd zone 7 moved to APR.6th",
        ),
        (
            "2026-06-19",
            "2026-06-22",
            "Zone 8",
            "JUNE 19th zone 8 moved to JUNE 22nd",
        ),
        (
            "2026-07-03",
            "2026-07-06",
            "Zone 8",
            "JULY 3rd zone 8 moved to JULY 6th",
        ),
        (
            "2026-11-03",
            "2026-11-02",
            "Zone 2",
            "NOV. 3rd zone 2 moved to NOV. 2nd",
        ),
        (
            "2026-11-11",
            "2026-11-09",
            "Zone 3",
            "NOV. 11th zone 3 moved to NOV. 9th",
        ),
        (
            "2026-11-26",
            "2026-11-23",
            "Zone 5",
            "NOV. 26th zone 5 moved to NOV. 23rd",
        ),
        (
            "2026-11-27",
            "2026-11-30",
            "Zone 7",
            "NOV. 27th zone 7 moved to NOV. 30th",
        ),
        (
            "2026-12-24",
            "2026-12-21",
            "Zone 5",
            "DEC. 24th zone 5 moved to DEC. 21st.",
        ),
        (
            "2026-12-25",
            "2026-12-28",
            "Zone 7",
            "DEC. 25th zone 7 moved to DEC.28th",
        ),
    ]
    zone_days = {
        "Zone 2": "Tuesday",
        "Zone 3": "Wednesday",
        "Zone 5": "Thursday",
        "Zone 7": "Friday",
        "Zone 8": "Friday",
    }
    rows = []
    for orig, new, zone, quote in moves:
        assert weekday_name(orig) == zone_days[zone], (orig, zone, weekday_name(orig))
        reason = f"{zone}: recycling holiday move {orig} -> {new} (Green Booklet: {quote})"
        rows.append(ho(orig, new, reason))
        REPORT.append(f"hazlet ADD {orig}->{new} | {reason}")
        REPORT.append(f"  quote: \"{quote}\"")
    set_both(town, rows)
    note = town.get("notes") or ""
    if "Green Booklet holiday moves" not in note:
        town["notes"] = (
            note.rstrip(".")
            + ". Green Booklet holiday moves encoded as Zone N ISO holiday_overrides "
            "(Apr 3, Jun 19, Jul 3, Nov 3/11/26/27, Dec 24/25)."
        )


def patch_south_plainfield(town: dict) -> None:
    """Curbside table: Thanksgiving will be on 11/28/26; Christmas will be on 12/26/26."""
    # Quotes from sp_recycling_districts.pdf / Curbside table NOTES:
    # "No Collection on Thanksgiving Day" / "will be on 11/28/26"
    # "No Collection on Christmas Day" / "will beon 12/26/26"
    rows = [
        ho(
            "2026-11-26",
            "2026-11-28",
            "Thursday recycling district: Thanksgiving makeup 2026-11-28 "
            '(Curbside NOTES: "No Collection on Thanksgiving Day" / "will be on 11/28/26")',
        ),
        ho(
            "2026-12-25",
            "2026-12-26",
            "Friday recycling district: Christmas makeup 2026-12-26 "
            '(Curbside NOTES: "No Collection on Christmas Day" / "will beon 12/26/26")',
        ),
    ]
    assert weekday_name("2026-11-26") == "Thursday"
    assert weekday_name("2026-12-25") == "Friday"
    set_both(town, rows)
    for r in rows:
        REPORT.append(
            f"south-plainfield ADD {r['original_date']}->{r['new_date']} | {r['reason']}"
        )


def patch_piscataway(town: dict) -> None:
    """Monday map block: Memorial Day: Pick-up on May 30 (May 25*)."""
    # Quote under MONDAYS: "* Holiday Pickup Date changes / Memorial Day: Pick-up on May 30"
    # Do NOT invent makeups from general "following Saturday" prose for other holidays.
    rows = [
        ho(
            "2026-05-25",
            "2026-05-30",
            "Monday sections (Sec 4, 5, 6, 7): Memorial Day recycling moved to Saturday May 30 "
            '(2026 map: "Memorial Day: Pick-up on May 30"; May 11 25*)',
        ),
    ]
    assert weekday_name("2026-05-25") == "Monday"
    set_both(town, rows)
    for r in rows:
        REPORT.append(
            f"piscataway ADD {r['original_date']}->{r['new_date']} | {r['reason']}"
        )


def patch_carteret(town: dict) -> None:
    """District A Monday calendar grids: holiday Monday sanitation/recycling -> next Tuesday."""
    # Verified on 2026 Sanitation Calendar District A page coloring (white holiday Mon,
    # red+blue Tue). Existing research had 4; MLK Jan 19->20 also marked on calendar.
    rows = [
        ho(
            "2026-01-19",
            "2026-01-20",
            "Sanitation District A: MLK Day Monday sanitation moved to Tuesday on 2026 calendar",
            stream="trash",
        ),
        ho(
            "2026-02-16",
            "2026-02-17",
            "Sanitation District A: Presidents Day Monday sanitation moved to Tuesday on 2026 calendar",
            stream="trash",
        ),
        ho(
            "2026-05-25",
            "2026-05-26",
            "Sanitation District A: Memorial Day Monday sanitation moved to Tuesday on 2026 calendar",
            stream="trash",
        ),
        ho(
            "2026-09-07",
            "2026-09-08",
            "Sanitation District A: Labor Day Monday sanitation moved to Tuesday on 2026 calendar",
            stream="trash",
        ),
        ho(
            "2026-10-12",
            "2026-10-13",
            "Sanitation District A: Columbus Day Monday sanitation moved to Tuesday on 2026 calendar",
            stream="trash",
        ),
    ]
    for r in rows:
        assert weekday_name(r["original_date"]) == "Monday"
        assert weekday_name(r["new_date"]) == "Tuesday"
    set_both(town, rows)
    for r in rows:
        REPORT.append(
            f"carteret ADD {r['original_date']}->{r['new_date']} | {r['reason']}"
        )
    REPORT.append(
        "carteret quote: calendar grids leave holiday Monday white and mark next Tuesday "
        "red (sanitation) + blue triangle (recycling); note "
        '"Please Refer to Calendar for any Change of Pickup During Holidays"'
    )


def skip_union_beach(town: dict) -> None:
    # Calendar: "There will be no pick-up on ..." with no makeup dates.
    # Keep existing to:null informational overrides; do not invent holiday_overrides makeups.
    REPORT.append(
        "union-beach SKIP: calendar marks no-pickup only (Jan 1, Nov 26, Dec 25) "
        "with no explicit makeup dates — left existing to:null overrides; "
        "no holiday_overrides makeups invented"
    )
    town.setdefault("holiday_overrides", [])


def skip_fair_haven(town: dict) -> None:
    # 2026 municipal calendar lists borough holidays / Trash Collection markers but no
    # explicit "moved to <date>" makeup pairs.
    REPORT.append(
        "fair-haven SKIP: municipal calendar lists borough holidays and collection days "
        "but no explicit original->makeup date pairs — no overrides invented"
    )
    town.setdefault("holiday_overrides", [])
    if not town.get("overrides"):
        town["overrides"] = []


def main() -> None:
    R = json.loads(PATH.read_text(encoding="utf-8-sig"))
    before = {
        k: copy.deepcopy(R[k])
        for k in (
            "old-bridge",
            "hazlet",
            "south-plainfield",
            "piscataway",
            "carteret",
            "union-beach",
            "fair-haven",
        )
    }

    patch_old_bridge(R["old-bridge"])
    patch_hazlet(R["hazlet"])
    patch_south_plainfield(R["south-plainfield"])
    patch_piscataway(R["piscataway"])
    patch_carteret(R["carteret"])
    skip_union_beach(R["union-beach"])
    skip_fair_haven(R["fair-haven"])

    PATH.write_text(json.dumps(R, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print("=" * 72)
    print("PASS 3 HOLIDAY GAP REPORT")
    print("=" * 72)
    for line in REPORT:
        print(line)
    print()
    for slug in before:
        a, b = before[slug], R[slug]
        ao = a.get("holiday_overrides")
        bo = b.get("holiday_overrides") or []
        aov = a.get("overrides") or []
        bov = b.get("overrides") or []
        print(
            f"{slug}: holiday_overrides {None if ao is None else len(ao)} -> {len(bo)}; "
            f"overrides {len(aov)} -> {len(bov)}"
        )
    print("wrote", PATH)


if __name__ == "__main__":
    main()
