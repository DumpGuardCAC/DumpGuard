-- DumpGuard schema v1. Run on a DIRECT (non-pooled) Neon connection.
-- Rule: public queries only ever read rows with status = 'verified'.

BEGIN;

CREATE TYPE material_t   AS ENUM ('rigid_plastic', 'soft_plastic_foam', 'cardboard_paper', 'metal', 'glass', 'ewaste_hazard', 'other');
CREATE TYPE rule_t       AS ENUM ('recycling', 'trash', 'special_dropoff');
CREATE TYPE status_t     AS ENUM ('needs_verification', 'verified');
CREATE TYPE region_kind_t AS ENUM ('state', 'county', 'town');
CREATE TYPE stream_t     AS ENUM ('trash', 'recycling', 'bulk', 'yard', 'other');

-- Regions: the state, counties, and the towns we cover. Rules attach to any of them.
CREATE TABLE regions (
  id          text PRIMARY KEY,                       -- 'nj', 'middlesex', 'edison'
  kind        region_kind_t NOT NULL,
  name        text NOT NULL,
  county_id   text REFERENCES regions(id),            -- towns only
  published   boolean NOT NULL DEFAULT false,         -- towns are hidden until their data is verified
  CHECK ((kind = 'town') = (county_id IS NOT NULL))
);

-- A mailing ZIP is not a municipality: one ZIP can span several towns and a town can have several ZIPs.
-- The app resolves ZIP -> candidate towns, then asks the user to confirm.
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

-- Collection schedules. One row per town per stream. Filled by hand from town sources.
CREATE TABLE collection_schedules (
  id             bigserial PRIMARY KEY,
  region_id      text NOT NULL REFERENCES regions(id),
  stream         stream_t NOT NULL,
  weekday        smallint CHECK (weekday BETWEEN 0 AND 6),     -- 0 = Sunday
  week_pattern   text NOT NULL DEFAULT 'weekly',               -- weekly, 1st_3rd, even, odd, custom
  area_note      text NOT NULL DEFAULT '',                     -- e.g. 'Zone A' or street range
  rrule          text,                                         -- optional RFC 5545 RRULE for .ics export
  notes_en       text NOT NULL DEFAULT '',
  notes_es       text NOT NULL DEFAULT '',
  status         status_t NOT NULL DEFAULT 'needs_verification',
  source_url     text,
  last_verified  date,
  CONSTRAINT verified_needs_source CHECK (status <> 'verified' OR (source_url IS NOT NULL AND last_verified IS NOT NULL))
);
CREATE INDEX collection_schedules_region_idx ON collection_schedules (region_id);

-- Drop-off directory (HHW, e-waste, recycling centers).
CREATE TABLE facilities (
  id             bigserial PRIMARY KEY,
  region_id      text NOT NULL REFERENCES regions(id),         -- town or county that runs it
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

-- DEMO bulk pickup requests. Not sent to any municipality.
-- PII: contact email only. Rows are deleted after 90 days (see purge function).
CREATE TABLE bulk_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '90 days',
  region_id       text NOT NULL REFERENCES regions(id),
  contact_email   text NOT NULL CHECK (length(contact_email) <= 254 AND contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  description     text NOT NULL CHECK (length(description) BETWEEN 1 AND 1000),
  preferred_date  date,
  is_demo         boolean NOT NULL DEFAULT true CHECK (is_demo)  -- no real submissions until a municipality agrees
);
CREATE INDEX bulk_requests_expires_idx ON bulk_requests (expires_at);

-- Fixed-window rate limiting for POST endpoints. key = hash of IP + route, never the raw IP.
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

-- What the public API reads. Unverified rows never leave the database.
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
