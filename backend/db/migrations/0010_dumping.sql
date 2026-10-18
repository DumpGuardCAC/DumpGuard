-- Illegal dumping reports from residents, with an optional photo (EXIF removed by the API before it is stored).
-- Exact coordinates, photos and descriptions are staff-only. The public map only gets coarse cells with 3 or more reports.
-- A resident tracks a report with the code they were given at submission; there are no accounts and no contact details.
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
