import type {DesignSnapshot,Point2,Point3} from '@schubert/contracts';
import {contourBounds} from './contours.js';
import {applyMatrix,surfaceMatrix,worldPoint} from './transforms.js';
import {measureValue} from './model.js';
import {projectPoint,type DesignView} from './views.js';
import {mm} from './precision.js';
import {rectangularRoomClearPoints} from './room-dimensions.js';

export type ProjectedDimension={elementId:string;label:string;valueMm:string;basis:'target'|'reference';a:Point2;b:Point2;outward:{x:number;y:number};offsetMm:number};
/** Only show true-length projections; a foreshortened segment must not imply a false scale. */
export function projectDimensions(snapshot:DesignSnapshot,view:DesignView):ProjectedDimension[]{
  const result:ProjectedDimension[]=[];
  function add(elementId:string,label:string,valueMm:string,basis:ProjectedDimension['basis'],a:Point3,b:Point3,outward:Point3|null,offsetMm=30){
    const p=projectPoint(a,view),q=projectPoint(b,view),dx=Number(q.xMm)-Number(p.xMm),dy=Number(q.yMm)-Number(p.yMm),length=Math.hypot(dx,dy);
    const actual=Math.hypot(Number(b.xMm)-Number(a.xMm),Number(b.yMm)-Number(a.yMm),Number(b.zMm)-Number(a.zMm));
    if(length<.01||Math.abs(length-actual)>.02)return;
    const o=outward?projectPoint(outward,view):null,ox=o?Number(o.xMm)-Number(p.xMm):dy,oy=o?Number(o.yMm)-Number(p.yMm):-dx,normal=Math.hypot(ox,oy);
    result.push({elementId,label,valueMm,basis,a:p,b:q,outward:normal>.0001?{x:ox/normal,y:oy/normal}:{x:dy/length,y:-dx/length},offsetMm});
  }
  for(const e of snapshot.elements){
    if(e.phase==='demolition')continue;
    if(e.kind==='room'&&view==='top'){
      const points=rectangularRoomClearPoints(snapshot,e.id);
      if(points)for(let i=0;i<2;i++){
        const a=points[i],b=points[i+1],dx=Number(b.xMm)-Number(a.xMm),dy=Number(b.yMm)-Number(a.yMm),length=Math.hypot(dx,dy);
        add(e.id,`${e.label} · Lichtes Innenmaß`,mm(length),'reference',a,b,{xMm:mm(Number(a.xMm)-dy/length),yMm:mm(Number(a.yMm)+dx/length),zMm:a.zMm},150);
      }
    }
    if(e.kind==='wall'&&view==='top'){
      const a=worldPoint(snapshot,e.startNodeId),b=worldPoint(snapshot,e.endNodeId);
      const value=mm(Math.hypot(Number(b.xMm)-Number(a.xMm),Number(b.yMm)-Number(a.yMm),Number(b.zMm)-Number(a.zMm)));
      add(e.id,e.label+' · Wandachse',value,'reference',a,b,null,Number(measureValue(snapshot,e.coreThicknessMeasureId)??0)/2+40);
    }
    if(e.kind!=='dimension'||e.refs.length!==1)continue;
    const ref=e.refs[0],stone=snapshot.elements.find(v=>v.id===ref.elementId),value=measureValue(snapshot,e.measureId);
    if(stone?.kind!=='stone_piece'||stone.phase==='demolition'||value===null||!['width','height'].includes(ref.feature))continue;
    const raw=contourBounds(stone.finishedContour),b={minX:Number(raw.minX),minY:Number(raw.minY),maxX:Number(raw.maxX),maxY:Number(raw.maxY)},m=surfaceMatrix(snapshot,stone.id);
    const point=(x:number,y:number)=>applyMatrix({xMm:mm(x),yMm:mm(y),zMm:'0'},m),a=point(b.minX,b.minY),end=ref.feature==='width'?point(b.maxX,b.minY):point(b.minX,b.maxY);
    let outward=ref.feature==='width'?point(b.minX,b.minY-1):point(b.minX-1,b.minY);
    const pa=projectPoint(a,view),po=projectPoint(outward,view);
    // In an edge-on view, place the label outside the extrusion, never inside the stone.
    if(Math.hypot(Number(pa.xMm)-Number(po.xMm),Number(pa.yMm)-Number(po.yMm))<.001)outward=applyMatrix({xMm:mm(b.minX),yMm:mm(b.minY),zMm:'1'},m);
    add(e.id,e.label,value,e.mode==='driving'?'target':'reference',a,end,outward,Number(e.offsetMm));
  }
  return result;
}

/** Shared screen/PDF annotation layout; coordinate axes stay right-handed, y up. */
export function layoutDimension(d:ProjectedDimension,minimumOffsetMm:number){
  const offset=Math.max(Math.abs(d.offsetMm),minimumOffsetMm)*(d.offsetMm<0?-1:1),dx=d.outward.x*offset,dy=d.outward.y*offset;
  return {a:{x:Number(d.a.xMm)+dx,y:Number(d.a.yMm)+dy},b:{x:Number(d.b.xMm)+dx,y:Number(d.b.yMm)+dy},label:{x:(Number(d.a.xMm)+Number(d.b.xMm))/2+dx,y:(Number(d.a.yMm)+Number(d.b.yMm))/2+dy}};
}

/** Vertical dimension text faces away from its line, so inward clear labels and
 * outward axis labels cannot grow towards one another. Used on screen and PDF. */
export function dimensionTextAnchor(d:ProjectedDimension):'start'|'middle'|'end'{
 return Math.abs(Number(d.b.yMm)-Number(d.a.yMm))>Math.abs(Number(d.b.xMm)-Number(d.a.xMm))?(d.outward.x<0?'end':'start'):'middle';
}

/**
 * A rectangular room repeats every wall-axis measure on the opposite side. For a
 * calm drawing only the lower (bottom) and left measure of each repeated pair is
 * kept; unique walls and all other measures stay. Display only, no data change.
 */
export function withoutRepeatedWallAxes(dimensions:ProjectedDimension[]):ProjectedDimension[]{
 const axis=dimensions.filter(d=>d.label.endsWith(' · Wandachse')),hidden=new Set<ProjectedDimension>();
 const geometry=(d:ProjectedDimension)=>{const ax=Number(d.a.xMm),ay=Number(d.a.yMm),bx=Number(d.b.xMm),by=Number(d.b.yMm);return{horizontal:Math.abs(ay-by)<.01,vertical:Math.abs(ax-bx)<.01,lo:Math.min(ax,bx),hi:Math.max(ax,bx),loY:Math.min(ay,by),hiY:Math.max(ay,by),x:(ax+bx)/2,y:(ay+by)/2};};
 for(const d of axis){
  const g=geometry(d);if(!g.horizontal&&!g.vertical)continue;
  const twin=axis.some(o=>{if(o===d||hidden.has(o)||Math.abs(Number(o.valueMm)-Number(d.valueMm))>.01)return false;const h=geometry(o);
   return g.horizontal?h.horizontal&&Math.abs(h.lo-g.lo)<.5&&Math.abs(h.hi-g.hi)<.5&&h.y<g.y-.5:h.vertical&&Math.abs(h.loY-g.loY)<.5&&Math.abs(h.hiY-g.hiY)<.5&&h.x<g.x-.5;});
  if(twin)hidden.add(d);
 }
 return dimensions.filter(d=>!hidden.has(d));
}
