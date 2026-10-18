// Alerts: things that change what a person should do in the next few weeks.
//   GET    /api/v1/alerts?town=<id>[&area=<key>...][&days=21]
//          -> { announcements: [...], schedule_changes: [...] }
//          schedule_changes are holiday shifts already in the verified schedule (moved pickups), for that town and sections.
//   POST   /api/v1/admin/alerts     Bearer ADMIN_TOKEN. { town?, message_en, message_es?, ends_on, starts_on?, source_url? }
//   DELETE /api/v1/admin/alerts?id= Bearer ADMIN_TOKEN
// Announcements are written by a person (weather cancellations, plant closures). Nothing here is scraped or guessed.
import { createHash, timingSafeEqual } from 'node:crypto';
import { json, jsonWithEtag, badRequest, notFound, validId } from './http.mjs';
import { occurrences, addDays } from './occurrences.mjs';
import { localParts } from './hours.mjs';

const noStore = { 'cache-control': 'no-store' };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function authorized(request, token = process.env.ADMIN_TOKEN) {
  if (!token || token.length < 16) return false; // an unset or weak token disables the admin API
  const given = request.headers.get('authorization') ?? '';
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(`Bearer ${token}`).digest();
  return timingSafeEqual(a, b);
}

// Moved pickups in [today, today + days] for this town and chosen sections.
export function scheduleChanges(rows, areaKeys, today, days = 21) {
  const keys = new Set(areaKeys);
  const out = [];
  for (const r of rows) {
    if (r.area_key && keys.size && !keys.has(r.area_key)) continue;
    for (const o of occurrences(r, today, addDays(today, days))) {
      if (o.moved) out.push({ stream: r.stream, area: r.area_key || null, date: o.date, from: o.from ?? null, reason: o.reason ?? null });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.stream.localeCompare(b.stream)));
}

export async function handleAlerts(request, repo, { now = new Date() } = {}) {
  const url = new URL(request.url);
  const town = url.searchParams.get('town');
  if (!town || !validId(town)) return badRequest('town_required');
  const days = Math.min(Math.max(Number(url.searchParams.get('days') ?? 21) || 21, 1), 60);
  const areas = url.searchParams.getAll('area').flatMap((v) => v.split(',')).filter((k) => /^[a-z0-9:_-]{1,60}$/.test(k));
  if (!(await repo.isPublishedTown(town))) return notFound('town_not_found', { town });
  const today = localParts(now).date;
  const [announcements, rows] = await Promise.all([repo.activeAnnouncements(town, today), repo.schedulesForTown(town)]);
  const body = {
    town,
    announcements: announcements.map((a) => ({
      id: a.id, message: { en: a.message_en, es: a.message_es || a.message_en }, source_url: a.source_url, starts_on: a.starts_on, ends_on: a.ends_on,
      scope: a.region_id ? 'town' : 'all',
    })),
    schedule_changes: scheduleChanges(rows, areas, today, days),
  };
  return jsonWithEtag(request, body, { maxAge: 60, sMaxAge: 120 });
}

export async function handleCreateAlert(request, repo, { now = new Date(), token } = {}) {
  if (!authorized(request, token)) return json({ error: 'unauthorized' }, 401, noStore);
  let b;
  try {
    b = JSON.parse(await request.text());
  } catch {
    return json({ error: 'invalid_json' }, 400, noStore);
  }
  const today = localParts(now).date;
  const startsOn = b?.starts_on ?? today;
  const bad = (field, message) => json({ error: 'invalid_request', field, message }, 400, noStore);
  if (typeof b?.message_en !== 'string' || b.message_en.trim().length < 1 || b.message_en.length > 300) return bad('message_en', '1 to 300 characters.');
  if (b.message_es !== undefined && (typeof b.message_es !== 'string' || b.message_es.length > 300)) return bad('message_es', 'Up to 300 characters.');
  if (typeof b.ends_on !== 'string' || !DATE_RE.test(b.ends_on)) return bad('ends_on', 'Use YYYY-MM-DD.');
  if (typeof startsOn !== 'string' || !DATE_RE.test(startsOn)) return bad('starts_on', 'Use YYYY-MM-DD.');
  if (b.ends_on < startsOn || b.ends_on > addDays(startsOn, 60)) return bad('ends_on', 'Must be within 60 days of starts_on.');
  if (b.town !== undefined && b.town !== null) {
    if (typeof b.town !== 'string' || !validId(b.town) || !(await repo.isPublishedTown(b.town))) return bad('town', 'Unknown town.');
  }
  if (b.source_url !== undefined && b.source_url !== null && !/^https:\/\/[^\s]{1,500}$/.test(b.source_url)) return bad('source_url', 'Use an https URL.');
  const id = await repo.createAnnouncement({
    regionId: b.town ?? null, messageEn: b.message_en.trim(), messageEs: (b.message_es ?? '').trim(), sourceUrl: b.source_url ?? null, startsOn, endsOn: b.ends_on,
  });
  return json({ id }, 201, noStore);
}

export async function handleDeleteAlert(request, repo, { token } = {}) {
  if (!authorized(request, token)) return json({ error: 'unauthorized' }, 401, noStore);
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/.test(id)) return badRequest('invalid_id');
  await repo.deleteAnnouncement(id);
  return json({ ok: true }, 200, noStore);
}
