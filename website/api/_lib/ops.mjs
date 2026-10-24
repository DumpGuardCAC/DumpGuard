import { bad, clientKey, hourStart, isJson, json, noStoreJson, readJson } from './http.mjs';
import { addDays } from './recurrence.mjs';
import { BULK_DEMO_NOTICE } from './spanish.mjs';
import { bearerMatches } from './auth.mjs';

export async function handleHealth(repo) {
  try {
    const ok = await repo.ping();
    return json({ ok, time: new Date().toISOString() }, ok ? 200 : 503, { 'cache-control': 'no-store' });
  } catch {
    return json({ ok: false }, 503, { 'cache-control': 'no-store' });
  }
}

const BULK_LIMIT = 5;
const MAX_BODY_BYTES = 8 * 1024;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export async function handleBulkRequest(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if (!isJson(request)) {
    return noStoreJson({ error: 'unsupported_media_type', message: 'Send application/json.' }, 415);
  }
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return noStoreJson({ error: 'too_large' }, 413);

  const windowStart = hourStart(now);
  const hits = await repo.hit(clientKey(request, salt, 'bulk-request'), windowStart);
  if (hits > BULK_LIMIT) {
    const retry = Math.ceil((Date.parse(windowStart) + 3_600_000 - now.getTime()) / 1000);
    return noStoreJson({ error: 'rate_limited', message: 'Too many requests. Try again later.' }, 429, { 'retry-after': String(retry) });
  }

  const { body, error } = await readJson(request, MAX_BODY_BYTES);
  if (error) return error;

  const { town, email, description, preferred_date: preferred } = body;
  if (typeof town !== 'string' || !/^[a-z0-9-]{1,40}$/.test(town)) return bad('town', 'Choose a town.');
  if (typeof email !== 'string' || email.length > 254 || !EMAIL_RE.test(email.trim())) return bad('email', 'Enter a valid email address.');
  if (typeof description !== 'string') return bad('description', 'Describe the items.');
  const desc = description.trim();
  if (desc.length < 1 || desc.length > 1000) return bad('description', 'Description must be 1 to 1000 characters.');
  if (CONTROL_RE.test(desc)) return bad('description', 'Description contains invalid characters.');

  let preferredDate = null;
  if (preferred !== undefined && preferred !== null && preferred !== '') {
    const today = now.toISOString().slice(0, 10);
    if (typeof preferred !== 'string' || !validDate(preferred)) return bad('preferred_date', 'Use YYYY-MM-DD.');
    if (preferred < today || preferred > addDays(today, 90)) return bad('preferred_date', 'Pick a date within the next 90 days.');
    preferredDate = preferred;
  }

  if (!(await repo.isPublishedTown(town))) return bad('town', 'That town is not available yet.');

  const { id, expiresAt } = await repo.insert({ regionId: town, email: email.trim(), description: desc, preferredDate });
  return noStoreJson({
    id,
    demo: true,
    expires_at: expiresAt,
    message: 'Demo request saved. It was not sent to your town. It will be deleted automatically after 90 days.',
    notice: BULK_DEMO_NOTICE,
  }, 201);
}

export async function handlePurge(request, repo, { secret = process.env.CRON_SECRET } = {}) {
  if (!bearerMatches(request.headers.get('authorization') ?? '', secret)) return noStoreJson({ error: 'unauthorized' }, 401);
  await repo.purge();
  return noStoreJson({ ok: true }, 200);
}
