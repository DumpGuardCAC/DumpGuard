-- Short-notice announcements (weather cancellations, plant closures). Written by an admin through the API;
-- region_id NULL means every town.
BEGIN;

CREATE TABLE announcements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id  text REFERENCES regions(id) ON DELETE CASCADE,
  message_en text NOT NULL CHECK (length(message_en) BETWEEN 1 AND 300),
  message_es text NOT NULL DEFAULT '' CHECK (length(message_es) <= 300),
  source_url text,
  starts_on  date NOT NULL DEFAULT current_date,
  ends_on    date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on AND ends_on <= starts_on + 60)
);
CREATE INDEX announcements_window_idx ON announcements (ends_on, starts_on);

CREATE OR REPLACE FUNCTION purge_expired() RETURNS void LANGUAGE sql AS $$
  DELETE FROM bulk_requests WHERE expires_at < now();
  DELETE FROM rate_limits WHERE window_start < now() - interval '1 day';
  DELETE FROM push_subscriptions WHERE expires_at < now() OR failures >= 5;
  DELETE FROM announcements WHERE ends_on < current_date - 30;
$$;

COMMIT;
