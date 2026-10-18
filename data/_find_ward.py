import re, json
raw = open(r"C:\Users\DagaV\Desktop\CAC\data\ob_recycling.html", encoding="utf-8", errors="ignore").read()
m = re.search(r'id="__NUXT_DATA__">(\[.*?\])</script>', raw, re.S)
s = m.group(1)
for term in ["WHAT WARD", "ward am", "2026 schedule", "middlesexcounty", "mcia", "document", "thrillshare.com/cms"]:
    idx = 0
    while True:
        i = s.lower().find(term.lower(), idx)
        if i == -1:
            break
        print("---", term, "---")
        print(s[max(0,i-120):i+200])
        idx = i + len(term)
