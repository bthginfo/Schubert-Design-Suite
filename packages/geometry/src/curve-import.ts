import type{PathEdge,Point2}from'@schubert/contracts';
import{mm}from'./precision.js';

export type XY=[number,number];
/** SVG affine order: x'=a*x+c*y+e, y'=b*x+d*y+f. */
export type Affine2=[number,number,number,number,number,number];
export const IDENTITY_2D:Affine2=[1,0,0,1,0,0];
export function affineProduct(a:Affine2,b:Affine2):Affine2{return[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
export function affinePoint(m:Affine2,p:XY):XY{return[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];}
const midpoint=(a:XY,b:XY):XY=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
const dist=(a:XY,b:XY)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function segmentDistance(p:XY,a:XY,b:XY){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
const point=(p:XY):Point2=>({xMm:mm(p[0]),yMm:mm(p[1])});
export const QUANTIZATION_ERROR_MM=Math.SQRT2*.005;

/** The convex-hull distance to the chord bounds both Hausdorff directions.
 * Subdivision happens in transformed millimetres, before 0.01 mm rounding. */
export function flattenBezier(controls:XY[],toleranceMm:number):XY[]{
 if(controls.length<3||controls.length>9||!(toleranceMm>QUANTIZATION_ERROR_MM))throw Error('Kurvenfehlergrenze oder Kontrollpunkte sind ungültig.');
 const result:XY[]=[controls[0]],limit=toleranceMm-QUANTIZATION_ERROR_MM-1e-7;
 function split(p:XY[],depth:number){if(result.length>10000||depth>28)throw Error('Kurve überschreitet die begrenzte Konturkomplexität. Gröbere ausdrücklich gewählte Fehlergrenze oder getrennte Originalteile verwenden.');const a=p[0],b=p[p.length-1];if(p.slice(1,-1).every(q=>segmentDistance(q,a,b)<=limit)){result.push(b);return;}const left:XY[]=[a],right:XY[]=[b];let row=p;while(row.length>1){row=row.slice(0,-1).map((q,i)=>midpoint(q,row[i+1]));left.push(row[0]);right.unshift(row[row.length-1]);}split(left,depth+1);split(right,depth+1);}
 split(controls,0);return result;
}
/** Linear interpolation error <= max|r''(theta)| * deltaTheta²/8. */
export function flattenEllipse(center:XY,u:XY,v:XY,start:number,sweep:number,toleranceMm:number):XY[]{
 const limit=toleranceMm-QUANTIZATION_ERROR_MM-1e-7,secondDerivativeBound=Math.hypot(...u,...v);if(!(limit>0)||!Number.isFinite(secondDerivativeBound))throw Error('Ellipsenfehlergrenze ist ungültig.');
 const count=Math.max(2,Math.ceil(Math.abs(sweep)*Math.sqrt(secondDerivativeBound/(8*limit))));if(count>10000)throw Error('Ellipsenkontur überschreitet das begrenzte Segmentlimit.');
 return Array.from({length:count+1},(_,i)=>{const t=start+sweep*i/count;return[center[0]+u[0]*Math.cos(t)+v[0]*Math.sin(t),center[1]+u[1]*Math.cos(t)+v[1]*Math.sin(t)] as XY;});
}
export function polylineEdges(points:XY[],closed=false):PathEdge[]{const result:PathEdge[]=[];for(let i=0;i<points.length-(closed?0:1);i++){const from=point(points[i]),to=point(points[(i+1)%points.length]);if(from.xMm===to.xMm&&from.yMm===to.yMm)continue;result.push({kind:'line',from,to});}return result;}

/** SVG 2 B.2 endpoint-to-centre algorithm; no fitted circle or implicit scale. */
function arcPoints(from:XY,to:XY,rx:number,ry:number,rotation:number,large:number,sweep:number,m:Affine2,tolerance:number):{points:XY[];analytic?:PathEdge;approximated:boolean}{
 rx=Math.abs(rx);ry=Math.abs(ry);if(!rx||!ry)return{points:[affinePoint(m,from),affinePoint(m,to)],approximated:false};if(dist(from,to)<1e-12)return{points:[],approximated:false};
 const phi=rotation*Math.PI/180,c=Math.cos(phi),s=Math.sin(phi),dx=(from[0]-to[0])/2,dy=(from[1]-to[1])/2,x=c*dx+s*dy,y=-s*dx+c*dy,lambda=x*x/(rx*rx)+y*y/(ry*ry);if(lambda>1){rx*=Math.sqrt(lambda);ry*=Math.sqrt(lambda);}
 const denominator=rx*rx*y*y+ry*ry*x*x,k=(large===sweep?-1:1)*Math.sqrt(Math.max(0,(rx*rx*ry*ry-denominator)/(denominator||1))),cxp=k*rx*y/ry,cyp=-k*ry*x/rx,cx=c*cxp-s*cyp+(from[0]+to[0])/2,cy=s*cxp+c*cyp+(from[1]+to[1])/2;
 const angle=(a:XY,b:XY)=>Math.atan2(a[0]*b[1]-a[1]*b[0],a[0]*b[0]+a[1]*b[1]),p:XY=[(x-cxp)/rx,(y-cyp)/ry],q:XY=[(-x-cxp)/rx,(-y-cyp)/ry];let span=angle(p,q);if(!sweep&&span>0)span-=Math.PI*2;if(sweep&&span<0)span+=Math.PI*2;
 const center=affinePoint(m,[cx,cy]),u=affinePoint(m,[cx+rx*c,cy+rx*s]).map((v,i)=>v-center[i]) as XY,v=affinePoint(m,[cx-ry*s,cy+ry*c]).map((v,i)=>v-center[i]) as XY;
 const fromPoint=point(affinePoint(m,from)),toPoint=point(affinePoint(m,to)),centerPoint=point(center),lu=Math.hypot(...u),lv=Math.hypot(...v);if(Math.abs(lu-lv)<1e-8*Math.max(lu,lv,1)&&Math.abs(u[0]*v[0]+u[1]*v[1])<1e-8*Math.max(lu*lv,1)&&Math.abs(Math.hypot(Number(fromPoint.xMm)-Number(centerPoint.xMm),Number(fromPoint.yMm)-Number(centerPoint.yMm))-Math.hypot(Number(toPoint.xMm)-Number(centerPoint.xMm),Number(toPoint.yMm)-Number(centerPoint.yMm)))<=.01)return{points:[],analytic:{kind:'circular_arc',from:fromPoint,to:toPoint,center:centerPoint,clockwise:span*(u[0]*v[1]-u[1]*v[0])<0},approximated:false};
 const points=flattenEllipse(center,u,v,Math.atan2(p[1],p[0]),span,tolerance);points[0]=affinePoint(m,from);points[points.length-1]=affinePoint(m,to);return{points,approximated:true};
}

export function parseSvgPath(d:string,m:Affine2,toleranceMm:number):{rings:PathEdge[][];approximated:boolean}{
 if(d.length>2_000_000)throw Error('SVG-Pfad überschreitet die Importgrenze.');let at=0,command='',current:XY=[0,0],start:XY=[0,0],ring:PathEdge[]=[],rings:PathEdge[][]=[],previous='',cubic:XY|null=null,quadratic:XY|null=null,approximated=false,closed=true,segments=0;
 const skip=()=>{while(/[\s,]/.test(d[at]??'')&&at<d.length)at++;};
 const number=()=>{skip();const match=d.slice(at).match(/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/);if(!match)throw Error('Koordinate im SVG-Pfad fehlt.');at+=match[0].length;const n=Number(match[0]);if(!Number.isFinite(n)||Math.abs(n)>1e12)throw Error('SVG-Koordinate liegt außerhalb des sicheren Bereichs.');return n;};
 const flag=()=>{skip();const v=d[at++];if(v!=='0'&&v!=='1')throw Error('SVG-Bogenflag muss ausdrücklich 0 oder 1 sein.');return Number(v);};
 const readPoint=(relative:boolean):XY=>{const p:XY=[number(),number()];return relative?[p[0]+current[0],p[1]+current[1]]:p;};
 function append(points:XY[]){const edges=polylineEdges(points);segments+=edges.length;if(segments>10000)throw Error('SVG enthält mehr als 10000 abgeleitete Kanten.');ring.push(...edges);}
 function finish(){if(!ring.length)throw Error('Leere SVG-Teilkontur.');rings.push(ring);ring=[];closed=true;}
 while(true){skip();if(at>=d.length)break;const c=d[at];if(/[a-z]/i.test(c)){command=c;at++;}else if(!command||command.toUpperCase()==='Z')throw Error('SVG-Pfadbefehl fehlt.');const relative=command===command.toLowerCase(),kind=command.toUpperCase(),old:XY=[...current];
  if(kind==='M'){if(!closed)throw Error('Offene SVG-Teilkontur: vor dem nächsten Start ausdrücklich schließen.');current=readPoint(relative);start=[...current];closed=false;command=relative?'l':'L';}
  else if(kind==='Z'){if(closed)throw Error('SVG-Teilkontur ist bereits geschlossen.');append([affinePoint(m,current),affinePoint(m,start)]);current=[...start];finish();}
  else{if(closed)throw Error('SVG-Kontur braucht zuerst einen Startpunkt.');
   if(kind==='L')current=readPoint(relative);
   else if(kind==='H')current=[number()+(relative?current[0]:0),current[1]];
   else if(kind==='V')current=[current[0],number()+(relative?current[1]:0)];
   else if(kind==='C'||kind==='S'){const a:XY=kind==='C'?readPoint(relative):previous==='C'||previous==='S'?[2*current[0]-(cubic?.[0]??current[0]),2*current[1]-(cubic?.[1]??current[1])] as XY:[...current] as XY,b=readPoint(relative),end=readPoint(relative);append(flattenBezier([current,a,b,end].map(p=>affinePoint(m,p)),toleranceMm));current=end;cubic=b;approximated=true;}
   else if(kind==='Q'||kind==='T'){const a:XY=kind==='Q'?readPoint(relative):previous==='Q'||previous==='T'?[2*current[0]-(quadratic?.[0]??current[0]),2*current[1]-(quadratic?.[1]??current[1])] as XY:[...current] as XY,end=readPoint(relative);append(flattenBezier([current,a,end].map(p=>affinePoint(m,p)),toleranceMm));current=end;quadratic=a;approximated=true;}
   else if(kind==='A'){const rx=number(),ry=number(),rotation=number(),large=flag(),sweep=flag(),end=readPoint(relative),arc=arcPoints(current,end,rx,ry,rotation,large,sweep,m,toleranceMm);if(arc.analytic){ring.push(arc.analytic);if(++segments>10000)throw Error('SVG enthält mehr als 10000 abgeleitete Kanten.');}else append(arc.points);current=end;approximated||=arc.approximated;}
   else throw Error('Nicht unterstützter SVG-Pfadbefehl: '+kind);
   if(['L','H','V'].includes(kind))append([affinePoint(m,old),affinePoint(m,current)]);
  }
  if(!['C','S'].includes(kind))cubic=null;if(!['Q','T'].includes(kind))quadratic=null;previous=kind;
 }
 if(!closed)throw Error('SVG-Fertigungskontur muss ausdrücklich mit Z geschlossen sein.');if(!rings.length)throw Error('SVG enthält keine geschlossene Teilkontur.');return{rings,approximated};
}

export function parseSvgTransform(raw:string):Affine2{
 let result:Affine2=[...IDENTITY_2D],at=0;const token=/\s*([a-zA-Z]+)\s*\(([^)]*)\)\s*,?/gy;
 while(at<raw.length){token.lastIndex=at;const match=token.exec(raw);if(!match)throw Error('SVG-Transformation ist nicht eindeutig.');at=token.lastIndex;const n=match[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);if(n.some(v=>!Number.isFinite(v)||Math.abs(v)>1e12))throw Error('SVG-Transformationswerte sind ungültig.');let m:Affine2;
  if(match[1]==='matrix'&&n.length===6)m=n as Affine2;
  else if(match[1]==='translate'&&[1,2].includes(n.length))m=[1,0,0,1,n[0],n[1]??0];
  else if(match[1]==='scale'&&[1,2].includes(n.length))m=[n[0],0,0,n[1]??n[0],0,0];
  else if(match[1]==='rotate'&&[1,3].includes(n.length)){const a=n[0]*Math.PI/180,c=Math.cos(a),s=Math.sin(a),r:Affine2=[c,s,-s,c,0,0];m=n.length===3?affineProduct(affineProduct([1,0,0,1,n[1],n[2]],r),[1,0,0,1,-n[1],-n[2]]):r;}
  else if(['skewX','skewY'].includes(match[1])&&n.length===1){const t=Math.tan(n[0]*Math.PI/180);if(!Number.isFinite(t)||Math.abs(t)>1e6)throw Error('Degenerierte SVG-Scherung.');m=match[1]==='skewX'?[1,0,t,1,0,0]:[1,t,0,1,0,0];}
  else throw Error('SVG-Transformation oder Parameterzahl ist nicht unterstützt.');result=affineProduct(result,m);
 }
 if(Math.abs(result[0]*result[3]-result[1]*result[2])<1e-12)throw Error('SVG-Transformation kollabiert die Kontur.');return result;
}

/** Clamped positive-weight NURBS: exact knot insertion to rational Bézier
 * spans, then the same convex-hull/chord bound in canonical millimetres. */
export function flattenNurbs(points:XY[],weights:number[],knots:number[],degree:number,toleranceMm:number):XY[]{
 if(!Number.isInteger(degree)||degree<1||degree>8||points.length<degree+1||points.length>2000||knots.length!==points.length+degree+1||weights.length!==points.length||weights.some(w=>!Number.isFinite(w)||w<=0)||knots.some((k,i)=>!Number.isFinite(k)||(i>0&&k<knots[i-1])))throw Error('DXF-Spline braucht vollständige gültige Kontrollpunkte, positive Gewichte und einen geordneten Knotenvektor.');
 const start=knots[degree],end=knots[points.length];if(!(end>start)||knots.slice(0,degree+1).some(k=>k!==start)||knots.slice(-degree-1).some(k=>k!==end))throw Error('Periodische oder nicht geklemmte Splines vor dem Import als geschlossene geklemmte Originalkontur exportieren.');
 let p=points.map((q,i)=>[q[0]*weights[i],q[1]*weights[i],weights[i]]),u=[...knots];
 for(const value of [...new Set(knots.filter(k=>k>start&&k<end))]){let multiplicity=u.filter(k=>k===value).length;if(multiplicity>degree)throw Error('Diskontinuierlicher Spline-Knoten: getrennte Konturen ausdrücklich zuordnen.');while(multiplicity<degree){let k=u.length-2;while(k>0&&!(u[k]<=value&&value<u[k+1]))k--;const n=p.length-1,q:number[][]=Array(p.length+1);for(let i=0;i<=k-degree;i++)q[i]=p[i];for(let i=k-multiplicity;i<=n;i++)q[i+1]=p[i];for(let i=k-degree+1;i<=k-multiplicity;i++){const a=(value-u[i])/(u[i+degree]-u[i]);q[i]=p[i].map((v,j)=>a*v+(1-a)*p[i-1][j]);}u.splice(k+1,0,value);p=q;multiplicity++;if(p.length>20000)throw Error('Spline-Knoten überschreiten die begrenzte Importkomplexität.');}}
 const result:XY[]=[],limit=toleranceMm-QUANTIZATION_ERROR_MM-1e-7;
 function span(controls:number[][],depth:number){const xy=controls.map(v=>[v[0]/v[2],v[1]/v[2]] as XY),a=xy[0],b=xy[xy.length-1];if(result.length>10000||depth>28)throw Error('Spline überschreitet die gewählte Fehler-/Komplexitätsgrenze.');if(xy.slice(1,-1).every(q=>segmentDistance(q,a,b)<=limit)){if(!result.length)result.push(a);result.push(b);return;}const left=[controls[0]],right=[controls[controls.length-1]];let row=controls;while(row.length>1){row=row.slice(0,-1).map((q,i)=>q.map((v,j)=>(v+row[i+1][j])/2));left.push(row[0]);right.unshift(row[row.length-1]);}span(left,depth+1);span(right,depth+1);}
 for(let i=degree;i<p.length;i++)if(u[i]<u[i+1])span(p.slice(i-degree,i+1),0);return result;
}
