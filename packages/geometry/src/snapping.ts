import type{DesignSnapshot,Point2,Contour}from'@schubert/contracts';
import{mm}from'./precision.js';
import{arcSweep,contourParts,contourBounds}from'./contours.js';
import{applyMatrix,worldMatrix,worldPoint,surfaceMatrix}from'./transforms.js';
import{measureValue}from'./model.js';
import{projectPoint,projectDesign,type DesignView,type ProjectedDesign}from'./views.js';
import{wallCoreFootprint,wallLayerFootprints}from'./walls.js';

type PointKind='endpoint'|'midpoint'|'center'|'connection';
export type DesignSnapTarget={elementId:string;label:string;kind:PointKind;point:Point2}|{elementId:string;label:string;kind:'wall_face'|'wall_axis';a:Point2;b:Point2};
export type DesignSnapResult={point:Point2;label:string;kind:PointKind|'wall_face'|'wall_axis'|'alignment'|'grid';elementId:string|null};
const names:Record<DesignSnapResult['kind'],string>={endpoint:'Endpunkt',midpoint:'Mittelpunkt',center:'Objektmitte',connection:'Anschluss',wall_face:'Wandfläche',wall_axis:'Wandachse',alignment:'Ausrichtung',grid:'Raster'};
const point=(x:number,y:number):Point2=>({xMm:mm(x),yMm:mm(y)});

/** Canonical endpoints and analytic arc midpoints; sampled display polylines are not treated as original vertices. */
export function buildDesignSnapTargets(snapshot:DesignSnapshot,view:DesignView,projected:ProjectedDesign=projectDesign(snapshot,view)):DesignSnapTarget[]{
 const targets:DesignSnapTarget[]=[];
 const add=(elementId:string,label:string,kind:PointKind,p:Point2)=>targets.push({elementId,label,kind,point:p});
 function ring(id:string,label:string,points:Point2[],closed:boolean,wallFace=false){for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];add(id,label,'endpoint',a);if(i===points.length-1&&!closed)continue;add(id,label,'midpoint',point((Number(a.xMm)+Number(b.xMm))/2,(Number(a.yMm)+Number(b.yMm))/2));if(wallFace)targets.push({elementId:id,label,kind:'wall_face',a,b});}}
 function contour(id:string,label:string,c:Contour,matrix:number[],z='0'){
  const p=(at:Point2)=>projectPoint(applyMatrix({...at,zMm:z},matrix),view),suffix=c.importProvenance?.approximated?' · Importnäherung':'';
  for(const part of contourParts(c))for(const edges of[part.outer,...part.holes])for(const edge of edges){add(id,label+suffix,'endpoint',p(edge.from));add(id,label+suffix,'endpoint',p(edge.to));let middle:Point2;
   if(edge.kind==='line')middle=point((Number(edge.from.xMm)+Number(edge.to.xMm))/2,(Number(edge.from.yMm)+Number(edge.to.yMm))/2);
   else{const radius=Math.hypot(Number(edge.from.xMm)-Number(edge.center.xMm),Number(edge.from.yMm)-Number(edge.center.yMm)),start=Math.atan2(Number(edge.from.yMm)-Number(edge.center.yMm),Number(edge.from.xMm)-Number(edge.center.xMm)),angle=start+arcSweep(edge)/2;middle=point(Number(edge.center.xMm)+radius*Math.cos(angle),Number(edge.center.yMm)+radius*Math.sin(angle));add(id,label+suffix,'center',p(edge.center));}
   add(id,label+suffix,'midpoint',p(middle));
  }
  const bounds=contourBounds(c);add(id,label+suffix,'center',p(point((Number(bounds.minX)+Number(bounds.maxX))/2,(Number(bounds.minY)+Number(bounds.maxY))/2)));
 }
 for(const e of snapshot.elements){if(e.phase==='demolition'||e.kind==='plan_reference'||e.kind==='dimension'||e.kind==='room')continue;
  if(e.kind==='node'||e.kind==='connection')add(e.id,e.label,e.kind==='connection'?'connection':'endpoint',projectPoint(worldPoint(snapshot,e.id),view));
  else if(e.kind==='wall'){
   const a=projectPoint(worldPoint(snapshot,e.startNodeId),view),b=projectPoint(worldPoint(snapshot,e.endNodeId),view);add(e.id,e.label,'endpoint',a);add(e.id,e.label,'endpoint',b);add(e.id,e.label,'midpoint',point((Number(a.xMm)+Number(b.xMm))/2,(Number(a.yMm)+Number(b.yMm))/2));targets.push({elementId:e.id,label:e.label,kind:'wall_axis',a,b});
   if(view==='top'){const core=wallCoreFootprint(snapshot,e.id);if(core)ring(e.id,e.label,core.outer.map(edge=>edge.from),true,true);for(const layer of wallLayerFootprints(snapshot,e.id))ring(e.id,e.label+' · Schicht',layer.contour.outer.map(edge=>edge.from),true,true);}
   else for(const shape of projected.shapes.filter(s=>s.elementId===e.id&&!s.secondary))ring(e.id,e.label,shape.points,shape.closed,true);
  }else if(e.kind==='slope'){const matrix=worldMatrix(snapshot,e.hostElementId);ring(e.id,e.label,[e.start,e.end].map(p=>projectPoint(applyMatrix(p,matrix),view)),false);}
  else if(e.kind==='technical_note')add(e.id,e.label,'endpoint',projectPoint(applyMatrix(e.point,worldMatrix(snapshot,e.parentId)),view));
  else if(e.kind==='inscription')add(e.id,e.label,'endpoint',projectPoint(applyMatrix({xMm:e.originUV.uMm,yMm:e.originUV.vMm,zMm:'0'},surfaceMatrix(snapshot,e.surfaceElementId)),view));
  else if(e.kind==='opening'){for(const shape of projected.shapes.filter(s=>s.elementId===e.id&&!s.secondary))ring(e.id,e.label,shape.points,shape.closed);}
  else{const c=e.kind==='stone_piece'?e.finishedContour:e.kind==='catalog_object'?e.footprint:'contour'in e?e.contour:null;if(c){const matrix=surfaceMatrix(snapshot,e.kind==='machining'?e.hostElementId:e.id);contour(e.id,e.label,c,matrix);if(view!=='top'&&(e.kind==='stone_piece'||e.kind==='catalog_object')){const height=measureValue(snapshot,e.kind==='stone_piece'?e.thicknessMeasureId:e.heightMeasureId??null);if(height!==null)contour(e.id,e.label,c,matrix,String(Number(height)*(e.kind==='stone_piece'?-1:1)));}}}
 }
 return targets;
}

