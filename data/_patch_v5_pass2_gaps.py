"""Pass 2 gap patch for towns_research_v5.json.

A) Red Bank yard: leave held (2nd FULL week not borough-defined for ISO/shape-c).
B) Recompute zips[].shared_with from cross-town ZIP lists (fix corrupted key lists).
C) Fill obvious dropoff empties from primary town pages.
D) Old Bridge trash custom: exact recycling-information quote.
E) South Plainfield trash custom: no FAQ/DPW private-hauler sentence found; leave.
"""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PATH = ROOT / "towns_research_v5.json"

CHANGELOG: list[str] = []


def patch_red_bank_yard(R: dict) -> None:
    rb = R["red-bank"]
    yard = [s for s in rb["schedules"] if s.get("stream") == "yard"]
    held = [
        s
        for s in yard
        if "2nd full week" in (s.get("area_note") or "").lower()
        and (s.get("week_pattern") or "") == "custom"
    ]
    assert len(held) == 5, len(held)
    # Source says "2nd FULL week" Mon-Fri by zone - not "2nd weekday of month" (shape M needs
    # 1st&3rd style). Page/bulletin do not define how to compute the full week for ISO dates.
    marker = "UNRESOLVABLE: yard Zones 1-5"
    unresolvable = (
        "UNRESOLVABLE: yard Zones 1-5 brush Apr-Oct / leaves Nov-Dec on 2nd FULL week "
        "Mon-Fri by zone (Public-Utilities + leaf zone map) - borough does not define "
        "2nd-full-week calendar math for ISO expansion; not shape-c (2nd weekday of month)."
    )
    notes = (rb.get("notes") or "").strip()
    if marker in notes:
        head, _, _ = notes.partition(marker)
        rb["notes"] = (head.rstrip() + " " + unresolvable).strip()
    else:
        rb["notes"] = (notes + " " + unresolvable).strip() if notes else unresolvable
    CHANGELOG.append(
        "A red-bank: left 5 yard held rows; notes += UNRESOLVABLE (2nd FULL week undefined)"
    )


def patch_zip_shared_with(R: dict) -> None:
    zip_to_slugs: dict[str, list[str]] = defaultdict(list)
    for slug, town in R.items():
        for z in town.get("zips") or []:
            zip_to_slugs[z["zip"]].append(slug)

    fixed = 0
    for slug, town in R.items():
        for z in town.get("zips") or []:
            others = sorted(s for s in zip_to_slugs[z["zip"]] if s != slug)
            if z.get("shared_with") != others:
                z["shared_with"] = others
                fixed += 1
    CHANGELOG.append(
        f"B zips.shared_with: recomputed for all towns; {fixed} entries updated "
        f"(cross-ref of {len(zip_to_slugs)} ZIPs across {len(R)} towns)"
    )


def set_dropoff_fields(fac: dict, *, slug: str, **fields) -> None:
    changed = []
    for k, v in fields.items():
        if v is None:
            continue
        if fac.get(k) != v:
            fac[k] = v
            changed.append(k)
    if changed:
        CHANGELOG.append(f"C {slug} dropoff[{fac.get('name','?')[:40]}]: set {', '.join(changed)}")


