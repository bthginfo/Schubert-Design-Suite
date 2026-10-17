import type{DesignSnapshot,DesignElement,Contour,Point3,PathEdge}from'@schubert/contracts';
import{D,mm,decimalString}from'./precision.js';
import{worldPoint,worldMatrix,applyMatrix}from'./transforms.js';
import{contourBounds,contourParts,contourEdges,polygonContour,edgeDistanceMm,edgeSetDistanceMm,pointInContour}from'./contours.js';
import{wallCoreEnds,wallCoreFootprint}from'./walls.js';
type Ref=DesignSnapshot['constraints'][number]['refs'][number];
const distance=(a:Point3,b:Point3)=>decimalString(new D(a.xMm).minus(b.xMm).pow(2).plus(new D(a.yMm).minus(b.yMm).pow(2)).plus(new D(a.zMm).minus(b.zMm).pow(2)).sqrt());

function line(snapshot:DesignSnapshot,id:string):[Point3,Point3]|null{const e=snapshot.elements.find(e=>e.id===id);if(e?.kind!=='wall')return null;try{return[worldPoint(snapshot,e.startNodeId),worldPoint(snapshot,e.endNodeId)];}catch{return null;}}
function localContour(element:DesignElement):Contour|null{return element.kind==='catalog_object'?element.footprint:element.kind==='stone_piece'?element.finishedContour:'contour'in element?element.contour:null;}
function point(snapshot:DesignSnapshot,ref:Ref):Point3|null{
  const e=snapshot.elements.find(e=>e.id===ref.elementId);if(!e)return null;
  if(e.kind==='node'&&ref.feature==='point')return worldPoint(snapshot,e.id);
  if(e.kind==='technical_note'&&ref.feature==='point')return worldPoint(snapshot,e.id,e.point);
  if(e.kind==='wall'){const ends=line(snapshot,e.id);if(!ends)return null;if(ref.feature==='start')return ends[0];if(ref.feature==='end')return ends[1];if(ref.feature==='center')return midpoint(...ends);}
  const contour=localContour(e);if(contour&&ref.feature==='center'){const b=contourBounds(contour);return worldPoint(snapshot,e.id,{xMm:mm(new D(b.minX).plus(b.maxX).div(2)),yMm:mm(new D(b.minY).plus(b.maxY).div(2)),zMm:'0'});}
  if('transform'in e&&ref.feature==='origin')return worldPoint(snapshot,e.id);return null;
}
function midpoint(a:Point3,b:Point3):Point3{return{xMm:mm(new D(a.xMm).plus(b.xMm).div(2)),yMm:mm(new D(a.yMm).plus(b.yMm).div(2)),zMm:mm(new D(a.zMm).plus(b.zMm).div(2))};}
function profile(snapshot:DesignSnapshot,ref:Ref):Contour|null{
  const e=snapshot.elements.find(e=>e.id===ref.elementId);if(!e||!['footprint','boundary','axis'].includes(ref.feature))return null;
  if(e.kind==='wall'){
    const ends=line(snapshot,e.id);if(!ends)return null;
    if(ref.feature==='axis')return{outer:[{kind:'line',from:ends[0],to:ends[1]}],holes:[]};
    return wallCoreFootprint(snapshot,e.id);
  }
  if(e.kind==='room'){const points=e.boundary.map(boundary=>{const wall=snapshot.elements.find(w=>w.id===boundary.wallId);if(wall?.kind!=='wall')return null;return worldPoint(snapshot,boundary.side==='left'?wall.startNodeId:wall.endNodeId);});return points.length>=3&&points.every(Boolean)?polygonContour(points as Point3[]):null;}
  const c=localContour(e);if(!c||!('transform'in e))return null;const m=worldMatrix(snapshot,e.id),det=m[0]*m[5]-m[1]*m[4],hasArcs=contourEdges(c).some(e=>e.kind==='circular_arc');
  // A tilted circle projects to an ellipse. Never substitute a sampled polygon
  // for an exact minimum-clearance assertion.
  if(hasArcs&&(Math.abs(m[8])>1e-8||Math.abs(m[9])>1e-8))return null;
  const transform=(edge:PathEdge):PathEdge=>{const from=applyMatrix({...edge.from,zMm:'0'},m),to=applyMatrix({...edge.to,zMm:'0'},m);return edge.kind==='line'?{kind:'line',from,to}:{kind:'circular_arc',from,to,center:applyMatrix({...edge.center,zMm:'0'},m),clockwise:det<0?!edge.clockwise:edge.clockwise};};
  const parts=contourParts(c).map(p=>({outer:p.outer.map(transform),holes:p.holes.map(r=>r.map(transform))}));return{...parts[0],...(parts.length>1?{islands:parts.slice(1)}:{}),...(c.importProvenance?{importProvenance:c.importProvenance}:{})};
}
function locked(snapshot:DesignSnapshot,id:string,seen=new Set<string>()):boolean{if(seen.has(id))return false;seen.add(id);const e=snapshot.elements.find(e=>e.id===id);return !!e&&(e.locked||!!e.parentId&&locked(snapshot,e.parentId,seen));}

