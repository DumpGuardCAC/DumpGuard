# items_db.json - schema and workflow

`items_db.json` is generated. Edit `items_table.py` (one row per item) or the overlays in `build_items_db.py`, then run:

```
python build_items_db.py
python validate_items_db.py
```

## Current state (v0.3.0)

- 240 items, EN + ES names, aliases, prep text.
- 121 county/town rules, all verified from primary documents (copies in `sources/`, listed in `sources/SOURCES.md`). Details, corrections and open questions: `VERIFICATION_REPORT.md`.
- Verified regions: middlesex, monmouth, edison, new-brunswick, long-branch, asbury-park. No woodbridge rules yet. The 5 `nj` (state e-waste) rules rest on a municipal page quoting the Act; the DEP page itself is unread.
- Every `default_rule` is still a draft NJ-wide norm, and about 190 items have no verified regional rule yet.
- Spanish is machine-drafted. `es_reviewed` is false on every item.

## Entry fields

| Field | Notes |
| --- | --- |
| id | kebab-case, unique, stable |
| name.en / name.es | display names |
| aliases | search terms for Fuse.js |
| material | rigid_plastic, soft_plastic_foam, cardboard_paper, metal, glass, ewaste_hazard (the model buckets), or other (food, clothing, bulky, yard) |
| default_rule | recycling, trash, special_dropoff. Used when no local rule exists |
| likely_resin | string or null. Show as "likely" only |
| hazard | true means never trash or recycle. Show the safety text |
| varies_by_town | true means the app should say "check your town" |
| prep | short instruction, EN and ES |
| status | draft (whole item not yet reviewed) |
| es_reviewed | true only after a fluent reviewer signs off |
| county_rules.<region> | region is middlesex, monmouth, nj, or a town like edison. Fields: rule, note, status, source, last_verified, evidence, facility (key from towns.json facilities, or null) |

## Rule for the app

Show a county/town rule only if its status is `verified`. If none exists for the user's town, show `default_rule` together with the "check your town" line. Never show `needs_verification` text as fact.

## Verifying (the real work)

1. Open the primary guide for the town: MCIA guide (Middlesex), Monmouth County Reclamation Center guide, the Edison, New Brunswick, Woodbridge, Long Branch and Asbury Park guides.
2. For each item the guide covers, add or fix the rule in `build_items_db.py`, set `status` to verified, fill `source` and `last_verified`.
3. Fix `default_rule` rows in `items_table.py` that the guide contradicts.
4. Call the county office for anything the guide leaves open. MCIA: 1-800-488-6242. Monmouth HHW and Reclamation Center: 732-683-8686.
5. Re-run the validator.

## Still open (phone calls and manual checks)

See `VERIFICATION_REPORT.md` for the full list. Main ones: Monmouth HHW 732-683-8686 (battery types, hours, cooking oil, sharps, smoke detectors), Middlesex Solid Waste 732-745-4170, Edison DPW 732-248-7288, New Brunswick Recycling 732-745-5059, Asbury Park DPW 732-775-0900 (foil, pizza boxes). NJ DEP e-waste, battery and bag-ban pages need reading in a normal browser.
