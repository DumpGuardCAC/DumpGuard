#!/usr/bin/env python3
import json

d = json.load(open(r"C:\Users\DagaV\Desktop\CAC\data\towns_research.json", encoding="utf-8"))


def missing(t):
    miss = []
    trash = [s for s in (t.get("schedules") or []) if s.get("stream") == "trash"]
    rec = [s for s in (t.get("schedules") or []) if s.get("stream") == "recycling"]
    if not trash:
        miss.append("trash schedule")
    elif not any(s.get("weekday") for s in trash):
        miss.append("trash weekday")
    if not rec:
        miss.append("recycling schedule")
    elif not any(s.get("weekday") for s in rec):
        miss.append("recycling weekday")
    if not t.get("zips"):
        miss.append("zips")
    dpw = t.get("dpw") or {}
    if not (dpw.get("phone") or dpw.get("address")):
        miss.append("dpw")
    return ", ".join(miss) if miss else "—"


def stale(t):
    flags = set()
    for s in t.get("schedules") or []:
        sd = str(s.get("source_date") or "")
        if sd == "undated" or not sd:
            flags.add("undated")
        elif sd[:4].isdigit() and int(sd[:4]) < 2026:
            flags.add("pre-2026 " + sd[:4])
    return ", ".join(sorted(flags)) if flags else "—"


print("| Town | Status | #Schedules | #ZIPs | Stale/undated | Still missing |")
print("|---|---|---:|---:|---|---|")
c = p = 0
for k, t in d.items():
    st = t.get("status")
    if st == "complete":
        c += 1
    else:
        p += 1
    name = t.get("name", k)
    print(
        f"| {name} | {st} | {len(t.get('schedules') or [])} | {len(t.get('zips') or [])} | {stale(t)} | {missing(t)} |"
    )
print()
print(f"complete={c} partial={p} total={len(d)}")
