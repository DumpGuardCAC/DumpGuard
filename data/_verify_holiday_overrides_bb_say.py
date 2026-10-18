"""Cold-check bradley-beach + sayreville holiday_overrides in towns_research_v5.json."""
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
d = json.loads((ROOT / "towns_research_v5.json").read_text(encoding="utf-8"))

ZONE_DAYS = {
    "Zone 1": {0, 3},  # Mon+Thu
    "Zone 2": {1, 4},  # Tue+Fri
    "Zone 3": {0, 4},  # Mon+Fri
    "MCIA Thursday": {3},
}
WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

# Evidence from primary pages (re-fetched 2026-10-18)
BRADLEY_PAGE = {
    ("2026-01-01", "2026-01-05", "Zone 1"): (
        "Scheduled Trash collection for Zone 1 will NOT be picked up on 01/01/26, "
        "New Year's Day. Pick-up will be on 01/05/26."
    ),
    ("2026-11-26", "2026-11-30", "Zone 1"): (
        "Scheduled Trash collection for Zone 1 will NOT be picked up on 11/26/26, "
        "Thanksgiving Day. Pick-up will be on 11/30/26."
    ),
    ("2026-12-25", "2026-12-29", "Zone 2"): (
        "Scheduled Trash collection for Zones 2 and 3 will NOT be picked up on 12/25/26, "
        "Christmas Day. Pick-up for Zone 3 will be on 12/28/26 and pick-up for Zone 2 "
        "will be on 12/29/26."
    ),
    ("2026-12-25", "2026-12-28", "Zone 3"): (
        "Scheduled Trash collection for Zones 2 and 3 will NOT be picked up on 12/25/26, "
        "Christmas Day. Pick-up for Zone 3 will be on 12/28/26 and pick-up for Zone 2 "
        "will be on 12/29/26."
    ),
    ("2027-01-01", "2027-01-05", "Zone 2"): (
        "Scheduled Trash collection for Zones 2 and 3 will NOT be picked up on 01/01/27, "
        "New Year's Day. Pick-up for Zone 3 will be on 01/04/27 and pick-up for Zone 2 "
        "will be on 01/05/27."
    ),
    ("2027-01-01", "2027-01-04", "Zone 3"): (
        "Scheduled Trash collection for Zones 2 and 3 will NOT be picked up on 01/01/27, "
        "New Year's Day. Pick-up for Zone 3 will be on 01/04/27 and pick-up for Zone 2 "
        "will be on 01/05/27."
    ),
}
SAY_PAGE = {
    ("2026-01-01", "2026-01-03", "MCIA Thursday"): (
        "*January 1, 2026 Thursday changed to January 3, 2026, Saturday"
    ),
}


def match_area(town, label, stream):
    notes = []
    for s in d[town]["schedules"]:
        if s["stream"] != stream:
            continue
        an = s.get("area_note") or ""
        if label.startswith("Zone") and an.startswith(label):
            notes.append(an)
        elif (
            label == "MCIA Thursday"
            and (s.get("weekday") or "").lower() == "thursday"
            and an.upper().startswith("MCIA")
        ):
            notes.append(an[:100])
    return notes


def main():
    fails = []
    for town, src in [("bradley-beach", BRADLEY_PAGE), ("sayreville", SAY_PAGE)]:
        print("====", town, "====")
        ov = d[town].get("overrides") or []
        ov_keys = {(x["date"], x["to"], x["reason"]) for x in ov}
        for o in d[town]["holiday_overrides"]:
            label = o["reason"].split(":")[0].strip()
            od = date.fromisoformat(o["original_date"])
            notes = match_area(town, label, o["stream"])
            wd_ok = od.weekday() in ZONE_DAYS.get(label, set())
            quote = src.get((o["original_date"], o["new_date"], label))
            stream_ok = o["stream"] in ("trash", "recycling") and (
                ("trash" in o["reason"].lower()) == (o["stream"] == "trash")
                or ("recycl" in o["reason"].lower()) == (o["stream"] == "recycling")
            )
            # stream correct: trash overrides say trash; recycling say recycling
            if o["stream"] == "trash":
                stream_ok = "trash" in o["reason"].lower() or "garbage" in o["reason"].lower()
            elif o["stream"] == "recycling":
                stream_ok = "recycl" in o["reason"].lower()
            else:
                stream_ok = False
            sync = (o["original_date"], o["new_date"], o["reason"]) in ov_keys
            status = "PASS" if (notes and wd_ok and quote and stream_ok) else "FAIL"
            if status == "FAIL":
                fails.append((town, o))
            print(
                f"{status} {o['original_date']} -> {o['new_date']} | {label} | "
                f"stream={o['stream']} | overrides_sync={sync}"
            )
            print(f"  area_note match: {notes[:1] if notes else 'NO MATCH'}")
            print(
                f"  original_date weekday={WD[od.weekday()]} "
                f"(Py {od.weekday()}) zone_ok={wd_ok}"
            )
            print(f"  source: {quote or 'MISSING'}")
    print("TOTAL_FAILS", len(fails))
    return fails


if __name__ == "__main__":
    main()
