import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../lib/router.mjs';

const get = (p, init) => handle(new Request(`https://x.test${p}`, init));

test('meta carries the exact user-facing notices, with CORS', async () => {
  const r = await get('/api/v1/meta');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('access-control-allow-origin'), '*');
  const b = await r.json();
  assert.equal(b.check_with_town.en, 'Double check with your town');
  assert.equal(b.bulk_demo_notice.en, 'Currently, bulk pickup is demo until permission is acquired from townships');
});

test('woodbridge streets served from the bundled index', async () => {
  const r = await get('/api/v1/woodbridge/streets?q=main%20street');
  assert.equal(r.status, 200);
});

test('unknown path 404, bad method 405, preflight 204', async () => {
  assert.equal((await get('/api/v1/nope')).status, 404);
  assert.equal((await get('/api/v1/towns', { method: 'DELETE' })).status, 405);
  assert.equal((await get('/api/v1/towns', { method: 'OPTIONS' })).status, 204);
});

test('native app origin may POST, other origins stay read-only', async () => {
  for (const origin of ['https://localhost']) {
    const r = await get('/api/v1/meta', { method: 'OPTIONS', headers: { origin } });
    assert.equal(r.headers.get('access-control-allow-origin'), origin);
    assert.match(r.headers.get('access-control-allow-methods'), /POST/);
  }
  const other = await get('/api/v1/meta', { method: 'OPTIONS', headers: { origin: 'https://evil.test' } });
  assert.equal(other.headers.get('access-control-allow-origin'), '*');
  assert.doesNotMatch(other.headers.get('access-control-allow-methods'), /POST/);
});
