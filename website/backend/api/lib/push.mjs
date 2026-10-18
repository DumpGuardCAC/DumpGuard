// Pickup reminders over web push.
//   GET  /api/v1/push/key           the public VAPID key the browser needs to subscribe
//   POST /api/v1/push/subscribe     { subscription: { endpoint, keys: { p256dh, auth } }, town, areas?, streams?, lang? }
//   POST /api/v1/push/unsubscribe   { endpoint }
//   GET  /api/v1/cron/reminders     Bearer CRON_SECRET. Sends tonight's "tomorrow's pickup" notices.
// The schedule choice is validated against the town's real schedule rows, so a subscription can never ask for a
// section that does not exist. Push endpoints are restricted to the browsers' push services (no arbitrary URLs).
import { createHash } from 'node:crypto';
import { json } from './http.mjs';
import { occurrences, addDays } from './occurrences.mjs';
import { localParts } from './hours.mjs';

const MAX_BODY = 4 * 1024;
export const LIMIT_PER_HOUR = 10;
const STREAMS = ['trash', 'recycling', 'bulk', 'yard'];
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /\.push\.apple\.com$/, /^web\.push\.apple\.com$/,
  /\.notify\.windows\.com$/, /^updates-autopush\.(stage\.)?mozaws\.net$/, /^push\.services\.mozilla\.com$/,
];
export const allowedEndpoint = (s) => {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') && PUSH_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
};

const bad = (field, message) => json({ error: 'invalid_request', field, message }, 400, { 'cache-control': 'no-store' });
const noStore = { 'cache-control': 'no-store' };

function clientKey(request, salt) {
  const fwd = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  return createHash('sha256').update(`${salt}|push|${fwd}`).digest('hex');
}

const groupOf = (key) => (key.includes(':') ? key.split(':')[0] : 'area');

// Same selection rules as the schedule endpoint: one key per group, all groups chosen when the town has any.
export function validateAreas(rows, areaKeys) {
  const keys = [...new Set(rows.filter((r) => r.area_key).map((r) => r.area_key))];
  if (keys.length === 0) return areaKeys.length === 0 ? { ok: true } : { ok: false, message: 'This town has no sections.' };
  if (areaKeys.some((k) => !keys.includes(k))) return { ok: false, message: 'Unknown section.' };
  const groups = [...new Set(keys.map(groupOf))];
  for (const g of groups) {
    const n = areaKeys.filter((k) => groupOf(k) === g).length;
    if (n === 0) return { ok: false, message: `Choose a ${g === 'area' ? 'section' : g}.` };
    if (n > 1) return { ok: false, message: `Only one ${g === 'area' ? 'section' : g} can be chosen.` };
  }
  return { ok: true };
}

export function handlePushKey(env = process.env) {
  const key = env.VAPID_PUBLIC_KEY;
  if (!key) return json({ error: 'push_not_configured' }, 503, noStore);
  return json({ public_key: key }, 200, { 'cache-control': 'public, s-maxage=86400' });
}

export async function handleSubscribe(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return json({ error: 'unsupported_media_type' }, 415, noStore);
  }
  const windowStart = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000).toISOString();
  if ((await repo.hit(clientKey(request, salt), windowStart)) > LIMIT_PER_HOUR) return json({ error: 'rate_limited' }, 429, noStore);

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY) return json({ error: 'too_large' }, 413, noStore);
  let b;
  try {
    b = JSON.parse(raw);
  } catch {
    return json({ error: 'invalid_json' }, 400, noStore);
  }
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return json({ error: 'invalid_json' }, 400, noStore);

  const sub = b.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (typeof endpoint !== 'string' || !allowedEndpoint(endpoint)) return bad('subscription', 'Unsupported push service.');
  if (typeof p256dh !== 'string' || !/^[A-Za-z0-9_-]{20,200}$/.test(p256dh)) return bad('subscription', 'Bad p256dh key.');
  if (typeof auth !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(auth)) return bad('subscription', 'Bad auth secret.');

  const town = b.town;
  if (typeof town !== 'string' || !/^[a-z0-9-]{1,40}$/.test(town)) return bad('town', 'Choose a town.');
  const areas = b.areas ?? [];
  if (!Array.isArray(areas) || areas.length > 6 || areas.some((a) => typeof a !== 'string' || !/^[a-z0-9:_-]{1,60}$/.test(a))) {
    return bad('areas', 'Bad sections.');
  }
  const streams = b.streams ?? STREAMS;
  if (!Array.isArray(streams) || streams.length === 0 || streams.some((s) => !STREAMS.includes(s))) return bad('streams', `Use any of ${STREAMS.join(', ')}.`);
  const lang = b.lang ?? 'en';
  if (lang !== 'en' && lang !== 'es') return bad('lang', 'Use en or es.');

  if (!(await repo.isPublishedTown(town))) return bad('town', 'That town is not available yet.');
  const rows = await repo.schedulesForTown(town);
  if (rows.length === 0) return bad('town', 'That town has no verified schedule yet.');
  const v = validateAreas(rows, areas);
  if (!v.ok) return bad('areas', v.message);

  await repo.upsert({ endpoint, p256dh, auth, regionId: town, areaKeys: areas, streams: [...new Set(streams)], lang });
  return json({ ok: true }, 201, noStore);
}

