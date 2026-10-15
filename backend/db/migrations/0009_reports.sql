-- "Report a wrong answer" queue. Reviewed by a human through the admin API; nothing here changes a rule by itself.
-- No contact details are collected. Resolved/dismissed reports are purged after 90 days, open ones after a year.
BEGIN;

CREATE TYPE report_kind_t AS ENUM ('item_rule', 'schedule', 'facility', 'scan', 'other');
CREATE TYPE report_status_t AS ENUM ('open', 'resolved', 'dismissed');

CREATE TABLE reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        report_kind_t NOT NULL,
  item_id     text,
  region_id   text REFERENCES regions(id) ON DELETE SET NULL,
  facility_key text,
  message     text NOT NULL CHECK (length(message) BETWEEN 3 AND 500),
  status      report_status_t NOT NULL DEFAULT 'open',
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX reports_status_idx ON reports (status, created_at);

CREATE OR REPLACE FUNCTION purge_expired() RETURNS void LANGUAGE sql AS $$
  DELETE FROM bulk_requests WHERE expires_at < now();
  DELETE FROM rate_limits WHERE window_start < now() - interval '1 day';
  DELETE FROM push_subscriptions WHERE expires_at < now() OR failures >= 5;
  DELETE FROM announcements WHERE ends_on < current_date - 30;
  DELETE FROM reports WHERE (status <> 'open' AND resolved_at < now() - interval '90 days')
                         OR created_at < now() - interval '1 year';
$$;

COMMIT;
