import type{DesignSnapshot,Point3}from'@schubert/contracts';
import{D,mm}from'./precision.js';import{worldPoint}from'./transforms.js';
/** Nodes are wall centre-line intersections. Orthogonal cores close across the
 * adjacent half-core; isolated ends retain their explicit node position. */
export function wallCoreEnds(snapshot:DesignSnapshot,wallId:string):{a:Point3;b:Point3;startExtensionMm:string;endExtensionMm:string}|null{
 const wall=snapshot.elements.find(e=>e.id===wallId);if(wall?.kind!=='wall')return null;const a=worldPoint(snapshot,wall.startNodeId),b=worldPoint(snapshot,wall.endNodeId),dx=Number(b.xMm)-Number(a.xMm),dy=Number(b.yMm)-Number(a.yMm),length=Math.hypot(dx,dy);if(!length)return null;const ux=dx/length,uy=dy/length;
 function extension(nodeId:string){let extra=0;for(const other of snapshot.elements){if(other.kind!=='wall'||other.id===wallId||other.phase==='demolition'||![other.startNodeId,other.endNodeId].includes(nodeId))continue;const p=worldPoint(snapshot,other.startNodeId),q=worldPoint(snapshot,other.endNodeId),vx=Number(q.xMm)-Number(p.xMm),vy=Number(q.yMm)-Number(p.yMm),otherLength=Math.hypot(vx,vy),core=snapshot.measurements[other.coreThicknessMeasureId]?.valueMm;if(!otherLength||core===null||core===undefined||Math.abs((ux*vx+uy*vy)/otherLength)>1e-6)continue;extra=Math.max(extra,Number(core)/2);}return extra;}
 const start=extension(wall.startNodeId),end=extension(wall.endNodeId);return{a:{xMm:mm(new D(a.xMm).minus(ux*start)),yMm:mm(new D(a.yMm).minus(uy*start)),zMm:a.zMm},b:{xMm:mm(new D(b.xMm).plus(ux*end)),yMm:mm(new D(b.yMm).plus(uy*end)),zMm:b.zMm},startExtensionMm:mm(start),endExtensionMm:mm(end)};
}

/** Closed local wall-core solid. A door touching the floor is a notch, never
 * an interior polygon hole. Shared grid vertices keep the mesh watertight. */
export function wallCoreMesh(snapshot:DesignSnapshot,wallId:string):{verticesMm:[string,string,string][];faces:number[][];unresolvedOpeningIds:string[]}|null{
 const wall=snapshot.elements.find(e=>e.id===wallId);if(wall?.kind!=='wall')return null;
 const ends=wallCoreEnds(snapshot,wallId),a=worldPoint(snapshot,wall.startNodeId),b=worldPoint(snapshot,wall.endNodeId),height=snapshot.measurements[wall.heightMeasureId]?.valueMm,core=snapshot.measurements[wall.coreThicknessMeasureId]?.valueMm;
 if(!ends||height==null||core==null||Number(height)<=0||Number(core)<=0)return null;
 const minX=-Number(ends.startExtensionMm),maxX=Number(mm(Math.hypot(Number(b.xMm)-Number(a.xMm),Number(b.yMm)-Number(a.yMm))+Number(ends.endExtensionMm))),maxY=Number(height),depth=Number(core),openings:{x0:number;x1:number;y0:number;y1:number}[]=[],unresolvedOpeningIds:string[]=[];
 for(const e of snapshot.elements){if(e.kind!=='opening'||e.wallId!==wallId||e.openingType==='recess'||e.phase==='demolition')continue;
  const values=[e.offsetAlongWallMeasureId,e.widthMeasureId,e.sillHeightMeasureId,e.heightMeasureId].map(id=>snapshot.measurements[id]?.valueMm);
  if(values.some(v=>v==null)){unresolvedOpeningIds.push(e.id);continue;}const[x,width,y,h]=values.map(Number);openings.push({x0:x,x1:Number(mm(x+width)),y0:y,y1:Number(mm(y+h))});}
 const xs=[...new Set([minX,maxX,...openings.flatMap(o=>[o.x0,o.x1]).filter(x=>x>minX&&x<maxX)])].sort((a,b)=>a-b),ys=[...new Set([0,maxY,...openings.flatMap(o=>[o.y0,o.y1]).filter(y=>y>0&&y<maxY)])].sort((a,b)=>a-b);
 const occupied=(i:number,j:number)=>i>=0&&j>=0&&i<xs.length-1&&j<ys.length-1&&!openings.some(o=>(xs[i]+xs[i+1])/2>o.x0&&(xs[i]+xs[i+1])/2<o.x1&&(ys[j]+ys[j+1])/2>o.y0&&(ys[j]+ys[j+1])/2<o.y1);
 const verticesMm:[string,string,string][]=[],faces:number[][]=[],ids=new Map<string,number>();const vertex=(x:number,y:number,z:number)=>{const p:[string,string,string]=[mm(x),mm(y),mm(z)],key=p.join(':');let id=ids.get(key);if(id===undefined){id=verticesMm.length;ids.set(key,id);verticesMm.push(p);}return id;};
 const face=(points:[number,number,number][])=>faces.push(points.map(p=>vertex(...p)));
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){if(!occupied(i,j))continue;const x0=xs[i],x1=xs[i+1],y0=ys[j],y1=ys[j+1];
  face([[x0,y0,0],[x0,y1,0],[x1,y1,0],[x1,y0,0]]);face([[x0,y0,depth],[x1,y0,depth],[x1,y1,depth],[x0,y1,depth]]);
  if(!occupied(i,j-1))face([[x0,y0,0],[x1,y0,0],[x1,y0,depth],[x0,y0,depth]]);
  if(!occupied(i,j+1))face([[x1,y1,0],[x0,y1,0],[x0,y1,depth],[x1,y1,depth]]);
  if(!occupied(i-1,j))face([[x0,y0,0],[x0,y0,depth],[x0,y1,depth],[x0,y1,0]]);
  if(!occupied(i+1,j))face([[x1,y1,0],[x1,y1,depth],[x1,y0,depth],[x1,y0,0]]);
 }
 return{verticesMm,faces,unresolvedOpeningIds};
}
