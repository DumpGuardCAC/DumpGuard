import { readFileSync } from 'node:fs';

export const ES = JSON.parse(readFileSync(new URL('../../data/es-api.json', import.meta.url), 'utf8'));

export const CHECK_WITH_TOWN = {
  en: 'Double check with your town',
  es: ES.checkWithTown,
};

export const BULK_DEMO_NOTICE = {
  en: 'Currently, bulk pickup is demo until permission is acquired from townships',
  es: ES.bulkDemoNotice,
};

const monthWord = new RegExp(`\\b(${Object.keys(ES.months).join('|')})\\b`, 'g');
const monthAny = new RegExp(`(${Object.keys(ES.months).join('|')})`, 'g');
const borderDirection = new RegExp(` on the (${Object.keys(ES.borders.direction).join('|')})`, 'g');

const TRANSFORMS = {
  and: (s) => s.replace(' and ', ES.and),
  dates: (s) => s.replace(monthWord, (m) => ES.months[m]),
  fullDate: (s) => s.replace(/^(\w+) (\d+)$/, (_, m, d) => `${d}${ES.dateJoin}${ES.fullMonths[m] ?? ES.abbrMonths[m] ?? m}`),
  zones: (s) => {
    const t = s.replace(/^Zones? /, (m) => (m === 'Zone ' ? ES.zones.one : ES.zones.many)).replace(/ and /g, ES.and);
    return ES.zones.sides.reduce((acc, [en, es]) => acc.replace(en, es), t);
  },
  borders: (s) => {
    const t = ES.borders.replace.reduce((acc, [en, es]) => acc.replace(en, es), s);
    return t.replace(borderDirection, (_, d) => ES.borders.direction[d]).replace(/ and /g, ES.and);
  },
  street: (s) => {
    if (Object.hasOwn(ES.places, s)) return ES.places[s];
    const d = /^2026 dates: (.*)$/.exec(s);
    return d ? ES.datesPrefix + d[1].replace(monthAny, (m) => ES.months[m]) : s;
  },
  toEs: (s) => toEs(s),
};

function expand(template, m) {
  let out = '';
  for (let i = 0; i < template.length; i++) {
    if (template[i] !== '{') {
      out += template[i];
      continue;
    }
    let depth = 1;
    let j = i + 1;
    while (depth) {
      if (template[j] === '{') depth++;
      else if (template[j] === '}') depth--;
      j++;
    }
    const [, n, op, arg] = /^(\d)(?:([?:])(.*))?$/s.exec(template.slice(i + 1, j - 1));
    const v = m[n] ?? '';
    if (!op) out += v;
    else if (op === '?') out += v ? expand(arg, m) : '';
    else if (arg[0] === '@') out += TRANSFORMS[arg.slice(1)](v);
    else out += ES.tables[arg][v] ?? v;
    i = j - 1;
  }
  return out;
}

const RULES = ES.rules.map(({ re, es }) => ({ re: new RegExp(re), es }));

export function toEs(text) {
  if (!text) return text;
  if (Object.hasOwn(ES.phrases, text)) return ES.phrases[text];
  for (const { re, es } of RULES) {
    const m = re.exec(text);
    if (m) return expand(es, m);
  }
  return text;
}
