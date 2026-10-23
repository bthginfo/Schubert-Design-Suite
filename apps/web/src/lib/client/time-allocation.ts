type Interval={id?:string;started_at?:string;ended_at?:string|null;start_at?:string;end_at?:string|null};
type Allocation=Interval&{time_segment_id?:string;order_id?:string|null;activity?:string};
/** Allocations are independent intervals; a segment ID is not their only link. */
export function segmentAssignment(segment:Interval,allocations:Allocation[]){
 const finish=(value:string|null|undefined)=>value?Date.parse(value):Infinity;
 const start=Date.parse(segment.started_at||segment.start_at||''),end=finish(segment.ended_at??segment.end_at);
 const matches=allocations.filter(a=>a.time_segment_id===segment.id&&!!segment.id||Date.parse(a.started_at||a.start_at||'')<end&&finish(a.ended_at??a.end_at)>start);
 const orders=[...new Set(matches.map(a=>a.order_id??null))];
 return {order_id:orders.length===1?orders[0]:null,activity:matches.length===1?matches[0].activity:matches.length>1?'Mehrere Arbeitszuordnungen':'',assigned:matches.length>0,multiple:orders.length>1};
}
