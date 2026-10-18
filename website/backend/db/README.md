# DumpGuard database

Postgres schema for Neon, plain SQL migrations, and a seed script that loads `data/items_db.json`.

## Run it

```
cd website/backend/db
npm install
set DATABASE_URL_UNPOOLED=postgres://...   (the DIRECT Neon URL, no -pooler in the host)
node migrate.mjs
node seed.mjs
node publish.mjs            # towns stay hidden until you publish them
```

`seed.mjs` is idempotent. Re-run it after `python data/build_items_db.py`.
The app itself should use the pooled URL (`DATABASE_URL`) at runtime.

## Tables

| Table | Purpose |
| --- | --- |
| regions | state, counties, towns. Towns have `published = false` until their schedule and facility data are verified |
| zip_codes | ZIP to town. Empty so far, needs real data |
| items, item_aliases | the item database |
| item_rules | per-region rules. `verified` rows must have source_url and last_verified (enforced by a CHECK) |
| collection_schedules | pickup schedules per town, stream and area (`area_key` like `rs-6`, `zone-1a`), with `rrule`, `dtstart` and holiday `overrides`. Edison recycling and Asbury Park trash/recycling/bulk are entered; regenerate with `data/build_edison_recycling.py` and `data/build_asburypark_schedule.py` |
| facilities | drop-off directory, 7 entries from `data/towns.json`, each with a stable `key` that item rules point at |
| bulk_requests | DEMO requests. `is_demo` is forced true, email format checked, expires after 90 days |
| dump_reports, dump_photos | illegal dumping reports and optional photos (JPEG, metadata stripped). Staff-only details; the public map gets coarse cells with 3+ reports. Resolved reports purge after 180 days, all after a year |
| rate_limits | fixed-window counters keyed by a hash, never a raw IP |

The public API should read the `public_*` views, which return verified rows only.
Call `SELECT purge_expired();` on a schedule (Vercel cron) to enforce the 90-day retention.

## Tested

Migration and seed run clean twice on Postgres 17 (local Docker): 240 items, 594 aliases, 196 rules (all verified, all visible through `public_item_rules`). Constraints reject unverified-as-verified rows, non-demo requests, bad emails and malformed regions. Not yet run on a real Neon project.
