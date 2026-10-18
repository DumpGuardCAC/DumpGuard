import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { occurrences } from '../lib/occurrences.mjs';
import { buildIcs } from '../lib/ics.mjs';
import { handleSchedule } from '../lib/schedule.mjs';

const towns = JSON.parse(readFileSync(new URL('../../../data/towns.json', import.meta.url), 'utf8'));
const rows = towns.schedules.map((r, i) => ({ id: i + 1, dtstart: null, overrides: [], area_key: '', rrule: null, last_verified: '2026-10-06', ...r }));
const row = (region, stream, key, weekday) =>
  rows.find((r) => r.region === region && r.stream === stream && r.area_key === key && (weekday === undefined || r.weekday === weekday));
const dates = (r, a, b) => occurrences(r, a, b).map((o) => o.date);

test('Edison RS 6: alternate Mondays plus holiday move, matches the printed calendar', () => {
  const rs6 = row('edison', 'recycling', 'rs-6');
  assert.deepEqual(dates(rs6, '2026-01-01', '2026-03-10'), ['2026-01-05', '2026-01-20', '2026-02-02', '2026-02-17', '2026-03-02']);
  // Memorial Day May 25 -> Tue May 26 (calendar: "RS #6 & 7" on May 26)
  assert.deepEqual(dates(rs6, '2026-05-01', '2026-06-01'), ['2026-05-11', '2026-05-26']);
});

test('Edison RS 10 holiday moves: Good Friday, Thanksgiving weekend, Christmas', () => {
  const rs10 = row('edison', 'recycling', 'rs-10');
  assert.ok(dates(rs10, '2026-04-01', '2026-04-05').includes('2026-04-02'));
  assert.ok(!dates(rs10, '2026-04-01', '2026-04-05').includes('2026-04-03'));
  assert.ok(dates(rs10, '2026-11-20', '2026-11-30').includes('2026-11-25'));
  assert.deepEqual(dates(rs10, '2026-12-01', '2026-12-31'), ['2026-12-11', '2026-12-24']);
});

test('Edison New Year: RS 4 moved from Jan 1 into the range, RS 5 moves Dec 31', () => {
  assert.ok(dates(row('edison', 'recycling', 'rs-4'), '2026-01-01', '2026-01-05').includes('2026-01-02'));
  assert.ok(dates(row('edison', 'recycling', 'rs-5'), '2026-12-25', '2027-01-05').includes('2026-12-31'));
});

test('Asbury Park zone 1A garbage is seasonal', () => {
  const zone = rows.filter((r) => r.region === 'asbury-park' && r.stream === 'trash' && r.area_key === 'zone-1a');
  const all = (a, b) => zone.flatMap((r) => dates(r, a, b)).sort();
  assert.deepEqual(all('2026-02-02', '2026-02-08'), ['2026-02-02', '2026-02-06']);            // Mon, Fri
  assert.deepEqual(all('2026-07-06', '2026-07-12'), ['2026-07-06', '2026-07-08', '2026-07-10']); // Mon, Wed, Fri
});

test('unsupported rrule throws', () => {
  assert.throws(() => occurrences({ rrule: 'FREQ=MONTHLY;BYDAY=MO' }, '2026-01-01', '2026-02-01'));
});

test('ics: valid structure, CRLF, folded lines, moved events, EXDATE', () => {
  const edison = rows.filter((r) => r.region === 'edison' && (r.area_key === 'rs-6' || r.area_key === ''));
  const ics = buildIcs({ townName: 'Edison', rows: edison, today: '2026-05-01', now: new Date('2026-05-01T12:00:00Z') });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, (ics.match(/END:VEVENT/g) ?? []).length);
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20260511'));
  assert.ok(ics.includes('RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO;UNTIL=20261231'));
  assert.ok(ics.includes('EXDATE;VALUE=DATE:20260525'));
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20260526') && ics.includes('moved (Memorial Day)'));
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  assert.ok(!/[–—]/.test(ics));
});

// ---- handler flows with a fake repo ----
const fakeRepo = (zipMap) => ({
  townsForZip: async (zip) => zipMap[zip] ?? [],
  schedulesForTown: async (id) => rows.filter((r) => r.region === id && r.status === 'verified'),
});
const edison = { id: 'edison', name: 'Edison' };
const repo = fakeRepo({ '08817': [edison], '07712': [{ id: 'asbury-park', name: 'Asbury Park' }], '99999': [edison, { id: 'woodbridge', name: 'Woodbridge' }] });
const call = (path, zip) => handleSchedule(new Request(`http://x/api/v1/schedule/${zip}${path}`), zip, repo, { today: '2026-05-01' });

