import { createHash, timingSafeEqual } from 'node:crypto';
import { clientKey, hourStart, noStoreJson } from './http.mjs';

const AUTH_FAILS_PER_HOUR = 10;

export function bearerMatches(header, secret) {
  if (!secret) return false;
  const a = createHash('sha256').update(header ?? '').digest();
  const b = createHash('sha256').update(`Bearer ${secret}`).digest();
  return timingSafeEqual(a, b);
}

function authorized(request, token = process.env.ADMIN_TOKEN) {
  if (!token || token.length < 16) return false;
  return bearerMatches(request.headers.get('authorization') ?? '', token);
}

export async function staffOnly(request, repo, token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '') {
  if (authorized(request, token)) return null;
  const limited = (await repo.hit(clientKey(request, salt, 'staff-auth'), hourStart(now))) > AUTH_FAILS_PER_HOUR;
  return noStoreJson({ error: limited ? 'rate_limited' : 'unauthorized' }, limited ? 429 : 401);
}
