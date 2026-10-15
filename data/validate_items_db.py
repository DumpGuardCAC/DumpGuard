"""Validate items_db.json. Exit code 1 on any error."""
import json
import sys
from collections import Counter
from pathlib import Path

MATERIALS = {"rigid_plastic", "soft_plastic_foam", "cardboard_paper", "metal", "glass", "ewaste_hazard", "other"}
RULES = {"recycling", "trash", "special_dropoff"}
STATUSES = {"verified", "needs_verification"}
MODEL_BUCKETS = MATERIALS - {"other"}

db = json.loads(Path(__file__).with_name("items_db.json").read_text(encoding="utf-8"))
errors, ids = [], set()
for it in db["items"]:
    i = it.get("id", "?")
    if i in ids:
        errors.append(f"{i}: duplicate id")
    ids.add(i)
    if it["material"] not in MATERIALS:
        errors.append(f"{i}: bad material {it['material']}")
    if it["default_rule"] not in RULES:
        errors.append(f"{i}: bad default_rule")
    if not it["name"]["en"] or not it["name"]["es"]:
        errors.append(f"{i}: missing name")
    if not it["aliases"]:
        errors.append(f"{i}: no aliases")
    for region, r in it["county_rules"].items():
        if r["rule"] not in RULES:
            errors.append(f"{i}/{region}: bad rule")
        if r["status"] not in STATUSES:
            errors.append(f"{i}/{region}: bad status")
        if r["status"] == "verified" and not (r["source"] and r["last_verified"]):
            errors.append(f"{i}/{region}: verified needs source + last_verified")

by_mat = Counter(it["material"] for it in db["items"])
print(f"{len(db['items'])} items")
for m in sorted(MATERIALS):
    flag = "" if by_mat[m] >= 15 or m == "other" else "  <-- below 15"
    print(f"  {m:20s} {by_mat[m]}{flag}")
verified = sum(1 for it in db["items"] for r in it["county_rules"].values() if r["status"] == "verified")
rules = sum(len(it["county_rules"]) for it in db["items"])
print(f"county/town rules: {rules} ({verified} verified)")
print(f"items with Spanish reviewed: {sum(it['es_reviewed'] for it in db['items'])}")
if len(db["items"]) < 200:
    errors.append(f"only {len(db['items'])} items, target is 200+")
for e in errors:
    print("ERROR", e)
sys.exit(1 if errors else 0)
