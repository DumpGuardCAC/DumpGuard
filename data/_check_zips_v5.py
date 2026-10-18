import json
from collections import defaultdict
from pathlib import Path

v5 = json.loads(Path("data/towns_research_v5.json").read_text(encoding="utf-8"))
zip_towns = defaultdict(list)
for slug, t in v5.items():
    for z in t.get("zips") or []:
        zip_towns[z["zip"]].append(slug)

print("MULTI-TOWN ZIPS:")
mismatches = []
for z, towns in sorted(zip_towns.items()):
    if len(towns) > 1:
        print(z, towns)
        for slug in towns:
            entry = next(x for x in v5[slug]["zips"] if x["zip"] == z)
            sw = set(entry.get("shared_with") or [])
            expect = set(towns) - {slug}
            if sw != expect:
                msg = f"{slug} zip={z} shared_with={sorted(sw)} expect={sorted(expect)}"
                print("  MISMATCH", msg)
                mismatches.append(msg)

print("\nDANGLING shared_with:")
for slug, t in sorted(v5.items()):
    for z in t.get("zips") or []:
        for peer in z.get("shared_with") or []:
            if peer not in v5:
                print(f"  {slug} {z['zip']} -> unknown {peer}")
                mismatches.append(f"unknown peer {slug}->{peer}")
            else:
                peer_zips = {x["zip"] for x in (v5[peer].get("zips") or [])}
                if z["zip"] not in peer_zips:
                    print(f"  {slug} {z['zip']} lists {peer} but peer lacks zip")
                    mismatches.append(f"asymmetric {slug}->{peer} on {z['zip']}")

print("TOTAL zip mismatches", len(mismatches))
