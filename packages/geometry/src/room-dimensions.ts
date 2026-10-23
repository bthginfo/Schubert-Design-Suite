import type {Point3} from '@schubert/contracts';
import {D,mm} from './precision.js';

/** The origin is the lower-left inner corner for clear dimensions, or the
 * lower-left wall-axis intersection for axis dimensions. No measurement is
 * attested by this conversion. */
export function rectangularRoomAxisPoints(widthMm:string,depthMm:string,wallThicknessMm:string|null,origin:Point3,basis:'clear'|'axis'):Point3[]{
  const width=new D(widthMm),depth=new D(depthMm);
  if(!width.gt(0)||!depth.gt(0))throw new Error('Raumbreite und Raumtiefe müssen größer als null sein.');
  if(basis==='clear'&&(!wallThicknessMm||!new D(wallThicknessMm).gt(0)))throw new Error('Für lichte Innenmaße eine positive Wandstärke angeben oder ausdrücklich Wandachsmaße wählen.');
  const half=basis==='clear'?new D(wallThicknessMm!).div(2):new D(0);
  const x0=new D(origin.xMm).minus(half),y0=new D(origin.yMm).minus(half);
  const x1=new D(origin.xMm).plus(width).plus(half),y1=new D(origin.yMm).plus(depth).plus(half);
  return [[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(([x,y])=>({xMm:mm(x),yMm:mm(y),zMm:origin.zMm}));
}

import type {DesignSnapshot} from '@schubert/contracts';
import {measureValue} from './model.js';
import {worldPoint} from './transforms.js';

/** Derived model dimensions, never an attested survey. Limit this to a closed
 * rectangle: a bounding box of an irregular room is not a usable clear dimension. */
export function rectangularRoomClearPoints(snapshot:DesignSnapshot,roomId:string):Point3[]|null{
 const room=snapshot.elements.find(e=>e.id===roomId);
 if(room?.kind!=='room'||room.phase==='demolition'||room.boundary.length!==4)return null;
 const walls=room.boundary.map(boundary=>{
  const wall=snapshot.elements.find(e=>e.id===boundary.wallId);
  if(wall?.kind!=='wall'||wall.phase==='demolition')return null;
  const a=worldPoint(snapshot,boundary.side==='left'?wall.startNodeId:wall.endNodeId),b=worldPoint(snapshot,boundary.side==='left'?wall.endNodeId:wall.startNodeId);
  const core=measureValue(snapshot,wall.coreThicknessMeasureId),layers=wall.layers.filter(layer=>layer.side===boundary.side).map(layer=>measureValue(snapshot,layer.thicknessMeasureId));
  if(core===null||Number(core)<=0||layers.some(v=>v===null||Number(v)<0))return null;
  const dx=Number(b.xMm)-Number(a.xMm),dy=Number(b.yMm)-Number(a.yMm),length=Math.hypot(dx,dy);
  if(length<.01||Math.abs(Number(b.zMm)-Number(a.zMm))>.01)return null;
  const inset=Number(core)/2+layers.reduce<number>((sum,v)=>sum+Number(v),0),u={x:dx/length,y:dy/length};
  return {a,b,u,inset,p:{x:Number(a.xMm)-u.y*inset,y:Number(a.yMm)+u.x*inset}};
 });
 if(walls.some(w=>!w))return null;
 const edges=walls.filter(w=>w!==null);
 for(let i=0;i<4;i++){
  const edge=edges[i],next=edges[(i+1)%4];
  if(Math.hypot(Number(edge.b.xMm)-Number(next.a.xMm),Number(edge.b.yMm)-Number(next.a.yMm))>.01||Math.abs(Number(edge.a.zMm)-Number(next.a.zMm))>.01)return null;
  if(Math.abs(edge.u.x*next.u.x+edge.u.y*next.u.y)>1e-6||edge.u.x*next.u.y-edge.u.y*next.u.x<.999999)return null;
 }
 const points=edges.map((edge,i)=>{
  const prev=edges[(i+3)%4],cross=prev.u.x*edge.u.y-prev.u.y*edge.u.x;
  const t=((edge.p.x-prev.p.x)*edge.u.y-(edge.p.y-prev.p.y)*edge.u.x)/cross;
  return {xMm:mm(prev.p.x+t*prev.u.x),yMm:mm(prev.p.y+t*prev.u.y),zMm:edge.a.zMm};
 });
 // Opposite finish faces may meet when the room is too narrow; never label a
 // reversed/negative usable span as an interior dimension.
 if(edges.some((edge,i)=>(Number(points[(i+1)%4].xMm)-Number(points[i].xMm))*edge.u.x+(Number(points[(i+1)%4].yMm)-Number(points[i].yMm))*edge.u.y<=0))return null;
 return points;
}
