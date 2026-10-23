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

export const notFound = (error, extra = {}) => json({ error, ...extra }, 404, { 'cache-control': 'public, s-maxage=60' });
export const badRequest = (error, extra = {}) => json({ error, ...extra }, 400, { 'cache-control': 'no-store' });

const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const validId = (s) => typeof s === 'string' && ID_RE.test(s);
