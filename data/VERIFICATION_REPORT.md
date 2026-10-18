# DumpGuard database verification report (2026-10-06)

Database version 0.3.0: 240 items, 141 county/town rules (all 141 verified).
Regenerated with `python build_items_db.py`; `python validate_items_db.py` passes.

## (a) Sources read and not read

Read (primary): Middlesex County 2026 guide (copy hosted by the Woodbridge library) and two county web pages (What to Recycle FAQ, Reduce Reuse Recycle); Monmouth County 2025 recycling guide (Spring Lake and co.monmouth copies, scanned, read as images), Monmouth HHW program page, acceptable and unacceptable pages, Reclamation Center page, Paint Disposal flyer; Edison recycling regulations page and 2026 calendar guide; New Brunswick trash/recycling, by-item and electronics/paint pages; Long Branch drop-off page; Asbury Park garbage/recycling and bulk/electronics pages. Copies are in sources\ (see sources\SOURCES.md).

Also read (second pass, 2026-10-06): City of Long Branch page on the NJ Electronics Waste Management Act (covered devices, trash ban), Monmouth County press release on plastic bags in recycling, Long Branch brush, leaf and grass pages, Asbury Park and New Brunswick yard-waste pages.

Not read:
- NJ DEP e-waste, battery and bag-ban pages: JS shell via curl, blank in the browser. The state e-waste rules now rest on the Long Branch page quoting the Act instead; the DEP page itself is still unread.
- Monmouth Battery Disposal flyer 2024: body text is vector, not extractable; only headings legible.
- Middlesex PDFs on middlesexcountynj.gov (HHW schedule, shredding flyer): 403.
- Woodbridge-specific tire, cooking-oil and paint days/hours: ambiguous in the extraction, so no woodbridge rules were added (county guide rules cover Woodbridge via the middlesex region).
- New Monmouth County site (monmouthcountynj.gov): 403. The legacy pages carry a "We have moved" banner and "Page Last Updated 2/20/2025".

## (b) Rule counts by region

| Region | Verified | Needs verification |
|---|---|---|
| middlesex | 38 | 0 |
| monmouth | 42 | 0 |
| nj | 5 | 0 |
| edison | 10 | 0 |
| new-brunswick | 12 | 0 |
| long-branch | 5 | 0 |
| asbury-park | 29 | 0 |
| woodbridge | 0 | 0 |

All 240 default_rule values remain unverified NJ norms (item status draft). Spanish is untouched (es_reviewed false; overlay Spanish notes empty).

## (c) Rules changed or corrected

default_rule (items_table.py):
- shredded-paper R -> T: Middlesex county FAQ says not in bin, trash or compost; New Brunswick and Asbury Park agree.
- frozen-food-box R -> T: Middlesex county FAQ says generally should not be recycled (waxy coating).
- New rows (no regional rules): oxygen-tank, used-oil-filter, eyeglasses (total now 240).

Overlay (build_items_db.py):
- latex-paint-wet Monmouth: special_dropoff -> trash after drying. Latex paint is NOT accepted at Monmouth HHW (county Paint flyer and unacceptable page). The previous overlay was wrong.
- Monmouth HHW note rewritten: ZIP 07753, Tue/Wed/Fri 11-4, Sat 8-4, no appointment, residents only with ID, 732-683-8686. Removed the unsupported "items in marked original containers" and the "household batteries not accepted" conflict text.
- Monmouth plastics note corrected to #1 and #2 bottles and #5 containers (margarine tubs, yogurt cups), pourable, 1 gal or less. yogurt-tub is now Monmouth recycling (was guessed trash).
- Removed: Middlesex plastic-bucket and plastic-plate trash rules (not stated in the primary documents); Monmouth deli-container and peanut-butter-jar guesses; third-party Edison styrofoam/ceramic/bulb rules (cityrulelookup.com); unsupported Monmouth gasoline and pool-chemicals rules.
- Replaced old secondary source URLs (Union Beach, Eatontown, Freehold, cityrulelookup) with the primary URLs.
- Added Monmouth led-bulb trash (guide); cfl-bulb retailer drop-off kept as special_dropoff, now verified.
- Monmouth plastic-shopping-bag trash: first downgraded to needs_verification, then re-verified from the county press release (bags of any kind do not go in recycling; reuse or take to a retailer).
- nj electronics (laptop, desktop-computer, computer-monitor, television, printer): verified from the Long Branch page on the NJ Electronics Waste Management Act, which lists the six covered devices and says they may not go in the trash.
- nj keyboard-mouse rule removed: keyboards and mice are not among the covered devices, so no state ban is claimed.
- Added 100+ extra search aliases (EXTRA_ALIASES in build_items_db.py); every item now has at least 2 aliases.
- Rules that send people to a place now carry `facility` (a key from towns.json facilities); 38 rules are tied. Unlinked drop-off rules are the ones that say "not accepted" or name no specific site.