test('handler: validation and not-covered', async () => {
  assert.equal((await call('', 'abc')).status, 400);
  assert.equal((await call('', '00000')).status, 404);
  assert.equal((await call('?format=pdf', '08817')).status, 400);
});

test('handler: asks for the area first, then returns schedules', async () => {
  const first = await (await call('', '08817')).json();
  assert.equal(first.needs, 'area');
  assert.deepEqual([...first.groups].sort(), ['area', 'garbage']);
  assert.equal(first.areas.filter((a) => a.group === 'area').length, 10);
  assert.equal((await call('?area=rs-99', '08817')).status, 400);
  // one pick is not enough for Edison: recycling section AND garbage day
  const partial = await (await call('?area=rs-6', '08817')).json();
  assert.deepEqual(partial.missing, ['garbage']);
  assert.equal((await call('?area=rs-6&area=rs-7&area=garbage:mon', '08817')).status, 400);
  const res = await (await call('?area=rs-6&area=garbage:mon', '08817')).json();
  const rec = res.schedules.find((s) => s.stream === 'recycling');
  assert.equal(rec.next[0].date, '2026-05-11');
  assert.ok(res.schedules.every((s) => s.area === null || ['rs-6', 'garbage:mon'].includes(s.area)));
  assert.equal(res.schedules.find((s) => s.stream === 'trash').next[0].date, '2026-05-04');
  assert.equal((await (await call('?area=garbage:thu,rs-6', '08817')).json()).selected.length, 2);
});

test('handler: ics needs an area (409) then downloads', async () => {
  assert.equal((await call('?format=ics', '08817')).status, 409);
  assert.equal((await call('?area=rs-6&format=ics', '08817')).status, 409);
  const res = await call('?area=rs-6&area=garbage:mon&format=ics', '08817');
  assert.equal(res.headers.get('content-type'), 'text/calendar; charset=utf-8');
  assert.match(res.headers.get('content-disposition'), /dumpguard-edison-rs-6-garbage-mon\.ics/);
});

test('handler: ZIP spanning towns asks for the town', async () => {
  assert.equal((await (await call('', '99999')).json()).needs, 'town');
  assert.equal((await call('?town=nowhere&format=ics', '99999')).status, 409);
});

test('Edison yard: RS 7 is Tuesday; leaf season starts Oct 20, grass ends Sep 29', () => {
  const yard = rows.filter((r) => r.region === 'edison' && r.stream === 'yard' && r.area_key === 'rs-7');
  const all = yard.flatMap((r) => dates(r, '2026-04-01', '2026-12-31'));
  assert.equal(all[0], '2026-04-07');
  assert.ok(all.includes('2026-09-29') && !all.includes('2026-10-06') && all.includes('2026-10-20'));
  assert.equal(all.at(-1), '2026-12-08');
});

// ---- Woodbridge: dates below are read from the township's 2026 calendar pages ----
const wb = (stream, key) => rows.find((r) => r.region === 'woodbridge' && r.stream === stream && r.area_key === key);

test('Woodbridge Fords: trash Wed, recycling Fri; Friday holidays move recycling to Saturday', () => {
  const trash = wb('trash', 'fords');
  const rec = wb('recycling', 'fords');
  assert.deepEqual(dates(trash, '2026-06-01', '2026-06-14'), ['2026-06-03', '2026-06-10']);
  assert.ok(dates(rec, '2026-04-01', '2026-04-12').includes('2026-04-04') && !dates(rec, '2026-04-01', '2026-04-12').includes('2026-04-03')); // Good Friday
  assert.ok(dates(rec, '2026-06-15', '2026-06-22').includes('2026-06-20')); // Juneteenth
  assert.ok(dates(rec, '2026-07-01', '2026-07-08').includes('2026-07-04')); // July 3 observed
  assert.ok(dates(rec, '2026-12-20', '2026-12-31').includes('2026-12-26')); // Christmas
  assert.ok(dates(rec, '2026-12-28', '2027-01-05').includes('2027-01-02')); // New Year 2027
});

