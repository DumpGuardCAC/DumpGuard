import json, re, sys
sys.path.insert(0, 'data')
from _es_heads import head_es
d = json.load(open('data/towns.json', encoding='utf-8'))
src = json.load(open('data/_es_src.json', encoding='utf-8'))
heads = src['heads']
hols = json.load(open('data/_es_hols.json', encoding='utf-8'))
TAIL = re.compile(r' Other holiday and weather changes are not listed here; check (\S+?)\.?$')
PW = re.compile(r'( Public Works: ([^.]*(?:\.\d+)?[^.]*)\.)')
order = sorted(range(len(heads)), key=lambda i: -len(heads[i]))
bad = []

def conv(en):
    m = TAIL.search(en)
    tail = ''
    body = en
    if m:
        tail = f' Otros cambios por feriados o mal tiempo no se indican aquí; consulte {m.group(1)}.'
        body = en[:m.start()]
    phone = ''
    hol_es = ''
    if ' Public Works: ' in body:
        body, rest = body.rsplit(' Public Works: ', 1)
        rest = rest.strip()
        if rest in hols:
            phone = ' Obras Públicas: ' + hols[rest]
        else:
            m3 = re.match(r'(\S+)\s*(.*)$', rest)
            tok, rest2 = m3.group(1), m3.group(2).strip()
            tok = tok.rstrip('.') + ('' if not rest2 else '.')
            if rest2 == '':
                phone = f' Obras Públicas: {tok}.'
            elif rest2 in hols:
                phone = f' Obras Públicas: {tok}.' + hols[rest2]
            else:
                bad.append(('rest', rest[:100])); return None
    else:
        for k in sorted(hols, key=len, reverse=True):
            if body.endswith(' ' + k):
                body = body[:-len(k) - 1]
                hol_es = ' ' + hols[k]
                break
    # head: strip custom/by appointment/seasonal/not provided prefixes
    for i in order:
        h = heads[i]
        if body == h or body == h + '.' or body.rstrip('.') == h.rstrip('.'):
            es = head_es(i, h)
            if es is None: bad.append(('nohead', i, h[:80])); return None
            return es + phone + hol_es + tail
    bad.append(('nomatch', body[:120], hol_es[:20])); return None

apply = len(sys.argv) > 1
n = 0
for s in d['schedules']:
    if s.get('notes_es'): continue
    r = conv(s['notes_en'])
    if r: s['notes_es'] = r; n += 1
print('schedules done', n)
from _es_fac import fac_es
nf = 0
for f in d['facilities']:
    if f.get('notes_es'): continue
    r = fac_es(f['notes_en'])
    if r: f['notes_es'] = r; nf += 1
    else: bad.append(('fac', f['key']))
print('facilities done', nf)
for b in bad[:30]: print(b)
print('bad', len(bad))
if apply and not bad:
    json.dump(d, open('data/towns.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
