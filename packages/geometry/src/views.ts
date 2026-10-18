import{wallCoreEnds,wallCoreFootprint,wallLayerFootprints}from'./walls.js';
import type { DesignSnapshot, DesignElement, Point2, Point3, Contour } from '@schubert/contracts';
import { D, mm, decimalString } from './precision.js';
import { sampleRing,contourParts } from './contours.js';
import { measureValue } from './model.js';
import { applyMatrix, worldMatrix, surfaceMatrix, worldPoint } from './transforms.js';
import { roomContour } from './validation.js';
import {calibrateReference,sourcePointToMm}from'./references.js';
import{doorSwingContour,openingPlanGap}from'./openings.js';

export type DesignView = 'top' | 'front' | 'side';
export type ViewShape = { elementId: string; label: string; kind: string; points: Point2[]; holes: Point2[][]; closed: boolean; secondary?: boolean; estimated?: boolean; erase?:boolean };
export type ProjectedDesign = { shapes: ViewShape[]; texts: Array<{ elementId: string; point: Point2; text: string; referenceOnly: boolean }>;
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } };
export function projectPoint(point: Point3, view: DesignView): Point2 {
  return view === 'top' ? { xMm: point.xMm, yMm: point.yMm } : view === 'front' ? { xMm: point.xMm, yMm: point.zMm } : { xMm: point.yMm, yMm: point.zMm };
}
export function projectDesign(snapshot: DesignSnapshot, view: DesignView = snapshot.kind === 'memorial' ? 'front' : 'top'): ProjectedDesign {
  const shapes: ViewShape[] = [], texts: ProjectedDesign['texts'] = [];
  for (const element of snapshot.elements) {
    if(element.kind==='plan_reference'&&view==='top'&&element.opacity>0&&calibrateReference(snapshot,element).usable){const matrix=worldMatrix(snapshot,element.id),points=[{xPx:'0',yPx:'0'},{xPx:String(element.widthPx),yPx:'0'},{xPx:String(element.widthPx),yPx:String(element.heightPx)},{xPx:'0',yPx:String(element.heightPx)}].map(p=>projectPoint(applyMatrix(sourcePointToMm(snapshot,element,p),matrix),view));shapes.push({elementId:element.id,label:element.label,kind:element.kind,points,holes:[],closed:true,secondary:true,estimated:true});}
    let contour: Contour | null = element.kind === 'stone_piece' ? element.finishedContour : element.kind === 'catalog_object' ? element.footprint : 'contour' in element ? element.contour : null;
    if (element.kind === 'room') { const c = roomContour(snapshot, element.id); if (c && view === 'top') shapes.push({ elementId: element.id, label: element.label, kind: element.kind, points: sampleRing(c.outer), holes: [], closed: true }); }
    if (element.kind === 'wall') {
      const start = snapshot.elements.find(e => e.id === element.startNodeId), end = snapshot.elements.find(e => e.id === element.endNodeId);
      if (start?.kind !== 'node' || end?.kind !== 'node') continue;
      const ends=wallCoreEnds(snapshot,element.id),a=ends?.a??worldPoint(snapshot,start.id),b=ends?.b??worldPoint(snapshot,end.id), height = measureValue(snapshot, element.heightMeasureId), thickness = measureValue(snapshot, element.coreThicknessMeasureId);
      if (view === 'top' && thickness !== null) {
        const footprint=wallCoreFootprint(snapshot,element.id);if(footprint)shapes.push({elementId:element.id,label:element.label,kind:element.kind,points:sampleRing(footprint.outer),holes:[],closed:true});
        for(const layer of wallLayerFootprints(snapshot,element.id))shapes.push({elementId:element.id,label:`${element.label} · Schicht`,kind:'wall',points:sampleRing(layer.contour.outer),holes:[],closed:true,secondary:true});
      } else if (height !== null && view !== 'top') shapes.push({ elementId: element.id, label: element.label, kind: element.kind, points: [a,b,{...b,zMm:mm(new D(b.zMm).plus(height))},{...a,zMm:mm(new D(a.zMm).plus(height))}].map(p => projectPoint(p,view)), holes: [], closed: true });
      else shapes.push({ elementId: element.id, label: element.label, kind: element.kind, points:[projectPoint(a,view),projectPoint(b,view)],holes:[],closed:false,estimated:true });
    }
    if (element.kind === 'opening') {
      const wall = snapshot.elements.find(e => e.id === element.wallId), offset = measureValue(snapshot,element.offsetAlongWallMeasureId), width = measureValue(snapshot,element.widthMeasureId), height = measureValue(snapshot,element.heightMeasureId), sill = measureValue(snapshot,element.sillHeightMeasureId);
      if (wall?.kind !== 'wall' || offset === null || width === null || !snapshot.elements.some(e => e.id === wall.startNodeId && e.kind === 'node') || !snapshot.elements.some(e => e.id === wall.endNodeId && e.kind === 'node')) continue;
      const a=worldPoint(snapshot,wall.startNodeId),b=worldPoint(snapshot,wall.endNodeId),dx=Number(b.xMm)-Number(a.xMm),dy=Number(b.yMm)-Number(a.yMm),length=Math.hypot(dx,dy);
      if (!length) continue;
      const point=(s:number,z:number):Point3=>({xMm:mm(Number(a.xMm)+dx/length*s),yMm:mm(Number(a.yMm)+dy/length*s),zMm:mm(Number(a.zMm)+z)});
      const start=point(Number(offset),Number(sill??0)),end=point(Number(offset)+Number(width),Number(sill??0));
      const points=view==='top'?[start,end]:height===null?[start,end]:[start,end,{...end,zMm:mm(Number(end.zMm)+Number(height))},{...start,zMm:mm(Number(start.zMm)+Number(height))}];
      shapes.push({elementId:element.id,label:element.label,kind:element.kind,points:points.map(p=>projectPoint(p,view)),holes:[],closed:points.length>2,estimated:height===null||sill===null});
      if(view==='top'){
        const gap=openingPlanGap(snapshot,element);if(gap){const points=gap.outer.map(e=>e.from);shapes.push({elementId:element.id,label:element.label+' · Öffnungssymbol',kind:'opening',points,holes:[],closed:true,secondary:true,erase:true});for(const ends of [[points[0],points[3]],[points[1],points[2]]])shapes.push({elementId:element.id,label:element.label+' · Laibung',kind:'opening',points:ends,holes:[],closed:false});}
        const swing=doorSwingContour(snapshot,element);if(swing)shapes.push({elementId:element.id,label:element.label+' · Schwenkbereich',kind:'opening',points:sampleRing(swing.outer),holes:[],closed:true,secondary:true});
      }
    }
    if (contour) {
      let matrix = surfaceMatrix(snapshot, element.id);
      if (element.kind === 'machining') matrix = surfaceMatrix(snapshot, element.hostElementId);
      const project = (points: Point2[], zMm='0') => points.map(p=>projectPoint(applyMatrix({...p,zMm},matrix),view));
      for(const part of contourParts(contour)){const base = sampleRing(part.outer),front=project(base);
      // An edge-on curved face is a line, not a stack of sampling facets.
      const area=front.reduce((sum,p,i)=>{const q=front[(i+1)%front.length];return sum+Number(p.xMm)*Number(q.yMm)-Number(q.xMm)*Number(p.yMm);},0);
      const edgeOn=element.kind==='stone_piece'&&Math.abs(area)<.01;
      const extent=(axis:'xMm'|'yMm',sign:number)=>base.reduce((best,p,i)=>sign*Number(front[i][axis])>sign*Number(front[best][axis])?i:best,0);
      const extremes=[extent('xMm',-1),extent('xMm',1),extent('yMm',-1),extent('yMm',1)];
      const xSpan=Number(front[extremes[1]].xMm)-Number(front[extremes[0]].xMm),ySpan=Number(front[extremes[3]].yMm)-Number(front[extremes[2]].yMm);
      const silhouette=(xSpan>ySpan?extremes.slice(0,2):extremes.slice(2)).map(i=>base[i]);
      shapes.push({ elementId: element.id, label: element.label, kind: element.kind, points: edgeOn?project(silhouette):front, holes: edgeOn?[]:part.holes.map(h=>project(sampleRing(h))), closed:!edgeOn });
      if (element.kind === 'stone_piece') {
        const thickness = measureValue(snapshot,element.thicknessMeasureId);
        if (thickness !== null) {
          const z = mm(new D(thickness).negated());
          const back=project(edgeOn?silhouette:base,z),delta=Math.hypot(Number(back[0].xMm)-Number(project(edgeOn?silhouette:base)[0].xMm),Number(back[0].yMm)-Number(project(edgeOn?silhouette:base)[0].yMm));
          if(delta>.005){
            shapes.push({elementId:element.id,label:element.label,kind:element.kind,points:back,holes:[],closed:!edgeOn,secondary:!edgeOn});
            const connectors=edgeOn?silhouette:[...part.outer.map(e=>e.from),...extremes.map(i=>base[i])];
            const seen=new Set<string>();
            for (const p of connectors){const points=[project([p])[0],project([p],z)[0]],key=JSON.stringify(points);if(seen.has(key))continue;seen.add(key);shapes.push({elementId:element.id,label:element.label,kind:element.kind,points,holes:[],closed:false,secondary:!edgeOn});}
          }
        }
      }
      }
    }
    if(element.kind==='slope'){const matrix=worldMatrix(snapshot,element.hostElementId);shapes.push({elementId:element.id,label:element.label,kind:element.kind,points:[element.start,element.end].map(p=>projectPoint(applyMatrix(p,matrix),view)),holes:[],closed:false});}
    if (element.kind === 'node') shapes.push({elementId:element.id,label:element.label,kind:element.kind,points:[projectPoint(worldPoint(snapshot,element.id),view)],holes:[],closed:false});
    if (element.kind === 'connection') shapes.push({elementId:element.id,label:element.label,kind:element.kind,points:[projectPoint(worldPoint(snapshot,element.id),view)],holes:[],closed:false});
    if (element.kind === 'inscription') {
      const point = applyMatrix({xMm:element.originUV.uMm,yMm:element.originUV.vMm,zMm:'0'},surfaceMatrix(snapshot,element.surfaceElementId));
      texts.push({elementId:element.id,point:projectPoint(point,view),text:element.exactText,referenceOnly:element.renderingBasis==='shop_image_reference'});
    }
    if (element.kind === 'technical_note') texts.push({elementId:element.id,point:projectPoint(applyMatrix(element.point,worldMatrix(snapshot,element.parentId)),view),text:element.text,referenceOnly:false});
  }
  // Draw opening conventions over wall/room fills, independent of insertion order.
  if(view==='top')shapes.sort((a,b)=>(a.kind==='opening'?(a.erase?1:2):0)-(b.kind==='opening'?(b.erase?1:2):0));
  const all=shapes.flatMap(s=>s.points), xs=all.map(p=>Number(p.xMm)),ys=all.map(p=>Number(p.yMm));
  const minX=xs.length?Math.min(...xs):0,minY=ys.length?Math.min(...ys):0,maxX=xs.length?Math.max(...xs):1000,maxY=ys.length?Math.max(...ys):1000;
  return {shapes,texts,bounds:{minX,minY,maxX,maxY,width:Math.max(1,maxX-minX),height:Math.max(1,maxY-minY)}};
}
export function escapeXml(value: string): string {return value.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));}
export function scaledDrawingSize(widthMm: string, heightMm: string, scale=20): { widthMm: string; heightMm:string } {
  if (!Number.isFinite(scale)||scale<=0) throw new Error('Maßstab muss positiv sein.');
  return {widthMm:decimalString(new D(widthMm).div(scale)),heightMm:decimalString(new D(heightMm).div(scale))};
}
export function renderTechnicalSvg(snapshot: DesignSnapshot, view:DesignView=snapshot.kind==='memorial'?'front':'top', scale=20): string {
  const model=projectDesign(snapshot,view),b=model.bounds,size=scaledDrawingSize(String(b.width),String(b.height),scale);
  const path=(points:Point2[],closed:boolean)=>points.map((p,i)=>`${i?'L':'M'}${p.xMm},${mm(new D(p.yMm).negated())}`).join(' ')+(closed?' Z':'');
  const shapes=model.shapes.filter(s=>s.points.length>1).map(s=>`<path data-element-id="${escapeXml(s.elementId)}" d="${path(s.points,s.closed)} ${s.holes.map(h=>path(h,true)).join(' ')}" fill="${s.erase?'#ffffff':s.kind==='room'?'#f6f5f2':s.kind==='clearance'?'none':s.closed&&!s.secondary?'#eceeea':'none'}" fill-rule="evenodd" stroke="${s.erase?'#ffffff':s.kind==='opening'?'#315c4c':'#202522'}" stroke-width="${scale*(s.erase?.5:.25)}"${!s.erase&&(s.secondary||s.estimated||s.kind==='clearance')?' stroke-dasharray="'+scale*1.5+' '+scale+'"':''}><title>${escapeXml(s.label)}</title></path>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.widthMm}mm" height="${size.heightMm}mm" viewBox="${b.minX} ${-b.maxY} ${b.width} ${b.height}" role="img" aria-label="${escapeXml(view)} · Revision ${escapeXml(snapshot.revisionId)} · 1:${scale}"><metadata>Revision ${escapeXml(snapshot.revisionId)}; Kernel ${escapeXml(snapshot.geometryEngineVersion)}; mm; 1:${scale}. Inschrifttext separat: keine Ersatzglyphen oder Bohrschablone.</metadata>${shapes}</svg>`;
}
