"""Parse the Woodbridge 2026 street index (guide pages 33-39 of the text dump) into zones with streets and special-pickup dates."""
import json, re
from pathlib import Path

SRC = Path(__file__).with_name("sources") / "woodbridge_2026_calendar_text.txt"


def join_streets(raw):
    """House-number ranges wrap onto the next line in the PDF text; stitch them back onto their street."""
    out = []
    for line in raw:
        line = re.sub(r"\s+", " ", line).strip()
        if not line:
            continue
        open_ = bool(out) and out[-1].count("(") > out[-1].count(")")
        if open_ and line[:1].isalpha() and ")" not in line and not re.search(r"\d", line):
            out[-1] += ")"  # source dropped the closing paren; this line is a new street
            open_ = False
        if out and (open_ or line.startswith("(")):
            if ")" in line:
                head, tail = line.split(")", 1)
                out[-1] += " " + head + ")"
                tail = tail.strip()
                if tail and tail[0].isdigit():
                    out[-1] += " " + tail
                elif tail:
                    out.append(tail)
            else:
                out[-1] += " " + line
        else:
            out.append(line)
    return [re.sub(r"\s+", " ", x).replace("( ", "(").replace("- ", "-") for x in out]


def parse():
    text = SRC.read_text(encoding="utf-8")
    start = text.index("=====PAGE 35=====")
    end = text.index("=====PAGE 42=====")
    lines = [l.strip() for l in text[start:end].splitlines()]
    lines = [l for l in lines if l and not l.startswith("=====PAGE") and not l.isdigit()]
    merged = []
    for l in lines:
        if re.fullmatch(r"(Odd|Even)\)", l) and merged:  # "Main Street (10-306" + "Even)"
            merged[-1] = f"{merged[-1]} {l}"
            continue  # town names wrap across lines: "Fords / Hopelawn /" + "Keasbey"
        if merged and merged[-1].endswith("/"):
            merged[-1] = f"{merged[-1]} {l}"
        else:
            merged.append(l)
    lines = merged
    zones, i = [], 0
    hdr = re.compile(r"^RD\s*(\d+)\s*Zone\s*(\d+)\s*$", re.I)
    while i < len(lines):
        m = hdr.match(lines[i]) if i else None
        if m is None and i + 1 < len(lines) and hdr.match(lines[i + 1]):
            towns = [t.strip() for t in lines[i].split("/") if t.strip()]
            m = hdr.match(lines[i + 1])
            z = {"towns": towns, "rd": int(m.group(1)), "zone": int(m.group(2)), "streets": [], "brush": [], "leaves": [], "trees": []}
            i += 2
            while i < len(lines) and not lines[i].lower().startswith("free pick up"):
                z["streets"].append(lines[i])
                i += 1
            i += 1
            cur = None
            while i < len(lines):
                l = lines[i]
                if i + 1 < len(lines) and hdr.match(lines[i + 1]):
                    break
                low = l.lower()
                if low.startswith("brush"): cur = "brush"
                elif low.startswith("leaves"): cur = "leaves"
                elif low.startswith("christmas"): cur = "trees"
                elif cur: z[cur].append(l)
                i += 1
            z["streets"] = join_streets(z["streets"])
            zones.append(z)
        else:
            i += 1
    return zones


if __name__ == "__main__":
    zs = parse()
    print(len(zs))
    for z in zs:
        print(z["towns"], z["rd"], z["zone"], len(z["streets"]), z["brush"], len(z["leaves"]), z["trees"])
