import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize, handleMaterial } from '../lib/materials.mjs';

const item = (id, material, def, rules = {}, hazard = false) => ({
  id, name: { en: id, es: id }, material, default_rule: def, hazard, prep: { en: '', es: '' }, aliases: [],
  rules: Object.fromEntries(Object.entries(rules).map(([k, v]) => [k, { rule: v, note: { en: '', es: '' }, source_url: 'u', last_verified: '2026-10-06', facility_key: null }])),
});
const chain = ['edison', 'middlesex', 'nj'];

test('consensus needs enough verified items that agree', () => {
  const six = Array.from({ length: 6 }, (_, i) => item(`g${i}`, 'glass', 'recycling', { middlesex: 'recycling' }));
  assert.equal(summarize(six, chain, {}).consensus.rule, 'recycling');
  const split = [...six.slice(0, 3), ...Array.from({ length: 3 }, (_, i) => item(`t${i}`, 'glass', 'trash', { middlesex: 'trash' }))];
  assert.equal(summarize(split, chain, {}).consensus, null);
  assert.equal(summarize(six.slice(0, 3), chain, {}).consensus, null);
});

test('defaults do not count toward consensus and sort last', () => {
  const items = [item('unknown', 'metal', 'trash'), ...Array.from({ length: 5 }, (_, i) => item(`m${i}`, 'metal', 'recycling', { nj: 'recycling' }))];
  const s = summarize(items, chain, {});
  assert.equal(s.verified, 5);
  assert.equal(s.rows.at(-1).it.id, 'unknown');
});

const repo = {
  region: async (id) => (id === 'edison' ? { id, kind: 'town', name: 'Edison', county_id: 'middlesex' } : null),
  itemsBundle: async () => ({ items: [item('a', 'glass', 'recycling', { nj: 'recycling' }), item('b', 'metal', 'recycling')], facilities: [] }),
};
test('endpoint filters by material, validates input', async () => {
  const ok = await (await handleMaterial(new Request('http://x/m?town=edison'), 'glass', repo)).json();
  assert.equal(ok.item_count, 1);
  assert.equal(ok.items[0].resolved.level, 'state');
  assert.equal((await handleMaterial(new Request('http://x/m'), 'plasma', repo)).status, 400);
  assert.equal((await handleMaterial(new Request('http://x/m'), 'no_object', repo)).status, 404);
  assert.equal((await handleMaterial(new Request('http://x/m?town=nowhere'), 'glass', repo)).status, 404);
});
