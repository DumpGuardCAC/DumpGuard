-- migration: 0001_init.sql

BEGIN;

CREATE TYPE material_t   AS ENUM ('rigid_plastic', 'soft_plastic_foam', 'cardboard_paper', 'metal', 'glass', 'ewaste_hazard', 'other');
CREATE TYPE rule_t       AS ENUM ('recycling', 'trash', 'special_dropoff');
CREATE TYPE status_t     AS ENUM ('needs_verification', 'verified');
CREATE TYPE region_kind_t AS ENUM ('state', 'county', 'town');
CREATE TYPE stream_t     AS ENUM ('trash', 'recycling', 'bulk', 'yard', 'other');

CREATE TABLE regions (
  id          text PRIMARY KEY,
  kind        region_kind_t NOT NULL,
  name        text NOT NULL,
  county_id   text REFERENCES regions(id),
  published   boolean NOT NULL DEFAULT false,
  CHECK ((kind = 'town') = (county_id IS NOT NULL))
);

CREATE TABLE zip_codes (
  zip            char(5) NOT NULL CHECK (zip ~ '^[0-9]{5}$'),
  region_id      text NOT NULL REFERENCES regions(id),
  status         status_t NOT NULL DEFAULT 'needs_verification',
  source_url     text,
  last_verified  date,
  PRIMARY KEY (zip, region_id),
  CONSTRAINT verified_needs_source CHECK (status <> 'verified' OR (source_url IS NOT NULL AND last_verified IS NOT NULL))
);
CREATE INDEX zip_codes_region_idx ON zip_codes (region_id);

