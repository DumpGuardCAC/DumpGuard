// One router for every endpoint, so the app runs as a single Vercel function (or any fetch-style host).
import { readFileSync } from 'node:fs';
import { handleSchedule } from './schedule.mjs';
import { handleItems, handleItem } from './items.mjs';
import { handleTowns, handleFacilities, handleWoodbridgeStreets, buildStreetLookup, handleHealth } from './places.mjs';
import { handleBulkRequest, handlePurge } from './bulk.mjs';
import { makeRepo, makeBulkRepo } from './repo.mjs';
import { json, jsonWithEtag } from './http.mjs';
import { CHECK_WITH_TOWN, BULK_DEMO_NOTICE } from './strings.mjs';

let streetLookup;
const streets = () =>
  (streetLookup ??= buildStreetLookup(
    JSON.parse(readFileSync(new URL('../data/woodbridge_street_index.json', import.meta.url), 'utf8')),
  ));

function cors(res, request) {
  const origin = process.env.ALLOWED_ORIGIN;
  const h = new Headers(res.headers);
  h.set('access-control-allow-origin', origin ?? '*');
  h.set('access-control-allow-methods', origin ? 'GET, POST, OPTIONS' : 'GET, OPTIONS');
  h.set('access-control-allow-headers', 'content-type, if-none-match');
  h.set('x-content-type-options', 'nosniff');
  return new Response(res.body, { status: res.status, headers: h });
}

async function route(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace(/^\/api\/v1/, '').replace(/\/+$/, '') || '/';
  const m = request.method;
  let seg;

  if (m === 'POST' && path === '/bulk-request') return handleBulkRequest(request, makeBulkRepo());
  if (m !== 'GET' && m !== 'HEAD') return json({ error: 'method_not_allowed' }, 405, { 'cache-control': 'no-store' });

  if (path === '/health') return handleHealth(makeRepo());
  if (path === '/cron/purge') return handlePurge(request, makeBulkRepo());
  if (path === '/meta') return jsonWithEtag(request, { check_with_town: CHECK_WITH_TOWN, bulk_demo_notice: BULK_DEMO_NOTICE });
  if (path === '/towns') return handleTowns(request, makeRepo());
  if (path === '/facilities') return handleFacilities(request, makeRepo());
  if (path === '/items') return handleItems(request, makeRepo());
  if (path === '/woodbridge/streets') return handleWoodbridgeStreets(request, streets());
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
