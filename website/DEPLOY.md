# Deploying DumpGuard (one Vercel project)

`website/` is the whole project: the static site is served from this folder and `api/index.mjs` runs the API at `/api/v1/...`
on the same origin, so no CORS and no API address to configure. The Vercel project is the existing one named `api`
(team `dagavedants-projects`), already linked in `website/.vercel` and already holding `ADMIN_TOKEN`, `CRON_SECRET`,
`RATE_LIMIT_SALT` and the `VAPID_*` keys. Only the database URLs are missing.

## 1. Create the Neon database (you, in the browser)

1. Go to https://neon.com and sign up or log in (GitHub login is fine).
2. Click **Create project**.
   - Name: `dumpguard`
   - Postgres version: 17 (or the default)
   - Cloud and region: **AWS, US East 1 (N. Virginia)**. Vercel functions run in `iad1` by default, so this keeps queries fast.
   - Leave the default branch (`main`) and database (`neondb`) as they are.
3. When the project opens, click **Connect** (top of the dashboard).
4. Copy two connection strings. The only difference is the `-pooler` part of the host name:
   - Turn **Connection pooling ON**. Copy the string. It looks like
     `postgresql://neondb_owner:...@ep-xxxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require`.
     This is `DATABASE_URL` (the app uses it).
   - Turn **Connection pooling OFF**. Copy the string. The host has no `-pooler`. This is `DATABASE_URL_UNPOOLED`
     (migrations use it).
5. Keep both strings somewhere private. They contain the database password. Never commit them or paste them in chat.

## 2. Create the tables and load the data (your computer)

PowerShell, from the repo root:

```
cd website\backend\db
npm install
$env:DATABASE_URL_UNPOOLED = "<the direct string from step 1.4>"
node migrate.mjs
node seed.mjs
node publish.mjs
```

- `migrate.mjs` should print `applied 0001...` through `applied 0010_dumping.sql`, then `schema up to date`.
- `seed.mjs` should print about `seeded 8 regions, 240 items, ...`. It is safe to run again.
- `publish.mjs` with no arguments lists towns and how much verified data each has. Nothing is public yet.
- Publish only towns you have checked: `node publish.mjs edison woodbridge new-brunswick`. A town with no verified schedule is refused.
  Hide one again with `node publish.mjs --off <town>`.

## 3. Add the database URLs to Vercel

Dashboard way: https://vercel.com -> project **api** -> **Settings** -> **Environment Variables** -> add each name below, paste the
value, tick **Production** (and Preview if you want), save.

CLI way (from `website/`, paste the value when asked):

```
cd website
vercel env add DATABASE_URL production
vercel env add DATABASE_URL_UNPOOLED production
```

- `DATABASE_URL` = the **pooled** string. `DATABASE_URL_UNPOOLED` = the direct one.
- Do not set `ALLOWED_ORIGIN`. The site and API share one origin, so it is not needed.
- Check the full list with `vercel env ls production`. It should show `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `ADMIN_TOKEN`,
  `CRON_SECRET`, `RATE_LIMIT_SALT` and the `VAPID_*` names.

## 4. Turn off Deployment Protection for production

Vercel -> project **api** -> **Settings** -> **Deployment Protection**. Set **Vercel Authentication** to
**Only Preview Deployments** (or off). Otherwise visitors hit a Vercel login page. Save.

## 5. Deploy

```
cd website
vercel --prod
```

It prints a production URL (`https://api-....vercel.app`, or your alias). The first build installs `pg` and `web-push` from
`website/package.json`.

## 6. Check that it works

Replace `<url>` with the production URL:

```
curl https://<url>/api/v1/health
curl https://<url>/api/v1/towns
curl "https://<url>/api/v1/search?q=battery&town=edison"
```

- `health` should say the database is reachable. `towns` should list the towns you published in step 2.
- Open `https://<url>/` in a browser. Try Identify (search, then a photo), the pickup-day ZIP lookup (08817), Report (submit one),
  and Map.
- Staff view: on the Map page click **Government sign-in** and paste the `ADMIN_TOKEN` value. It is in
  `website/backend/api/.env.local` (never committed) and in Vercel's environment variables. You should see your report, be able to
  open its photo and change its status.
- The map only draws an area once 3 or more reports are close together, so a single test report shows in the staff view and the
  town counts, not as a circle on the public map.

## 7. Optional follow-ups

- **Auto deploys:** Vercel -> project **api** -> **Settings** -> **Git** -> connect `DumpGuardCAC/DumpGuard`, and set
  **Root Directory** to `website`. Pushes to `main` then deploy by themselves.
- **Rename the project** to `dumpguard` (Settings -> General -> Project Name) and add a **custom domain** under Settings -> Domains.
- **Crons** (daily purge and reminders) are in `vercel.json` and start with the first production deploy. The Hobby plan allows
  daily schedules.
- **Later schema changes:** add a new `backend/db/migrations/00NN_*.sql`, then run `node migrate.mjs` with
  `DATABASE_URL_UNPOOLED` set, before or right after deploying code that needs it.
- **Source freshness:** run `python data/check_sources.py` monthly; republish towns only after re-verifying.