test('Woodbridge mid-week holidays move that day and everything after it', () => {
  const avenelTrash = wb('trash', 'avenel');   // SWD 2, Tuesday
  const iselinRec = wb('recycling', 'iselin'); // RD 4, Thursday
  // Election Day Tue Nov 3: SWD 2 -> Wed Nov 4, RD 4 -> Fri Nov 6, but Monday Nov 2 is unaffected
  assert.ok(dates(avenelTrash, '2026-11-01', '2026-11-08').includes('2026-11-04'));
  assert.ok(dates(iselinRec, '2026-11-01', '2026-11-08').includes('2026-11-06'));
  assert.deepEqual(dates(wb('trash', 'iselin'), '2026-11-01', '2026-11-08'), ['2026-11-02']);
  // Thanksgiving Thu Nov 26: SWD 3 Wed Nov 25 unchanged, RD 4 -> Fri Nov 27, RD 5 -> Sat Nov 28
  assert.ok(dates(wb('trash', 'fords'), '2026-11-22', '2026-11-30').includes('2026-11-25'));
  assert.ok(dates(iselinRec, '2026-11-22', '2026-11-30').includes('2026-11-27'));
  assert.ok(dates(wb('recycling', 'fords'), '2026-11-22', '2026-11-30').includes('2026-11-28'));
  // Presidents' Day Mon Feb 16: whole week +1
  assert.deepEqual(dates(wb('trash', 'woodbridge'), '2026-02-09', '2026-02-22'), ['2026-02-09', '2026-02-17']);
  // Lincoln's Birthday is not a holiday: RD 4 stays Feb 12
  assert.ok(dates(iselinRec, '2026-02-09', '2026-02-15').includes('2026-02-12'));
  // New Year's Day Thu Jan 1 2026: RD 4 -> Fri Jan 2, RD 5 -> Sat Jan 3
  assert.deepEqual(dates(iselinRec, '2026-01-01', '2026-01-10'), ['2026-01-02', '2026-01-08']);
  assert.deepEqual(dates(wb('recycling', 'fords'), '2026-01-01', '2026-01-10'), ['2026-01-03', '2026-01-09']);
});

test('handler: Woodbridge asks for a neighborhood and a pickup zone, then returns everything', async () => {
  const wbRepo = {
    townsForZip: async () => [{ id: 'woodbridge', name: 'Woodbridge' }],
    schedulesForTown: async () => rows.filter((r) => r.region === 'woodbridge'),
  };
  const get = (q) => handleSchedule(new Request(`http://x/s/08863${q}`), '08863', wbRepo, { today: '2026-10-06' });
  const first = await (await get('')).json();
  assert.equal(first.needs, 'area');
  assert.equal(first.areas.filter((a) => a.group === 'area').length, 10);
  assert.equal(first.areas.filter((a) => a.group === 'zone').length, 29);
  const res = await (await get('?area=fords&area=zone:rd4-z1')).json();
  assert.deepEqual(res.schedules.map((s) => s.stream).sort(), ['bulk', 'recycling', 'trash', 'yard']);
  assert.equal(res.schedules.find((s) => s.stream === 'trash').next[0].date, '2026-10-07'); // Wed
  assert.equal(res.schedules.find((s) => s.stream === 'recycling').next[0].date, '2026-10-09'); // Fri
  assert.equal(res.schedules.find((s) => s.stream === 'yard').next[0].date, '2026-10-15'); // leaves
});

test('Woodbridge RD4 Zone 1 yard dates are one-off dates read from the street index pages', () => {
  const yard = wb('yard', 'zone:rd4-z1');
  assert.equal(yard.rrule, null);
  const d = (from, to) => dates(yard, from, to);
  assert.deepEqual(d('2026-04-01', '2026-04-30'), ['2026-04-01', '2026-04-16']);
  assert.deepEqual(d('2026-10-01', '2026-12-31'), ['2026-10-05', '2026-10-15', '2026-10-26', '2026-11-05', '2026-11-17', '2026-11-30', '2026-12-09']);
  assert.deepEqual(d('2026-12-25', '2027-01-31').filter((x) => x.startsWith('2027')), ['2027-01-07', '2027-01-14']);
  assert.deepEqual(dates(wb('yard', 'zone:rd5-z1'), '2026-01-01', '2026-01-31').filter((x) => ['2026-01-09', '2026-01-16'].includes(x)), ['2026-01-09', '2026-01-16']);
});

// ---- New Brunswick: dates below are read from the city's 2026 flyer (pp.1-3) ----
const nb = (stream, key) => rows.find((r) => r.region === 'new-brunswick' && r.stream === stream && r.area_key === key);