CREATE TABLE items (
  id              text PRIMARY KEY,
  name_en         text NOT NULL,
  name_es         text NOT NULL,
  material        material_t NOT NULL,
  default_rule    rule_t NOT NULL,
  likely_resin    text,
  hazard          boolean NOT NULL DEFAULT false,
  varies_by_town  boolean NOT NULL DEFAULT false,
  prep_en         text NOT NULL DEFAULT '',
  prep_es         text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'draft',
  es_reviewed     boolean NOT NULL DEFAULT false,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE item_aliases (
  item_id   text NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  alias     text NOT NULL,
  PRIMARY KEY (item_id, alias)
);
CREATE INDEX item_aliases_lower_idx ON item_aliases (lower(alias));

CREATE TABLE item_rules (
  item_id        text NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  region_id      text NOT NULL REFERENCES regions(id),
  rule           rule_t NOT NULL,
  note_en        text NOT NULL DEFAULT '',
  note_es        text NOT NULL DEFAULT '',
  status         status_t NOT NULL DEFAULT 'needs_verification',
  source_url     text,
  last_verified  date,
  evidence       text,
  PRIMARY KEY (item_id, region_id),
  CONSTRAINT verified_needs_source CHECK (status <> 'verified' OR (source_url IS NOT NULL AND last_verified IS NOT NULL))
);
CREATE INDEX item_rules_region_idx ON item_rules (region_id);

CREATE TABLE collection_schedules (
  id             bigserial PRIMARY KEY,
  region_id      text NOT NULL REFERENCES regions(id),
  stream         stream_t NOT NULL,
  weekday        smallint CHECK (weekday BETWEEN 0 AND 6),
  week_pattern   text NOT NULL DEFAULT 'weekly',
  area_note      text NOT NULL DEFAULT '',
  rrule          text,
  notes_en       text NOT NULL DEFAULT '',
  notes_es       text NOT NULL DEFAULT '',
  status         status_t NOT NULL DEFAULT 'needs_verification',
  source_url     text,
  last_verified  date,
  CONSTRAINT verified_needs_source CHECK (status <> 'verified' OR (source_url IS NOT NULL AND last_verified IS NOT NULL))
);
CREATE INDEX collection_schedules_region_idx ON collection_schedules (region_id);

CREATE TABLE facilities (
  id             bigserial PRIMARY KEY,
  region_id      text NOT NULL REFERENCES regions(id),
  name           text NOT NULL,
  address        text NOT NULL,
  zip            char(5),
  phone          text,
  hours          text NOT NULL DEFAULT '',
  residents_only boolean NOT NULL DEFAULT false,
  accepts        material_t[] NOT NULL DEFAULT '{}',
  notes_en       text NOT NULL DEFAULT '',
  notes_es       text NOT NULL DEFAULT '',
  status         status_t NOT NULL DEFAULT 'needs_verification',
  source_url     text,
  last_verified  date,
  UNIQUE (region_id, name),
  CONSTRAINT verified_needs_source CHECK (status <> 'verified' OR (source_url IS NOT NULL AND last_verified IS NOT NULL))
);
CREATE INDEX facilities_region_idx ON facilities (region_id);

CREATE TABLE bulk_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '90 days',
  region_id       text NOT NULL REFERENCES regions(id),
  contact_email   text NOT NULL CHECK (length(contact_email) <= 254 AND contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  description     text NOT NULL CHECK (length(description) BETWEEN 1 AND 1000),
  preferred_date  date,
  is_demo         boolean NOT NULL DEFAULT true CHECK (is_demo)
);
CREATE INDEX bulk_requests_expires_idx ON bulk_requests (expires_at);

CREATE TABLE rate_limits (
  key           text NOT NULL,
  window_start  timestamptz NOT NULL,
  hits          integer NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

CREATE FUNCTION purge_expired() RETURNS void LANGUAGE sql AS $$
  DELETE FROM bulk_requests WHERE expires_at < now();
  DELETE FROM rate_limits WHERE window_start < now() - interval '1 day';
$$;

CREATE VIEW public_item_rules AS
  SELECT r.item_id, r.region_id, r.rule, r.note_en, r.note_es, r.source_url, r.last_verified
  FROM item_rules r
  WHERE r.status = 'verified';

CREATE VIEW public_schedules AS
  SELECT s.* FROM collection_schedules s
  JOIN regions g ON g.id = s.region_id AND g.published
  WHERE s.status = 'verified';

CREATE VIEW public_facilities AS
  SELECT f.* FROM facilities f
  JOIN regions g ON g.id = f.region_id AND g.published
  WHERE f.status = 'verified';

COMMIT;

-- migration: 0002_schedule_detail.sql

BEGIN;

ALTER TABLE collection_schedules
  ADD COLUMN area_key  text NOT NULL DEFAULT '',
  ADD COLUMN dtstart   date,
  ADD COLUMN overrides jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(overrides) = 'array');

DROP VIEW public_schedules;
CREATE VIEW public_schedules AS
  SELECT s.* FROM collection_schedules s
  JOIN regions g ON g.id = s.region_id AND g.published
  WHERE s.status = 'verified';

COMMIT;

-- migration: 0003_one_off_dates.sql
BEGIN;

ALTER TABLE collection_schedules
  ADD COLUMN dates jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(dates) = 'array');

DROP VIEW public_schedules;
CREATE VIEW public_schedules AS
  SELECT s.* FROM collection_schedules s
  JOIN regions g ON g.id = s.region_id AND g.published
  WHERE s.status = 'verified';

COMMIT;

-- migration: 0004_facility_keys.sql
BEGIN;

ALTER TABLE facilities ADD COLUMN key text;
CREATE UNIQUE INDEX facilities_key_idx ON facilities (key);

ALTER TABLE item_rules ADD COLUMN facility_key text;

DROP VIEW public_facilities;
CREATE VIEW public_facilities AS
  SELECT f.* FROM facilities f
  JOIN regions g ON g.id = f.region_id AND g.published
  WHERE f.status = 'verified';

DROP VIEW public_item_rules;
CREATE VIEW public_item_rules AS
  SELECT r.item_id, r.region_id, r.rule, r.note_en, r.note_es, r.source_url, r.last_verified, r.facility_key
  FROM item_rules r
  WHERE r.status = 'verified';

COMMIT;

-- migration: 0005_facility_geo.sql
BEGIN;

ALTER TABLE facilities ADD COLUMN lat double precision;
ALTER TABLE facilities ADD COLUMN lng double precision;
ALTER TABLE facilities ADD COLUMN hours_struct jsonb NOT NULL DEFAULT '[]';
ALTER TABLE facilities ADD CONSTRAINT facilities_geo_pair CHECK ((lat IS NULL) = (lng IS NULL));

