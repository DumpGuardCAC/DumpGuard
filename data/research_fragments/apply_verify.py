#!/usr/bin/env python3
"""Apply verification fragment corrections into towns_research.json and print report."""
from __future__ import annotations

import glob
import json
import os
import re
from copy import deepcopy
from typing import Any

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOWNS = os.path.join(ROOT, "towns_research.json")
VERIFY_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "verify")
REPORT = os.path.join(VERIFY_DIR, "verification_report.json")

# Towns where a schedules correction is a surgical update, not a full replace.
PARTIAL_SCHEDULE_MERGE = {"neptune-township"}


def deep_merge(base: dict, corr: dict) -> dict:
    out = deepcopy(base)
    for k, v in corr.items():
        if k in out and isinstance(out[k], dict) and isinstance(v, dict) and k not in (
            "schedules",
            "zips",
            "dropoff",
        ):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = deepcopy(v)
    return out


def set_path(obj: Any, path: str, value: Any) -> None:
    """Set dotted/bracket paths like notes, dropoff[0].address, schedules[2].area_note."""
    parts = re.findall(r"[A-Za-z_][\w]*|\[\d+\]", path)
    cur = obj
    for i, part in enumerate(parts[:-1]):
        if part.startswith("["):
            cur = cur[int(part[1:-1])]
        else:
            cur = cur[part]
    last = parts[-1]
    if last.startswith("["):
        cur[int(last[1:-1])] = value
    else:
        cur[last] = value


def merge_schedules_by_stream(base_schedules: list, corr_schedules: list) -> list:
    """Replace matching stream rows; keep unrelated streams. Matching: same stream + weekday."""
    out = deepcopy(base_schedules)
    for corr in corr_schedules:
        stream = corr.get("stream")
        weekday = corr.get("weekday")
        area = (corr.get("area_note") or "").lower()
        folds_og_wed = (
            stream == "recycling"
            and "ocean grove" in area
            and "wednesday" in area
        )
        new_rows: list = []
        placed = False
        for row in out:
            if row.get("stream") != stream:
                new_rows.append(row)
                continue
            if folds_og_wed and row.get("weekday") and "ocean grove" in (
                row.get("area_note") or ""
            ).lower():
                continue  # covered by corrected township recycling note
            if not placed and (
                row.get("weekday") == weekday
                or (
                    weekday is None
                    and row.get("weekday") is None
                    and stream == "recycling"
                )
            ):
                new_rows.append(deepcopy(corr))
                placed = True
                continue
            if weekday is None and row.get("weekday") is None and stream == "recycling":
                continue  # drop duplicate null-weekday recycling rows
            new_rows.append(row)
        if not placed:
            new_rows.append(deepcopy(corr))
        out = new_rows
    return out


def apply_corrections(town: dict, corr: Any, slug: str) -> bool:
    """Apply corrections; return True if anything applied."""
    if not corr:
        return False

    if isinstance(corr, list):
        for item in corr:
            if not isinstance(item, dict):
                continue
            field = item.get("field")
            if not field:
                continue
            if "should_be" in item:
                set_path(town, field, item["should_be"])
            elif "value" in item:
                set_path(town, field, item["value"])
        return True

    if not isinstance(corr, dict):
        return False

    corr = deepcopy(corr)
    if slug in PARTIAL_SCHEDULE_MERGE and "schedules" in corr:
        town["schedules"] = merge_schedules_by_stream(
            town.get("schedules") or [], corr.pop("schedules")
        )
    merged = deep_merge(town, corr)
    town.clear()
    town.update(merged)
    return True


def main() -> None:
    towns = json.load(open(TOWNS, encoding="utf-8-sig"))
    report: dict[str, Any] = {"towns": {}, "summary": {}}
    files = sorted(glob.glob(os.path.join(VERIFY_DIR, "*.json")))
    files = [f for f in files if not f.endswith("verification_report.json")]

    verified = issues_n = corrected = missing_files = 0
    for path in files:
        data = json.load(open(path, encoding="utf-8-sig"))
        if not isinstance(data, dict):
            continue
        for slug, entry in data.items():
            if slug.startswith("_") or not isinstance(entry, dict):
                continue
            if slug not in towns:
                report["towns"][slug] = {"error": "unknown town"}
                continue
            corr = entry.get("corrections") or {}
            had = False
            if corr:
                had = apply_corrections(towns[slug], corr, slug)
                if had:
                    corrected += 1
            ok = bool(entry.get("verified"))
            if ok and not (entry.get("issues") or []):
                verified += 1
            issues = entry.get("issues") or []
            issues_n += len(issues)
            report["towns"][slug] = {
                "verified": ok,
                "issue_count": len(issues),
                "issues": issues,
                "confirmed_count": len(entry.get("confirmed") or []),
                "had_corrections": had,
                "sources_checked": entry.get("sources_checked") or [],
                "fragment": os.path.basename(path),
            }

    expected = list(towns.keys())
    for slug in expected:
        if slug not in report["towns"]:
            missing_files += 1
            report["towns"][slug] = {
                "verified": False,
                "issue_count": 1,
                "issues": ["No verification fragment returned for this town"],
                "confirmed_count": 0,
                "had_corrections": False,
                "sources_checked": [],
                "fragment": None,
            }

    report["summary"] = {
        "towns": len(expected),
        "fragments_files": len(files),
        "fully_verified_no_issues": verified,
        "towns_with_corrections_applied": corrected,
        "total_issues_listed": issues_n,
        "towns_missing_verify_fragment": missing_files,
    }

    json.dump(towns, open(TOWNS, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    open(TOWNS, "a", encoding="utf-8").write("\n")
    json.dump(report, open(REPORT, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    open(REPORT, "a", encoding="utf-8").write("\n")

    print("Applied verification to", TOWNS)
    print("Report:", REPORT)
    print(json.dumps(report["summary"], indent=2))
    print()
    print("town|verified|issues|corrections")
    for slug in expected:
        r = report["towns"][slug]
        print(
            f"{slug}|{r.get('verified')}|{r.get('issue_count')}|{r.get('had_corrections')}"
        )
        for issue in r.get("issues") or []:
            print(f"  - {issue}")


if __name__ == "__main__":
    main()
