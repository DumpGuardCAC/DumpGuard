"""Build items_db.json from items_table.py plus the sourced overlays below.

Run:  python build_items_db.py
Then: python validate_items_db.py

Rules in ROWS are NJ-wide norms (draft). Overlay rules marked ver() were read in a primary
county or town document on 2026-10-06; add() rules stay needs_verification. See
VERIFICATION_REPORT.md and sources/SOURCES.md.
"""
import json
from pathlib import Path

from items_table import ROWS

MATERIAL = {
    "RP": "rigid_plastic", "SP": "soft_plastic_foam", "CP": "cardboard_paper",
    "ME": "metal", "GL": "glass", "EH": "ewaste_hazard", "OT": "other",
}
RULE = {"R": "recycling", "T": "trash", "S": "special_dropoff"}
PREP_EN = {
    "E": "Empty it", "R": "rinse it", "F": "flatten it", "N": "do not bag it",
    "C": "take the cap off", "D": "let it dry out completely", "X": "take the battery out",
}
PREP_ES = {
    "E": "Vacíelo", "R": "enjuáguelo", "F": "aplánelo", "N": "no lo ponga en bolsa",
    "C": "quítele la tapa", "D": "déjelo secar por completo", "X": "saque la batería",
}
HAZARD_EN = "Never put in the trash or recycling bin."
HAZARD_ES = "Nunca lo ponga en la basura ni en el reciclaje."
VARIES_EN = "Rules differ by town. Check your town's guide."
VARIES_ES = "Las reglas cambian según el pueblo. Revise la guía de su pueblo."

LIKELY_RESIN = {
    "plastic-water-bottle": "1", "plastic-soda-bottle": "1", "plastic-juice-bottle": "1",
    "milk-jug": "2", "detergent-bottle": "2", "shampoo-bottle": "2", "mouthwash-bottle": "1",
    "cooking-oil-bottle": "1", "yogurt-tub": "5", "deli-container": "5", "berry-clamshell": "1",
    "plastic-bag": "4", "plastic-shopping-bag": "4", "bread-bag": "4", "zip-bag": "4",
    "styrofoam-cup": "6", "styrofoam-takeout": "6", "packing-peanuts": "6", "foam-block": "6",
    "bleach-bottle": "2", "pill-bottle": "5",
}

ID_RENAME = {"pizza-crust": "cooked-food-bones", "cardboard-pallet-wood": "wood-pallet"}
MATERIAL_OVERRIDE = {"wood-pallet": "OT"}

# --- sourced overlays ---
# "verified" rules were read in a primary county or town document on 2026-10-06 (see
# sources/SOURCES.md). Rules added with add() stay needs_verification (secondary or
# unread sources only).
VERIFIED_ON = "2026-10-06"
S_MID_GUIDE = "https://www.woodbridgelibrary.org/DocumentCenter/View/30689/2026-Solid-Waste-Recycling-Guide"
S_MID_FAQ = "https://www.middlesexcountynj.gov/government/departments/department-of-public-safety-and-health/office-of-health-services/solid-waste-management-program/what-to-recycle"
S_MID_REC = "https://www.middlesexcountynj.gov/government/departments/department-of-public-safety-and-health/office-of-health-services/solid-waste-management-program/recycling"
S_MON_GUIDE = "https://springlakeboro.org/government/forms/public-works/83-monmouth-county-recycling-guide/file"
S_MON_GUIDE_CO = "https://co.monmouth.nj.us/documents/70/2025_Recycling-Guide-RevJune2025.pdf"
S_MON_HHW = "https://www.visitmonmouth.com/Page.aspx?Id=4371"
S_MON_ACC = "http://co.monmouth.nj.us/page.aspx?Id=4372"
S_MON_UNACC = "http://co.monmouth.nj.us/page.aspx?Id=4378"
S_MON_RC = "https://www.visitmonmouth.com/Page.aspx?Id=186"
S_MON_PAINT = "https://www.co.monmouth.nj.us/documents/70/Paint_Disposal.pdf"
S_EDISON_RC = "https://www.edisonnj.org/departments/public_works/recycling_regulations.php"
S_EDISON_CAL = "https://www.edisonnj.org/Departments/DPW/Garbage-Recycling%202026%20Calendar%20for%20web.pdf"
S_NB_ITEM = "https://www.cityofnewbrunswick.org/residents/departments/engineering_and_public_works/recycling_-_by_item.php"
S_NB_PAINT = "https://www.cityofnewbrunswick.org/residents/departments/engineering_and_public_works/recycling_-_paint___electronics.php"
S_LB_DROP = "https://longbranch.org/305/Voluntary-Recycling-Drop-Off-Center"
S_AP_GARB = "https://www.cityofasburypark.com/180/Garbage-Recycling"
S_AP_BULK = "https://www.cityofasburypark.com/182/Bulk-Waste-Electronics-Yard-Waste-More"

MON_HHW_NOTE = ("Take to the Monmouth County Household Hazardous Waste facility, 3211 Shafto Rd, Tinton Falls NJ 07753. "
                "Open Tue/Wed/Fri 11-4 and Sat 8-4. No appointment. Monmouth County residents only, bring ID. "
                "Confirm at 732-683-8686.")
