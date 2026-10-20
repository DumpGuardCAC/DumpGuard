# Applies a verify patch to towns.json (run once from the data folder). Default: _verify_patch_20261020.py; pass another patch file as the first argument.
import json, re, runpy, sys

ns = runpy.run_path(sys.argv[1] if len(sys.argv) > 1 else '_verify_patch_20261020.py')
PATCH, NEW = ns['PATCH'], ns['NEW']
DAY = '2026-10-20'

with open('towns.json', encoding='utf-8') as f:
    d = json.load(f)
S = d['schedules']

for i, p in sorted(PATCH.items()):
    row = S[i]
    assert row['region'] == p['region'] and row['stream'] == p['stream'], (i, row['region'], row['stream'])
    for k, v in p.items():
        if k not in ('region', 'stream'):
            row[k] = v
    row.setdefault('status', 'verified')
    if 'status' not in p:
        row['status'] = 'verified'
    row['last_verified'] = DAY

for p in NEW:
    row = dict(region=p['region'], stream=p['stream'], weekday=None, week_pattern='custom', dtstart=None, rrule=None,
               overrides=[], area_key=None, area_note='', notes_en='', notes_es='', source_url='', status='verified',
               last_verified=DAY)
    row.update(p)
    S.append(row)

# Old research rows carried a lowercase pattern label at the start of notes_en ("custom ", "seasonal ", ...).
prefix = re.compile(r'^(custom|by appointment|seasonal|not provided|brush|leaves) (?=[A-Z])')
for row in S:
    row['notes_en'] = prefix.sub('', row.get('notes_en') or '')

with open('towns.json', 'w', encoding='utf-8', newline='') as f:
    f.write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
print('patched', len(PATCH), 'new', len(NEW), 'rows', len(S))
