# DumpGuard

Help for New Jersey residents sorting waste and recycling, built for the Congressional App Challenge (NJ-06).

## Layout

- `model/` the camera model
  - `training/` training, evaluation and export scripts, plus `MODEL_CARD.md`
  - `weights/` trained Keras weights (`best.weights.h5`). `python training/export.py weights/best.weights.h5 <outdir>` makes the TensorFlow.js version
- `website/` everything that ships to users
  - `index.html`, `css/`, `js/` the static web app. `js/dumpguard-api.js` talks to the backend, `dumpguard-report.js` is the dumping report form, `dumpguard-map.js` the community map, `dumpguard-model.js` the photo model
  - `model/` the TensorFlow.js export the page loads (photos stay on the device)
  - `backend/` Postgres schema and seed (`db/`) and the API (`api/`, plain Vercel function). See `backend/README.md`
  - `react-starter/` the unused Create React App scaffold from the first commit
- Root: `data/` the verified items and town data the backend is seeded from, with the build scripts; `spec.md`; this file

Run the site and API together locally: `cd website/backend/api && DATABASE_URL=... node scripts/dev-server.mjs`.
