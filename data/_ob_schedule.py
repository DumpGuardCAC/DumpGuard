import re, json
raw = open(r"C:\Users\DagaV\Desktop\CAC\data\ob_recycling.html", encoding="utf-8", errors="ignore").read()
m = re.search(r'id="__NUXT_DATA__">(\[.*?\])</script>', raw, re.DOTALL)
data = json.loads(m.group(1))
# find all dicts with keys suggesting links
results = []
def walk(o):
    if isinstance(o, dict):
        js = json.dumps(o)
        if "2026" in js and ("url" in o or "href" in o or "path" in o or "document" in js.lower()):
            results.append(o)
        if "2026" in js and ("content" in o or "html" in o or "body" in o):
            results.append(o)
        for v in o.values():
            walk(v)
    elif isinstance(o, list):
        for v in o:
            walk(v)
walk(data)
print("matches", len(results))
for r in results[:20]:
    print(json.dumps(r)[:800])
    print("---")

# extract img tags with schedule in alt
s = json.dumps(data)
for img in re.findall(r'https://cmsv2-assets[^"\\]+', s):
    if any(x in img for x in ['4568951','349138','4226431','2705808']):
        print('IMG', img)
