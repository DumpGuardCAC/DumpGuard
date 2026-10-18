"""Patch towns_research_v5.json: holiday overrides + UNRESOLVABLE informational rows."""
from __future__ import annotations

import copy
import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PATH = ROOT / "towns_research_v5.json"

ZONE_TRASH_DAYS = {
    "Zone 1": {"Monday", "Thursday"},
    "Zone 2": {"Tuesday", "Friday"},
    "Zone 3": {"Monday", "Friday"},
}


def weekday_name(iso: str) -> str:
    return dt.date.fromisoformat(iso).strftime("%A")


def ho(original: str, new: str, reason: str, stream: str = "trash") -> dict:
    return {
        "original_date": original,
        "new_date": new,
        "stream": stream,
        "reason": reason,
    }


def to_overrides(holiday_overrides: list[dict]) -> list[dict]:
    """Legacy merge_research shape (date/to/reason)."""
    return [
        {"date": o["original_date"], "to": o["new_date"], "reason": o["reason"]}
        for o in holiday_overrides
    ]


def upsert_custom(
    schedules: list[dict],
    *,
    stream: str,
    area_note: str,
    source_url: str,
    source_date: str = "standing",
) -> list[dict]:
    """Replace existing null-weekday custom rows for stream; keep other rows."""
    out = [
        s
        for s in schedules
        if not (
            s.get("stream") == stream
            and (s.get("week_pattern") or "") == "custom"
            and not s.get("weekday")
        )
    ]
    row = {
        "stream": stream,
        "weekday": None,
        "week_pattern": "custom",
        "area_note": area_note,
        "source_url": source_url,
        "source_date": source_date,
    }
    if stream == "trash":
        return [row] + [s for s in out if s.get("stream") != "trash"]
    trash = [s for s in out if s.get("stream") == "trash"]
    rest = [s for s in out if s.get("stream") != "trash"]
    return trash + [row] + rest


def ensure_bulk_iso(schedules: list[dict], dates: list[str], note: str, url: str) -> list[dict]:
    existing = {
        s.get("week_pattern")
        for s in schedules
        if s.get("stream") == "bulk" and str(s.get("week_pattern") or "").startswith("2026-")
    }
    out = list(schedules)
    for iso in dates:
        if iso in existing:
            continue
        out.append(
            {
                "stream": "bulk",
                "weekday": "Monday",
                "week_pattern": iso,
                "area_note": note,
                "source_url": url,
                "source_date": "2026",
            }
        )
    return out


def patch_bradley(town: dict) -> None:
    bb_page = "https://www.bradleybeachnj.gov/trash-recycling-information/"
    sweeper = "https://www.bradleybeachnj.gov/street-sweeper/"
    holiday_overrides = [
        ho(
            "2026-01-01",
            "2026-01-05",
            "Zone 1: New Year's Day trash moved to 2026-01-05 (trash-recycling page)",
        ),
        ho(
            "2026-11-26",
            "2026-11-30",
            "Zone 1: Thanksgiving trash moved to 2026-11-30 (trash-recycling page)",
        ),
        ho(
            "2026-12-25",
            "2026-12-29",
            "Zone 2: Christmas trash moved to 2026-12-29 (trash-recycling page)",
        ),
        ho(
            "2026-12-25",
            "2026-12-28",
            "Zone 3: Christmas trash moved to 2026-12-28 (trash-recycling page)",
        ),
        ho(
            "2027-01-01",
            "2027-01-05",
            "Zone 2: New Year's Day 2027 trash moved to 2027-01-05 (trash-recycling page)",
        ),
        ho(
            "2027-01-01",
            "2027-01-04",
            "Zone 3: New Year's Day 2027 trash moved to 2027-01-04 (trash-recycling page)",
        ),
    ]
    # Verify original_date weekday matches zone trash days
    for o in holiday_overrides:
        zone = o["reason"].split(":", 1)[0].strip()
        wd = weekday_name(o["original_date"])
        assert wd in ZONE_TRASH_DAYS[zone], (o, wd, ZONE_TRASH_DAYS[zone])
        assert o["reason"].startswith(zone + ":")

    town["holiday_overrides"] = holiday_overrides
    town["overrides"] = to_overrides(holiday_overrides)
    town["notes"] = (
        "Trash weekdays from 2026 sanitation calendar (Zone 1 Mon/Thu, Zone 2 Tue/Fri, "
        "Zone 3 Mon/Fri). Holiday makeups from trash-recycling page (also reflected on "
        f"2026 sanitation calendar PDF). UNRESOLVABLE: distinct non-overlapping street "
        f"boundaries for trash zones - street-sweeper page lists Zone 1 and Zone 3 with "
        f"the same boundary text (LaReine Ave. to Lake Terrace) and Zone 2 as Brinley Ave. "
        f"to Bradley Blvd.; Zone 4 duplicates Zone 2 text for opposite curb sides. "
        f"area_note uses Zone 1/2/3 labels only. Source: {sweeper} (zones in accordance "
        f"with trash collection zones). Schedule changes also at {bb_page}."
    )
    town["holiday_rule"] = (
        "2026 sanitation calendar marks NO GARBAGE on New Year, Thanksgiving (Zone 1 Thu), "
        "Christmas and New Year 2027 (Zone 2/3 Fri). Borough trash-recycling page states "
        "makeup shifts: Zone 1 New Year 2026-01-01->2026-01-05 and Thanksgiving "
        "2026-11-26->2026-11-30; Zones 2/3 Christmas 2026-12-25->2026-12-28/29 and "
        "New Year 2027-01-01->2027-01-04/05."
    )