MID_PLASTIC = "Plastic bottles, jars, jugs and tubs of one gallon or less go in the curbside bin."
MON_PLASTIC = "Curbside plastics: labeled #1 and #2 bottles and #5 containers (margarine tubs, yogurt cups). Pourable, one gallon or less."


# Extra search terms (plain words, brand names, common misspellings). Merged into each item's aliases.
EXTRA_ALIASES = {
    "foam-egg-carton": "styrofoam eggs carton, foam egg box",
    "frozen-food-bag": "frozen fruit bag, steam bag, ice bag",
    "foam-plate": "styrofoam dish, foam tray",
    "wax-paper": "wax paper, waxed paper roll",
    "parchment-paper": "baking parchment, cooking paper",
    "cupcake-liner": "cupcake cup, baking cup, muffin cup",
    "tissue-box": "kleenex box, tissue carton",
    "fire-extinguisher": "fire extinguisher, extinguisher canister",
    "microwave": "microwave oven, microwaves",
    "mercury-thermometer": "mercury thermometer, fever thermometer, old thermometer",
    "toner-cartridge": "toner, printer toner, laser cartridge",
    "eggshells": "egg shells, shells",
    "cat-litter": "cat litter, litter box, clumping litter",
    "plastic-water-bottle": "water bottles, plastic bottle, dasani, poland spring",
    "plastic-soda-bottle": "soda, sprite bottle, pepsi bottle",
    "milk-jug": "milk container, milk gallon",
    "plastic-takeout-container": "takeout container, take out, delivery container",
    "plastic-cup": "red cup, disposable cup",
    "plastic-shopping-bag": "plastic bag, plastic bags, shopping bags, walmart bag, grocery bags",
    "trash-bag": "garbage bag, bin bag, kitchen bag",
    "pizza-box-clean": "pizza boxes, cardboard pizza",
    "pizza-box-greasy": "greasy pizza box, pizza box grease",
    "corrugated-box": "cardboard, cardboard box, boxes, amazon boxes, packing box",
    "newspaper": "newspapers, news paper",
    "aluminum-can": "aluminium can, can, cans, soda cans, red bull can, energy drink can",
    "steel-can": "steel can, tin, canned food can, can of beans",
    "aluminum-foil": "aluminium foil, foil",
    "glass-bottle": "glass bottles, jar glass, sauce bottle",
    "glass-jar": "glass jars, mason jar, jelly jar",
    "broken-glass": "broken bottle, broken dish, glass pieces",
    "alkaline-battery": "batteries, double a, triple a, duracell, energizer",
    "lithium-battery": "lithium battery, li ion battery, lithium cell",
    "cell-phone": "phone, mobile phone, old phone, cellphone",
    "television": "television set, flatscreen, old tv, plasma tv",
    "computer-monitor": "monitor, computer screen, pc monitor",
    "desktop-computer": "computer, desktop pc, pc tower",
    "laptop": "laptop computer, notebook computer, old laptop",
    "latex-paint-wet": "paint, wet latex paint, liquid paint, leftover paint",
    "motor-oil": "car engine oil, used motor oil, oil change",
    "medications": "medicine, expired medicine, prescription drugs, pill",
    "sharps": "needles, syringes, syringe, needle",
    "food-scraps": "food waste, leftover food, scraps",
    "leaves": "leaf, yard leaves, raked leaves",
    "tree-branches": "branches, brush, twigs, sticks",
    "christmas-tree": "real christmas tree, holiday tree, fir tree",
    "mattress": "mattresses, bed mattress, boxspring",
    "furniture": "sofa, bookcase, bed frame, wooden furniture",
    "tires": "tire, car tires, wheel tire",
    "diaper": "diapers, nappy, nappies",
    "clothing": "clothes, old clothes, donate clothes, textiles",
    "refrigerator": "refrigerators, old fridge, mini fridge, freezer unit",
    "toothbrush": "tooth brush, manual toothbrush",
    "pill-bottle": "pill bottles, orange bottle, medicine container",
    "propane-cylinder": "propane tank, propane canister, grill tank, camping gas",
    "kcup-pod": "k cup, coffee capsule, nespresso pod",
    "ceramic-mug": "coffee mug, ceramic plate, dishes, dinnerware",
    "styrofoam-cup": "foam cup, styro cup",
    "styrofoam-takeout": "foam container, foam clamshell",
    "bubble-wrap": "bubble wrapping, packing wrap",
    "packing-peanuts": "foam peanuts, loose fill",
    "shredded-paper": "shredded documents, paper shreds",
    "junk-mail": "junk mail, circulars, catalogs mail",
    "paper-cup": "paper coffee cup, disposable coffee cup, dunkin cup",
    "wet-wipes": "wipes, disinfecting wipes, clorox wipes, lysol wipes",
    "vape": "vaporizer, e cigarette, disposable vape, vape pen",
    "game-console": "gaming console, video game console, ps5, switch console",
    "hard-drive": "external hard drive, usb stick, usb drive, memory card",
    "cables-cords": "cables, chargers, cords, charging cable, phone charger, wires",
    "holiday-lights": "string lights, xmas lights, led string lights",
    "smoke-detector": "smoke detectors, fire alarm, co detector",
    "washer-dryer": "washer, dryer, stove, dishwasher, appliance",
    "air-conditioner": "air conditioning, a/c, portable ac",
    "pesticide": "pesticides, herbicide, ant killer, rat poison, bug killer",
    "household-cleaner": "cleaning products, drain opener, bleach cleaner",
    "gasoline": "petrol, gas can fuel, lawnmower gas",
    "antifreeze": "anti freeze, engine coolant",
    "cooking-oil-used": "used cooking oil, fryer oil, bacon grease, deep fryer oil",
    "coffee-grounds": "used coffee, coffee filter, teabag",
    "grass-clippings": "grass, lawn cuttings, cut grass",
    "worn-clothing": "torn clothes, stained clothes, old rags",
    "shoes": "shoe, trainers, old shoes, footwear",
    "bedding-towels": "bedding, linens, comforter, bath towel",
    "carpet": "carpets, area rug, floor carpet",
    "lumber": "wood, wood scraps, timber, plywood scraps",
    "drywall": "dry wall, gypsum board, concrete debris",
    "car-parts": "car part, auto part, exhaust, muffler",
    "eyeglasses": "eye glasses, sunglasses, prescription glasses",
    "wood-pallet": "wooden pallet, shipping pallet",
    "baby-bottle": "feeding bottle, formula bottle",
    "bread-bag": "bread wrapper, bakery bag",
    "produce-bag": "fruit bag, vegetable bag, clear bag",
    "candy-wrapper": "wrapper, snack bar wrapper, chocolate wrapper",
    "rubber-band": "hair tie, elastic",
    "paper-plate": "paper plates, disposable paper plate",
    "cardboard-tube": "cardboard roll, wrapping paper tube",
}

