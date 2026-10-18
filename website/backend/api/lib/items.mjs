// Item endpoints.
//   GET /api/v1/items                  whole bundle (ETag). ?town=<id> adds a resolved rule per item for that town.
//   GET /api/v1/items/:id              one item with every public rule. ?town=<id> adds the resolved rule + facility.
// Rule precedence for a town: town rule > county rule > state rule > the item's default_rule.
// Only verified rules of published regions reach this code (the repo reads public_* views). An item with no
// verified rule for the town resolves to its default_rule with check_local = true: the app must tell the user to
// say "Double check with your town" (resolved.message) instead of presenting the default as fact.
import { jsonWithEtag, notFound, badRequest, validId } from './http.mjs';
import { CHECK_WITH_TOWN } from './strings.mjs';

// chain is ordered most specific first, e.g. ['edison', 'middlesex', 'nj'].
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
      source_url: r.source_url,
      last_verified: r.last_verified,
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
    source_url: null,
    last_verified: null,
    check_local: true,
    message: CHECK_WITH_TOWN,
    facility: null,
  };
}

// chain shapes: [town, county, 'nj'], [county, 'nj'], ['nj']
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
  likely_resin: it.likely_resin,
  hazard: it.hazard,
  varies_by_town: it.varies_by_town,
  prep: it.prep,
  es_reviewed: it.es_reviewed,
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
