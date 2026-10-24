import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const [cmd, ...args] = process.argv.slice(2);
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL_UNPOOLED (preferred) or DATABASE_URL.');
  process.exit(1);
}

function migrations() {
  const parts = readFileSync(path.join(here, 'schema.sql'), 'utf8').split(/^-- migration: (\S+)\n/m);
  const out = [];
  for (let i = 1; i < parts.length; i += 2) out.push([parts[i], parts[i + 1]]);
  return out;
}

const REGIONS = [
  { id: 'nj', kind: 'state', name: 'New Jersey' },
  { id: 'middlesex', kind: 'county', name: 'Middlesex County' },
  { id: 'monmouth', kind: 'county', name: 'Monmouth County' },
  { id: 'edison', kind: 'town', name: 'Edison', county: 'middlesex' },
  { id: 'new-brunswick', kind: 'town', name: 'New Brunswick', county: 'middlesex' },
  { id: 'woodbridge', kind: 'town', name: 'Woodbridge', county: 'middlesex' },
  { id: 'long-branch', kind: 'town', name: 'Long Branch', county: 'monmouth' },
  { id: 'asbury-park', kind: 'town', name: 'Asbury Park', county: 'monmouth' },
  { id: 'carteret', kind: 'town', name: 'Carteret', county: 'middlesex' },
  { id: 'highland-park', kind: 'town', name: 'Highland Park', county: 'middlesex' },
  { id: 'metuchen', kind: 'town', name: 'Metuchen', county: 'middlesex' },
  { id: 'old-bridge', kind: 'town', name: 'Old Bridge', county: 'middlesex' },
  { id: 'perth-amboy', kind: 'town', name: 'Perth Amboy', county: 'middlesex' },
  { id: 'piscataway', kind: 'town', name: 'Piscataway', county: 'middlesex' },
  { id: 'sayreville', kind: 'town', name: 'Sayreville', county: 'middlesex' },
  { id: 'south-amboy', kind: 'town', name: 'South Amboy', county: 'middlesex' },
  { id: 'south-plainfield', kind: 'town', name: 'South Plainfield', county: 'middlesex' },
  { id: 'aberdeen', kind: 'town', name: 'Aberdeen', county: 'monmouth' },
  { id: 'allenhurst', kind: 'town', name: 'Allenhurst', county: 'monmouth' },
  { id: 'atlantic-highlands', kind: 'town', name: 'Atlantic Highlands', county: 'monmouth' },
  { id: 'bradley-beach', kind: 'town', name: 'Bradley Beach', county: 'monmouth' },
  { id: 'deal', kind: 'town', name: 'Deal', county: 'monmouth' },
  { id: 'fair-haven', kind: 'town', name: 'Fair Haven', county: 'monmouth' },
  { id: 'hazlet', kind: 'town', name: 'Hazlet', county: 'monmouth' },
  { id: 'highlands', kind: 'town', name: 'Highlands', county: 'monmouth' },
  { id: 'interlaken', kind: 'town', name: 'Interlaken', county: 'monmouth' },
  { id: 'keansburg', kind: 'town', name: 'Keansburg', county: 'monmouth' },
  { id: 'keyport', kind: 'town', name: 'Keyport', county: 'monmouth' },
  { id: 'little-silver', kind: 'town', name: 'Little Silver', county: 'monmouth' },
  { id: 'loch-arbour', kind: 'town', name: 'Loch Arbour', county: 'monmouth' },
  { id: 'matawan', kind: 'town', name: 'Matawan', county: 'monmouth' },
  { id: 'middletown', kind: 'town', name: 'Middletown', county: 'monmouth' },
  { id: 'monmouth-beach', kind: 'town', name: 'Monmouth Beach', county: 'monmouth' },
  { id: 'neptune-city', kind: 'town', name: 'Neptune City', county: 'monmouth' },
  { id: 'neptune-township', kind: 'town', name: 'Neptune Township', county: 'monmouth' },
  { id: 'oceanport', kind: 'town', name: 'Oceanport', county: 'monmouth' },
  { id: 'red-bank', kind: 'town', name: 'Red Bank', county: 'monmouth' },
  { id: 'rumson', kind: 'town', name: 'Rumson', county: 'monmouth' },
  { id: 'sea-bright', kind: 'town', name: 'Sea Bright', county: 'monmouth' },
  { id: 'union-beach', kind: 'town', name: 'Union Beach', county: 'monmouth' },
  { id: 'west-long-branch', kind: 'town', name: 'West Long Branch', county: 'monmouth' },
];

