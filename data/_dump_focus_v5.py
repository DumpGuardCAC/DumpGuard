import json
from pathlib import Path

v4 = json.loads(Path("data/towns_research_v4.json").read_text(encoding="utf-8"))
v5 = json.loads(Path("data/towns_research_v5.json").read_text(encoding="utf-8"))
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
lines = []
for slug in FOCUS:
    b = v5[slug]
    lines.append("=" * 70 + " " + slug)
    lines.append("NOTES: " + (b.get("notes") or "")[:700])
    lines.append("HOLIDAY: " + (b.get("holiday_rule") or "")[:400])
    lines.append("SCHEDULES:")
    for i, s in enumerate(b.get("schedules") or []):
        lines.append(
            f"  [{i}] {s.get('stream')} wd={s.get('weekday')!r} pat={s.get('week_pattern')!r} "
            f"anchor={s.get('anchor_date')!r} date={s.get('source_date')}"
        )
        lines.append(f"      note={(s.get('area_note') or '')[:180]!r}")
        lines.append(f"      url={s.get('source_url')}")
        lines.append(f"      quote={(s.get('source_quote') or '')[:200]!r}")
    lines.append(f"OVERRIDES ({len(b.get('overrides') or [])}):")
    for i, o in enumerate(b.get("overrides") or []):
        lines.append(
            f"  [{i}] date={o.get('date')} stream={o.get('stream')} action={o.get('action')} "
            f"new={o.get('new_date')}"
        )
        lines.append(f"      reason={(o.get('reason') or '')[:200]!r}")
        lines.append(f"      url={o.get('source_url')}")
        lines.append(f"      quote={(o.get('source_quote') or '')[:160]!r}")
    lines.append("DROPOFF: " + json.dumps(b.get("dropoff"), ensure_ascii=False)[:800])
    lines.append("ZIPS: " + json.dumps(b.get("zips"), ensure_ascii=False)[:500])
    lines.append("")

# also dump bradley overrides from v4 vs v5 full compare
for slug in FOCUS:
    a, b = v4[slug], v5[slug]
    if a.get("overrides") != b.get("overrides"):
        lines.append(f"OVERRIDE DIFF {slug}")
        lines.append("v4: " + json.dumps(a.get("overrides"), ensure_ascii=False)[:1500])
        lines.append("v5: " + json.dumps(b.get("overrides"), ensure_ascii=False)[:1500])

Path("data/_focus_v5_dump.txt").write_text("\n".join(lines), encoding="utf-8")
print("wrote", len(lines), "lines")
