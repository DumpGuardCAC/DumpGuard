import pg from 'pg';

let pool;
export function getPool() {
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

export function makeBulkRepo(db = getPool()) {
  return {
    async isPublishedTown(id) {
      const { rows } = await db.query(`SELECT 1 FROM regions WHERE id = $1 AND kind = 'town' AND published`, [id]);
      return rows.length > 0;
    },
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

export function makeDumpingRepo(db = getPool()) {
  const bulk = makeBulkRepo(db);
  return {
    hit: bulk.hit,
    isPublishedTown: bulk.isPublishedTown,
    async insertDump({ code, regionId, type, where, description, notes, lat, lng, photo }) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          `INSERT INTO dump_reports (code, region_id, dump_type, location_text, description, notes, lat, lng)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (code) DO NOTHING RETURNING id`,
          [code, regionId, type, where, description, notes, lat, lng],
        );
        if (!rows.length) { await client.query('ROLLBACK'); return false; }
        if (photo) await client.query(`INSERT INTO dump_photos (report_id, bytes) VALUES ($1,$2)`, [rows[0].id, photo]);
        await client.query('COMMIT');
        return true;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    async dumpByCode(code) {
      const { rows } = await db.query(`SELECT status, region_id, dump_type, created_at, updated_at FROM dump_reports WHERE code = $1`, [code]);
      return rows[0] ?? null;
    },
    async mapPoints() {
      const { rows } = await db.query(
        `SELECT floor(lng / $1)::int AS cx, floor(lat / $1)::int AS cy, status, dump_type, region_id
           FROM dump_reports WHERE lat IS NOT NULL AND created_at > now() - interval '180 days' LIMIT 5000`,
        [0.005],
      );
      return rows;
    },
    async townStatusCounts() {
      const { rows } = await db.query(
        `SELECT r.id AS region_id, r.name,
                count(*) FILTER (WHERE d.status = 'new')::int AS new, count(*) FILTER (WHERE d.status = 'noticed')::int AS noticed,
                count(*) FILTER (WHERE d.status = 'progress')::int AS progress, count(*) FILTER (WHERE d.status = 'resolved')::int AS resolved
           FROM regions r LEFT JOIN dump_reports d ON d.region_id = r.id
          WHERE r.kind = 'town' AND r.published GROUP BY r.id, r.name ORDER BY r.name`,
      );
      return rows;
    },
    async listDumps({ status, town }) {
      const cols = `d.id, d.code, d.region_id, d.dump_type, d.location_text, d.description, d.notes, d.lat, d.lng, d.status,
                d.created_at, d.updated_at, (p.report_id IS NOT NULL) AS has_photo`;
      const msgs = `, (SELECT count(*)::int FROM dump_messages m WHERE m.report_id = d.id) AS msg_count,
                (SELECT m.from_staff FROM dump_messages m WHERE m.report_id = d.id ORDER BY m.created_at DESC LIMIT 1) AS last_from_staff`;
      const tail = `FROM dump_reports d LEFT JOIN dump_photos p ON p.report_id = d.id
          WHERE ($1::text IS NULL OR d.status = $1::dump_status_t) AND ($2::text IS NULL OR d.region_id = $2)
          ORDER BY d.created_at DESC LIMIT 500`;
      try {
        return (await db.query(`SELECT ${cols}${msgs} ${tail}`, [status, town])).rows;
      } catch (err) {
        if (err?.code !== '42P01') throw err;
        return (await db.query(`SELECT ${cols} ${tail}`, [status, town])).rows;
      }
    },
    async dumpIdByCode(code) {
      const { rows } = await db.query(`SELECT id FROM dump_reports WHERE code = $1`, [code]);
      return rows[0]?.id ?? null;
    },
    async dumpExists(id) {
      const { rows } = await db.query(`SELECT 1 FROM dump_reports WHERE id = $1`, [id]);
      return rows.length > 0;
    },
    async listMessages(reportId) {
      const { rows } = await db.query(
        `SELECT id, from_staff, body, created_at FROM dump_messages WHERE report_id = $1 ORDER BY created_at LIMIT 100`, [reportId]);
      return rows;
    },
    async countMessages(reportId) {
      const { rows } = await db.query(`SELECT count(*)::int AS n FROM dump_messages WHERE report_id = $1`, [reportId]);
      return rows[0].n;
    },
    async addMessage(reportId, fromStaff, body) {
      await db.query(`INSERT INTO dump_messages (report_id, from_staff, body) VALUES ($1,$2,$3)`, [reportId, fromStaff, body]);
    },
    async dumpPhoto(id) {
      const { rows } = await db.query(`SELECT bytes FROM dump_photos WHERE report_id = $1`, [id]);
      return rows[0]?.bytes ?? null;
    },
    async setDumpStatus(id, status) {
      const { rowCount } = await db.query(`UPDATE dump_reports SET status = $2, updated_at = now() WHERE id = $1`, [id, status]);
      return rowCount > 0;
    },
  };
}
