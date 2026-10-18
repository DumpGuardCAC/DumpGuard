# DumpGuard towns research v5 — final report

Generated from `data/towns_research_v5.json` (33 towns). Same shape as v4. `data/towns.json` and `data/merge_research.py` were **not** edited (merge still prefers v4 until you point it at v5).

**Score:** 569 publishable schedule rows (shapes a–d) · 44 held (mostly appointment / seasonal / non-shape patterns) · 0 biweekly weekday↔anchor mismatches · 0 ISO weekday mismatches.

**Passes:** 3 (Pass 1 scout+extract · Pass 2 verify+ZIP/dropoff · Pass 3 pure verify + holiday gap + Aberdeen calendar).

**Agents used:** ~16 Task sub-agents (3 scouts, 2 extractors, 3 Pass-2 verifiers/gap, 4 Pass-3, 1 Aberdeen extract, 1 final verify) plus lead-agent local patch/verify scripts.

---

## 1. Per-town table

| Town | Trash | Recycling | Zones | Verified | Held | Held (one line each) |
|---|---|---|---|---:|---:|---|
| aberdeen | y | y | Section I/II trash + biweekly recycling | 8 | 0 | — |
| allenhurst | y | y | borough-wide | 12 | 1 | yard seasonal (Sep–Dec loose leaves) |
| atlantic-highlands | y | y | Zones 1–4 | 31 | 1 | yard seasonal (within 5 days of pickup) |
| bradley-beach | y | y | Zone 1/2/3 + all-zone recycling | 28 | 2 | yard seasonal leaves; other by-appointment e-waste |
| carteret | y | y | Sanitation District A / Recycling Districts 1–6 | 24 | 0 | — |
| deal | y | y | borough-wide | 5 | 2 | bulk by appointment; yard not provided |
| fair-haven | y | y | all zones + warm-weather Fridays | 44 | 0 | — |
| hazlet | private | y | Zones 1–8 recycling | 80 | 2 | bulk by appointment (Z1–4 / Z5–8) |
| highland-park | y | y | North / South / Triangle / Business | 6 | 2 | bulk by appointment; yard seasonal leaves |
| highlands | y | y | Zones 1–4 | 7 | 1 | yard custom brush-by-zone Fridays |
| interlaken | y | y | borough-wide | 16 | 1 | other metals 4th Monday (call) |
| keansburg | y | y | south/north of Church Street | 5 | 1 | yard seasonal |
| keyport | y | y | Zones 1–4 trash; Z1–2 / Z3–4 recycling; leaf §§1–4 | 20 | 1 | other e-waste/metal by appointment |
| little-silver | y | y | Zone 1/2 | 6 | 2 | yard continuous brush Jan–Oct; leaves Nov 2–Dec 27 |
| loch-arbour | info | info | — (bulk ISO only) | 6 | 0 | — |
| matawan | y | y | Zones 1–4 | 16 | 1 | yard seasonal boroughwide brush |
| metuchen | y | y | NW/SW/SE/NE | 9 | 2 | bulk by appointment; yard seasonal |
| middletown | info | info | Recycle Coach only | 0 | 2 | bulk by appointment; yard seasonal |
| monmouth-beach | y | y | Zone 1/2 | 7 | 2 | bulk by appointment; yard Oct–Jan leaves |
| neptune-city | y | y | Zone 1/2 | 7 | 0 | — |
| neptune-township | y | y | A–D + Ocean Grove B/C; recycling A1–D2 | 17 | 3 | bulk seasonal; yard brush; yard leaves |
| oceanport | y | y | Garbage Dist 1/2 | 5 | 2 | bulk by appointment; e-waste by appointment |
| old-bridge | private | y | Wards 1–6 + exceptions | 7 | 0 | — |
| perth-amboy | info | info | — (no 2026 calendar) | 0 | 0 | — |
| piscataway | private | y | Mon/Tue/Wed sections | 3 | 1 | bulk by appointment |
| red-bank | y | y | East/West of Broad; borough recycling | 29 | 6 | yard Zones 1–5 “2nd full week” custom; Christmas trees seasonal |
| rumson | y | y | east/west Bingham; drive-in | 11 | 1 | bulk by appointment |
| sayreville | y | y | Sanitation Z1–3; MCIA Tue–Fri | 82 | 1 | yard seasonal leaf prose |
| sea-bright | y | y | borough-wide | 24 | 2 | Christmas trees Jan; appliance by appointment |
| south-amboy | y | y | street-map trash days; MCIA Fri | 5 | 0 | — |
| south-plainfield | private | y | Thu/Fri recycling districts | 10 | 2 | bulk by appointment; yard seasonal leaves |
| union-beach | y | y | Section A/B | 34 | 1 | other appliances/e-waste by appointment |
| west-long-branch | y | y | North/South | 5 | 2 | yard leaf window Nov 3–Dec 12; brush schedule prose |