async function migrate() {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
    for (const [name, sql] of migrations()) {
      if (done.has(name)) continue;
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
      console.log('applied', name);
    }
    console.log('schema up to date');
  } catch (err) {
    console.error('migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

async function seed() {
  const dbPath = process.env.ITEMS_DB ?? path.join(here, '..', '..', 'data', 'items_db.json');
  const townsPath = process.env.TOWNS_DB ?? path.join(here, '..', '..', 'data', 'towns.json');
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
        `INSERT INTO regions (id, kind, name, county_id, published) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET kind = EXCLUDED.kind, name = EXCLUDED.name, county_id = EXCLUDED.county_id`,
        [r.id, r.kind, r.name, r.county ?? null, r.kind !== 'town'],
      );
    }

    let rules = 0;
    for (const it of db.items) {
      await client.query(
        `INSERT INTO items (id, name_en, name_es, material, default_rule, hazard, varies_by_town,
                            prep_en, prep_es, status, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'verified', now())
         ON CONFLICT (id) DO UPDATE SET
           name_en = EXCLUDED.name_en, name_es = EXCLUDED.name_es, material = EXCLUDED.material,
           default_rule = EXCLUDED.default_rule, hazard = EXCLUDED.hazard,
           varies_by_town = EXCLUDED.varies_by_town, prep_en = EXCLUDED.prep_en, prep_es = EXCLUDED.prep_es,
           updated_at = now()`,
        [it.id, it.name.en, it.name.es, it.material, it.default_rule, it.hazard,
          it.varies_by_town, it.prep.en, it.prep.es],
      );

      await client.query('DELETE FROM item_aliases WHERE item_id = $1', [it.id]);
      for (const alias of new Set(it.aliases)) {
        await client.query('INSERT INTO item_aliases (item_id, alias) VALUES ($1, $2)', [it.id, alias]);
      }
      await client.query('DELETE FROM item_rules WHERE item_id = $1', [it.id]);
      for (const [region, r] of Object.entries(it.county_rules)) {
        await client.query(
          `INSERT INTO item_rules (item_id, region_id, rule, note_en, note_es, status, facility_key)
           VALUES ($1,$2,$3,$4,$5,'verified',$6)`,
          [it.id, region, r.rule, r.note?.en ?? '', r.note?.es ?? '', r.facility ?? null],
        );
        rules += 1;
      }
    }

    const towns = JSON.parse(readFileSync(townsPath, 'utf8'));
    for (const row of [...towns.facilities, ...towns.schedules, ...towns.zip_codes]) {
      if (!known.has(row.region)) throw new Error(`towns.json uses unknown region "${row.region}"`);
    }
    await client.query('DELETE FROM facilities');
    for (const f of towns.facilities) {
      await client.query(
        `INSERT INTO facilities (key, region_id, name, address, zip, phone, hours, residents_only, accepts, notes_en, notes_es, status, lat, lng, hours_struct)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::material_t[],$10,$11,'verified',$12,$13,$14)`,
        [f.key, f.region, f.name, f.address, f.zip, f.phone, f.hours, f.residents_only, f.accepts, f.notes_en, f.notes_es,
          f.lat ?? null, f.lng ?? null,
          JSON.stringify(f.hours_struct ?? [])],
      );
    }
    await client.query('DELETE FROM collection_schedules');
    for (const s of towns.schedules) {
      await client.query(
        `INSERT INTO collection_schedules (region_id, stream, weekday, week_pattern, area_key, area_note, rrule, dtstart, overrides, dates,
                                           notes_en, notes_es, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,'verified')`,
        [s.region, s.stream, s.weekday, s.week_pattern, s.area_key ?? '', s.area_note, s.rrule ?? null, s.dtstart ?? null,
          JSON.stringify(s.overrides ?? []), JSON.stringify(s.dates ?? []), s.notes_en, s.notes_es ?? ''],
      );
    }
    await client.query('DELETE FROM zip_codes');
    for (const z of towns.zip_codes) {
      await client.query('INSERT INTO zip_codes (zip, region_id, status) VALUES ($1,$2,$3)', [z.zip, z.region, 'needs_verification']);
    }

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
}

async function publish() {
  const off = args[0] === '--off';
  const info = args.includes('--info');
  const ids = args.filter((a) => !a.startsWith('--'));

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    if (ids.length === 0) {
      const { rows } = await client.query(`
        SELECT r.id, r.published,
               (SELECT count(*) FROM collection_schedules s WHERE s.region_id = r.id AND s.status = 'verified') AS verified_schedules,
               (SELECT count(*) FROM collection_schedules s WHERE s.region_id = r.id AND s.status <> 'verified') AS unverified_schedules,
               (SELECT count(*) FROM zip_codes z WHERE z.region_id = r.id) AS zips,
               (SELECT count(*) FROM zip_codes z WHERE z.region_id = r.id AND z.status = 'verified') AS verified_zips
          FROM regions r WHERE r.kind = 'town' ORDER BY r.id`);
      console.table(rows);
    } else {
      for (const id of ids) {
        const { rows } = await client.query(`SELECT id FROM regions WHERE id = $1 AND kind = 'town'`, [id]);
        if (!rows.length) { console.error(`no such town: ${id}`); process.exitCode = 1; continue; }
        if (!off && !info) {
          const v = await client.query(`SELECT count(*)::int AS n FROM collection_schedules WHERE region_id = $1 AND status = 'verified'`, [id]);
          if (v.rows[0].n === 0) { console.error(`refusing to publish ${id}: no verified schedules`); process.exitCode = 1; continue; }
        }
        await client.query(`UPDATE regions SET published = $2 WHERE id = $1`, [id, !off]);
        console.log(`${id}: published = ${!off}`);
      }
    }
  } finally {
    await client.end();
  }
}

const commands = { migrate, seed, publish };
if (!commands[cmd]) {
  console.error('Usage: node lib/db.mjs migrate | seed | publish [--off|--info] [town...]');
  process.exit(1);
}
await commands[cmd]();
