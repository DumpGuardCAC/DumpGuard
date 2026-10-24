import pg from 'pg';
import webpush from 'web-push';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';

const ES = JSON.parse(readFileSync(new URL('../data/es-api.json', import.meta.url), 'utf8'));
const {
  months: MONTHS, fullMonths: FULL, abbrMonths: ABBR, holidayIn: HOLI, holidayNamed: HOLN, dayUpper: DAYU, dayLower: DAYL, days: DAYS, dayCodes: DAY2,
  where: WHERE, side: SIDE, streetBoundaries: SBOUND, summerExtra: SUMMER, holidayChange: HOLCHG, mustBeOut: OUT, zoneBlueCart: ZB,
} = ES;

const CHECK_WITH_TOWN = {
  en: 'Double check with your town',
  es: ES.checkWithTown,
};

const BULK_DEMO_NOTICE = {
  en: 'Currently, bulk pickup is demo until permission is acquired from townships',
  es: ES.bulkDemoNotice,
};

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, s-maxage=3600', ...extra },
  });

function jsonWithEtag(request, body, { maxAge = 300, sMaxAge = 3600 } = {}) {
  const text = JSON.stringify(body);
  const etag = `"${createHash('sha1').update(text).digest('hex').slice(0, 20)}"`;
  const headers = {
    etag,
    'cache-control': `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=86400`,
  };
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
  return new Response(text, { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
}

const noStoreJson = (body, status = 200, extra = {}) => json(body, status, { 'cache-control': 'no-store', ...extra });

const notFound = (error, extra = {}) => json({ error, ...extra }, 404, { 'cache-control': 'public, s-maxage=60' });
const badRequest = (error, extra = {}) => noStoreJson({ error, ...extra }, 400);

const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const validId = (s) => typeof s === 'string' && ID_RE.test(s);

async function readJson(request, maxBytes) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > maxBytes) return { error: noStoreJson({ error: 'too_large' }, 413) };
  let body = null;
  try { body = JSON.parse(raw); } catch {}
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: noStoreJson({ error: 'invalid_json' }, 400) };
  return { body };
}
const readBody = async (request) => {
  try { return JSON.parse(await request.text()); } catch { return undefined; }
};
const isJson = (request) => (request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const hourStart = (now) => new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000).toISOString();
const clientKey = (request, salt, scope) =>
  createHash('sha256').update(`${salt}|${scope}|${request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'}`).digest('hex');
const bad = (field, message) => noStoreJson({ error: 'invalid_request', field, message }, 400);

const TZ = 'America/New_York';

function localParts(now) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { date: `${p.year}-${p.month}-${p.day}`, day, minutes: Number(p.hour) * 60 + Number(p.minute), dom: Number(p.day) };
}

const mins = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

function appliesOn(entry, date, day, dom) {
  if (entry.date) return entry.date === date;
  if (entry.nth) return entry.day === day && Math.ceil(dom / 7) === entry.nth;
  return entry.days.includes(day);
}

const addDaysUtc = (ymd, n) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

function openStatus(hoursStruct, now = new Date(), lookaheadDays = 120) {
  if (!Array.isArray(hoursStruct) || hoursStruct.length === 0) return { open_now: null, next_open: null, closes_at: null };
  const here = localParts(now);
  for (const e of hoursStruct) {
    if (appliesOn(e, here.date, here.day, here.dom) && here.minutes >= mins(e.open) && here.minutes < mins(e.close)) {
      return { open_now: true, next_open: null, closes_at: e.close };
    }
  }
  for (let i = 0; i <= lookaheadDays; i++) {
    const date = addDaysUtc(here.date, i);
    const day = (here.day + i) % 7;
    const dom = Number(date.slice(8, 10));
    const todays = hoursStruct
      .filter((e) => appliesOn(e, date, day, dom) && (i > 0 || mins(e.open) > here.minutes))
      .sort((a, b) => mins(a.open) - mins(b.open));
    if (todays.length) return { open_now: false, next_open: `${date} ${todays[0].open}`, closes_at: null };
  }
  return { open_now: false, next_open: null, closes_at: null };
}

const HOURS_NOTE = { en: 'Hours may change on holidays and in bad weather. Call first.', es: ES.hoursNote };

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const DAY_MS = 86_400_000;

const toMs = (iso) => Date.parse(`${iso}T00:00:00Z`);
const toIso = (ms) => new Date(ms).toISOString().slice(0, 10);
const addDays = (iso, n) => toIso(toMs(iso) + n * DAY_MS);