test('New Brunswick Zone 1: trash Mon+Thu, recycling every other Monday, holiday make-ups', () => {
  const trash = nb('trash', 'zone-1');
  const rec = nb('recycling', 'zone-1');
  assert.deepEqual(dates(trash, '2026-03-02', '2026-03-08'), ['2026-03-02', '2026-03-05']);
  assert.deepEqual(dates(rec, '2026-03-01', '2026-04-30'), ['2026-03-09', '2026-03-23', '2026-04-06', '2026-04-20']);
  assert.deepEqual(dates(rec, '2026-12-01', '2026-12-31'), ['2026-12-14', '2026-12-28']);
  // MLK Mon Jan 19 -> Wed Jan 21; Columbus Mon Oct 12 -> Wed Oct 14; Thanksgiving Thu Nov 26 -> Wed Nov 25
  assert.ok(dates(trash, '2026-01-19', '2026-01-25').includes('2026-01-21') && !dates(trash, '2026-01-19', '2026-01-25').includes('2026-01-19'));
  assert.ok(dates(trash, '2026-10-12', '2026-10-18').includes('2026-10-14'));
  assert.ok(dates(trash, '2026-11-23', '2026-11-29').includes('2026-11-25') && !dates(trash, '2026-11-23', '2026-11-29').includes('2026-11-26'));
  // New Year's Day Thu Jan 1 -> Wed Dec 31 2025
  assert.deepEqual(dates(trash, '2025-12-29', '2026-01-05'), ['2025-12-31', '2026-01-05']);
});

test('New Brunswick Zone 1 recycling: printed Sept "12" is a typo, Labor Day has no confirmed make-up', () => {
  const sept = dates(nb('recycling', 'zone-1'), '2026-09-01', '2026-09-30');
  assert.deepEqual(sept, ['2026-09-21']);
});

test('New Brunswick Zone 2: trash Tue+Fri, recycling every other Tuesday, Friday holidays', () => {
  const trash = nb('trash', 'zone-2');
  const rec = nb('recycling', 'zone-2');
  assert.deepEqual(dates(rec, '2026-06-01', '2026-06-30'), ['2026-06-02', '2026-06-16', '2026-06-30']);
  assert.deepEqual(dates(rec, '2026-09-01', '2026-09-30'), ['2026-09-08', '2026-09-22']);
  assert.deepEqual(dates(rec, '2026-12-01', '2026-12-31'), ['2026-12-01', '2026-12-15', '2026-12-29']);
  // Juneteenth Fri Jun 19 -> Sat Jun 20; July 3 (Fri) has no make-up; Christmas Fri -> Sat Dec 26
  assert.ok(dates(trash, '2026-06-15', '2026-06-22').includes('2026-06-20') && !dates(trash, '2026-06-15', '2026-06-22').includes('2026-06-19'));
  assert.deepEqual(dates(trash, '2026-06-29', '2026-07-08'), ['2026-06-30', '2026-07-07']);
  assert.ok(dates(trash, '2026-12-21', '2026-12-31').includes('2026-12-26'));
});

test('handler: New Brunswick asks for a zone, then returns both zone streams plus bulk', async () => {
  const repo = {
    townsForZip: async () => [{ id: 'new-brunswick', name: 'New Brunswick' }],
    schedulesForTown: async () => rows.filter((r) => r.region === 'new-brunswick'),
  };
  const need = await handleSchedule(new Request('http://x/api/v1/schedule/08901'), '08901', repo, { today: '2026-10-06' });
  assert.equal((await need.json()).needs, 'area');
  const ok = await handleSchedule(new Request('http://x/api/v1/schedule/08901?area=zone-2'), '08901', repo, { today: '2026-10-06' });
  assert.equal(ok.status, 200);
  const cal = (await ok.json()).calendar;
  assert.equal(cal.webcal, 'webcal://x/api/v1/schedule/08901?town=new-brunswick&format=ics&subscribe=1&area=zone-2');
  const feed = await handleSchedule(new Request(cal.https), '08901', repo, { today: '2026-10-06' });
  assert.equal(feed.status, 200);
  assert.equal(feed.headers.get('content-disposition'), null);
  assert.match(await feed.text(), /REFRESH-INTERVAL;VALUE=DURATION:PT12H/);
  const dl = await handleSchedule(new Request('http://x/s/08901?format=ics&area=zone-2'), '08901', repo, { today: '2026-10-06' });
  assert.match(dl.headers.get('content-disposition'), /attachment/);
});

// ---- Long Branch: dates below are read from the city's 2026 calendar pages ----
const lb = (stream, key) => rows.find((r) => r.region === 'long-branch' && r.stream === stream && r.area_key === key);

