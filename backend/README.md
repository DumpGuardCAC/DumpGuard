# DumpGuard backend

- `db/` Neon Postgres: plain SQL migrations 0001-0004, `seed.mjs` (loads `data/items_db.json` and `data/towns.json`), `publish.mjs` (the only switch that makes a town public).
- `api/` plain Vercel function (no framework): `api/index.mjs` runs `lib/router.mjs`, a fetch-style router. Handlers in `api/lib` take a repo, so `node --test` runs them without a database.

## Endpoints (all under `/api/v1`)

| Route | What |
| --- | --- |
| `GET /health` | DB ping |
| `GET /meta` | exact UI strings: `check_with_town` ("Double check with your town") and `bulk_demo_notice` (EN/ES) |
| `GET /towns` | published towns with ZIPs |
| `GET /schedule/:zip` | `?town=` `?area=` (repeat per group) `?format=ics`. Returns `needs: town/area` until chosen |
| `GET /search` | `?q=` `?town=` `?limit=`: English and Spanish names and aliases, accent-insensitive, typo-tolerant, per-town resolved rule |
| `GET /items` | all items with raw verified rules + facility list. `?town=<id>` resolves a rule per item (town > county > state > default). When only the default exists, `resolved.check_local` is true and `resolved.message` is "Double check with your town" (EN/ES). Prefer `?town=`: the server resolves it, the response is small and CDN cached per town; the raw bundle is for offline use |
| `GET /materials/:material` | `?town=`. Turns the camera model's class (`rigid_plastic`, ... ) into its items with resolved rules, rule counts and a `consensus` only when verified rules agree. `no_object` answers 404 with a message |
| `GET /items/:id` | one item, same options |
| `GET /facilities` | `?town=` `?zip=` or `?lat=&lng=` (all sites, nearest first), optional `?material=` `?radius_km=`. Each site has `open_now`, `next_open`, `distance_km` |
| `GET /woodbridge/streets?q=` | street (optionally with house number) to pickup-zone key for `?area=zone:...` |
| `POST /bulk-request` | DEMO only, 5 per hour per hashed IP, 90-day retention. Response includes `notice`: "Currently, bulk pickup is demo until permission is acquired from townships" (the app must show it) |
| `GET /alerts` | `?town=` `?area=` (repeat) `?days=`: active announcements plus holiday shifts already in the verified schedule. Without `area`, shifts for every section of the town come back |
| `POST/DELETE /admin/alerts` | Bearer `ADMIN_TOKEN` (16+ chars; unset disables it). Weather cancellations and similar, 60 days max; included in push reminders |
| `GET /push/key` | public VAPID key for `pushManager.subscribe` |
| `POST /push/subscribe` | `{subscription, town, areas?, streams?, lang?}`: nightly reminder the evening before a pickup (6 pm Eastern). Validated against the town's real schedule |
| `POST /push/unsubscribe` | `{endpoint}` |
| `GET /cron/reminders` | Bearer `CRON_SECRET`; Vercel cron daily 22:00 UTC |
| `GET /cron/purge` | Bearer `CRON_SECRET`; Vercel cron daily 05:00 UTC |

Only verified rows of published towns are ever returned (the `public_*` views). Read endpoints send ETag and cache headers; GET is CORS-open, POST only for `ALLOWED_ORIGIN`.

## Run it

```
cd backend/db && npm install
export DATABASE_URL_UNPOOLED=postgres://...   # direct Neon URL
node migrate.mjs && node seed.mjs
node publish.mjs                     # see status
node publish.mjs edison              # publish a town

cd ../api && npm install
cp .env.example .env.local           # fill in
vercel deploy --prod                 # after env vars are set (see below)
npm run sync-data                    # after rebuilding data/woodbridge_street_index.json
npm test                             # 40 tests, no DB needed
```

Open questions for the owner are in `QUESTIONS.md`.

## Deploy (Vercel)

Deployed as project `api` under dagavedant (plain function, rewrite `/api/v1/*` to `/api`). Needs env vars `DATABASE_URL` (Neon pooled), `RATE_LIMIT_SALT`, `CRON_SECRET`, optional `ALLOWED_ORIGIN`, then a redeploy. Deployment Protection is on by default, so the URL asks for a Vercel login until it is switched off in project settings. Responses carry `s-maxage=3600` plus ETag, so Vercel's CDN caches reads.

Spanish text is machine-drafted and unreviewed; it is served as is.