/** Moving a wall also moves its nodes; dependent outlines must not snap back onto their own prior position. */
export function movingSnapElementIds(snapshot:DesignSnapshot,id:string):Set<string>{
 const moving=new Set([id]),selected=snapshot.elements.find(e=>e.id===id);if(selected?.kind==='wall'){moving.add(selected.startNodeId);moving.add(selected.endNodeId);}
 if(selected?.kind==='room')for(const wall of snapshot.elements)if(wall.kind==='wall'&&selected.boundary.some(b=>b.wallId===wall.id)){moving.add(wall.id);moving.add(wall.startNodeId);moving.add(wall.endNodeId);}
 let changed=true;while(changed){changed=false;for(const e of snapshot.elements){const follows=!!e.parentId&&moving.has(e.parentId)||e.kind==='wall'&&(moving.has(e.startNodeId)||moving.has(e.endNodeId))||e.kind==='opening'&&moving.has(e.wallId)||e.kind==='room'&&e.boundary.some(b=>moving.has(b.wallId))||(e.kind==='machining'||e.kind==='slope')&&moving.has(e.hostElementId)||e.kind==='inscription'&&moving.has(e.surfaceElementId);if(follows&&!moving.has(e.id)){moving.add(e.id);changed=true;}}}return moving;
}

export function designSnapOrigin(targets:DesignSnapTarget[],elementId:string,near:Point2):Point2|null{let best=Infinity,result:Point2|null=null;for(const target of targets)if(target.elementId===elementId&&'point'in target){const d=Math.hypot(Number(target.point.xMm)-Number(near.xMm),Number(target.point.yMm)-Number(near.yMm));if(d<best){best=d;result=target.point;}}return result;}

export function findDesignSnap(targets:DesignSnapTarget[],desired:Point2,radiusMm:number,excluded:ReadonlySet<string>=new Set(),gridMm:number|null=null):DesignSnapResult|null{
 const x=Number(desired.xMm),y=Number(desired.yMm);if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(radiusMm)||radiusMm<=0)return null;
 let best=radiusMm,result:DesignSnapResult|null=null,alignX:{value:number;label:string;id:string}|null=null,alignY:{value:number;label:string;id:string}|null=null,distX=radiusMm,distY=radiusMm;
 for(const target of targets){if(excluded.has(target.elementId)||!('point'in target))continue;const px=Number(target.point.xMm),py=Number(target.point.yMm),distance=Math.hypot(px-x,py-y);if(distance<best){best=distance;result={point:target.point,label:`${names[target.kind]} · ${target.label} · ${target.point.xMm} / ${target.point.yMm} mm`,kind:target.kind,elementId:target.elementId};}if(Math.abs(px-x)<distX){distX=Math.abs(px-x);alignX={value:px,label:target.label,id:target.elementId};}if(Math.abs(py-y)<distY){distY=Math.abs(py-y);alignY={value:py,label:target.label,id:target.elementId};}}
 if(result)return result;
 for(const target of targets){if(excluded.has(target.elementId)||!('a'in target))continue;const ax=Number(target.a.xMm),ay=Number(target.a.yMm),dx=Number(target.b.xMm)-ax,dy=Number(target.b.yMm)-ay,length=dx*dx+dy*dy;if(!length)continue;const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/length)),p=point(ax+t*dx,ay+t*dy),distance=Math.hypot(Number(p.xMm)-x,Number(p.yMm)-y);if(distance<best){best=distance;result={point:p,label:`${names[target.kind]} · ${target.label} · ${p.xMm} / ${p.yMm} mm`,kind:target.kind,elementId:target.elementId};}}
 if(result)return result;
 if(alignX||alignY){const p=point(alignX?.value??x,alignY?.value??y);return{point:p,kind:'alignment',elementId:alignX?.id??alignY?.id??null,label:`${alignX?'X-Ausrichtung · '+alignX.label:''}${alignX&&alignY?' · ':''}${alignY?'Y-Ausrichtung · '+alignY.label:''} · ${p.xMm} / ${p.yMm} mm`};}
 if(gridMm!==null&&Number.isFinite(gridMm)&&gridMm>0){const p=point(Math.round(x/gridMm)*gridMm,Math.round(y/gridMm)*gridMm);if(Math.hypot(Number(p.xMm)-x,Number(p.yMm)-y)<radiusMm)return{point:p,kind:'grid',elementId:null,label:`Raster ${mm(gridMm)} mm · ${p.xMm} / ${p.yMm} mm`};}
 return null;
}
