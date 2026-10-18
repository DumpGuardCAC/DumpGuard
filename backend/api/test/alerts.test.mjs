import test from 'node:test';
import assert from 'node:assert/strict';
import { authorized, scheduleChanges, handleAlerts, handleCreateAlert, handleDeleteAlert } from '../lib/alerts.mjs';
import { handleReminders, reminderText } from '../lib/push.mjs';

const TOKEN = 'a-long-admin-token-123';
const rows = [
  { id: 1, stream: 'trash', area_key: 'g:mon', rrule: 'FREQ=WEEKLY;BYDAY=MO', dtstart: '2026-01-05', dates: [],
    overrides: [{ date: '2026-11-26', to: '2026-11-27', reason: 'Thanksgiving' }, { date: '2026-10-19', to: '2026-10-20', reason: 'Test holiday' }] },
  { id: 2, stream: 'trash', area_key: 'g:tue', rrule: 'FREQ=WEEKLY;BYDAY=TU', dtstart: '2026-01-06', dates: [], overrides: [] },
];
const auth = (t) => ({ authorization: `Bearer ${t}` });

test('admin token: unset, short or wrong is refused', () => {
  const r = (h) => new Request('http://x', { headers: h });
  assert.equal(authorized(r(auth(TOKEN)), TOKEN), true);
  assert.equal(authorized(r(auth('nope')), TOKEN), false);
  assert.equal(authorized(r({}), TOKEN), false);
  assert.equal(authorized(r(auth('short')), 'short'), false);
  assert.equal(authorized(r(auth('')), undefined), false);
});

test('schedule changes list moved pickups for the chosen section only', () => {
  const mon = scheduleChanges(rows, ['g:mon'], '2026-10-15', 21);
  assert.equal(mon.length, 1);
  assert.deepEqual([mon[0].date, mon[0].from, mon[0].reason], ['2026-10-20', '2026-10-19', 'Test holiday']);
  assert.equal(scheduleChanges(rows, ['g:tue'], '2026-10-15', 21).length, 0);
});

const fake = (extra = {}) => ({
  isPublishedTown: async (t) => t === 'edison',
  schedulesForTown: async () => rows,
  activeAnnouncements: async () => [{ id: 'i', region_id: 'edison', message_en: 'No pickup Friday, snow.', message_es: '', source_url: null, starts_on: '2026-10-15', ends_on: '2026-10-16' }],
  createAnnouncement: async (x) => { fake.last = x; return 'new-id'; },
  deleteAnnouncement: async () => {},
  ...extra,
});

test('alerts endpoint returns announcements (Spanish falls back to English) and changes', async () => {
  const r = await handleAlerts(new Request('http://x/a?town=edison&area=g:mon'), fake(), { now: new Date('2026-10-15T15:00:00Z') });
  const b = await r.json();
  assert.equal(b.announcements[0].message.es, 'No pickup Friday, snow.');
  assert.equal(b.schedule_changes.length, 1);
  assert.equal((await handleAlerts(new Request('http://x/a'), fake())).status, 400);
  assert.equal((await handleAlerts(new Request('http://x/a?town=nowhere'), fake())).status, 404);
});

test('creating an alert needs the token and valid input', async () => {
  const mk = (body, h = auth(TOKEN)) => new Request('http://x', { method: 'POST', headers: h, body: JSON.stringify(body) });
  const now = new Date('2026-10-15T15:00:00Z');
  const t = (body, h) => handleCreateAlert(mk(body, h), fake(), { now, token: TOKEN });
  assert.equal((await t({ message_en: 'x', ends_on: '2026-10-16' }, {})).status, 401);
  assert.equal((await t({ message_en: '', ends_on: '2026-10-16' })).status, 400);
  assert.equal((await t({ message_en: 'x', ends_on: '2026-12-31' })).status, 400); // over 60 days
  assert.equal((await t({ message_en: 'x', ends_on: '2026-10-10' })).status, 400);
  assert.equal((await t({ message_en: 'x', ends_on: '2026-10-16', town: 'nowhere' })).status, 400);
  assert.equal((await t({ message_en: 'x', ends_on: '2026-10-16', source_url: 'javascript:alert(1)' })).status, 400);
  const ok = await t({ message_en: 'Plant closed Friday', ends_on: '2026-10-16', town: 'edison' });
  assert.equal(ok.status, 201);
  assert.equal(fake.last.startsOn, '2026-10-15');
});

test('delete needs the token', async () => {
  const id = '123e4567-e89b-12d3-a456-426614174000';
  assert.equal((await handleDeleteAlert(new Request(`http://x?id=${id}`, { method: 'DELETE' }), fake(), { token: TOKEN })).status, 401);
  assert.equal((await handleDeleteAlert(new Request(`http://x?id=${id}`, { method: 'DELETE', headers: auth(TOKEN) }), fake(), { token: TOKEN })).status, 200);
});

test('reminder mentions a holiday shift and an announcement', async () => {
  const t = reminderText('en', 'Edison', ['trash'], { moved: true, announcement: 'Snow.' });
  assert.match(t.body, /moved because of a holiday/);
  assert.match(t.body, /Snow\./);
  assert.match(reminderText('es', 'Edison', ['trash'], { moved: true }).body, /feriado/);

  const sent = [];
  const repo = fake({
    dueSubscriptions: async () => [{ id: 'a', endpoint: 'e', region_id: 'edison', area_keys: ['g:mon'], streams: ['trash'], lang: 'en' }],
    townName: async () => 'Edison', markSent: async () => {}, fail: async () => {},
  });
  // Monday Oct 19 is moved to Tuesday Oct 20; the reminder goes out Monday evening.
  const res = await handleReminders(new Request('http://x', { headers: auth('s') }), repo, async (s, p) => sent.push(JSON.parse(p)), { secret: 's', now: new Date('2026-10-19T22:00:00Z') });
  assert.equal((await res.json()).sent, 1);
  assert.match(sent[0].body, /moved because of a holiday/);
  assert.equal(sent[0].date, '2026-10-20');
});
