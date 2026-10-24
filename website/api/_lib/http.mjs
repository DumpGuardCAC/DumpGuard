import { createHash } from 'node:crypto';

export const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, s-maxage=3600', ...extra },
  });

export function jsonWithEtag(request, body, { maxAge = 300, sMaxAge = 3600 } = {}) {
  const text = JSON.stringify(body);
  const etag = `"${createHash('sha1').update(text).digest('hex').slice(0, 20)}"`;
  const headers = {
    etag,
    'cache-control': `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=86400`,
  };
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
  return new Response(text, { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
}

export const noStoreJson = (body, status = 200, extra = {}) => json(body, status, { 'cache-control': 'no-store', ...extra });

export const notFound = (error, extra = {}) => json({ error, ...extra }, 404, { 'cache-control': 'public, s-maxage=60' });
export const badRequest = (error, extra = {}) => noStoreJson({ error, ...extra }, 400);

const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const validId = (s) => typeof s === 'string' && ID_RE.test(s);

export async function readJson(request, maxBytes) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > maxBytes) return { error: noStoreJson({ error: 'too_large' }, 413) };
  let body = null;
  try { body = JSON.parse(raw); } catch {}
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: noStoreJson({ error: 'invalid_json' }, 400) };
  return { body };
}
export const readBody = async (request) => {
  try { return JSON.parse(await request.text()); } catch { return undefined; }
};
export const isJson = (request) => (request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json');
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const hourStart = (now) => new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000).toISOString();
export const clientKey = (request, salt, scope) =>
  createHash('sha256').update(`${salt}|${scope}|${request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'}`).digest('hex');
export const bad = (field, message) => noStoreJson({ error: 'invalid_request', field, message }, 400);
