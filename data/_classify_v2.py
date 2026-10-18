import json, re, datetime as dt

DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
MONTHS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]
HOLD = {("bradley-beach", "trash")}


def days_of(w):
    if not w:
        return None
    w = w.lower()
    if "(" in w or "plus" in w or " or " in w:
        return None
    return [DAYS.index(d) for d in DAYS if re.search(r"\b" + d + r"s?\b", w)] or None


def wd_of(date):
    return (dt.date.fromisoformat(date).weekday() + 1) % 7


def summer(text):
    m = re.search(
        r"(" + "|".join(MONTHS) + r")\s+1\s+through\s+(" + "|".join(MONTHS) + r")\b(?!\s+\d)",
        text,
        re.I,
    )
    if not m:
        return None
    a, b = MONTHS.index(m.group(1).lower()) + 1, MONTHS.index(m.group(2).lower()) + 1
    return list(range(a, b + 1)) if a <= b else None


def classify(s, wds):
    if str(s.get("source_date")) not in ("2026", "standing"):
        return None
    p = (s.get("week_pattern") or "").strip()
    q = p.lower()
    text = s.get("area_note") or ""
    if re.fullmatch(r"\d{4}-\d\d-\d\d", p):
        return {"kind": "D", "date": p}
    if not wds:
        return None
    if re.search(r"appointment|\bplus\b|alternating white|white week", q + " " + text.lower()):
        return None
    if re.search(r"booklet lists|conflict", text.lower()):
        return None
    bare = re.sub(r"\([^)]*\)", "", q).strip(" ;")
    if bare in ("weekly", "every week"):
        if re.search(r"\bonly\b", text, re.I):
            ms = summer(text)
            if ms and re.search(r"summer|extra", text, re.I):
                return {"kind": "W", "months": ms}
            return None
        return {"kind": "W"}
    if (
        re.search(r"every other|bi-?weekly|alternating weeks", q)
        and s.get("anchor_date")
        and len(wds) == 1
        and wd_of(s["anchor_date"]) == wds[0]
    ):
        return {"kind": "B", "anchor": s["anchor_date"]}
    m = re.match(
        r"^(\d)(?:st|nd|rd|th)\s*(?:and|&)\s*(\d)(?:st|nd|rd|th)\s+\w+( of the month)?(;.*)?$",
        q,
    )
    if m:
        return {"kind": "M", "nth": [int(m.group(1)), int(m.group(2))]}
    return None


R = json.load(open("data/towns_research_v2.json", encoding="utf-8-sig"))
ok = hold = 0
samples = []
for town, v in R.items():
    for s in v["schedules"]:
        wds = days_of(s["weekday"])
        c = None if (town, s["stream"]) in HOLD else classify(s, wds)
        if c:
            ok += 1
        else:
            hold += 1
            if len(samples) < 25:
                samples.append(
                    (
                        town,
                        s.get("stream"),
                        s.get("weekday"),
                        s.get("week_pattern"),
                        s.get("source_date"),
                        s.get("anchor_date"),
                        (s.get("area_note") or "")[:60],
                        wds,
                    )
                )
print("ok", ok, "hold", hold)
for s in samples:
    print(s)
# carteret summer
note = R["carteret"]["schedules"][1]["area_note"]
print("summer()", summer(note))
print("days Monday", days_of("Monday"))
print("days Mon,Thu", days_of("Monday, Thursday"))
