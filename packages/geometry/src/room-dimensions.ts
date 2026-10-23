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
