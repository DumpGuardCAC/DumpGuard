# Open items for Vedant (nothing here is committed)

## Needs you (I cannot do these)
1. **Create the Neon project** (I cannot create accounts). Then give me, or set on Vercel yourself, `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct). Then run, from `backend/db`: `node migrate.mjs && node seed.mjs && node publish.mjs edison woodbridge new-brunswick long-branch asbury-park`.
2. **Set Vercel env vars** on project `api` (dagavedants-projects): `DATABASE_URL`, `RATE_LIMIT_SALT` (long random string), `CRON_SECRET`, optional `ALLOWED_ORIGIN` (the PWA origin, to allow POST). Then `vercel deploy --prod` in `backend/api`.
3. **Deployment Protection** is on by default for the Vercel project, so the URL asks for a Vercel login. Turn it off in project settings if the PWA must call it publicly. That is a security setting, so it is yours.

## Decisions
4. **Towns to publish:** all 5 have verified schedules, but nothing is public until `publish.mjs` is run.
5. **ZIP to town mapping is unverified for all 14 ZIP rows** (Hopelawn and Menlo Park Terrace have no source). The app always asks the user to confirm the town. OK?
6. **Edison garbage, Thanksgiving week** is ambiguous on the printed calendar and flagged in the data.
7. **New Brunswick zones and leaf zones** exist only on a printed map, so the user must pick. Acceptable?
8. **Woodbridge bulk pickup** lists no fee or item limit; the API says none. Call 732-738-1311 ext. 3600 to ask?
9. **Rate limiting** is only on bulk-request. Rely on CDN caching for reads?

## Known gaps
10. Spanish is machine-drafted and served without review, as you asked. Area labels and one-off date labels are English only.
11. Middlesex HHW dates are 2026 only and go stale after Nov 15, 2026.
12. Not readable from here: monmouthcountynj.gov (403), Middlesex shredding flyer PDF, NJ battery and bag-ban state pages. Nothing verified depends on them.
13. Everything was tested on local Postgres 17, never on a real Neon project.

## Answered
- Client vs server resolution: use server side (`/items?town=<id>`). Smaller, one source of truth, CDN cached per town. Raw bundle (`/items` with no town) stays for offline.
- UI strings: `GET /api/v1/meta`, or `resolved.message` / `notice` in responses.
