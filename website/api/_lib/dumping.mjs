import { randomInt } from 'node:crypto';
import { UUID, badRequest, clientKey, hourStart, isJson, json, noStoreJson, readBody, readJson, validId } from './http.mjs';
import { staffOnly } from './auth.mjs';

const TYPES = ['household', 'furniture', 'appliances', 'electronics', 'tires', 'construction', 'yard', 'hazardous', 'other'];
const STATUSES = ['new', 'noticed', 'progress', 'resolved'];
const SUBMIT_PER_HOUR = 5;
const TRACK_PER_HOUR = 60;
const REPLY_PER_HOUR = 10;
const MAX_MESSAGES = 50;
const MIN_GROUP = 3;
const CELL_DEG = 0.005;
const DUMP_MAX_BODY = 3 * 1024 * 1024;
const MAX_PHOTO = 2 * 1024 * 1024;
const CODE_RE = /^DG-[A-Z0-9]{5}$/;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const inNj = (lat, lng) => lat >= 38.9 && lat <= 41.4 && lng >= -75.6 && lng <= -73.8;
const newCode = () => 'DG-' + Array.from({ length: 5 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');

function stripJpeg(buf) {
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

async function censusGeocode(address, fetchFn = fetch) {
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
  if (!isJson(request)) return noStoreJson({ error: 'unsupported_media_type' }, 415);
  if ((await repo.hit(clientKey(request, salt, 'dump-submit'), hourStart(now))) > SUBMIT_PER_HOUR) return noStoreJson({ error: 'rate_limited' }, 429);
  if (Number(request.headers.get('content-length') ?? 0) > DUMP_MAX_BODY) return noStoreJson({ error: 'too_large' }, 413);
  const { body: b, error } = await readJson(request, DUMP_MAX_BODY);
  if (error) return error;

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
    if (bytes.length > MAX_PHOTO) return noStoreJson({ error: 'photo_too_large' }, 413);
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
      return noStoreJson({ ok: true, code, located: lat !== null, photo: photo !== null }, 201);
    }
  }
  return noStoreJson({ error: 'server_error' }, 500);
}

export async function handleDumpingTrack(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if ((await repo.hit(clientKey(request, salt, 'dump-track'), hourStart(now))) > TRACK_PER_HOUR) return noStoreJson({ error: 'rate_limited' }, 429);
  const code = (new URL(request.url).searchParams.get('code') ?? '').trim().toUpperCase();
  if (!CODE_RE.test(code)) return badRequest('invalid_code');
  const row = await repo.dumpByCode(code);
  if (!row) return noStoreJson({ error: 'not_found' }, 404);
  return noStoreJson({ code, status: row.status, town: row.region_id, type: row.dump_type, created_at: row.created_at, updated_at: row.updated_at }, 200);
}

function buildMap(pointRows, townRows) {
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
      };
    }),
    towns: townRows.map((t) => ({ town: t.region_id, name: t.name, counts: Object.fromEntries(STATUSES.map((s) => [s, t[s] ?? 0])) })),
  };
}

export async function handleDumpingMap(repo) {
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
  return noStoreJson({ reports: await repo.listDumps({ status: status || null, town: town || null }) }, 200);
}

export async function handleAdminDumpingPhoto(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!UUID.test(id)) return badRequest('invalid_id');
  const bytes = await repo.dumpPhoto(id);
  if (!bytes) return noStoreJson({ error: 'not_found' }, 404);
  return new Response(bytes, { status: 200, headers: { 'content-type': 'image/jpeg', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', 'content-disposition': 'inline' } });
}

export async function handleAdminDumpingStatus(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const b = await readBody(request);
  if (b === undefined) return noStoreJson({ error: 'invalid_json' }, 400);
  if (typeof b?.id !== 'string' || !UUID.test(b.id)) return badRequest('invalid_id');
  if (!STATUSES.includes(b.status)) return badRequest('invalid_status', { allowed: STATUSES });
  return (await repo.setDumpStatus(b.id, b.status)) ? noStoreJson({ ok: true }, 200) : noStoreJson({ error: 'not_found' }, 404);
}

export async function handleAdminDumpingMessages(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!UUID.test(id)) return badRequest('invalid_id');
  if (!(await repo.dumpExists(id))) return noStoreJson({ error: 'not_found' }, 404);
  const rows = await repo.listMessages(id);
  return noStoreJson({ messages: rows.map((m) => ({ from: m.from_staff ? 'staff' : 'reporter', body: m.body, at: m.created_at })) }, 200);
}

export async function handleAdminDumpingMessage(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const b = await readBody(request);
  if (!b) return noStoreJson({ error: 'invalid_json' }, 400);
  if (typeof b.id !== 'string' || !UUID.test(b.id)) return badRequest('invalid_id');
  const body = text(b.body, 1, 500);
  if (!body) return badRequest('invalid_message');
  if (!(await repo.dumpExists(b.id))) return noStoreJson({ error: 'not_found' }, 404);
  if ((await repo.countMessages(b.id)) >= MAX_MESSAGES) return noStoreJson({ error: 'thread_full' }, 409);
  await repo.addMessage(b.id, true, body);
  return noStoreJson({ ok: true }, 201);
}

export async function handleDumpingMessages(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if ((await repo.hit(clientKey(request, salt, 'dump-track'), hourStart(now))) > TRACK_PER_HOUR) return noStoreJson({ error: 'rate_limited' }, 429);
  const code = (new URL(request.url).searchParams.get('code') ?? '').trim().toUpperCase();
  if (!CODE_RE.test(code)) return badRequest('invalid_code');
  const id = await repo.dumpIdByCode(code);
  if (!id) return noStoreJson({ error: 'not_found' }, 404);
  const rows = await repo.listMessages(id);
  return noStoreJson({ messages: rows.map((m) => ({ from: m.from_staff ? 'staff' : 'you', body: m.body, at: m.created_at })) }, 200);
}

export async function handleDumpingReply(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if (!isJson(request)) return noStoreJson({ error: 'unsupported_media_type' }, 415);
  if ((await repo.hit(clientKey(request, salt, 'dump-reply'), hourStart(now))) > REPLY_PER_HOUR) return noStoreJson({ error: 'rate_limited' }, 429);
  const b = await readBody(request);
  if (!b) return noStoreJson({ error: 'invalid_json' }, 400);
  const code = typeof b.code === 'string' ? b.code.trim().toUpperCase() : '';
  if (!CODE_RE.test(code)) return badRequest('invalid_code');
  const body = text(b.body, 1, 500);
  if (!body) return badRequest('invalid_message');
  const id = await repo.dumpIdByCode(code);
  if (!id) return noStoreJson({ error: 'not_found' }, 404);
  const rows = await repo.listMessages(id);
  if (!rows.some((m) => m.from_staff)) return noStoreJson({ error: 'no_thread' }, 409);
  if (rows.length >= MAX_MESSAGES) return noStoreJson({ error: 'thread_full' }, 409);
  await repo.addMessage(id, false, body);
  return noStoreJson({ ok: true }, 201);
}
