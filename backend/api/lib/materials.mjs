// GET /api/v1/materials/:material[?town=<id>]
// The camera model predicts a material class, not an exact item. This turns that class into something the app can
// show: the items of that material (ranked so ones with a verified local rule come first), how the town's rules
// split, and a `consensus` only when the verified rules agree. Otherwise the app asks "which of these is it?".
import { jsonWithEtag, badRequest, notFound, validId } from './http.mjs';
import { resolveRule, chainFor } from './items.mjs';

export const MATERIALS = ['rigid_plastic', 'soft_plastic_foam', 'cardboard_paper', 'metal', 'glass', 'ewaste_hazard', 'other'];
const MIN_ITEMS_FOR_CONSENSUS = 5;
const CONSENSUS_SHARE = 0.85;

export function summarize(items, chain, byKey) {
  const rows = items.map((it) => ({ it, r: resolveRule(it, chain, byKey) }));
  const verified = rows.filter((x) => !x.r.check_local);
  const counts = { recycling: 0, trash: 0, special_dropoff: 0 };
  for (const x of verified) counts[x.r.rule]++;
  let consensus = null;
  if (verified.length >= MIN_ITEMS_FOR_CONSENSUS) {
    const [rule, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (n / verified.length >= CONSENSUS_SHARE) consensus = { rule, share: Math.round((n / verified.length) * 100) / 100, based_on: verified.length };
  }
  // Verified local rules first, then hazards, then name.
  rows.sort((a, b) => Number(a.r.check_local) - Number(b.r.check_local) || Number(b.it.hazard) - Number(a.it.hazard) || a.it.name.en.localeCompare(b.it.name.en));
  return { rows, counts, consensus, verified: verified.length };
}

export async function handleMaterial(request, material, repo, { limit = 40 } = {}) {
  if (!MATERIALS.includes(material)) {
    return material === 'no_object'
      ? notFound('no_object', { message: { en: 'No item found. Point the camera at one item.', es: 'No se encontró ningún objeto. Apunte la cámara a un solo objeto.' } })
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