OVERLAY = {}


# A rule whose note sends people to a place gets that place's key from towns.json (facilities[].key), so the app can
# show the address, hours and residency requirements from one source.
FACILITY_MARKERS = (
    ("Monmouth County Household Hazardous Waste", "monmouth-hhw"),
    ("3211 Shafto Rd", "monmouth-hhw"),
    ("Edison Recycling Center, 745", "edison-recycling-center"),
    ("Middlesex County Household Hazardous Waste Drop-Off Days", "middlesex-hhw"),
    ("Woodbridge Recycling Center, 225", "woodbridge-recycling-center"),
    ("Voluntary Recycling Drop Off Center", "long-branch-drop-off"),
    ("Asbury Park Recycling Center", "asbury-park-recycling-center"),
    ("400 Jersey Ave", "new-brunswick-second-saturday"),
)


def facility_for(rule, note):
    if rule != "special_dropoff" or note.startswith("Not accepted"):
        return None
    for marker, key in FACILITY_MARKERS:
        if marker in note:
            return key
    return None


def _put(item_id, region, rule, note, source, evidence, verified, on=None):
    OVERLAY.setdefault(item_id, {})[region] = {
        "facility": facility_for(rule, note),
        "rule": rule, "note": {"en": note, "es": ""},
        "status": "verified" if verified else "needs_verification",
        "source": source, "last_verified": (on or VERIFIED_ON) if verified else None, "evidence": evidence,
    }


def add(item_id, region, rule, note, source, evidence):
    _put(item_id, region, rule, note, source, evidence, False)


def ver(item_id, region, rule, note, source, evidence, on=None):
    _put(item_id, region, rule, note, source, evidence, True, on)


PLASTIC_BOTTLES = ("plastic-water-bottle", "plastic-soda-bottle", "plastic-juice-bottle", "milk-jug",
                   "detergent-bottle", "shampoo-bottle", "mouthwash-bottle", "cooking-oil-bottle",
                   "bleach-bottle", "condiment-squeeze-bottle")
ELECTRONICS = ("television", "desktop-computer", "computer-monitor", "printer", "laptop")
STATE_EW = ELECTRONICS + ("tablet",)

# ---- Middlesex County (county guide + county web pages) ----
for i in PLASTIC_BOTTLES + ("yogurt-tub", "peanut-butter-jar-plastic"):
    ver(i, "middlesex", "recycling", MID_PLASTIC, S_MID_GUIDE,
        "2026 Middlesex County guide, accepted curbside list: plastic bottles, jars, jugs, tubs 1 gal or less")
ver("plastic-shopping-bag", "middlesex", "trash",
    "Plastic bags and film do not go in the recycling bin. Put them in the regular garbage.", S_MID_FAQ,
    "County What to Recycle FAQ: plastic bags go to regular garbage; guide lists bags/film as not accepted")
for i in ("plastic-cup", "plastic-cutlery"):
    ver(i, "middlesex", "trash", "Plastic cups and utensils do not go in the recycling bin.", S_MID_GUIDE,
        "2026 Middlesex County guide, not-accepted list: cups, utensils")
for i in ("styrofoam-cup", "styrofoam-takeout", "foam-block", "foam-meat-tray", "foam-plate", "foam-egg-carton"):
    ver(i, "middlesex", "trash", "Styrofoam and foam do not go in the recycling bin.", S_MID_GUIDE,
        "2026 Middlesex County guide, not-accepted list: styrofoam; county FAQ: foam egg cartons not accepted")
