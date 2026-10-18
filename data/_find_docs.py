import re, json, sys
raw = open(sys.argv[1], encoding="utf-8", errors="ignore").read()
m = re.search(r'id="__NUXT_DATA__">(\[.*?\])</script>', raw, re.DOTALL)
data = json.loads(m.group(1))
s = json.dumps(data)
for u in sorted(set(re.findall(r"https?://[^\"\\]+|/documents/[^\"\\]+", s))):
    if "2026" in u or "recycl" in u.lower() or "ward" in u.lower():
        print(u)
# find asset entries
def walk(o, path=""):
    if isinstance(o, dict):
        if "asset_url" in o or "url" in o and "title" in o:
            t = str(o)
            if "2026" in t or "recycl" in t.lower():
                print("OBJ", o)
        for k,v in o.items():
            walk(v, path+"."+str(k))
    elif isinstance(o, list):
        for i,v in enumerate(o):
            walk(v, path+f"[{i}]")
walk(data)
