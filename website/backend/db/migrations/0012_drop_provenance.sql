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