ver("shredded-paper", "middlesex", "trash", "Shredded paper does not go in the bin. Put it in the trash or compost it.", S_MID_FAQ,
    "County What to Recycle FAQ: shredded paper not in bin, trash or compost")
ver("frozen-food-box", "middlesex", "trash",
    "Frozen food boxes generally should not be recycled because of the waxy coating.", S_MID_FAQ,
    "County What to Recycle FAQ: frozen food boxes generally should not be recycled")
ver("pizza-box-greasy", "middlesex", "trash", "Greasy or food-soiled paper and cardboard does not go in the bin.", S_MID_GUIDE,
    "2026 Middlesex County guide, not-accepted list: greasy items")
ver("paper-egg-carton", "middlesex", "recycling", "Paper egg cartons are accepted. Plastic and foam cartons are not.", S_MID_FAQ,
    "County What to Recycle FAQ: paper egg cartons yes, plastic and foam no")
for i in ("drinking-glass", "mirror"):
    ver(i, "middlesex", "trash", "Dishware, drinking glasses and mirrors do not go in the recycling bin.", S_MID_GUIDE,
        "2026 Middlesex County guide, not-accepted list: dishware, glass, mirrors")
for i, ev in (("aluminum-can", "cans"), ("steel-can", "cans"), ("glass-bottle", "glass bottles and jars"),
              ("glass-jar", "glass bottles and jars"), ("newspaper", "newspaper"),
              ("corrugated-box", "corrugated cardboard"), ("cereal-box", "cereal boxes"),
              ("paperback-book", "softcover books")):
    ver(i, "middlesex", "recycling", "Accepted in the curbside bin. Do not bag recyclables.", S_MID_GUIDE,
        "2026 Middlesex County guide, accepted curbside list: " + ev)
ver("alkaline-battery", "middlesex", "trash", "Alkaline batteries (AA, AAA, C, D, 9V) go in the regular trash.", S_MID_GUIDE,
    "2026 Middlesex County guide, batteries section: alkaline batteries trash")
for i in ("rechargeable-battery", "button-battery"):
    ver(i, "middlesex", "special_dropoff",
        "Never put in trash or curbside recycling. Take to a battery drop-off or a Middlesex County Household Hazardous Waste day.",
        S_MID_GUIDE, "2026 Middlesex County guide, batteries section: rechargeable and button batteries to drop-off or HHW")

# ---- Middlesex County HHW drop-off days (2026 schedule PDF, read 2026-10-13) ----
S_MID_HHW = "https://www.middlesexcountynj.gov/home/showpublisheddocument/9531/639071131240300000"
MID_HHW_NOTE = "Take to a Middlesex County Household Hazardous Waste Drop-Off Days event (free, county residents only, 8 a.m.-2 p.m.; 2026 dates Mar 15, May 16, Jun 28, Sep 19, Nov 15). Keep it in its original container, none over 10 gallons."
for i in ("latex-paint-wet", "oil-paint", "motor-oil", "used-oil-filter", "antifreeze", "gasoline", "pesticide", "pool-chemicals",
          "household-cleaner", "solvents", "propane-cylinder", "fire-extinguisher", "aerosol-partial", "fluorescent-tube",
          "car-battery", "thermostat-mercury", "mercury-thermometer"):
    ver(i, "middlesex", "special_dropoff", MID_HHW_NOTE, S_MID_HHW,
        "Middlesex County HHW 2026 schedule flyer: accepted list includes this item (paints, motor oil and filters, antifreeze, gasoline, pesticides, pool chemicals, cleaners, propane tanks, fire extinguishers, aerosols, fluorescent bulbs, car batteries, thermostats, thermometers)", "2026-10-13")
for i in ("rechargeable-battery", "button-battery"):
    ver(i, "middlesex", "special_dropoff",
        "Never put in trash or curbside recycling. Take to a Middlesex County Household Hazardous Waste Drop-Off Days event (free, county residents only, 8 a.m.-2 p.m.; 2026 dates Mar 15, May 16, Jun 28, Sep 19, Nov 15). Bag each battery or tape its terminals.",
        S_MID_HHW, "Middlesex County HHW 2026 schedule flyer: rechargeable and button cell batteries accepted, individually bagged or terminals taped", "2026-10-13")
ver("tires", "middlesex", "special_dropoff",
    "Not accepted at Middlesex County hazardous waste days. The county has a separate tire drop-off program; ask your town too.", S_MID_HHW,
    "Middlesex County HHW 2026 schedule flyer, what not to bring: tires; County recycling page lists a Tire Drop-Off program", "2026-10-13")

# ---- Monmouth County (county guide, HHW pages, Reclamation Center page) ----
for i in PLASTIC_BOTTLES:
    ver(i, "monmouth", "recycling", MON_PLASTIC, S_MON_GUIDE,
        "2025 Monmouth County Recycling Guide, plastics section: #1 and #2 bottles, pourable, 1 gal or less")
ver("yogurt-tub", "monmouth", "recycling", MON_PLASTIC, S_MON_GUIDE,
    "2025 Monmouth County Recycling Guide, plastics section: #5 containers such as margarine tubs and yogurt cups")
ver("alkaline-battery", "monmouth", "trash", "Alkaline batteries (AA, AAA, C, D, 9V) go in the regular trash.", S_MON_GUIDE,
    "2025 Monmouth County Recycling Guide, batteries: alkaline to trash; county HHW unacceptable list")
