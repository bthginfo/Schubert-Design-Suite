import type{DesignSnapshot,OpeningElement,Contour}from'@schubert/contracts';
import{worldPoint}from'./transforms.js';import{measureValue}from'./model.js';import{mm}from'./precision.js';
/** Plan symbol for a known through-opening, including the known finish layers.
 * It is an opening convention, not an invented cutting-plane elevation. */
export function openingPlanGap(snapshot:DesignSnapshot,opening:OpeningElement):Contour|null{
 if(opening.openingType==='recess'||opening.phase==='demolition')return null;
 const wall=snapshot.elements.find(e=>e.id===opening.wallId);if(wall?.kind!=='wall')return null;
 const values=[opening.offsetAlongWallMeasureId,opening.widthMeasureId,opening.heightMeasureId,opening.sillHeightMeasureId,wall.coreThicknessMeasureId].map(id=>measureValue(snapshot,id));
 if(values.some(v=>v===null))return null;const[offset,width,height,,core]=values.map(Number);if(width<=0||height<=0||core<=0)return null;
 if(![wall.startNodeId,wall.endNodeId].every(id=>snapshot.elements.some(e=>e.id===id&&e.kind==='node')))return null;
 const a=worldPoint(snapshot,wall.startNodeId),b=worldPoint(snapshot,wall.endNodeId),dx=Number(b.xMm)-Number(a.xMm),dy=Number(b.yMm)-Number(a.yMm),length=Math.hypot(dx,dy);if(!length)return null;
 let left=core/2,right=core/2;for(const side of ['left','right'] as const)for(const layer of wall.layers.filter(l=>l.side===side)){const thickness=measureValue(snapshot,layer.thicknessMeasureId);if(thickness===null)break;if(side==='left')left+=Number(thickness);else right+=Number(thickness);}
 const point=(along:number,normal:number)=>({xMm:mm(Number(a.xMm)+dx/length*along-dy/length*normal),yMm:mm(Number(a.yMm)+dy/length*along+dx/length*normal)});
 const points=[point(offset,-right),point(offset+width,-right),point(offset+width,left),point(offset,left)];
 return{outer:points.map((from,i)=>({kind:'line' as const,from,to:points[(i+1)%4]})),holes:[]};
}
/** Analytic quarter-circle sweep in the directed wall's world XY plane. */
export function doorSwingContour(snapshot:DesignSnapshot,door:OpeningElement):Contour|null{
 if(door.openingType!=='door'||!door.hingeSide||!['inward','outward'].includes(door.openingDirection))return null;
 const wall=snapshot.elements.find(e=>e.id===door.wallId),width=measureValue(snapshot,door.widthMeasureId),offset=measureValue(snapshot,door.offsetAlongWallMeasureId);if(wall?.kind!=='wall'||width===null||offset===null||![wall.startNodeId,wall.endNodeId].every(id=>snapshot.elements.some(e=>e.id===id&&e.kind==='node')))return null;
 const a=worldPoint(snapshot,wall.startNodeId),b=worldPoint(snapshot,wall.endNodeId),dx=Number(b.xMm)-Number(a.xMm),dy=Number(b.yMm)-Number(a.yMm),length=Math.hypot(dx,dy);if(!length)return null;
 const ux=dx/length,uy=dy/length,r=Number(width),direction=door.hingeSide==='right'?-1:1,sign=door.openingDirection==='inward'?1:-1,h=Number(offset)+(direction<0?r:0),hinge={xMm:mm(Number(a.xMm)+ux*h),yMm:mm(Number(a.yMm)+uy*h)},closed={xMm:mm(Number(hinge.xMm)+ux*direction*r),yMm:mm(Number(hinge.yMm)+uy*direction*r)},opened={xMm:mm(Number(hinge.xMm)-uy*sign*r),yMm:mm(Number(hinge.yMm)+ux*sign*r)};
 return{outer:[{kind:'line',from:hinge,to:closed},{kind:'circular_arc',from:closed,to:opened,center:hinge,clockwise:direction*sign<0},{kind:'line',from:opened,to:hinge}],holes:[]};
}