def patch_dropoffs(R: dict) -> None:
    # Red Bank — Public Utilities page
    fac = R["red-bank"]["dropoff"][0]
    set_dropoff_fields(
        fac,
        slug="red-bank",
        address="110 Sunset Avenue, Red Bank, NJ 07701",
        accepts_text=(
            "Single-stream recyclables (glass bottles/jars, metal cans, mixed paper, cardboard, "
            "#1 and #2 plastics); dedicated e-waste container (computers, TVs, monitors, phones, "
            "speakers, etc.). Red Bank residents only."
        ),
        residents_only=True,
    )

    # Bradley Beach — public-works page
    fac = R["bradley-beach"]["dropoff"][0]
    set_dropoff_fields(
        fac,
        slug="bradley-beach",
        address="1011 Main Street, Bradley Beach, NJ 07720",
        accepts_text=(
            "Trash, recycling, plastic film, brush, yard waste, leaves, electronics "
            "(stickers required), and bulk items; proof of residency required."
        ),
        residents_only=True,
    )

    # Carteret — publicworks page (recycling hours only; residency not stated)
    fac = R["carteret"]["dropoff"][0]
    set_dropoff_fields(
        fac,
        slug="carteret",
        hours="Monday–Friday 7:00 a.m.–3:00 p.m.; Saturday 7:00 a.m.–11:00 a.m.",
        accepts_text="Recycling drop-off at DPW/Recycling Center (see borough Recycling Information).",
    )

    # Matawan — Recycling Center page
    fac = R["matawan"]["dropoff"][0]
    set_dropoff_fields(
        fac,
        slug="matawan",
        address="62 Main Street, Matawan, NJ 07747",
        residents_only=True,
        accepts_text=(
            "Commingled bottles (glass & plastic) and cans (no paint cans); flattened corrugated "
            "cardboard; newspaper/mixed paper; brush (branches ≤3 in diameter); yard debris "
            "(no grass, mulch, wood chips, soil, stones); metals (aluminum/steel, no paint cans); "
            "listed electronics. Access card required; no trash/construction debris; no propane tanks; "
            "no plastic bags."
        ),
    )

    # Old Bridge — recycling-information hours; residency not explicit on page
    fac = R["old-bridge"]["dropoff"][0]
    set_dropoff_fields(
        fac,
        slug="old-bridge",
        address="1 Old Bridge Plaza, Old Bridge, NJ 08857 (behind Animal Shelter)",
        hours="Tuesdays & Thursdays 7:00 a.m.–3:00 p.m.; Saturdays 8:00 a.m.–12:00 p.m.",
        accepts_text=(
            "Township Recycling Drop-Off Center; extra cardboard accepted "
            "(2026 curbside recycling PDF / recycling-information page)."
        ),
    )

    # Highlands — DPW page
    fac = R["highlands"]["dropoff"][0]
    set_dropoff_fields(
        fac,
        slug="highlands",
        address="151 Navesink Ave., Highlands, NJ 07732",
        hours="Monday–Friday 7:00 a.m.–3:00 p.m.; Saturday 7:00 a.m.–12:00 p.m.",
        residents_only=True,
        accepts_text="Convenient Recycling Yard for residents to dispose of recyclables (DPW page).",
    )

    # Little Silver — Recycling/Garbage page
    fac = R["little-silver"]["dropoff"][0]
    set_dropoff_fields(
        fac,
        slug="little-silver",
        address="22 Fairview Avenue, Little Silver, NJ 07739",
        hours="Monday–Friday 8:00 a.m.–2:00 p.m.; Saturday 8:00 a.m.–12:00 noon; closed Borough holidays",
        residents_only=True,
        accepts_text=(
            "Marked recycling containers at Public Works Yard; does not accept electronics "
            "(computers/monitors/TVs), motor oils/antifreeze, or paint."
        ),
    )

    # Middletown main + train station
    main, train = R["middletown"]["dropoff"][0], R["middletown"]["dropoff"][1]
    set_dropoff_fields(
        main,
        slug="middletown",
        address="52 Kanes Lane, Middletown, NJ",
        residents_only=True,
        accepts_text=(
            "Motor oil, antifreeze, vegetable cooking oil; lead-acid/rechargeable batteries "
            "(not household alkaline); scrap metal; appliances (freon fee); electronics; "
            "bulky/rigid plastics; tires (fees); plastic toys; clean plastic bags; EPS/Styrofoam; "
            "cans; glass bottles/jars; mixed paper; plastic bottles/containers #1/#2/#5; cardboard; "
            "brush; leaves Nov 1–May 31. Residents only; no commercial vehicles."
        ),
    )
    set_dropoff_fields(
        train,
        slug="middletown",
        accepts_text=(
            "24/7 satellite: cardboard; mixed paper; plastic bottles/containers #1/#2/#5; "
            "aluminum/tin/steel cans; glass bottles/jars; EPS/Styrofoam (specified bins)."
        ),
        residents_only=True,
    )

    # Rumson — rumson-dpw page
    fac = R["rumson"]["dropoff"][0]
    set_dropoff_fields(
        fac,
        slug="rumson",
        hours="Monday–Friday 7:00 a.m.–5:00 p.m.; Saturday & Sunday 8:00 a.m.–12:00 p.m.; closed borough holidays",
        residents_only=True,
        accepts_text=(
            "Recycling only (newspapers/mixed paper, cardboard, commingled recyclables); "
            "no trash, bulk, brush, or household hazardous waste."
        ),
    )

    # Atlantic Highlands — Public Works page
    fac = R["atlantic-highlands"]["dropoff"][0]
    set_dropoff_fields(
        fac,
        slug="atlantic-highlands",
        accepts_text="Borough Yard open for recycling (Mon-Fri 8:30-4:00; Saturday until 11:00 a.m.).",
    )

    # Highland Park — recycling-1183
    fac = R["highland-park"]["dropoff"][0]
    set_dropoff_fields(
        fac,
        slug="highland-park",
        accepts_text=(
            "DPW garage drop-off: corrugated cardboard (flattened; Mon-Fri 7:00 a.m.-2:30 p.m.); "
            "electronics (computers, fax, laptops, monitors, printer/scanners, TVs - residential only); "
            "fluorescent lamps; rechargeable/button-cell batteries. No after-hours dumping."
        ),
        residents_only=True,
    )

    # West Long Branch — Recycling Collection page (hours already set; accepts thin)
    fac = R["west-long-branch"]["dropoff"][0]
    set_dropoff_fields(
        fac,
        slug="west-long-branch",
        accepts_text="Borough Recycling Center (see Recycling Collection page / borough calendar).",
    )


def patch_old_bridge_trash(R: dict) -> None:
    ob = R["old-bridge"]
    quote = (
        "Please note garbage is privatized in Old Bridge. "
        "Residents can hire the garbage company of their choice."
    )
    for s in ob["schedules"]:
        if s.get("stream") == "trash" and (s.get("week_pattern") or "") == "custom":
            if s.get("area_note") != quote:
                s["area_note"] = quote
                s["source_url"] = "https://www.oldbridge.com/page/recycling-information/"
                CHANGELOG.append("D old-bridge trash custom: exact recycling-information quote")
            break
    else:
        raise SystemExit("old-bridge trash custom row missing")


def patch_south_plainfield(R: dict) -> None:
    # FAQ/DPW pages reviewed: bulk FAQ only; no explicit private-hauler sentence.
    # Keep recycling-only municipal framing (accurate to Curbside page).
    CHANGELOG.append(
        "E south-plainfield trash custom: unchanged - FAQ/DPW do not explicitly state private haulers"
    )


def main() -> None:
    R = json.loads(PATH.read_text(encoding="utf-8-sig"))
    assert len(R) == 33, len(R)

    patch_red_bank_yard(R)
    patch_zip_shared_with(R)
    patch_dropoffs(R)
    patch_old_bridge_trash(R)
    patch_south_plainfield(R)

    PATH.write_text(json.dumps(R, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Wrote", PATH)
    for line in CHANGELOG:
        print("-", line)


if __name__ == "__main__":
    main()