for i in ("rechargeable-battery", "button-battery", "car-battery"):
    ver(i, "monmouth", "special_dropoff", MON_HHW_NOTE, S_MON_ACC,
        "County HHW acceptable-items page lists rechargeable, button and car batteries; guide pp. 3, 6, 14")
for i in ("oil-paint", "motor-oil", "antifreeze", "pesticide", "solvents", "fertilizer",
          "household-cleaner", "fire-extinguisher", "propane-cylinder", "fluorescent-tube"):
    ver(i, "monmouth", "special_dropoff", MON_HHW_NOTE, S_MON_ACC,
        "County HHW acceptable-items page and 2025 Monmouth guide HHW chart")
for i, extra in (("gasoline", " Gasoline only in a certified gas can."), ("used-oil-filter", ""), ("oxygen-tank", ""),
                 ("thermostat-mercury", ""), ("mercury-thermometer", ""), ("aerosol-partial", " Spray paint is accepted.")):
    ver(i, "monmouth", "special_dropoff", MON_HHW_NOTE + extra, S_MON_ACC,
        "County HHW acceptable-items page (re-read 2026-10-06): lists gasoline in a certified can, used oil filters, oxygen tanks, mercury devices (thermostats, thermometers) and spray paint")
S_MON_BAT = "https://www.co.monmouth.nj.us/documents/70/Battery_Disposal_Flyer_2024.pdf"
ver("lithium-battery", "monmouth", "special_dropoff", MON_HHW_NOTE + " Bag each battery or tape its terminals first.", S_MON_BAT,
    "Monmouth County Battery Disposal flyer 2024 (read as an image 2026-10-13): single-use lithium and button cell batteries go to the local household hazardous waste center; bag or tape terminals", "2026-10-13")

ver("latex-paint-wet", "monmouth", "trash",
    "Latex paint is NOT accepted at Monmouth HHW. Dry it out completely, then put the open can in the trash.", S_MON_PAINT,
    "County Paint Disposal flyer and HHW unacceptable-items page: latex paint not accepted, dry and trash")
ver("latex-paint-dry", "monmouth", "trash", "Dried-out latex paint can goes in the regular trash with the lid off.", S_MON_PAINT,
    "County Paint Disposal flyer: dry latex paint to trash")
ver("cfl-bulb", "monmouth", "special_dropoff",
    "Not accepted at county HHW. Take CFLs to a retailer that recycles them, such as Lowes or Home Depot.", S_MON_UNACC,
    "County HHW unacceptable-items page and 2025 Monmouth guide: CFLs to Lowes or Home Depot")
ver("led-bulb", "monmouth", "trash", "LED bulbs go in the regular trash.", S_MON_GUIDE,
    "2025 Monmouth County Recycling Guide: LED bulbs trash")
for i in ELECTRONICS + ("keyboard-mouse",):
    ver(i, "monmouth", "special_dropoff",
        "Not accepted at county HHW. Use your town's electronics drop-off or a manufacturer or retailer program.", S_MON_UNACC,
        "County HHW unacceptable-items page: electronics not accepted")

# ---- Edison ----
ver("plastic-shopping-bag", "edison", "trash", "Plastic bags go in the garbage, never in the recycling container.", S_EDISON_RC,
    "Edison recycling regulations page: plastic bags should be thrown away in your garbage")
for i in ELECTRONICS:
    ver(i, "edison", "special_dropoff",
        "Take to the Edison Recycling Center, 745 New Durham Rd, Mon-Sat 6:30 am-2 pm. Proof of residency required.", S_EDISON_CAL,
        "Edison 2026 calendar guide, drop-off center list: electronics (e.g., TVs, computers, printers)")
for i in ("oil-paint", "latex-paint-wet", "tires", "car-battery"):
    ver(i, "edison", "special_dropoff",
        "Not accepted at the Edison Recycling Center. Use the county household hazardous waste, tire or battery programs.",
        S_EDISON_CAL, "Edison 2026 calendar guide, unacceptable drop-off items: paint and HHW, tires, car batteries")

# ---- New Brunswick ----
ver("shredded-paper", "new-brunswick", "trash",
    "Home-shredded paper is trash. It is recyclable only at a Middlesex County paper shredding event.", S_NB_ITEM,
    "City Recycling - By Item page, Paper Shredding")
ver("cooking-oil-used", "new-brunswick", "trash",
    "Do not pour in the sink. Let it solidify, seal it and put it in household trash.", S_NB_ITEM,
    "City Recycling - By Item page, Used Cooking Oil/Grease")
ver("motor-oil", "new-brunswick", "special_dropoff",
    "Up to 30 quarts a year per resident at DPW Central Garage, 400 Jersey Ave, Mon-Fri 8-3. Call 732-745-5059.", S_NB_ITEM,
    "City Recycling - By Item page, Motor Oil Recycling")
for i in ELECTRONICS:
    ver(i, "new-brunswick", "special_dropoff",
        "City residents: drop off the second Saturday of each month, 8 am-12 pm, at 400 Jersey Ave.", S_NB_PAINT,
        "City Electronics & Paint (2nd Saturday) page: laptops, desktops, monitors, printers, TVs")