**Trash column key:** `y` = verified weekday shapes · `private` = town says residents hire private haulers · `info` = town collects (or contracts) but no publishable static weekdays (see UNRESOLVABLE).

---

## 2. Changes from v4 → v5 to double-check

| Town | What changed | Source URL |
|---|---|---|
| **aberdeen** | Recycling: 2× every-other-week Wed rows, anchors `2026-01-07` (Section I) / `2026-01-14` (Section II); removed custom UNRESOLVABLE recycling | https://www.aberdeennj.org/DocumentCenter/View/3686 |
| **bradley-beach** | 6 holiday overrides Zone 1/2/3 trash makeups (NYD, Thanksgiving, Christmas, NYD 2027); notes mark zone-boundary UNRESOLVABLE | https://www.bradleybeachnj.gov/trash-recycling-information/ |
| **sayreville** | MCIA Thursday recycling `2026-01-01` → `2026-01-03`; reason `MCIA Thursday:` | https://www.sayreville.com/cn/webpage.cfm?tpid=18888 |
| **old-bridge** | Exact privatized-garbage quote; 4 ward-scoped recycling holiday overrides (Memorial/Thanksgiving/Christmas) | https://www.oldbridge.com/page/recycling-information/ · PDF https://5il.co/3symt |
| **hazlet** | 9 Zone-prefixed recycling holiday moves from Green Booklet | https://www.hazlettwp.org/DocumentCenter/View/10520/Green-Booklet-2026-PDF |
| **south-plainfield** | 2 recycling holiday overrides (Thanksgiving→11/28, Christmas→12/26) | https://www.southplainfieldnj.com/spnj/Departments/Departments/Recycling/Curbside |
| **piscataway** | Memorial Day Mon → Sat May 30 recycling override | 2026 recycling map PDF on piscatawaynj.org |
| **carteret** | 5 District A Mon→Tue holiday makeups (MLK, Presidents, Memorial, Labor, Columbus) | https://www.carteret.net/wp-content/uploads/2026/01/2026-Sanitation-Calendar.pdf |
| **perth-amboy** | Dropped 2025 Conrail weekday rows; informational trash + recycling custom | https://www.perthamboynj.org/government/departments/public_works |
| **middletown** | Informational recycling custom (trash custom already in v4) | https://www.middletownnj.org/571/Curbside-Garbage-Collection |
| **loch-arbour** | Informational recycling custom; bulk Mondays kept | https://www.locharbournj.us/trash-recycling |
| **red-bank** | Notes: yard “2nd FULL week” UNRESOLVABLE for shapes a–d; dropoff accepts filled | https://www.redbanknj.org/208/Public-Utilities |
| **Many towns** | `zips[].shared_with` recomputed across 33 towns; dropoff address/hours/accepts filled where town page states them | town DPW / recycling pages |

Also keep parallel `overrides` (`date`/`to`/`reason`) in sync with `holiday_overrides` — merge_research reads `overrides` only.

