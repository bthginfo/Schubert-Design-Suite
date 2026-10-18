export type CalendarMode = 'day' | 'week' | 'month';
export function calendarDate(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
export function shiftCalendarDate(value: string, days: number): string {
  const date = new Date(value+'T12:00:00Z'); date.setUTCDate(date.getUTCDate()+days); return date.toISOString().slice(0,10);
}
export function calendarPeriod(mode: CalendarMode, date: string) {
  if (!calendarDate(date)) throw new Error('Ungültiges Kalenderdatum.');
  const first = mode === 'month' ? date.slice(0,7)+'-01' : date;
  const from = mode === 'day' ? first : shiftCalendarDate(first,-((new Date(first+'T12:00:00Z').getUTCDay()+6)%7));
  const length = mode === 'month' ? 42 : mode === 'week' ? 7 : 1;
  return {mode,date,from,to:shiftCalendarDate(from,length),days:Array.from({length},(_,index)=>shiftCalendarDate(from,index))};
}
export function moveCalendarDate(mode: CalendarMode, date: string, direction: number) {
  if (mode !== 'month') return shiftCalendarDate(date,direction*(mode==='week'?7:1));
  const next = new Date(date.slice(0,7)+'-01T12:00:00Z'); next.setUTCMonth(next.getUTCMonth()+direction); return next.toISOString().slice(0,10);
}
