import type { Contour, PathEdge, Point2 } from '@schubert/contracts';
import{contourSchema}from'@schubert/contracts';
import { D, decimalString, distance, mm } from './precision.js';

const TAU = Math.PI * 2;
const EPS = 0.005;
function n(p: Point2): [number, number] { return [Number(p.xMm), Number(p.yMm)]; }
function same(a: Point2, b: Point2): boolean { return new D(a.xMm).eq(b.xMm) && new D(a.yMm).eq(b.yMm); }
function normalized(a: number): number { return ((a % TAU) + TAU) % TAU; }
export function contourParts(contour:Contour):Array<Pick<Contour,'outer'|'holes'>>{return[{outer:contour.outer,holes:contour.holes},...(contour.islands??[])];}
export function contourRings(contour:Contour,includeHoles=true):PathEdge[][]{return contourParts(contour).flatMap(p=>includeHoles?[p.outer,...p.holes]:[p.outer]);}
export function contourEdges(contour:Contour):PathEdge[]{return contourRings(contour).flat();}
/** The design validator has already checked that explicit cutouts are inside
 * material and do not overlap. Islands inside a cutout remain real material. */
export function withThroughCutouts(contour:Contour,cutouts:Contour[]):Contour{const source=contourSchema.parse(contour),parts=contourParts(source);for(const cut of cutouts)for(const piece of contourParts(contourSchema.parse(cut))){const host=parts.find(p=>pointInContour(piece.outer[0].from,p));if(!host)throw new Error('Durchausschnitt liegt außerhalb der vorhandenen Materialkontur.');host.holes.push(piece.outer);for(const hole of piece.holes)parts.push({outer:hole,holes:[]});}return{...parts[0],...(parts.length>1?{islands:parts.slice(1)}:{}),...(source.importProvenance?{importProvenance:source.importProvenance}:{})};}
export function arcSweep(edge: Extract<PathEdge, { kind: 'circular_arc' }>): number {
  const [cx, cy] = n(edge.center), [ax, ay] = n(edge.from), [bx, by] = n(edge.to);
  const a = Math.atan2(ay - cy, ax - cx), b = Math.atan2(by - cy, bx - cx);
  const span = edge.clockwise ? -normalized(a - b) : normalized(b - a);
  return Math.abs(span) < 1e-12 && same(edge.from, edge.to) ? (edge.clockwise ? -TAU : TAU) : span;
}
function ringSignedArea(edges: PathEdge[]): InstanceType<typeof D> {
  let total = new D(0);
  for (const edge of edges) {
    total = total.plus(new D(edge.from.xMm).times(edge.to.yMm).minus(new D(edge.to.xMm).times(edge.from.yMm)).div(2));
    if (edge.kind === 'circular_arc') {
      const r = new D(distance(edge.from, edge.center)), theta = arcSweep(edge);
      total = total.plus(r.pow(2).times(theta - Math.sin(theta)).div(2));
    }
  }
  return total;
}
export function contourAreaMm2(contour: Contour): string {
  return decimalString(contourParts(contour).reduce((sum,p)=>sum.plus(ringSignedArea(p.outer).abs().minus(p.holes.reduce((sum,h)=>sum.plus(ringSignedArea(h).abs()),new D(0)))),new D(0)));
}
export function contourGrossAreaMm2(contour: Contour): string { return decimalString(contourParts(contour).reduce((sum,p)=>sum.plus(ringSignedArea(p.outer).abs()),new D(0))); }
export function contourPerimeterMm(contour: Contour, includeHoles = true): string {
  const rings = contourRings(contour,includeHoles);
  return decimalString(rings.flat().reduce((sum, edge) => sum.plus(edge.kind === 'line' ? distance(edge.from, edge.to) : new D(distance(edge.from, edge.center)).times(Math.abs(arcSweep(edge)))), new D(0)));
}
export const polygonAreaMm2 = (points: Point2[]): string => contourAreaMm2(polygonContour(points));
export function polygonContour(points: Point2[]): Contour {
  const p = points.length > 1 && same(points[0], points[points.length - 1]) ? points.slice(0, -1) : points;
  return { outer: p.map((from, i) => ({ kind: 'line', from: { ...from }, to: { ...p[(i + 1) % p.length] } })), holes: [] };
}
export function rectangleContour(widthMm: string, heightMm: string): Contour {
  return polygonContour([{ xMm: '0', yMm: '0' }, { xMm: mm(widthMm), yMm: '0' }, { xMm: mm(widthMm), yMm: mm(heightMm) }, { xMm: '0', yMm: mm(heightMm) }]);
}
/** Sampling is only a view adapter. The canonical circular arcs remain unchanged. */
export function sampleRing(edges: PathEdge[], chordErrorMm = 0.05): Point2[] {
  const result: Point2[] = [];
  for (const edge of edges) {
    result.push(edge.from);
    if (edge.kind !== 'circular_arc') continue;
    const r = Number(distance(edge.from, edge.center));
    const sweep = arcSweep(edge), start = Math.atan2(Number(edge.from.yMm) - Number(edge.center.yMm), Number(edge.from.xMm) - Number(edge.center.xMm));
    const step = r > chordErrorMm ? 2 * Math.acos(Math.max(-1, 1 - chordErrorMm / r)) : Math.PI / 8;
    const count = Math.min(65536, Math.max(2, Math.ceil(Math.abs(sweep) / step)));
    for (let i = 1; i < count; i++) {
      const a = start + sweep * i / count;
      result.push({ xMm: mm(Number(edge.center.xMm) + r * Math.cos(a)), yMm: mm(Number(edge.center.yMm) + r * Math.sin(a)) });
    }
  }
  return result.filter((p, i) => i === 0 || !same(p, result[i - 1]));
}
function onArc(p: [number, number], e: Extract<PathEdge, { kind: 'circular_arc' }>): boolean {
  const c = n(e.center), start = Math.atan2(Number(e.from.yMm) - c[1], Number(e.from.xMm) - c[0]);
  const angle = Math.atan2(p[1] - c[1], p[0] - c[0]);
  const span = Math.abs(arcSweep(e)), progress = e.clockwise ? normalized(start - angle) : normalized(angle - start);
  return progress <= span + 1e-9 || TAU - progress < 1e-9;
}
function onLine(p: [number, number], e: PathEdge): boolean {
  const a = n(e.from), b = n(e.to);
  return p[0] >= Math.min(a[0], b[0]) - EPS && p[0] <= Math.max(a[0], b[0]) + EPS && p[1] >= Math.min(a[1], b[1]) - EPS && p[1] <= Math.max(a[1], b[1]) + EPS;
}
type EdgeBox={minX:number;minY:number;maxX:number;maxY:number};
// A full-circle box is deliberately conservative for a partial arc. The broad
// phase only rejects impossible pairs; all actual checks remain analytical.
function edgeBox(edge:PathEdge):EdgeBox{
 if(edge.kind==='circular_arc'){const[cx,cy]=n(edge.center),r=Number(distance(edge.from,edge.center));return{minX:cx-r,minY:cy-r,maxX:cx+r,maxY:cy+r};}
 const[a,b]=[n(edge.from),n(edge.to)];return{minX:Math.min(a[0],b[0]),minY:Math.min(a[1],b[1]),maxX:Math.max(a[0],b[0]),maxY:Math.max(a[1],b[1])};
}
const boxesOverlap=(a:EdgeBox,b:EdgeBox)=>a.minX<=b.maxX+EPS&&b.minX<=a.maxX+EPS&&a.minY<=b.maxY+EPS&&b.minY<=a.maxY+EPS;
/** Sweep broad phase without sampling or changing the original edge indices. */
function selfIntersectionPairs(edges:PathEdge[]){
 const sorted=edges.map((edge,index)=>({edge,index,box:edgeBox(edge)})).sort((a,b)=>a.box.minX-b.box.minX),hits:Array<{i:number;j:number;points:Point2[]}>=[];let active:typeof sorted=[];
 for(const current of sorted){active=active.filter(previous=>previous.box.maxX+EPS>=current.box.minX);for(const previous of active)if(boxesOverlap(previous.box,current.box)){const i=Math.min(previous.index,current.index),j=Math.max(previous.index,current.index),points=edgeIntersections(edges[i],edges[j]);if(points.length)hits.push({i,j,points});}active.push(current);}
 return hits.sort((a,b)=>a.i-b.i||a.j-b.j);
}
/** True finite-edge intersection, with conservative bounds for large imports. */
export function edgeSetsIntersect(a:PathEdge[],b:PathEdge[]):boolean{
 const sorted=[...a.map(edge=>({edge,side:0,box:edgeBox(edge)})),...b.map(edge=>({edge,side:1,box:edgeBox(edge)}))].sort((a,b)=>a.box.minX-b.box.minX);let active:typeof sorted=[];
 for(const current of sorted){active=active.filter(previous=>previous.box.maxX+EPS>=current.box.minX);for(const previous of active)if(previous.side!==current.side&&boxesOverlap(previous.box,current.box)&&edgeIntersections(previous.edge,current.edge).length)return true;active.push(current);}return false;
}
export function edgeIntersections(a: PathEdge, b: PathEdge): Point2[] {
  let candidates: [number, number][] = [];
  if (a.kind === 'line' && b.kind === 'line') {
    const [ax, ay] = n(a.from), [bx, by] = n(a.to), [cx, cy] = n(b.from), [dx, dy] = n(b.to);
    const den = (ax - bx) * (cy - dy) - (ay - by) * (cx - dx);
    if (Math.abs(den) < 1e-10) {
      if (Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) > EPS) return [];
      candidates = [n(a.from), n(a.to), n(b.from), n(b.to)].filter(p => onLine(p, a) && onLine(p, b));
    } else {
      const ab = ax * by - ay * bx, cd = cx * dy - cy * dx;
      candidates = [[(ab * (cx - dx) - (ax - bx) * cd) / den, (ab * (cy - dy) - (ay - by) * cd) / den]].filter(p => onLine(p as [number, number], a) && onLine(p as [number, number], b)) as [number, number][];
    }
  } else if (a.kind === 'circular_arc' && b.kind === 'circular_arc') {
    const c = n(a.center), d = n(b.center), r = Number(distance(a.from, a.center)), s = Number(distance(b.from, b.center));
    const gap = Math.hypot(d[0] - c[0], d[1] - c[1]);
    if (gap < EPS && Math.abs(r - s) < EPS) candidates = [n(a.from), n(a.to), n(b.from), n(b.to)].filter(p => onArc(p, a) && onArc(p, b));
    else if (gap > EPS && gap <= r + s + EPS && gap >= Math.abs(r - s) - EPS) {
      const q = (r * r - s * s + gap * gap) / (2 * gap), h = Math.sqrt(Math.max(0, r * r - q * q));
      const x = c[0] + q * (d[0] - c[0]) / gap, y = c[1] + q * (d[1] - c[1]) / gap;
      candidates = [[x + h * (d[1] - c[1]) / gap, y - h * (d[0] - c[0]) / gap], [x - h * (d[1] - c[1]) / gap, y + h * (d[0] - c[0]) / gap]].filter(p => onArc(p as [number, number], a) && onArc(p as [number, number], b)) as [number, number][];
    }
  } else {
    const line = a.kind === 'line' ? a : b, circle = (a.kind === 'circular_arc' ? a : b) as Extract<PathEdge, { kind: 'circular_arc' }>;
    const p = n(line.from), q = n(line.to), c = n(circle.center), dx = q[0] - p[0], dy = q[1] - p[1], r = Number(distance(circle.from, circle.center));
    const A = dx * dx + dy * dy, B = 2 * (dx * (p[0] - c[0]) + dy * (p[1] - c[1])), C = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 - r * r;
    const det = B * B - 4 * A * C;
    if (A && det >= -EPS) candidates = [(-B + Math.sqrt(Math.max(0, det))) / (2 * A), (-B - Math.sqrt(Math.max(0, det))) / (2 * A)]
      .filter(t => t >= -1e-9 && t <= 1 + 1e-9).map(t => [p[0] + t * dx, p[1] + t * dy] as [number, number]).filter(p => onArc(p, circle));
  }
  return candidates.map(p => ({ xMm: mm(p[0]), yMm: mm(p[1]) })).filter((p, i, all) => all.findIndex(v => same(v, p)) === i);
}
function pointLineDistance(p:[number,number],edge:PathEdge):number{
  const a=n(edge.from),b=n(edge.to),dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0;
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
}
function pointEdgeDistance(p:[number,number],edge:PathEdge):number{
  if(edge.kind==='line')return pointLineDistance(p,edge);const c=n(edge.center),r=Number(distance(edge.from,edge.center)),d=Math.hypot(p[0]-c[0],p[1]-c[1]);
  const ends=Math.min(Math.hypot(p[0]-Number(edge.from.xMm),p[1]-Number(edge.from.yMm)),Math.hypot(p[0]-Number(edge.to.xMm),p[1]-Number(edge.to.yMm)));
  if(!d)return r;const radial:[number,number]=[c[0]+(p[0]-c[0])*r/d,c[1]+(p[1]-c[1])*r/d];return onArc(radial,edge)?Math.min(ends,Math.abs(d-r)):ends;
}
/** Analytical minimum separation between finite straight or circular edges. */
export function edgeDistanceMm(a:PathEdge,b:PathEdge):string{
  if(edgeIntersections(a,b).length)return'0';let best=Math.min(pointEdgeDistance(n(a.from),b),pointEdgeDistance(n(a.to),b),pointEdgeDistance(n(b.from),a),pointEdgeDistance(n(b.to),a));
  if(a.kind==='line'&&b.kind==='line')return mm(best);
  if(a.kind==='circular_arc'&&b.kind==='circular_arc'){
    const c=n(a.center),d=n(b.center),gap=Math.hypot(d[0]-c[0],d[1]-c[1]),r=Number(distance(a.from,a.center)),s=Number(distance(b.from,b.center));
    if(gap)for(const signA of[-1,1])for(const signB of[-1,1]){const p:[number,number]=[c[0]+signA*r*(d[0]-c[0])/gap,c[1]+signA*r*(d[1]-c[1])/gap],q:[number,number]=[d[0]+signB*s*(d[0]-c[0])/gap,d[1]+signB*s*(d[1]-c[1])/gap];if(onArc(p,a)&&onArc(q,b))best=Math.min(best,Math.hypot(p[0]-q[0],p[1]-q[1]));}
  }else{
    const line=a.kind==='line'?a:b,arc=(a.kind==='circular_arc'?a:b)as Extract<PathEdge,{kind:'circular_arc'}>,p=n(line.from),q=n(line.to),c=n(arc.center),r=Number(distance(arc.from,arc.center)),dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy);
    if(len)for(const sign of[-1,1]){const candidate:[number,number]=[c[0]-sign*dy/len*r,c[1]+sign*dx/len*r];if(onArc(candidate,arc))best=Math.min(best,pointLineDistance(candidate,line));}
  }return mm(best);
}
/** Streaming minimum avoids materialising an O(n*m) Decimal array or spreading
 * it onto the JS stack. Bounds never replace the actual line/arc distance. */
