// GET /api/v1/search?q=<text>[&town=<id>][&limit=10]
// Matches English and Spanish names plus aliases, ignoring case and accents, and forgives small typos.
// With ?town=, each hit also carries the server-resolved rule for that town.
import { jsonWithEtag, badRequest, notFound, validId } from './http.mjs';
import { resolveRule, chainFor } from './items.mjs';

export const fold = (s) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Common Spanish words people type, mapped to the English words used in names and aliases.
export const ES_TERMS = {
  botella: 'bottle', botellas: 'bottle', lata: 'can', latas: 'can', vidrio: 'glass', frasco: 'jar', caja: 'box', carton: 'cardboard',
  papel: 'paper', periodico: 'newspaper', revista: 'magazine', bolsa: 'bag', bolsas: 'bag', plastico: 'plastic', pila: 'battery',
  pilas: 'battery', bateria: 'battery', baterias: 'battery', llanta: 'tire', llantas: 'tire', neumatico: 'tire', colchon: 'mattress',
  pintura: 'paint', aceite: 'oil', bombilla: 'bulb', foco: 'bulb', computadora: 'computer', computadoras: 'computer', televisor: 'tv',
  television: 'tv', telefono: 'phone', celular: 'phone', ropa: 'clothes', zapatos: 'shoes', juguete: 'toy',
  mueble: 'furniture', muebles: 'furniture', refrigerador: 'refrigerator', nevera: 'refrigerator', lavadora: 'washer', secadora: 'dryer',
  aluminio: 'aluminum', hojas: 'leaves', cesped: 'grass', ramas: 'branches', comida: 'food',
  espuma: 'foam', unicel: 'styrofoam', cubiertos: 'utensils', vaso: 'cup', vasos: 'cup', plato: 'plate', platos: 'plate',
  espejo: 'mirror', extintor: 'extinguisher', propano: 'propane', gasolina: 'gasoline', medicina: 'medicine', jeringa: 'syringe',
};

function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function tokensOf(q) {
  const out = [];
  for (const w of fold(q).split(' ').filter(Boolean)) out.push(w, ...(ES_TERMS[w] ? [ES_TERMS[w]] : []));
  return [...new Set(out)];
}

// Higher is better; 0 means no match.
export function scoreItem(item, query) {
  const q = fold(query);
  if (!q) return 0;
  const names = [item.name.en, item.name.es].map(fold);
  const aliases = (item.aliases ?? []).map(fold);
  const all = [...names, ...aliases];
  if (names.includes(q)) return 100;
  if (aliases.includes(q)) return 90;
  if (names.some((n) => n.startsWith(q))) return 80;
  if (aliases.some((a) => a.startsWith(q))) return 70;

  const toks = tokensOf(q);
  const words = new Set(all.flatMap((s) => s.split(' ')));
  let hit = 0;
  let fuzzy = 0;
  for (const t of toks) {
    const max = t.length >= 7 ? 2 : 1;
    const stem = t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t;
    if (words.has(t) || words.has(stem)) hit++;
    else if (t.length >= 6 && [...words].some((w) => w.length >= 4 && (t.endsWith(w) || t.endsWith(w + 's')))) hit += 0.7;
    else if (t.length >= 3 && [...words].some((w) => w.startsWith(t))) hit += 0.7;
    else if (t.length >= 4 && [...words].some((w) => w[0] === t[0] && lev(t, w, max) <= max)) fuzzy++;
  }
  if (hit + fuzzy === 0) return 0;
  // A long query where most words match nothing ("3D printed parts") is not a match for the one word that does.
  const asked = fold(query).split(' ').filter(Boolean).length;
  if (asked >= 3 && (hit + fuzzy) / toks.length < 0.5) return 0;
  return Math.round(((hit + fuzzy * 0.5) / toks.length) * 60);
}

export function searchItems(items, query, limit = 10) {
  return items
    .map((it) => ({ it, s: scoreItem(it, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.it.id.localeCompare(b.it.id))
    .slice(0, limit);
}

export async function handleSearch(request, repo) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  if (q.length < 2 || q.length > 80) return badRequest('invalid_query', { message: 'q must be 2 to 80 characters.' });
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 10) || 10, 1), 25);
  const town = url.searchParams.get('town');
  if (town !== null && !validId(town)) return badRequest('invalid_region');
  const { chain, region } = await chainFor(repo, town);
  if (!chain) return notFound('region_not_found', { region: town });

  const { items, facilities } = await repo.itemsBundle();
  const byKey = Object.fromEntries(facilities.map((f) => [f.key, f]));
  const results = searchItems(items, q, limit).map(({ it, s }) => ({
    id: it.id, name: it.name, material: it.material, default_rule: it.default_rule, hazard: it.hazard, score: s,
    ...(region ? { resolved: resolveRule(it, chain, byKey) } : {}),
  }));
  return jsonWithEtag(request, { query: q, count: results.length, results }, { maxAge: 60, sMaxAge: 600 });
}
