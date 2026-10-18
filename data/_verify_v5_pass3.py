"""Pass 3 pure verification: v4→v5 structural diffs + cold source checks + exit criterion.

Prints PASS/FAIL and a machine-readable JSON mismatch list.
Re-opens primary-source facts encoded from a cold reopen of official pages/PDFs.
"""
from __future__ import annotations

import datetime as dt
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
V4 = ROOT / "data" / "towns_research_v4.json"
V5 = ROOT / "data" / "towns_research_v5.json"
OUT_JSON = ROOT / "data" / "_verify_v5_pass3_mismatches.json"
OUT_TXT = ROOT / "data" / "_verify_v5_pass3_report.txt"

FOCUS = [
    "bradley-beach",
    "sayreville",
    "perth-amboy",
    "middletown",
    "loch-arbour",
    "aberdeen",
    "old-bridge",
    "red-bank",
]

DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
DAY_TITLE = [d.title() for d in DAYS]


def days_of(w):
    if not w:
        return None
    w = w.lower()
    if "(" in w or "plus" in w or " or " in w:
        return None
    return [DAYS.index(d) for d in DAYS if re.search(r"\b" + d + r"s?\b", w)] or None


def wd_of(date: str) -> int:
    return (dt.date.fromisoformat(date).weekday() + 1) % 7


def classify(s, wds):
    if str(s.get("source_date")) not in ("2026", "standing"):
        return None
    p = (s.get("week_pattern") or "").strip()
    q = p.lower()
    text = s.get("area_note") or ""
    if re.fullmatch(r"\d{4}-\d\d-\d\d", p):
        return {"kind": "D"}
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
        return {"kind": "B"}
    m = re.match(
        r"^(\d)(?:st|nd|rd|th)\s*(?:and|&)\s*(\d)(?:st|nd|rd|th)\s+\w+( of the month)?(;.*)?$",
        q,
    )
    if m:
        return {"kind": "M"}
    return None


def stream_status(town, stream):
    rows = [s for s in (town.get("schedules") or []) if s.get("stream") == stream]
    if any(classify(s, days_of(s.get("weekday"))) for s in rows):
        return "classify-ok"
    if any((s.get("week_pattern") or "") == "custom" and not s.get("weekday") for s in rows):
        return "custom-informational"
    return "FAIL"


def sched_key(s: dict) -> str:
    return json.dumps(
        {
            "stream": s.get("stream"),
            "weekday": s.get("weekday"),
            "week_pattern": s.get("week_pattern"),
            "anchor_date": s.get("anchor_date"),
            "area_note": s.get("area_note"),
        },
        sort_keys=True,
    )


def ov_brief(o: dict) -> dict:
    return {
        "date": o.get("date"),
        "to": o.get("to"),
        "stream": o.get("stream"),
        "action": o.get("action"),
        "reason": o.get("reason"),
        "area_note": o.get("area_note"),
    }


def find_row(town: dict, stream: str, **preds):
    for s in town.get("schedules") or []:
        if s.get("stream") != stream:
            continue
        ok = True
        for k, v in preds.items():
            if s.get(k) != v:
                ok = False
                break
        if ok:
            return s
    return None