ver("latex-paint-wet", "new-brunswick", "special_dropoff",
    "County residents: second Saturday of each month, 8 am-12 pm, at 400 Jersey Ave. Label all paint.", S_NB_PAINT,
    "City Electronics & Paint (2nd Saturday) page: latex paint accepted")
ver("oil-paint", "new-brunswick", "special_dropoff",
    "County residents: second Saturday of each month, 8 am-12 pm, at 400 Jersey Ave. Label all paint.", S_NB_PAINT,
    "City Electronics & Paint (2nd Saturday) page: oil-based paint accepted")
ver("latex-paint-dry", "new-brunswick", "trash", "Dried-out latex paint can goes in the regular trash.", S_NB_PAINT,
    "City Electronics & Paint (2nd Saturday) page: dried latex paint can be disposed in regular trash")
ver("tires", "new-brunswick", "special_dropoff",
    "Take to a Middlesex County Tire Recycling Center (East Brunswick, Metuchen, Plainsboro, Woodbridge). Call 732-745-4170.",
    S_NB_ITEM, "City Recycling - By Item page, Tire Recycling")

# ---- Long Branch ----
for i in ELECTRONICS:
    ver(i, "long-branch", "special_dropoff",
        "Not collected at the curb. Take to the Voluntary Recycling Drop Off Center, 378 Atlantic Ave. Mon-Fri 7:30-3, Sat 9-1.",
        S_LB_DROP, "City Voluntary Recycling Drop Off Center page: TVs, computers, monitors, printers, laptops")

# ---- Asbury Park ----
for i in ("television", "desktop-computer", "computer-monitor", "printer"):
    ver(i, "asbury-park", "special_dropoff",
        "Not collected curbside. Take to the Asbury Park Recycling Center, 9 Main St (Springwood Ave entrance). Mon-Fri 4-8 pm, Sat-Sun 10 am-2 pm.",
        S_AP_BULK, "City Bulk Waste, Electronics page, Electronics Disposal: TVs, computers, monitors, printers")
ver("alkaline-battery", "asbury-park", "trash", "Single-use alkaline batteries may go in household trash.", S_AP_BULK,
    "City Bulk Waste, Electronics page, Battery Disposal: single-use alkaline in household trash")
for i in ("rechargeable-battery", "button-battery", "car-battery"):
    ver(i, "asbury-park", "special_dropoff",
        "Not collected curbside. Free drop-off at the Monmouth County Reclamation Center, 3211 Shafto Rd, Tinton Falls. Call 732-683-8686.",
        S_AP_BULK, "City Bulk Waste, Electronics page, Battery Disposal: rechargeable, button, car batteries to Reclamation Center")
ver("plastic-shopping-bag", "asbury-park", "trash", "Plastic bags go in the regular garbage.", S_AP_GARB,
    "City Garbage & Recycling page, garbage list: plastic bags")
ver("incandescent-bulb", "asbury-park", "trash", "Light bulbs go in the regular garbage.", S_AP_GARB,
    "City Garbage & Recycling page, garbage list: light bulbs")
ver("mirror", "asbury-park", "trash", "Mirrors go in the regular garbage.", S_AP_GARB,
    "City Garbage & Recycling page, garbage list: mirrors")
ver("drinking-glass", "asbury-park", "trash", "Drinking glasses are not accepted in recycling.", S_AP_GARB,
    "City Garbage & Recycling page, not accepted: drinking glasses")
ver("shredded-paper", "asbury-park", "trash", "Shredded paper is not accepted in recycling.", S_AP_GARB,
    "City Garbage & Recycling page, not accepted: shredded paper")
for i in ("styrofoam-cup", "styrofoam-takeout"):
    ver(i, "asbury-park", "trash", "Styrofoam is not accepted in recycling.", S_AP_GARB,
        "City Garbage & Recycling page, not accepted: styrofoam")

# Asbury Park, re-read 2026-10-06: the "Not Accepted in Recycling" and garbage lists name these items.
AP_EV = "City Garbage & Recycling page, "
for i, what, where in (
    ("aluminum-foil", "Aluminum foil is not accepted in recycling.", "not accepted: aluminum foil or plates"),
    ("foil-pan", "Aluminum foil plates and pans are not accepted in recycling.", "not accepted: aluminum foil or plates"),
    ("pizza-box-greasy", "Food-soiled cardboard such as pizza boxes is not accepted in recycling.", "not accepted: food-soiled or waxed cardboard (pizza boxes)"),
    ("cardboard-greasy", "Food-soiled or waxed cardboard is not accepted in recycling.", "not accepted: food-soiled or waxed cardboard"),
    ("milk-carton", "Milk and juice cartons are not accepted in recycling.", "not accepted: milk or juice cartons"),
    ("juice-box", "Milk and juice cartons are not accepted in recycling.", "not accepted: milk or juice cartons"),
    ("broken-glass", "Broken glass is not accepted in recycling.", "not accepted: broken glass"),
    ("ceramic-mug", "Ceramics, dishes and pottery are not accepted in recycling.", "not accepted and garbage list: ceramics, dishes, porcelain, pottery"),
    ("pyrex", "Glass cookware and bakeware go in the regular garbage.", "garbage list: glass cookware/bakeware"),
    ("window-glass", "Window glass goes in the regular garbage.", "garbage list: window or auto glass"),
    ("wire-hanger", "Coat hangers go in the regular garbage.", "garbage list: coat hangers"),
    ("paper-napkin", "Used tissues and napkins are not accepted in recycling.", "not accepted: used tissues or napkins"),
    ("tissue", "Used tissues and napkins are not accepted in recycling.", "not accepted: used tissues or napkins"),
    ("plastic-wrap", "Plastic wrap and bags are not accepted in recycling.", "not accepted: plastic bags, wrap"),
):
    ver(i, "asbury-park", "trash", what, S_AP_GARB, AP_EV + where)