---

## 3. UNRESOLVABLE list

| What | Why | Exact URL |
|---|---|---|
| **middletown** static trash/recycling weekdays | Township publishes carts + Recycle Coach address lookup only; no 2026 static zone day PDF (legacy 2022 North/South calendars only) | https://www.middletownnj.org/571/Curbside-Garbage-Collection · https://www.middletownnj.org/583/Curbside-Recycling-Collection · https://www.middletownnj.org/collection |
| **perth-amboy** 2026 trash/recycling weekdays | City DPW collects, but no 2026 Holiday/Sanitation PDF on site (2025 PDF exists; not carried forward) | https://www.perthamboynj.org/government/departments/public_works |
| **loch-arbour** weekly trash/recycling weekdays | Village page lists 2026 bulk Mondays only; contacts name Deal for sanitation but do **not** republish Deal weekly days (Deal days not inferred) | https://www.locharbournj.us/trash-recycling · https://www.locharbournj.us/departments-services/pages/departments-services-contacts |
| **bradley-beach** distinct Zone 1 vs Zone 3 street boundaries | Pickup days published by Zone 1/2/3; street-sweeper page duplicates “LaReine Ave. to Lake Terrace” for Zone 1 and Zone 3; no zone polygon map | https://www.bradleybeachnj.gov/street-sweeper-schedule/ · https://www.bradleybeachnj.gov/trash-recycling-information/ |
| **red-bank** yard Zones 1–5 as publishable shapes | Source says brush/leaves during “2nd FULL week” Mon–Fri by zone — not 2nd weekday-of-month, and no definition for ISO expansion | https://www.redbanknj.org/208/Public-Utilities |
| **south-plainfield** who collects household trash | Curbside page is recycling-only; FAQ/DPW never state private haulers explicitly — informational row documents recycling-only publication | https://www.southplainfieldnj.com/spnj/Departments/Departments/Recycling/Curbside |

**Not UNRESOLVABLE (resolved in v5):** Aberdeen recycling (2026 Community Calendar biweekly anchors) · Bradley/Sayreville/Old Bridge/Hazlet/SP/Piscataway/Carteret holiday makeups with explicit dates · private-trash towns with town quotes (old-bridge, piscataway, hazlet).

---

## 4. Exit criteria checklist

| Criterion | Status |
|---|---|
| Every town trash AND recycling verified (a–d) **or** informational custom | **PASS** (33/33) |
| Zero weekday↔anchor disagreements; zero ISO wrong weekday | **PASS** (Pass 2 + final verify) |
| Multi-zone towns: every zone in every stream the town offers | **PASS with notes** — privatized-trash / borough-wide recycling / paired leaf sections documented; Bradley boundaries UNRESOLVABLE above |
| Holiday overrides zone-prefixed; original_date = zone regular weekday | **PASS** for all added overrides |
| Independent verifier over rows changed since v4: zero mismatches | **PASS** (`_verify_v5_pass3.py`, `_verify_v5_final.py`) |

---

## 5. Passes and agents

| Pass | Work | Agents (approx.) |
|---|---|---|
| 1 | Scout 7 trash-gap + 12 held-heavy + holiday/recycling towns; extract anchors (no-op) + holiday/info patches | 5 |
| 2 | Cold holiday verify; ZIP/dropoff/Red Bank gap; biweekly/ISO/zone verify | 3 |
| 3 | Pure change verify (+ Perth recycling fix); holiday gap adds; Aberdeen calendar last-chance + extract/fix; final verify | 5+ |
| Lead | Copy v4→v5, scorers, Aberdeen anchor fix, this report | — |

**Minimum 3 passes met; last pass was verification-focused** (with holiday/Aberdeen gap closes folded into Pass 3 before final cold verify).

---

## 6. Spanish

Deferred (lowest priority). `notes_es` not bulk-filled this wave.
