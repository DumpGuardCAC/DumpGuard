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
