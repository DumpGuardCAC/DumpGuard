"""Browser-verified fixes on top of v5 -> towns_research_v6.json."""
import json, copy
d = json.load(open('data/towns_research_v5.json', encoding='utf-8'))
T = d['towns'] if 'towns' in d else d

# Perth Amboy: 2026 holiday/guidelines PDF + Public Works page
PA_SRC = 'https://www.perthamboynj.org/UserFiles/Servers/Server_11204924/File/Departments/Public%20Works/2026/Holiday%20Annual%20Guidelines%20Dates%202026%20_LLdocx.pdf'
def row(stream, wd, note, src, sd='2026', pat='every week'):
    return {'stream': stream, 'weekday': wd, 'week_pattern': pat, 'area_note': note, 'source_url': src, 'source_date': sd}
pa = T['perth-amboy']
pa['schedules'] = [
    row('trash', 'Monday', 'North Side (above the Conrail train tracks)', PA_SRC),
    row('trash', 'Thursday', 'North Side (above the Conrail train tracks)', PA_SRC),
    row('trash', 'Tuesday', 'South Side (below the Conrail train tracks)', PA_SRC),
    row('trash', 'Friday', 'South Side (below the Conrail train tracks)', PA_SRC),
    row('recycling', 'Wednesday', 'Citywide', 'https://www.perthamboynj.org/government/departments/public_works', 'standing'),
]
pa['holiday_rule'] = ('No garbage collection on 2026 holidays (Jan 1, Jan 19, Feb 16, May 25, Jul 3, Sep 7, Oct 12, Nov 11, Nov 26, Dec 25, Jan 1 2027). '
                      'If a holiday falls on your collection day, service resumes on the next scheduled collection day. Recycling is collected every Wednesday except when a holiday falls on a Wednesday.')
pa['notes'] = ('v6 browser pass: North/South side days from the 2026 Garbage Collection Holiday Schedule PDF; Wednesday recycling from the Sanitation division text '
               'on the Public Works page (municipal-collection households only).')

# Loch Arbour: Village newsletter linked from its trash-recycling page (dated January 2025)
la = T['loch-arbour']
LA = 'https://www.locharbournj.us/trash-recycling/files/refuse-and-recyclable-information'
la['schedules'] = [s for s in la['schedules'] if s['stream'] not in ('trash', 'recycling')]
la['schedules'].insert(0, row('trash', 'Tuesday', 'Household refuse, rear yard pickup; limit 3 containers of 30 gallons', LA, 'standing'))
la['schedules'].insert(1, row('trash', 'Friday', 'Household refuse, rear yard pickup; limit 3 containers of 30 gallons', LA, 'standing'))
la['schedules'].append({'stream': 'recycling', 'weekday': None, 'week_pattern': 'custom',
    'area_note': 'Commingled bottles, cans and plastic containers: 1st, 3rd and 5th Wednesday of the month, curbside by 7:00 a.m. (village newsletter dated January 2025; confirm with the Village).',
    'source_url': LA, 'source_date': 'standing'})
la['notes'] = 'Refuse and recycling days come from the Village refuse and recyclable information newsletter (January 2025 edition) linked from the current trash-recycling page. 2025 bulk dates in it differ from the 2026 list on the page, so confirm weekly days with the Village. Recycling uses a 1st/3rd/5th Wednesday pattern, which is not publishable.'

# Sayreville: the Thursday MCIA row's biweekly phase is 2026-01-01 (anchor shifted back one cycle so the Jan 1 holiday move can attach)
for s in T['sayreville']['schedules']:
    if s['stream'] == 'recycling' and s['weekday'] == 'Thursday' and s.get('anchor_date') == '2026-01-15':
        s['anchor_date'] = '2025-12-18'

d2 = d
json.dump(d2, open('data/towns_research_v6.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print('ok')
