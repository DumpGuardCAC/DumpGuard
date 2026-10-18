"""Independent verifier pass 2 for towns_research_v5.json.

Checks:
1) Biweekly/every-other rows: weekday (days_of) must match wd_of(anchor_date)
2) ISO week_pattern dates: weekday name must match the date
3) trash/recycling source_date must be 2026 or standing
4) Listed multi-zone towns: each zone label (first words of area_note) should
   have both trash and recycling rows (report missing pairs; do not invent rows)
"""
from __future__ import annotations

import datetime as dt
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "towns_research_v5.json"

DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
DAY_TITLE = [d.title() for d in DAYS]

MULTI_ZONE_TOWNS = [
    "sayreville",
    "keyport",
    "bradley-beach",
    "carteret",
    "union-beach",
    "neptune-township",
    "highland-park",
    "little-silver",
    "matawan",
    "atlantic-highlands",
    "highlands",
    "red-bank",
    "west-long-branch",
    "hazlet",
    "old-bridge",
    "piscataway",
    "south-plainfield",
]


def days_of(w):
    """Sunday=0..Saturday=6; same rules as merge_research.days_of."""
    if not w:
        return None
    w = w.lower()
    if "(" in w or "plus" in w or " or " in w:
        return None
    return [DAYS.index(d) for d in DAYS if re.search(r"\b" + d + r"s?\b", w)] or None


def wd_of(date: str) -> int:
    return (dt.date.fromisoformat(date).weekday() + 1) % 7


def is_biweekly(pattern: str) -> bool:
    q = (pattern or "").strip().lower()
    return bool(re.search(r"every other|bi-?weekly|alternating weeks", q))


def is_iso_date(pattern: str) -> bool:
    return bool(re.fullmatch(r"\d{4}-\d\d-\d\d", (pattern or "").strip()))


def split_head(text: str):
    m = re.search(r"[;:]|\.\s", text or "")
    if not m:
        return (text or "").strip(" ."), ""
    return text[: m.start()].strip(" ."), text[m.end() :].strip(" ;:.")


def zone_label(area_note: str | None) -> str:
    """First words of area_note (before ; : or sentence break), per merge_research.split_head."""
    head, _ = split_head(area_note or "")
    return head or "(no zone)"


def row_ref(town: str, idx: int, s: dict) -> str:
    note = (s.get("area_note") or "")[:70]
    return (
        f"{town} schedules[{idx}] stream={s.get('stream')} weekday={s.get('weekday')!r} "
        f"pattern={s.get('week_pattern')!r} anchor={s.get('anchor_date')!r} note={note!r}"
    )