def main() -> int:
    v4 = json.loads(V4.read_text(encoding="utf-8"))
    v5 = json.loads(V5.read_text(encoding="utf-8"))
    mismatches: list[dict] = []
    checks: list[dict] = []

    def fail(town: str, kind: str, detail: str, **extra):
        mismatches.append({"town": town, "kind": kind, "detail": detail, **extra})

    def ok(town: str, kind: str, detail: str):
        checks.append({"town": town, "kind": kind, "detail": detail, "result": "ok"})

    # ---- 1) towns whose dropoff or zips.shared_with changed ----
    drop_zip_changed = []
    for slug in sorted(set(v4) | set(v5)):
        a, b = v4.get(slug, {}), v5.get(slug, {})
        if a.get("dropoff") != b.get("dropoff") or a.get("zips") != b.get("zips"):
            drop_zip_changed.append(slug)

    focus_or_drop = sorted(set(FOCUS) | set(drop_zip_changed))

    structural = {}
    for slug in focus_or_drop:
        a, b = v4.get(slug, {}), v5.get(slug, {})
        entry = {"fields": []}
        for field in ("notes", "holiday_rule", "status", "zips", "dropoff"):
            if a.get(field) != b.get(field):
                entry["fields"].append(field)
        s4 = {sched_key(s): s for s in (a.get("schedules") or [])}
        s5 = {sched_key(s): s for s in (b.get("schedules") or [])}
        entry["schedules_removed"] = len([k for k in s4 if k not in s5])
        entry["schedules_added"] = len([k for k in s5 if k not in s4])
        o4 = [ov_brief(o) for o in (a.get("overrides") or [])]
        o5 = [ov_brief(o) for o in (b.get("overrides") or [])]
        if o4 != o5:
            entry["fields"].append("overrides")
            entry["overrides_v4"] = o4
            entry["overrides_v5"] = o5
        structural[slug] = entry

    # ---- 2) Internal consistency: biweekly anchor + ISO weekday ----
    for slug, town in v5.items():
        for idx, s in enumerate(town.get("schedules") or []):
            pattern = (s.get("week_pattern") or "").strip()
            weekday = s.get("weekday")
            wds = days_of(weekday)
            if re.search(r"every other|bi-?weekly|alternating weeks", pattern, re.I):
                anchor = s.get("anchor_date")
                if not anchor:
                    fail(slug, "biweekly_anchor", "missing anchor_date", idx=idx)
                else:
                    try:
                        aw = wd_of(anchor)
                    except ValueError:
                        fail(slug, "biweekly_anchor", f"invalid anchor {anchor}", idx=idx)
                        continue
                    if not wds or len(wds) != 1:
                        fail(slug, "biweekly_anchor", f"unparseable weekday {weekday!r}", idx=idx)
                    elif wds[0] != aw:
                        fail(
                            slug,
                            "biweekly_anchor",
                            f"{weekday} != {DAY_TITLE[aw]} ({anchor})",
                            idx=idx,
                        )
            if re.fullmatch(r"\d{4}-\d\d-\d\d", pattern):
                try:
                    aw = wd_of(pattern)
                except ValueError:
                    fail(slug, "iso_weekday", f"invalid ISO {pattern}", idx=idx)
                    continue
                if wds and len(wds) == 1 and wds[0] != aw:
                    fail(
                        slug,
                        "iso_weekday",
                        f"{weekday} != {DAY_TITLE[aw]} ({pattern})",
                        idx=idx,
                    )

    # ---- 3) zips.shared_with consistency ----
    zip_towns: dict[str, list[str]] = defaultdict(list)
    for slug, town in v5.items():
        for z in town.get("zips") or []:
            zip_towns[z["zip"]].append(slug)
    for z, towns in zip_towns.items():
        if len(towns) < 2:
            continue
        for slug in towns:
            entry = next(x for x in v5[slug]["zips"] if x["zip"] == z)
            sw = set(entry.get("shared_with") or [])
            expect = set(towns) - {slug}
            if sw != expect:
                fail(
                    slug,
                    "zips_shared_with",
                    f"zip {z}: shared_with={sorted(sw)} expect={sorted(expect)}",
                )

    # ---- 4) Cold source assertions (re-opened this pass) ----
    # Bradley Beach holiday makeups (public-works + trash-recycling pages)
    bb = v5["bradley-beach"]
    expected_bb_ov = {
        ("2026-01-01", "2026-01-05"): "Zone 1",
        ("2026-11-26", "2026-11-30"): "Zone 1",
        ("2026-12-25", "2026-12-29"): "Zone 2",
        ("2026-12-25", "2026-12-28"): "Zone 3",
        ("2027-01-01", "2027-01-05"): "Zone 2",
        ("2027-01-01", "2027-01-04"): "Zone 3",
    }
    bb_ov = {(o.get("date"), o.get("to")): o for o in (bb.get("overrides") or [])}
    for key, zone in expected_bb_ov.items():
        o = bb_ov.get(key)
        if not o:
            fail("bradley-beach", "override", f"missing {key} ({zone})")
        elif zone not in (o.get("reason") or ""):
            fail("bradley-beach", "override", f"{key} reason missing {zone}: {o.get('reason')}")
        else:
            ok("bradley-beach", "override", f"{key} {zone}")

    # trash zones Mon/Thu, Tue/Fri, Mon/Fri; recycling Wed
    bb_trash = {
        ("Zone 1", "Monday"),
        ("Zone 1", "Thursday"),
        ("Zone 2", "Tuesday"),
        ("Zone 2", "Friday"),
        ("Zone 3", "Monday"),
        ("Zone 3", "Friday"),
    }
    have = {
        ((s.get("area_note") or "").split(";")[0].strip(), s.get("weekday"))
        for s in bb.get("schedules") or []
        if s.get("stream") == "trash" and (s.get("week_pattern") or "").lower() in ("every week", "weekly")
    }
    if not bb_trash <= have:
        fail("bradley-beach", "schedule", f"trash zone weekdays missing; have={sorted(have)}")
    else:
        ok("bradley-beach", "schedule", "Zone 1/2/3 trash weekdays")
    rec = find_row(bb, "recycling", weekday="Wednesday") or find_row(bb, "recycling", weekday="wednesday")
    if not rec:
        fail("bradley-beach", "schedule", "missing Wednesday recycling")
    else:
        ok("bradley-beach", "schedule", "Wednesday recycling all zones")

    drop = (bb.get("dropoff") or [{}])[0]
    if "1011 Main Street" not in (drop.get("address") or ""):
        fail("bradley-beach", "dropoff", f"address {drop.get('address')!r}")
    if "07720" not in (drop.get("address") or ""):
        fail("bradley-beach", "dropoff", "address missing ZIP 07720 (on borough pages)")
    else:
        ok("bradley-beach", "dropoff", "1011 Main Street 07720")
    accepts = drop.get("accepts_text") or ""
    for needle in ("Trash", "recycling", "plastic film", "brush", "electronics", "bulk"):
        if needle.lower() not in accepts.lower():
            fail("bradley-beach", "dropoff", f"accepts_text missing {needle!r}")
            break
    else:
        ok("bradley-beach", "dropoff", "accepts_text matches Public Works lot list")

    # Sayreville MCIA anchors + Jan 1→3 override (borough 2026 bi-weekly page)
    sy = v5["sayreville"]
    expected_sy = [
        ("Tuesday", "2026-01-13"),
        ("Wednesday", "2026-01-14"),
        ("Thursday", "2026-01-15"),
        ("Friday", "2026-01-02"),
    ]
    for wd, anchor in expected_sy:
        row = None
        for s in sy.get("schedules") or []:
            if (
                s.get("stream") == "recycling"
                and (s.get("weekday") or "").lower() == wd.lower()
                and s.get("anchor_date") == anchor
            ):
                row = s
                break
        if not row:
            fail("sayreville", "schedule", f"missing recycling {wd} anchor {anchor}")
        else:
            ok("sayreville", "schedule", f"MCIA {wd} @ {anchor}")
    sy_ov = sy.get("overrides") or []
    if not any(o.get("date") == "2026-01-01" and o.get("to") == "2026-01-03" for o in sy_ov):
        fail("sayreville", "override", "missing 2026-01-01 -> 2026-01-03 Thursday makeup")
    else:
        ok("sayreville", "override", "Jan 1 Thursday recycling -> Jan 3 Saturday")
    # 08859 shared_with cleared of non-town "Parlin" label
    z08859 = next((z for z in sy.get("zips") or [] if z.get("zip") == "08859"), None)
    if z08859 is None:
        fail("sayreville", "zips", "missing 08859")
    elif z08859.get("shared_with"):
        fail("sayreville", "zips", f"08859 shared_with should be [] (no peer town); got {z08859.get('shared_with')}")
    else:
        ok("sayreville", "zips", "08859 shared_with=[]")

    # Perth Amboy: no verified 2026 trash weekdays; custom trash+recycling required
    pa = v5["perth-amboy"]
    for stream in ("trash", "recycling"):
        rows = [
            s
            for s in pa.get("schedules") or []
            if s.get("stream") == stream
            and (s.get("week_pattern") or "") == "custom"
            and not s.get("weekday")
        ]
        if not rows:
            fail("perth-amboy", "schedule", f"missing {stream} custom informational row")
        else:
            ok("perth-amboy", "schedule", f"{stream} custom informational present")
        # must not carry 2025 Conrail weekday rows as verified 2026
        bad = [
            s
            for s in pa.get("schedules") or []
            if s.get("stream") == stream
            and s.get("weekday")
            and str(s.get("source_date")) == "2025"
        ]
        if bad:
            fail("perth-amboy", "schedule", f"{stream} still has 2025 weekday rows")

    # Middletown: Recycle Coach-only trash+recycling customs; dropoff hours
    md = v5["middletown"]
    for stream in ("trash", "recycling"):
        rows = [
            s
            for s in md.get("schedules") or []
            if s.get("stream") == stream
            and (s.get("week_pattern") or "") == "custom"
            and not s.get("weekday")
        ]
        if not rows:
            fail("middletown", "schedule", f"missing {stream} custom informational")
        else:
            ok("middletown", "schedule", f"{stream} custom informational")
    md_drop = next(
        (d for d in (md.get("dropoff") or []) if "Kanes" in (d.get("address") or "")),
        None,
    )
    if not md_drop:
        fail("middletown", "dropoff", "missing 52 Kanes Lane center")
    else:
        hours = md_drop.get("hours") or ""
        if "Thursday through Monday" not in hours and "Thursday" not in hours:
            fail("middletown", "dropoff", f"hours unexpected: {hours[:120]}")
        else:
            ok("middletown", "dropoff", "Kanes Lane hours Thu-Mon")
        if "Motor oil" not in (md_drop.get("accepts_text") or ""):
            fail("middletown", "dropoff", "accepts_text missing Motor oil")
        else:
            ok("middletown", "dropoff", "accepts_text present")

    # Loch Arbour: Deal sanitation; bulk Mondays; trash+recycling customs
    la = v5["loch-arbour"]
    for stream in ("trash", "recycling"):
        rows = [
            s
            for s in la.get("schedules") or []
            if s.get("stream") == stream
            and (s.get("week_pattern") or "") == "custom"
            and not s.get("weekday")
        ]
        if not rows:
            fail("loch-arbour", "schedule", f"missing {stream} custom informational")
        else:
            note = rows[0].get("area_note") or ""
            if "Deal" not in note:
                fail("loch-arbour", "schedule", f"{stream} custom missing Deal contact note")
            else:
                ok("loch-arbour", "schedule", f"{stream} custom + Deal note")
    expected_bulk = [
        "2026-01-26",
        "2026-03-09",
        "2026-05-11",
        "2026-07-13",
        "2026-09-14",
        "2026-11-16",
    ]
    bulk_dates = [
        s.get("week_pattern")
        for s in la.get("schedules") or []
        if s.get("stream") == "bulk" and re.fullmatch(r"\d{4}-\d\d-\d\d", s.get("week_pattern") or "")
    ]
    if bulk_dates != expected_bulk:
        fail("loch-arbour", "schedule", f"bulk dates {bulk_dates} != {expected_bulk}")
    else:
        ok("loch-arbour", "schedule", "2026 bulk Mondays")
    z07711 = next((z for z in la.get("zips") or [] if z.get("zip") == "07711"), None)
    if not z07711 or "allenhurst" not in (z07711.get("shared_with") or []):
        fail("loch-arbour", "zips", f"07711 shared_with expected [allenhurst]; got {z07711}")
    else:
        ok("loch-arbour", "zips", "07711 shared_with allenhurst")

    # Aberdeen: recycling custom; Section I Thu bulk / Section II Fri bulk
    ab = v5["aberdeen"]
    rec_ab = [
        s
        for s in ab.get("schedules") or []
        if s.get("stream") == "recycling"
        and (s.get("week_pattern") or "") == "custom"
        and not s.get("weekday")
    ]
    if not rec_ab:
        fail("aberdeen", "schedule", "missing recycling custom informational")
    else:
        ok("aberdeen", "schedule", "recycling custom informational")
    if not find_row(ab, "trash", weekday="Thursday") and not find_row(ab, "trash", weekday="thursday"):
        fail("aberdeen", "schedule", "missing Section I Thursday trash/bulk day")
    else:
        ok("aberdeen", "schedule", "Section I Thursday present")
    if not find_row(ab, "trash", weekday="Friday") and not find_row(ab, "trash", weekday="friday"):
        fail("aberdeen", "schedule", "missing Section II Friday trash/bulk day")
    else:
        ok("aberdeen", "schedule", "Section II Friday present")
    # Winter Storm page supports Mon/Tue first days
    if not find_row(ab, "trash", weekday="Monday") and not find_row(ab, "trash", weekday="monday"):
        fail("aberdeen", "schedule", "missing Monday first-day trash")
    if not find_row(ab, "trash", weekday="Tuesday") and not find_row(ab, "trash", weekday="tuesday"):
        fail("aberdeen", "schedule", "missing Tuesday first-day trash")

    # Old Bridge: privatized garbage quote; ward anchors; dropoff hours
    ob = v5["old-bridge"]
    trash_ob = find_row(ob, "trash", week_pattern="custom")
    if not trash_ob or "privatized" not in (trash_ob.get("area_note") or "").lower():
        fail("old-bridge", "schedule", "trash custom missing privatized garbage note")
    else:
        note = trash_ob.get("area_note") or ""
        if "Please note garbage is privatized" not in note:
            fail(
                "old-bridge",
                "schedule",
                "trash area_note should match site quote 'Please note garbage is privatized...'",
            )
        else:
            ok("old-bridge", "schedule", "privatized garbage quote")
    expected_ob = [
        ("Monday", "2026-01-05", "Ward 1"),
        ("Tuesday", "2026-01-06", "Ward 2"),
        ("Wednesday", "2026-01-07", "Wards 3"),
        ("Thursday", "2026-01-08", "Ward 5"),
        ("Friday", "2026-01-09", "Ward 6"),
    ]
    for wd, anchor, label in expected_ob:
        found = False
        for s in ob.get("schedules") or []:
            if (
                s.get("stream") == "recycling"
                and (s.get("weekday") or "").lower() == wd.lower()
                and s.get("anchor_date") == anchor
                and label.lower() in (s.get("area_note") or "").lower()
            ):
                found = True
                break
        if not found:
            fail("old-bridge", "schedule", f"missing {label} {wd} @{anchor}")
        else:
            ok("old-bridge", "schedule", f"{label} {wd} @{anchor}")
    ob_drop = (ob.get("dropoff") or [{}])[0]
    if "08857" not in (ob_drop.get("address") or ""):
        fail("old-bridge", "dropoff", "address should include 08857")
    hours = ob_drop.get("hours") or ""
    if "Tuesday" not in hours or "Thursday" not in hours or "Saturday" not in hours:
        fail("old-bridge", "dropoff", f"hours unexpected: {hours}")
    else:
        ok("old-bridge", "dropoff", "Tue/Thu/Sat hours")

    # Red Bank notes/dropoff/zips
    rb = v5["red-bank"]
    if "2nd FULL week" not in (rb.get("notes") or "") and "2nd full week" not in (rb.get("notes") or ""):
        fail("red-bank", "notes", "missing UNRESOLVABLE 2nd-full-week yard note")
    else:
        ok("red-bank", "notes", "yard 2nd-full-week UNRESOLVABLE noted")
    rb_drop = (rb.get("dropoff") or [{}])[0]
    if "110 Sunset" not in (rb_drop.get("address") or ""):
        fail("red-bank", "dropoff", f"address {rb_drop.get('address')!r}")
    hours = rb_drop.get("hours") or ""
    if "7:05" not in hours or "2:55" not in hours:
        fail("red-bank", "dropoff", f"hours unexpected: {hours}")
    else:
        ok("red-bank", "dropoff", "Tue-Fri 7:05-2:55 / Sat 8-2")
    accepts = rb_drop.get("accepts_text") or ""
    if "e-waste" not in accepts.lower() and "electronic" not in accepts.lower():
        fail("red-bank", "dropoff", "accepts_text missing e-waste")
    else:
        ok("red-bank", "dropoff", "accepts_text includes e-waste")
    z07701 = next((z for z in rb.get("zips") or [] if z.get("zip") == "07701"), None)
    if z07701 is None:
        fail("red-bank", "zips", "missing 07701")
    elif z07701.get("shared_with"):
        fail("red-bank", "zips", f"07701 should be unique; shared_with={z07701.get('shared_with')}")
    else:
        ok("red-bank", "zips", "07701 shared_with=[]")
    # standing trash/recycling weekdays from Public Utilities page
    for wd, side in [
        ("monday", "East"),
        ("thursday", "East"),
        ("tuesday", "West"),
        ("friday", "West"),
    ]:
        found = any(
            s.get("stream") == "trash"
            and (s.get("weekday") or "").lower() == wd
            and side.lower() in (s.get("area_note") or "").lower()
            for s in rb.get("schedules") or []
        )
        if not found:
            fail("red-bank", "schedule", f"missing trash {wd} {side} of Broad")
    if not any(
        s.get("stream") == "recycling" and (s.get("weekday") or "").lower() == "wednesday"
        for s in rb.get("schedules") or []
    ):
        fail("red-bank", "schedule", "missing Wednesday recycling")
    else:
        ok("red-bank", "schedule", "East/West trash + Wed recycling")

    # ---- 5) Exit criterion ----
    exit_fails = []
    exit_table = []
    for slug, town in sorted(v5.items()):
        tr = stream_status(town, "trash")
        rc = stream_status(town, "recycling")
        exit_table.append({"town": slug, "trash": tr, "recycling": rc})
        if tr == "FAIL" or rc == "FAIL":
            exit_fails.append({"town": slug, "trash": tr, "recycling": rc})
            fail(slug, "exit_criterion", f"trash={tr} recycling={rc}")

    # ---- Report ----
    status = "PASS" if not mismatches else "FAIL"
    report = {
        "status": status,
        "mismatch_count": len(mismatches),
        "mismatches": mismatches,
        "checks_ok": len(checks),
        "focus_towns": FOCUS,
        "dropoff_or_zips_changed": drop_zip_changed,
        "structural_diff_summary": structural,
        "exit_criterion": {
            "rule": "every town trash AND recycling is classify-ok OR custom-informational (weekday null, week_pattern custom)",
            "fails": exit_fails,
            "table": exit_table,
        },
    }
    OUT_JSON.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    lines = []
    lines.append("=" * 72)
    lines.append("DumpGuard v5 — PASS 3 PURE VERIFICATION")
    lines.append(f"v4={V4.name}  v5={V5.name}")
    lines.append(f"RESULT: {status}")
    lines.append("=" * 72)
    lines.append("")
    lines.append("## Dropoff / zips.shared_with changed towns")
    lines.append(", ".join(drop_zip_changed) or "(none)")
    lines.append("")
    lines.append("## Structural diff summary (focus + drop/zip changed)")
    for slug in focus_or_drop:
        e = structural[slug]
        bits = list(e.get("fields") or [])
        if e.get("schedules_added") or e.get("schedules_removed"):
            bits.append(f"schedules +{e['schedules_added']}/-{e['schedules_removed']}")
        lines.append(f"  {slug}: {', '.join(bits) if bits else '(no structural change)'}")
    lines.append("")
    lines.append("## Exit criterion (trash + recycling)")
    if exit_fails:
        for f in exit_fails:
            lines.append(f"  FAIL {f['town']}: trash={f['trash']} recycling={f['recycling']}")
    else:
        lines.append("  All 33 towns PASS (classify-ok or custom-informational for both streams).")
    lines.append("")
    lines.append("## Mismatches (machine-readable also in JSON)")
    if mismatches:
        for m in mismatches:
            lines.append(f"  FAIL [{m['town']}] {m['kind']}: {m['detail']}")
    else:
        lines.append("  (none) — zero mismatches")
    lines.append("")
    lines.append(f"checks_ok={len(checks)} mismatch_count={len(mismatches)}")
    text = "\n".join(lines) + "\n"
    OUT_TXT.write_text(text, encoding="utf-8")
    print(text.encode("ascii", "replace").decode("ascii"))
    print(f"Wrote {OUT_JSON}")
    print(f"Wrote {OUT_TXT}")
    # also print raw JSON mismatches block for machine readers
    print("MISMATCHES_JSON=" + json.dumps(mismatches, ensure_ascii=False))
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
