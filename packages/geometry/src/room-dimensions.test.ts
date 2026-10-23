import {describe,it,expect} from 'vitest';
import {rectangularRoomAxisPoints} from './room-dimensions.js';

const origin={xMm:'100',yMm:'200',zMm:'0'};
describe('Room dimensions with an explicit survey reference',()=>{
  it('keeps 4200 × 3200 mm clear of a 200 mm wall core',()=>{
    const points=rectangularRoomAxisPoints('4200','3200','200',origin,'clear');
    expect(points).toEqual([{xMm:'0',yMm:'100',zMm:'0'},{xMm:'4400',yMm:'100',zMm:'0'},{xMm:'4400',yMm:'3500',zMm:'0'},{xMm:'0',yMm:'3500',zMm:'0'}]);
    expect(Number(points[1].xMm)-Number(points[0].xMm)-200).toBe(4200);
  });
  it('preserves explicitly chosen axis dimensions without inventing wall thickness',()=>{
    const points=rectangularRoomAxisPoints('4200','3200',null,origin,'axis');
    expect(points[0]).toEqual(origin);expect(points[2]).toEqual({xMm:'4300',yMm:'3400',zMm:'0'});
  });
  it('requires a real wall thickness for clear dimensions',()=>{
    for(const value of [null,'0','-1'])expect(()=>rectangularRoomAxisPoints('4200','3200',value,origin,'clear')).toThrow('Wandstärke');
  });
});

import {createDesign} from './model.js';
import {targetMeasure} from './precision.js';
import {rectangularRoomClearPoints} from './room-dimensions.js';
import {projectDimensions} from './dimensions.js';
function room(rotation=0){
 const s=createDesign('room_plan'),base={parentId:'root',phase:'planned' as const,locked:false,sourceEvidenceVersionIds:[]},points=rectangularRoomAxisPoints('4200','3200','200',{xMm:'0',yMm:'0',zMm:'0'},'clear');
 s.measurements['floor-level']=targetMeasure('0');s.measurements.core=targetMeasure('200');s.measurements.height=targetMeasure('2600');
 points.forEach((point,i)=>{const angle=rotation*Math.PI/180;s.elements.push({...base,id:'n'+i,label:'Knoten',kind:'node',point:{xMm:String(Number(point.xMm)*Math.cos(angle)-Number(point.yMm)*Math.sin(angle)),yMm:String(Number(point.xMm)*Math.sin(angle)+Number(point.yMm)*Math.cos(angle)),zMm:'0'}});});
 for(let i=0;i<4;i++)s.elements.push({...base,id:'w'+i,label:'Wand',kind:'wall',startNodeId:'n'+i,endNodeId:'n'+((i+1)%4),coreThicknessMeasureId:'core',heightMeasureId:'height',layers:[],joinStyle:'miter'});
 s.elements.push({...base,id:'room',label:'Bad',kind:'room',boundary:points.map((_,i)=>({wallId:'w'+i,side:'left' as const})),roomId:'unassigned:room',floorId:'unassigned:floor',floorLayers:[],finishedFloorLevelMeasureId:'floor-level'});return s;
}
it('recovers clear room dimensions for screen and PDF without changing the saved model',()=>{
 for(const rotation of [0,30,90]){const s=room(rotation),before=JSON.stringify(s),points=rectangularRoomClearPoints(s,'room')!;expect(points).toHaveLength(4);const dimensions=projectDimensions(s,'top').filter(d=>d.label.endsWith('Lichtes Innenmaß'));expect(dimensions.map(d=>Number(d.valueMm))).toEqual([4200,3200]);expect(JSON.stringify(s)).toBe(before);}
});
it('accounts for confirmed inward finishes and omits dimensions with unknown material thickness',()=>{
 const s=room();s.measurements.finish=targetMeasure('12');for(const wall of s.elements)if(wall.kind==='wall')wall.layers.push({id:wall.id+'finish',materialSpecVersionId:'unassigned:material',productVariantVersionId:null,thicknessMeasureId:'finish',side:'left'});
 expect(projectDimensions(s,'top').filter(d=>d.label.endsWith('Lichtes Innenmaß')).map(d=>d.valueMm)).toEqual(['4176','3176']);
 s.measurements.finish.valueMm=null;expect(rectangularRoomClearPoints(s,'room')).toBeNull();
});
it('never substitutes bounding dimensions for an open or nonrectangular room',()=>{
 const s=room();const node=s.elements.find(e=>e.id==='n2');if(node?.kind==='node')node.point.xMm='4000';expect(rectangularRoomClearPoints(s,'room')).toBeNull();
 const unknown=room();unknown.measurements.core.valueMm=null;expect(rectangularRoomClearPoints(unknown,'room')).toBeNull();
});
