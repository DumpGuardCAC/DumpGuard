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
                f.lat, f.lng, f.hours_struct, f.accepts::text[] AS accepts, f.notes_en, f.notes_es, f.source_url, to_char(f.last_verified, 'YYYY-MM-DD') AS last_verified
           FROM public_facilities f
          WHERE (f.region_id = ANY($1) OR f.region_id IN (SELECT county_id FROM regions WHERE id = ANY($1)))
            AND ($2::material_t IS NULL OR $2::material_t = ANY(f.accepts))
          ORDER BY f.region_id, f.name`,
        [townIds, material],
      );
      return rows;
    },
    // Every public facility with coordinates, for "near me" without choosing a town first.
    async allFacilities(material = null) {
      const { rows } = await db.query(
        `SELECT f.key, f.region_id AS region, f.name, f.address, f.zip, f.phone, f.hours, f.residents_only,
                f.lat, f.lng, f.hours_struct, f.accepts::text[] AS accepts, f.notes_en, f.notes_es, f.source_url,
                to_char(f.last_verified, 'YYYY-MM-DD') AS last_verified
           FROM public_facilities f
          WHERE ($1::material_t IS NULL OR $1::material_t = ANY(f.accepts))
          ORDER BY f.region_id, f.name`,
        [material],
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
                  f.lat, f.lng, f.hours_struct, f.accepts::text[] AS accepts, f.notes_en, f.notes_es, f.source_url, to_char(f.last_verified, 'YYYY-MM-DD') AS last_verified
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

// ---- push reminders ----
export function makePushRepo(db = getPool()) {
  return {
    ...makeRepo(db),
    ...makeBulkRepo(db),
    ...announcementMethods(db),
    async townName(id) {
      const { rows } = await db.query(`SELECT name FROM regions WHERE id = $1`, [id]);
      return rows[0]?.name ?? null;
    },
    async upsert({ endpoint, p256dh, auth, regionId, areaKeys, streams, lang }) {
      await db.query(
        `INSERT INTO push_subscriptions (endpoint, p256dh, auth, region_id, area_keys, streams, lang)
         VALUES ($1,$2,$3,$4,$5,$6::stream_t[],$7)
         ON CONFLICT (endpoint) DO UPDATE SET p256dh = $2, auth = $3, region_id = $4, area_keys = $5, streams = $6::stream_t[],
           lang = $7, failures = 0, expires_at = now() + interval '1 year'`,
        [endpoint, p256dh, auth, regionId, areaKeys, streams, lang],
      );
    },
    async remove(endpoint) {
      await db.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);
    },
    async dueSubscriptions(today) {
      const { rows } = await db.query(
        `SELECT s.id, s.endpoint, s.p256dh, s.auth, s.region_id, s.area_keys, s.streams::text[] AS streams, s.lang
           FROM push_subscriptions s JOIN regions g ON g.id = s.region_id AND g.published
          WHERE (s.last_sent_on IS NULL OR s.last_sent_on < $1::date) AND s.expires_at > now() AND s.failures < 5`,
        [today],
      );
      return rows;
    },
    async markSent(id, today) {
      await db.query(`UPDATE push_subscriptions SET last_sent_on = $2::date, failures = 0 WHERE id = $1`, [id, today]);
    },
    async fail(id) {
      await db.query(`UPDATE push_subscriptions SET failures = failures + 1 WHERE id = $1`, [id]);
    },
  };
}

function announcementMethods(db) {
  return {
    async activeAnnouncements(townId, date) {
      const { rows } = await db.query(
        `SELECT id, region_id, message_en, message_es, source_url, to_char(starts_on, 'YYYY-MM-DD') AS starts_on,
                to_char(ends_on, 'YYYY-MM-DD') AS ends_on
           FROM announcements
          WHERE (region_id IS NULL OR region_id = $1) AND starts_on <= $2::date AND ends_on >= $2::date
          ORDER BY created_at DESC LIMIT 5`,
        [townId, date],
      );
      return rows;
    },
    async createAnnouncement({ regionId, messageEn, messageEs, sourceUrl, startsOn, endsOn }) {
      const { rows } = await db.query(
        `INSERT INTO announcements (region_id, message_en, message_es, source_url, starts_on, ends_on)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [regionId, messageEn, messageEs, sourceUrl, startsOn, endsOn],
      );
      return rows[0].id;
    },
    async deleteAnnouncement(id) {
      await db.query(`DELETE FROM announcements WHERE id = $1`, [id]);
    },
  };
}

export function makeAlertsRepo(db = getPool()) {
  return { ...makeRepo(db), ...makeBulkRepo(db), ...announcementMethods(db) };
}

// ---- impact counters ----
export function makeImpactRepo(db = getPool()) {
  const bulk = makeBulkRepo(db);
  return {
    hit: bulk.hit,
    isPublishedTown: bulk.isPublishedTown,
    async count({ day, regionId, material, outcome }) {
      await db.query(
        `INSERT INTO impact_counts (day, region_id, material, outcome, n) VALUES ($1, $2, $3, $4, 1)
         ON CONFLICT (day, region_id, material, outcome) DO UPDATE SET n = impact_counts.n + 1`,
        [day, regionId, material, outcome],
      );
    },
    async totals(town) {
      const { rows } = await db.query(
        `SELECT material, outcome, sum(n)::int AS n FROM impact_counts WHERE ($1::text IS NULL OR region_id = $1) GROUP BY material, outcome`,
        [town],
      );
      return rows;
    },
  };
}

// ---- wrong-answer reports ----
export function makeReportsRepo(db = getPool()) {
  const bulk = makeBulkRepo(db);
  return {
    hit: bulk.hit,
    isPublishedTown: bulk.isPublishedTown,
    async insertReport({ kind, itemId, regionId, facilityKey, message }) {
      await db.query(
        `INSERT INTO reports (kind, item_id, region_id, facility_key, message) VALUES ($1, $2, $3, $4, $5)`,
        [kind, itemId, regionId, facilityKey, message],
      );
    },
    async listReports(status) {
      const { rows } = await db.query(
        `SELECT id, kind, item_id, region_id, facility_key, message, status, created_at, resolved_at
           FROM reports WHERE status = $1 ORDER BY created_at LIMIT 200`,
        [status],
      );
      return rows;
    },
    async setReportStatus(id, status) {
      const { rowCount } = await db.query(`UPDATE reports SET status = $2, resolved_at = now() WHERE id = $1`, [id, status]);
      return rowCount > 0;
    },
  };
}
