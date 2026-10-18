import re, json
html = open(r"C:\Users\DagaV\Desktop\CAC\data\oldbridge_dpw.html", encoding="utf-8", errors="ignore").read()
m = re.search(r'id="__NUXT_DATA__">(\[.*?\])</script>', html, re.DOTALL)
data = json.loads(m.group(1))
s = json.dumps(data)
# print long HTML-ish strings
for x in re.findall(r"<p>[^<]{20,500}</p>", s):
    if any(k in x.lower() for k in ["garbage", "trash", "recycl", "collection", "pick", "monday", "tuesday", "wednesday", "thursday", "friday"]):
        print(x[:500])
for x in re.findall(r"<li>[^<]{10,300}</li>", s):
    if any(k in x.lower() for k in ["garbage", "trash", "recycl", "collection", "pick"]):
        print(x[:500])
# addresses phones
for x in sorted(set(re.findall(r"732-\d{3}-\d{4}", s))):
    print("phone", x)
for x in sorted(set(re.findall(r"\d+[^\"]{0,40}Old Bridge[^\"]{0,40}08857", s))):
    print("addr", x[:120])
