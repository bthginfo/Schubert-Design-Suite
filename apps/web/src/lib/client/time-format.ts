/** Readable working-time display in the business time zone. Stored values stay exact timestamps. */
const zone = 'Europe/Berlin';
const time = new Intl.DateTimeFormat('de-DE', {hour: '2-digit', minute: '2-digit', timeZone: zone});
const shortDate = new Intl.DateTimeFormat('de-DE', {day: '2-digit', month: '2-digit', year: 'numeric', timeZone: zone});
const dayKey = new Intl.DateTimeFormat('sv-SE', {timeZone: zone});
const valid = (value: unknown) => {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isFinite(date.getTime()) ? date : null;
};
/** YYYY-MM-DD in Berlin. */
export function businessDay(value: unknown) {
  const date = valid(value);
  return date ? dayKey.format(date) : '';
}
/** "11:05" on the given day, otherwise "27.11.2026 11:05". */
export function clockTime(value: unknown, day = '') {
  const date = valid(value);
  if (!date) return '—';
  return businessDay(date) === day ? time.format(date) : shortDate.format(date) + ' ' + time.format(date);
}
/** "26.11.2026 · 07:00 – 09:30"; a range across midnight names both dates. */
export function timeRange(start: unknown, end: unknown, running = 'läuft') {
  const from = valid(start);
  if (!from) return '—';
  const day = businessDay(from);
  const to = valid(end);
  return shortDate.format(from) + ' · ' + time.format(from) + ' – ' + (to ? clockTime(to, day) : running);
}
/** "2 h 05 min", "45 min", "unter 1 min". The running stopwatch keeps hh:mm:ss. */
export function durationText(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return seconds > 0 ? 'unter 1 min' : '0 min';
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} h ${String(minutes % 60).padStart(2, '0')} min` : `${minutes} min`;
}
/** "7:45 h" for compact day summaries. */
export function hoursText(seconds: number) {
  const minutes = Math.max(0, Math.round(seconds / 60));
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')} h`;
}
const dateTime = new Intl.DateTimeFormat('de-DE', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: zone});
/** "26.11.2026, 14:05" */
export function dateTimeText(value: unknown) {
  const date = valid(value);
  return date ? dateTime.format(date) : '';
}
/** "26.11.2026" for a YYYY-MM-DD business day. */
export function dayText(day: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day.slice(8, 10) + '.' + day.slice(5, 7) + '.' + day.slice(0, 4) : day;
}
/** The calendar day before or after a YYYY-MM-DD business day. */
export function shiftDay(day: string, days: number) {
  const date = new Date(day + 'T12:00:00Z');
  if (!Number.isFinite(date.getTime())) return '';
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
/** German, employee-facing names for session, submission and correction states. */
const timeStatuses: Record<string, string> = {
  working: 'Arbeit läuft', work: 'Arbeit läuft', paused: 'Pause', break: 'Pause', finished: 'Beendet',
  submitted: 'Eingereicht', approved: 'Genehmigt', rejected: 'Zurückgegeben', returned: 'Zurückgegeben',
  needs_clarification: 'Zurückgegeben', requested: 'Beantragt', cancelled: 'Zurückgezogen'
};
export function timeStatusLabel(status: unknown) {
  return timeStatuses[String(status ?? '')] ?? 'Unbekannt';
}
export function timeStatusTone(status: unknown) {
  const value = String(status ?? '');
  if (['approved', 'finished'].includes(value)) return 'success';
  if (['rejected', 'returned', 'needs_clarification'].includes(value)) return 'danger';
  if (['submitted', 'requested'].includes(value)) return 'warning';
  return 'neutral';
}
/** Order lookups read "AUF-2026-00050 · Titel"; split them for a one-line display. */
export function orderParts(name: string) {
  const index = name.indexOf(' · ');
  return index > 0 ? {number: name.slice(0, index), title: name.slice(index + 3)} : {number: name, title: ''};
}
/** Non-empty values once, in first-seen order. */
export function uniqueText(values: unknown[]) {
  return [...new Set(values.map(value => String(value ?? '').trim()).filter(Boolean))];
}
