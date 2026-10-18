"""Merge data/towns_research_v4.json (preferred) or v3/v2/v1 into data/towns.json.
Rows that parse cleanly become 'verified'; everything else is kept as 'needs_verification' so it stays hidden.
Clean = a named weekday plus: every week | every other week with an anchor date | 1st/3rd style monthly | a June-August summer
extra day | a list of exact dates, and a 2026 or 'standing' source. Idempotent: re-running replaces the merged towns."""
import json, os, re, datetime as dt
if os.path.exists("data/towns_research_v6.json"):
    SRC = "data/towns_research_v6.json"
elif os.path.exists("data/towns_research_v5.json"):
    SRC = "data/towns_research_v5.json"
elif os.path.exists("data/towns_research_v4.json"):
    SRC = 'data/towns_research_v4.json'
elif os.path.exists('data/towns_research_v3.json'):
    SRC = 'data/towns_research_v3.json'
elif os.path.exists('data/towns_research_v2.json'):
    SRC = 'data/towns_research_v2.json'
else:
    SRC = 'data/towns_research.json'
R = json.load(open(SRC, encoding='utf8'))
T = json.load(open('data/towns.json', encoding='utf8'))
TODAY = '2026-10-18'
DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
BY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
UNTIL = '20270131'
HOLD = set()  # bradley-beach trash now uses Zone 1/2/3 labels only (v3); street map still unpublished
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def days_of(w):
    if not w:
        return None
    w = w.lower()
    if '(' in w or 'plus' in w or ' or ' in w:
        return None
    return [DAYS.index(d) for d in DAYS if re.search(r'\b' + d + r's?\b', w)] or None


def wd_of(date):
    return (dt.date.fromisoformat(date).weekday() + 1) % 7


