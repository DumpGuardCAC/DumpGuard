"""Print final v4 town table and double-check list."""
from __future__ import annotations

import json
from pathlib import Path

from _score_v4 import classify, days_of, recycling_status, trash_status

R = json.loads(Path("towns_research_v4.json").read_text(encoding="utf-8-sig"))
V3 = json.loads(Path("towns_research_v3.json").read_text(encoding="utf-8-sig"))

print("=== 1. TOWN TABLE ===")
print("town|trash|recycling|zones|held|why_held")
tot_ok = tot_h = 0
for slug, town in R.items():
    ok = held = 0
    reasons = []
    zones = set()
    for s in town.get("schedules") or []:
        note = s.get("area_note") or ""
        for token in note.replace(",", " ").split():
            if token.lower().startswith("zone") or token.lower().startswith("ward") or token.lower().startswith("section"):
                zones.add(token.strip(".;"))
        c = classify(s, days_of(s.get("weekday")))
        if c:
            ok += 1
        else:
            held += 1
            reasons.append(
                f"{s.get('stream')}: {str(s.get('week_pattern'))[:28]} — {(note)[:70]}"
            )
    tot_ok += ok
    tot_h += held
    z = ",".join(sorted(zones)[:8]) if zones else "-"
    why = " | ".join(reasons) if held else ""
    print(f"{slug}|{trash_status(town)}|{recycling_status(town)}|{z}|{held}|{why}")
print(f"TOTAL ok={tot_ok} held={tot_h}")
print()
print("=== 2. V3 -> V4 DOUBLE CHECK ===")
print("- old-bridge: informational private trash quote; overrides cut from 15 to 4 ward-correct holidays")
print("- piscataway: informational private trash with named haulers")
print("- south-plainfield: informational trash (no garbage weekday on Curbside page); overrides district wording")
print("- hazlet: informational private trash; 56 brush ISO + 16 white-metal ISO from Green Booklet pages")
print("- perth-amboy: still source_date 2025; no 2026 calendar on city PW page")
print("- middletown: informational trash documenting Recycle Coach-only; no static days")
print("- loch-arbour: informational trash (Deal contact, no days on village page); bulk Mondays kept")
print("- sayreville: grass relabeled Zone 1 Mon / Zone 2 Tue / Zone 3 Wed (was all Zone 1)")
print("- keyport: Sections 3 and 4 leaf/branch ISO dates added")
print("- bradley-beach: notes confirm no distinct zone street map; appointment note cleaned")
print("- union-beach: fall leaf Section A Wed / Section B Tue expanded to Oct-Dec 2026 ISO rows")
print("- appointment/custom notes cleaned across many towns (ASCII, one sentence)")
print("- merge_research.py SRC prefers towns_research_v4.json")
print("- fixed weekday_name Mon=0 bug for all v4-generated ISO rows")
print()
print("=== 3. COULD NOT VERIFY ===")
print("- Perth Amboy 2026 sanitation/holiday PDF: not found on city Public Works; trash remains 2025")
print("- Middletown trash/recycling weekdays: Recycle Coach interactive only; no static PDF/zone day list")
print("- Loch Arbour weekly trash/recycling days: not on village site; Deal days not copied")
print("- Bradley Beach distinct Zone 1 vs Zone 3 street boundaries: borough does not publish")
print("- Matawan brush green calendar markers: not transcribed to ISO (street-sweeper list is separate)")
print("- Red Bank yard 2nd-full-week: not shape a/b/c/d without exact dates")
print("- Sayreville leaf seasonal: no weekday on sanitation page")
print("- Holiday ISO flags (collection may still run or town silent): Sayreville grass Memorial Day/Labor Day Mondays; AH 1st Sat Jul 4; Interlaken bulk Memorial Day; Matawan leaf Oct 12; UB leaf Nov 11 Veterans Day")
print()
print("schedule counts v3", sum(len(t.get('schedules') or []) for t in V3.values()),
      "v4", sum(len(t.get('schedules') or []) for t in R.values()))
