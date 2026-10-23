import { createHash } from 'node:crypto';
import { json, badRequest, validId } from './http.mjs';
import { staffOnly } from './alerts.mjs';

export const LIMIT_PER_HOUR = 10;
const MAX_BODY = 4 * 1024;
export const KINDS = ['item_rule', 'schedule', 'facility', 'scan', 'other'];
const noStore = { 'cache-control': 'no-store' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const clientKey = (request, salt) =>
  createHash('sha256').update(`${salt}|reports|${request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'}`).digest('hex');

export async function handleReport(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return json({ error: 'unsupported_media_type' }, 415, noStore);
  const windowStart = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000).toISOString();
  if ((await repo.hit(clientKey(request, salt), windowStart)) > LIMIT_PER_HOUR) return json({ error: 'rate_limited' }, 429, noStore);

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY) return json({ error: 'too_large' }, 413, noStore);
  let b;
  try { b = JSON.parse(raw); } catch { return json({ error: 'invalid_json' }, 400, noStore); }
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return json({ error: 'invalid_json' }, 400, noStore);

  if (!KINDS.includes(b.kind)) return badRequest('invalid_kind', { allowed: KINDS });
  const message = typeof b.message === 'string' ? b.message.trim() : '';
  if (message.length < 3 || message.length > 500) return badRequest('invalid_message', { message: 'Use 3 to 500 characters.' });
  for (const f of ['item', 'town', 'facility']) {
    if (b[f] !== undefined && !validId(b[f])) return badRequest(`invalid_${f}`);
  }
  if (b.town && !(await repo.isPublishedTown(b.town))) return badRequest('invalid_town');

  await repo.insertReport({ kind: b.kind, itemId: b.item ?? null, regionId: b.town ?? null, facilityKey: b.facility ?? null, message });
  return json({ ok: true }, 201, noStore);
}

export async function handleListReports(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const status = new URL(request.url).searchParams.get('status') ?? 'open';
  if (!['open', 'resolved', 'dismissed'].includes(status)) return badRequest('invalid_status');
  return json({ status, reports: await repo.listReports(status) }, 200, noStore);
}

export async function handleResolveReport(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  let b;
  try { b = JSON.parse(await request.text()); } catch { return json({ error: 'invalid_json' }, 400, noStore); }
  if (typeof b?.id !== 'string' || !UUID.test(b.id)) return badRequest('invalid_id');
  if (!['resolved', 'dismissed'].includes(b.status)) return badRequest('invalid_status');
  const found = await repo.setReportStatus(b.id, b.status);
  return found ? json({ ok: true }, 200, noStore) : json({ error: 'not_found' }, 404, noStore);
}