test('Long Branch: weekly garbage and recycling by area, holidays mostly run, four NO PICKUP days', () => {
  assert.deepEqual(dates(lb('trash', 'south-a'), '2026-01-01', '2026-01-14'), ['2026-01-05', '2026-01-12']);
  assert.deepEqual(dates(lb('recycling', 'south-b'), '2026-01-01', '2026-01-14'), ['2026-01-06', '2026-01-13']);
  assert.deepEqual(dates(lb('trash', 'north-a'), '2026-01-01', '2026-01-10'), ['2026-01-08']); // Jan 1 no pickup
  assert.deepEqual(dates(lb('trash', 'north-b'), '2026-01-01', '2026-01-10'), ['2026-01-02', '2026-01-09']);
  assert.ok(dates(lb('trash', 'south-a'), '2026-05-25', '2026-05-25').includes('2026-05-25')); // Memorial Day runs
  assert.ok(dates(lb('trash', 'north-b'), '2026-06-19', '2026-06-19').includes('2026-06-19')); // Juneteenth runs
  assert.ok(!dates(lb('trash', 'north-a'), '2026-11-23', '2026-11-29').includes('2026-11-26'));
  assert.deepEqual(dates(lb('trash', 'north-b'), '2026-12-21', '2027-01-08'), ['2027-01-08']); // Dec 25 and Jan 1 skipped
  assert.deepEqual(dates(lb('trash', 'north-b'), '2026-12-18', '2026-12-18'), ['2026-12-18']);
});

test('Long Branch bulk: north 1st/3rd Wednesday, south 2nd/4th, no fifth Wednesday', () => {
  const n = lb('bulk', 'north-a');
  const s = lb('bulk', 'south-a');
  assert.deepEqual(dates(n, '2026-01-01', '2026-02-28'), ['2026-01-07', '2026-01-21', '2026-02-04', '2026-02-18']);
  assert.deepEqual(dates(s, '2026-01-01', '2026-02-28'), ['2026-01-14', '2026-01-28', '2026-02-11', '2026-02-25']);
  // calendar prints NO BULK PICKUP on Apr 29, Jul 29, Sep 30, Dec 30 (fifth Wednesdays)
  for (const d of ['2026-04-29', '2026-07-29', '2026-09-30', '2026-12-30']) {
    assert.ok(!dates(n, d, d).length && !dates(s, d, d).length, d);
  }
  assert.deepEqual(dates(n, '2026-12-01', '2027-01-31'), ['2026-12-02', '2026-12-16', '2027-01-06', '2027-01-20']);
});

// ---- Edison garbage: moves read from the 2026 calendar month pages ----
const eg = (k) => rows.find((r) => r.region === 'edison' && r.stream === 'trash' && r.area_key === `garbage:${k}`);

test('Edison garbage: Monday holiday moves Monday to Tue and Tuesday to Wed', () => {
  assert.deepEqual(dates(eg('mon'), '2026-01-17', '2026-01-24'), ['2026-01-20']);
  assert.deepEqual(dates(eg('tue'), '2026-01-17', '2026-01-24'), ['2026-01-21']);
  assert.deepEqual(dates(eg('mon'), '2026-09-06', '2026-09-12'), ['2026-09-08']);
  assert.deepEqual(dates(eg('tue'), '2026-09-06', '2026-09-12'), ['2026-09-09']);
  assert.deepEqual(dates(eg('tue'), '2026-11-01', '2026-11-08'), ['2026-11-04']); // Election Day
});

test('Edison garbage: Thursday and Friday holidays move earlier; Thanksgiving week is flagged', () => {
  assert.deepEqual(dates(eg('thu'), '2025-12-29', '2026-01-09'), ['2025-12-31', '2026-01-08']);
  assert.deepEqual(dates(eg('thu'), '2026-02-09', '2026-02-15'), ['2026-02-11']); // Lincoln's Birthday
  assert.deepEqual(dates(eg('thu'), '2026-03-30', '2026-04-05'), ['2026-04-01']); // Good Friday week
  assert.deepEqual(dates(eg('fri'), '2026-03-30', '2026-04-05'), ['2026-04-02']);
  assert.deepEqual(dates(eg('fri'), '2026-12-21', '2026-12-30'), ['2026-12-24']);
  assert.deepEqual(dates(eg('fri'), '2026-12-28', '2027-01-04'), ['2026-12-31']);
  assert.deepEqual(dates(eg('thu'), '2026-11-23', '2026-11-29'), []);
  assert.deepEqual(dates(eg('mon'), '2026-11-23', '2026-11-29'), ['2026-11-23']);
});

test('Edison garbage: private and unknown options exist without dates', () => {
  for (const k of ['private', 'unknown']) {
    const r = rows.find((x) => x.region === 'edison' && x.area_key === `garbage:${k}`);
    assert.ok(r && !r.rrule && r.notes_en.length > 40);
  }
});
