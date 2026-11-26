const businessDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' });
const businessTime = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });

export function calendarAgenda<T extends { starts_at: string | Date; ends_at: string | Date }>(days: string[], assignments: T[]) {
  const agenda = new Map(days.map(day => [day, [] as { assignment: T; timeLabel: string }[]]));
  for (const assignment of assignments) {
    const start = new Date(assignment.starts_at).getTime();
    const end = new Date(assignment.ends_at).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const firstDay = businessDay.format(start);
    const lastDay = businessDay.format(end - 1);
    const from = businessTime.format(start);
    const to = businessTime.format(end);
    for (const day of days) {
      if (day < firstDay || day > lastDay) continue;
      const timeLabel = (day === firstDay ? from : 'Fortsetzung') + ' – ' + (day === lastDay ? to : 'mehrtägig');
      agenda.get(day)!.push({ assignment, timeLabel });
    }
  }
  // Live assignments first; cancelled ones stay visible for context but move to the end of each day.
  const cancelled = (entry: { assignment: T }) => Number((entry.assignment as { status?: string }).status === 'cancelled');
  for (const entries of agenda.values()) entries.sort((a, b) => cancelled(a) - cancelled(b));
  return agenda;
}
