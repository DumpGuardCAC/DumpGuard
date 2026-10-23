import { addDays, occurrences } from './occurrences.mjs';

const STREAM_LABEL = { trash: 'Trash', recycling: 'Recycling', bulk: 'Bulk pickup', yard: 'Yard waste', other: 'Collection' };

const esc = (s) =>
  String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const compact = (iso) => iso.replaceAll('-', '');

function fold(line) {
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

export function eventTitle(row) {
  const label = STREAM_LABEL[row.stream] ?? 'Collection';
  const area = row.area_key ? ` (${row.area_note.split(':')[0].replace(/\s*\(.*\)$/, '')})` : '';
  return `${label}${area}`;
}

export function buildIcs({ townName, rows, today, now = new Date(), subscribe = false }) {
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
          `DESCRIPTION:${esc(`${row.notes_en}
Source: ${row.source_url} (verified ${row.last_verified})`)}`,
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
    const desc = `${row.notes_en}\nSource: ${row.source_url} (verified ${row.last_verified})`;

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
  return lines.map(fold).join('\r\n') + '\r\n';
}
