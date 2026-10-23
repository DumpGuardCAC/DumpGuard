import { createHash, randomInt } from 'node:crypto';
import { json, badRequest, validId } from './http.mjs';
import { staffOnly, AUTH_FAILS_PER_HOUR } from './alerts.mjs';
export { AUTH_FAILS_PER_HOUR };

export const TYPES = ['household', 'furniture', 'appliances', 'electronics', 'tires', 'construction', 'yard', 'hazardous', 'other'];
export const STATUSES = ['new', 'noticed', 'progress', 'resolved'];
export const SUBMIT_PER_HOUR = 5;
export const TRACK_PER_HOUR = 60;
export const REPLY_PER_HOUR = 10;
export const MAX_MESSAGES = 50;
export const MIN_GROUP = 3;
export const CELL_DEG = 0.005;
const MAX_BODY = 3 * 1024 * 1024;
const MAX_PHOTO = 2 * 1024 * 1024;
const noStore = { 'cache-control': 'no-store' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CODE_RE = /^DG-[A-Z0-9]{5}$/;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const inNj = (lat, lng) => lat >= 38.9 && lat <= 41.4 && lng >= -75.6 && lng <= -73.8;
const newCode = () => 'DG-' + Array.from({ length: 5 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
const ipOf = (request) => request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
const keyFor = (request, salt, scope) => createHash('sha256').update(`${salt}|${scope}|${ipOf(request)}`).digest('hex');
const hourStart = (now) => new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000).toISOString();

export function stripJpeg(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  const out = [buf.subarray(0, 2)];
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    while (buf[i] === 0xff && i < buf.length) i++;
    const marker = buf[i++];
    if (marker === undefined) return null;
    if (marker === 0xd9) { out.push(Buffer.from([0xff, 0xd9])); return Buffer.concat(out); }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { out.push(Buffer.from([0xff, marker])); continue; }
    if (i + 2 > buf.length) return null;
    const len = buf.readUInt16BE(i);
    if (len < 2 || i + len > buf.length) return null;
    const keep = !(marker >= 0xe0 && marker <= 0xef) && marker !== 0xfe;
    if (keep) out.push(Buffer.from([0xff, marker]), buf.subarray(i, i + len));
    i += len;
    if (marker === 0xda) {
      out.push(buf.subarray(i));
      const all = Buffer.concat(out);
      return all.length > 4 && all[all.length - 2] === 0xff && all[all.length - 1] === 0xd9 ? all : null;
    }
  }
  return null;
}

export async function censusGeocode(address, fetchFn = fetch) {
  try {
    const u = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress');
    u.search = new URLSearchParams({ address, benchmark: 'Public_AR_Current', format: 'json' });
    const r = await fetchFn(u, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return null;
    const c = (await r.json())?.result?.addressMatches?.[0]?.coordinates;
    return c && inNj(c.y, c.x) ? { lat: c.y, lng: c.x } : null;
  } catch {
    return null;
  }
}

const text = (v, min, max) => (typeof v === 'string' && v.trim().length >= min && v.trim().length <= max ? v.trim() : null);

export async function handleDumpingReport(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '', geocode = censusGeocode } = {}) {
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return json({ error: 'unsupported_media_type' }, 415, noStore);
  if ((await repo.hit(keyFor(request, salt, 'dump-submit'), hourStart(now))) > SUBMIT_PER_HOUR) return json({ error: 'rate_limited' }, 429, noStore);
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY) return json({ error: 'too_large' }, 413, noStore);
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: 'too_large' }, 413, noStore);
  let b;
  try { b = JSON.parse(raw); } catch { return json({ error: 'invalid_json' }, 400, noStore); }
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return json({ error: 'invalid_json' }, 400, noStore);

  if (!validId(b.town) || !(await repo.isPublishedTown(b.town))) return badRequest('invalid_town');
  if (!TYPES.includes(b.type)) return badRequest('invalid_type', { allowed: TYPES });
  const where = text(b.where, 3, 200);
  if (!where) return badRequest('invalid_location', { message: 'Use 3 to 200 characters.' });
  const description = text(b.description, 3, 500);
  if (!description) return badRequest('invalid_description', { message: 'Use 3 to 500 characters.' });
  let notes = null;
  if (b.notes !== undefined && b.notes !== null && b.notes !== '') {
    notes = text(b.notes, 1, 500);
    if (!notes) return badRequest('invalid_notes', { message: 'Up to 500 characters.' });
  }

  let lat = null, lng = null;
  if (b.lat !== undefined || b.lng !== undefined) {
    if (typeof b.lat !== 'number' || typeof b.lng !== 'number' || !inNj(b.lat, b.lng)) return badRequest('invalid_coordinates', { message: 'Coordinates must be in New Jersey.' });
    lat = b.lat; lng = b.lng;
  }

  let photo = null;
  if (b.photo !== undefined && b.photo !== null && b.photo !== '') {
    if (typeof b.photo !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(b.photo)) return badRequest('invalid_photo');
    const bytes = Buffer.from(b.photo, 'base64');
    if (bytes.length > MAX_PHOTO) return json({ error: 'photo_too_large' }, 413, noStore);
    photo = stripJpeg(bytes);
    if (!photo) return badRequest('invalid_photo', { message: 'Photo must be a JPEG.' });
  }

  if (lat === null) {
    const g = await geocode(`${where}, ${b.town.replace(/-/g, ' ')}, NJ`);
    if (g) { lat = g.lat; lng = g.lng; }
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    if (await repo.insertDump({ code, regionId: b.town, type: b.type, where, description, notes, lat, lng, photo })) {
      return json({ ok: true, code, located: lat !== null, photo: photo !== null }, 201, noStore);
    }
  }
  return json({ error: 'server_error' }, 500, noStore);
}

