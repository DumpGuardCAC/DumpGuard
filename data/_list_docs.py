import re
raw = open(r"C:\Users\DagaV\Desktop\CAC\data\ob_recycling.html", encoding="utf-8", errors="ignore").read()
m = re.search(r'id="__NUXT_DATA__">(\[.*?\])</script>', raw, re.S)
d = m.group(1)
print("\n".join(sorted(set(re.findall(r"/documents/[^\"\\]+", d)))))
