import pymupdf
from pathlib import Path
from datetime import date
import json

pdf_path = Path(r"C:\Users\DagaV\Desktop\CAC\data\sources\aberdeen_2026_calendar.pdf")
out_dir = Path(r"C:\Users\DagaV\Desktop\CAC\data\sources\_dl")
out_dir.mkdir(parents=True, exist_ok=True)

doc = pymupdf.open(pdf_path)
month_pages = {
    2: (1, "JANUARY"),
    3: (2, "FEBRUARY"),
    4: (3, "MARCH"),
    6: (4, "APRIL"),
    7: (5, "MAY"),
    8: (6, "JUNE"),
    10: (7, "JULY"),
    11: (8, "AUGUST"),
    12: (9, "SEPTEMBER"),
    14: (10, "OCTOBER"),
    15: (11, "NOVEMBER"),
    16: (12, "DECEMBER"),
}

# Render PNGs
for page_idx, (month_num, name) in month_pages.items():
    page = doc[page_idx]
    mat = pymupdf.Matrix(2, 2)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    out = out_dir / f"aberdeen_m{month_num}.png"
    pix.save(str(out))
    print("saved", out.name, pix.width, pix.height)

results = {"I": [], "II": []}

for page_idx, (month_num, name) in month_pages.items():
    page = doc[page_idx]
    d = page.get_text("dict")
    spans = []
    for block in d["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = span["text"].strip()
                if not text:
                    continue
                x0, y0, x1, y1 = span["bbox"]
                spans.append(
                    {
                        "text": text,
                        "x0": x0,
                        "y0": y0,
                        "x1": x1,
                        "y1": y1,
                        "xc": (x0 + x1) / 2,
                        "yc": (y0 + y1) / 2,
                    }
                )

    labels = [
        s for s in spans if s["text"] in ("Recycling Section I", "Recycling Section II")
    ]
    days = []
    for s in spans:
        t = s["text"]
        if t.isdigit() and 1 <= int(t) <= 31:
            days.append({**s, "day": int(t)})

    print(f"\n=== {name} page {page_idx}: {len(labels)} labels, {len(days)} day nums ===")

    used_keys = set()
    for lab in sorted(labels, key=lambda s: (s["y0"], s["x0"])):
        section = "I" if lab["text"].endswith(" I") else "II"
        cands = []
        for day in days:
            dx = abs(day["xc"] - lab["xc"])
            dy = lab["y0"] - day["y1"]
            if dy < -5:
                continue
            if dy > 80:
                continue
            if dx > 45:
                continue
            cands.append((dy, dx, day))
        if not cands:
            for day in days:
                dx = abs(day["xc"] - lab["xc"])
                dy = abs(lab["yc"] - day["yc"])
                if dx > 60 or dy > 100:
                    continue
                cands.append((dy, dx, day))
        if not cands:
            print(
                "  NO DAY for",
                lab["text"],
                "at",
                round(lab["x0"], 1),
                round(lab["y0"], 1),
            )
            continue
        cands.sort(key=lambda t: (t[0], t[1]))
        day = cands[0][2]
        try:
            iso = date(2026, month_num, day["day"])
        except ValueError:
            print("  INVALID date", month_num, day["day"], lab["text"])
            continue
        wd = iso.strftime("%A")
        key = (iso.isoformat(), section)
        if key in used_keys:
            continue
        used_keys.add(key)
        results[section].append(iso)
        print(
            f"  {iso.isoformat()} {wd} Section {section} "
            f"(day@{day['x0']:.0f},{day['y0']:.0f} lab@{lab['x0']:.0f},{lab['y0']:.0f})"
        )

for sec in results:
    results[sec] = sorted(set(results[sec]))

print("\n==== SUMMARY ====")
print("Section I:", len(results["I"]))
for d in results["I"]:
    assert d.weekday() == 2, (d, d.strftime("%A"))
    print(" ", d.isoformat(), d.strftime("%A"))
print("Section II:", len(results["II"]))
for d in results["II"]:
    assert d.weekday() == 2, (d, d.strftime("%A"))
    print(" ", d.isoformat(), d.strftime("%A"))


def gaps(dates):
    return [(dates[i + 1] - dates[i]).days for i in range(len(dates) - 1)]


print("I gaps:", gaps(results["I"]))
print("II gaps:", gaps(results["II"]))

out_json = {
    "I": [d.isoformat() for d in results["I"]],
    "II": [d.isoformat() for d in results["II"]],
}
Path(r"C:\Users\DagaV\Desktop\CAC\data\_aberdeen_recycling_dates.json").write_text(
    json.dumps(out_json, indent=2), encoding="utf-8"
)
print("wrote _aberdeen_recycling_dates.json")
