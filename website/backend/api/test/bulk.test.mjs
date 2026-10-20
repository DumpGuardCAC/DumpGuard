import test from 'node:test';
import assert from 'node:assert/strict';
import { handleBulkRequest, handlePurge, LIMIT_PER_HOUR } from '../lib/bulk.mjs';
import { bearerMatches } from '../lib/alerts.mjs';

const NOW = new Date('2026-10-06T15:30:00Z');
function fakeRepo() {
  const counts = new Map();
  const saved = [];
  return {
    saved, counts,
    isPublishedTown: async (id) => id === 'edison',
    hit: async (k) => { counts.set(k, (counts.get(k) ?? 0) + 1); return counts.get(k); },
    insert: async (r) => { saved.push(r); return { id: 'uuid-1', expiresAt: '2027-01-04T00:00:00.000Z' }; },
    purge: async () => {},
  };
}
const good = { town: 'edison', email: 'a@b.co', description: 'Old couch and a mattress', preferred_date: '2026-10-20' };
const post = (repo, body, headers = {}, raw) =>
  handleBulkRequest(
    new Request('http://x/api/v1/bulk-request', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4, 9.9.9.9', ...headers },
      body: raw ?? JSON.stringify(body),
    }),
    repo, { now: NOW, salt: 's' },
  );

test('valid request is saved as demo and echoes no email', async () => {
  const repo = fakeRepo();
  const res = await post(repo, good);
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.demo, true);
  assert.ok(!JSON.stringify(body).includes('a@b.co'));
  assert.deepEqual(repo.saved[0], { regionId: 'edison', email: 'a@b.co', description: 'Old couch and a mattress', preferredDate: '2026-10-20' });
});

test('validation failures are 400 with the field named, and nothing is saved', async () => {
  const cases = [
    [{ ...good, email: 'nope' }, 'email'],
    [{ ...good, email: 5 }, 'email'],
    [{ ...good, description: '   ' }, 'description'],
    [{ ...good, description: 'x'.repeat(1001) }, 'description'],
    [{ ...good, description: 'bad\u0000char' }, 'description'],
    [{ ...good, preferred_date: '2026-02-30' }, 'preferred_date'],
    [{ ...good, preferred_date: '2026-10-05' }, 'preferred_date'],
    [{ ...good, preferred_date: '2027-03-01' }, 'preferred_date'],
    [{ ...good, town: 'woodbridge' }, 'town'],
    [{ ...good, town: "x'; drop" }, 'town'],
  ];
  for (const [body, field] of cases) {
    const repo = fakeRepo();
    const res = await post(repo, body);
    assert.equal(res.status, 400, field);
    assert.equal((await res.json()).field, field);
    assert.equal(repo.saved.length, 0);
  }
});

test('bad JSON, wrong content type, oversize', async () => {
  assert.equal((await post(fakeRepo(), null, {}, '{nope')).status, 400);
  assert.equal((await post(fakeRepo(), null, {}, '[1]')).status, 400);
  assert.equal((await post(fakeRepo(), good, { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await post(fakeRepo(), null, {}, JSON.stringify({ ...good, pad: 'x'.repeat(9000) }))).status, 413);
});

test('rate limit: 5 per hour per IP, then 429 with Retry-After; other IPs unaffected', async () => {
  const repo = fakeRepo();
  for (let i = 0; i < LIMIT_PER_HOUR; i++) assert.equal((await post(repo, good)).status, 201);
  const blocked = await post(repo, good);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get('retry-after'), String(30 * 60));
  assert.equal(repo.saved.length, LIMIT_PER_HOUR);
  assert.equal((await post(repo, good, { 'x-forwarded-for': '5.5.5.5' })).status, 201);
  for (const key of repo.counts.keys()) assert.ok(!key.includes('1.2.3.4'));
});

test('purge requires the cron secret', async () => {
  const mk = (h) => new Request('http://x', { headers: h });
  assert.equal((await handlePurge(mk({}), fakeRepo(), { secret: 'k' })).status, 401);
  assert.equal((await handlePurge(mk({ authorization: 'Bearer k' }), fakeRepo(), { secret: undefined })).status, 401);
  assert.equal((await handlePurge(mk({ authorization: 'Bearer k' }), fakeRepo(), { secret: 'k' })).status, 200);
});

test('cron secret compare rejects a long shared prefix', async () => {
  const prefix = 'cron-secret-prefix-0123456789abcdef';
  const real = prefix + '-real';
  const near = prefix + '-near';
  assert.equal(bearerMatches('Bearer ' + near, real), false);
  assert.equal(bearerMatches('Bearer ' + real, real), true);
  const req = (secret) => new Request('http://x', { headers: { authorization: 'Bearer ' + secret } });
  assert.equal((await handlePurge(req(near), fakeRepo(), { secret: real })).status, 401);
  assert.equal((await handlePurge(req(real), fakeRepo(), { secret: real })).status, 200);
});
