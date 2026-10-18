import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stripJpeg, buildMap, handleDumpingReport, handleDumpingTrack, handleDumpingMap, handleAdminDumping,
  handleAdminDumpingPhoto, handleAdminDumpingStatus, SUBMIT_PER_HOUR, AUTH_FAILS_PER_HOUR, MIN_GROUP,
} from '../lib/dumping.mjs';

const TOKEN = 'a-long-admin-token-123';
const auth = { authorization: `Bearer ${TOKEN}` };
const seg = (marker, payload) => Buffer.concat([Buffer.from([0xff, marker, (payload.length + 2) >> 8, (payload.length + 2) & 255]), payload]);
// SOI, APP0, APP1 with fake GPS, COM, DQT, SOS + scan, EOI
const jpegWithExif = Buffer.concat([
  Buffer.from([0xff, 0xd8]), seg(0xe0, Buffer.from('JFIF')), seg(0xe1, Buffer.from('Exif GPSLatitude 40.5')), seg(0xfe, Buffer.from('secret comment')),
  seg(0xdb, Buffer.from([1, 2, 3, 4])), seg(0xda, Buffer.from([1, 2])), Buffer.from([9, 8, 7, 0xff, 0x00, 6]), Buffer.from([0xff, 0xd9]),
]);

const post = (body, headers = {}) => new Request('http://x/d', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const mk = ({ hits = 1, taken = 0 } = {}) => {
  const state = { inserted: [], status: [] };
  return {
    state,
    hit: async () => hits,
    isPublishedTown: async (t) => t === 'edison',
    insertDump: async (x) => (taken-- > 0 ? false : (state.inserted.push(x), true)),
    dumpByCode: async (c) => (c === 'DG-ABCDE' ? { status: 'noticed', region_id: 'edison', dump_type: 'tires', created_at: 'a', updated_at: 'b' } : null),
    mapPoints: async () => [],
    townStatusCounts: async () => [{ region_id: 'edison', name: 'Edison', new: 2, noticed: 1 }],
    listDumps: async (f) => [{ id: 'x', ...f }],
    dumpPhoto: async (id) => (id.startsWith('123e') ? Buffer.from([1, 2, 3]) : null),
    setDumpStatus: async (id, s) => { state.status.push([id, s]); return id.startsWith('123e'); },
  };
};
const good = { town: 'edison', type: 'tires', where: '120 Oak Tree Rd', description: 'Six tires by the curb' };
const noGeo = async () => null;

test('stripJpeg removes EXIF, comments and app segments but keeps the image', () => {
  const out = stripJpeg(jpegWithExif);
  assert.ok(out);
  assert.ok(!out.includes('Exif'));
  assert.ok(!out.includes('secret'));
  assert.ok(!out.includes('JFIF'));
  assert.deepEqual([...out.subarray(0, 2)], [0xff, 0xd8]);
  assert.ok(out.includes(Buffer.from([1, 2, 3, 4])), 'quantisation table kept');
  assert.deepEqual([...out.subarray(-2)], [0xff, 0xd9]);
  assert.ok(out.includes(Buffer.from([9, 8, 7, 0xff, 0x00, 6])), 'scan data kept byte for byte');
});

test('stripJpeg rejects anything that is not a whole JPEG', () => {
  assert.equal(stripJpeg(Buffer.from('GIF89a......')), null);
  assert.equal(stripJpeg(Buffer.from([0xff, 0xd8])), null);
  assert.equal(stripJpeg(jpegWithExif.subarray(0, jpegWithExif.length - 5)), null);
  assert.equal(stripJpeg(Buffer.from([0xff, 0xd8, 0x00, 0x01, 0x02, 0x03])), null);
});

test('a report is stored, geocoded when no point is sent, and returns a tracking code', async () => {
  const repo = mk();
  const r = await handleDumpingReport(post({ ...good, notes: ' by the fence ', photo: jpegWithExif.toString('base64') }), repo, { geocode: async () => ({ lat: 40.5, lng: -74.4 }) });
  assert.equal(r.status, 201);
  const b = await r.json();
  assert.match(b.code, /^DG-[A-HJ-NP-Z2-9]{5}$/);
  assert.equal(b.located, true);
  assert.equal(b.photo, true);
  const row = repo.state.inserted[0];
  assert.equal(row.notes, 'by the fence');
  assert.equal(row.lat, 40.5);
  assert.ok(!row.photo.includes('Exif'));
});

test('client coordinates win over the geocoder, and a failed geocode still stores the report', async () => {
  const repo = mk();
  let called = false;
  await handleDumpingReport(post({ ...good, lat: 40.51, lng: -74.41 }), repo, { geocode: async () => { called = true; return null; } });
  assert.equal(called, false);
  assert.equal(repo.state.inserted[0].lat, 40.51);
  const repo2 = mk();
  const r = await handleDumpingReport(post(good), repo2, { geocode: noGeo });
  assert.equal(r.status, 201);
  assert.equal((await r.json()).located, false);
  assert.equal(repo2.state.inserted[0].lat, null);
});

test('a taken code is retried', async () => {
  const repo = mk({ taken: 2 });
  assert.equal((await handleDumpingReport(post(good), repo, { geocode: noGeo })).status, 201);
});

test('submission validates input and rate limits', async () => {
  const t = (b, repo = mk(), h) => handleDumpingReport(post(b, h), repo, { geocode: noGeo });
  assert.equal((await t({ ...good, town: 'nowhere' })).status, 400);
  assert.equal((await t({ ...good, type: 'spam' })).status, 400);
  assert.equal((await t({ ...good, where: 'x' })).status, 400);
  assert.equal((await t({ ...good, description: 'x'.repeat(501) })).status, 400);
  assert.equal((await t({ ...good, notes: 'x'.repeat(501) })).status, 400);
  assert.equal((await t({ ...good, lat: 10, lng: 10 })).status, 400);
  assert.equal((await t({ ...good, lat: 40.5 })).status, 400);
  assert.equal((await t({ ...good, photo: Buffer.from('GIF89a').toString('base64') })).status, 400);
  assert.equal((await t({ ...good, photo: 'not base64!' })).status, 400);
  assert.equal((await t({ ...good, photo: Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64') })).status, 413);
  assert.equal((await t('nope')).status, 400);
  assert.equal((await t(good, mk(), { 'content-type': 'text/plain' })).status, 415);
  const limited = mk({ hits: SUBMIT_PER_HOUR + 1 });
  assert.equal((await t(good, limited)).status, 429);
  assert.equal(limited.state.inserted.length, 0);
});

test('tracking returns status only, never the location', async () => {
  const get = (q, repo = mk()) => handleDumpingTrack(new Request(`http://x/t${q}`), repo);
  const ok = await get('?code=dg-abcde');
  assert.equal(ok.status, 200);
  assert.deepEqual(Object.keys(await ok.json()).sort(), ['code', 'created_at', 'status', 'town', 'type', 'updated_at']);
  assert.equal((await get('?code=DG-ZZZZZ')).status, 404);
  assert.equal((await get('?code=bad')).status, 400);
  assert.equal((await get('?code=DG-ABCDE', mk({ hits: 999 }))).status, 429);
});

test('the public map only shows cells with enough reports, as coarse centres', async () => {
  const pt = (cx, cy, status = 'new', dump_type = 'tires') => ({ cx, cy, status, dump_type, region_id: 'edison' });
  const m = buildMap([pt(10, 20), pt(10, 20, 'resolved'), pt(10, 20), pt(11, 20), pt(12, 20)], [{ region_id: 'edison', name: 'Edison', new: 4, resolved: 1 }]);
  assert.equal(m.min_group, MIN_GROUP);
  assert.equal(m.cells.length, 1);
  assert.deepEqual(m.cells[0].by_status, { new: 2, resolved: 1 });
  assert.equal(m.cells[0].lat, 0.1025);
  assert.deepEqual(m.towns[0].counts, { new: 4, noticed: 0, progress: 0, resolved: 1 });
  const r = await handleDumpingMap(new Request('http://x/m'), mk());
  assert.equal(r.status, 200);
  assert.match(r.headers.get('cache-control'), /s-maxage/);
  assert.deepEqual((await r.json()).cells, []);
});

test('staff endpoints need the token and count failures', async () => {
  const opt = { token: TOKEN };
  const list = (q, h, repo = mk()) => handleAdminDumping(new Request(`http://x/a${q}`, { headers: h }), repo, opt);
  assert.equal((await list('', {})).status, 401);
  assert.equal((await list('', { authorization: 'Bearer wrong' })).status, 401);
  assert.equal((await list('', {}, mk({ hits: AUTH_FAILS_PER_HOUR + 1 }))).status, 429);
  const ok = await list('?status=new&town=edison', auth);
  assert.deepEqual((await ok.json()).reports, [{ id: 'x', status: 'new', town: 'edison' }]);
  assert.equal((await list('?status=weird', auth)).status, 400);
  assert.equal((await handleAdminDumping(new Request('http://x/a', { headers: auth }), mk(), { token: 'short' })).status, 401);

  const id = '123e4567-e89b-12d3-a456-426614174000';
  const photo = (i, h) => handleAdminDumpingPhoto(new Request(`http://x/p?id=${i}`, { headers: h }), mk(), opt);
  assert.equal((await photo(id, {})).status, 401);
  const p = await photo(id, auth);
  assert.equal(p.headers.get('content-type'), 'image/jpeg');
  assert.match(p.headers.get('cache-control'), /no-store/);
  assert.equal((await photo('999e4567-e89b-12d3-a456-426614174000', auth)).status, 404);
  assert.equal((await photo('nope', auth)).status, 400);

  const st = (b, h) => handleAdminDumpingStatus(post(b, h), mk(), opt);
  assert.equal((await st({ id, status: 'resolved' }, {})).status, 401);
  assert.equal((await st({ id, status: 'open' }, auth)).status, 400);
  assert.equal((await st({ id: 'x', status: 'resolved' }, auth)).status, 400);
  assert.equal((await st({ id, status: 'progress' }, auth)).status, 200);
  assert.equal((await st({ id: '999e4567-e89b-12d3-a456-426614174000', status: 'new' }, auth)).status, 404);
});