## (d) Conflicts

Resolved:
- Monmouth HHW household batteries: county acceptable page, guide pp. 3/6/14 and the Asbury Park page all say rechargeable, button and car batteries ARE accepted. The "household batteries" unacceptable entry most likely means alkaline (inference; phone-confirm). "Batteries prohibited" on the Reclamation Center page refers to dumping at the landfill.
- Appointment: none required for HHW.
- ZIP and hours: 07753; Tue/Wed/Fri 11-4, Sat 8-4; closed Mon/Thu/Sun and major holidays. The printed guide shows 07724, likely a typo.
- Latex paint at Monmouth HHW: not accepted (see c).

Unresolved:
- Monmouth guide aluminum foil is internally inconsistent; no foil rule added.
- Asbury Park web page and its 2022 PDF disagree (foil, pizza boxes); only the current web page was used, and only for undisputed items.
- The New Brunswick PDF schedule on the site is a stale 2021 version; not used.
- Monmouth cooking oil appears only in the HHW chart; no rule added.
- Monmouth sharps and smoke detector policies; Middlesex pizza-box-clean ("mostly not"): no rule added.

## (e) Needs a human phone call or manual check

- Monmouth County Reclamation Center / HHW, 732-683-8686 (ext. 5210 or 8967): confirm battery types accepted (alkaline vs other), ZIP, hours, cooking oil, sharps, smoke detectors, and what the Battery flyer says.
- Middlesex County Division of Solid Waste Management, 732-745-4170: HHW event schedule, Woodbridge tire/cooking-oil/paint days and hours, shredding events.
- Edison Public Works, 732-248-7288: center hours and whether the electronics list goes beyond TVs, computers and printers.
- New Brunswick Recycling, 732-745-5059: second-Saturday dates.
- Asbury Park Public Works, 732-775-0900: foil and pizza box rules, drop-off center hours.
- NJ DEP e-waste, battery and bag-ban pages: a person should read them in a normal browser to confirm the state rules, including whether tablets are covered.
- Not yet researched: Woodbridge-specific town rules, Long Branch curbside rules beyond the drop-off center, and regional rules for the roughly 190 items with no verified county or town entry.

## (f) Web re-check pass (2026-10-06)

Every facility page and the main item-rule pages were re-fetched and compared with the stored data.
- Live PDFs for Edison 2026 (byte-identical to the saved copy), Long Branch 2026 (byte-identical) and New Brunswick 2026 (same text) match what the schedules were built from. The Asbury Park zone PDF was re-rendered and its table matches the zone rows.
- Fixed: Long Branch drop-off phone added (732-222-7000); Woodbridge center notes now say out-of-state plates are barred and list 732-634-4500; Woodbridge bulk note no longer contains an unsupported "yard sale Saturdays" sentence, the item list now follows the township page, and its "no fee listed" status is stated.
- Added from the re-read pages: 14 Asbury Park "not accepted" rules (foil, pizza boxes, cartons, ceramics, etc.) and 6 Monmouth HHW rules (gasoline in a certified can, oil filters, oxygen tanks, mercury thermostats and thermometers, spray paint).
- Could not re-check on the web: the Woodbridge calendar flipbook (page text empty; schedules rest on the earlier page-by-page reading), the Middlesex county FAQ (403 today; earlier saved copy used), the Middlesex guide (library-hosted copy), and the Monmouth 2025 guide (saved scan).
- Still not on any web page: Hopelawn and Menlo Park Terrace ZIPs; New Brunswick leaf-zone dates (printed map only).

## (g) Unreachable sources, retried 2026-10-13

Read this pass (primary documents):
- NJDEP e-waste FAQ (user-supplied PDF, Jan 18, 2024; saved in data/sources/njdep_ewastefaqs.pdf). The five state e-waste rules now cite it, and a `tablet` rule was added from it.
- Woodbridge township pages /800 (What Can I Recycle) and /1352 (NexTrex film bins): new town rules.
- Middlesex County HHW schedule PDF (fetched through the in-app browser, curl gets 403): `middlesex-hhw` facility and county rules, 2026 dates.
- Monmouth battery flyer: lithium-battery rule.

Still not read:
- monmouthcountynj.gov (403 from curl and the browser), Middlesex shredding flyer PDF (rule text came from the county page), NJ battery and bag-ban state pages, P.L.2016 c.87 text (Rutgers 404, LegiScan 403; the NJDEP FAQ supersedes it).

Middlesex HHW dates are for 2026 and go stale after Nov 15, 2026.

Spanish: every rule, schedule and facility note has a machine-drafted Spanish version (data/spanish.py, applied by data/apply_spanish.py). No human has reviewed it; `es_reviewed` stays false and the API serves it anyway by owner decision. Area labels and one-off date labels are English only.
