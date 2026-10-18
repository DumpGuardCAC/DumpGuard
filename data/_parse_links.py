import re, json, sys
raw = open(sys.argv[1], encoding="utf-8", errors="ignore").read()
m = re.search(r'id="__NUXT_DATA__">(\[.*?\])</script>', raw, re.DOTALL)
data = json.loads(m.group(1))

def walk(o):
    if isinstance(o, dict):
        if "href" in o and ("2026" in json.dumps(o) or "schedule" in json.dumps(o).lower() or "ward" in json.dumps(o).lower()):
            print(o)
        if o.get("type") == "link" or o.get("linkType"):
            print("LINK", o)
        for v in o.values():
            walk(v)
    elif isinstance(o, list):
        for v in o:
            walk(v)

walk(data)

# also search for http links in strings
s = json.dumps(data)
for u in re.findall(r'https://[^"\\]+', s):
    if any(k in u.lower() for k in ['schedule','2026','ward','mcia','recycl','middlesex']):
        print('URL', u)
