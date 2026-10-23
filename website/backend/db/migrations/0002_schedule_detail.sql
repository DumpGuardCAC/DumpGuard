
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
