// Copies data files the deployed API needs from the repo's data/ into ./data (Vercel only deploys this folder).
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, '..', '..', '..', '..', 'data');
const dst = path.join(here, '..', 'data');
mkdirSync(dst, { recursive: true });
for (const f of ['woodbridge_street_index.json']) {
  copyFileSync(path.join(src, f), path.join(dst, f));
  console.log('copied', f);
}
