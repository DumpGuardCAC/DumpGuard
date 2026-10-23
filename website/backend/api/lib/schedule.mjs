import { occurrences, addDays } from './occurrences.mjs';
import { buildIcs } from './ics.mjs';
import { localParts } from './hours.mjs';
import { toEs } from './es_labels.mjs';

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 400 || status === 404 ? 'no-store' : 'public, s-maxage=3600',
      ...extra,
    },
  });

const todayIso = () => localParts(new Date()).date;

export async function handleSchedule(request, zip, repo, { today = todayIso(), now = new Date() } = {}) {
  if (!/^\d{5}$/.test(zip ?? '')) return json({ error: 'invalid_zip', message: 'ZIP must be 5 digits.' }, 400);
  const url = new URL(request.url);
  const townParam = url.searchParams.get('town');
  const areaParams = url.searchParams.getAll('area').flatMap((v) => v.split(',')).filter(Boolean);
  const wantIcs = url.searchParams.get('format') === 'ics';
  const subscribe = wantIcs && url.searchParams.get('subscribe') === '1';
  if (url.searchParams.get('format') && !wantIcs && url.searchParams.get('format') !== 'json') {
    return json({ error: 'invalid_format' }, 400);
  }

  const towns = await repo.townsForZip(zip);
  if (towns.length === 0) {
    return json({ error: 'zip_not_covered', message: 'We do not have verified collection data for this ZIP yet.' }, 404);
  }
  let town = towns[0];
  if (towns.length > 1) {
    town = towns.find((t) => t.id === townParam);
    if (!town) return json({ needs: 'town', zip, towns }, wantIcs ? 409 : 200);
  } else if (townParam && townParam !== town.id) {
    return json({ error: 'town_not_in_zip', zip, towns }, 400);
  }

  const all = await repo.schedulesForTown(town.id);
  if (all.length === 0) {
    return json({ error: 'no_schedule', town, message: 'No verified pickup schedule for this town yet.' }, 404);
  }

  const groupOf = (key) => (key.includes(':') ? key.split(':')[0] : 'area');
const splitNote = (n) => ({
    label: n.split(':')[0].replace(/\s*\(.*\)$/, ''),
    description: n.includes(':') ? n.split(':').slice(1).join(':').trim() : '',
  });
  const areas = [...new Map(all.filter((r) => r.area_key).map((r) => [r.area_key, r])).values()].map((r) => {
    const en = splitNote(r.area_note);
    const es = splitNote(toEs(r.area_note));
    return { key: r.area_key, group: groupOf(r.area_key), ...en, label_es: es.label, description_es: es.description };
  });
  const groups = [...new Set(areas.map((a) => a.group))];
  let rows = all;
  let selected = [];
  if (areas.length) {
    const unknown = areaParams.filter((k) => !areas.some((a) => a.key === k));
    if (unknown.length) return json({ error: 'unknown_area', town, areas, groups }, 400);
    selected = areaParams.map((k) => areas.find((a) => a.key === k));
    const dup = groups.find((g) => selected.filter((a) => a.group === g).length > 1);
    if (dup) return json({ error: 'one_area_per_group', group: dup, town, areas, groups }, 400);
    const missing = groups.filter((g) => !selected.some((a) => a.group === g));
    if (missing.length) {
      return json({ needs: 'area', zip, town, areas, groups, missing }, wantIcs ? 409 : 200);
    }
    const keys = new Set(selected.map((a) => a.key));
    rows = all.filter((r) => !r.area_key || keys.has(r.area_key));
  }
  const area = selected[0] ?? null;

  if (wantIcs) {
    const body = buildIcs({ townName: town.name, rows, today, now, subscribe });
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        ...(subscribe ? {} : { 'content-disposition': `attachment; filename="dumpguard-${town.id}${selected.length ? `-${selected.map((a) => a.key.replace(':', '-')).join('-')}` : ''}.ics"` }),
        'cache-control': subscribe ? 'public, max-age=3600, s-maxage=3600' : 'public, s-maxage=3600',
      },
    });
  }

  const to = addDays(today, 60);
  const schedules = rows.map((r) => ({
    stream: r.stream,
    weekday: r.weekday,
    pattern: r.week_pattern,
    area: r.area_key || null,
    note_en: r.notes_en,
    note_es: r.notes_es,
    rrule: r.rrule,
    dtstart: r.dtstart,
    overrides: r.overrides,
    dates: r.dates || [],
    next: occurrences(r, today, to).slice(0, 6).map((o) => ({
      ...o,
      ...(o.reason ? { reason_es: toEs(o.reason) } : {}),
      ...(o.label ? { label_es: toEs(o.label) } : {}),
    })),
  }));
  const q = new URLSearchParams({ town: town.id, format: 'ics', subscribe: '1' });
  for (const a of selected) q.append('area', a.key);
  const feed = `${url.host}${url.pathname}?${q}`;
  const calendar = { https: `https://${feed}`, webcal: `webcal://${feed}` };
  return json({ zip, town, area, selected, schedules, calendar });
}
