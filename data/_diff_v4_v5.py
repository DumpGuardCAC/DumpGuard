"""Structural diff towns_research_v4.json -> towns_research_v5.json."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
v4 = json.loads((ROOT / "data/towns_research_v4.json").read_text(encoding="utf-8"))
v5 = json.loads((ROOT / "data/towns_research_v5.json").read_text(encoding="utf-8"))

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


def sched_brief(s: dict) -> dict:
    return {
        "stream": s.get("stream"),
        "weekday": s.get("weekday"),
        "week_pattern": s.get("week_pattern"),
        "anchor_date": s.get("anchor_date"),
        "area_note": (s.get("area_note") or "")[:100],
        "source_url": s.get("source_url"),
        "source_quote": (s.get("source_quote") or "")[:160],
        "source_date": s.get("source_date"),
    }


def ov_key(o: dict) -> str:
    return json.dumps(
        {
            "date": o.get("date"),
            "stream": o.get("stream"),
            "action": o.get("action"),
            "reason": o.get("reason"),
            "area_note": o.get("area_note"),
            "new_date": o.get("new_date"),
        },
        sort_keys=True,
    )


def ov_brief(o: dict) -> dict:
    return {
        "date": o.get("date"),
        "stream": o.get("stream"),
        "action": o.get("action"),
        "reason": o.get("reason"),
        "area_note": (o.get("area_note") or "")[:80],
        "new_date": o.get("new_date"),
        "source_url": o.get("source_url"),
        "source_quote": (o.get("source_quote") or "")[:160],
    }


changed_drop_zip = []
for slug in sorted(set(v4) | set(v5)):
    a, b = v4.get(slug, {}), v5.get(slug, {})
    if a.get("zips") != b.get("zips") or a.get("dropoff") != b.get("dropoff"):
        changed_drop_zip.append(slug)

print("DROP/ZIP CHANGED:", changed_drop_zip)
print()

towns = sorted(set(FOCUS) | set(changed_drop_zip))
report = {}

for slug in towns:
    a, b = v4.get(slug, {}), v5.get(slug, {})
    entry = {"slug": slug, "changes": []}

    for field in ("notes", "holiday_rule", "status", "official_site", "county", "name"):
        if a.get(field) != b.get(field):
            entry["changes"].append(
                {
                    "field": field,
                    "v4": a.get(field),
                    "v5": b.get(field),
                }
            )

    if a.get("zips") != b.get("zips"):
        entry["changes"].append({"field": "zips", "v4": a.get("zips"), "v5": b.get("zips")})
    if a.get("dropoff") != b.get("dropoff"):
        entry["changes"].append(
            {
                "field": "dropoff",
                "v4": a.get("dropoff"),
                "v5": b.get("dropoff"),
            }
        )
    if a.get("dpw") != b.get("dpw"):
        entry["changes"].append({"field": "dpw", "changed": True})

    s4 = a.get("schedules") or []
    s5 = b.get("schedules") or []
    map4 = {sched_key(s): s for s in s4}
    map5 = {sched_key(s): s for s in s5}
    removed = [sched_brief(map4[k]) for k in map4 if k not in map5]
    added = [sched_brief(map5[k]) for k in map5 if k not in map4]
    # same key but quote/url/date changed
    meta_changed = []
    for k in set(map4) & set(map5):
        x, y = map4[k], map5[k]
        diffs = {}
        for f in ("source_url", "source_quote", "source_date"):
            if x.get(f) != y.get(f):
                diffs[f] = {"v4": x.get(f), "v5": y.get(f)}
        if diffs:
            meta_changed.append({"row": sched_brief(y), "diffs": diffs})

    if removed or added or meta_changed or len(s4) != len(s5):
        entry["changes"].append(
            {
                "field": "schedules",
                "v4_count": len(s4),
                "v5_count": len(s5),
                "removed": removed,
                "added": added,
                "meta_changed": meta_changed,
            }
        )

    o4 = a.get("overrides") or []
    o5 = b.get("overrides") or []
    om4 = {ov_key(o): o for o in o4}
    om5 = {ov_key(o): o for o in o5}
    orem = [ov_brief(om4[k]) for k in om4 if k not in om5]
    oadd = [ov_brief(om5[k]) for k in om5 if k not in om4]
    if orem or oadd or len(o4) != len(o5):
        entry["changes"].append(
            {
                "field": "overrides",
                "v4_count": len(o4),
                "v5_count": len(o5),
                "removed": orem,
                "added": oadd,
            }
        )

    report[slug] = entry
    print("=" * 72)
    print(slug)
    if not entry["changes"]:
        print("  (no structural changes)")
        continue
    for c in entry["changes"]:
        f = c["field"]
        if f in ("notes", "holiday_rule", "status"):
            print(f"  {f}:")
            print(f"    v4: {json.dumps(c.get('v4'), ensure_ascii=False)[:400]}")
            print(f"    v5: {json.dumps(c.get('v5'), ensure_ascii=False)[:400]}")
        elif f == "zips":
            print("  zips:")
            print("    v4:", json.dumps(c["v4"], ensure_ascii=False)[:500])
            print("    v5:", json.dumps(c["v5"], ensure_ascii=False)[:500])
        elif f == "dropoff":
            print("  dropoff CHANGED")
            print("    v4:", json.dumps(c["v4"], ensure_ascii=False)[:600])
            print("    v5:", json.dumps(c["v5"], ensure_ascii=False)[:600])
        elif f == "schedules":
            print(f"  schedules: {c['v4_count']} -> {c['v5_count']}")
            for r in c["removed"]:
                print("    REMOVED:", json.dumps(r, ensure_ascii=False))
            for r in c["added"]:
                print("    ADDED:", json.dumps(r, ensure_ascii=False))
            for r in c["meta_changed"]:
                print("    META:", json.dumps(r, ensure_ascii=False)[:500])
        elif f == "overrides":
            print(f"  overrides: {c['v4_count']} -> {c['v5_count']}")
            for r in c["removed"]:
                print("    REMOVED:", json.dumps(r, ensure_ascii=False))
            for r in c["added"]:
                print("    ADDED:", json.dumps(r, ensure_ascii=False))
        else:
            print(f"  {f}: changed")

out = ROOT / "data/_diff_v4_v5_report.json"
out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
print("\nWrote", out)
