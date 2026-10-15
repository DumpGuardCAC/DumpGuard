-- Web push pickup reminders. Stores only what is needed to send: the push endpoint and keys, the town and the
-- section the person picked, and a language. No name, email, IP or user agent.
BEGIN;

CREATE TABLE push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint     text NOT NULL UNIQUE CHECK (endpoint ~ '^https://' AND length(endpoint) <= 1000),
  p256dh       text NOT NULL CHECK (length(p256dh) BETWEEN 1 AND 200),
  auth         text NOT NULL CHECK (length(auth) BETWEEN 1 AND 100),
  region_id    text NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  area_keys    text[] NOT NULL DEFAULT '{}',
  streams      stream_t[] NOT NULL DEFAULT '{trash,recycling,bulk,yard}',
  lang         text NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'es')),
  last_sent_on date,
  failures     integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL DEFAULT now() + interval '1 year'
);
CREATE INDEX push_subscriptions_region_idx ON push_subscriptions (region_id);

CREATE OR REPLACE FUNCTION purge_expired() RETURNS void LANGUAGE sql AS $$
  DELETE FROM bulk_requests WHERE expires_at < now();
  DELETE FROM rate_limits WHERE window_start < now() - interval '1 day';
  DELETE FROM push_subscriptions WHERE expires_at < now() OR failures >= 5;
$$;

COMMIT;
