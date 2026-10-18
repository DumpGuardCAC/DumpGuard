-- One-off pickup dates for programs that are not a repeating rule (brush, leaf and Christmas tree days by street zone).
--   dates  [{"date": "2026-04-01", "label": "Brush"}], used when rrule is null
BEGIN;

ALTER TABLE collection_schedules
  ADD COLUMN dates jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(dates) = 'array');

DROP VIEW public_schedules;
CREATE VIEW public_schedules AS
  SELECT s.* FROM collection_schedules s
  JOIN regions g ON g.id = s.region_id AND g.published
  WHERE s.status = 'verified';

COMMIT;
