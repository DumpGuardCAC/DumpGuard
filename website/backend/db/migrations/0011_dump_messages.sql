-- Messages between government staff and the (anonymous) person who filed a dumping report.
-- A thread belongs to a report and is reached with the report's tracking code; no contact details are stored.
BEGIN;

CREATE TABLE dump_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  uuid NOT NULL REFERENCES dump_reports(id) ON DELETE CASCADE,
  from_staff boolean NOT NULL,
  body       text NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dump_messages_report_idx ON dump_messages (report_id, created_at);

COMMIT;
