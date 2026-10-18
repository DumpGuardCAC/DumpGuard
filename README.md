# DumpGuard

Help for New Jersey residents sorting waste and recycling, built for the Congressional App Challenge (NJ-06).

- `src/` web app (static pages: `index.html`, `css/styles.css`, `js/`). `js/dumpguard-api.js` talks to the backend, `dumpguard-report.js` is the dumping report form, `dumpguard-map.js` the community map, `dumpguard-model.js` the photo model. `model/` is the TensorFlow.js export of the camera model (photos stay on the device).
- `backend/` Postgres schema and seed (`db/`) and the API (`api/`, plain Vercel function). See `backend/README.md`.
- `data/` the verified items and town data the backend is seeded from, with the build scripts.
- `training/` the camera model.
