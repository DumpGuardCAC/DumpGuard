import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedEndpoint, validateAreas, handleSubscribe, handleUnsubscribe, handleReminders, reminderText, streamsOn, handlePushKey } from '../lib/push.mjs';

const KEYS = { p256dh: 'B'.repeat(40), auth: 'a'.repeat(16) };
const sub = (over = {}) => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: KEYS, ...over });
const post = (body) => new Request('http://x/push/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

// trash weekly on Monday (area mon) or Tuesday (area tue); recycling every Thursday for everyone
const rows = [
  { id: 1, stream: 'trash', area_key: 'garbage:mon', rrule: 'FREQ=WEEKLY;BYDAY=MO', dtstart: '2026-01-05', overrides: [], dates: [] },
  { id: 2, stream: 'trash', area_key: 'garbage:tue', rrule: 'FREQ=WEEKLY;BYDAY=TU', dtstart: '2026-01-06', overrides: [], dates: [] },
  { id: 3, stream: 'recycling', area_key: null, rrule: 'FREQ=WEEKLY;BYDAY=TH', dtstart: '2026-01-01', overrides: [], dates: [] },
];
function fakeRepo(extra = {}) {
  const saved = [];
  return {
    saved,
    hit: async () => 1,
    isPublishedTown: async (t) => t === 'edison',
    schedulesForTown: async () => rows,
    upsert: async (x) => saved.push(x),
    remove: async (e) => { saved.push({ removed: e }); },
    ...extra,
  };
}

test('only real push services are accepted', () => {
  assert.ok(allowedEndpoint('https://fcm.googleapis.com/x'));
  assert.ok(allowedEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x'));
  assert.ok(allowedEndpoint('https://web.push.apple.com/x'));
  assert.ok(!allowedEndpoint('http://fcm.googleapis.com/x'));
  assert.ok(!allowedEndpoint('https://evil.example.com/x'));
  assert.ok(!allowedEndpoint('https://fcm.googleapis.com.evil.com/x'));
  assert.ok(!allowedEndpoint('https://169.254.169.254/latest'));
  assert.ok(!allowedEndpoint('https://u:p@fcm.googleapis.com/x'));
});

test('area validation mirrors the schedule endpoint', () => {
  assert.equal(validateAreas(rows, ['garbage:mon']).ok, true);
  assert.equal(validateAreas(rows, []).ok, false);
  assert.equal(validateAreas(rows, ['garbage:mon', 'garbage:tue']).ok, false);
  assert.equal(validateAreas(rows, ['nope']).ok, false);
});

test('subscribe stores a valid subscription', async () => {
  const repo = fakeRepo();
  const r = await handleSubscribe(post({ subscription: sub(), town: 'edison', areas: ['garbage:mon'], lang: 'es' }), repo);
  assert.equal(r.status, 201);
  assert.equal(repo.saved[0].lang, 'es');
  assert.deepEqual(repo.saved[0].areaKeys, ['garbage:mon']);
});

test('subscribe rejects bad input', async () => {
  const repo = fakeRepo();
  const t = async (body) => (await handleSubscribe(post(body), repo)).status;
  assert.equal(await t({ subscription: sub({ endpoint: 'https://evil.example.com/x' }), town: 'edison', areas: ['garbage:mon'] }), 400);
  assert.equal(await t({ subscription: sub(), town: 'nowhere', areas: [] }), 400);
  assert.equal(await t({ subscription: sub(), town: 'edison', areas: [] }), 400);
  assert.equal(await t({ subscription: sub(), town: 'edison', areas: ['garbage:mon'], streams: ['nuclear'] }), 400);
  assert.equal(await t({ subscription: sub(), town: 'edison', areas: ['garbage:mon'], lang: 'fr' }), 400);
  assert.equal(repo.saved.length, 0);
  const noType = await handleSubscribe(new Request('http://x', { method: 'POST', body: '{}' }), repo);
  assert.equal(noType.status, 415);
  const limited = await handleSubscribe(post({}), fakeRepo({ hit: async () => 99 }));
  assert.equal(limited.status, 429);
});

test('unsubscribe is idempotent', async () => {
  const repo = fakeRepo();
  const r = await handleUnsubscribe(new Request('http://x', { method: 'POST', body: JSON.stringify({ endpoint: 'https://fcm.googleapis.com/x' }) }), repo);
  assert.equal(r.status, 200);
});

test('streamsOn respects area and stream choice', () => {
  const s = { area_keys: ['garbage:mon'], streams: ['trash', 'recycling', 'bulk', 'yard'] };
  assert.deepEqual(streamsOn(rows, s, '2026-10-19'), ['trash']); // Monday
  assert.deepEqual(streamsOn(rows, s, '2026-10-20'), []); // Tuesday is the other area's trash
  assert.deepEqual(streamsOn(rows, s, '2026-10-22'), ['recycling']); // Thursday
  assert.deepEqual(streamsOn(rows, { ...s, streams: ['trash'] }, '2026-10-22'), []);
});

test('reminder text in both languages', () => {
  assert.match(reminderText('en', 'Edison', ['trash', 'recycling']).title, /trash and recycling/);
  assert.match(reminderText('es', 'Edison', ['trash']).title, /basura/);
  assert.match(reminderText('en', 'Edison', ['trash']).body, /Double check with your town/);
});

test('reminders: auth, send, skip, drop dead endpoints', async () => {
  const subs = [
    { id: 'a', endpoint: 'e1', region_id: 'edison', area_keys: ['garbage:mon'], streams: ['trash', 'recycling'], lang: 'en' },
    { id: 'b', endpoint: 'e2', region_id: 'edison', area_keys: ['garbage:tue'], streams: ['trash'], lang: 'en' }, // nothing Monday
    { id: 'c', endpoint: 'e3', region_id: 'edison', area_keys: ['garbage:mon'], streams: ['trash'], lang: 'es' }, // dead
  ];
  const log = [];
  const repo = fakeRepo({
    dueSubscriptions: async () => subs,
    townName: async () => 'Edison',
    markSent: async (id) => log.push(['sent', id]),
    fail: async (id) => log.push(['fail', id]),
  });
  const sent = [];
  const send = async (s, payload) => {
    if (s.id === 'c') throw { statusCode: 410 };
    sent.push([s.id, JSON.parse(payload)]);
  };
  // Sunday 6 pm NJ time -> tomorrow is Monday 2026-10-19
  const now = new Date('2026-10-18T22:00:00Z');
  const req = (tok) => new Request('http://x/cron', { headers: { authorization: `Bearer ${tok}` } });
  assert.equal((await handleReminders(req('wrong'), repo, send, { secret: 's', now })).status, 401);
  assert.equal((await handleReminders(req('s'), repo, send, { secret: undefined, now })).status, 401);
  const res = await (await handleReminders(req('s'), repo, send, { secret: 's', now })).json();
  assert.deepEqual([res.sent, res.skipped, res.removed], [1, 1, 1]);
  assert.equal(sent[0][1].date, '2026-10-19');
  assert.match(sent[0][1].title, /Tomorrow: trash/);
  assert.deepEqual(log, [['sent', 'a']]);
});

test('public key endpoint', async () => {
  assert.equal(handlePushKey({}).status, 503);
  assert.equal((await handlePushKey({ VAPID_PUBLIC_KEY: 'k' }).json()).public_key, 'k');
});
