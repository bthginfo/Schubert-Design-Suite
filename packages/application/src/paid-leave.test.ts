import {describe,it,expect} from 'vitest';
import {paidLeaveSlots} from './paid-leave.js';
const basis={employment:[{starts_on:'2026-01-01',holiday_region:'BY'}],schedules:[{valid_from:'2026-01-01',mon:5,tue:0,wed:5,thu:0,fri:5,sat:0,sun:0}],calendars:[{region:'BY',year:2026,holidays:['2026-10-09']}]};
describe('confirmed paid leave',()=>{
 it('credits the actual five Wednesday hours in the F08 part-time case',()=>{const slots=paidLeaveSlots({starts_on:'2026-10-07',ends_on:'2026-10-07',days:'1'},basis);expect(slots).toEqual([{on:'2026-10-07',seconds:18000,day_fraction:'1'}]);expect(10+slots[0].seconds/3600-15).toBe(0);});
 it('excludes the confirmed Friday holiday and non-work days',()=>expect(paidLeaveSlots({starts_on:'2026-10-05',ends_on:'2026-10-11',days:'2'},basis)).toHaveLength(2));
 it('credits an explicit single half day proportionally',()=>expect(paidLeaveSlots({starts_on:'2026-10-07',ends_on:'2026-10-07',days:'0.5'},basis)[0].seconds).toBe(9000));
 it('requires a confirmed calendar and exact workdays',()=>{expect(()=>paidLeaveSlots({starts_on:'2026-10-07',ends_on:'2026-10-07',days:'1'},{...basis,calendars:[]})).toThrow();expect(()=>paidLeaveSlots({starts_on:'2026-10-05',ends_on:'2026-10-11',days:'5'},basis)).toThrow();});
});
