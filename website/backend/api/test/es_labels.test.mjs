import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toEs } from '../lib/es_labels.mjs';

const towns = JSON.parse(readFileSync(new URL('../../../../data/towns.json', import.meta.url), 'utf8').replace(/^/, ''));
const PLACE_NAMES = new Set(['Avenel', 'Colonia', 'Fords', 'Hopelawn', 'Iselin', 'Keasbey', 'Menlo Park Terrace', 'Port Reading', 'Sewaren', 'Woodbridge', 'Juneteenth']);

test('every section label, description, holiday reason and date label has Spanish', () => {
  const need = new Set();
  for (const s of towns.schedules) {
    if (s.area_note) need.add(s.area_note);
    for (const o of s.overrides ?? []) need.add(o.reason);
    for (const d of s.dates ?? []) need.add(d.label);
  }
  const missing = [...need].filter((t) => t && !PLACE_NAMES.has(t) && toEs(t) === t);
  assert.deepEqual(missing, []);
});

test('samples', () => {
  assert.equal(toEs('Memorial Day'), 'Día de los Caídos (Memorial Day)');
  assert.equal(toEs('RD 5 Zone 2: streets in Fords'), 'RD 5 Zona 2: calles en Fords');
  assert.equal(toEs('Something new'), 'Something new');
  assert.equal(toEs(''), '');
});