export function edgeSetDistanceMm(a:PathEdge[],b:PathEdge[]):string{
 if(!a.length||!b.length)throw Error('Für einen Konturabstand fehlen konkrete Kanten.');
 const right=b.map(edge=>({edge,box:edgeBox(edge)}));let best=Infinity;
 for(const edge of a){const box=edgeBox(edge);for(const candidate of right){const dx=Math.max(0,box.minX-candidate.box.maxX,candidate.box.minX-box.maxX),dy=Math.max(0,box.minY-candidate.box.maxY,candidate.box.minY-box.maxY);if(Math.hypot(dx,dy)>best+EPS)continue;best=Math.min(best,Number(edgeDistanceMm(edge,candidate.edge)));if(best===0)return'0';}}
 return mm(best);
}
export function pointInRing(point: Point2, edges: PathEdge[]): boolean {
  // Analytical horizontal ray test; arcs are split at their vertical extrema.
  const[x,rawY]=n(point),y=rawY+1e-8;let inside=false;
  for(const edge of edges){
    if(edge.kind==='line'){const a=n(edge.from),b=n(edge.to);if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;continue;}
    const c=n(edge.center),r=Number(distance(edge.from,edge.center)),start=Math.atan2(Number(edge.from.yMm)-c[1],Number(edge.from.xMm)-c[0]),sweep=arcSweep(edge),span=Math.abs(sweep),sign=Math.sign(sweep);
    const progress=[0,span];for(const angle of[Math.PI/2,Math.PI*1.5]){const p=sign<0?normalized(start-angle):normalized(angle-start);if(p>1e-10&&p<span-1e-10)progress.push(p);}progress.sort((a,b)=>a-b);
    for(let i=0;i<progress.length-1;i++){const a=start+sign*progress[i],b=start+sign*progress[i+1],ay=c[1]+r*Math.sin(a),by=c[1]+r*Math.sin(b);if((ay>y)===(by>y))continue;const det=r*r-(y-c[1])**2;if(det<0)continue;const hit=c[0]+(Math.cos((a+b)/2)>=0?1:-1)*Math.sqrt(det);if(x<hit)inside=!inside;}
  }return inside;
}
export function contourBounds(contour:Contour):{minX:string;minY:string;maxX:string;maxY:string;width:string;height:string}{
  const edges=contourRings(contour,false).flat(),points=edges.flatMap(e=>[e.from,e.to]);
  for(const edge of edges)if(edge.kind==='circular_arc'){const c=n(edge.center),r=Number(distance(edge.from,edge.center));for(const angle of[0,Math.PI/2,Math.PI,Math.PI*1.5]){const p:[number,number]=[c[0]+r*Math.cos(angle),c[1]+r*Math.sin(angle)];if(onArc(p,edge))points.push({xMm:mm(p[0]),yMm:mm(p[1])});}}
  if(!points.length)return{minX:'0',minY:'0',maxX:'0',maxY:'0',width:'0',height:'0'};
  const minX=D.min(...points.map(p=>new D(p.xMm))),maxX=D.max(...points.map(p=>new D(p.xMm))),minY=D.min(...points.map(p=>new D(p.yMm))),maxY=D.max(...points.map(p=>new D(p.yMm)));
  return{minX:mm(minX),minY:mm(minY),maxX:mm(maxX),maxY:mm(maxY),width:mm(maxX.minus(minX)),height:mm(maxY.minus(minY))};
}
export function pointInContour(point: Point2, contour: Contour): boolean { return contourParts(contour).some(p=>pointInRing(point,p.outer)&&!p.holes.some(h=>pointInRing(point,h))); }
export function validateContour(contour: Contour): string[] {
  if(contour.islands?.length){const parts=contourParts(contour),issues=parts.flatMap((p,i)=>validateContour(p).map(message=>`Teilkontur ${i+1}: ${message}`));for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){if(edgeSetsIntersect(contourEdges(parts[i]),contourEdges(parts[j]))||pointInContour(parts[i].outer[0].from,parts[j])||pointInContour(parts[j].outer[0].from,parts[i]))issues.push(`Teilkonturen ${i+1} und ${j+1} berühren oder überdecken sich.`);}return[...new Set(issues)];}
  const issues: string[] = [], rings = [contour.outer, ...contour.holes];
  rings.forEach((ring, index) => {
    const label = index === 0 ? 'Außenkontur' : `Ausschnitt ${index}`;
    if (!ring.length) { issues.push(`${label}: Kontur fehlt.`); return; }
    ring.forEach((edge, i) => {
      if (!same(edge.to, ring[(i + 1) % ring.length].from)) issues.push(`${label}: offen an Kante ${i + 1}.`);
      if (edge.kind === 'line' && same(edge.from, edge.to)) issues.push(`${label}: Nullkante ${i + 1}.`);
      if (edge.kind === 'circular_arc' && (new D(distance(edge.from, edge.center)).lte(0) || new D(distance(edge.from, edge.center)).minus(distance(edge.to, edge.center)).abs().gt('0.01'))) issues.push(`${label}: Kreisbogenradien stimmen nicht überein.`);
    });
    for(const{i,j,points}of selfIntersectionPairs(ring)){const edge=ring[i],adjacent=j===i+1||(i===0&&j===ring.length-1),allowed=adjacent?[edge.from,edge.to].filter(p=>same(p,ring[j].from)||same(p,ring[j].to)):[];if(points.some(p=>!allowed.some(q=>same(p,q))))issues.push(`${label}: Selbstschnitt zwischen Kante ${i+1} und ${j+1}.`);}
    if (ringSignedArea(ring).abs().lt('0.0001')) issues.push(`${label}: Fläche ist null.`);
    if (index > 0) {
      if (!pointInRing(ring[0].from, contour.outer)) issues.push(`${label}: liegt außerhalb des Bauteils.`);
      for (let other = 0; other < index; other++) {
        if (edgeSetsIntersect(ring,rings[other])) issues.push(`${label}: berührt oder schneidet eine andere Kontur.`);
        if (other > 0 && (pointInRing(ring[0].from, rings[other]) || pointInRing(rings[other][0].from, ring))) issues.push(`${label}: Ausschnitte überdecken sich.`);
      }
    }
  });
  return [...new Set(issues)];
}