export async function handleDumpingTrack(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if ((await repo.hit(keyFor(request, salt, 'dump-track'), hourStart(now))) > TRACK_PER_HOUR) return json({ error: 'rate_limited' }, 429, noStore);
  const code = (new URL(request.url).searchParams.get('code') ?? '').trim().toUpperCase();
  if (!CODE_RE.test(code)) return badRequest('invalid_code');
  const row = await repo.dumpByCode(code);
  if (!row) return json({ error: 'not_found' }, 404, noStore);
  return json({ code, status: row.status, town: row.region_id, type: row.dump_type, created_at: row.created_at, updated_at: row.updated_at }, 200, noStore);
}

export function buildMap(pointRows, townRows) {
  const cells = new Map();
  for (const r of pointRows) {
    const k = `${r.cx}:${r.cy}`;
    const c = cells.get(k) ?? { cx: r.cx, cy: r.cy, n: 0, joint: new Map(), towns: new Set() };
    c.n++;
    c.towns.add(r.region_id);
    const jk = `${r.status}|${r.dump_type}`;
    c.joint.set(jk, (c.joint.get(jk) ?? 0) + 1);
    cells.set(k, c);
  }
  const round = (v) => Math.round(v * 1e6) / 1e6;
  return {
    min_group: MIN_GROUP,
    cells: [...cells.values()].filter((c) => c.n >= MIN_GROUP).map((c) => {
      const towns = [...c.towns];
      return {
      lat: round((c.cy + 0.5) * CELL_DEG), lng: round((c.cx + 0.5) * CELL_DEG), radius_m: 350,
      n: c.n, town: towns.length === 1 ? towns[0] : null, towns,
      groups: [...c.joint].map(([k, n]) => ({ status: k.split('|')[0], type: k.split('|')[1], n })),
    }; }),
    towns: townRows.map((t) => ({ town: t.region_id, name: t.name, counts: Object.fromEntries(STATUSES.map((s) => [s, t[s] ?? 0])) })),
  };
}

export async function handleDumpingMap(request, repo) {
  const body = buildMap(await repo.mapPoints(), await repo.townStatusCounts());
  return json(body, 200, { 'cache-control': 'public, max-age=60, s-maxage=300' });
}

export async function handleAdminDumping(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const q = new URL(request.url).searchParams;
  const status = q.get('status'), town = q.get('town');
  if (status && !STATUSES.includes(status)) return badRequest('invalid_status');
  if (town && !validId(town)) return badRequest('invalid_town');
  return json({ reports: await repo.listDumps({ status: status || null, town: town || null }) }, 200, noStore);
}