# ---- State e-waste law (read on a municipal page quoting the Act) and Monmouth bags (county press release) ----
S_LB_EW = "https://longbranch.org/296/NJ-Electronics-Waste-Management-Act"
S_NJDEP_EW = "https://www.nj.gov/dep/dshw/ewaste/ewastefaqs.pdf"
S_MON_PRESS = "https://www.visitmonmouth.com/PressDetail.aspx?ID=2588"
for i in STATE_EW:
    ver(i, "nj", "special_dropoff",
        "New Jersey law bans putting this in the trash. Drop it off for free at a manufacturer-plan collection site (many towns and retailers run one); some sites have limits, so call first.",
        S_NJDEP_EW, "NJDEP E-Waste FAQ (Jan 18, 2024, read from the saved PDF): covered electronic devices are desktop or personal computers, computer monitors, portable computers, desktop printers, desktop fax machines and televisions sold to a consumer; a tablet is a portable computer and a CED; the law bans disposal of CEDs; sites in a manufacturer plan may not charge consumers")
# keyboards and mice are not among the six covered devices, so no state rule is shown for them.
ver("plastic-shopping-bag", "monmouth", "trash",
    "Never put plastic bags in the recycling. Reuse them, or take them to a store bag drop-off; otherwise they go in the garbage.", S_MON_PRESS,
    "Monmouth County press release: plastic bags of any kind should not be placed in recycling; residents can reuse them or take them to a local retailer or grocery store")


# ---- Woodbridge Township (Public Works "What Can I Recycle" and NexTrex pages, read 2026-10-13) ----
S_WB_WHAT = "https://www.twp.woodbridge.nj.us/800/What-Can-I-Recycle"
S_WB_FILM = "https://www.twp.woodbridge.nj.us/1352/NexTrex-Plastic-Film-Bags-Recycling"
WB_ON = "2026-10-13"
WB_CTR = "Woodbridge Recycling Center, 225 Smith St, Keasbey (Mon-Sat 8 a.m.-2 p.m.)"
WB_EV = "Township What Can I Recycle page: "
for i, what, extra in (
    ("cooking-oil-used", "Cooking oil", " Cool it, pour it into a sturdy capped container, do not mix it with other liquids."),
    ("motor-oil", "Motor oil and antifreeze", ""), ("antifreeze", "Motor oil and antifreeze", ""),
    ("latex-paint-wet", "Paints, stains and aerosols", ""), ("oil-paint", "Paints, stains and aerosols", ""),
    ("propane-cylinder", "Propane tanks", ""), ("rechargeable-battery", "Rechargeable batteries only", ""),
    ("shredded-paper", "Shredded paper", ""), ("eyeglasses", "Eyeglasses and sunglasses", ""),
    ("hardcover-book", "Hard covered books", ""),
    ("tires", "Tires", " Limit 4 tires a month."),
    ("foam-block", "Styrofoam", " Check the township Styrofoam Recycling Program page for what is accepted."),
):
    ver(i, "woodbridge", "special_dropoff", f"Take to the {WB_CTR}.{extra}", S_WB_WHAT, WB_EV + what + ": at the Recycling Center in Keasbey", WB_ON)
for i, what in (("tree-branches", "Branches"), ("plastic-bucket", "Bulky rigid plastics"), ("laundry-basket", "Bulky rigid plastics"),
                ("scrap-metal", "Mixed metal")):
    ver(i, "woodbridge", "special_dropoff", f"Take to the {WB_CTR}, or call the township for a free curbside pick-up.", S_WB_WHAT,
        WB_EV + what + ": at the Recycling Center in Keasbey or call for a free curbside pick up", WB_ON)
for i in ELECTRONICS:
    ver(i, "woodbridge", "special_dropoff", f"Required e-waste. Take to the {WB_CTR}, or call the township for a free curbside pick-up.", S_WB_WHAT,
        WB_EV + "Electronic Waste (computers, TVs, printers): at the Recycling Center in Keasbey or call for a free curbside pick up; the Center page also lists monitors, laptops and fax machines", WB_ON)
for i in ("refrigerator", "washer-dryer", "air-conditioner"):
    ver(i, "woodbridge", "special_dropoff", f"Take to the {WB_CTR}. Curbside pick-up is available for a fee.", S_WB_WHAT,
        WB_EV + "Appliances: at the Recycling Center in Keasbey, curbside pick up available for a fee", WB_ON)
ver("leaves", "woodbridge", "special_dropoff",
    f"Take to the {WB_CTR}, or use the free curbside leaf-bag pick-up dates on your calendar.", S_WB_WHAT,
    WB_EV + "Leaves: at the Recycling Center in Keasbey; check your calendar for free curbside leaf bag pick up dates", WB_ON)