export async function handleUnsubscribe(request, repo) {
  let b;
  try {
    b = JSON.parse(await request.text());
  } catch {
    return json({ error: 'invalid_json' }, 400, noStore);
  }
  if (typeof b?.endpoint !== 'string' || b.endpoint.length > 1000) return bad('endpoint', 'Missing endpoint.');
  await repo.remove(b.endpoint);
  return json({ ok: true }, 200, noStore); // same answer whether or not it existed
}

const STREAM_NAME = {
  en: { trash: 'trash', recycling: 'recycling', bulk: 'bulk pickup', yard: 'yard waste' },
  es: { trash: 'basura', recycling: 'reciclaje', bulk: 'objetos grandes', yard: 'desechos de jardín' },
};

export function reminderText(lang, townName, streams, { moved = false, announcement = '' } = {}) {
  const names = streams.map((s) => STREAM_NAME[lang][s]);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} ${lang === 'es' ? 'y' : 'and'} ${names.at(-1)}` : names[0];
  const shifted = moved ? (lang === 'es' ? ' Esta fecha cambió por un feriado.' : ' This date moved because of a holiday.') : '';
  const extra = announcement ? ` ${announcement}` : '';
  return lang === 'es'
    ? { title: `Mañana: ${list}`, body: `Saque lo de ${list} esta noche. ${townName}.${shifted}${extra} Confirme con su municipio si hay cambios.` }
    : { title: `Tomorrow: ${list}`, body: `Set out your ${list} tonight. ${townName}.${shifted}${extra} Double check with your town for changes.` };
}

// What is picked up on `date` for this subscription: [{ stream, moved, from }]
export function pickupsOn(rows, sub, date) {
  const keys = new Set(sub.area_keys);
  const found = new Map();
  for (const r of rows) {
    if (r.area_key && !keys.has(r.area_key)) continue;
    if (!sub.streams.includes(r.stream)) continue;
    const o = occurrences(r, date, date)[0];
    if (o && !found.has(r.stream)) found.set(r.stream, { stream: r.stream, moved: !!o.moved, from: o.from ?? null });
  }
  return STREAMS.filter((s) => found.has(s)).map((s) => found.get(s));
}
export const streamsOn = (rows, sub, date) => pickupsOn(rows, sub, date).map((p) => p.stream);

// send(sub, payload) -> resolves, or rejects with { statusCode }. Called once per due subscription.
export async function handleReminders(request, repo, send, { secret = process.env.CRON_SECRET, now = new Date() } = {}) {
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return json({ error: 'unauthorized' }, 401, noStore);
  const today = localParts(now).date;
  const tomorrow = addDays(today, 1);
  const subs = await repo.dueSubscriptions(today);
  const cache = new Map();
  const stats = { checked: subs.length, sent: 0, skipped: 0, removed: 0, failed: 0 };
  for (const sub of subs) {
    if (!cache.has(sub.region_id)) cache.set(sub.region_id, await repo.schedulesForTown(sub.region_id));
    const pickups = pickupsOn(cache.get(sub.region_id), sub, tomorrow);
    if (pickups.length === 0) { stats.skipped++; continue; }
    const townName = (await repo.townName(sub.region_id)) ?? sub.region_id;
    const notes = repo.activeAnnouncements ? await repo.activeAnnouncements(sub.region_id, tomorrow) : [];
    const announcement = notes[0] ? (sub.lang === 'es' && notes[0].message_es ? notes[0].message_es : notes[0].message_en) : '';
    try {
      const text = reminderText(sub.lang, townName, pickups.map((p) => p.stream), { moved: pickups.some((p) => p.moved), announcement });
      await send(sub, JSON.stringify({ ...text, date: tomorrow, town: sub.region_id }));
      await repo.markSent(sub.id, today);
      stats.sent++;
    } catch (err) {
      if (err?.statusCode === 404 || err?.statusCode === 410) { await repo.remove(sub.endpoint); stats.removed++; } else { await repo.fail(sub.id); stats.failed++; }
    }
  }
  return json({ ok: true, date: tomorrow, ...stats }, 200, noStore);
}
