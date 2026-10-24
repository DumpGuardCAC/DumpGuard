import { badRequest, jsonWithEtag, notFound, validId } from './http.mjs';
import { MATERIALS } from './items.mjs';
import { HOURS_NOTE, openStatus } from './time.mjs';

export async function handleTowns(request, repo) {
  return jsonWithEtag(request, { towns: await repo.publishedTowns() });
}

const rad = (d) => (d * Math.PI) / 180;
function distanceKm(a, b) {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export async function handleFacilities(request, repo, { now = new Date() } = {}) {
  const url = new URL(request.url);
  const townParam = url.searchParams.get('town');
  const zip = url.searchParams.get('zip');
  const material = url.searchParams.get('material');
  const latP = url.searchParams.get('lat');
  const lngP = url.searchParams.get('lng');
  if (material !== null && !MATERIALS.includes(material)) return badRequest('invalid_material', { allowed: MATERIALS });

  let here = null;
  if (latP !== null || lngP !== null) {
    const lat = Number(latP);
    const lng = Number(lngP);
    if (latP === '' || lngP === '' || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return badRequest('invalid_location');
    }
    here = { lat, lng };
  }
  if (!townParam && !zip && !here) return badRequest('town_or_zip_required');

  let towns = null;
  let facilities;
  if (townParam || zip) {
    if (townParam) {
      if (!validId(townParam)) return badRequest('invalid_town');
      towns = [townParam];
    } else {
      if (!/^\d{5}$/.test(zip)) return badRequest('invalid_zip');
      towns = (await repo.townsForZip(zip)).map((t) => t.id);
      if (towns.length === 0) return notFound('zip_not_covered');
    }
    facilities = await repo.facilitiesForTowns(towns, material);
  } else {
    facilities = await repo.allFacilities(material);
  }

  const radius = url.searchParams.get('radius_km') ? Number(url.searchParams.get('radius_km')) : null;
  let out = facilities.map(({ hours_struct: hs, ...f }) => ({
    ...f,
    ...(here && f.lat != null ? { distance_km: Math.round(distanceKm(here, f) * 10) / 10 } : {}),
    ...openStatus(hs, now),
    hours_note: HOURS_NOTE,
  }));
  if (here) {
    if (radius !== null && Number.isFinite(radius)) out = out.filter((f) => f.distance_km !== undefined && f.distance_km <= radius);
    out.sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));
  }
  return jsonWithEtag(request, { towns, count: out.length, facilities: out }, { maxAge: 60, sMaxAge: 300 });
}

const ABBREV = [
  [/\b(avenue|ave)\b/g, 'ave'], [/\b(street|st)\b/g, 'st'], [/\b(road|rd)\b/g, 'rd'], [/\b(place|pl)\b/g, 'pl'],
  [/\b(drive|dr)\b/g, 'dr'], [/\b(court|ct)\b/g, 'ct'], [/\b(lane|ln)\b/g, 'ln'], [/\b(terrace|ter)\b/g, 'ter'],
  [/\b(boulevard|blvd)\b/g, 'blvd'], [/\b(parkway|pkwy)\b/g, 'pkwy'],
];
function normStreet(s) {
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
  return { entries, year: index.year };
}

export function handleWoodbridgeStreets(request, lookup) {
  const q = new URL(request.url).searchParams.get('q') ?? '';
  if (q.trim().length < 3 || q.length > 80) return badRequest('query_length', { message: 'q must be 3 to 80 characters.' });
  const n = normStreet(q.replace(/^\d+\s+/, ''));
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
    year: lookup.year,
  });
}
