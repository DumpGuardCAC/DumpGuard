-- Schedule detail needed for per-section / per-zone calendars and .ics export.
--   area_key  machine key the API matches on after the user picks a section/zone ('rs-6', 'zone-1a')
--   dtstart   first occurrence of the rrule (rrule alone cannot express "every other week from X")
--   overrides holiday moves: [{"date": original, "to": new or null, "reason": text}]

BEGIN;

ALTER TABLE collection_schedules
  ADD COLUMN area_key  text NOT NULL DEFAULT '',
  ADD COLUMN dtstart   date,
  ADD COLUMN overrides jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(overrides) = 'array');

-- Replace the view so it exposes the new columns (SELECT s.* is expanded when the view is created).
DROP VIEW public_schedules;
CREATE VIEW public_schedules AS
  SELECT s.* FROM collection_schedules s
  JOIN regions g ON g.id = s.region_id AND g.published
  WHERE s.status = 'verified';

COMMIT;
