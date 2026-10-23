import pg from 'pg';

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL_UNPOOLED (preferred) or DATABASE_URL.');
  process.exit(1);
}
const args = process.argv.slice(2);
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
