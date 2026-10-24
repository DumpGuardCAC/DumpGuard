import { UUID, badRequest, clientKey, hourStart, isJson, jsonWithEtag, noStoreJson, readBody, readJson, validId } from './http.mjs';
import { staffOnly } from './auth.mjs';
import { MATERIALS } from './items.mjs';
import { localParts } from './time.mjs';

const REPORT_LIMIT = 10;
const REPORT_MAX_BODY = 4 * 1024;
const KINDS = ['item_rule', 'schedule', 'facility', 'scan', 'other'];

export async function handleReport(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if (!isJson(request)) return noStoreJson({ error: 'unsupported_media_type' }, 415);
  const windowStart = hourStart(now);
  if ((await repo.hit(clientKey(request, salt, 'reports'), windowStart)) > REPORT_LIMIT) return noStoreJson({ error: 'rate_limited' }, 429);

  const { body: b, error } = await readJson(request, REPORT_MAX_BODY);
  if (error) return error;

  if (!KINDS.includes(b.kind)) return badRequest('invalid_kind', { allowed: KINDS });
  const message = typeof b.message === 'string' ? b.message.trim() : '';
  if (message.length < 3 || message.length > 500) return badRequest('invalid_message', { message: 'Use 3 to 500 characters.' });
  for (const f of ['item', 'town', 'facility']) {
    if (b[f] !== undefined && !validId(b[f])) return badRequest(`invalid_${f}`);
  }
  if (b.town && !(await repo.isPublishedTown(b.town))) return badRequest('invalid_town');

  await repo.insertReport({ kind: b.kind, itemId: b.item ?? null, regionId: b.town ?? null, facilityKey: b.facility ?? null, message });
  return noStoreJson({ ok: true }, 201);
}

export async function handleListReports(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const status = new URL(request.url).searchParams.get('status') ?? 'open';
  if (!['open', 'resolved', 'dismissed'].includes(status)) return badRequest('invalid_status');
  return noStoreJson({ status, reports: await repo.listReports(status) }, 200);
}

export async function handleResolveReport(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const b = await readBody(request);
  if (b === undefined) return noStoreJson({ error: 'invalid_json' }, 400);
  if (typeof b?.id !== 'string' || !UUID.test(b.id)) return badRequest('invalid_id');
  if (!['resolved', 'dismissed'].includes(b.status)) return badRequest('invalid_status');
  const found = await repo.setReportStatus(b.id, b.status);
  return found ? noStoreJson({ ok: true }, 200) : noStoreJson({ error: 'not_found' }, 404);
}

const EVENT_LIMIT = 120;
const EVENT_MAX_BODY = 1024;
const OUTCOMES = ['recycling', 'trash', 'special_dropoff'];

const AVG_POUNDS = {
  rigid_plastic: 0.1, soft_plastic_foam: 0.05, cardboard_paper: 0.5, metal: 0.1, glass: 0.6, ewaste_hazard: 2, other: 0.3,
};
const estimatePounds = (rows) =>
  Math.round(rows.filter((r) => r.outcome !== 'trash').reduce((sum, r) => sum + r.n * (AVG_POUNDS[r.material] ?? AVG_POUNDS.other), 0));

export async function handleEvent(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if (!isJson(request)) return noStoreJson({ error: 'unsupported_media_type' }, 415);
  const windowStart = hourStart(now);
  if ((await repo.hit(clientKey(request, salt, 'events'), windowStart)) > EVENT_LIMIT) return noStoreJson({ error: 'rate_limited' }, 429);

  const { body: b, error } = await readJson(request, EVENT_MAX_BODY);
  if (error) return error;

  if (!OUTCOMES.includes(b.outcome)) return badRequest('invalid_outcome', { allowed: OUTCOMES });
  const material = b.material ?? 'other';
  if (!MATERIALS.includes(material)) return badRequest('invalid_material', { allowed: MATERIALS });
  const town = b.town ?? '';
  if (town !== '' && (!validId(town) || !(await repo.isPublishedTown(town)))) return badRequest('invalid_town');

  await repo.count({ day: localParts(now).date, regionId: town, material, outcome: b.outcome });
  return noStoreJson({ ok: true }, 202);
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