DROP VIEW public_facilities;
CREATE VIEW public_facilities AS
  SELECT f.* FROM facilities f
  JOIN regions g ON g.id = f.region_id AND g.published
  WHERE f.status = 'verified';

COMMIT;

-- migration: 0006_push.sql
BEGIN;

CREATE TABLE push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint     text NOT NULL UNIQUE CHECK (endpoint ~ '^https://' AND length(endpoint) <= 1000),
  p256dh       text NOT NULL CHECK (length(p256dh) BETWEEN 1 AND 200),
  auth         text NOT NULL CHECK (length(auth) BETWEEN 1 AND 100),
  region_id    text NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  area_keys    text[] NOT NULL DEFAULT '{}',
  streams      stream_t[] NOT NULL DEFAULT '{trash,recycling,bulk,yard}',
  lang         text NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'es')),
  last_sent_on date,
  failures     integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL DEFAULT now() + interval '1 year'
);
CREATE INDEX push_subscriptions_region_idx ON push_subscriptions (region_id);

CREATE OR REPLACE FUNCTION purge_expired() RETURNS void LANGUAGE sql AS $$
  DELETE FROM bulk_requests WHERE expires_at < now();
  DELETE FROM rate_limits WHERE window_start < now() - interval '1 day';
  DELETE FROM push_subscriptions WHERE expires_at < now() OR failures >= 5;
$$;

COMMIT;

-- migration: 0007_alerts.sql
BEGIN;

CREATE TABLE announcements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id  text REFERENCES regions(id) ON DELETE CASCADE,
  message_en text NOT NULL CHECK (length(message_en) BETWEEN 1 AND 300),
  message_es text NOT NULL DEFAULT '' CHECK (length(message_es) <= 300),
  source_url text,
  starts_on  date NOT NULL DEFAULT current_date,
  ends_on    date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on AND ends_on <= starts_on + 60)
);
CREATE INDEX announcements_window_idx ON announcements (ends_on, starts_on);

CREATE OR REPLACE FUNCTION purge_expired() RETURNS void LANGUAGE sql AS $$
  DELETE FROM bulk_requests WHERE expires_at < now();
  DELETE FROM rate_limits WHERE window_start < now() - interval '1 day';
  DELETE FROM push_subscriptions WHERE expires_at < now() OR failures >= 5;
  DELETE FROM announcements WHERE ends_on < current_date - 30;
$$;

COMMIT;

-- migration: 0008_impact.sql
BEGIN;

CREATE TABLE impact_counts (
  day       date NOT NULL,
  region_id text NOT NULL DEFAULT '',
  material  text NOT NULL,
  outcome   text NOT NULL CHECK (outcome IN ('recycling', 'trash', 'special_dropoff')),
  n         integer NOT NULL DEFAULT 0 CHECK (n >= 0),
  PRIMARY KEY (day, region_id, material, outcome)
);

COMMIT;

-- migration: 0009_reports.sql
BEGIN;

CREATE TYPE report_kind_t AS ENUM ('item_rule', 'schedule', 'facility', 'scan', 'other');
CREATE TYPE report_status_t AS ENUM ('open', 'resolved', 'dismissed');

CREATE TABLE reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        report_kind_t NOT NULL,
  item_id     text,
  region_id   text REFERENCES regions(id) ON DELETE SET NULL,
  facility_key text,
  message     text NOT NULL CHECK (length(message) BETWEEN 3 AND 500),
  status      report_status_t NOT NULL DEFAULT 'open',
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX reports_status_idx ON reports (status, created_at);

CREATE OR REPLACE FUNCTION purge_expired() RETURNS void LANGUAGE sql AS $$
  DELETE FROM bulk_requests WHERE expires_at < now();
  DELETE FROM rate_limits WHERE window_start < now() - interval '1 day';
  DELETE FROM push_subscriptions WHERE expires_at < now() OR failures >= 5;
  DELETE FROM announcements WHERE ends_on < current_date - 30;
  DELETE FROM reports WHERE (status <> 'open' AND resolved_at < now() - interval '90 days')
                         OR created_at < now() - interval '1 year';
