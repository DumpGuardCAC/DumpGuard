"""Generate table + change list for V5_REPORT.md."""
from __future__ import annotations

import json
from pathlib import Path

from _score_v5 import classify, days_of, recycling_status, trash_status

R5 = json.loads(Path("towns_research_v5.json").read_text(encoding="utf-8-sig"))
R4 = json.loads(Path("towns_research_v4.json").read_text(encoding="utf-8-sig"))


def info_streams(t):
    out = set()
    for s in t.get("schedules") or []:
        if (s.get("week_pattern") or "") == "custom" and not s.get("weekday"):
            out.add(s.get("stream"))
    return out


def held_rows(t):
    rows = []
    for s in t.get("schedules") or []:
        if (s.get("week_pattern") or "") == "custom" and not s.get("weekday"):
            continue
        if not classify(s, days_of(s.get("weekday"))):
            rows.append(s)
    return rows


lines = [
    "| Town | Trash | Recycling | Zones (sample) | Verified | Held | Held one-liners |",
    "|---|---|---|---|---:|---:|---|",
]
for slug, t in sorted(R5.items()):
    tr, rc = trash_status(t), recycling_status(t)
    info = info_streams(t)
    if rc == "n" and "recycling" in info:
        rc = "info"
    sch = t.get("schedules") or []
    ok = sum(1 for s in sch if classify(s, days_of(s.get("weekday"))))
    held = held_rows(t)
    heads = []
    for s in sch:
        if s.get("stream") in ("trash", "recycling") and classify(s, days_of(s.get("weekday"))):
            note = (s.get("area_note") or "").split(";")[0].split(":")[0].strip()
            if note and note not in heads:
                heads.append(note[:36])
    zones = "; ".join(heads[:6]) if heads else "-"
    detail_parts = []
    for s in held[:5]:
        detail_parts.append(
            f"{s.get('stream')}: {(s.get('week_pattern') or '')[:40]} / {(s.get('area_note') or '')[:50]}"
        )
    detail = "<br>".join(detail_parts) or "-"
    if len(held) > 5:
        detail += f"<br>(+{len(held) - 5} more)"
    lines.append(f"| {slug} | {tr} | {rc} | {zones} | {ok} | {len(held)} | {detail} |")

Path("_v5_table.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

changes = []
for slug in sorted(set(R5) | set(R4)):
    a, b = R4.get(slug, {}), R5.get(slug, {})
    if json.dumps(a.get("schedules"), sort_keys=True) != json.dumps(b.get("schedules"), sort_keys=True):
        changes.append((slug, "schedules"))
    ov4 = a.get("holiday_overrides") or a.get("overrides")
    ov5 = b.get("holiday_overrides") or b.get("overrides")
    if json.dumps(ov4, sort_keys=True) != json.dumps(ov5, sort_keys=True):
        changes.append((slug, "overrides"))
    if (a.get("notes") or "") != (b.get("notes") or ""):
        changes.append((slug, "notes"))
    za = [{k: z.get(k) for k in ("zip", "shared_with")} for z in a.get("zips") or []]
    zb = [{k: z.get(k) for k in ("zip", "shared_with")} for z in b.get("zips") or []]
    if json.dumps(za, sort_keys=True) != json.dumps(zb, sort_keys=True):
        changes.append((slug, "zips"))
    if json.dumps(a.get("dropoff") or [], sort_keys=True) != json.dumps(b.get("dropoff") or [], sort_keys=True):
        changes.append((slug, "dropoff"))

Path("_v5_changes.json").write_text(json.dumps(changes, indent=2), encoding="utf-8")
ok = held = 0
for t in R5.values():
    for s in t.get("schedules") or []:
        if (s.get("week_pattern") or "") == "custom" and not s.get("weekday"):
            continue
        if classify(s, days_of(s.get("weekday"))):
            ok += 1
        else:
            held += 1
print("TOTAL ok", ok, "held", held, "towns", len(R5), "change_keys", len(changes))
for c in changes:
    print(c[0], c[1])
