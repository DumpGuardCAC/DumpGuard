// GET /api/v1/schedule/:zip  handler. Pure: takes a repo and returns a Response.
//   ?town=<id>      required when the ZIP spans several towns
//   ?area=<key>     required when the town has per-section / per-zone schedules (e.g. rs-6, zone-1a).
//                   A town can ask for more than one pick: keys of the form "group:key" (e.g. garbage:mon) form their own
//                   group, plain keys form the group "area". Pass one key per group, repeated or comma separated.
//   ?format=ics     download a calendar instead of JSON
// A ZIP is not a pickup day: the endpoint answers with what it still needs (needs: 'town' | 'area') until the
// user has chosen, and never guesses.
import { occurrences, addDays } from './occurrences.mjs';
import { buildIcs } from './ics.mjs';
import { localParts } from './hours.mjs';

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, s-maxage=3600', ...extra },
  });

// New Jersey calendar date, not UTC: after 8 pm Eastern UTC is already tomorrow.
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
  const areas = [...new Map(all.filter((r) => r.area_key).map((r) => [r.area_key, r])).values()].map((r) => ({
    key: r.area_key,
    group: groupOf(r.area_key),
    label: r.area_note.split(':')[0].replace(/\s*\(.*\)$/, ''),
    description: r.area_note.includes(':') ? r.area_note.split(':').slice(1).join(':').trim() : '',
  }));
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
    // Town-wide rows (no area_key) apply to everyone; keyed rows only to the chosen section/zone/day.
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
        // A subscribed feed is fetched by the calendar app, not saved, so no attachment header; it refreshes every 12 h.
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
    source_url: r.source_url,
    last_verified: r.last_verified,
    rrule: r.rrule,
    dtstart: r.dtstart,
    overrides: r.overrides,
    dates: r.dates || [],
    next: occurrences(r, today, to).slice(0, 6),
  }));
  // Same query with the section choice, as a link a calendar app can subscribe to (webcal:// opens the app directly).
  const q = new URLSearchParams({ town: town.id, format: 'ics', subscribe: '1' });
  for (const a of selected) q.append('area', a.key);
  const feed = `${url.host}${url.pathname}?${q}`;
  const calendar = { https: `https://${feed}`, webcal: `webcal://${feed}` };
  return json({ zip, town, area, selected, schedules, calendar });
}
