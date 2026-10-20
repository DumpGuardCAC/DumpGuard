// POST /api/v1/bulk-request  -- DEMO ONLY. Nothing is sent to any municipality (the table forces is_demo = true).
// Body (JSON): { town, email, description, preferred_date? }
// Stores the contact email and description for 90 days (purge_expired), nothing else: no IP, no user agent.
import { createHash } from 'node:crypto';
import { addDays } from './occurrences.mjs';
import { bearerMatches } from './alerts.mjs';
import { BULK_DEMO_NOTICE } from './strings.mjs';

export const LIMIT_PER_HOUR = 5;
const MAX_BODY_BYTES = 8 * 1024;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/; // same shape the DB CHECK enforces
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const json = (body, status, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });

const bad = (field, message) => json({ error: 'invalid_request', field, message }, 400);

function clientKey(request, salt) {
  const fwd = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  return createHash('sha256').update(`${salt}|bulk-request|${fwd}`).digest('hex'); // never store the raw IP
}

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export async function handleBulkRequest(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return json({ error: 'unsupported_media_type', message: 'Send application/json.' }, 415);
  }
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return json({ error: 'too_large' }, 413);

  // Rate limit before doing any other work, including parsing.
  const windowStart = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000).toISOString();
  const hits = await repo.hit(clientKey(request, salt), windowStart);
  if (hits > LIMIT_PER_HOUR) {
    const retry = Math.ceil((Date.parse(windowStart) + 3_600_000 - now.getTime()) / 1000);
    return json({ error: 'rate_limited', message: 'Too many requests. Try again later.' }, 429, { 'retry-after': String(retry) });
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json({ error: 'too_large' }, 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'invalid_json' }, 400);

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

  // Unpublished or unknown towns look the same, so the endpoint does not reveal which towns exist.
  if (!(await repo.isPublishedTown(town))) return bad('town', 'That town is not available yet.');

  const { id, expiresAt } = await repo.insert({ regionId: town, email: email.trim(), description: desc, preferredDate });
  return json({
    id,
    demo: true,
    expires_at: expiresAt,
    message: 'Demo request saved. It was not sent to your town. It will be deleted automatically after 90 days.',
    notice: BULK_DEMO_NOTICE,
  }, 201);
}

// Vercel cron: GET /api/v1/cron/purge with `Authorization: Bearer $CRON_SECRET`.
export async function handlePurge(request, repo, { secret = process.env.CRON_SECRET } = {}) {
  if (!bearerMatches(request.headers.get('authorization') ?? '', secret)) return json({ error: 'unauthorized' }, 401);
  await repo.purge();
  return json({ ok: true }, 200);
}
