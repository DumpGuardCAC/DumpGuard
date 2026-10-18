import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handleItems, handleItem, resolveRule } from '../lib/items.mjs';
import { handleTowns, handleFacilities, handleHealth, handleWoodbridgeStreets, buildStreetLookup, normStreet } from '../lib/places.mjs';

const req = (path, headers = {}) => new Request(`http://x${path}`, { headers });

const facility = { key: 'edison-recycling-center', name: 'Edison Recycling Center' };
const bottle = {
  id: 'bottle', name: { en: 'Bottle', es: 'Botella' }, aliases: ['water bottle'], material: 'rigid_plastic',
  default_rule: 'recycling', likely_resin: '1', hazard: false, varies_by_town: false, prep: { en: '', es: '' }, es_reviewed: false,
  rules: {
    middlesex: { rule: 'recycling', note: { en: 'county', es: '' }, source_url: 'u1', last_verified: '2026-10-06', facility_key: null },
    nj: { rule: 'recycling', note: { en: 'state', es: '' }, source_url: 'u2', last_verified: '2026-10-06', facility_key: null },
  },
};
const battery = {
  ...bottle, id: 'battery', default_rule: 'special_dropoff',
  rules: { edison: { rule: 'special_dropoff', note: { en: 'town', es: '' }, source_url: 'u3', last_verified: '2026-10-06', facility_key: facility.key } },
};
const mystery = { ...bottle, id: 'mystery', default_rule: 'trash', rules: {} };

const regions = {
  nj: { id: 'nj', kind: 'state', name: 'New Jersey', county_id: null },
  middlesex: { id: 'middlesex', kind: 'county', name: 'Middlesex County', county_id: null },
  edison: { id: 'edison', kind: 'town', name: 'Edison', county_id: 'middlesex' },
};
const repo = {
  region: async (id) => regions[id] ?? null,
  itemsBundle: async ({ id } = {}) => ({ items: [bottle, battery, mystery].filter((i) => !id || i.id === id), facilities: [facility] }),
  publishedTowns: async () => [{ id: 'edison', name: 'Edison', county: 'middlesex', zips: ['08817'] }],
  townsForZip: async (z) => (z === '08817' ? [{ id: 'edison', name: 'Edison' }] : []),
  facilitiesForTowns: async (towns, material) => [{ ...facility, towns, material }],
  ping: async () => true,
};

test('rule precedence: town > county > state > default (check_local)', () => {
  const chain = ['edison', 'middlesex', 'nj'];
  const byKey = { [facility.key]: facility };
  const a = resolveRule(battery, chain, byKey);
  assert.equal(a.level, 'town');
  assert.equal(a.facility.name, 'Edison Recycling Center');
  const b = resolveRule(bottle, chain, byKey);
  assert.equal(b.level, 'county');
  assert.equal(b.check_local, false);
  assert.equal(resolveRule(bottle, ['nj'], byKey).level, 'state');
  const c = resolveRule(mystery, chain, byKey);
  assert.deepEqual([c.level, c.check_local, c.rule], ['default', true, 'trash']);
});

test('/items without a town returns raw rules and the facility list', async () => {
  const res = await handleItems(req('/api/v1/items'), repo);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.count, 3);
  assert.ok(body.items[0].rules);
  assert.equal(body.facilities.length, 1);
  assert.ok(res.headers.get('etag'));
});

test('/items?town= resolves per item and ETag gives 304', async () => {
  const res = await handleItems(req('/api/v1/items?town=edison'), repo);
  const body = await res.json();
  assert.equal(body.generated_for.id, 'edison');
  assert.equal(body.items.find((i) => i.id === 'mystery').resolved.check_local, true);
  assert.equal(body.items.find((i) => i.id === 'bottle').resolved.region, 'middlesex');
  const again = await handleItems(req('/api/v1/items?town=edison', { 'if-none-match': res.headers.get('etag') }), repo);
  assert.equal(again.status, 304);
});

test('/items rejects bad or unknown regions', async () => {
  assert.equal((await handleItems(req('/api/v1/items?town=Ed%27ison'), repo)).status, 400);
  assert.equal((await handleItems(req('/api/v1/items?town=nowhere'), repo)).status, 404);
});

test('/items/:id', async () => {
  const ok = await handleItem(req('/api/v1/items/battery?town=edison'), 'battery', repo);
  assert.equal((await ok.json()).resolved.facility.key, facility.key);
  assert.equal((await handleItem(req('/x'), 'nope', repo)).status, 404);
  assert.equal((await handleItem(req('/x'), 'BAD ID!', repo)).status, 400);
});

test('/towns and /health', async () => {
  assert.equal((await (await handleTowns(req('/api/v1/towns'), repo)).json()).towns[0].zips[0], '08817');
  assert.equal((await handleHealth(repo)).status, 200);
  assert.equal((await handleHealth({ ping: async () => { throw new Error('db down'); } })).status, 503);
});

test('/facilities validates input and resolves zip', async () => {
  assert.equal((await handleFacilities(req('/f'), repo)).status, 400);
  assert.equal((await handleFacilities(req('/f?zip=1'), repo)).status, 400);
  assert.equal((await handleFacilities(req('/f?town=edison&material=lava'), repo)).status, 400);
  assert.equal((await handleFacilities(req('/f?zip=99999'), repo)).status, 404);
  const body = await (await handleFacilities(req('/f?zip=08817&material=ewaste_hazard'), repo)).json();
  assert.deepEqual(body.towns, ['edison']);
  assert.equal(body.count, 1);
});

test('Woodbridge street lookup against the real index', async () => {
  const index = JSON.parse(readFileSync(new URL('../data/woodbridge_street_index.json', import.meta.url), 'utf8'));
  const lookup = buildStreetLookup(index);
  assert.equal(normStreet('Inman Avenue (419-560)'), 'inman ave');
  const body = await (await handleWoodbridgeStreets(req('/w?q=Inman%20Avenue'), lookup)).json();
  assert.ok(body.count >= 1);
  assert.ok(body.matches.some((m) => m.area_key.startsWith('zone:rd4')));
  const withNumber = await (await handleWoodbridgeStreets(req('/w?q=450%20inman%20ave'), lookup)).json();
  assert.equal(withNumber.count, body.count);
  assert.equal((await handleWoodbridgeStreets(req('/w?q=ab'), lookup)).status, 400);
  assert.equal((await (await handleWoodbridgeStreets(req('/w?q=zzzzzz'), lookup)).json()).count, 0);
});
