// Apply SQL files in migrations/ in name order. Tracks applied files in schema_migrations.
// Usage: DATABASE_URL_UNPOOLED=... node migrate.mjs   (use the DIRECT Neon URL, not the -pooler one)
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL_UNPOOLED (preferred) or DATABASE_URL.');
  process.exit(1);
}
if (/-pooler\./.test(url)) {
  console.error('Refusing to migrate over a pooled (-pooler) connection. Use the direct URL.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (done.has(file)) continue;
    // Each file carries its own BEGIN/COMMIT.
    await client.query(readFileSync(path.join(dir, file), 'utf8'));
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    console.log('applied', file);
  }
  console.log('schema up to date');
} catch (err) {
  console.error('migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