ver("corrugated-box", "woodbridge", "recycling",
    "Curbside: break boxes down to fit in the blue recycling cart, or bring them to the Recycling Center in Keasbey.", S_WB_WHAT,
    WB_EV + "Cardboard: curbside, breakdown boxes to fit into the blue cart, or the Recycling Center", WB_ON)
for i in ("clothing", "worn-clothing", "bedding-towels"):
    ver(i, "woodbridge", "special_dropoff", f"Take to the {WB_CTR} or a local clothing drop box.", S_WB_WHAT,
        WB_EV + "Textiles: at the Recycling Center in Keasbey or at local clothing drop boxes", WB_ON)
for i in ("plastic-shopping-bag", "bread-bag", "produce-bag", "zip-bag", "bubble-wrap", "shrink-wrap"):
    ver(i, "woodbridge", "special_dropoff",
        f"Never put in the blue recycling cart. Drop clean, dry film at a NexTrex bin: Woodbridge Town Hall, Community Center, Senior Centers or the {WB_CTR}.",
        S_WB_FILM, "Township NexTrex page: plastic film (bags, produce and bread bags, bubble wrap, Ziploc bags) accepted at bins at Town Hall, Community Center, Recycle Center and Senior Centers; must be dry and free of food; cannot go in the blue tote. What Can I Recycle page also lists shrink wrap", WB_ON)

SOURCES_CONSULTED = [S_WB_WHAT, S_WB_FILM, S_MID_HHW, S_MON_BAT, S_NJDEP_EW, S_MID_GUIDE, S_MID_FAQ, S_MID_REC, S_MON_GUIDE, S_MON_GUIDE_CO, S_MON_HHW, S_MON_ACC,
                     S_MON_UNACC, S_MON_RC, S_MON_PAINT, S_EDISON_RC, S_EDISON_CAL, S_NB_ITEM, S_NB_PAINT,
                     S_LB_DROP, S_AP_GARB, S_AP_BULK, S_NJDEP_EW]


def merge_aliases(parts, name):
    out, seen = [], {name.lower()}
    for a in parts:
        a = a.strip()
        if a and a.lower() not in seen:
            seen.add(a.lower())
            out.append(a)
    return out


def build():
    items, seen = [], set()
    for line in ROWS:
        f = line.split("|")
        if len(f) != 8:
            raise SystemExit(f"bad row (need 8 fields): {line!r}")
        iid, en, es, aliases, mat, rule, prep, flags = f
        iid = ID_RENAME.get(iid, iid)
        if iid in seen:
            raise SystemExit(f"duplicate id {iid}")
        seen.add(iid)
        letters = prep + flags
        codes = [c for c in letters if c.isupper()]
        flag = set(c for c in letters if c.islower())
        material = MATERIAL[MATERIAL_OVERRIDE.get(iid, mat)]
        default_rule = RULE[rule]
        prep_en = ", ".join(PREP_EN[c] for c in codes if c in PREP_EN)
        prep_es = ", ".join(PREP_ES[c] for c in codes if c in PREP_ES)
        prep_en = (prep_en[0].upper() + prep_en[1:] + ".") if prep_en else ""
        prep_es = (prep_es[0].upper() + prep_es[1:] + ".") if prep_es else ""
        if "h" in flag and default_rule == "special_dropoff":
            prep_en = (prep_en + " " + HAZARD_EN).strip()
            prep_es = (prep_es + " " + HAZARD_ES).strip()
        if "v" in flag:
            prep_en = (prep_en + " " + VARIES_EN).strip()
            prep_es = (prep_es + " " + VARIES_ES).strip()
        item = {
            "id": iid,
            "name": {"en": en, "es": es},
            "aliases": merge_aliases(aliases.split(",") + EXTRA_ALIASES.get(iid, "").split(","), en),
            "material": material,
            "default_rule": default_rule,
            "likely_resin": LIKELY_RESIN.get(iid),
            "hazard": "h" in flag,
            "varies_by_town": "v" in flag,
            "prep": {"en": prep_en, "es": prep_es},
            "status": "draft",
            "es_reviewed": False,
            "county_rules": OVERLAY.get(iid, {}),
        }
        items.append(item)
    bad = set(EXTRA_ALIASES) - seen
    if bad:
        raise SystemExit(f"EXTRA_ALIASES references unknown ids: {sorted(bad)}")
    missing = set(OVERLAY) - seen
    if missing:
        raise SystemExit(f"overlay references unknown ids: {sorted(missing)}")
    return items


if __name__ == "__main__":
    items = build()
    db = {
        "_meta": {
            "version": "0.3.0",
            "schema": "see ITEMS_DB.md",
            "note": ("DRAFT. default_rule values are NJ-wide norms. Overlay rules with status verified were read in a primary "
                     "county or town document on 2026-10-06 (see VERIFICATION_REPORT.md). Everything else needs verification."),
            "sources_consulted": SOURCES_CONSULTED,
            "count": len(items),
        },
        "items": items,
    }
    out = Path(__file__).with_name("items_db.json")
    out.write_text(json.dumps(db, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {len(items)} items to {out}")
