// Anonymous impact stats.
//   POST /api/v1/events   { outcome: 'recycling'|'trash'|'special_dropoff', material?, town? }   one item sorted
//   GET  /api/v1/stats    { items_sorted, by_outcome, estimated_pounds_diverted, ... }  optional ?town=
// Only a daily counter is stored (no user, device or IP), so there is nothing personal to leak. The rate limit uses
// a salted hash of the IP that expires after a day, the same as the other write endpoints.
// Pounds are an ESTIMATE from rough average item weights; the response says so and the app should too.
import { createHash } from 'node:crypto';
import { json, jsonWithEtag, badRequest, validId } from './http.mjs';
import { MATERIALS } from './materials.mjs';
import { localParts } from './hours.mjs';

export const LIMIT_PER_HOUR = 120;
const MAX_BODY = 1024;
const OUTCOMES = ['recycling', 'trash', 'special_dropoff'];
const noStore = { 'cache-control': 'no-store' };

// Rough average weight of one item in pounds. Only recycling and special drop-off count as diverted.
export const AVG_POUNDS = {
  rigid_plastic: 0.1, soft_plastic_foam: 0.05, cardboard_paper: 0.5, metal: 0.1, glass: 0.6, ewaste_hazard: 2, other: 0.3,
};
export const estimatePounds = (rows) =>
  Math.round(rows.filter((r) => r.outcome !== 'trash').reduce((sum, r) => sum + r.n * (AVG_POUNDS[r.material] ?? AVG_POUNDS.other), 0));

const clientKey = (request, salt) =>
  createHash('sha256').update(`${salt}|events|${request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'}`).digest('hex');

export async function handleEvent(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return json({ error: 'unsupported_media_type' }, 415, noStore);
  const windowStart = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000).toISOString();
  if ((await repo.hit(clientKey(request, salt), windowStart)) > LIMIT_PER_HOUR) return json({ error: 'rate_limited' }, 429, noStore);

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY) return json({ error: 'too_large' }, 413, noStore);
  let b;
  try { b = JSON.parse(raw); } catch { return json({ error: 'invalid_json' }, 400, noStore); }
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return json({ error: 'invalid_json' }, 400, noStore);

  if (!OUTCOMES.includes(b.outcome)) return badRequest('invalid_outcome', { allowed: OUTCOMES });
  const material = b.material ?? 'other';
  if (!MATERIALS.includes(material)) return badRequest('invalid_material', { allowed: MATERIALS });
  const town = b.town ?? '';
  if (town !== '' && (!validId(town) || !(await repo.isPublishedTown(town)))) return badRequest('invalid_town');

  await repo.count({ day: localParts(now).date, regionId: town, material, outcome: b.outcome });
  return json({ ok: true }, 202, noStore);
}

export async function handleStats(request, repo) {
  const town = new URL(request.url).searchParams.get('town');
  if (town !== null && !validId(town)) return badRequest('invalid_region');
  const rows = await repo.totals(town);
  const by = Object.fromEntries(OUTCOMES.map((o) => [o, 0]));
  for (const r of rows) by[r.outcome] += r.n;
  const items = OUTCOMES.reduce((s, o) => s + by[o], 0);
  return jsonWithEtag(request, {
    town,
    items_sorted: items,
    by_outcome: by,
    estimated_pounds_diverted: estimatePounds(rows),
    note: 'Pounds are an estimate from average item weights. Counts are anonymous.',
  }, { maxAge: 60, sMaxAge: 300 });
}
