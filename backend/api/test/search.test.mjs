import test from 'node:test';
import assert from 'node:assert/strict';
import { fold, searchItems, handleSearch } from '../lib/search.mjs';

const mk = (id, en, es, aliases = []) => ({ id, name: { en, es }, aliases, material: 'x', default_rule: 'trash', hazard: false, rules: {} });
const items = [
  mk('bottle', 'Plastic water bottle', 'Botella de agua de plástico', ['dasani']),
  mk('battery', 'Car battery', 'Batería de auto', ['lead acid']),
  mk('tire', 'Tire', 'Llanta', ['tyre']),
  mk('pizza', 'Pizza box', 'Caja de pizza', []),
];

test('fold strips accents and punctuation', () => assert.equal(fold('  Batería-de  AUTO! '), 'bateria de auto'));

test('exact, alias, and prefix ranking', () => {
  assert.equal(searchItems(items, 'tire')[0].it.id, 'tire');
  assert.equal(searchItems(items, 'dasani')[0].it.id, 'bottle');
  assert.equal(searchItems(items, 'piz')[0].it.id, 'pizza');
});

test('Spanish input, with or without accents, and Spanish terms', () => {
  assert.equal(searchItems(items, 'bateria')[0].it.id, 'battery');
  assert.equal(searchItems(items, 'llantas')[0].it.id, 'tire');
  assert.equal(searchItems(items, 'botella')[0].it.id, 'bottle');
});

test('typos are forgiven, nonsense finds nothing', () => {
  assert.equal(searchItems(items, 'bateery')[0].it.id, 'battery');
  assert.equal(searchItems(items, 'zzzzzz').length, 0);
});

test('endpoint validates q and returns results', async () => {
  const repo = { region: async () => null, itemsBundle: async () => ({ items, facilities: [] }) };
  assert.equal((await handleSearch(new Request('http://x/s?q=a'), repo)).status, 400);
  const ok = await handleSearch(new Request('http://x/s?q=tire'), repo);
  assert.equal((await ok.json()).results[0].id, 'tire');
});
