import {expect, test} from 'vitest';
import {calendarAgenda} from './calendar-agenda';

test('assignments span Berlin calendar days across DST, with an exclusive midnight end',()=>{
  const days=['2026-10-24','2026-10-25','2026-10-26'];
  const overnight={starts_at:'2026-10-24T21:30Z',ends_at:'2026-10-25T23:00Z'};
  const oneHour={starts_at:'2026-10-25T01:00Z',ends_at:'2026-10-25T02:00Z'};
  const agenda=calendarAgenda(days,[overnight,oneHour]);
  expect(agenda.get(days[0]!)).toEqual([{assignment:overnight,timeLabel:'23:30 – mehrtägig'}]);
  expect(agenda.get(days[1]!)?.map(item=>item.timeLabel)).toEqual(['Fortsetzung – 00:00','02:00 – 03:00']);
  expect(agenda.get(days[2]!)).toEqual([]);
});
