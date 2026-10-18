import test from 'node:test';
import assert from 'node:assert/strict';
import { openStatus } from '../lib/hours.mjs';
import { distanceKm, handleFacilities } from '../lib/places.mjs';

const weekly = [{ days: [1, 2, 3, 4, 5, 6], open: '08:00', close: '14:00' }];
// 2026-10-14 is a Wednesday. 15:00 UTC = 11:00 EDT.
const at = (iso) => new Date(iso);

test('open during hours, closed after', () => {
  assert.deepEqual(openStatus(weekly, at('2026-10-14T15:00:00Z')), { open_now: true, next_open: null, closes_at: '14:00' });
  const closed = openStatus(weekly, at('2026-10-14T19:30:00Z')); // 3:30 pm
  assert.equal(closed.open_now, false);
  assert.equal(closed.next_open, '2026-10-15 08:00');
});

test('Sunday rolls to Monday', () => {
  assert.equal(openStatus(weekly, at('2026-10-18T15:00:00Z')).next_open, '2026-10-19 08:00');
});

test('second Saturday rule', () => {
  const nb = [{ nth: 2, day: 6, open: '08:00', close: '12:00' }];
  assert.equal(openStatus(nb, at('2026-10-10T14:00:00Z')).open_now, true); // Oct 10 is the 2nd Saturday
  assert.equal(openStatus(nb, at('2026-10-17T14:00:00Z')).open_now, false); // 3rd Saturday
  assert.equal(openStatus(nb, at('2026-10-17T14:00:00Z')).next_open, '2026-11-14 08:00');
});

test('event days and missing hours', () => {
  const ev = [{ date: '2026-11-15', open: '08:00', close: '14:00' }];
  assert.equal(openStatus(ev, at('2026-10-14T15:00:00Z')).next_open, '2026-11-15 08:00');
  assert.equal(openStatus([], new Date()).open_now, null);
});

test('timezone: late evening UTC is still the same NJ day', () => {
  // 2026-10-14T02:30Z = Tue Oct 13, 10:30 pm EDT -> closed, next open Wed 08:00
  assert.equal(openStatus(weekly, at('2026-10-14T02:30:00Z')).next_open, '2026-10-14 08:00');
});

test('haversine: Edison to Long Branch is roughly 50 km', () => {
  const d = distanceKm({ lat: 40.540288, lng: -74.383869 }, { lat: 40.312588, lng: -73.99757 });
  assert.ok(d > 40 && d < 60, String(d));
});

const fac = (key, lat, lng) => ({ key, lat, lng, hours_struct: weekly, name: key });
const repo = {
  allFacilities: async () => [fac('far', 40.9, -74.9), fac('near', 40.54, -74.38), { key: 'rot', hours_struct: [], name: 'rot' }],
  facilitiesForTowns: async () => [fac('a', 40.5, -74.3)],
};

test('lat/lng sorts nearest first, radius filters, bad coordinates rejected', async () => {
  const now = at('2026-10-14T15:00:00Z');
  const r = await (await handleFacilities(new Request('http://x/f?lat=40.54&lng=-74.38'), repo, { now })).json();
  assert.deepEqual(r.facilities.map((f) => f.key), ['near', 'far', 'rot']);
  assert.equal(r.facilities[0].open_now, true);
  const r2 = await (await handleFacilities(new Request('http://x/f?lat=40.54&lng=-74.38&radius_km=10'), repo, { now })).json();
  assert.deepEqual(r2.facilities.map((f) => f.key), ['near']);
  assert.equal((await handleFacilities(new Request('http://x/f?lat=abc&lng=1'), repo, { now })).status, 400);
  assert.equal((await handleFacilities(new Request('http://x/f'), repo, { now })).status, 400);
});
