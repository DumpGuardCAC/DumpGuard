#!/usr/bin/env python3
"""Merge recheck agent fragments into towns_research_v2.json and print final table."""
from __future__ import annotations

import json
import os
from copy import deepcopy

ROOT = os.path.dirname(os.path.abspath(__file__))
V2 = os.path.join(ROOT, "towns_research_v2.json")
FRAG = os.path.join(ROOT, "research_fragments")


def main() -> None:
    data = json.load(open(V2, encoding="utf-8-sig"))
    anchors = json.load(
        open(os.path.join(FRAG, "recheck_anchors_holidays.json"), encoding="utf-8-sig")
    )
    bradley = json.load(
        open(os.path.join(FRAG, "recheck_bradley_union.json"), encoding="utf-8-sig")
    )
    nine = json.load(open(os.path.join(FRAG, "recheck_nine.json"), encoding="utf-8-sig"))
    changed = set()

    # --- Sayreville recycling anchors + holiday ---
    say = data["sayreville"]
    for s in say["schedules"]:
        if s.get("stream") != "recycling":
            continue
        note = (s.get("area_note") or "").lower()
        wd = (s.get("weekday") or "").lower()
        if wd == "tuesday" or "sayrebrook" in note:
            s["weekday"] = "Tuesday"
            s["week_pattern"] = "every other week"
            s["anchor_date"] = "2026-01-13"
            s["source_date"] = "2026"
            s["source_url"] = "https://www.sayreville.com/cn/webpage.cfm?tpid=18888"
        elif wd == "wednesday" or "laurel park" in note:
            s["weekday"] = "Wednesday"
            s["week_pattern"] = "every other week"
            s["anchor_date"] = "2026-01-14"
            s["source_date"] = "2026"
            s["source_url"] = "https://www.sayreville.com/cn/webpage.cfm?tpid=18888"
        elif wd == "thursday" or "lower sayreville" in note or "jernee" in note:
            s["weekday"] = "Thursday"
            s["week_pattern"] = "every other week"
            s["anchor_date"] = "2026-01-15"  # regular biweekly after Jan 1 holiday move
            s["source_date"] = "2026"
            s["source_url"] = "https://www.sayreville.com/cn/webpage.cfm?tpid=18888"
            s["area_note"] = (s.get("area_note") or "") + (
                " Note: Jan 1 2026 Thursday moved to Saturday Jan 3 per borough page; "
                "anchor_date is first regular Thursday 2026-01-15 (+14 from prior cycle)."
            )
        elif wd == "friday" or "tangletown" in note or "sayreville proper" in note:
            s["weekday"] = "Friday"
            s["week_pattern"] = "every other week"
            s["anchor_date"] = "2026-01-02"
            s["source_date"] = "2026"
            s["source_url"] = "https://www.sayreville.com/cn/webpage.cfm?tpid=18888"
    say["holiday_rule"] = (
        "Municipal Public Works holidays do NOT affect MCIA recycling. "
        "Jan 1 2026 Thursday recycling moved to Saturday Jan 3. "
        "Weather changes posted on Recycle Coach / borough site."
    )
    say["overrides"] = [
        {
            "date": "2026-01-01",
            "to": "2026-01-03",
            "reason": "Thursday MCIA recycling moved to Saturday (borough 2026 bi-weekly page)",
        }
    ]
    changed.add("sayreville")

    # --- Matawan white/blue anchors on recycling rows ---
    for s in data["matawan"]["schedules"]:
        if s.get("stream") != "recycling":
            continue
        note = s.get("area_note") or ""
        if "Zone 1" in note or "Area 1" in note:
            s["anchor_date"] = "2026-05-14"
            s["week_pattern"] = (
                "weekly; alternating White Week (commingled) and Blue Week "
                "(mixed paper/newspaper/cardboard); White Week anchor 2026-05-14, "
                "Blue Week 2026-05-21 (+7); same color repeats +14"
            )
            s["source_date"] = "2026"
        elif "Zone 2" in note or "Area 2" in note:
            s["anchor_date"] = "2026-05-14"
            s["week_pattern"] = (
                "weekly; alternating White/Blue weeks; White Week anchor 2026-05-14 "
                "(Zones 1-2 Thursday); Blue Week 2026-05-21"
            )
            s["source_date"] = "2026"
        elif "Zone 3" in note or "Area 3" in note:
            s["anchor_date"] = "2026-05-13"
            s["week_pattern"] = (
                "weekly; alternating White/Blue weeks; White Week anchor 2026-05-13 "
                "(Zones 3-4 Wednesday); Blue Week 2026-05-20"
            )
            s["source_date"] = "2026"
        elif "Zone 4" in note or "Area 4" in note:
            s["anchor_date"] = "2026-05-13"
            s["week_pattern"] = (
                "weekly; alternating White/Blue weeks; White Week anchor 2026-05-13; "
                "Blue Week 2026-05-20"
            )
            s["source_date"] = "2026"
    hr = anchors["holiday_rules"].get("matawan")
    if hr:
        data["matawan"]["holiday_rule"] = hr.get("holiday_rule") or data["matawan"].get(
            "holiday_rule"
        )
        data["matawan"]["overrides"] = hr.get("overrides") or []
    changed.add("matawan")

    # --- Neptune Township: expand recycling sub-zones with anchors ---
    nt_pdf = "https://neptunetownship.org/sites/default/files/2026%20DPW%20CALENDAR%20Town%20Website%20%281%29.pdf"
    nt_rows = []
    for s in data["neptune-township"]["schedules"]:
        if s.get("stream") != "recycling":
            nt_rows.append(s)
    for zone, wd, anchor in [
        ("A1", "Monday", "2026-01-12"),
        ("A2", "Monday", "2026-01-05"),
        ("B1", "Tuesday", "2026-01-13"),
        ("B2", "Tuesday", "2026-01-06"),
        ("C1", "Friday", "2026-01-02"),
        ("C2", "Friday", "2026-01-09"),
        ("D1", "Thursday", "2026-01-15"),
        ("D2", "Thursday", "2026-01-08"),
    ]:
        nt_rows.append(
            {
                "stream": "recycling",
                "weekday": wd,
                "week_pattern": "every other week",
                "area_note": (
                    f"Recycling sub-zone {zone}; assign by 2026 Street Index PDF. "
                    "Ocean Grove residential recycling is weekly Wednesdays (separate)."
                ),
                "source_url": nt_pdf,
                "source_date": "2026",
                "anchor_date": anchor,
            }
        )
    nt_rows.append(
        {
            "stream": "recycling",
            "weekday": "Wednesday",
            "week_pattern": "every week",
            "area_note": (
                "Ocean Grove residential recycling. OG Zone C: south side of Main Ave to Inskip Ave; "
                "OG Zone B: north side of Main Ave to Lake Ave."
            ),
            "source_url": nt_pdf,
            "source_date": "2026",
        }
    )
    data["neptune-township"]["schedules"] = nt_rows
    data["neptune-township"]["status"] = "partial"
    hr = anchors["holiday_rules"].get("neptune-township")
    if hr:
        data["neptune-township"]["holiday_rule"] = hr.get("holiday_rule")
        data["neptune-township"]["overrides"] = hr.get("overrides") or []
    changed.add("neptune-township")

    # --- Holiday rules for all towns from fragment ---
    for slug, hr in anchors["holiday_rules"].items():
        if slug not in data:
            continue
        if hr.get("holiday_rule"):
            data[slug]["holiday_rule"] = hr["holiday_rule"]
            changed.add(slug)
        if hr.get("overrides") is not None:
            # Keep existing overrides if richer; else use fragment
            if not data[slug].get("overrides"):
                data[slug]["overrides"] = hr["overrides"]
                changed.add(slug)

    # --- Dropoff accepts_text ---
    for d in anchors.get("dropoff") or []:
        slug = d.get("town")
        if slug not in data:
            continue
        idx = int(d.get("index") or 0)
        drops = data[slug].get("dropoff") or []
        if idx >= len(drops):
            continue
        if d.get("accepts_text") is not None:
            drops[idx]["accepts_text"] = d["accepts_text"]
            changed.add(slug)
        elif "accepts_text" not in drops[idx]:
            drops[idx]["accepts_text"] = None
        if d.get("hours"):
            drops[idx]["hours"] = d["hours"]
        if d.get("residents_only") is not None:
            drops[idx]["residents_only"] = d["residents_only"]
        if d.get("proof_required"):
            drops[idx]["proof_required"] = d["proof_required"]

    # Ensure accepts_text key on all dropoffs
    for slug, town in data.items():
        for d in town.get("dropoff") or []:
            d.setdefault("accepts_text", None)

    # --- ZIP shared_with from fragment ---
    zmap = anchors.get("zip_shared_with") or {}
    for zipc, names in zmap.items():
        for slug, town in data.items():
            for z in town.get("zips") or []:
                if z.get("zip") == zipc:
                    others = [n for n in names if n != town.get("name")]
                    z["shared_with"] = others
                    changed.add(slug)

    # --- Bradley Beach zone boundary text ---
    bb = bradley.get("bradley-beach") or {}
    zb = ((bb.get("zone_boundary_text") or {}).get("street_sweeper_page") or {}).get(
        "zones"
    ) or []
    if zb:
        by_zone = {str(z["zone"]): z["boundary_text"] for z in zb}
        for s in data["bradley-beach"]["schedules"]:
            if s.get("stream") != "trash":
                continue
            note = s.get("area_note") or ""
            for zid, btext in by_zone.items():
                if note.strip() == f"Zone {zid}" or note.startswith(f"Zone {zid}"):
                    s["area_note"] = (
                        f"Zone {zid}: {btext} (street-sweeper page states zones align with trash collection zones)"
                    )
        data["bradley-beach"]["notes"] = (
            (data["bradley-beach"].get("notes") or "")
            + " Zone street text from https://www.bradleybeachnj.gov/street-sweeper-schedule/ "
            "(zones in accordance with trash collection zones). Zone 3 boundary text on that page "
            "matches Zone 1 wording (LaReine Ave. to Lake Terrace) - verify with borough if needed."
        )
        changed.add("bradley-beach")

    # Union Beach from bradley fragment if present and better
    ub = bradley.get("union-beach")
    if ub and ub.get("schedules"):
        # Keep our corrected schedules; only pull holiday if missing
        if ub.get("holiday_rule") and not data["union-beach"].get("holiday_rule"):
            data["union-beach"]["holiday_rule"] = ub["holiday_rule"]
            changed.add("union-beach")

    # Hazlet zone 8 from nine fragment if present
    haz = nine.get("hazlet") or {}
    for s in (haz.get("schedules") or []):
        if s.get("stream") == "recycling" and "Zone 8" in (s.get("area_note") or ""):
            if s.get("anchor_date"):
                for row in data["hazlet"]["schedules"]:
                    if row.get("stream") == "recycling" and "Zone 8" in (
                        row.get("area_note") or ""
                    ):
                        row["anchor_date"] = s["anchor_date"]
                        if s.get("weekday"):
                            row["weekday"] = s["weekday"]
                        changed.add("hazlet")

    # Source dates from fragment where still undated
    for slug, info in (anchors.get("source_dates") or {}).items():
        if slug not in data:
            continue
        # info may be dict of stream->date or list
        if isinstance(info, dict) and info.get("default"):
            for s in data[slug].get("schedules") or []:
                if s.get("source_date") == "undated":
                    s["source_date"] = info["default"]
                    changed.add(slug)
        elif isinstance(info, str):
            for s in data[slug].get("schedules") or []:
                if s.get("source_date") == "undated":
                    s["source_date"] = info
                    changed.add(slug)

    # Remaining undated weekly -> standing
    for slug, town in data.items():
        for s in town.get("schedules") or []:
            if s.get("source_date") == "undated":
                wp = (s.get("week_pattern") or "").lower()
                if "every week" in wp or wp == "weekly":
                    s["source_date"] = "standing"
                    changed.add(slug)

    json.dump(data, open(V2, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    open(V2, "a", encoding="utf-8").write("\n")

    print("UPDATED", V2)
    print("CHANGED", sorted(changed))
    print()
    print("town|trash|recycling|zones|anchors|unresolved|reason")
    for slug, town in data.items():
        sched = town.get("schedules") or []
        trash_rows = [
            s for s in sched if s.get("stream") == "trash" and s.get("weekday")
        ]
        rec_rows = [
            s
            for s in sched
            if s.get("stream") == "recycling"
            and (s.get("weekday") or s.get("anchor_date"))
        ]
        trash_y = "y" if trash_rows else "n"
        rec_y = "y" if rec_rows else "n"
        zones = set()
        for s in trash_rows + rec_rows:
            note = (s.get("area_note") or "").split(";")[0].strip()
            if note:
                zones.add(note[:60])
        anchors_n = sum(1 for s in sched if s.get("anchor_date"))
        unresolved = []
        reasons = []
        if not trash_rows:
            if slug in (
                "old-bridge",
                "piscataway",
                "south-plainfield",
                "hazlet",
            ):
                unresolved.append("no municipal trash")
                reasons.append("private/no municipal trash weekdays on town site")
            elif slug == "loch-arbour":
                unresolved.append("no trash/recycling weekdays")
                reasons.append("village site lists 2026 bulk only; Deal page 500")
            elif slug == "middletown":
                unresolved.append("no trash/recycling weekdays")
                reasons.append("Recycle Coach only on official garbage/recycling pages")
        if slug == "carteret":
            unresolved.append("graphic district map")
            reasons.append("Recycling District Map is graphic; address spreadsheet page errored")
        if slug == "bradley-beach":
            unresolved.append("zone 3 boundary ambiguous")
            reasons.append(
                "sweeper page Zone 3 text matches Zone 1; no separate trash zone map on sanitation calendar"
            )
        if slug == "aberdeen":
            unresolved.append("first-day source")
            reasons.append(
                "Mon/Tue first days from 2026 Winter Storm notices + Thu/Fri second days on Trash/Recycling"
            )
        # alternating without anchor
        for s in sched:
            if s.get("stream") in ("recycling", "bulk") and (
                "other week" in (s.get("week_pattern") or "").lower()
                or "alternating" in (s.get("week_pattern") or "").lower()
            ):
                if not s.get("anchor_date"):
                    unresolved.append("missing anchor")
                    reasons.append(
                        f"{s.get('stream')} {(s.get('area_note') or '')[:40]} lacks anchor_date"
                    )
        print(
            f"{slug}|{trash_y}|{rec_y}|{len(zones)}|{anchors_n}|{len(unresolved)}|{'; '.join(reasons)}"
        )

    undated = sum(
        1
        for t in data.values()
        for s in (t.get("schedules") or [])
        if s.get("source_date") == "undated"
    )
    print()
    print("undated_rows_remaining", undated)
    print(
        "towns_with_holiday_rule",
        sum(1 for t in data.values() if t.get("holiday_rule")),
    )


if __name__ == "__main__":
    main()