/** Canonical constraints check real geometry; no silent solver or sampled clearances. */
export function validateConstraints(snapshot:DesignSnapshot,unresolved:(message:string)=>void):string[]{
 const blocking:string[]=[],elements=new Set(snapshot.elements.map(e=>e.id));
 for(const c of snapshot.constraints){const prefix=`Bindung ${c.id}: `;if(c.refs.some(r=>!elements.has(r.elementId))){blocking.push(prefix+'Ein Bezugselement fehlt.');continue;}
  if(c.measureId&&!snapshot.measurements[c.measureId]){blocking.push(prefix+'Das gebundene Maß fehlt.');continue;}
  if(c.measureId){const measure=snapshot.measurements[c.measureId];if(measure?.valueMm!==null&&measure?.reviewStatus!=='confirmed')unresolved(prefix+'Das gebundene Maß ist noch nicht fachlich festgelegt.');if(measure?.isEstimated)unresolved(prefix+'Das gebundene Maß ist geschätzt.');}
  if(c.kind==='fixed'){if(c.refs.some(r=>!locked(snapshot,r.elementId)))blocking.push(prefix+'Der feste Bezug muss selbst oder über seine Gruppe gesperrt sein.');continue;}
  if(c.kind==='minimum_clearance'){
    const value=c.measureId?snapshot.measurements[c.measureId]?.valueMm:null;if(c.refs.length!==2||!c.measureId){blocking.push(prefix+'Mindestabstand braucht zwei konkrete Bezüge und ein eigenes Maß.');continue;}if(value===null||value===undefined){unresolved(prefix+'Der Mindestabstand ist noch unbekannt.');continue;}if(new D(value).lt(0)){blocking.push(prefix+'Mindestabstand darf nicht negativ sein.');continue;}
    const points=c.refs.map(r=>point(snapshot,r));let actual:string|null=null;
    if(points.every(Boolean))actual=distance(points[0]!,points[1]!);
    else{const profiles=c.refs.map(r=>profile(snapshot,r));if(profiles.every(Boolean)){const[a,b]=profiles as[Contour,Contour];const filled=c.refs.every(r=>r.feature==='footprint'),overlap=contourParts(a).some(p=>pointInContour(p.outer[0].from,b))||contourParts(b).some(p=>pointInContour(p.outer[0].from,a));const nominal=filled&&overlap?new D(0):new D(edgeSetDistanceMm(contourEdges(a),contourEdges(b))),error=new D(a.importProvenance?.curveErrorBoundMm??0).plus(b.importProvenance?.curveErrorBoundMm??0);actual=D.max(0,nominal.minus(error)).toString();}}
    if(actual===null){blocking.push(prefix+'Für diesen Mindestabstand fehlen analytisch prüfbare Punkte oder Grundrisskonturen. Geneigte Kreisbögen brauchen einen eigenen belegten Bezugsplan.');continue;}
    if(new D(actual).plus('0.000001').lt(value))blocking.push(prefix+`Mindestabstand ${value} mm unterschritten; konservativ geprüfter Wert ${mm(actual)} mm.`);continue;
  }
  if(['parallel','perpendicular'].includes(c.kind)){
    const pairs=c.refs.length===2?c.refs.map(r=>line(snapshot,r.elementId)):c.refs.length===4?[c.refs.slice(0,2).map(r=>point(snapshot,r)),c.refs.slice(2).map(r=>point(snapshot,r))]:[];
    if(pairs.length!==2||pairs.some(p=>!p||p.length!==2||p.some(v=>!v))){blocking.push(prefix+'Zwei eindeutige Wandachsen oder vier Bezugspunkte auswählen.');continue;}
    const[a,b]=pairs.map(p=>{const[x,y]=p as Point3[];return[Number(y.xMm)-Number(x.xMm),Number(y.yMm)-Number(x.yMm),Number(y.zMm)-Number(x.zMm)];}),length=Math.hypot(...a)*Math.hypot(...b);if(length<1e-10){blocking.push(prefix+'Richtung eines Bezugs ist degeneriert.');continue;}const dot=a.reduce((sum,v,i)=>sum+v*b[i],0),cross=Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]);if(Math.abs((c.kind==='parallel'?cross:dot)/length)>1e-6)blocking.push(prefix+(c.kind==='parallel'?'Parallelität':'Rechtwinkligkeit')+' widerspricht der Geometrie.');continue;
  }
  let points=c.refs.map(r=>point(snapshot,r));if(['horizontal','vertical'].includes(c.kind)&&c.refs.length===1)points=line(snapshot,c.refs[0].elementId)??[];
  if(points.some(p=>!p)||!points.length){blocking.push(prefix+'Ein expliziter Punkt-, Achsen- oder Hüllenmittelpunktbezug fehlt.');continue;}
  if(c.kind==='centered'){
    if(points.length!==2&&points.length!==3){blocking.push(prefix+'Zentrierung braucht zwei Mittelpunkte oder einen Punkt und zwei Begrenzungspunkte.');continue;}const target=points.length===3?midpoint(points[1]!,points[2]!):points[1]!;if(new D(distance(points[0]!,target)).gt('0.01'))blocking.push(prefix+'Das Element liegt nicht auf dem festgelegten Mittelpunkt.');continue;
  }
  if(points.length!==2){blocking.push(prefix+'Genau zwei Bezugspunkte auswählen.');continue;}
  const[a,b]=points as Point3[];if(c.kind==='coincident'&&new D(distance(a,b)).gt('0.01'))blocking.push(prefix+'Die Punkte sind nicht deckungsgleich.');
  if(c.kind==='horizontal'&&new D(a.yMm).minus(b.yMm).abs().gt('0.01')||c.kind==='vertical'&&new D(a.xMm).minus(b.xMm).abs().gt('0.01'))blocking.push(prefix+'Die Achsbindung widerspricht den Bezugspunkten.');
  if(c.kind==='distance'){const value=c.measureId?snapshot.measurements[c.measureId]?.valueMm:null;if(!c.measureId)blocking.push(prefix+'Ein eigenes Abstandsmaß fehlt.');else if(value===null||value===undefined)unresolved(prefix+'Der treibende Abstand ist noch unbekannt.');else if(new D(value).lt(0)||new D(distance(a,b)).minus(value).abs().gt('0.01'))blocking.push(prefix+'Der Abstand widerspricht dem treibenden Maß.');}
 }return blocking;
}
