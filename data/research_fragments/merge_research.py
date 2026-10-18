#!/usr/bin/env python3
"""Merge research fragments into towns_research.json and print QA table."""
from __future__ import annotations

import glob
import json
import os
from typing import Any

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(BASE), "towns_research.json")

EXPECTED = [
    "carteret",
    "highland-park",
    "metuchen",
    "old-bridge",
    "perth-amboy",
    "piscataway",
    "sayreville",
    "south-amboy",
    "south-plainfield",
    "aberdeen",
    "allenhurst",
    "atlantic-highlands",
    "bradley-beach",
    "deal",
    "fair-haven",
    "hazlet",
    "highlands",
    "interlaken",
    "keansburg",
    "keyport",
    "little-silver",
    "loch-arbour",
    "matawan",
    "middletown",
    "monmouth-beach",
    "neptune-city",
    "neptune-township",
    "oceanport",
    "red-bank",
    "rumson",
    "sea-bright",
    "union-beach",
    "west-long-branch",
]


def score(t: Any) -> int:
    if not isinstance(t, dict):
        return 0
    s = 0
    if t.get("official_site"):
        s += 2
    s += len(t.get("schedules") or [])
    s += len(t.get("zips") or [])
    dpw = t.get("dpw") or {}
    if dpw.get("phone") or dpw.get("address"):
        s += 2
    if t.get("status") == "complete":
        s += 3
    elif t.get("status") == "partial":
        s += 1
    return s


def normalize_status(t: dict) -> str:
    """Recompute status from fields when possible."""
    has_site = bool(t.get("official_site"))
    schedules = t.get("schedules") or []
    streams = {s.get("stream") for s in schedules if isinstance(s, dict)}
    has_trash = "trash" in streams
    has_recycling = "recycling" in streams
    # explicit note that recycling is not curbside counts
    notes = (t.get("notes") or "").lower()
    recycling_ok = has_recycling or (
        "no curbside recycling" in notes or "recycling is not curbside" in notes
    )
    has_zip = bool(t.get("zips"))
    dpw = t.get("dpw") or {}
    has_dpw = bool(dpw.get("phone") or dpw.get("address"))
    if has_site and has_trash and recycling_ok and has_zip and has_dpw:
        return "complete"
    if has_site or schedules or has_zip or has_dpw:
        return "partial"
    return "not_found"


def missing_bits(t: dict) -> str:
    miss = []
    if not t.get("official_site"):
        miss.append("official_site")
    schedules = t.get("schedules") or []
    streams = {s.get("stream") for s in schedules if isinstance(s, dict)}
    if "trash" not in streams:
        miss.append("trash schedule")
    if "recycling" not in streams:
        miss.append("recycling schedule")
    if not t.get("zips"):
        miss.append("zips")
    dpw = t.get("dpw") or {}
    if not (dpw.get("phone") or dpw.get("address")):
        miss.append("dpw")
    return ", ".join(miss) if miss else ""


def stale_flag(t: dict) -> str:
    flags = []
    for s in t.get("schedules") or []:
        if not isinstance(s, dict):
            continue
        sd = str(s.get("source_date") or "")
        if sd == "undated" or not sd:
            flags.append("undated")
        elif sd.isdigit() and int(sd) < 2026:
            # allow if notes say permanent — still flag per plan
            flags.append(f"pre-2026:{sd}")
    if not flags:
        return ""
    # unique
    return "; ".join(sorted(set(flags)))


def main() -> None:
    merged: dict[str, Any] = {}
    files = sorted(glob.glob(os.path.join(BASE, "*.json")))
    files = [f for f in files if not f.endswith("merge_research.py")]
    for path in files:
        name = os.path.basename(path)
        if not name.endswith(".json"):
            continue
        with open(path, encoding="utf-8-sig") as fh:
            data = json.load(fh)
        if not isinstance(data, dict):
            continue
        prefer_parent = "parent_middlesex" in name
        for key, val in data.items():
            if key.startswith("_") or not isinstance(val, dict):
                continue
            if prefer_parent:
                merged[key] = val
            elif key not in merged:
                merged[key] = val
            elif score(val) > score(merged[key]):
                merged[key] = val

    # Ensure all expected keys exist
    for key in EXPECTED:
        if key not in merged:
            merged[key] = {
                "name": key.replace("-", " ").title(),
                "county": "middlesex"
                if key
                in {
                    "carteret",
                    "highland-park",
                    "metuchen",
                    "old-bridge",
                    "perth-amboy",
                    "piscataway",
                    "sayreville",
                    "south-amboy",
                    "south-plainfield",
                }
                else "monmouth",
                "official_site": None,
                "zips": [],
                "dpw": {"phone": None, "address": None, "source_url": None, "hauler": None},
                "schedules": [],
                "dropoff": [],
                "status": "not_found",
                "notes": "No fragment produced by research agents; primary source not located in this pass.",
            }

    # Normalize status
    for key, town in merged.items():
        if key not in EXPECTED:
            continue
        town["status"] = normalize_status(town)

    # Order output by EXPECTED
    out: dict[str, Any] = {}
    for key in EXPECTED:
        out[key] = merged[key]

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    print(f"Wrote {OUT} with {len(out)} towns\n")
    print(
        f"{'town':<22} {'status':<12} {'#sched':>6} {'#zips':>5}  {'stale/undated':<20} missing"
    )
    print("-" * 110)
    for key in EXPECTED:
        t = out[key]
        stale = stale_flag(t)
        miss = missing_bits(t)
        flag = stale if stale else ""
        if stale:
            flag = "FLAG: " + stale
        print(
            f"{key:<22} {t.get('status',''):<12} {len(t.get('schedules') or []):>6} "
            f"{len(t.get('zips') or []):>5}  {flag:<20} {miss}"
        )


if __name__ == "__main__":
    main()
