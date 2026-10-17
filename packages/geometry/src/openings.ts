import type{DesignSnapshot,OpeningElement,Contour}from'@schubert/contracts';
import{worldPoint}from'./transforms.js';import{measureValue}from'./model.js';import{mm}from'./precision.js';
/** Analytic quarter-circle sweep in the directed wall's world XY plane. */
export function doorSwingContour(snapshot:DesignSnapshot,door:OpeningElement):Contour|null{
 if(door.openingType!=='door'||!door.hingeSide||!['inward','outward'].includes(door.openingDirection))return null;
 const wall=snapshot.elements.find(e=>e.id===door.wallId),width=measureValue(snapshot,door.widthMeasureId),offset=measureValue(snapshot,door.offsetAlongWallMeasureId);if(wall?.kind!=='wall'||width===null||offset===null||![wall.startNodeId,wall.endNodeId].every(id=>snapshot.elements.some(e=>e.id===id&&e.kind==='node')))return null;
 const a=worldPoint(snapshot,wall.startNodeId),b=worldPoint(snapshot,wall.endNodeId),dx=Number(b.xMm)-Number(a.xMm),dy=Number(b.yMm)-Number(a.yMm),length=Math.hypot(dx,dy);if(!length)return null;
 const ux=dx/length,uy=dy/length,r=Number(width),direction=door.hingeSide==='right'?-1:1,sign=door.openingDirection==='inward'?1:-1,h=Number(offset)+(direction<0?r:0),hinge={xMm:mm(Number(a.xMm)+ux*h),yMm:mm(Number(a.yMm)+uy*h)},closed={xMm:mm(Number(hinge.xMm)+ux*direction*r),yMm:mm(Number(hinge.yMm)+uy*direction*r)},opened={xMm:mm(Number(hinge.xMm)-uy*sign*r),yMm:mm(Number(hinge.yMm)+ux*sign*r)};
 return{outer:[{kind:'line',from:hinge,to:closed},{kind:'circular_arc',from:closed,to:opened,center:hinge,clockwise:direction*sign<0},{kind:'line',from:opened,to:hinge}],holes:[]};
}
