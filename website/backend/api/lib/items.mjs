import { jsonWithEtag, notFound, badRequest, validId } from './http.mjs';
import { CHECK_WITH_TOWN } from './strings.mjs';

export function resolveRule(item, chain, facilitiesByKey) {
  for (let i = 0; i < chain.length; i++) {
    const region = chain[i];
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