def patch_sayreville(town: dict) -> None:
    # Thursday recycling area_note head is "MCIA:"; use "MCIA Thursday:" as district label.
    holiday_overrides = [
        ho(
            "2026-01-01",
            "2026-01-03",
            "MCIA Thursday: January 1 2026 Thursday recycling moved to Saturday January 3 "
            "(borough 2026 bi-weekly page)",
            stream="recycling",
        )
    ]
    assert weekday_name("2026-01-01") == "Thursday"
    # Keep any other existing overrides that are not this Jan 1 recycling move
    existing = [
        o
        for o in (town.get("holiday_overrides") or town.get("overrides") or [])
        if (o.get("original_date") or o.get("date")) != "2026-01-01"
    ]
    # Normalize existing date/to into holiday_overrides if needed
    normalized_existing = []
    for o in existing:
        if "original_date" in o:
            normalized_existing.append(o)
        else:
            normalized_existing.append(
                ho(o["date"], o["to"], o["reason"], stream="recycling" if "recycl" in o["reason"].lower() else "trash")
            )
    town["holiday_overrides"] = holiday_overrides + normalized_existing
    town["overrides"] = to_overrides(town["holiday_overrides"])
    note = town.get("notes") or ""
    if "2026-01-01" not in note and "MCIA Thursday" not in note:
        town["notes"] = (
            note.rstrip(".")
            + ". MCIA Thursday district 2026-01-01 recycling makeup to 2026-01-03 per "
            "https://www.sayreville.com/cn/webpage.cfm?tpid=18888."
        )


def patch_perth_amboy(town: dict) -> None:
    pw = "https://www.perthamboynj.org/government/departments/public_works"
    # Drop 2025 weekday trash rows; do not invent 2026 days
    rest = [s for s in town["schedules"] if s.get("stream") != "trash"]
    town["schedules"] = [
        {
            "stream": "trash",
            "weekday": None,
            "week_pattern": "custom",
            "area_note": (
                "City of Perth Amboy Department of Public Works collects residential garbage, "
                "but a 2026 garbage/holiday sanitation calendar PDF is not published on the "
                f"Public Works page as of research ({pw}). Do not use 2025 North/South Conrail "
                "weekdays as verified 2026 schedule."
            ),
            "source_url": pw,
            "source_date": "standing",
        }
    ] + rest
    town["notes"] = (
        "UNRESOLVABLE: verified 2026 trash weekdays until a 2026 garbage/holiday calendar "
        f"PDF is published on {pw}. Prior 2025 Holiday Annual Guidelines (North Mon/Thu, "
        "South Tue/Fri, Conrail boundary) are not carried forward as verified 2026 days. "
        "Informational custom trash row documents municipal collection without inventing "
        "weekdays. Recycling weekdays not published as standing text on recycling_guidelines page."
    )
    town["status"] = "partial"
    town["holiday_overrides"] = town.get("holiday_overrides") or []
    town["overrides"] = []


def patch_middletown(town: dict) -> None:
    garbage_url = "https://www.middletownnj.org/571/Curbside-Garbage-Collection"
    collection_url = "https://www.middletownnj.org/collection"
    town["schedules"] = upsert_custom(
        town["schedules"],
        stream="trash",
        area_note=(
            "Township provides curbside garbage in township black carts but publishes no "
            "static weekday or zone list; residents must enter their address in the Recycle "
            "Coach app to find their zone. No garbage collection on New Years Day, "
            "Thanksgiving Day, or Christmas Day; collected on the next scheduled collection day."
        ),
        source_url=garbage_url,
    )
    town["schedules"] = upsert_custom(
        town["schedules"],
        stream="recycling",
        area_note=(
            "Curbside recycling weekdays are Recycle Coach address-lookup only; township "
            "collection pages publish no static recycling weekday or zone list PDF."
        ),
        source_url=collection_url,
    )
    town["notes"] = (
        "UNRESOLVABLE: static garbage/recycling weekdays - Recycle Coach address-lookup only; "
        f"no static PDF or zone day list on {garbage_url} and {collection_url}. Informational "
        "trash and recycling custom rows document that fact."
    )
    town["holiday_overrides"] = town.get("holiday_overrides") or []
    town["overrides"] = town.get("overrides") or []


