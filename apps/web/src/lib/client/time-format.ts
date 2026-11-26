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
