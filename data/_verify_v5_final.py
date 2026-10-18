"""FINAL independent verification of towns_research_v5.json.

Checks:
1) Aberdeen recycling: exactly 2 every-other-week Wednesday rows with
   anchors 2026-01-07 (Section I) and 2026-01-14 (Section II); spot-check
   Jan/May dates against calendar phase (sources: aberdeen_m1.png, m5.png).
2) holiday_overrides / overrides sync + weekday/zone-prefix for focus towns.
3) Every town trash+recycling is classify-ok OR custom-informational
   (same classify logic as data/_score_v5.py / exit check).
4) Zero biweekly weekday/anchor mismatches; zero ISO week_pattern weekday mismatches.

Prints PASS/FAIL. Exit 0 on PASS, 1 on FAIL.
"""
from __future__ import annotations

import datetime as dt
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
V5 = ROOT / "towns_research_v5.json"

DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
DAY_TITLE = [d.title() for d in DAYS]

HOLIDAY_FOCUS = [
    "bradley-beach",
    "sayreville",
    "old-bridge",
    "hazlet",
    "south-plainfield",
    "piscataway",
    "carteret",
]

# Spot-check dates implied by Aberdeen calendar PNGs (continuous 14-day phase).
ABERDEEN_SPOT = {
    "Section I": {
        "anchor": "2026-01-07",
        "jan": ["2026-01-07", "2026-01-21"],
        "may": ["2026-05-13", "2026-05-27"],
    },
    "Section II": {
        "anchor": "2026-01-14",
        "jan": ["2026-01-14", "2026-01-28"],
        "may": ["2026-05-06", "2026-05-20"],
    },
}


def days_of(w):
    if not w:
        return None
    w = w.lower()
    if "(" in w or "plus" in w or " or " in w:
        return None
    return [DAYS.index(d) for d in DAYS if re.search(r"\b" + d + r"s?\b", w)] or None


def wd_of(date: str) -> int:
    """Sunday=0 … Saturday=6 (same as _score_v5)."""
    return (dt.date.fromisoformat(date).weekday() + 1) % 7


def weekday_name(iso: str) -> str:
    return dt.date.fromisoformat(iso).strftime("%A")


def classify(s, wds):
    """Import-equivalent of data/_score_v5.classify (exit-check shape)."""
    if str(s.get("source_date")) not in ("2026", "standing"):
        return None
    p = (s.get("week_pattern") or "").strip()
    q = p.lower()
    text = s.get("area_note") or ""
    if re.fullmatch(r"\d{4}-\d\d-\d\d", p):
        return {"kind": "D", "date": p}
    if not wds:
        return None
    if re.search(r"appointment|\bplus\b|alternating white|white week", q + " " + text.lower()):
        return None
    if re.search(r"booklet lists|conflict", text.lower()):
        return None
    bare = re.sub(r"\([^)]*\)", "", q).strip(" ;")
    if bare in ("weekly", "every week"):
        if re.search(r"\bonly\b", text, re.I):
            return None
        return {"kind": "W"}
    if (
        re.search(r"every other|bi-?weekly|alternating weeks", q)
        and s.get("anchor_date")
        and len(wds) == 1
        and wd_of(s["anchor_date"]) == wds[0]
    ):
        return {"kind": "B", "anchor": s["anchor_date"]}
    m = re.match(
        r"^(\d)(?:st|nd|rd|th)\s*(?:and|&)\s*(\d)(?:st|nd|rd|th)\s+\w+( of the month)?(;.*)?$",
        q,
    )
    if m:
        return {"kind": "M", "nth": [int(m.group(1)), int(m.group(2))]}
    return None


def stream_status(town, stream: str) -> str:
    rows = [s for s in (town.get("schedules") or []) if s.get("stream") == stream]
    if any(classify(s, days_of(s.get("weekday"))) for s in rows):
        return "classify-ok"
    if any((s.get("week_pattern") or "") == "custom" and not s.get("weekday") for s in rows):
        return "custom-informational"
    return "FAIL"


def is_biweekly(pattern: str) -> bool:
    return bool(re.search(r"every other|bi-?weekly|alternating weeks", (pattern or ""), re.I))


def is_iso_date(pattern: str) -> bool:
    return bool(re.fullmatch(r"\d{4}-\d\d-\d\d", (pattern or "").strip()))


def same_phase(anchor: str, dates: list[str]) -> bool:
    a = dt.date.fromisoformat(anchor)
    for d in dates:
        delta = (dt.date.fromisoformat(d) - a).days
        if delta % 14 != 0:
            return False
    return True


def zone_label_from_reason(reason: str) -> str:
    """Prefix before the descriptive clause (zone / ward / exception head)."""
    if not reason or ":" not in reason:
        return ""
    # Exception rows use "Exception: <streets>: <holiday text>"
    if reason.startswith("Exception:"):
        # Keep through street clause: second colon separates holiday text
        parts = reason.split(":", 2)
        if len(parts) >= 3:
            return f"{parts[0].strip()}: {parts[1].strip()}"
        return reason.split(":", 1)[0].strip()
    return reason.split(":", 1)[0].strip()


