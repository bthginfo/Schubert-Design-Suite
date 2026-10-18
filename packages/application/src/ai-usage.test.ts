import {it,expect} from 'vitest';
import {usagePeriod} from './ai-usage.js';
it('uses UTC month boundaries and safe ranges without accepting arbitrary query text',()=>{
 const now=new Date('2026-10-18T12:00:00Z');
 expect(usagePeriod('2024-02',now)).toEqual({period:'2024-02',start:'2024-02-01T00:00:00.000Z',end:'2024-03-01T00:00:00.000Z'});
 expect(usagePeriod('2025-12',now).end).toBe('2026-01-01T00:00:00.000Z');
 for(const value of ['2026-13','2026-00','2099-01','DROP TABLE','2026-1'])expect(usagePeriod(value,now).period).toBe('2026-10');
});
