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
