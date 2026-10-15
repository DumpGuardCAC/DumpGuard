# Sources relied on (retrieved 2026-10-06)

Copies of the primary county or town documents (or text extracted from them) that the verified rules in
build_items_db.py rely on. Scanned PDFs have no text layer; they were read as images.

| File | URL | Covers |
|---|---|---|
| middlesex_2026_guide_woodbridge_library.pdf, middlesex_2026_guide.txt | https://www.woodbridgelibrary.org/DocumentCenter/View/30689/2026-Solid-Waste-Recycling-Guide | Middlesex County 2026 guide: accepted and not-accepted curbside items, batteries, HHW, tires, paint |
| (not saved; read in browser) | https://www.middlesexcountynj.gov/government/departments/department-of-public-safety-and-health/office-of-health-services/solid-waste-management-program/what-to-recycle | County FAQ: plastic bags, shredded paper, frozen boxes, egg cartons, pizza boxes |
| (not saved; read in browser) | https://www.middlesexcountynj.gov/government/departments/department-of-public-safety-and-health/office-of-health-services/solid-waste-management-program/recycling | County Reduce, Reuse, Recycle page: accepted materials, HHW guidelines, paper shredding |
| monmouth_2025_recycling_guide_springlake.pdf, monmouth_guide_text.txt | https://springlakeboro.org/government/forms/public-works/83-monmouth-county-recycling-guide/file (county copy: https://co.monmouth.nj.us/documents/70/2025_Recycling-Guide-RevJune2025.pdf) | Monmouth County guide: plastics, batteries, LED bulbs, HHW chart |
| monmouth_hhw_page4371.txt | https://www.visitmonmouth.com/Page.aspx?Id=4371 | Monmouth HHW program page |
| monmouth_hhw_acceptable.txt | http://co.monmouth.nj.us/page.aspx?Id=4372 | HHW acceptable items |
| monmouth_hhw_unacceptable.txt | http://co.monmouth.nj.us/page.aspx?Id=4378 | HHW unacceptable items (latex paint, CFLs, electronics) |
| monmouth_reclamation_center_page186.txt | https://www.visitmonmouth.com/Page.aspx?Id=186 | Reclamation Center address, hours, residents-only ID rule |
| monmouth_paint_disposal_flyer.pdf | https://www.co.monmouth.nj.us/documents/70/Paint_Disposal.pdf | Latex paint: dry and trash; oil paint to HHW (scanned) |
| monmouth_battery_flyer_2024.pdf | https://www.co.monmouth.nj.us/documents/70/Battery_Disposal_Flyer_2024.pdf | Only headings legible; body text not relied on |
| edison_recycling_regulations.txt | https://www.edisonnj.org/departments/public_works/recycling_regulations.php | Edison curbside rules, plastic bags to garbage |
| edison_2026_calendar_guide.pdf, edison_2026_guide_text.txt | https://www.edisonnj.org/Departments/DPW/Garbage-Recycling%202026%20Calendar%20for%20web.pdf | Edison drop-off center accepted and unacceptable lists |
| nb_trash_recycling_info.txt | https://www.cityofnewbrunswick.org/residents/departments/engineering_and_public_works/trash_and_recycling_info_.php | New Brunswick general rules |
| nb_recycling_by_item.txt | https://www.cityofnewbrunswick.org/residents/departments/engineering_and_public_works/recycling_-_by_item.php | NB motor oil, tires, cooking oil, shredded paper |
| nb_electronics_paint.txt | https://www.cityofnewbrunswick.org/residents/departments/engineering_and_public_works/recycling_-_paint___electronics.php | NB second-Saturday electronics and paint |
| longbranch_drop_off.txt | https://longbranch.org/305/Voluntary-Recycling-Drop-Off-Center | Long Branch drop-off center and electronics |
| asburypark_garbage_recycling.txt | https://www.cityofasburypark.com/180/Garbage-Recycling | Asbury Park accepted and not-accepted lists |
| asburypark_bulk_electronics.txt | https://www.cityofasburypark.com/182/Bulk-Waste-Electronics-Yard-Waste-More | Asbury Park electronics and battery disposal |

Not readable (no rules verified from them): NJ DEP e-waste, battery and bag-ban pages (JS shell / 403);
Middlesex PDFs on middlesexcountynj.gov (403).

## Woodbridge Township (added 2026-10-06)

- woodbridge_2026_calendar_text.txt: text of the township 2026 Sanitation & Recycling Calendar (44 pages, linked from https://www.twp.woodbridge.nj.us/1272/Recycling-Calendar, flipbook PDF). Neighborhood trash/recycling days and all holiday weeks were read from the rendered month pages. Generated into towns.json by data/build_woodbridge.py.
- Township pages read: /776/Sanitation, /779/Recycling, /798/The-Convenience-and-Recycling-Center, /906/Questions-and-Answers. The 2017 bulk-pickup news post (AID=52) was not used because it is stale.

## New Brunswick 2026 schedule (added 2026-10-06)

- nb_2026_schedule_text.txt: text of the city "2026 Residential Collection Schedule" flyer (8 pages, English and Spanish), linked as "2026 Trash and Recycling Collection Schedule" from the trash_and_recycling_info_ page: https://www.cityofnewbrunswick.org/New%20Brunswick%202026%20Recycling_Trash%20(002).pdf. Zone map (p.1), month-by-month recycling dates (p.2) and trash holiday table (p.3) were read from the rendered pages. Generated into towns.json by data/build_newbrunswick.py. The Spanish half (p.5-8) was not reviewed.

## Long Branch 2026 calendar (added 2026-10-06)

- longbranch_2026_calendar.pdf: https://longbranch.org/DocumentCenter/View/4683/2026-Calendar (13 image-only month pages, Jan 2026 to Jan 2027, linked from https://longbranch.org/291/Garbage-Pickup). All pages read from rendered images: garbage and recycling days by zone, Wednesday bulk rotation, and the four NO PICKUP days. Generated into towns.json by data/build_longbranch.py. The recycling page (https://longbranch.org/298/Recycling-Pickup) describes the same four street areas in different words; the calendar legend was used.

## Edison garbage and Woodbridge street index (added 2026-10-06)

- Edison municipal garbage: same calendar PDF as above (edison_2026_calendar_guide.pdf), printed p.4 and monthly pages. The guide has no street-to-garbage-day list, so the app asks the resident for their garbage weekday. Generated by data/build_edison_garbage.py.
- Woodbridge street index and brush, leaf and Christmas-tree dates by zone: pages 35-42 of woodbridge_2026_calendar_text.txt. Parsed by data/parse_wb_index.py, written to towns.json (yard rows, zone:rd*-z*) and data/woodbridge_street_index.json by data/build_woodbridge_zones.py. The street list is machine-parsed from PDF text, not hand-read; spot check before publishing.
