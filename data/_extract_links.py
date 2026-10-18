import re, sys, json, html as htmlmod
path = sys.argv[1]
raw = open(path, encoding="utf-8", errors="ignore").read()
m = re.search(r'id="__NUXT_DATA__">(\[.*?\])</script>', raw, re.DOTALL)
if m:
    s = json.dumps(json.loads(m.group(1)))
    for kw in ["2026", "garbage", "trash", "ASL", "recycl", "collection", "Monday"]:
        if kw.lower() in s.lower():
            pass
    for x in re.findall(r"https?://[^\"\\]+2026[^\"\\]*|/documents/[^\"\\]*2026[^\"\\]*|/page/[^\"\\]*", s):
        if any(k in x.lower() for k in ["recycl", "2026", "asl", "garbage", "trash", "solid"]):
            print(x)
    def walk(o):
        if isinstance(o, str) and len(o) > 40:
            t = htmlmod.unescape(re.sub(r"<[^>]+>", " ", o))
            t = re.sub(r"\s+", " ", t).strip()
            if any(k in t.lower() for k in ["garbage", "trash", "recycl", "asl", "collection day", "monday", "tuesday", "wednesday", "thursday", "friday"]):
                print("TEXT:", t[:600])
        elif isinstance(o, list):
            for i in o: walk(i)
        elif isinstance(o, dict):
            for i in o.values(): walk(i)
    walk(json.loads(m.group(1)))
