// All SQL for the schedule endpoint. Reads only published towns and verified rows (public_* views).
import pg from 'pg';

let pool;
export function getPool() {
  // Use the POOLED Neon URL at runtime (DATABASE_URL). Reused across invocations in the same instance.
  pool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  return pool;
}

export function makeRepo(db = getPool()) {
  return {
    async townsForZip(zip) {
      const { rows } = await db.query(
        `SELECT r.id, r.name
           FROM zip_codes z JOIN regions r ON r.id = z.region_id
          WHERE z.zip = $1 AND r.published AND r.kind = 'town'
          ORDER BY r.name`,
        [zip],
      );
      return rows;
    },
    async ping() {
      const { rows } = await db.query('SELECT 1 AS ok');
      return rows[0].ok === 1;
    },
    async region(id) {
      const { rows } = await db.query(
        `SELECT id, kind, name, county_id FROM regions WHERE id = $1 AND (kind <> 'town' OR published)`,
        [id],
      );
      return rows[0] ?? null;
    },
    async publishedTowns() {
      const { rows } = await db.query(
        `SELECT r.id, r.name, r.county_id AS county,
                COALESCE(array_agg(z.zip ORDER BY z.zip) FILTER (WHERE z.zip IS NOT NULL), '{}') AS zips
           FROM regions r LEFT JOIN zip_codes z ON z.region_id = r.id
          WHERE r.kind = 'town' AND r.published
          GROUP BY r.id ORDER BY r.name`,
      );
      return rows;
    },
    async facilitiesForTowns(townIds, material = null) {
      const { rows } = await db.query(
        `SELECT f.key, f.region_id AS region, f.name, f.address, f.zip, f.phone, f.hours, f.residents_only,
                f.accepts::text[] AS accepts, f.notes_en, f.notes_es, f.source_url, to_char(f.last_verified, 'YYYY-MM-DD') AS last_verified
           FROM public_facilities f
          WHERE (f.region_id = ANY($1) OR f.region_id IN (SELECT county_id FROM regions WHERE id = ANY($1)))
            AND ($2::material_t IS NULL OR $2::material_t = ANY(f.accepts))
          ORDER BY f.region_id, f.name`,
        [townIds, material],
      );
      return rows;
    },
    // Items with their verified rules (state, counties, published towns). Optional single item.
    async itemsBundle({ id = null } = {}) {
      const [items, aliases, rules, facilities] = await Promise.all([
        db.query(
          `SELECT id, name_en, name_es, material, default_rule, likely_resin, hazard, varies_by_town,
                  prep_en, prep_es, es_reviewed FROM items WHERE ($1::text IS NULL OR id = $1) ORDER BY id`,
          [id],
        ),
        db.query(`SELECT item_id, alias FROM item_aliases WHERE ($1::text IS NULL OR item_id = $1) ORDER BY alias`, [id]),
        db.query(
          `SELECT r.item_id, r.region_id, r.rule, r.note_en, r.note_es, r.source_url, r.facility_key,
                  to_char(r.last_verified, 'YYYY-MM-DD') AS last_verified
             FROM public_item_rules r JOIN regions g ON g.id = r.region_id AND (g.kind <> 'town' OR g.published)
            WHERE ($1::text IS NULL OR r.item_id = $1)`,
          [id],
        ),
        db.query(
          `SELECT f.key, f.region_id AS region, f.name, f.address, f.zip, f.phone, f.hours, f.residents_only,
                  f.accepts::text[] AS accepts, f.notes_en, f.notes_es, f.source_url, to_char(f.last_verified, 'YYYY-MM-DD') AS last_verified
             FROM public_facilities f WHERE f.key IS NOT NULL ORDER BY f.key`,
        ),
      ]);
      const byItem = new Map(items.rows.map((r) => [r.id, {
        id: r.id, name: { en: r.name_en, es: r.name_es }, aliases: [], material: r.material, default_rule: r.default_rule,
        likely_resin: r.likely_resin, hazard: r.hazard, varies_by_town: r.varies_by_town,
        prep: { en: r.prep_en, es: r.prep_es }, es_reviewed: r.es_reviewed, rules: {},
      }]));
      for (const a of aliases.rows) byItem.get(a.item_id)?.aliases.push(a.alias);
      for (const r of rules.rows) {
        byItem.get(r.item_id).rules[r.region_id] = {
          rule: r.rule, note: { en: r.note_en, es: r.note_es }, source_url: r.source_url,
          last_verified: r.last_verified, facility_key: r.facility_key,
        };
      }
      return { items: [...byItem.values()], facilities: facilities.rows };
    },
    async schedulesForTown(townId) {
      const { rows } = await db.query(
        `SELECT id, stream, weekday, week_pattern, area_key, area_note, rrule,
                to_char(dtstart, 'YYYY-MM-DD') AS dtstart, overrides, dates, notes_en, notes_es,
                source_url, to_char(last_verified, 'YYYY-MM-DD') AS last_verified
           FROM public_schedules
          WHERE region_id = $1
          ORDER BY stream, area_key, weekday`,
        [townId],
      );
      return rows.map((r) => ({ ...r, id: Number(r.id) }));
    },
  };
}

// ---- bulk requests / rate limiting / retention ----
export function makeBulkRepo(db = getPool()) {
  return {
    async isPublishedTown(id) {
      const { rows } = await db.query(`SELECT 1 FROM regions WHERE id = $1 AND kind = 'town' AND published`, [id]);
      return rows.length > 0;
    },
    // Atomic fixed-window counter; returns the hit count INCLUDING this request.
    async hit(key, windowStartIso) {
      const { rows } = await db.query(
        `INSERT INTO rate_limits (key, window_start, hits) VALUES ($1, $2, 1)
         ON CONFLICT (key, window_start) DO UPDATE SET hits = rate_limits.hits + 1
         RETURNING hits`,
        [key, windowStartIso],
      );
      return rows[0].hits;
    },
    async insert({ regionId, email, description, preferredDate }) {
      const { rows } = await db.query(
        `INSERT INTO bulk_requests (region_id, contact_email, description, preferred_date)
         VALUES ($1, $2, $3, $4) RETURNING id, expires_at`,
        [regionId, email, description, preferredDate],
      );
      return { id: rows[0].id, expiresAt: rows[0].expires_at.toISOString() };
    },
    async purge() {
      const { rowCount } = await db.query(`SELECT purge_expired()`);
      return rowCount;
    },
  };
}
