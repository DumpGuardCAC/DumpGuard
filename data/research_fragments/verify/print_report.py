import json

r = json.load(
    open(
        r"C:\Users\DagaV\Desktop\CAC\data\research_fragments\verify\verification_report.json",
        encoding="utf-8-sig",
    )
)
towns = json.load(
    open(r"C:\Users\DagaV\Desktop\CAC\data\towns_research.json", encoding="utf-8-sig")
)
print(json.dumps(r["summary"], indent=2))
print()
print("town|verified|issues|corrections|data_status")
fail, clean, notes, corr = [], [], [], []
for slug in towns:
    t = r["towns"][slug]
    print(
        f"{slug}|{t['verified']}|{t['issue_count']}|{t['had_corrections']}|{towns[slug].get('status')}"
    )
    if t.get("had_corrections"):
        corr.append(slug)
    if not t["verified"]:
        fail.append(slug)
    elif t["issue_count"] == 0:
        clean.append(slug)
    else:
        notes.append(slug)
print()
print("PASS_CLEAN", len(clean), clean)
print("PASS_WITH_NOTES", len(notes))
print("VERIFIED_FALSE", len(fail), fail)
print("HAD_CORRECTIONS", corr)
print("MISSING", r["summary"]["towns_missing_verify_fragment"])