def patch_loch_arbour(town: dict) -> None:
    contacts = "https://www.locharbournj.us/departments-services/pages/departments-services-contacts"
    trash_page = "https://www.locharbournj.us/trash-recycling"
    bulk_dates = [
        "2026-01-26",
        "2026-03-09",
        "2026-05-11",
        "2026-07-13",
        "2026-09-14",
        "2026-11-16",
    ]
    town["schedules"] = upsert_custom(
        town["schedules"],
        stream="trash",
        area_note=(
            "Village Sanitation contact is Borough of Deal (732-531-1454) per Departments and "
            "Services Contacts; Loch Arbour trash-recycling page lists 2026 bulk Mondays only "
            "and does not state weekly trash weekdays. Do not infer Deal borough days."
        ),
        source_url=contacts,
    )
    town["schedules"] = upsert_custom(
        town["schedules"],
        stream="recycling",
        area_note=(
            "Loch Arbour trash-recycling page does not publish weekly recycling weekdays; "
            "sanitation contact is Borough of Deal (732-531-1454). Do not infer Deal days."
        ),
        source_url=trash_page,
    )
    town["schedules"] = ensure_bulk_iso(
        town["schedules"],
        bulk_dates,
        "Village bulk collection day",
        trash_page,
    )
    town["notes"] = (
        "UNRESOLVABLE: weekly trash/recycling weekdays - not published on locharbournj.us "
        f"({trash_page}; contacts {contacts}). Sanitation administered via Borough of Deal "
        "contact; do not invent Deal borough days. Bulk 2026 Mondays from village "
        "trash-recycling page retained as ISO date rows."
    )
    town["holiday_overrides"] = town.get("holiday_overrides") or []
    town["overrides"] = town.get("overrides") or []


def patch_aberdeen(town: dict) -> None:
    trash_url = "https://www.aberdeennj.org/271/Trash-Recycling"
    # Keep Section I/II trash; add informational recycling custom
    has_rec_custom = any(
        s.get("stream") == "recycling"
        and (s.get("week_pattern") or "") == "custom"
        and not s.get("weekday")
        for s in town["schedules"]
    )
    if not has_rec_custom:
        town["schedules"] = upsert_custom(
            town["schedules"],
            stream="recycling",
            area_note=(
                "Curbside recycling weekdays are not published as standing plain text on the "
                "current Trash/Recycling page (Recycle Coach linked; archive flyers only). "
                "Do not invent weekdays from older PDF flyers. Drop-off of recyclables at "
                "Public Works Garage remains available."
            ),
            source_url=trash_url,
        )
    note = town.get("notes") or ""
    if "UNRESOLVABLE" not in note:
        town["notes"] = (
            "UNRESOLVABLE: curbside recycling weekdays - not published as standing plain text "
            f"on {trash_url} (Recycle Coach linked; archive flyers only; not used for weekdays). "
            "Section I/II trash weekdays retained (second day + bulk from Trash/Recycling; "
            "first days supported by 2026 Winter Storm Information Center notices). "
            "Condo/apartment complexes excluded from township contracted hauler."
        )
    town["holiday_overrides"] = town.get("holiday_overrides") or []
    town["overrides"] = town.get("overrides") or []


def main() -> None:
    R = json.loads(PATH.read_text(encoding="utf-8-sig"))
    before = copy.deepcopy(
        {k: R[k] for k in ("bradley-beach", "sayreville", "perth-amboy", "middletown", "loch-arbour", "aberdeen")}
    )

    patch_bradley(R["bradley-beach"])
    patch_sayreville(R["sayreville"])
    patch_perth_amboy(R["perth-amboy"])
    patch_middletown(R["middletown"])
    patch_loch_arbour(R["loch-arbour"])
    patch_aberdeen(R["aberdeen"])

    PATH.write_text(json.dumps(R, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Diff summary
    for slug in before:
        a, b = before[slug], R[slug]
        print("=" * 60, slug)
        if a.get("notes") != b.get("notes"):
            print("notes OLD:", (a.get("notes") or "")[:160])
            print("notes NEW:", (b.get("notes") or "")[:220])
        ao = a.get("holiday_overrides") or a.get("overrides") or []
        bo = b.get("holiday_overrides") or []
        print("holiday_overrides:", len(ao), "->", len(bo))
        for o in bo:
            print(" ", o.get("original_date"), "->", o.get("new_date"), "|", (o.get("reason") or "")[:90])
        # schedule stream changes
        def sig(s):
            return (
                s.get("stream"),
                s.get("weekday"),
                s.get("week_pattern"),
                (s.get("area_note") or "")[:80],
                s.get("source_date"),
            )

        sa, sb = [sig(s) for s in a["schedules"]], [sig(s) for s in b["schedules"]]
        added = [x for x in sb if x not in sa]
        removed = [x for x in sa if x not in sb]
        if removed:
            print("removed schedules:", len(removed))
            for x in removed[:12]:
                print("  -", x)
        if added:
            print("added schedules:", len(added))
            for x in added[:12]:
                print("  +", x)
    print("wrote", PATH)


if __name__ == "__main__":
    main()
