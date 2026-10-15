// Seed regions, items, aliases and item rules from data/items_db.json.
// Usage: DATABASE_URL_UNPOOLED=... node seed.mjs   (falls back to DATABASE_URL)
// Idempotent: safe to re-run after rebuilding items_db.json.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.ITEMS_DB ?? path.join(here, '..', '..', 'data', 'items_db.json');
const townsPath = process.env.TOWNS_DB ?? path.join(here, '..', '..', 'data', 'towns.json');
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL_UNPOOLED (preferred) or DATABASE_URL.');
  process.exit(1);
}

// Towns stay unpublished until their schedule and facility data are verified (spec: unverified towns are not shown).
const REGIONS = [
  { id: 'nj', kind: 'state', name: 'New Jersey' },
  { id: 'middlesex', kind: 'county', name: 'Middlesex County' },
  { id: 'monmouth', kind: 'county', name: 'Monmouth County' },
  { id: 'edison', kind: 'town', name: 'Edison', county: 'middlesex' },
  { id: 'new-brunswick', kind: 'town', name: 'New Brunswick', county: 'middlesex' },
  { id: 'woodbridge', kind: 'town', name: 'Woodbridge', county: 'middlesex' },
  { id: 'long-branch', kind: 'town', name: 'Long Branch', county: 'monmouth' },
  { id: 'asbury-park', kind: 'town', name: 'Asbury Park', county: 'monmouth' },
];

const db = JSON.parse(readFileSync(dbPath, 'utf8'));
const known = new Set(REGIONS.map((r) => r.id));
for (const item of db.items) {
  for (const region of Object.keys(item.county_rules)) {
    if (!known.has(region)) {
      console.error(`items_db.json uses region "${region}" (item ${item.id}) that seed.mjs does not define.`);
      process.exit(1);
    }
  }
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query('BEGIN');

  for (const r of REGIONS) {
    await client.query(
      // State and counties are always published; towns stay hidden until someone flips published after verifying their data.
      `INSERT INTO regions (id, kind, name, county_id, published) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET kind = EXCLUDED.kind, name = EXCLUDED.name, county_id = EXCLUDED.county_id`,
      [r.id, r.kind, r.name, r.county ?? null, r.kind !== 'town'],
    );
  }

  // Counties and the state first, towns reference counties; REGIONS is already ordered that way.
  let rules = 0;
  for (const it of db.items) {
    await client.query(
      `INSERT INTO items (id, name_en, name_es, material, default_rule, likely_resin, hazard, varies_by_town,
                          prep_en, prep_es, status, es_reviewed, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
       ON CONFLICT (id) DO UPDATE SET
         name_en = EXCLUDED.name_en, name_es = EXCLUDED.name_es, material = EXCLUDED.material,
         default_rule = EXCLUDED.default_rule, likely_resin = EXCLUDED.likely_resin, hazard = EXCLUDED.hazard,
         varies_by_town = EXCLUDED.varies_by_town, prep_en = EXCLUDED.prep_en, prep_es = EXCLUDED.prep_es,
         status = EXCLUDED.status, es_reviewed = EXCLUDED.es_reviewed, updated_at = now()`,
      [it.id, it.name.en, it.name.es, it.material, it.default_rule, it.likely_resin ?? null, it.hazard,
        it.varies_by_town, it.prep.en, it.prep.es, it.status, it.es_reviewed],
    );

    // Replace aliases and rules wholesale so removed entries do not linger.
    await client.query('DELETE FROM item_aliases WHERE item_id = $1', [it.id]);
    for (const alias of new Set(it.aliases)) {
      await client.query('INSERT INTO item_aliases (item_id, alias) VALUES ($1, $2)', [it.id, alias]);
    }
    await client.query('DELETE FROM item_rules WHERE item_id = $1', [it.id]);
    for (const [region, r] of Object.entries(it.county_rules)) {
      await client.query(
        `INSERT INTO item_rules (item_id, region_id, rule, note_en, note_es, status, source_url, last_verified, evidence, facility_key)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [it.id, region, r.rule, r.note?.en ?? '', r.note?.es ?? '', r.status, r.source ?? null,
          r.last_verified ?? null, r.evidence ?? null, r.facility ?? null],
      );
      rules += 1;
    }
  }

  // Town data: facilities, schedules, ZIPs. These tables are fully owned by towns.json, so replace them wholesale.
  const towns = JSON.parse(readFileSync(townsPath, 'utf8'));
  const retrieved = towns._meta.retrieved;
  for (const row of [...towns.facilities, ...towns.schedules, ...towns.zip_codes]) {
    if (!known.has(row.region)) throw new Error(`towns.json uses unknown region "${row.region}"`);
  }
  await client.query('DELETE FROM facilities');
  for (const f of towns.facilities) {
    await client.query(
      `INSERT INTO facilities (key, region_id, name, address, zip, phone, hours, residents_only, accepts, notes_en, notes_es, status, source_url, last_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::material_t[],$10,$11,$12,$13,$14)`,
      [f.key, f.region, f.name, f.address, f.zip, f.phone, f.hours, f.residents_only, f.accepts, f.notes_en, f.notes_es,
        f.status, f.source_url, f.status === 'verified' ? f.last_verified ?? retrieved : null],
    );
  }
  await client.query('DELETE FROM collection_schedules');
  for (const s of towns.schedules) {
    await client.query(
      `INSERT INTO collection_schedules (region_id, stream, weekday, week_pattern, area_key, area_note, rrule, dtstart, overrides, dates,
                                         notes_en, notes_es, status, source_url, last_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,$13,$14,$15)`,
      [s.region, s.stream, s.weekday, s.week_pattern, s.area_key ?? '', s.area_note, s.rrule ?? null, s.dtstart ?? null,
        JSON.stringify(s.overrides ?? []), JSON.stringify(s.dates ?? []), s.notes_en, s.notes_es ?? '', s.status, s.source_url,
        s.status === 'verified' ? s.last_verified ?? retrieved : null],
    );
  }
  await client.query('DELETE FROM zip_codes');
  for (const z of towns.zip_codes) {
    await client.query('INSERT INTO zip_codes (zip, region_id, status) VALUES ($1,$2,$3)', [z.zip, z.region, 'needs_verification']);
  }

  // Drop items removed from the JSON.
  await client.query('DELETE FROM items WHERE id <> ALL($1::text[])', [db.items.map((i) => i.id)]);

  await client.query('COMMIT');
  console.log(`seeded ${REGIONS.length} regions, ${db.items.length} items, ${rules} item rules, ${towns.facilities.length} facilities, ${towns.schedules.length} schedules, ${towns.zip_codes.length} zips`);
} catch (err) {
  await client.query('ROLLBACK');
  console.error('seed failed, rolled back:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