def main() -> int:
    data = json.loads(SRC.read_text(encoding="utf-8"))

    biweekly_mismatches = []
    biweekly_ok = 0
    biweekly_total = 0
    iso_mismatches = []
    iso_ok = 0
    iso_total = 0
    bad_source_dates = []
    zone_missing = []  # (town, zone, missing_stream)
    zone_reports = {}

    for town, v in data.items():
        schedules = v.get("schedules") or []
        for idx, s in enumerate(schedules):
            stream = s.get("stream")
            pattern = (s.get("week_pattern") or "").strip()
            weekday = s.get("weekday")
            wds = days_of(weekday)

            if is_biweekly(pattern):
                biweekly_total += 1
                anchor = s.get("anchor_date")
                issues = []
                if not anchor:
                    issues.append("missing_anchor_date")
                else:
                    try:
                        aw = wd_of(anchor)
                    except ValueError:
                        issues.append(f"invalid_anchor_date:{anchor}")
                        aw = None
                    if aw is not None:
                        if not wds:
                            issues.append("unparseable_weekday")
                        elif len(wds) != 1:
                            issues.append(f"multi_weekday:{wds}")
                        elif wds[0] != aw:
                            issues.append(
                                f"weekday_idx={wds[0]}({DAY_TITLE[wds[0]]}) "
                                f"!= anchor_wd={aw}({DAY_TITLE[aw]} {anchor})"
                            )
                if issues:
                    biweekly_mismatches.append(
                        {"town": town, "idx": idx, "issues": issues, "row": row_ref(town, idx, s)}
                    )
                else:
                    biweekly_ok += 1

            if is_iso_date(pattern):
                iso_total += 1
                try:
                    aw = wd_of(pattern)
                except ValueError:
                    iso_mismatches.append(
                        {
                            "town": town,
                            "idx": idx,
                            "issues": [f"invalid_iso_date:{pattern}"],
                            "row": row_ref(town, idx, s),
                        }
                    )
                    continue
                if not wds:
                    iso_mismatches.append(
                        {
                            "town": town,
                            "idx": idx,
                            "issues": [
                                f"unparseable_weekday; date is {DAY_TITLE[aw]} ({pattern})"
                            ],
                            "row": row_ref(town, idx, s),
                        }
                    )
                elif len(wds) != 1:
                    iso_mismatches.append(
                        {
                            "town": town,
                            "idx": idx,
                            "issues": [f"multi_weekday:{wds}; date is {DAY_TITLE[aw]}"],
                            "row": row_ref(town, idx, s),
                        }
                    )
                elif wds[0] != aw:
                    iso_mismatches.append(
                        {
                            "town": town,
                            "idx": idx,
                            "issues": [
                                f"weekday_idx={wds[0]}({DAY_TITLE[wds[0]]}) "
                                f"!= date_wd={aw}({DAY_TITLE[aw]} {pattern})"
                            ],
                            "row": row_ref(town, idx, s),
                        }
                    )
                else:
                    iso_ok += 1

            if stream in ("trash", "recycling"):
                sd = str(s.get("source_date") or "")
                if sd not in ("2026", "standing"):
                    bad_source_dates.append(
                        {
                            "town": town,
                            "idx": idx,
                            "source_date": sd,
                            "row": row_ref(town, idx, s),
                        }
                    )

    for town in MULTI_ZONE_TOWNS:
        if town not in data:
            zone_reports[town] = {"error": "town_missing_from_v5", "zones": {}, "missing": []}
            zone_missing.append((town, "*", "town_missing"))
            continue
        by_zone: dict[str, set[str]] = defaultdict(set)
        for s in data[town].get("schedules") or []:
            st = s.get("stream")
            if st not in ("trash", "recycling"):
                continue
            by_zone[zone_label(s.get("area_note"))].add(st)
        missing = []
        for z, streams in sorted(by_zone.items()):
            for need in ("trash", "recycling"):
                if need not in streams:
                    missing.append({"zone": z, "missing_stream": need})
                    zone_missing.append((town, z, need))
        zone_reports[town] = {
            "zone_count": len(by_zone),
            "zones": {z: sorted(streams) for z, streams in sorted(by_zone.items())},
            "missing": missing,
        }

    # ---- report ----
    lines = []
    lines.append("=" * 72)
    lines.append("towns_research_v5.json - verify pass 2")
    lines.append(f"source: {SRC}")
    lines.append("=" * 72)
    lines.append("")
    lines.append("## Biweekly / every-other / alternating weeks")
    lines.append(f"total={biweekly_total} ok={biweekly_ok} mismatches={len(biweekly_mismatches)}")
    if biweekly_mismatches:
        for m in biweekly_mismatches:
            lines.append(f"  FAIL {m['row']}")
            for iss in m["issues"]:
                lines.append(f"       - {iss}")
    else:
        lines.append("  (none)")
    lines.append("")
    lines.append("## ISO week_pattern (YYYY-MM-DD) weekday match")
    lines.append(f"total={iso_total} ok={iso_ok} mismatches={len(iso_mismatches)}")
    if iso_mismatches:
        for m in iso_mismatches:
            lines.append(f"  FAIL {m['row']}")
            for iss in m["issues"]:
                lines.append(f"       - {iss}")
    else:
        lines.append("  (none)")
    lines.append("")
    lines.append("## source_date not in {2026, standing} for trash/recycling")
    lines.append(f"bad={len(bad_source_dates)}")
    if bad_source_dates:
        for m in bad_source_dates:
            lines.append(f"  FAIL source_date={m['source_date']!r} {m['row']}")
    else:
        lines.append("  (none)")
    lines.append("")
    lines.append("## Multi-zone town zone x stream coverage")
    lines.append(
        "Zone label = first words of area_note (split on ';' ':' or '. ')."
    )
    lines.append(f"towns checked={len(MULTI_ZONE_TOWNS)} missing_pairs={len(zone_missing)}")
    for town in MULTI_ZONE_TOWNS:
        zr = zone_reports[town]
        if zr.get("error"):
            lines.append(f"  {town}: ERROR {zr['error']}")
            continue
        miss = zr["missing"]
        status = "OK" if not miss else f"MISSING {len(miss)}"
        lines.append(f"  {town}: zones={zr['zone_count']} {status}")
        for z, streams in zr["zones"].items():
            mark = ""
            need = [x for x in ("trash", "recycling") if x not in streams]
            if need:
                mark = f"  << missing {','.join(need)}"
            lines.append(f"      - {z!r}: {streams}{mark}")
    lines.append("")
    lines.append("## Missing zone x stream pairs (flat list)")
    if zone_missing:
        for town, z, need in zone_missing:
            lines.append(f"  {town} | {z} | missing {need}")
    else:
        lines.append("  (none)")
    lines.append("")
    lines.append("## Summary")
    lines.append(
        f"biweekly_mismatches={len(biweekly_mismatches)} "
        f"iso_mismatches={len(iso_mismatches)} "
        f"bad_source_dates={len(bad_source_dates)} "
        f"zone_missing_pairs={len(zone_missing)}"
    )
    fixable = len(biweekly_mismatches) + len(iso_mismatches)
    lines.append(
        f"weekday/anchor mismatches to fix in v5: {fixable} "
        "(zone gaps reported only; do not invent rows)"
    )
    report = "\n".join(lines)
    # Windows consoles often use cp1252; keep printable ASCII for stdout.
    print(report.encode("ascii", "replace").decode("ascii"))

    out = ROOT / "data" / "_verify_v5_pass2_report.txt"
    out.write_text(report + "\n", encoding="utf-8")
    print(f"\nWrote {out}")
    # Exit 1 only for weekday/anchor or source_date defects (zone gaps are informational).
    return 0 if fixable == 0 and not bad_source_dates else 1


if __name__ == "__main__":
    sys.exit(main())
