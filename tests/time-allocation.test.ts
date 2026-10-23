import {it,expect} from 'vitest';import {segmentAssignment} from '../apps/web/src/lib/client/time-allocation.ts';
const segment={id:'work-interval',started_at:'2026-10-23T08:00:00Z',ended_at:'2026-10-23T11:30:00Z'};
it('joins persisted independent allocation intervals without requiring a segment foreign key',()=>{
 expect(segmentAssignment(segment,[{started_at:'2026-10-23T08:00:00Z',ended_at:'2026-10-23T11:30:00Z',order_id:'order',activity:'Montage'}])).toMatchObject({assigned:true,order_id:'order',activity:'Montage'});
});
it('distinguishes open allocations, unassigned work and multiple order changes',()=>{
 expect(segmentAssignment({...segment,ended_at:null},[{started_at:segment.started_at,ended_at:null,order_id:'order'}])).toMatchObject({assigned:true,order_id:'order'});
 expect(segmentAssignment(segment,[{started_at:segment.started_at,ended_at:segment.ended_at,order_id:null,activity:'Büro'}])).toMatchObject({assigned:true,order_id:null,activity:'Büro'});
 expect(segmentAssignment(segment,[{started_at:segment.started_at,ended_at:'2026-10-23T09:00:00Z',order_id:'first'},{started_at:'2026-10-23T09:00:00Z',ended_at:segment.ended_at,order_id:'second'}])).toMatchObject({multiple:true,order_id:null});
});
it('does not attach a neighbouring allocation that starts at the exact end of an interval',()=>{
 expect(segmentAssignment(segment,[{started_at:segment.ended_at,ended_at:'2026-10-23T12:00:00Z',order_id:'next'}]).assigned).toBe(false);
});
