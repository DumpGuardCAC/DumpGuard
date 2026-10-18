import re, json, sys
raw = open(sys.argv[1], encoding="utf-8", errors="ignore").read()
m = re.search(r'id="__NUXT_DATA__">(\[.*?\])</script>', raw, re.DOTALL)
s = m.group(1)
for pat in [r'2026[^\"\\]{0,80}', r'ward[^\"\\]{0,80}', r'cmsv2-assets[^\"\\]+', r'\.pdf[^\"\\]{0,40}']:
    hits = sorted(set(re.findall(pat, s, re.I)))
    print(f"=== {pat} ({len(hits)}) ===")
    for h in hits[:30]:
        print(h)
