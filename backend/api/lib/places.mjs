// Towns, facilities, Woodbridge street lookup, health.
//   GET /api/v1/towns                            published towns with their ZIPs
//   GET /api/v1/facilities?town=|zip=&material=  drop-off sites run by the town or its county
//   GET /api/v1/woodbridge/streets?q=...         street -> recycling-calendar zone(s)
//   GET /api/v1/health
import { json, jsonWithEtag, badRequest, notFound, validId } from './http.mjs';

const MATERIALS = new Set(['rigid_plastic', 'soft_plastic_foam', 'cardboard_paper', 'metal', 'glass', 'ewaste_hazard', 'other']);

export async function handleTowns(request, repo) {
  return jsonWithEtag(request, { towns: await repo.publishedTowns() });
}

export async function handleFacilities(request, repo) {
  const url = new URL(request.url);
  const townParam = url.searchParams.get('town');
  const zip = url.searchParams.get('zip');
  const material = url.searchParams.get('material');
  if (material !== null && !MATERIALS.has(material)) return badRequest('invalid_material', { allowed: [...MATERIALS] });
  if (!townParam && !zip) return badRequest('town_or_zip_required');

  let towns;
  if (townParam) {
    if (!validId(townParam)) return badRequest('invalid_town');
    towns = [townParam];
  } else {
    if (!/^\d{5}$/.test(zip)) return badRequest('invalid_zip');
    towns = (await repo.townsForZip(zip)).map((t) => t.id);
    if (towns.length === 0) return notFound('zip_not_covered');
  }
  const facilities = await repo.facilitiesForTowns(towns, material);
  return jsonWithEtag(request, { towns, count: facilities.length, facilities });
}

// ---- Woodbridge street index ----
// A street name alone can be ambiguous (one street can cross zones), so every matching zone comes back with the
// house-number range from the printed index when there is one.
const ABBREV = [
  [/\b(avenue|ave)\b/g, 'ave'], [/\b(street|st)\b/g, 'st'], [/\b(road|rd)\b/g, 'rd'], [/\b(place|pl)\b/g, 'pl'],
  [/\b(drive|dr)\b/g, 'dr'], [/\b(court|ct)\b/g, 'ct'], [/\b(lane|ln)\b/g, 'ln'], [/\b(terrace|ter)\b/g, 'ter'],
  [/\b(boulevard|blvd)\b/g, 'blvd'], [/\b(parkway|pkwy)\b/g, 'pkwy'],
];
export function normStreet(s) {
  let t = s.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[.,']/g, '');
  for (const [re, to] of ABBREV) t = t.replace(re, to);
  return t.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function buildStreetLookup(index) {
  const entries = [];
  for (const [zoneKey, z] of Object.entries(index.zones)) {
    for (const raw of z.streets) {
      entries.push({
        norm: normStreet(raw),
        raw,
        range: raw.match(/\((.*)\)\s*$/)?.[1] ?? null,
        zone: zoneKey,
        towns: z.towns,
      });
    }
  }
  return { entries, year: index.year, source: index.source, last_verified: index.last_verified };
}

export function handleWoodbridgeStreets(request, lookup) {
  const q = new URL(request.url).searchParams.get('q') ?? '';
  if (q.trim().length < 3 || q.length > 80) return badRequest('query_length', { message: 'q must be 3 to 80 characters.' });
  const n = normStreet(q.replace(/^\d+\s+/, '')); // tolerate a leading house number
  if (!n) return badRequest('query_length');
  const exact = lookup.entries.filter((e) => e.norm === n);
  const use = exact.length ? exact : lookup.entries.filter((e) => e.norm.startsWith(n)).slice(0, 25);
  return jsonWithEtag(request, {
    query: q,
    count: use.length,
    matches: use.map((e) => ({
      street: e.raw,
      house_numbers: e.range,
      area_key: `zone:${e.zone}`,
      towns: e.towns,
    })),
    note_en: 'Pass area_key as ?area= to the Woodbridge schedule. If a street appears in several zones, use the house-number range.',
    source_url: lookup.source,
    year: lookup.year,
    last_verified: lookup.last_verified,
  });
}

export async function handleHealth(repo) {
  try {
    const ok = await repo.ping();
    return json({ ok, time: new Date().toISOString() }, ok ? 200 : 503, { 'cache-control': 'no-store' });
  } catch {
    return json({ ok: false }, 503, { 'cache-control': 'no-store' });
  }
}
