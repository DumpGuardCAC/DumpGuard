const TZ = 'America/New_York';

export function localParts(now) {
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

export function openStatus(hoursStruct, now = new Date(), lookaheadDays = 120) {
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

export const HOURS_NOTE = { en: 'Hours may change on holidays and in bad weather. Call first.', es: 'El horario puede cambiar en días feriados y con mal tiempo. Llame antes.' };
