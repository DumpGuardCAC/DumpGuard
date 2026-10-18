import re, json, html as htmlmod

raw = open(r"C:\Users\DagaV\Desktop\CAC\data\oldbridge_dpw.html", encoding="utf-8", errors="ignore").read()
m = re.search(r'id="__NUXT_DATA__">(\[.*?\])</script>', raw, re.DOTALL)
data = json.loads(m.group(1))

def walk(o, depth=0):
    if isinstance(o, str):
        if len(o) > 30 and ("<" in o or any(d in o.lower() for d in ["monday","tuesday","wednesday","thursday","friday","garbage","trash","recycl","collection","pick-up","pick up"])):
            t = htmlmod.unescape(o)
            t = re.sub(r"<[^>]+>", " ", t)
            t = re.sub(r"\s+", " ", t).strip()
            if any(d in t.lower() for d in ["garbage","trash","recycl","collection","monday","tuesday","wednesday","thursday","friday","pick"]):
                print(t[:800])
    elif isinstance(o, list):
        for x in o:
            walk(x, depth+1)
    elif isinstance(o, dict):
        for x in o.values():
            walk(x, depth+1)

walk(data)