function parseRRule(rule) {
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

function occurrences(row, from, to) {
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

const dates = (s) => s.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (m) => MONTHS[m]);
const fullDate = (s) => s.replace(/^(\w+) (\d+)$/, (_, m, d) => `${d} de ${FULL[m] ?? ABBR[m] ?? m}`);
const ZONES = (s) => s.replace(/^Zones? /, (m) => (m === 'Zone ' ? 'Zona ' : 'Zonas ')).replace(/ and /g, ' y ');
const BORDERS = (s) => s
  .replace('bordered by ', 'delimitada por ').replace(/ on the (north|east|south|west)/g, (_, d) => ({ north: ' al norte', east: ' al este', south: ' al sur', west: ' al oeste' })[d])
  .replace('the City of Plainfield', 'la ciudad de Plainfield').replace('the RR tracks', 'las vías del tren').replace(/ and /g, ' y ');

const EXTRA = [
  [/^Sanitation District (\w) \/ Recycling District (\d): Street boundaries: use .*$/, (m) => `Distrito de Saneamiento ${m[1]} / Distrito de Reciclaje ${m[2]}: ${SBOUND}`],
  [/^Sanitation District (\w) \/ Recycling District (\d): Street boundaries: Recycling District Map PDF$/, (m) => `Distrito de Saneamiento ${m[1]} / Distrito de Reciclaje ${m[2]}: límites de las calles: PDF del mapa de distritos de reciclaje`],
  [/^Sanitation District (\w) \/ Recycling District (\d): summer extra day only\..*$/, (m) => `Distrito de Saneamiento ${m[1]} / Distrito de Reciclaje ${m[2]}: ${SUMMER}`],
  [/^Sanitation District (\w) \/ Recycling District (\d)$/, (m) => `Distrito de Saneamiento ${m[1]} / Distrito de Reciclaje ${m[2]}`],
  [/^Sanitation District (\w): (MLK Day|Presidents Day|Memorial Day|Labor Day|Columbus Day) Monday sanitation moved to Tuesday on 2026 calendar$/, (m) => `Distrito de Saneamiento ${m[1]}: por ${HOLN[m[2]]}, el saneamiento del lunes pasa al martes en el calendario de 2026`],
  [/^Business District, North Side and Triangle Area: Collection date subject to change in the event of a holiday$/, () => `Distrito comercial, Lado Norte y Área del Triángulo: ${HOLCHG}`],
  [/^South Side: Collection date subject to change in the event of a holiday$/, () => `Lado Sur: ${HOLCHG}`],
  [/^Zone (NW|SW|SE|NE): (north|south) of Main Street, (west|east) of Pennsylvania Railroad$/, (m) => `Zona ${m[1].replace('W', 'O')}: ${WHERE[m[2]]} de Main Street, ${SIDE[m[3]]} del ferrocarril de Pennsylvania`],
  [/^Zone (NW|SW|SE|NE): single-stream in blue automated cart$/, (m) => `Zona ${m[1].replace('W', 'O')}: flujo único en carrito azul automatizado`],
  [/^Wards? ([\d and]+): confirm ward at gis\.oldbridge\.com(?: \(WHAT WARD AM I IN\?\))?$/, (m) => `Distrito${m[1].includes('and') ? 's' : ''} ${m[1].replace(' and ', ' y ')}: confirme su distrito en gis.oldbridge.com`],
  [/^Ward (\d): (Memorial Day|Thanksgiving|Christmas) recycling moved to Saturday (\w+ \d+) \(.*\)$/, (m) => `Distrito ${m[1]}: el reciclaje ${HOLI[m[2]]} pasó al sábado ${fullDate(m[3])}`],
  [/^Exception: Central Park and surrounding streets \(Stone Ct, Aimy Ct, Rachele Ct\): Memorial Day recycling moved to Saturday May 30 .*$/, () => 'Excepción: Central Park y calles aledañas (Stone Ct, Aimy Ct, Rachele Ct): el reciclaje del Día de los Caídos (Memorial Day) pasó al sábado 30 de mayo'],
  [/^Exception: Central Park and surrounding streets \(Stone Ct, Aimy Ct, Rachele Ct\) c: .*$/, () => 'Excepción: Central Park y calles aledañas (Stone Ct, Aimy Ct, Rachele Ct): se recogen los lunes aunque estén en el Distrito 3'],
  [/^Exception: The Arbors section, Sonoma Court, and Lakeridge West collected Tuesday: .*$/, () => 'Excepción: la sección The Arbors, Sonoma Court y Lakeridge West se recogen los martes aunque estén en el Distrito 4'],
  [/^Sec ([\d, ]+): (MONDAYS|TUESDAYS|WEDNESDAY) (.*)$/, (m) => `Secc. ${m[1]}: ${DAYU[m[2]]}, ${BORDERS(m[3])}`],
  [/^Monday sections \(Sec 4, 5, 6, 7\): Memorial Day recycling moved to Saturday May 30 .*$/, () => 'Secciones de lunes (Secc. 4, 5, 6, 7): el reciclaje del Día de los Caídos (Memorial Day) pasó al sábado 30 de mayo'],
  [/^Sanitation Zone (I+): (.*)$/, (m) => `Zona de Saneamiento ${m[1]}: ${m[2]}`],
  [/^MCIA county program \(not sanitation zones\): (.*)$/, (m) => `Programa del condado MCIA (no son zonas de saneamiento): ${m[1]}`],
  [/^MCIA: (.*)$/, (m) => `Programa MCIA: ${m[1]}`],
  [/^Zone (\d) grass clippings$/, (m) => `Zona ${m[1]}, césped cortado`],
  [/^Zone (\d) heavy\/bulk trash$/, (m) => `Zona ${m[1]}, basura voluminosa/pesada`],
  [/^Zone (\d) non-recyclable solid waste$/, (m) => `Zona ${m[1]}, desechos sólidos no reciclables`],
  [/^Zone (\d) brush and leaf$/, (m) => `Zona ${m[1]}, ramas y hojas`],
  [/^Streets listed on city trash collection map PDF \(e\.g\., (.*?),? and other (\w+)-list streets\)$/, (m) => `Calles del mapa de recogida de basura de la ciudad en PDF (p. ej., ${m[1]} y otras calles de la lista del ${DAYL[m[2]]})`],
  [/^(Thursday|Friday) recycling district: street assignment via Recycling Districts PDF linked from Curbside page$/, (m) => `Distrito de reciclaje de los ${DAYL[m[1]]}: la asignación de calles está en el PDF de distritos de reciclaje de la página de recogida en la acera`],
  [/^Thursday recycling district: Thanksgiving makeup 2026-11-28 .*$/, () => 'Distrito de reciclaje de los jueves: reposición de Acción de Gracias el 2026-11-28 (nota de la página de recogida en la acera: "No Collection on Thanksgiving Day" / "will be on 11/28/26")'],
  [/^Friday recycling district: Christmas makeup 2026-12-26 .*$/, () => 'Distrito de reciclaje de los viernes: reposición de Navidad el 2026-12-26 (nota de la página de recogida en la acera: "No Collection on Christmas Day" / "will beon 12/26/26")'],
  [/^Section (I+) first collection day \((.*?)\): First weekday .*$/, (m) => `Sección ${m[1]}, primer día de recogida (${m[2]}): primer día deducido de los avisos oficiales de 2026 del Centro de Información de Tormentas de Invierno`],
  [/^Section (I+) second collection day \/ bulk day \(Trash\/Recycling page\)$/, (m) => `Sección ${m[1]}, segundo día de recogida / día de artículos voluminosos (página de Basura/Reciclaje)`],
  [/^Section (I+): limit two items per pick-up; effective January 1, 2018 \(still on current Trash\/Recycling page\)$/, (m) => `Sección ${m[1]}: límite de dos artículos por recogida; vigente desde el 1 de enero de 2018 (sigue en la página actual de Basura/Reciclaje)`],
  [/^Section (I+) \((.*)\): biweekly Wednesday per 2026 Community Calendar$/, (m) => `Sección ${m[1]} (${m[2]}): cada dos miércoles según el Calendario Comunitario de 2026`],
  [/^(Zones? [\d and]+|Zone 1 and north side of Zone 3|Zone 2 and south side of Zone 3)$/, (m) => ZONES(m[1]).replace('north side of Zone 3', 'el lado norte de la Zona 3').replace('south side of Zone 3', 'el lado sur de la Zona 3')],
  [/^(Zones? [\d and]+): must be out by 6:00 a\.m\.?$/, (m) => `${ZONES(m[1])}: ${OUT}`],
  [/^(Zones [\d and]+) white metal$/, (m) => `Línea blanca (metal) de ${ZONES(m[1]).toLowerCase().replace('zonas', 'las Zonas')}`],
  [/^(Zones [\d and]+): 1st and 3rd Wednesday of each month; no residential recycling on the fifth Wednesday of a month$/, (m) => `${ZONES(m[1])}: 1.º y 3.er miércoles de cada mes; no hay reciclaje residencial el quinto miércoles del mes`],
  [/^(Zones [\d and]+): 2nd and 4th Wednesday of each month; no residential recycling on the fifth Wednesday of a month$/, (m) => `${ZONES(m[1])}: 2.º y 4.º miércoles de cada mes; no hay reciclaje residencial el quinto miércoles del mes`],
  [/^(Zones [\d and]+): 2026 dates: (.*)$/, (m) => `${ZONES(m[1])}: fechas de 2026: ${dates(m[2])}`],
  [/^Sections (\d) and (\d) leaf and branch curbside$/, (m) => `Recogida en la acera de hojas y ramas de las Secciones ${m[1]} y ${m[2]}`],
  [/^Zone (\d) \(Route 34 (South|North)\): Streets \((Area \d)(?: index from borough 2026 contract map)?\): (.*?)(?:\.? Effective May (\d+)(?:, 2026)?\.?)?$/, (m) => `Zona ${m[1]} (Ruta 34 ${m[2] === 'South' ? 'Sur' : 'Norte'}): Calles (${m[3].replace('Area', 'Área')}): ${m[4]}${m[5] ? `. Vigente desde el ${m[5]} de mayo de 2026` : ''}`],
  [/^Area (\d)$/, (m) => `Área ${m[1]}`],
  [/^Zone ([ABCD]) garbage: curbside by 6:00 a\.m\.; use township-issued blue automated container$/, (m) => `Basura de la Zona ${m[1]}: ${ZB}`],
  [/^Ocean Grove Zone ([BC]) garbage: manual collection; cans max 45 gallons, 50 lbs\. with contents$/, (m) => `Basura de Ocean Grove, Zona ${m[1]}: recogida manual; botes de máximo 45 galones y 50 lb con el contenido`],
  [/^Recycling sub-zone (\w\d): assign by 2026 Street Index PDF$/, (m) => `Subzona de reciclaje ${m[1]}: asigne según el PDF del índice de calles de 2026`],
  [/^Garbage District (\d)$/, (m) => `Distrito de basura ${m[1]}`],
  [/^(East|West) of Broad Street$/, (m) => `Al ${m[1] === 'East' ? 'este' : 'oeste'} de Broad Street`],
  [/^Curbside: east of Bingham Avenue(?:; (1st and 3rd) Wednesday of month)?$/, (m) => `En la acera: al este de Bingham Avenue${m[1] ? '; 1.º y 3.er miércoles del mes' : ''}`],
  [/^Curbside: Bingham Avenue and west(?:; (2nd and 4th) Wednesday of month)?$/, (m) => `En la acera: Bingham Avenue y al oeste${m[1] ? '; 2.º y 4.º miércoles del mes' : ''}`],
  [/^Drive-in collection: borough-wide(?:; (2nd and 4th) Wednesday of month)?$/, (m) => `Recogida con entrada al predio: en todo el municipio${m[1] ? '; 2.º y 4.º miércoles del mes' : ''}`],
  [/^Section ([AB]): (.*?), (?:[^,]*?)$/, null],
  [/^Section ([AB]): no trash (Friday December 25|Thursday January 1|Thursday November 26) 2026 \(2026 calendar\)$/, (m) => `Sección ${m[1]}: no hay recogida de basura el ${({ 'Friday December 25': 'viernes 25 de diciembre', 'Thursday January 1': 'jueves 1 de enero', 'Thursday November 26': 'jueves 26 de noviembre' })[m[2]]} de 2026 (calendario de 2026)`],
  [/^Section ([AB]): cans\/bottles, bundled cardboard and newspaper; no plastic bags$/, (m) => `Sección ${m[1]}: latas/botellas, cartón atado y periódico; sin bolsas de plástico`],
  [/^Section ([AB]): bulk \(furniture, mattresses, couches, other plastics\); limit 3 items\. 2026 dates start Jan (\d+)$/, (m) => `Sección ${m[1]}: artículos voluminosos (muebles, colchones, sofás, otros plásticos); límite de 3 artículos. Las fechas de 2026 empiezan el ${m[2]} de enero`],
  [/^Section ([AB]) fall leaf collection \(paper bags\)$/, (m) => `Recogida de hojas de otoño de la Sección ${m[1]} (bolsas de papel)`],
  [/^Section ([AB]): (.+)$/, (m) => `Sección ${m[1]}: ${m[2]}`],
  [/^(North|South) Zone: collection from 6:00 a\.m\.; see official street listing$/, (m) => `Zona ${m[1] === 'North' ? 'Norte' : 'Sur'}: recogida desde las 6:00 a.m.; vea la lista oficial de calles`],
  [/^(North|South) Zone: collection from 6:00 a\.m\.; no collection New Year's Day, Independence Day, Election Day, Thanksgiving, Christmas$/, (m) => `Zona ${m[1] === 'North' ? 'Norte' : 'Sur'}: recogida desde las 6:00 a.m.; no hay recogida en Año Nuevo, Día de la Independencia, Día de las Elecciones, Acción de Gracias ni Navidad`],
].filter(([, f]) => f);

const WORDS = [
  [/^Garbage (Monday|Tuesday|Wednesday|Thursday|Friday): municipal garbage district collected on (\w+)$/, (d) => `Basura ${DAYS[d[1]]}: distrito municipal con recogida los ${DAYS[d[1]]}`],
  [/^(North|South) Zone \((Mo|Tu) and (Th|Fr)\)$/, (m) => `Zona ${m[1] === 'North' ? 'Norte' : 'Sur'} (${DAY2[m[2]]} y ${DAY2[m[3]]})`],
  [/^(North|South) Zone ([AB]): (.+) \((\w+)s\)$/, (m) => `Zona ${m[1] === 'North' ? 'Norte' : 'Sur'} ${m[2]}: ${street(m[3])} (${DAYS[m[4]]})`],
  [/^Recycling Section (\d+)(?: \((grass|leaf)\))?$/, (m) => `Sección de reciclaje ${m[1]}${m[2] ? ` (${m[2] === 'grass' ? 'césped' : 'hojas'})` : ''}`],
  [/^RD (\d) Zone (\d+): streets in (.+)$/, (m) => `RD ${m[1]} Zona ${m[2]}: calles en ${m[3]}`],
  [/^Zone (\d+A?) \(every other (Mo|Tu)\)$/, (m) => `Zona ${m[1]} (cada dos ${m[2] === 'Mo' ? 'lunes' : 'martes'})`],
  [/^Zone (\d+A?) \((Mo|Tu) and (Th|Fr)\)$/, (m) => `Zona ${m[1]} (${DAY2[m[2]]} y ${DAY2[m[3]]})`],
  [/^Zone (\d+A?)(?: \((May 1 to Sep 30|Oct 1 to Apr 30)\))?(?:: (.+))?$/, (m) => `Zona ${m[1]}${m[2] ? ` (${m[2] === 'May 1 to Sep 30' ? 'del 1 de mayo al 30 de septiembre' : 'del 1 de octubre al 30 de abril'})` : ''}${m[3] ? `: ${street(m[3])}` : ''}`],
  [/^(Christmas tree pickup)$/, () => 'Recogida de árboles de Navidad'],
];

function street(s) {
  if (Object.hasOwn(ES.places, s)) return ES.places[s];
  const d = /^2026 dates: (.*)$/.exec(s);
  if (d) return 'fechas de 2026: ' + d[1].replace(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/g, (m) => MONTHS[m]);
  return s;
}

const REASONS = [
  [/^Good Friday( week)?$/, (m) => `Viernes Santo${m[1] ? ' (semana)' : ''}`],
  [/^Independence Day \(observed\)( week)?$/, (m) => `Día de la Independencia (observado)${m[1] ? ' (semana)' : ''}`],
  [/^(Columbus Day|Labor Day|Martin Luther King Jr\. Day|Memorial Day|Presidents' Day) \(Monday's pickup moved a day\)$/, (m) => `${toEs(m[1])} (la recogida del lunes se movió un día)`],
  [/^Labor Day\. The city calendar prints Sept 12 here .*$/, 'Día del Trabajo. El calendario de la ciudad imprime el 12 de septiembre aquí (error de imprenta, es sábado); llame al 732-745-5059 para confirmar el día de reposición'],
];

function toEs(text) {
  if (!text) return text;
  if (Object.hasOwn(ES.phrases, text)) return ES.phrases[text];
  for (const [re, f] of [...WORDS, ...REASONS, ...EXTRA]) {
    const m = re.exec(text);
    if (m) return typeof f === 'function' ? f(m) : f;
  }
  return text;
}

function resolveRule(item, chain, facilitiesByKey) {
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

async function chainFor(repo, regionId) {
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

async function handleItems(request, repo) {
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

async function handleItem(request, id, repo) {
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

const MATERIALS = ['rigid_plastic', 'soft_plastic_foam', 'cardboard_paper', 'metal', 'glass', 'ewaste_hazard', 'other'];
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

async function handleMaterial(request, material, repo, { limit = 40 } = {}) {
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

const fold = (s) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const ES_TERMS = {
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

function scoreItem(item, query) {
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
  const asked = fold(query).split(' ').filter(Boolean).length;
  if (asked >= 3 && (hit + fuzzy) / toks.length < 0.5) return 0;
  return Math.round(((hit + fuzzy * 0.5) / toks.length) * 60);
}

function searchItems(items, query, limit = 10) {
  return items
    .map((it) => ({ it, s: scoreItem(it, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.it.id.localeCompare(b.it.id))
    .slice(0, limit);
}

async function handleSearch(request, repo) {
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const AUTH_FAILS_PER_HOUR = 10;

function bearerMatches(header, secret) {
  if (!secret) return false;
  const a = createHash('sha256').update(header ?? '').digest();
  const b = createHash('sha256').update(`Bearer ${secret}`).digest();
  return timingSafeEqual(a, b);
}

function authorized(request, token = process.env.ADMIN_TOKEN) {
  if (!token || token.length < 16) return false;
  return bearerMatches(request.headers.get('authorization') ?? '', token);
}

async function staffOnly(request, repo, token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '') {
  if (authorized(request, token)) return null;
  const limited = (await repo.hit(clientKey(request, salt, 'staff-auth'), hourStart(now))) > AUTH_FAILS_PER_HOUR;
  return noStoreJson({ error: limited ? 'rate_limited' : 'unauthorized' }, limited ? 429 : 401);
}

function scheduleChanges(rows, areaKeys, today, days = 21) {
  const keys = new Set(areaKeys);
  const out = [];
  for (const r of rows) {
    if (r.area_key && keys.size && !keys.has(r.area_key)) continue;
    for (const o of occurrences(r, today, addDays(today, days))) {
      if (o.moved) out.push({ stream: r.stream, area: r.area_key || null, date: o.date, from: o.from ?? null, reason: o.reason ?? null });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.stream.localeCompare(b.stream)));
}

async function handleAlerts(request, repo, { now = new Date() } = {}) {
  const url = new URL(request.url);
  const town = url.searchParams.get('town');
  if (!town || !validId(town)) return badRequest('town_required');
  const days = Math.min(Math.max(Number(url.searchParams.get('days') ?? 21) || 21, 1), 60);
  const areas = url.searchParams.getAll('area').flatMap((v) => v.split(',')).filter((k) => /^[a-z0-9:_-]{1,60}$/.test(k));
  if (!(await repo.isPublishedTown(town))) return notFound('town_not_found', { town });
  const today = localParts(now).date;
  const [announcements, rows] = await Promise.all([repo.activeAnnouncements(town, today), repo.schedulesForTown(town)]);
  const body = {
    town,
    announcements: announcements.map((a) => ({
      id: a.id, message: { en: a.message_en, es: a.message_es || a.message_en }, source_url: a.source_url, starts_on: a.starts_on, ends_on: a.ends_on,
      scope: a.region_id ? 'town' : 'all',
    })),
    schedule_changes: scheduleChanges(rows, areas, today, days),
  };
  return jsonWithEtag(request, body, { maxAge: 60, sMaxAge: 120 });
}

async function handleCreateAlert(request, repo, { now = new Date(), token, salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const b = await readBody(request);
  if (b === undefined) return noStoreJson({ error: 'invalid_json' }, 400);
  const today = localParts(now).date;
  const startsOn = b?.starts_on ?? today;
  if (typeof b?.message_en !== 'string' || b.message_en.trim().length < 1 || b.message_en.length > 300) return bad('message_en', '1 to 300 characters.');
  if (b.message_es !== undefined && (typeof b.message_es !== 'string' || b.message_es.length > 300)) return bad('message_es', 'Up to 300 characters.');
  if (typeof b.ends_on !== 'string' || !DATE_RE.test(b.ends_on)) return bad('ends_on', 'Use YYYY-MM-DD.');
  if (typeof startsOn !== 'string' || !DATE_RE.test(startsOn)) return bad('starts_on', 'Use YYYY-MM-DD.');
  if (b.ends_on < startsOn || b.ends_on > addDays(startsOn, 60)) return bad('ends_on', 'Must be within 60 days of starts_on.');
  if (b.town !== undefined && b.town !== null) {
    if (typeof b.town !== 'string' || !validId(b.town) || !(await repo.isPublishedTown(b.town))) return bad('town', 'Unknown town.');
  }
  if (b.source_url !== undefined && b.source_url !== null && !/^https:\/\/[^\s]{1,500}$/.test(b.source_url)) return bad('source_url', 'Use an https URL.');
  const id = await repo.createAnnouncement({
    regionId: b.town ?? null, messageEn: b.message_en.trim(), messageEs: (b.message_es ?? '').trim(), sourceUrl: b.source_url ?? null, startsOn, endsOn: b.ends_on,
  });
  return noStoreJson({ id }, 201);
}

async function handleDeleteAlert(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/.test(id)) return badRequest('invalid_id');
  await repo.deleteAnnouncement(id);
  return noStoreJson({ ok: true }, 200);
}

const STREAM_LABEL = { trash: 'Trash', recycling: 'Recycling', bulk: 'Bulk pickup', yard: 'Yard waste', other: 'Collection' };

const esc = (s) =>
  String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const compact = (iso) => iso.replaceAll('-', '');

function foldLine(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts = [];
  let cur = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > limit) {
      parts.push(cur);
      cur = '';
      bytes = 0;
      limit = 74;
    }
    cur += ch;
    bytes += n;
  }
  parts.push(cur);
  return parts.join('\r\n ');
}

function eventTitle(row) {
  const label = STREAM_LABEL[row.stream] ?? 'Collection';
  const area = row.area_key ? ` (${row.area_note.split(':')[0].replace(/\s*\(.*\)$/, '')})` : '';
  return `${label}${area}`;
}

function buildIcs({ townName, rows, today, now = new Date(), subscribe = false }) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const horizon = addDays(today, 400);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DumpGuard//Collection schedule//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${esc(`${townName} collection`)}`,
    ...(subscribe ? ['REFRESH-INTERVAL;VALUE=DURATION:PT12H', 'X-PUBLISHED-TTL:PT12H'] : []),
  ];

  const alarm = [
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Set out tonight', 'TRIGGER:-PT6H', 'END:VALARM',
  ];

  for (const row of rows) {
    if (!row.rrule) {
      for (const d of occurrences(row, today, horizon)) {
        lines.push(
          'BEGIN:VEVENT',
          `UID:dg-${row.id}-${compact(d.date)}@dumpguard`,
          `DTSTAMP:${stamp}`,
          `DTSTART;VALUE=DATE:${compact(d.date)}`,
          `SUMMARY:${esc(d.label ? `${eventTitle(row)}: ${d.label}` : eventTitle(row))}`,
          `DESCRIPTION:${esc(row.notes_en)}`,
          'TRANSP:TRANSPARENT',
          ...alarm,
          'END:VEVENT',
        );
      }
      continue;
    }
    const dates = occurrences(row, row.dtstart && row.dtstart > today ? row.dtstart : today, horizon);
    const regular = dates.filter((d) => !d.moved);
    const title = eventTitle(row);
    const desc = row.notes_en;

    if (regular.length) {
      const exdates = (row.overrides ?? []).map((o) => o.date).filter((d) => d >= regular[0].date);
      lines.push(
        'BEGIN:VEVENT',
        `UID:dg-${row.id}@dumpguard`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${compact(regular[0].date)}`,
        `RRULE:${row.rrule}`,
        ...exdates.map((d) => `EXDATE;VALUE=DATE:${compact(d)}`),
        `SUMMARY:${esc(title)}`,
        `DESCRIPTION:${esc(desc)}`,
        'TRANSP:TRANSPARENT',
        ...alarm,
        'END:VEVENT',
      );
    }
    for (const m of dates.filter((d) => d.moved)) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:dg-${row.id}-${compact(m.date)}@dumpguard`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${compact(m.date)}`,
        `SUMMARY:${esc(`${title} - moved (${m.reason})`)}`,
        `DESCRIPTION:${esc(`Normally ${m.from}. ${desc}`)}`,
        'TRANSP:TRANSPARENT',
        ...alarm,
        'END:VEVENT',
      );
    }
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

const jsonSched = (body, status = 200) => (status === 400 || status === 404 ? noStoreJson(body, status) : json(body, status));

const todayIso = () => localParts(new Date()).date;

async function handleSchedule(request, zip, repo, { today = todayIso(), now = new Date() } = {}) {
  if (!/^\d{5}$/.test(zip ?? '')) return jsonSched({ error: 'invalid_zip', message: 'ZIP must be 5 digits.' }, 400);
  const url = new URL(request.url);
  const townParam = url.searchParams.get('town');
  const areaParams = url.searchParams.getAll('area').flatMap((v) => v.split(',')).filter(Boolean);
  const wantIcs = url.searchParams.get('format') === 'ics';
  const subscribe = wantIcs && url.searchParams.get('subscribe') === '1';
  if (url.searchParams.get('format') && !wantIcs && url.searchParams.get('format') !== 'json') {
    return jsonSched({ error: 'invalid_format' }, 400);
  }

  const towns = await repo.townsForZip(zip);
  if (towns.length === 0) {
    return jsonSched({ error: 'zip_not_covered', message: 'We do not have verified collection data for this ZIP yet.' }, 404);
  }
  let town = towns[0];
  if (towns.length > 1) {
    town = towns.find((t) => t.id === townParam);
    if (!town) return jsonSched({ needs: 'town', zip, towns }, wantIcs ? 409 : 200);
  } else if (townParam && townParam !== town.id) {
    return jsonSched({ error: 'town_not_in_zip', zip, towns }, 400);
  }

  const all = await repo.schedulesForTown(town.id);
  if (all.length === 0) {
    return jsonSched({ error: 'no_schedule', town, message: 'No verified pickup schedule for this town yet.' }, 404);
  }

  const splitNote = (n) => ({
    label: n.split(':')[0].replace(/\s*\(.*\)$/, ''),
    description: n.includes(':') ? n.split(':').slice(1).join(':').trim() : '',
  });
  const areas = [...new Map(all.filter((r) => r.area_key).map((r) => [r.area_key, r])).values()].map((r) => {
    const en = splitNote(r.area_note);
    const es = splitNote(toEs(r.area_note));
    return { key: r.area_key, group: groupOf(r.area_key), ...en, label_es: es.label, description_es: es.description };
  });
  const groups = [...new Set(areas.map((a) => a.group))];
  let rows = all;
  let selected = [];
  if (areas.length) {
    const unknown = areaParams.filter((k) => !areas.some((a) => a.key === k));
    if (unknown.length) return jsonSched({ error: 'unknown_area', town, areas, groups }, 400);
    selected = areaParams.map((k) => areas.find((a) => a.key === k));
    const dup = groups.find((g) => selected.filter((a) => a.group === g).length > 1);
    if (dup) return jsonSched({ error: 'one_area_per_group', group: dup, town, areas, groups }, 400);
    const missing = groups.filter((g) => !selected.some((a) => a.group === g));
    if (missing.length) {
      return jsonSched({ needs: 'area', zip, town, areas, groups, missing }, wantIcs ? 409 : 200);
    }
    const keys = new Set(selected.map((a) => a.key));
    rows = all.filter((r) => !r.area_key || keys.has(r.area_key));
  }
  const area = selected[0] ?? null;

  if (wantIcs) {
    const body = buildIcs({ townName: town.name, rows, today, now, subscribe });
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        ...(subscribe ? {} : { 'content-disposition': `attachment; filename="dumpguard-${town.id}${selected.length ? `-${selected.map((a) => a.key.replace(':', '-')).join('-')}` : ''}.ics"` }),
        'cache-control': subscribe ? 'public, max-age=3600, s-maxage=3600' : 'public, s-maxage=3600',
      },
    });
  }

  const to = addDays(today, 60);
  const schedules = rows.map((r) => ({
    stream: r.stream,
    weekday: r.weekday,
    pattern: r.week_pattern,
    area: r.area_key || null,
    note_en: r.notes_en,
    note_es: r.notes_es,
    rrule: r.rrule,
    dtstart: r.dtstart,
    overrides: r.overrides,
    dates: r.dates || [],
    next: occurrences(r, today, to).slice(0, 6).map((o) => ({
      ...o,
      ...(o.reason ? { reason_es: toEs(o.reason) } : {}),
      ...(o.label ? { label_es: toEs(o.label) } : {}),
    })),
  }));
  const q = new URLSearchParams({ town: town.id, format: 'ics', subscribe: '1' });
  for (const a of selected) q.append('area', a.key);
  const feed = `${url.host}${url.pathname}?${q}`;
  const calendar = { https: `https://${feed}`, webcal: `webcal://${feed}` };
  return jsonSched({ zip, town, area, selected, schedules, calendar });
}

async function handleTowns(request, repo) {
  return jsonWithEtag(request, { towns: await repo.publishedTowns() });
}

const rad = (d) => (d * Math.PI) / 180;
function distanceKm(a, b) {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

async function handleFacilities(request, repo, { now = new Date() } = {}) {
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

function buildStreetLookup(index) {
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

function handleWoodbridgeStreets(request, lookup) {
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

async function handleHealth(repo) {
  try {
    const ok = await repo.ping();
    return json({ ok, time: new Date().toISOString() }, ok ? 200 : 503, { 'cache-control': 'no-store' });
  } catch {
    return json({ ok: false }, 503, { 'cache-control': 'no-store' });
  }
}

const BULK_LIMIT = 5;
const MAX_BODY_BYTES = 8 * 1024;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

async function handleBulkRequest(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if (!isJson(request)) {
    return noStoreJson({ error: 'unsupported_media_type', message: 'Send application/json.' }, 415);
  }
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return noStoreJson({ error: 'too_large' }, 413);

  const windowStart = hourStart(now);
  const hits = await repo.hit(clientKey(request, salt, 'bulk-request'), windowStart);
  if (hits > BULK_LIMIT) {
    const retry = Math.ceil((Date.parse(windowStart) + 3_600_000 - now.getTime()) / 1000);
    return noStoreJson({ error: 'rate_limited', message: 'Too many requests. Try again later.' }, 429, { 'retry-after': String(retry) });
  }

  const { body, error } = await readJson(request, MAX_BODY_BYTES);
  if (error) return error;

  const { town, email, description, preferred_date: preferred } = body;
  if (typeof town !== 'string' || !/^[a-z0-9-]{1,40}$/.test(town)) return bad('town', 'Choose a town.');
  if (typeof email !== 'string' || email.length > 254 || !EMAIL_RE.test(email.trim())) return bad('email', 'Enter a valid email address.');
  if (typeof description !== 'string') return bad('description', 'Describe the items.');
  const desc = description.trim();
  if (desc.length < 1 || desc.length > 1000) return bad('description', 'Description must be 1 to 1000 characters.');
  if (CONTROL_RE.test(desc)) return bad('description', 'Description contains invalid characters.');

  let preferredDate = null;
  if (preferred !== undefined && preferred !== null && preferred !== '') {
    const today = now.toISOString().slice(0, 10);
    if (typeof preferred !== 'string' || !validDate(preferred)) return bad('preferred_date', 'Use YYYY-MM-DD.');
    if (preferred < today || preferred > addDays(today, 90)) return bad('preferred_date', 'Pick a date within the next 90 days.');
    preferredDate = preferred;
  }

  if (!(await repo.isPublishedTown(town))) return bad('town', 'That town is not available yet.');

  const { id, expiresAt } = await repo.insert({ regionId: town, email: email.trim(), description: desc, preferredDate });
  return noStoreJson({
    id,
    demo: true,
    expires_at: expiresAt,
    message: 'Demo request saved. It was not sent to your town. It will be deleted automatically after 90 days.',
    notice: BULK_DEMO_NOTICE,
  }, 201);
}

async function handlePurge(request, repo, { secret = process.env.CRON_SECRET } = {}) {
  if (!bearerMatches(request.headers.get('authorization') ?? '', secret)) return noStoreJson({ error: 'unauthorized' }, 401);
  await repo.purge();
  return noStoreJson({ ok: true }, 200);
}

const PUSH_MAX_BODY = 4 * 1024;
const PUSH_LIMIT = 10;
const STREAMS = ['trash', 'recycling', 'bulk', 'yard'];
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /\.push\.apple\.com$/, /^web\.push\.apple\.com$/,
  /\.notify\.windows\.com$/, /^updates-autopush\.(stage\.)?mozaws\.net$/, /^push\.services\.mozilla\.com$/,
];
const allowedEndpoint = (s) => {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') && PUSH_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
};

const groupOf = (key) => (key.includes(':') ? key.split(':')[0] : 'area');

function validateAreas(rows, areaKeys) {
  const keys = [...new Set(rows.filter((r) => r.area_key).map((r) => r.area_key))];
  if (keys.length === 0) return areaKeys.length === 0 ? { ok: true } : { ok: false, message: 'This town has no sections.' };
  if (areaKeys.some((k) => !keys.includes(k))) return { ok: false, message: 'Unknown section.' };
  const groups = [...new Set(keys.map(groupOf))];
  for (const g of groups) {
    const n = areaKeys.filter((k) => groupOf(k) === g).length;
    if (n === 0) return { ok: false, message: `Choose a ${g === 'area' ? 'section' : g}.` };
    if (n > 1) return { ok: false, message: `Only one ${g === 'area' ? 'section' : g} can be chosen.` };
  }
  return { ok: true };
}

function handlePushKey(env = process.env) {
  const key = env.VAPID_PUBLIC_KEY;
  if (!key) return noStoreJson({ error: 'push_not_configured' }, 503);
  return json({ public_key: key }, 200, { 'cache-control': 'public, s-maxage=86400' });
}

async function handleSubscribe(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if (!isJson(request)) return noStoreJson({ error: 'unsupported_media_type' }, 415);
  const windowStart = hourStart(now);
  if ((await repo.hit(clientKey(request, salt, 'push'), windowStart)) > PUSH_LIMIT) return noStoreJson({ error: 'rate_limited' }, 429);

  const { body: b, error } = await readJson(request, PUSH_MAX_BODY);
  if (error) return error;

  const sub = b.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (typeof endpoint !== 'string' || !allowedEndpoint(endpoint)) return bad('subscription', 'Unsupported push service.');
  if (typeof p256dh !== 'string' || !/^[A-Za-z0-9_-]{20,200}$/.test(p256dh)) return bad('subscription', 'Bad p256dh key.');
  if (typeof auth !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(auth)) return bad('subscription', 'Bad auth secret.');

  const town = b.town;
  if (typeof town !== 'string' || !/^[a-z0-9-]{1,40}$/.test(town)) return bad('town', 'Choose a town.');
  const areas = b.areas ?? [];
  if (!Array.isArray(areas) || areas.length > 6 || areas.some((a) => typeof a !== 'string' || !/^[a-z0-9:_-]{1,60}$/.test(a))) {
    return bad('areas', 'Bad sections.');
  }
  const streams = b.streams ?? STREAMS;
  if (!Array.isArray(streams) || streams.length === 0 || streams.some((s) => !STREAMS.includes(s))) return bad('streams', `Use any of ${STREAMS.join(', ')}.`);
  const lang = b.lang ?? 'en';
  if (lang !== 'en' && lang !== 'es') return bad('lang', 'Use en or es.');

  if (!(await repo.isPublishedTown(town))) return bad('town', 'That town is not available yet.');
  const rows = await repo.schedulesForTown(town);
  if (rows.length === 0) return bad('town', 'That town has no verified schedule yet.');
  const v = validateAreas(rows, areas);
  if (!v.ok) return bad('areas', v.message);

  await repo.upsert({ endpoint, p256dh, auth, regionId: town, areaKeys: areas, streams: [...new Set(streams)], lang });
  return noStoreJson({ ok: true }, 201);
}

async function handleUnsubscribe(request, repo) {
  if (Number(request.headers.get('content-length') ?? 0) > PUSH_MAX_BODY) return noStoreJson({ error: 'too_large' }, 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > PUSH_MAX_BODY) return noStoreJson({ error: 'too_large' }, 413);
  let b;
  try {
    b = JSON.parse(raw);
  } catch {
    return noStoreJson({ error: 'invalid_json' }, 400);
  }
  if (typeof b?.endpoint !== 'string' || b.endpoint.length > 1000) return bad('endpoint', 'Missing endpoint.');
  await repo.remove(b.endpoint);
  return noStoreJson({ ok: true }, 200);
}

const STREAM_NAME = {
  en: { trash: 'trash', recycling: 'recycling', bulk: 'bulk pickup', yard: 'yard waste' },
  es: ES.streamNames,
};

function reminderText(lang, townName, streams, { moved = false, announcement = '' } = {}) {
  const names = streams.map((s) => STREAM_NAME[lang][s]);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} ${lang === 'es' ? 'y' : 'and'} ${names.at(-1)}` : names[0];
  const shifted = moved ? (lang === 'es' ? ' Esta fecha cambió por un feriado.' : ' This date moved because of a holiday.') : '';
  const extra = announcement ? ` ${announcement}` : '';
  return lang === 'es'
    ? { title: `Mañana: ${list}`, body: `Saque lo de ${list} esta noche. ${townName}.${shifted}${extra} Confirme con su municipio si hay cambios.` }
    : { title: `Tomorrow: ${list}`, body: `Set out your ${list} tonight. ${townName}.${shifted}${extra} Double check with your town for changes.` };
}

function pickupsOn(rows, sub, date) {
  const keys = new Set(sub.area_keys);
  const found = new Map();
  for (const r of rows) {
    if (r.area_key && !keys.has(r.area_key)) continue;
    if (!sub.streams.includes(r.stream)) continue;
    const o = occurrences(r, date, date)[0];
    if (o && !found.has(r.stream)) found.set(r.stream, { stream: r.stream, moved: !!o.moved, from: o.from ?? null });
  }
  return STREAMS.filter((s) => found.has(s)).map((s) => found.get(s));
}

async function handleReminders(request, repo, send, { secret = process.env.CRON_SECRET, now = new Date() } = {}) {
  if (!bearerMatches(request.headers.get('authorization') ?? '', secret)) return noStoreJson({ error: 'unauthorized' }, 401);
  const today = localParts(now).date;
  const tomorrow = addDays(today, 1);
  const subs = await repo.dueSubscriptions(today);
  const cache = new Map();
  const stats = { checked: subs.length, sent: 0, skipped: 0, removed: 0, failed: 0 };
  for (const sub of subs) {
    if (!cache.has(sub.region_id)) cache.set(sub.region_id, await repo.schedulesForTown(sub.region_id));
    const pickups = pickupsOn(cache.get(sub.region_id), sub, tomorrow);
    if (pickups.length === 0) { stats.skipped++; continue; }
    const townName = (await repo.townName(sub.region_id)) ?? sub.region_id;
    const notes = repo.activeAnnouncements ? await repo.activeAnnouncements(sub.region_id, tomorrow) : [];
    const announcement = notes[0] ? (sub.lang === 'es' && notes[0].message_es ? notes[0].message_es : notes[0].message_en) : '';
    try {
      const text = reminderText(sub.lang, townName, pickups.map((p) => p.stream), { moved: pickups.some((p) => p.moved), announcement });
      await send(sub, JSON.stringify({ ...text, date: tomorrow, town: sub.region_id }));
      await repo.markSent(sub.id, today);
      stats.sent++;
    } catch (err) {
      if (err?.statusCode === 404 || err?.statusCode === 410) { await repo.remove(sub.endpoint); stats.removed++; } else { await repo.fail(sub.id); stats.failed++; }
    }
  }
  return noStoreJson({ ok: true, date: tomorrow, ...stats }, 200);
}

const REPORT_LIMIT = 10;
const REPORT_MAX_BODY = 4 * 1024;
const KINDS = ['item_rule', 'schedule', 'facility', 'scan', 'other'];

async function handleReport(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if (!isJson(request)) return noStoreJson({ error: 'unsupported_media_type' }, 415);
  const windowStart = hourStart(now);
  if ((await repo.hit(clientKey(request, salt, 'reports'), windowStart)) > REPORT_LIMIT) return noStoreJson({ error: 'rate_limited' }, 429);

  const { body: b, error } = await readJson(request, REPORT_MAX_BODY);
  if (error) return error;

  if (!KINDS.includes(b.kind)) return badRequest('invalid_kind', { allowed: KINDS });
  const message = typeof b.message === 'string' ? b.message.trim() : '';
  if (message.length < 3 || message.length > 500) return badRequest('invalid_message', { message: 'Use 3 to 500 characters.' });
  for (const f of ['item', 'town', 'facility']) {
    if (b[f] !== undefined && !validId(b[f])) return badRequest(`invalid_${f}`);
  }
  if (b.town && !(await repo.isPublishedTown(b.town))) return badRequest('invalid_town');

  await repo.insertReport({ kind: b.kind, itemId: b.item ?? null, regionId: b.town ?? null, facilityKey: b.facility ?? null, message });
  return noStoreJson({ ok: true }, 201);
}

async function handleListReports(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const status = new URL(request.url).searchParams.get('status') ?? 'open';
  if (!['open', 'resolved', 'dismissed'].includes(status)) return badRequest('invalid_status');
  return noStoreJson({ status, reports: await repo.listReports(status) }, 200);
}

async function handleResolveReport(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const b = await readBody(request);
  if (b === undefined) return noStoreJson({ error: 'invalid_json' }, 400);
  if (typeof b?.id !== 'string' || !UUID.test(b.id)) return badRequest('invalid_id');
  if (!['resolved', 'dismissed'].includes(b.status)) return badRequest('invalid_status');
  const found = await repo.setReportStatus(b.id, b.status);
  return found ? noStoreJson({ ok: true }, 200) : noStoreJson({ error: 'not_found' }, 404);
}

const EVENT_LIMIT = 120;
const EVENT_MAX_BODY = 1024;
const OUTCOMES = ['recycling', 'trash', 'special_dropoff'];

const AVG_POUNDS = {
  rigid_plastic: 0.1, soft_plastic_foam: 0.05, cardboard_paper: 0.5, metal: 0.1, glass: 0.6, ewaste_hazard: 2, other: 0.3,
};
const estimatePounds = (rows) =>
  Math.round(rows.filter((r) => r.outcome !== 'trash').reduce((sum, r) => sum + r.n * (AVG_POUNDS[r.material] ?? AVG_POUNDS.other), 0));

async function handleEvent(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if (!isJson(request)) return noStoreJson({ error: 'unsupported_media_type' }, 415);
  const windowStart = hourStart(now);
  if ((await repo.hit(clientKey(request, salt, 'events'), windowStart)) > EVENT_LIMIT) return noStoreJson({ error: 'rate_limited' }, 429);

  const { body: b, error } = await readJson(request, EVENT_MAX_BODY);
  if (error) return error;

  if (!OUTCOMES.includes(b.outcome)) return badRequest('invalid_outcome', { allowed: OUTCOMES });
  const material = b.material ?? 'other';
  if (!MATERIALS.includes(material)) return badRequest('invalid_material', { allowed: MATERIALS });
  const town = b.town ?? '';
  if (town !== '' && (!validId(town) || !(await repo.isPublishedTown(town)))) return badRequest('invalid_town');

  await repo.count({ day: localParts(now).date, regionId: town, material, outcome: b.outcome });
  return noStoreJson({ ok: true }, 202);
}

async function handleStats(request, repo) {
  const town = new URL(request.url).searchParams.get('town');
  if (town !== null && !validId(town)) return badRequest('invalid_region');
  const rows = await repo.totals(town);
  const by = Object.fromEntries(OUTCOMES.map((o) => [o, 0]));
  for (const r of rows) by[r.outcome] += r.n;
  const items = OUTCOMES.reduce((s, o) => s + by[o], 0);
  return jsonWithEtag(request, {
    town,
    items_sorted: items,
    by_outcome: by,
    estimated_pounds_diverted: estimatePounds(rows),
    note: 'Pounds are an estimate from average item weights. Counts are anonymous.',
  }, { maxAge: 60, sMaxAge: 300 });
}

const TYPES = ['household', 'furniture', 'appliances', 'electronics', 'tires', 'construction', 'yard', 'hazardous', 'other'];
const STATUSES = ['new', 'noticed', 'progress', 'resolved'];
const SUBMIT_PER_HOUR = 5;
const TRACK_PER_HOUR = 60;
const REPLY_PER_HOUR = 10;
const MAX_MESSAGES = 50;
const MIN_GROUP = 3;
const CELL_DEG = 0.005;
const DUMP_MAX_BODY = 3 * 1024 * 1024;
const MAX_PHOTO = 2 * 1024 * 1024;
const CODE_RE = /^DG-[A-Z0-9]{5}$/;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const inNj = (lat, lng) => lat >= 38.9 && lat <= 41.4 && lng >= -75.6 && lng <= -73.8;
const newCode = () => 'DG-' + Array.from({ length: 5 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');

function stripJpeg(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  const out = [buf.subarray(0, 2)];
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    while (buf[i] === 0xff && i < buf.length) i++;
    const marker = buf[i++];
    if (marker === undefined) return null;
    if (marker === 0xd9) { out.push(Buffer.from([0xff, 0xd9])); return Buffer.concat(out); }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { out.push(Buffer.from([0xff, marker])); continue; }
    if (i + 2 > buf.length) return null;
    const len = buf.readUInt16BE(i);
    if (len < 2 || i + len > buf.length) return null;
    const keep = !(marker >= 0xe0 && marker <= 0xef) && marker !== 0xfe;
    if (keep) out.push(Buffer.from([0xff, marker]), buf.subarray(i, i + len));
    i += len;
    if (marker === 0xda) {
      out.push(buf.subarray(i));
      const all = Buffer.concat(out);
      return all.length > 4 && all[all.length - 2] === 0xff && all[all.length - 1] === 0xd9 ? all : null;
    }
  }
  return null;
}

async function censusGeocode(address, fetchFn = fetch) {
  try {
    const u = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress');
    u.search = new URLSearchParams({ address, benchmark: 'Public_AR_Current', format: 'json' });
    const r = await fetchFn(u, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return null;
    const c = (await r.json())?.result?.addressMatches?.[0]?.coordinates;
    return c && inNj(c.y, c.x) ? { lat: c.y, lng: c.x } : null;
  } catch {
    return null;
  }
}

const text = (v, min, max) => (typeof v === 'string' && v.trim().length >= min && v.trim().length <= max ? v.trim() : null);

async function handleDumpingReport(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '', geocode = censusGeocode } = {}) {
  if (!isJson(request)) return noStoreJson({ error: 'unsupported_media_type' }, 415);
  if ((await repo.hit(clientKey(request, salt, 'dump-submit'), hourStart(now))) > SUBMIT_PER_HOUR) return noStoreJson({ error: 'rate_limited' }, 429);
  if (Number(request.headers.get('content-length') ?? 0) > DUMP_MAX_BODY) return noStoreJson({ error: 'too_large' }, 413);
  const { body: b, error } = await readJson(request, DUMP_MAX_BODY);
  if (error) return error;

  if (!validId(b.town) || !(await repo.isPublishedTown(b.town))) return badRequest('invalid_town');
  if (!TYPES.includes(b.type)) return badRequest('invalid_type', { allowed: TYPES });
  const where = text(b.where, 3, 200);
  if (!where) return badRequest('invalid_location', { message: 'Use 3 to 200 characters.' });
  const description = text(b.description, 3, 500);
  if (!description) return badRequest('invalid_description', { message: 'Use 3 to 500 characters.' });
  let notes = null;
  if (b.notes !== undefined && b.notes !== null && b.notes !== '') {
    notes = text(b.notes, 1, 500);
    if (!notes) return badRequest('invalid_notes', { message: 'Up to 500 characters.' });
  }

  let lat = null, lng = null;
  if (b.lat !== undefined || b.lng !== undefined) {
    if (typeof b.lat !== 'number' || typeof b.lng !== 'number' || !inNj(b.lat, b.lng)) return badRequest('invalid_coordinates', { message: 'Coordinates must be in New Jersey.' });
    lat = b.lat; lng = b.lng;
  }

  let photo = null;
  if (b.photo !== undefined && b.photo !== null && b.photo !== '') {
    if (typeof b.photo !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(b.photo)) return badRequest('invalid_photo');
    const bytes = Buffer.from(b.photo, 'base64');
    if (bytes.length > MAX_PHOTO) return noStoreJson({ error: 'photo_too_large' }, 413);
    photo = stripJpeg(bytes);
    if (!photo) return badRequest('invalid_photo', { message: 'Photo must be a JPEG.' });
  }

  if (lat === null) {
    const g = await geocode(`${where}, ${b.town.replace(/-/g, ' ')}, NJ`);
    if (g) { lat = g.lat; lng = g.lng; }
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    if (await repo.insertDump({ code, regionId: b.town, type: b.type, where, description, notes, lat, lng, photo })) {
      return noStoreJson({ ok: true, code, located: lat !== null, photo: photo !== null }, 201);
    }
  }
  return noStoreJson({ error: 'server_error' }, 500);
}

async function handleDumpingTrack(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if ((await repo.hit(clientKey(request, salt, 'dump-track'), hourStart(now))) > TRACK_PER_HOUR) return noStoreJson({ error: 'rate_limited' }, 429);
  const code = (new URL(request.url).searchParams.get('code') ?? '').trim().toUpperCase();
  if (!CODE_RE.test(code)) return badRequest('invalid_code');
  const row = await repo.dumpByCode(code);
  if (!row) return noStoreJson({ error: 'not_found' }, 404);
  return noStoreJson({ code, status: row.status, town: row.region_id, type: row.dump_type, created_at: row.created_at, updated_at: row.updated_at }, 200);
}

function buildMap(pointRows, townRows) {
  const cells = new Map();
  for (const r of pointRows) {
    const k = `${r.cx}:${r.cy}`;
    const c = cells.get(k) ?? { cx: r.cx, cy: r.cy, n: 0, joint: new Map(), towns: new Set() };
    c.n++;
    c.towns.add(r.region_id);
    const jk = `${r.status}|${r.dump_type}`;
    c.joint.set(jk, (c.joint.get(jk) ?? 0) + 1);
    cells.set(k, c);
  }
  const round = (v) => Math.round(v * 1e6) / 1e6;
  return {
    min_group: MIN_GROUP,
    cells: [...cells.values()].filter((c) => c.n >= MIN_GROUP).map((c) => {
      const towns = [...c.towns];
      return {
        lat: round((c.cy + 0.5) * CELL_DEG), lng: round((c.cx + 0.5) * CELL_DEG), radius_m: 350,
        n: c.n, town: towns.length === 1 ? towns[0] : null, towns,
        groups: [...c.joint].map(([k, n]) => ({ status: k.split('|')[0], type: k.split('|')[1], n })),
      };
    }),
    towns: townRows.map((t) => ({ town: t.region_id, name: t.name, counts: Object.fromEntries(STATUSES.map((s) => [s, t[s] ?? 0])) })),
  };
}

async function handleDumpingMap(repo) {
  const body = buildMap(await repo.mapPoints(), await repo.townStatusCounts());
  return json(body, 200, { 'cache-control': 'public, max-age=60, s-maxage=300' });
}

async function handleAdminDumping(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const q = new URL(request.url).searchParams;
  const status = q.get('status'), town = q.get('town');
  if (status && !STATUSES.includes(status)) return badRequest('invalid_status');
  if (town && !validId(town)) return badRequest('invalid_town');
  return noStoreJson({ reports: await repo.listDumps({ status: status || null, town: town || null }) }, 200);
}

async function handleAdminDumpingPhoto(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!UUID.test(id)) return badRequest('invalid_id');
  const bytes = await repo.dumpPhoto(id);
  if (!bytes) return noStoreJson({ error: 'not_found' }, 404);
  return new Response(bytes, { status: 200, headers: { 'content-type': 'image/jpeg', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', 'content-disposition': 'inline' } });
}

async function handleAdminDumpingStatus(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const b = await readBody(request);
  if (b === undefined) return noStoreJson({ error: 'invalid_json' }, 400);
  if (typeof b?.id !== 'string' || !UUID.test(b.id)) return badRequest('invalid_id');
  if (!STATUSES.includes(b.status)) return badRequest('invalid_status', { allowed: STATUSES });
  return (await repo.setDumpStatus(b.id, b.status)) ? noStoreJson({ ok: true }, 200) : noStoreJson({ error: 'not_found' }, 404);
}

async function handleAdminDumpingMessages(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!UUID.test(id)) return badRequest('invalid_id');
  if (!(await repo.dumpExists(id))) return noStoreJson({ error: 'not_found' }, 404);
  const rows = await repo.listMessages(id);
  return noStoreJson({ messages: rows.map((m) => ({ from: m.from_staff ? 'staff' : 'reporter', body: m.body, at: m.created_at })) }, 200);
}

async function handleAdminDumpingMessage(request, repo, { token, now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  const denied = await staffOnly(request, repo, token, now, salt);
  if (denied) return denied;
  const b = await readBody(request);
  if (!b) return noStoreJson({ error: 'invalid_json' }, 400);
  if (typeof b.id !== 'string' || !UUID.test(b.id)) return badRequest('invalid_id');
  const body = text(b.body, 1, 500);
  if (!body) return badRequest('invalid_message');
  if (!(await repo.dumpExists(b.id))) return noStoreJson({ error: 'not_found' }, 404);
  if ((await repo.countMessages(b.id)) >= MAX_MESSAGES) return noStoreJson({ error: 'thread_full' }, 409);
  await repo.addMessage(b.id, true, body);
  return noStoreJson({ ok: true }, 201);
}

async function handleDumpingMessages(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if ((await repo.hit(clientKey(request, salt, 'dump-track'), hourStart(now))) > TRACK_PER_HOUR) return noStoreJson({ error: 'rate_limited' }, 429);
  const code = (new URL(request.url).searchParams.get('code') ?? '').trim().toUpperCase();
  if (!CODE_RE.test(code)) return badRequest('invalid_code');
  const id = await repo.dumpIdByCode(code);
  if (!id) return noStoreJson({ error: 'not_found' }, 404);
  const rows = await repo.listMessages(id);
  return noStoreJson({ messages: rows.map((m) => ({ from: m.from_staff ? 'staff' : 'you', body: m.body, at: m.created_at })) }, 200);
}

async function handleDumpingReply(request, repo, { now = new Date(), salt = process.env.RATE_LIMIT_SALT ?? '' } = {}) {
  if (!isJson(request)) return noStoreJson({ error: 'unsupported_media_type' }, 415);
  if ((await repo.hit(clientKey(request, salt, 'dump-reply'), hourStart(now))) > REPLY_PER_HOUR) return noStoreJson({ error: 'rate_limited' }, 429);
  const b = await readBody(request);
  if (!b) return noStoreJson({ error: 'invalid_json' }, 400);
  const code = typeof b.code === 'string' ? b.code.trim().toUpperCase() : '';
  if (!CODE_RE.test(code)) return badRequest('invalid_code');
  const body = text(b.body, 1, 500);
  if (!body) return badRequest('invalid_message');
  const id = await repo.dumpIdByCode(code);
  if (!id) return noStoreJson({ error: 'not_found' }, 404);
  const rows = await repo.listMessages(id);
  if (!rows.some((m) => m.from_staff)) return noStoreJson({ error: 'no_thread' }, 409);
  if (rows.length >= MAX_MESSAGES) return noStoreJson({ error: 'thread_full' }, 409);
  await repo.addMessage(id, false, body);
  return noStoreJson({ ok: true }, 201);
}

let pool;
function getPool() {
  pool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  return pool;
}

function makeRepo(db = getPool()) {
  return {
    async townsForZip(zip) {
      const { rows } = await db.query(
        `SELECT r.id, r.name
           FROM zip_codes z JOIN regions r ON r.id = z.region_id
          WHERE z.zip = $1 AND r.published AND r.kind = 'town'
          ORDER BY r.name`,
        [zip],
      );
      return rows;
    },
    async ping() {
      const { rows } = await db.query('SELECT 1 AS ok');
      return rows[0].ok === 1;
    },
    async region(id) {
      const { rows } = await db.query(
        `SELECT id, kind, name, county_id FROM regions WHERE id = $1 AND (kind <> 'town' OR published)`,
        [id],
      );
      return rows[0] ?? null;
    },
    async publishedTowns() {
      const { rows } = await db.query(
        `SELECT r.id, r.name, r.county_id AS county,
                COALESCE(array_agg(z.zip ORDER BY z.zip) FILTER (WHERE z.zip IS NOT NULL), '{}') AS zips
           FROM regions r LEFT JOIN zip_codes z ON z.region_id = r.id
          WHERE r.kind = 'town' AND r.published
          GROUP BY r.id ORDER BY r.name`,
      );
      return rows;
    },
    async facilitiesForTowns(townIds, material = null) {
      const { rows } = await db.query(
        `SELECT f.key, f.region_id AS region, f.name, f.address, f.zip, f.phone, f.hours, f.residents_only,
                f.lat, f.lng, f.hours_struct, f.accepts::text[] AS accepts, f.notes_en, f.notes_es
           FROM public_facilities f
          WHERE (f.region_id = ANY($1) OR f.region_id IN (SELECT county_id FROM regions WHERE id = ANY($1)))
            AND ($2::material_t IS NULL OR $2::material_t = ANY(f.accepts))
          ORDER BY f.region_id, f.name`,
        [townIds, material],
      );
      return rows;
    },
    async allFacilities(material = null) {
      const { rows } = await db.query(
        `SELECT f.key, f.region_id AS region, f.name, f.address, f.zip, f.phone, f.hours, f.residents_only,
                f.lat, f.lng, f.hours_struct, f.accepts::text[] AS accepts, f.notes_en, f.notes_es
           FROM public_facilities f
          WHERE ($1::material_t IS NULL OR $1::material_t = ANY(f.accepts))
          ORDER BY f.region_id, f.name`,
        [material],
      );
      return rows;
    },
    async itemsBundle({ id = null } = {}) {
      const [items, aliases, rules, facilities] = await Promise.all([
        db.query(
          `SELECT id, name_en, name_es, material, default_rule, hazard, varies_by_town,
                  prep_en, prep_es FROM items WHERE ($1::text IS NULL OR id = $1) ORDER BY id`,
          [id],
        ),
        db.query(`SELECT item_id, alias FROM item_aliases WHERE ($1::text IS NULL OR item_id = $1) ORDER BY alias`, [id]),
        db.query(
          `SELECT r.item_id, r.region_id, r.rule, r.note_en, r.note_es, r.facility_key
             FROM public_item_rules r JOIN regions g ON g.id = r.region_id AND (g.kind <> 'town' OR g.published)
            WHERE ($1::text IS NULL OR r.item_id = $1)`,
          [id],
        ),
        db.query(
          `SELECT f.key, f.region_id AS region, f.name, f.address, f.zip, f.phone, f.hours, f.residents_only,
                  f.lat, f.lng, f.hours_struct, f.accepts::text[] AS accepts, f.notes_en, f.notes_es
             FROM public_facilities f WHERE f.key IS NOT NULL ORDER BY f.key`,
        ),
      ]);
      const byItem = new Map(items.rows.map((r) => [r.id, {
        id: r.id, name: { en: r.name_en, es: r.name_es }, aliases: [], material: r.material, default_rule: r.default_rule,
        hazard: r.hazard, varies_by_town: r.varies_by_town,
        prep: { en: r.prep_en, es: r.prep_es }, rules: {},
      }]));
      for (const a of aliases.rows) byItem.get(a.item_id)?.aliases.push(a.alias);
      for (const r of rules.rows) {
        byItem.get(r.item_id).rules[r.region_id] = {
          rule: r.rule, note: { en: r.note_en, es: r.note_es }, facility_key: r.facility_key,
        };
      }
      return { items: [...byItem.values()], facilities: facilities.rows };
    },
    async schedulesForTown(townId) {
      const { rows } = await db.query(
        `SELECT id, stream, weekday, week_pattern, area_key, area_note, rrule,
                to_char(dtstart, 'YYYY-MM-DD') AS dtstart, overrides, dates, notes_en, notes_es
           FROM public_schedules
          WHERE region_id = $1
          ORDER BY stream, area_key, weekday`,
        [townId],
      );
      return rows.map((r) => ({ ...r, id: Number(r.id) }));
    },
  };
}

function makeBulkRepo(db = getPool()) {
  return {
    async isPublishedTown(id) {
      const { rows } = await db.query(`SELECT 1 FROM regions WHERE id = $1 AND kind = 'town' AND published`, [id]);
      return rows.length > 0;
    },
    async hit(key, windowStartIso) {
      const { rows } = await db.query(
        `INSERT INTO rate_limits (key, window_start, hits) VALUES ($1, $2, 1)
         ON CONFLICT (key, window_start) DO UPDATE SET hits = rate_limits.hits + 1
         RETURNING hits`,
        [key, windowStartIso],
      );
      return rows[0].hits;
    },
    async insert({ regionId, email, description, preferredDate }) {
      const { rows } = await db.query(
        `INSERT INTO bulk_requests (region_id, contact_email, description, preferred_date)
         VALUES ($1, $2, $3, $4) RETURNING id, expires_at`,
        [regionId, email, description, preferredDate],
      );
      return { id: rows[0].id, expiresAt: rows[0].expires_at.toISOString() };
    },
    async purge() {
      const { rowCount } = await db.query(`SELECT purge_expired()`);
      return rowCount;
    },
  };
}

function makePushRepo(db = getPool()) {
  return {
    ...makeRepo(db),
    ...makeBulkRepo(db),
    ...announcementMethods(db),
    async townName(id) {
      const { rows } = await db.query(`SELECT name FROM regions WHERE id = $1`, [id]);
      return rows[0]?.name ?? null;
    },
    async upsert({ endpoint, p256dh, auth, regionId, areaKeys, streams, lang }) {
      await db.query(
        `INSERT INTO push_subscriptions (endpoint, p256dh, auth, region_id, area_keys, streams, lang)
         VALUES ($1,$2,$3,$4,$5,$6::stream_t[],$7)
         ON CONFLICT (endpoint) DO UPDATE SET p256dh = $2, auth = $3, region_id = $4, area_keys = $5, streams = $6::stream_t[],
           lang = $7, failures = 0, expires_at = now() + interval '1 year'`,
        [endpoint, p256dh, auth, regionId, areaKeys, streams, lang],
      );
    },
    async remove(endpoint) {
      await db.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);
    },
    async dueSubscriptions(today) {
      const { rows } = await db.query(
        `SELECT s.id, s.endpoint, s.p256dh, s.auth, s.region_id, s.area_keys, s.streams::text[] AS streams, s.lang
           FROM push_subscriptions s JOIN regions g ON g.id = s.region_id AND g.published
          WHERE (s.last_sent_on IS NULL OR s.last_sent_on < $1::date) AND s.expires_at > now() AND s.failures < 5`,
        [today],
      );
      return rows;
    },
    async markSent(id, today) {
      await db.query(`UPDATE push_subscriptions SET last_sent_on = $2::date, failures = 0 WHERE id = $1`, [id, today]);
    },
    async fail(id) {
      await db.query(`UPDATE push_subscriptions SET failures = failures + 1 WHERE id = $1`, [id]);
    },
  };
}

function announcementMethods(db) {
  return {
    async activeAnnouncements(townId, date) {
      const { rows } = await db.query(
        `SELECT id, region_id, message_en, message_es, source_url, to_char(starts_on, 'YYYY-MM-DD') AS starts_on,
                to_char(ends_on, 'YYYY-MM-DD') AS ends_on
           FROM announcements
          WHERE (region_id IS NULL OR region_id = $1) AND starts_on <= $2::date AND ends_on >= $2::date
          ORDER BY created_at DESC LIMIT 5`,
        [townId, date],
      );
      return rows;
    },
    async createAnnouncement({ regionId, messageEn, messageEs, sourceUrl, startsOn, endsOn }) {
      const { rows } = await db.query(
        `INSERT INTO announcements (region_id, message_en, message_es, source_url, starts_on, ends_on)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [regionId, messageEn, messageEs, sourceUrl, startsOn, endsOn],
      );
      return rows[0].id;
    },
    async deleteAnnouncement(id) {
      await db.query(`DELETE FROM announcements WHERE id = $1`, [id]);
    },
  };
}

function makeAlertsRepo(db = getPool()) {
  return { ...makeRepo(db), ...makeBulkRepo(db), ...announcementMethods(db) };
}

function makeImpactRepo(db = getPool()) {
  const bulk = makeBulkRepo(db);
  return {
    hit: bulk.hit,
    isPublishedTown: bulk.isPublishedTown,
    async count({ day, regionId, material, outcome }) {
      await db.query(
        `INSERT INTO impact_counts (day, region_id, material, outcome, n) VALUES ($1, $2, $3, $4, 1)
         ON CONFLICT (day, region_id, material, outcome) DO UPDATE SET n = impact_counts.n + 1`,
        [day, regionId, material, outcome],
      );
    },
    async totals(town) {
      const { rows } = await db.query(
        `SELECT material, outcome, sum(n)::int AS n FROM impact_counts WHERE ($1::text IS NULL OR region_id = $1) GROUP BY material, outcome`,
        [town],
      );
      return rows;
    },
  };
}

function makeReportsRepo(db = getPool()) {
  const bulk = makeBulkRepo(db);
  return {
    hit: bulk.hit,
    isPublishedTown: bulk.isPublishedTown,
    async insertReport({ kind, itemId, regionId, facilityKey, message }) {
      await db.query(
        `INSERT INTO reports (kind, item_id, region_id, facility_key, message) VALUES ($1, $2, $3, $4, $5)`,
        [kind, itemId, regionId, facilityKey, message],
      );
    },
    async listReports(status) {
      const { rows } = await db.query(
        `SELECT id, kind, item_id, region_id, facility_key, message, status, created_at, resolved_at
           FROM reports WHERE status = $1 ORDER BY created_at LIMIT 200`,
        [status],
      );
      return rows;
    },
    async setReportStatus(id, status) {
      const { rowCount } = await db.query(`UPDATE reports SET status = $2, resolved_at = now() WHERE id = $1`, [id, status]);
      return rowCount > 0;
    },
  };
}

function makeDumpingRepo(db = getPool()) {
  const bulk = makeBulkRepo(db);
  return {
    hit: bulk.hit,
    isPublishedTown: bulk.isPublishedTown,
    async insertDump({ code, regionId, type, where, description, notes, lat, lng, photo }) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          `INSERT INTO dump_reports (code, region_id, dump_type, location_text, description, notes, lat, lng)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (code) DO NOTHING RETURNING id`,
          [code, regionId, type, where, description, notes, lat, lng],
        );
        if (!rows.length) { await client.query('ROLLBACK'); return false; }
        if (photo) await client.query(`INSERT INTO dump_photos (report_id, bytes) VALUES ($1,$2)`, [rows[0].id, photo]);
        await client.query('COMMIT');
        return true;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    async dumpByCode(code) {
      const { rows } = await db.query(`SELECT status, region_id, dump_type, created_at, updated_at FROM dump_reports WHERE code = $1`, [code]);
      return rows[0] ?? null;
    },
    async mapPoints() {
      const { rows } = await db.query(
        `SELECT floor(lng / $1)::int AS cx, floor(lat / $1)::int AS cy, status, dump_type, region_id
           FROM dump_reports WHERE lat IS NOT NULL AND created_at > now() - interval '180 days' LIMIT 5000`,
        [0.005],
      );
      return rows;
    },
    async townStatusCounts() {
      const { rows } = await db.query(
        `SELECT r.id AS region_id, r.name,
                count(*) FILTER (WHERE d.status = 'new')::int AS new, count(*) FILTER (WHERE d.status = 'noticed')::int AS noticed,
                count(*) FILTER (WHERE d.status = 'progress')::int AS progress, count(*) FILTER (WHERE d.status = 'resolved')::int AS resolved
           FROM regions r LEFT JOIN dump_reports d ON d.region_id = r.id
          WHERE r.kind = 'town' AND r.published GROUP BY r.id, r.name ORDER BY r.name`,
      );
      return rows;
    },
    async listDumps({ status, town }) {
      const cols = `d.id, d.code, d.region_id, d.dump_type, d.location_text, d.description, d.notes, d.lat, d.lng, d.status,
                d.created_at, d.updated_at, (p.report_id IS NOT NULL) AS has_photo`;
      const msgs = `, (SELECT count(*)::int FROM dump_messages m WHERE m.report_id = d.id) AS msg_count,
                (SELECT m.from_staff FROM dump_messages m WHERE m.report_id = d.id ORDER BY m.created_at DESC LIMIT 1) AS last_from_staff`;
      const tail = `FROM dump_reports d LEFT JOIN dump_photos p ON p.report_id = d.id
          WHERE ($1::text IS NULL OR d.status = $1::dump_status_t) AND ($2::text IS NULL OR d.region_id = $2)
          ORDER BY d.created_at DESC LIMIT 500`;
      try {
        return (await db.query(`SELECT ${cols}${msgs} ${tail}`, [status, town])).rows;
      } catch (err) {
        if (err?.code !== '42P01') throw err;
        return (await db.query(`SELECT ${cols} ${tail}`, [status, town])).rows;
      }
    },
    async dumpIdByCode(code) {
      const { rows } = await db.query(`SELECT id FROM dump_reports WHERE code = $1`, [code]);
      return rows[0]?.id ?? null;
    },
    async dumpExists(id) {
      const { rows } = await db.query(`SELECT 1 FROM dump_reports WHERE id = $1`, [id]);
      return rows.length > 0;
    },
    async listMessages(reportId) {
      const { rows } = await db.query(
        `SELECT id, from_staff, body, created_at FROM dump_messages WHERE report_id = $1 ORDER BY created_at LIMIT 100`, [reportId]);
      return rows;
    },
    async countMessages(reportId) {
      const { rows } = await db.query(`SELECT count(*)::int AS n FROM dump_messages WHERE report_id = $1`, [reportId]);
      return rows[0].n;
    },
    async addMessage(reportId, fromStaff, body) {
      await db.query(`INSERT INTO dump_messages (report_id, from_staff, body) VALUES ($1,$2,$3)`, [reportId, fromStaff, body]);
    },
    async dumpPhoto(id) {
      const { rows } = await db.query(`SELECT bytes FROM dump_photos WHERE report_id = $1`, [id]);
      return rows[0]?.bytes ?? null;
    },
    async setDumpStatus(id, status) {
      const { rowCount } = await db.query(`UPDATE dump_reports SET status = $2, updated_at = now() WHERE id = $1`, [id, status]);
      return rowCount > 0;
    },
  };
}

function makeSender(env = process.env) {
  const { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subject } = env;
  if (!pub || !priv || !subject) return null;
  webpush.setVapidDetails(subject, pub, priv);
  return (sub, payload) =>
    webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 6 * 3600, urgency: 'normal' });
}

let streetLookup;
const streets = () =>
  (streetLookup ??= buildStreetLookup(
    JSON.parse(readFileSync(new URL('../data/streets.json', import.meta.url), 'utf8')),
  ));

const NATIVE_ORIGINS = new Set(['https://localhost']);

function cors(res, request) {
  const configured = process.env.ALLOWED_ORIGIN;
  const asked = request?.headers.get('origin');
  const native = !configured && NATIVE_ORIGINS.has(asked) ? asked : null;
  const origin = configured ?? native;
  const h = new Headers(res.headers);
  h.set('access-control-allow-origin', origin ?? '*');
  h.set('access-control-allow-methods', origin ? 'GET, POST, DELETE, OPTIONS' : 'GET, OPTIONS');
  if (native) h.set('vary', 'Origin');
  h.set('access-control-allow-headers', 'content-type, if-none-match, authorization');
  h.set('x-content-type-options', 'nosniff');
  return new Response(res.body, { status: res.status, headers: h });
}

async function route(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace(/^\/api\/v1/, '').replace(/\/+$/, '') || '/';
  const m = request.method;
  let seg;

  if (m === 'POST' && path === '/bulk-request') return handleBulkRequest(request, makeBulkRepo());
  if (m === 'POST' && path === '/admin/alerts') return handleCreateAlert(request, makeAlertsRepo());
  if (m === 'DELETE' && path === '/admin/alerts') return handleDeleteAlert(request, makeAlertsRepo());
  if (m === 'POST' && path === '/reports') return handleReport(request, makeReportsRepo());
  if (m === 'POST' && path === '/admin/reports/resolve') return handleResolveReport(request, makeReportsRepo());
  if (m === 'POST' && path === '/dumping') return handleDumpingReport(request, makeDumpingRepo());
  if (m === 'POST' && path === '/dumping/reply') return handleDumpingReply(request, makeDumpingRepo());
  if (m === 'POST' && path === '/admin/dumping/message') return handleAdminDumpingMessage(request, makeDumpingRepo());
  if (m === 'POST' && path === '/admin/dumping/status') return handleAdminDumpingStatus(request, makeDumpingRepo());
  if (m === 'POST' && path === '/events') return handleEvent(request, makeImpactRepo());
  if (m === 'POST' && path === '/push/subscribe') return handleSubscribe(request, makePushRepo());
  if (m === 'POST' && path === '/push/unsubscribe') return handleUnsubscribe(request, makePushRepo());
  if (m !== 'GET' && m !== 'HEAD') return json({ error: 'method_not_allowed' }, 405, { 'cache-control': 'no-store' });

  if (path === '/health') return handleHealth(makeRepo());
  if (path === '/admin/reports') return handleListReports(request, makeReportsRepo());
  if (path === '/dumping/track') return handleDumpingTrack(request, makeDumpingRepo());
  if (path === '/dumping/messages') return handleDumpingMessages(request, makeDumpingRepo());
  if (path === '/admin/dumping/messages') return handleAdminDumpingMessages(request, makeDumpingRepo());
  if (path === '/dumping/map') return handleDumpingMap(makeDumpingRepo());
  if (path === '/admin/dumping') return handleAdminDumping(request, makeDumpingRepo());
  if (path === '/admin/dumping/photo') return handleAdminDumpingPhoto(request, makeDumpingRepo());
  if (path === '/stats') return handleStats(request, makeImpactRepo());
  if (path === '/alerts') return handleAlerts(request, makeAlertsRepo());
  if (path === '/push/key') return handlePushKey();
  if (path === '/cron/reminders') {
    const send = makeSender();
    if (!send) return json({ error: 'push_not_configured' }, 503, { 'cache-control': 'no-store' });
    return handleReminders(request, makePushRepo(), send);
  }
  if (path === '/cron/purge') return handlePurge(request, makeBulkRepo());
  if (path === '/meta') return jsonWithEtag(request, { check_with_town: CHECK_WITH_TOWN, bulk_demo_notice: BULK_DEMO_NOTICE });
  if (path === '/towns') return handleTowns(request, makeRepo());
  if (path === '/facilities') return handleFacilities(request, makeRepo());
  if (path === '/search') return handleSearch(request, makeRepo());
  if (path === '/items') return handleItems(request, makeRepo());
  if (path === '/woodbridge/streets') return handleWoodbridgeStreets(request, streets());
  if ((seg = path.match(/^\/materials\/([a-z_]+)$/))) return handleMaterial(request, seg[1], makeRepo());
  if ((seg = path.match(/^\/items\/([^/]+)$/))) return handleItem(request, decodeURIComponent(seg[1]), makeRepo());
  if ((seg = path.match(/^\/schedule\/([^/]+)$/))) return handleSchedule(request, decodeURIComponent(seg[1]), makeRepo());
  return json({ error: 'not_found' }, 404, { 'cache-control': 'public, s-maxage=60' });
}

async function handle(request) {
  if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }), request);
  try {
    return cors(await route(request), request);
  } catch (err) {
    console.error(err);
    return cors(json({ error: 'server_error' }, 500, { 'cache-control': 'no-store' }), request);
  }
}

export default { fetch: handle };
