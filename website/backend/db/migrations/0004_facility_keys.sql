-- Stable keys for facilities (from data/towns.json) so an item rule can point at the place it sends people to.
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