def first_on_or_after(wd, start='2026-01-01', nth=None):
    d = dt.date.fromisoformat(start)
    for _ in range(400):
        if (d.weekday() + 1) % 7 == wd and (nth is None or ((d.day - 1) // 7 + 1) in nth):
            return d.isoformat()
        d += dt.timedelta(days=1)


def split_head(text):
    m = re.search(r'[;:]|\.\s', text)
    if not m:
        return text.strip(' .'), ''
    return text[:m.start()].strip(' .'), text[m.end():].strip(' ;:.')


def split_zone(text):
    """(label, description) for an area_note; a generic head like 'Exception' is replaced by the text after it."""
    head, rest = split_head(text)
    if head.lower().rstrip('s') in ('exception', 'note') and rest:
        return head + ': ' + rest[:70].rstrip(' ,;'), rest
    return head, rest


def summer(text):
    m = re.search(r'(' + '|'.join(MONTHS) + r')\s+1\s+through\s+(' + '|'.join(MONTHS) + r')\b(?!\s+\d)', text, re.I)
    if not m:
        return None
    a, b = MONTHS.index(m.group(1).lower()) + 1, MONTHS.index(m.group(2).lower()) + 1
    return list(range(a, b + 1)) if a <= b else None


def classify(s, wds):
    """-> dict(kind, ...) or None when the row cannot be encoded cleanly."""
    if str(s.get('source_date')) not in ('2026', 'standing'):
        return None
    p = (s.get('week_pattern') or '').strip()
    q = p.lower()
    text = s.get('area_note') or ''
    if re.fullmatch(r'\d{4}-\d\d-\d\d', p):
        return {'kind': 'D', 'date': p}
    if not wds:
        return None
    if re.search(r'appointment|\bplus\b|alternating white|white week', q + ' ' + text.lower()):
        return None
    if re.search(r'booklet lists|conflict', text.lower()):
        return None
    bare = re.sub(r'\([^)]*\)', '', q).strip(' ;')
    if bare in ('weekly', 'every week'):
        if re.search(r'\bonly\b', text, re.I):
            ms = summer(text)
            if ms and re.search(r'summer|extra', text, re.I):
                return {'kind': 'W', 'months': ms}
            return None
        return {'kind': 'W'}
    if re.search(r'every other|bi-?weekly|alternating weeks', q) and s.get('anchor_date') and len(wds) == 1 and wd_of(s['anchor_date']) == wds[0]:
        return {'kind': 'B', 'anchor': s['anchor_date']}
    m = re.match(r'^(\d)(?:st|nd|rd|th)\s*(?:and|&)\s*(\d)(?:st|nd|rd|th)\s+\w+( of the month)?(;.*)?$', q)
    if m:
        return {'kind': 'M', 'nth': [int(m.group(1)), int(m.group(2))]}
    return None


merged = set(R)
T['schedules'] = [s for s in T['schedules'] if s['region'] not in merged]
T['facilities'] = [f for f in T['facilities'] if f['region'] not in merged]
T['zip_codes'] = [z for z in T['zip_codes'] if z['region'] not in merged]
stats, dropped = {}, []
MAT = [('cardboard_paper', r'cardboard|paper|newspaper'), ('glass', r'glass'), ('metal', r'metal|aluminum|\bcans?\b'),
       ('rigid_plastic', r'plastic'), ('ewaste_hazard', r'electronic|e-?waste|batter|paint|hazard|computer|\btvs?\b')]

for town, v in R.items():
    contact = f" Public Works: {v['dpw']['phone']}." if (v.get('dpw') or {}).get('phone') else ''
    hr = f" {v['holiday_rule'].strip().rstrip('.')}." if v.get('holiday_rule') else ''
    tail = f"{contact}{hr} Other holiday and weather changes are not listed here; check {v.get('official_site') or 'the town website'}."
    plan = []
    for s in v['schedules']:
        wds = days_of(s['weekday'])
        c = None if (town, s['stream']) in HOLD else classify(s, wds)
        plan.append((s, wds, c))
    zoned = {}
    for st in ('trash', 'recycling', 'bulk'):
        heads = {split_zone(s['area_note'] or '')[0].lower() for s, w, c in plan if s['stream'] == st and c and c['kind'] != 'D'}
        zoned[st] = len(heads) > 1
    rows_v = []
    n_ok = n_hold = 0
    iso_groups = {}
    for s, wds, c in plan:
        st = s['stream']
        text = (s['area_note'] or '').strip()
        base = dict(region=town, stream=st, source_url=s['source_url'])
        if c and c['kind'] == 'D':
            g = iso_groups.setdefault((st, text), {**base, 'dates': [], 'wd': wds[0] if wds else None})
            g['dates'].append({'date': c['date'], 'label': split_head(text)[0][:80] or st})
            continue
        if not c:
            desc = ' '.join(x for x in [s['weekday'] if s['weekday'] and not wds else '', s['week_pattern'] or '', text] if x)
            T['schedules'].append({**base, 'weekday': wds[0] if wds and len(wds) == 1 else None, 'week_pattern': 'custom', 'area_key': None,
                                   'area_note': '', 'dtstart': None, 'rrule': None, 'overrides': [], 'notes_en': desc.strip() + tail,
                                   'notes_es': '', 'status': 'needs_verification', 'last_verified': None})
            n_hold += 1
            continue
        key, note = None, ''
        if zoned.get(st):
            head, rest = split_zone(text)
            key = f"{st}:{slug(head)[:90]}"
            note = (head + (': ' + rest if rest else ''))[:500]
        for wd in wds:
            by = BY[wd]
            if c['kind'] == 'W':
                bm = f";BYMONTH={','.join(map(str, c['months']))}" if c.get('months') else ''
                rr = f"FREQ=WEEKLY;BYDAY={by}{bm};UNTIL={UNTIL}"
                ds = first_on_or_after(wd, f"2026-{c['months'][0]:02d}-01" if c.get('months') else '2026-01-01')
                pat = 'weekly'
            elif c['kind'] == 'B':
                rr = f"FREQ=WEEKLY;INTERVAL=2;BYDAY={by};UNTIL={UNTIL}"
                ds = c['anchor']
                pat = 'biweekly'
            else:
                rr = f"FREQ=MONTHLY;BYDAY={','.join(str(n) + by for n in c['nth'])};UNTIL={UNTIL}"
                ds = first_on_or_after(wd, nth=c['nth'])
                pat = '1st_3rd' if c['nth'][0] == 1 else 'custom'
            row = {**base, 'weekday': wd, 'week_pattern': pat, 'area_key': key, 'area_note': note, 'dtstart': ds, 'rrule': rr, 'overrides': [],
                   'notes_en': (text.rstrip('.') + '.' if text else '') + tail, 'notes_es': '', 'status': 'verified', 'last_verified': TODAY}
            rows_v.append(row)
            T['schedules'].append(row)
        n_ok += 1
    ZONE = re.compile(r'(zones?|areas?|sections?|districts?|wards?|sides?|east|west|north|south)', re.I)
    WIDE = re.compile(r'^(all|borough|village|town|township)', re.I)
    for st in {k[0] for k in iso_groups}:
        gs = [(t, g) for (s2, t), g in iso_groups.items() if s2 == st]
        zone_heads = {t for t, g in gs if ZONE.search(split_head(t)[0]) and not WIDE.match(split_head(t)[0])}
        for t, g in gs:
            is_zone = t in zone_heads
            hold = is_zone and len(zone_heads) < 2  # a lone zone's dates would show to every address
            head, rest = split_head(t)
            key = f"{st}:{slug(head)[:90]}" if is_zone and not hold else None
            note = (head + (': ' + rest if rest else ''))[:500] if key else ''
            dates = ', '.join(x['date'] for x in g['dates'])
            T['schedules'].append({'region': town, 'stream': st, 'source_url': g['source_url'], 'weekday': g['wd'], 'week_pattern': 'custom',
                                   'area_key': key, 'area_note': note, 'dtstart': None, 'rrule': None, 'overrides': [],
                                   'dates': g['dates'] if not hold else [],
                                   'notes_en': t.rstrip('.') + '.' + (f' Dates: {dates}.' if hold else '') + tail, 'notes_es': '',
                                   'status': 'needs_verification' if hold else 'verified', 'last_verified': None if hold else TODAY})
            if hold: n_hold += 1
            else: n_ok += 1
    # holiday overrides: attach each to the verified rows it can actually move
    for o in v.get('overrides') or []:
        r = o['reason'].lower()
        hit = 0
        r_s = r.replace('trash-recycling', '').replace('trash/recycling', '')
        want = 'recycling' if 'recycl' in r_s else ('trash' if re.search(r'garbage|trash|sanitation', r_s) else None)
        pairs = set(re.findall(r'\b(district|zone|section|ward)\s+([a-z0-9]+)\b', r))
        for row in rows_v:
            if row['weekday'] != wd_of(o['date']) or row['dtstart'] > o['date'] or (want and row['stream'] != want):
                continue
            if row['stream'] not in ('trash', 'recycling') or 'MONTHLY' in row['rrule']:
                continue
            if 'INTERVAL=2' in row['rrule'] and (dt.date.fromisoformat(o['date']) - dt.date.fromisoformat(row['dtstart'])).days % 14:
                continue
            bm = re.search(r'BYMONTH=([\d,]+)', row['rrule'])
            if bm and int(o['date'][5:7]) not in map(int, bm.group(1).split(',')):
                continue
            mine = set(re.findall(r'\b(district|zone|section|ward)\s+([a-z0-9]+)\b', (row['area_note'] or '').lower()))
            if pairs and mine and not (pairs & mine):
                continue
            if pairs and not mine and row['area_key']:
                continue
            row['overrides'].append({'date': o['date'], 'to': o['to'], 'reason': o['reason']})
            hit += 1
        if not hit:
            dropped.append((town, o['date'], o['reason'][:70]))
    for z in v['zips']:
        T['zip_codes'].append({'zip': z['zip'], 'region': town, 'source_url': z.get('source_url')})
    for d in (v.get('dropoff') or []):
        zm = re.search(r'\b(\d{5})\b', d.get('address') or '')
        at = d.get('accepts_text')
        acc = [m for m, pat in MAT if at and re.search(pat, at, re.I)]
        T['facilities'].append({'key': f"{town}-{slug(d['name'])[:40]}", 'region': town, 'name': d['name'], 'address': d['address'] or '',
                                'zip': zm.group(1) if zm else None, 'phone': (v.get('dpw') or {}).get('phone'), 'hours': d.get('hours') or '',
                                'residents_only': bool(d.get('residents_only')), 'accepts': acc,
                                'notes_en': ('Accepts (as printed by the town): ' + at.rstrip('.') + '.') if at else 'Accepted materials are not listed here; call Public Works before you go.',
                                'notes_es': '', 'status': 'verified', 'source_url': d['source_url'], 'last_verified': TODAY})
    stats[town] = (n_ok, n_hold)
json.dump(T, open('data/towns.json', 'w', encoding='utf8'), ensure_ascii=False, indent=2)
print('source', SRC)
for k, (a, b) in stats.items():
    print(f"{k:20} verified {a:2}  held {b:2}")
print('total verified/held', sum(a for a, b in stats.values()), sum(b for a, b in stats.values()))
print('overrides attached', sum(len(s['overrides']) for s in T['schedules'] if s['region'] in merged), 'dropped', len(dropped))
for x in dropped:
    print('  dropped', x)