def schedule_weekdays_for_zone(town: dict, stream: str, label: str) -> set[str]:
    """Weekday names from schedule rows matching zone/area label for stream."""
    out: set[str] = set()
    label_l = label.lower()
    for s in town.get("schedules") or []:
        if s.get("stream") != stream:
            continue
        note = (s.get("area_note") or "").strip()
        note_l = note.lower()
        wd = s.get("weekday")
        if not wd:
            continue
        wd_title = str(wd).title()
        matched = False
        if re.match(r"^zone\s+\d+", label_l) and note_l.startswith(label_l):
            matched = True
        elif re.match(r"^ward\s+\d+", label_l) and note_l.startswith(label_l):
            matched = True
        elif label_l.startswith("sanitation district") and note_l.startswith(label_l):
            matched = True
        elif label_l == "mcia thursday":
            matched = note_l.startswith("mcia") and wd_title == "Thursday"
        elif re.match(
            r"^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+recycling district$",
            label_l,
        ):
            day = label_l.split()[0].title()
            matched = wd_title == day and "recycling district" in note_l
        elif label_l.startswith("monday sections"):
            matched = wd_title == "Monday" and note_l.startswith("sec ")
        elif label_l.startswith("exception:") and "central park" in label_l:
            matched = note_l.startswith("exception:") and "central park" in note_l
        if matched:
            out.add(wd_title)
    return out


def check_aberdeen(data: dict, fails: list[str], oks: list[str]) -> None:
    town = data.get("aberdeen") or {}
    rec = [s for s in (town.get("schedules") or []) if s.get("stream") == "recycling"]
    if len(rec) != 2:
        fails.append(f"aberdeen: expected exactly 2 recycling rows, got {len(rec)}")
        return
    by_section = {}
    for s in rec:
        note = s.get("area_note") or ""
        # Match Section II before Section I ("Section I" is a prefix of "Section II").
        if re.search(r"\bSection II\b", note):
            key = "Section II"
        elif re.search(r"\bSection I\b", note):
            key = "Section I"
        else:
            fails.append(f"aberdeen: recycling row missing Section I/II in area_note: {note[:80]!r}")
            continue
        by_section[key] = s
        if (s.get("weekday") or "").title() != "Wednesday":
            fails.append(f"aberdeen {key}: weekday={s.get('weekday')!r} expected Wednesday")
        if not is_biweekly(s.get("week_pattern") or ""):
            fails.append(f"aberdeen {key}: week_pattern={s.get('week_pattern')!r} not biweekly")
        expect_anchor = ABERDEEN_SPOT[key]["anchor"]
        if s.get("anchor_date") != expect_anchor:
            fails.append(
                f"aberdeen {key}: anchor={s.get('anchor_date')!r} expected {expect_anchor}"
            )
    for key, spot in ABERDEEN_SPOT.items():
        s = by_section.get(key)
        if not s:
            fails.append(f"aberdeen: missing {key} recycling row")
            continue
        anchor = s.get("anchor_date")
        if not same_phase(anchor, spot["jan"] + spot["may"]):
            fails.append(
                f"aberdeen {key}: anchor {anchor} not 14-day phase with "
                f"Jan {spot['jan']} / May {spot['may']} (calendar spot-check)"
            )
        else:
            oks.append(
                f"aberdeen {key}: anchor {anchor}; Jan {spot['jan']}; May {spot['may']} phase OK"
            )
    if not any(f.startswith("aberdeen") for f in fails):
        oks.append("aberdeen: exactly 2 recycling rows Section I/II Wed biweekly anchors OK")


