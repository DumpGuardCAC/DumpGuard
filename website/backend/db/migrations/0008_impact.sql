-- Anonymous impact counters: one row per day / town / material / outcome with a count. No user, device or IP
-- is stored, so there is nothing to purge and nothing that can identify a person.
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
