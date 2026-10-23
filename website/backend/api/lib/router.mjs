import { readFileSync } from 'node:fs';
import { handleSchedule } from './schedule.mjs';
import { handleItems, handleItem } from './items.mjs';
import { handleSearch } from './search.mjs';
import { handleMaterial } from './materials.mjs';
import { handleTowns, handleFacilities, handleWoodbridgeStreets, buildStreetLookup, handleHealth } from './places.mjs';
import { handleBulkRequest, handlePurge } from './bulk.mjs';
import { makeRepo, makeBulkRepo, makePushRepo, makeAlertsRepo, makeImpactRepo, makeReportsRepo, makeDumpingRepo } from './repo.mjs';
import { handleAlerts, handleCreateAlert, handleDeleteAlert } from './alerts.mjs';
import { handlePushKey, handleSubscribe, handleUnsubscribe, handleReminders } from './push.mjs';
import { handleReport, handleListReports, handleResolveReport } from './reports.mjs';
import {
  handleDumpingReport, handleDumpingTrack, handleDumpingMap, handleAdminDumping, handleAdminDumpingPhoto, handleAdminDumpingStatus,
  handleAdminDumpingMessages, handleAdminDumpingMessage, handleDumpingMessages, handleDumpingReply,
} from './dumping.mjs';
import { handleEvent, handleStats } from './impact.mjs';
import { makeSender } from './webpush.mjs';
import { json, jsonWithEtag } from './http.mjs';
import { CHECK_WITH_TOWN, BULK_DEMO_NOTICE } from './strings.mjs';

let streetLookup;
const streets = () =>
  (streetLookup ??= buildStreetLookup(
    JSON.parse(readFileSync(new URL('../data/woodbridge_street_index.json', import.meta.url), 'utf8')),
  ));

const NATIVE_ORIGINS = new Set(['https://localhost']);

function cors(res, request) {
  const configured = process.env.ALLOWED_ORIGIN;
  const asked = request?.headers.get('origin');
  const native = !configured && NATIVE_ORIGINS.has(asked) ? asked : null;
  const origin = configured ?? native;
  const h = new Headers(res.headers);
  h.set('access-control-allow-origin', origin ?? '*');
  h.set('access-control-allow-methods', origin ? 'GET, POST, DELETE, OPTIONS' : 'GET, OPTIONS');
  if (native) h.set('vary', 'Origin');
  h.set('access-control-allow-headers', 'content-type, if-none-match, authorization');
  h.set('x-content-type-options', 'nosniff');
  return new Response(res.body, { status: res.status, headers: h });
}

async function route(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace(/^\/api\/v1/, '').replace(/\/+$/, '') || '/';
  const m = request.method;
  let seg;

  if (m === 'POST' && path === '/bulk-request') return handleBulkRequest(request, makeBulkRepo());
  if (m === 'POST' && path === '/admin/alerts') return handleCreateAlert(request, makeAlertsRepo());
  if (m === 'DELETE' && path === '/admin/alerts') return handleDeleteAlert(request, makeAlertsRepo());
  if (m === 'POST' && path === '/reports') return handleReport(request, makeReportsRepo());
  if (m === 'POST' && path === '/admin/reports/resolve') return handleResolveReport(request, makeReportsRepo());
  if (m === 'POST' && path === '/dumping') return handleDumpingReport(request, makeDumpingRepo());
  if (m === 'POST' && path === '/dumping/reply') return handleDumpingReply(request, makeDumpingRepo());
  if (m === 'POST' && path === '/admin/dumping/message') return handleAdminDumpingMessage(request, makeDumpingRepo());
  if (m === 'POST' && path === '/admin/dumping/status') return handleAdminDumpingStatus(request, makeDumpingRepo());
  if (m === 'POST' && path === '/events') return handleEvent(request, makeImpactRepo());
  if (m === 'POST' && path === '/push/subscribe') return handleSubscribe(request, makePushRepo());
  if (m === 'POST' && path === '/push/unsubscribe') return handleUnsubscribe(request, makePushRepo());
  if (m !== 'GET' && m !== 'HEAD') return json({ error: 'method_not_allowed' }, 405, { 'cache-control': 'no-store' });

  if (path === '/health') return handleHealth(makeRepo());
  if (path === '/admin/reports') return handleListReports(request, makeReportsRepo());
  if (path === '/dumping/track') return handleDumpingTrack(request, makeDumpingRepo());
  if (path === '/dumping/messages') return handleDumpingMessages(request, makeDumpingRepo());
  if (path === '/admin/dumping/messages') return handleAdminDumpingMessages(request, makeDumpingRepo());
  if (path === '/dumping/map') return handleDumpingMap(request, makeDumpingRepo());
  if (path === '/admin/dumping') return handleAdminDumping(request, makeDumpingRepo());
  if (path === '/admin/dumping/photo') return handleAdminDumpingPhoto(request, makeDumpingRepo());
  if (path === '/stats') return handleStats(request, makeImpactRepo());
  if (path === '/alerts') return handleAlerts(request, makeAlertsRepo());
  if (path === '/push/key') return handlePushKey();
  if (path === '/cron/reminders') {
    const send = makeSender();
    if (!send) return json({ error: 'push_not_configured' }, 503, { 'cache-control': 'no-store' });
    return handleReminders(request, makePushRepo(), send);
  }
  if (path === '/cron/purge') return handlePurge(request, makeBulkRepo());
  if (path === '/meta') return jsonWithEtag(request, { check_with_town: CHECK_WITH_TOWN, bulk_demo_notice: BULK_DEMO_NOTICE });
  if (path === '/towns') return handleTowns(request, makeRepo());
  if (path === '/facilities') return handleFacilities(request, makeRepo());
  if (path === '/search') return handleSearch(request, makeRepo());
  if (path === '/items') return handleItems(request, makeRepo());
  if (path === '/woodbridge/streets') return handleWoodbridgeStreets(request, streets());
  if ((seg = path.match(/^\/materials\/([a-z_]+)$/))) return handleMaterial(request, seg[1], makeRepo());
  if ((seg = path.match(/^\/items\/([^/]+)$/))) return handleItem(request, decodeURIComponent(seg[1]), makeRepo());
  if ((seg = path.match(/^\/schedule\/([^/]+)$/))) return handleSchedule(request, decodeURIComponent(seg[1]), makeRepo());
  return json({ error: 'not_found' }, 404, { 'cache-control': 'public, s-maxage=60' });
}

export async function handle(request) {
  if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }), request);
  try {
    return cors(await route(request), request);
  } catch (err) {
    console.error(err);
    return cors(json({ error: 'server_error' }, 500, { 'cache-control': 'no-store' }), request);
  }
}