def check_holiday_pairs(data: dict, fails: list[str], oks: list[str]) -> None:
    for slug in HOLIDAY_FOCUS:
        town = data.get(slug) or {}
        ho = town.get("holiday_overrides") or []
        ov = town.get("overrides") or []
        # Sync: holiday_overrides (original_date/new_date/reason) ↔ overrides (date/to/reason)
        ho_keys = [(o.get("original_date"), o.get("new_date"), o.get("reason")) for o in ho]
        ov_keys = [(o.get("date"), o.get("to"), o.get("reason")) for o in ov]
        if sorted(ho_keys) != sorted(ov_keys):
            fails.append(
                f"{slug}: holiday_overrides not synced with overrides "
                f"(ho={len(ho)} ov={len(ov)}; "
                f"ho_only={set(ho_keys) - set(ov_keys)}; "
                f"ov_only={set(ov_keys) - set(ho_keys)})"
            )
        else:
            oks.append(f"{slug}: holiday_overrides synced with overrides ({len(ho)} rows)")

        for i, o in enumerate(ho):
            reason = o.get("reason") or ""
            label = zone_label_from_reason(reason)
            if not label or ":" not in reason:
                fails.append(f"{slug} ho[{i}]: reason not zone-prefixed: {reason[:80]!r}")
                continue
            # Zone-prefixed means reason starts with label + ":"
            if not reason.startswith(label + ":"):
                fails.append(f"{slug} ho[{i}]: reason does not start with '{label}:'")

            orig = o.get("original_date")
            stream = o.get("stream") or "recycling"
            if not orig:
                fails.append(f"{slug} ho[{i}]: missing original_date")
                continue
            try:
                od_name = weekday_name(orig)
            except ValueError:
                fails.append(f"{slug} ho[{i}]: invalid original_date {orig!r}")
                continue

            zone_days = schedule_weekdays_for_zone(town, stream, label)
            if not zone_days:
                fails.append(
                    f"{slug} ho[{i}]: no schedule weekdays for label={label!r} stream={stream}"
                )
            elif od_name not in zone_days:
                fails.append(
                    f"{slug} ho[{i}]: original_date {orig} is {od_name}, "
                    f"zone {label!r} {stream} weekdays={sorted(zone_days)}"
                )
            else:
                oks.append(
                    f"{slug} ho[{i}]: {orig}={od_name} matches {label} {stream} {sorted(zone_days)}"
                )


def check_classify(data: dict, fails: list[str], oks: list[str]) -> None:
    bad = []
    for slug, town in sorted(data.items()):
        tr = stream_status(town, "trash")
        rc = stream_status(town, "recycling")
        if tr == "FAIL" or rc == "FAIL":
            bad.append(f"{slug}: trash={tr} recycling={rc}")
    if bad:
        for b in bad:
            fails.append(b)
    else:
        oks.append(f"classify: all {len(data)} towns trash+recycling classify-ok or custom-informational")


def check_biweekly_iso(data: dict, fails: list[str], oks: list[str]) -> None:
    bi_bad = 0
    bi_ok = 0
    iso_bad = 0
    iso_ok = 0
    for slug, town in data.items():
        for idx, s in enumerate(town.get("schedules") or []):
            pattern = (s.get("week_pattern") or "").strip()
            weekday = s.get("weekday")
            wds = days_of(weekday)
            if is_biweekly(pattern):
                anchor = s.get("anchor_date")
                if not anchor:
                    fails.append(f"{slug}[{idx}]: biweekly missing anchor_date")
                    bi_bad += 1
                else:
                    try:
                        aw = wd_of(anchor)
                    except ValueError:
                        fails.append(f"{slug}[{idx}]: invalid anchor {anchor}")
                        bi_bad += 1
                        continue
                    if not wds or len(wds) != 1:
                        fails.append(
                            f"{slug}[{idx}]: biweekly unparseable weekday {weekday!r}"
                        )
                        bi_bad += 1
                    elif wds[0] != aw:
                        fails.append(
                            f"{slug}[{idx}]: biweekly {weekday} != "
                            f"{DAY_TITLE[aw]} ({anchor})"
                        )
                        bi_bad += 1
                    else:
                        bi_ok += 1
            if is_iso_date(pattern):
                try:
                    aw = wd_of(pattern)
                except ValueError:
                    fails.append(f"{slug}[{idx}]: invalid ISO week_pattern {pattern}")
                    iso_bad += 1
                    continue
                if wds and len(wds) == 1 and wds[0] != aw:
                    fails.append(
                        f"{slug}[{idx}]: ISO {weekday} != {DAY_TITLE[aw]} ({pattern})"
                    )
                    iso_bad += 1
                else:
                    iso_ok += 1
    if bi_bad == 0:
        oks.append(f"biweekly: 0 mismatches ({bi_ok} ok)")
    if iso_bad == 0:
        oks.append(f"iso week_pattern: 0 mismatches ({iso_ok} ok)")


def main() -> int:
    data = json.loads(V5.read_text(encoding="utf-8-sig"))
    fails: list[str] = []
    oks: list[str] = []

    print("=== 1) Aberdeen recycling ===")
    check_aberdeen(data, fails, oks)

    print("=== 2) Holiday overrides focus towns ===")
    check_holiday_pairs(data, fails, oks)

    print("=== 3) Classify exit criterion ===")
    check_classify(data, fails, oks)

    print("=== 4) Biweekly + ISO weekday consistency ===")
    check_biweekly_iso(data, fails, oks)

    print()
    print("--- OK ---")
    for line in oks:
        print(" ", line)
    print("--- FAILS ---")
    if fails:
        for line in fails:
            print(" ", line)
    else:
        print("  (none)")

    status = "PASS" if not fails else "FAIL"
    print()
    print(status)
    print(f"({len(fails)} failure(s); {len(oks)} ok lines)")
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