export async function handleAdminDumpingPhoto(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!UUID.test(id)) return badRequest('invalid_id');
  const bytes = await repo.dumpPhoto(id);
  if (!bytes) return json({ error: 'not_found' }, 404, noStore);
  return new Response(bytes, { status: 200, headers: { 'content-type': 'image/jpeg', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', 'content-disposition': 'inline' } });
}

export async function handleAdminDumpingStatus(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  let b;
  try { b = JSON.parse(await request.text()); } catch { return json({ error: 'invalid_json' }, 400, noStore); }
  if (typeof b?.id !== 'string' || !UUID.test(b.id)) return badRequest('invalid_id');
  if (!STATUSES.includes(b.status)) return badRequest('invalid_status', { allowed: STATUSES });
  return (await repo.setDumpStatus(b.id, b.status)) ? json({ ok: true }, 200, noStore) : json({ error: 'not_found' }, 404, noStore);
}

const readBody = async (request) => {
  try { return JSON.parse(await request.text()); } catch { return null; }
};
const cleanBody = (v) => (typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= 500 ? v.trim() : null);

export async function handleAdminDumpingMessages(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!UUID.test(id)) return badRequest('invalid_id');
  if (!(await repo.dumpExists(id))) return json({ error: 'not_found' }, 404, noStore);
  const rows = await repo.listMessages(id);
  return json({ messages: rows.map((m) => ({ from: m.from_staff ? 'staff' : 'reporter', body: m.body, at: m.created_at })) }, 200, noStore);
}

export async function handleAdminDumpingMessage(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const b = await readBody(request);
  if (!b) return json({ error: 'invalid_json' }, 400, noStore);
  if (typeof b.id !== 'string' || !UUID.test(b.id)) return badRequest('invalid_id');
  const body = cleanBody(b.body);
  if (!body) return badRequest('invalid_message');
  if (!(await repo.dumpExists(b.id))) return json({ error: 'not_found' }, 404, noStore);
  if ((await repo.countMessages(b.id)) >= MAX_MESSAGES) return json({ error: 'thread_full' }, 409, noStore);
  await repo.addMessage(b.id, true, body);
  return json({ ok: true }, 201, noStore);
}

export async function handleDumpingMessages(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if ((await repo.hit(keyFor(request, salt, 'dump-track'), hourStart(now))) > TRACK_PER_HOUR) return json({ error: 'rate_limited' }, 429, noStore);
  const code = (new URL(request.url).searchParams.get('code') ?? '').trim().toUpperCase();
  if (!CODE_RE.test(code)) return badRequest('invalid_code');
  const id = await repo.dumpIdByCode(code);
  if (!id) return json({ error: 'not_found' }, 404, noStore);
  const rows = await repo.listMessages(id);
  return json({ messages: rows.map((m) => ({ from: m.from_staff ? 'staff' : 'you', body: m.body, at: m.created_at })) }, 200, noStore);
}

export async function handleDumpingReply(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'unsupported_media_type' }, 415, noStore);
  if ((await repo.hit(keyFor(request, salt, 'dump-reply'), hourStart(now))) > REPLY_PER_HOUR) return json({ error: 'rate_limited' }, 429, noStore);
  const b = await readBody(request);
  if (!b) return json({ error: 'invalid_json' }, 400, noStore);
  const code = typeof b.code === 'string' ? b.code.trim().toUpperCase() : '';
  if (!CODE_RE.test(code)) return badRequest('invalid_code');
  const body = cleanBody(b.body);
  if (!body) return badRequest('invalid_message');
  const id = await repo.dumpIdByCode(code);
  if (!id) return json({ error: 'not_found' }, 404, noStore);
  const rows = await repo.listMessages(id);
  if (!rows.some((m) => m.from_staff)) return json({ error: 'no_thread' }, 409, noStore);
  if (rows.length >= MAX_MESSAGES) return json({ error: 'thread_full' }, 409, noStore);
  await repo.addMessage(id, false, body);
  return json({ ok: true }, 201, noStore);
}