$$;

COMMIT;

-- migration: 0010_dumping.sql
BEGIN;

CREATE TYPE dump_status_t AS ENUM ('new', 'noticed', 'progress', 'resolved');

CREATE TABLE dump_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE CHECK (code ~ '^DG-[A-Z0-9]{5}$'),
  region_id     text NOT NULL REFERENCES regions(id),
  dump_type     text NOT NULL CHECK (dump_type IN ('household','furniture','appliances','electronics','tires','construction','yard','hazardous','other')),
  location_text text NOT NULL CHECK (length(location_text) BETWEEN 3 AND 200),
  description   text NOT NULL CHECK (length(description) BETWEEN 3 AND 500),
  notes         text CHECK (length(notes) <= 500),
  lat           double precision CHECK (lat BETWEEN 38.9 AND 41.4),
  lng           double precision CHECK (lng BETWEEN -75.6 AND -73.8),
  status        dump_status_t NOT NULL DEFAULT 'new',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dump_reports_status_idx ON dump_reports (status, created_at);
CREATE INDEX dump_reports_region_idx ON dump_reports (region_id);

CREATE TABLE dump_photos (
  report_id    uuid PRIMARY KEY REFERENCES dump_reports(id) ON DELETE CASCADE,
  content_type text NOT NULL DEFAULT 'image/jpeg' CHECK (content_type = 'image/jpeg'),
  bytes        bytea NOT NULL CHECK (octet_length(bytes) <= 2097152)
);

CREATE OR REPLACE FUNCTION purge_expired() RETURNS void LANGUAGE sql AS $$
  DELETE FROM bulk_requests WHERE expires_at < now();
  DELETE FROM rate_limits WHERE window_start < now() - interval '1 day';
  DELETE FROM push_subscriptions WHERE expires_at < now() OR failures >= 5;
  DELETE FROM announcements WHERE ends_on < current_date - 30;
  DELETE FROM reports WHERE (status <> 'open' AND resolved_at < now() - interval '90 days')
                         OR created_at < now() - interval '1 year';
  DELETE FROM dump_reports WHERE (status = 'resolved' AND updated_at < now() - interval '180 days')
                              OR created_at < now() - interval '1 year';
$$;

COMMIT;

-- migration: 0011_dump_messages.sql
BEGIN;

CREATE TABLE dump_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  uuid NOT NULL REFERENCES dump_reports(id) ON DELETE CASCADE,
  from_staff boolean NOT NULL,
  body       text NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dump_messages_report_idx ON dump_messages (report_id, created_at);

COMMIT;

-- migration: 0012_drop_provenance.sql
BEGIN;

DROP VIEW public_schedules;
DROP VIEW public_facilities;
DROP VIEW public_item_rules;

ALTER TABLE zip_codes DROP CONSTRAINT verified_needs_source, DROP COLUMN source_url, DROP COLUMN last_verified;
ALTER TABLE collection_schedules DROP CONSTRAINT verified_needs_source, DROP COLUMN source_url, DROP COLUMN last_verified;
ALTER TABLE facilities DROP CONSTRAINT verified_needs_source, DROP COLUMN source_url, DROP COLUMN last_verified;
ALTER TABLE item_rules DROP CONSTRAINT verified_needs_source, DROP COLUMN source_url, DROP COLUMN last_verified, DROP COLUMN evidence;
ALTER TABLE items DROP COLUMN likely_resin, DROP COLUMN es_reviewed;

CREATE VIEW public_schedules AS
  SELECT s.* FROM collection_schedules s
  JOIN regions g ON g.id = s.region_id AND g.published
  WHERE s.status = 'verified';

CREATE VIEW public_facilities AS
  SELECT f.* FROM facilities f
  JOIN regions g ON g.id = f.region_id AND g.published
  WHERE f.status = 'verified';

CREATE VIEW public_item_rules AS
  SELECT r.item_id, r.region_id, r.rule, r.note_en, r.note_es, r.facility_key
  FROM item_rules r
  WHERE r.status = 'verified';

COMMIT;
