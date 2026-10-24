import { CHECK_WITH_TOWN, ES } from './spanish.mjs';
import { badRequest, jsonWithEtag, notFound, validId } from './http.mjs';

export function resolveRule(item, chain, facilitiesByKey) {
  for (const region of chain) {
    const r = item.rules[region];
    if (!r) continue;
    return {
      rule: r.rule,
      level: levelOf(chain, region),
      region,
      note: r.note,
      check_local: false,
      message: null,
      facility: r.facility_key ? facilitiesByKey[r.facility_key] ?? null : null,
    };
  }
  return {
    rule: item.default_rule,
    level: 'default',
    region: null,
    note: { en: '', es: '' },
    check_local: true,
    message: CHECK_WITH_TOWN,
    facility: null,
  };
}

function levelOf(chain, region) {
  if (region === 'nj') return 'state';
  if (chain.length === 3) return region === chain[0] ? 'town' : 'county';
  return 'county';
}

export async function chainFor(repo, regionId) {
  if (!regionId) return { chain: ['nj'], region: null };
  const region = await repo.region(regionId);
  if (!region) return { chain: null, region: null };
  const chain = [region.id];
  if (region.county_id) chain.push(region.county_id);
  if (region.id !== 'nj') chain.push('nj');
  return { chain: [...new Set(chain)], region };
}

const publicItem = (it) => ({
  id: it.id,
  name: it.name,
  aliases: it.aliases,
  material: it.material,
  default_rule: it.default_rule,
  hazard: it.hazard,
  varies_by_town: it.varies_by_town,
  prep: it.prep,
});

const DISCLAIMER =
  'Rules are shown only when read from an official county or town source. Otherwise we show the common New Jersey rule and say: Double check with your town.';

export async function handleItems(request, repo) {
  const url = new URL(request.url);
  const regionParam = url.searchParams.get('town') ?? url.searchParams.get('region');
  if (regionParam !== null && !validId(regionParam)) return badRequest('invalid_region');
  const { chain, region } = await chainFor(repo, regionParam);
  if (!chain) return notFound('region_not_found', { region: regionParam });

  const { items, facilities } = await repo.itemsBundle();
  const facilitiesByKey = Object.fromEntries(facilities.map((f) => [f.key, f]));
  const body = {
    generated_for: region ? { id: region.id, name: region.name, kind: region.kind } : null,
    count: items.length,
    items: items.map((it) => ({
      ...publicItem(it),
      ...(region ? { resolved: resolveRule(it, chain, facilitiesByKey) } : { rules: it.rules }),
    })),
    facilities: region ? undefined : facilities,
    disclaimer_en: DISCLAIMER,
  };
  return jsonWithEtag(request, body);
}

export async function handleItem(request, id, repo) {
  if (!validId(id)) return badRequest('invalid_item_id');
  const url = new URL(request.url);
  const regionParam = url.searchParams.get('town') ?? url.searchParams.get('region');
  if (regionParam !== null && !validId(regionParam)) return badRequest('invalid_region');
  const { chain, region } = await chainFor(repo, regionParam);
  if (!chain) return notFound('region_not_found', { region: regionParam });

  const { items, facilities } = await repo.itemsBundle({ id });
  const it = items[0];
  if (!it) return notFound('item_not_found', { id });
  const facilitiesByKey = Object.fromEntries(facilities.map((f) => [f.key, f]));
  return jsonWithEtag(request, {
    ...publicItem(it),
    rules: it.rules,
    ...(region ? { region: { id: region.id, name: region.name }, resolved: resolveRule(it, chain, facilitiesByKey) } : {}),
  });
}

export const MATERIALS = ['rigid_plastic', 'soft_plastic_foam', 'cardboard_paper', 'metal', 'glass', 'ewaste_hazard', 'other'];
const MIN_ITEMS_FOR_CONSENSUS = 5;
const CONSENSUS_SHARE = 0.85;

function summarize(items, chain, byKey) {
  const rows = items.map((it) => ({ it, r: resolveRule(it, chain, byKey) }));
  const verified = rows.filter((x) => !x.r.check_local);
  const counts = { recycling: 0, trash: 0, special_dropoff: 0 };
  for (const x of verified) counts[x.r.rule]++;
  let consensus = null;
  if (verified.length >= MIN_ITEMS_FOR_CONSENSUS) {
    const [rule, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (n / verified.length >= CONSENSUS_SHARE) consensus = { rule, share: Math.round((n / verified.length) * 100) / 100, based_on: verified.length };
  }
  rows.sort((a, b) => Number(a.r.check_local) - Number(b.r.check_local) || Number(b.it.hazard) - Number(a.it.hazard) || a.it.name.en.localeCompare(b.it.name.en));
  return { rows, counts, consensus, verified: verified.length };
}

export async function handleMaterial(request, material, repo, { limit = 40 } = {}) {
  if (!MATERIALS.includes(material)) {
    return material === 'no_object'
      ? notFound('no_object', { message: { en: 'No item found. Point the camera at one item.', es: ES.noObject } })
      : badRequest('invalid_material', { allowed: MATERIALS });
  }
  const town = new URL(request.url).searchParams.get('town');
  if (town !== null && !validId(town)) return badRequest('invalid_region');
  const { chain, region } = await chainFor(repo, town);
  if (!chain) return notFound('region_not_found', { region: town });

  const { items, facilities } = await repo.itemsBundle();
  const byKey = Object.fromEntries(facilities.map((f) => [f.key, f]));
  const inClass = items.filter((i) => i.material === material);
  const { rows, counts, consensus, verified } = summarize(inClass, chain, byKey);
  return jsonWithEtag(request, {
    material,
    town: region ? { id: region.id, name: region.name } : null,
    item_count: inClass.length,
    verified_count: verified,
    counts,
    consensus,
    hazard: inClass.some((i) => i.hazard),
    items: rows.slice(0, limit).map(({ it, r }) => ({
      id: it.id, name: it.name, hazard: it.hazard, prep: it.prep, resolved: r,
    })),
  });
}
