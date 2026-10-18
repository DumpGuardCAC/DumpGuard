"""Adds the Middlesex County Household Hazardous Waste drop-off days to data/towns.json (facility key middlesex-hhw).
Source: county HHW 2026 schedule PDF, read 2026-10-13 (saved as sources/mid_hhw_schedule.pdf/.txt)."""
import json
from pathlib import Path

TOWNS = Path(__file__).with_name("towns.json")
SRC = "https://www.middlesexcountynj.gov/home/showpublisheddocument/9531/639071131240300000"

FAC = {
    "key": "middlesex-hhw",
    "region": "middlesex",
    "name": "Middlesex County Household Hazardous Waste Drop-Off Days",
    "address": "Rotating sites. 2026: Middlesex College, 2600 Woodbridge Ave, Edison 08837 (Sun Mar 15 and Sun Nov 15); Middlesex County Public Works, 97 Apple Orchard Ln, North Brunswick 08902 (Sat May 16); Old Bridge Recycling Center, 1 Old Bridge Plaza, Old Bridge 08857 (Sun Jun 28); Middlesex County Public Works, 750 Jernee Mill Rd, Sayreville 08872 (Sat Sep 19)",
    "zip": None,
    "phone": "732-745-4170",
    "hours": "8 a.m.-2 p.m. on event days, rain or shine",
    "residents_only": True,
    "accepts": ["ewaste_hazard"],
    "notes_en": "Free, Middlesex County residents only, residential material and license plates only, no commercial vehicles. No containers over 10 gallons. Stay in your vehicle with materials in the trunk or cargo area. Bring: adhesives, aerosol cans, antifreeze, brake fluid, car batteries, cleaners, drain cleaners, fire extinguishers, fluorescent bulbs, gasoline, kerosene, lighter fluid, mercury, motor oil and filters, latex and oil paint, paint thinner, pesticides and herbicides, photographic chemicals, pool chemicals, propane tanks, stains and varnishes, thermometers, thermostats, rechargeable and button batteries (bag each or tape the terminals). Do not bring: appliances, furniture, electronics, empty containers, explosives, medical waste, smoke detectors, tires. Asbestos: call to pre-register. Alkaline batteries can go in the regular trash. Questions: solidwaste@co.middlesex.nj.us.",
    "notes_es": "",
    "status": "verified",
    "source_url": SRC,
    "last_verified": "2026-10-13",
}


def main():
    data = json.loads(TOWNS.read_text(encoding="utf-8"))
    data["facilities"] = [f for f in data["facilities"] if f["key"] != FAC["key"]] + [FAC]
    TOWNS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("middlesex-hhw facility written")


if __name__ == "__main__":
    main()
