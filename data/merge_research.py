"""Merge data/towns_research.json (Cursor's primary-source pass) into data/towns.json.
Rows that parse cleanly (named weekday, plain weekly or 1st/3rd style pattern) go in as 'verified'; everything else is kept
as 'needs_verification' so it stays hidden until it is re-checked. Idempotent: re-running replaces the merged towns."""
import json, re, datetime as dt, sys
R = json.load(open('data/towns_research.json', encoding='utf8'))
T = json.load(open('data/towns.json', encoding='utf8'))
TODAY = '2026-10-18'
DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
BY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
UNTIL = '20270131'
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

def days_of(w):
    if not w: return None
    w = w.lower()
    if '(' in w or 'plus' in w or ' or ' in w: return None
    found = [DAYS.index(d) for d in DAYS if re.search(r'\b' + d + r's?\b', w)]
    return found or None

def first_on_or_after(wd, start='2026-01-01', nth=None):
    d = dt.date.fromisoformat(start)
    for _ in range(400):
        if d.weekday() == (wd - 1) % 7:
            if nth is None or ((d.day - 1) // 7 + 1) in nth: return d.isoformat()
        d += dt.timedelta(days=1)

def pattern(p):
    """-> (week_pattern, kind, nth) or None when not cleanly encodable."""
    if p is None: return None
    q = p.lower().strip()
    if re.fullmatch(r'(weekly|every week)( \(holiday weeks may shift[^)]*\))?', q): return ('weekly', 'W', None)
    m = re.match(r'^(\d)(?:st|nd|rd|th)\s*(?:and|&)\s*(\d)(?:st|nd|rd|th)\s+\w+( of the month)?(;.*)?$', q)
    if m and 'april' not in q: return ('1st_3rd' if m.group(1) == '1' else 'custom', 'M', [int(m.group(1)), int(m.group(2))])
    return None

HOLD = {('bradley-beach', 'trash'), ('union-beach', 'trash')}
merged = set(R)
T['schedules'] = [s for s in T['schedules'] if s['region'] not in merged]
T['facilities'] = [f for f in T['facilities'] if f['region'] not in merged]
T['zip_codes'] = [z for z in T['zip_codes'] if z['region'] not in merged]
stats = {}
for town, v in R.items():
    contact = ''
    if v.get('dpw') and v['dpw'].get('phone'): contact = f" Public Works: {v['dpw']['phone']}."
    tail = f"{contact} Holiday and weather changes are not listed here; check {v.get('official_site') or 'the town website'}."
    seg = lambda s: re.split(r'[;.]', s or '')[0].strip().lower()
    # decide which streams are split into zones
    zoned = {}
    for st in ('trash', 'recycling'):
        rows = [s for s in v['schedules'] if s['stream'] == st]
        segs = {seg(s['area_note']) for s in rows if days_of(s['weekday']) and pattern(s['week_pattern'])}
        zoned[st] = len(segs) > 1
    n_ok = n_hold = 0
    for s in v['schedules']:
        st = s['stream']; wds = days_of(s['weekday']); pat = pattern(s['week_pattern'])
        text = (s['area_note'] or '').strip()
        base = dict(region=town, stream=st, source_url=s['source_url'])
        if (town, st) in HOLD: wds = None  # overlapping zone labels (e.g. 'Zone 1' and 'Zone 1 and Zone 3'): needs a human
        if wds and pat and st in ('trash', 'recycling', 'bulk', 'yard', 'other'):
            kind, nth = pat[1], pat[2]
            key, note = '', ''
            if zoned.get(st):
                label = seg(text) or 'area'
                key = f"{st}:{slug(label)[:40]}"
                note = (re.split(r'[;.]', text)[0].strip() or label)
            for wd in wds:
                if kind == 'W':
                    rr = f"FREQ=WEEKLY;BYDAY={BY[wd]};UNTIL={UNTIL}"; ds = first_on_or_after(wd)
                else:
                    rr = f"FREQ=MONTHLY;BYDAY={','.join(str(n) + BY[wd] for n in nth)};UNTIL={UNTIL}"; ds = first_on_or_after(wd, nth=nth)
                T['schedules'].append({**base, 'weekday': wd, 'week_pattern': pat[0], 'area_key': key or None, 'area_note': note,
                    'dtstart': ds, 'rrule': rr, 'overrides': [], 'notes_en': (text + '.' if text and not text.endswith('.') else text) + tail,
                    'notes_es': '', 'status': 'verified', 'last_verified': TODAY})
            n_ok += 1
        else:
            wd1 = days_of(s['weekday']); 
            desc = ' '.join(x for x in [s['weekday'] if s['weekday'] and not wd1 else '', s['week_pattern'] or '', text] if x)
            T['schedules'].append({**base, 'weekday': wd1[0] if wd1 and len(wd1) == 1 else None, 'week_pattern': 'custom', 'area_key': None,
                'area_note': '', 'dtstart': None, 'rrule': None, 'overrides': [], 'notes_en': desc.strip() + tail, 'notes_es': '',
                'status': 'needs_verification', 'last_verified': None})
            n_hold += 1
    for z in v['zips']:
        T['zip_codes'].append({'zip': z['zip'], 'region': town, 'source_url': z.get('source_url')})
    for d in (v.get('dropoff') or []):
        zm = re.search(r'\b(\d{5})\b', d.get('address') or '')
        T['facilities'].append({'key': f"{town}-{slug(d['name'])[:40]}", 'region': town, 'name': d['name'], 'address': d['address'] or '',
            'zip': zm.group(1) if zm else None, 'phone': (v.get('dpw') or {}).get('phone'), 'hours': d.get('hours') or '',
            'residents_only': bool(d.get('residents_only')), 'accepts': [],
            'notes_en': 'Accepted materials are not listed here; call Public Works before you go.', 'notes_es': '', 'status': 'verified',
            'source_url': d['source_url'], 'last_verified': TODAY})
    stats[town] = (n_ok, n_hold)
json.dump(T, open('data/towns.json', 'w', encoding='utf8'), ensure_ascii=False, indent=2)
for k, (a, b) in stats.items(): print(f"{k:20} verified {a:2}  held {b:2}")
print('total verified/held', sum(a for a, b in stats.values()), sum(b for a, b in stats.values()))
