"""Fill note.es / notes_es from spanish.py. Fails (exit 1) and lists every English string with no translation."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from spanish import NOTES, SCHED, FAC

D = Path(__file__).parent
missing = []

def tr(table, en, where):
    if en in table:
        return table[en]
    missing.append((where, en))
    return ""

items = json.loads((D / "items_db.json").read_text(encoding="utf8"))
for it in items["items"]:
    for lvl in ("county_rules",):
        for rk, r in (it.get(lvl) or {}).items():
            n = r.get("note")
            if n and n.get("en"):
                n["es"] = tr(NOTES, n["en"], f"{it['id']}/{rk}")
            else:
                if n is not None:
                    n["es"] = ""
    # default / state rule shapes vary; handle any dict with a note
    for k in ("state_rule", "nj_rule"):
        r = it.get(k)
        if r and r.get("note", {}).get("en"):
            r["note"]["es"] = tr(NOTES, r["note"]["en"], f"{it['id']}/{k}")
    it["es_reviewed"] = False  # machine-drafted; served anyway by owner decision
(D / "items_db.json").write_text(json.dumps(items, indent=2, ensure_ascii=False) + "\n", encoding="utf8")

towns = json.loads((D / "towns.json").read_text(encoding="utf8"))
for s in towns["schedules"]:
    s["notes_es"] = tr(SCHED, s["notes_en"], f"schedule {s['region']}/{s['stream']}")
for f in towns["facilities"]:
    if f["key"] in FAC:
        f["notes_es"] = FAC[f["key"]]
    else:
        missing.append(("facility", f["key"]))
(D / "towns.json").write_text(json.dumps(towns, indent=2, ensure_ascii=False) + "\n", encoding="utf8")

if missing:
    seen = set()
    for w, en in missing:
        if en in seen:
            continue
        seen.add(en)
        print(w, "::", en.encode("ascii", "replace").decode())
    print(f"\n{len(seen)} untranslated strings", file=sys.stderr)
    sys.exit(1)
print("all strings translated")
