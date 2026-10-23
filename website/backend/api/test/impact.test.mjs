import test from 'node:test';
import assert from 'node:assert/strict';
import { handleEvent, handleStats, estimatePounds, LIMIT_PER_HOUR } from '../lib/impact.mjs';

const post = (body, ct = 'application/json') => new Request('http://x/e', { method: 'POST', headers: { 'content-type': ct }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const mk = (hits = 1) => {
  const counted = [];
  return { counted, hit: async () => hits, isPublishedTown: async (t) => t === 'edison', count: async (x) => counted.push(x), totals: async () => [] };
};
const now = new Date('2026-10-15T01:00:00Z');

test('event is counted under the New Jersey date', async () => {
  const repo = mk();
  const r = await handleEvent(post({ outcome: 'recycling', material: 'glass', town: 'edison' }), repo, { now });
  assert.equal(r.status, 202);
  assert.deepEqual(repo.counted[0], { day: '2026-10-14', regionId: 'edison', material: 'glass', outcome: 'recycling' });
});

test('event validates input and rate limits', async () => {
  const t = (b, repo = mk(), ct) => handleEvent(post(b, ct), repo, { now });
  assert.equal((await t({ outcome: 'compost' })).status, 400);
  assert.equal((await t({ outcome: 'trash', material: 'plasma' })).status, 400);
  assert.equal((await t({ outcome: 'trash', town: 'nowhere' })).status, 400);
  assert.equal((await t('nope')).status, 400);
  assert.equal((await t([1])).status, 400);
  assert.equal((await t({ outcome: 'trash' }, mk(), 'text/plain')).status, 415);
  assert.equal((await t({ outcome: 'trash', x: 'a'.repeat(2000) })).status, 413);
  const limited = mk(LIMIT_PER_HOUR + 1);
  assert.equal((await t({ outcome: 'trash' }, limited)).status, 429);
  assert.equal(limited.counted.length, 0);
});

test('pounds estimate ignores trash', () => {
  assert.equal(estimatePounds([{ material: 'glass', outcome: 'recycling', n: 10 }, { material: 'glass', outcome: 'trash', n: 100 }]), 6);
});

test('stats totals', async () => {
  const repo = { totals: async () => [{ material: 'metal', outcome: 'recycling', n: 20 }, { material: 'glass', outcome: 'trash', n: 5 }] };
  const b = await (await handleStats(new Request('http://x/s'), repo)).json();
  assert.equal(b.items_sorted, 25);
  assert.equal(b.by_outcome.trash, 5);
  assert.equal(b.estimated_pounds_diverted, 2);
  assert.equal((await handleStats(new Request('http://x/s?town=BAD!'), repo)).status, 400);
});
