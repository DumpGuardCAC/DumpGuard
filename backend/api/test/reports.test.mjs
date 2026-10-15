import test from 'node:test';
import assert from 'node:assert/strict';
import { handleReport, handleListReports, handleResolveReport, LIMIT_PER_HOUR } from '../lib/reports.mjs';

const TOKEN = 'a-long-admin-token-123';
const post = (body, headers = {}) => new Request('http://x/r', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const mk = (hits = 1) => {
  const state = { inserted: [], status: [] };
  return {
    state, hit: async () => hits, isPublishedTown: async (t) => t === 'edison',
    insertReport: async (x) => state.inserted.push(x),
    listReports: async (s) => [{ id: 'r', status: s }],
    setReportStatus: async (id, s) => { state.status.push([id, s]); return id.startsWith('123e'); },
  };
};
const good = { kind: 'item_rule', message: 'Pizza boxes are accepted here.', item: 'pizza-box', town: 'edison' };

test('a report is stored with trimmed message and optional links', async () => {
  const repo = mk();
  const r = await handleReport(post({ ...good, message: '  Pizza boxes are accepted here.  ' }), repo);
  assert.equal(r.status, 201);
  assert.deepEqual(repo.state.inserted[0], { kind: 'item_rule', itemId: 'pizza-box', regionId: 'edison', facilityKey: null, message: 'Pizza boxes are accepted here.' });
});

test('report validates input and rate limits', async () => {
  const t = (b, repo = mk()) => handleReport(post(b), repo);
  assert.equal((await t({ ...good, kind: 'spam' })).status, 400);
  assert.equal((await t({ ...good, message: 'x' })).status, 400);
  assert.equal((await t({ ...good, message: 'x'.repeat(501) })).status, 400);
  assert.equal((await t({ ...good, item: 'Bad Id!' })).status, 400);
  assert.equal((await t({ ...good, town: 'nowhere' })).status, 400);
  assert.equal((await t('nope')).status, 400);
  assert.equal((await handleReport(post(good, { 'content-type': 'text/plain' }), mk())).status, 415);
  assert.equal((await t({ ...good, pad: 'a'.repeat(5000) })).status, 413);
  const limited = mk(LIMIT_PER_HOUR + 1);
  assert.equal((await t(good, limited)).status, 429);
  assert.equal(limited.state.inserted.length, 0);
});

test('admin list and resolve need the token', async () => {
  const auth = { authorization: `Bearer ${TOKEN}` };
  const get = (q, h) => handleListReports(new Request(`http://x/a${q}`, { headers: h }), mk(), { token: TOKEN });
  assert.equal((await get('', {})).status, 401);
  const ok = await get('', auth);
  assert.equal((await ok.json()).reports[0].status, 'open');
  assert.equal((await get('?status=weird', auth)).status, 400);

  const id = '123e4567-e89b-12d3-a456-426614174000';
  const res = (b, h) => handleResolveReport(post(b, h), mk(), { token: TOKEN });
  assert.equal((await res({ id, status: 'resolved' }, {})).status, 401);
  assert.equal((await res({ id: 'nope', status: 'resolved' }, auth)).status, 400);
  assert.equal((await res({ id, status: 'open' }, auth)).status, 400);
  assert.equal((await res({ id, status: 'resolved' }, auth)).status, 200);
  assert.equal((await res({ id: '999e4567-e89b-12d3-a456-426614174000', status: 'dismissed' }, auth)).status, 404);
});
