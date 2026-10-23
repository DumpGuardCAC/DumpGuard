
const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const DAY_MS = 86_400_000;

const toMs = (iso) => Date.parse(`${iso}T00:00:00Z`);
const toIso = (ms) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (iso, n) => toIso(toMs(iso) + n * DAY_MS);

export function parseRRule(rule) {
  const out = { freq: null, interval: 1, byday: [], nth: [], bymonth: [], until: null };
  let freq = null;
  for (const part of rule.split(';')) {
    const [k, v] = part.split('=');
    if (k === 'FREQ') freq = v;
    else if (k === 'INTERVAL') out.interval = Number(v);
    else if (k === 'BYDAY') {
      for (const item of v.split(',')) {
        const m = /^([1-5])?(SU|MO|TU|WE|TH|FR|SA)$/.exec(item);
        if (!m) throw new Error(`bad BYDAY "${item}"`);
        if (m[1]) out.nth.push({ n: Number(m[1]), day: m[2] });
        else out.byday.push(m[2]);
      }
    }
    else if (k === 'BYMONTH') out.bymonth = v.split(',').map(Number);
    else if (k === 'UNTIL') out.until = `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
    else throw new Error(`unsupported RRULE part "${k}"`);
  }
  if (freq !== 'WEEKLY' && freq !== 'MONTHLY') throw new Error(`unsupported RRULE FREQ "${freq}"`);
  out.freq = freq;
  if (freq === 'WEEKLY' && out.nth.length) throw new Error('ordinal BYDAY needs FREQ=MONTHLY');
  if (freq === 'MONTHLY' && (out.byday.length || out.interval !== 1)) throw new Error('MONTHLY supports only ordinal BYDAY with INTERVAL=1');
  if (!Number.isInteger(out.interval) || out.interval < 1) throw new Error('bad INTERVAL');
  if (out.byday.length === 0 && out.nth.length === 0) throw new Error('BYDAY required');
  return out;
}

const mondayOf = (ms) => ms - ((new Date(ms).getUTCDay() + 6) % 7) * DAY_MS;

export function occurrences(row, from, to) {
  if (!row.rrule) {
    return (row.dates ?? [])
      .filter((d) => d.date >= from && d.date <= to)
      .map((d) => ({ date: d.date, moved: false, ...(d.label ? { label: d.label } : {}) }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }
  const r = parseRRule(row.rrule);
  const start = row.dtstart ?? from;
  const startMs = toMs(start);
  const startWeek = mondayOf(startMs);
  const found = new Map();
  const last = r.until && r.until < to ? r.until : to;
  const first = start > from ? start : from;
  for (let ms = toMs(first); ms <= toMs(last); ms += DAY_MS) {
    const d = new Date(ms);
    if (r.freq === 'MONTHLY') {
      const nth = Math.ceil(d.getUTCDate() / 7);
      if (!r.nth.some((x) => x.n === nth && x.day === DAY_CODES[d.getUTCDay()])) continue;
    } else if (!r.byday.includes(DAY_CODES[d.getUTCDay()])) continue;
    if (r.bymonth.length && !r.bymonth.includes(d.getUTCMonth() + 1)) continue;
    if (r.freq === 'WEEKLY' && ((mondayOf(ms) - startWeek) / (7 * DAY_MS)) % r.interval !== 0) continue;
    found.set(toIso(ms), { date: toIso(ms), moved: false });
  }
  for (const o of row.overrides ?? []) {
    found.delete(o.date);
  }
  for (const o of row.overrides ?? []) {
    if (!o.to || o.to < from || o.to > to) continue;
    const prev = found.get(o.to);
    if (prev && prev.moved) {
      const reasons = [];
      if (prev.reason) reasons.push(prev.reason);
      if (o.reason && o.reason !== prev.reason) reasons.push(o.reason);
      found.set(o.to, { date: o.to, moved: true, from: prev.from || o.date, reason: reasons.join('; ') || undefined });
    } else {
      found.set(o.to, { date: o.to, moved: true, from: o.date, reason: o.reason });
    }
  }
  return [...found.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}
