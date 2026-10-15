# Open items for Vedant

## Needs you (I cannot do these)
1. **Create the Neon project** (I cannot create accounts). Then give me, or set on Vercel yourself, `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct). Then run, from `backend/db`: `node migrate.mjs && node seed.mjs && node publish.mjs edison woodbridge new-brunswick long-branch asbury-park`.
2. **Set Vercel env vars** on project `api` (dagavedants-projects), see `api/.env.example`: `DATABASE_URL`, `RATE_LIMIT_SALT` and `CRON_SECRET` (long random strings), `ALLOWED_ORIGIN` (the PWA origin, needed for browser POSTs), `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` (run `node scripts/vapid.mjs` in `backend/api`), and `ADMIN_TOKEN` (16+ random characters; you need to know this one, it guards alerts and the report queue). Then `vercel deploy --prod` in `backend/api`. The production deployment predates search, facility distance, push, alerts, materials, stats and reports, so it needs this redeploy.
3. **Deployment Protection** is on by default for the Vercel project, so the URL asks for a Vercel login. Turn it off in project settings if the PWA must call it publicly. That is a security setting, so it is yours.

## Decisions
4. **Towns to publish:** all 5 have verified schedules, but nothing is public until `publish.mjs` is run.
5. **ZIP to town mapping is unverified for all 14 ZIP rows** (Hopelawn and Menlo Park Terrace have no source). The app always asks the user to confirm the town. OK?
6. **Edison garbage, Thanksgiving week** is ambiguous on the printed calendar and flagged in the data.
7. **New Brunswick zones and leaf zones** exist only on a printed map, so the user must pick. Acceptable?
8. **Woodbridge bulk pickup** lists no fee or item limit; the API says none. Call 732-738-1311 ext. 3600 to ask?
9. **Rate limiting** covers every write endpoint (bulk request, push subscribe, events, reports). Reads rely on CDN caching.

## Known gaps
10. Spanish is machine-drafted and served without review, as you asked. Section labels, holiday reasons and one-off date labels now have Spanish (`label_es`, `description_es`, `reason_es`, `label_es` on dates); a test fails if a new label has no translation.
11. Middlesex HHW dates are 2026 only and go stale after Nov 15, 2026. `python data/check_sources.py` flags this and any changed or stale source; run it monthly and after it reports CHANGED, re-read the page, fix the build script, then `--update`.
12. Not readable from here: monmouthcountynj.gov (403), Middlesex shredding flyer PDF, NJ battery and bag-ban state pages. Nothing verified depends on them.
13. Everything was tested on local Postgres 17, never on a real Neon project.

## New features (all in the README endpoint table)
- Needs the PWA: the frontend must register a service worker for push, call `/push/key` + `/push/subscribe`, send `POST /events` after each sort, show `estimated_pounds_diverted` labelled as an estimate, and add a "Report a wrong answer" button on item, schedule and facility screens (`POST /reports`).
- Camera model: call `/materials/<class>?town=` with the predicted class; show `consensus` when present, otherwise list `items` and ask which one it is.
- Calendar: after the user picks town and section, `/schedule/:zip` returns `calendar.webcal` for a one-tap subscription.
- Review the report queue: `GET /admin/reports` with the bearer token, then `POST /admin/reports/resolve`.

## Answered
- Client vs server resolution: use server side (`/items?town=<id>`). Smaller, one source of truth, CDN cached per town. Raw bundle (`/items` with no town) stays for offline.
- UI strings: `GET /api/v1/meta`, or `resolved.message` / `notice` in responses.
