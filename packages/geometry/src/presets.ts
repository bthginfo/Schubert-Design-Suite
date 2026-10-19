import type{Contour,PathEdge,Point2}from'@schubert/contracts';
import{rectangleContour,polygonContour,validateContour}from'./contours.js';
import{mm}from'./precision.js';

export const memorialShapes=[
 {id:'rectangle',label:'Gerade Stele'}, {id:'round_arch',label:'Rundbogen'},
 {id:'segment_arch',label:'Flacher Bogen'}, {id:'rounded',label:'Gerundete Ecken'},
 {id:'chamfered',label:'Abgeschrägte Schultern'}, {id:'pointed',label:'Spitzdach'},
 {id:'slant_left',label:'Schräg nach links'}, {id:'slant_right',label:'Schräg nach rechts'},
 {id:'oval',label:'Oval'}, {id:'circle',label:'Rund'},
 {id:'heart',label:'Herz'}, {id:'book',label:'Buchkontur'},
 {id:'shoulder',label:'Abgesetzte Schultern'}, {id:'tapered',label:'Verjüngte Stele'}
]as const;
export type MemorialShape=typeof memorialShapes[number]['id'];
const point=(x:number,y:number):Point2=>({xMm:mm(x),yMm:mm(y)});
const line=(from:Point2,to:Point2):PathEdge=>({kind:'line',from,to});
function valid(value:Contour){const issues=validateContour(value);if(issues.length)throw Error(issues.join('\n'));return value;}
function positive(value:string,label:string){const number=Number(value);if(!Number.isFinite(number)||number<=0||number>100000)throw Error(label+' muss größer als null und höchstens 100.000 mm sein.');return number;}

/** These are editable design outlines, never manufacturer models or technical approvals. */
export function memorialContour(shape:MemorialShape,widthMm:string,heightMm:string,options:{radiusMm?:string;archRiseMm?:string}={}):Contour{
 const w=positive(widthMm,'Breite'),h=positive(heightMm,'Höhe');
 const polygon=(points:number[][])=>polygonContour(points.map(([x,y])=>point(x,y)));
 if(shape==='rectangle')return rectangleContour(widthMm,heightMm);
 if(shape==='rounded'){
  const radius=options.radiusMm??mm(Math.min(w,h)*.12);let contour=rectangleContour(widthMm,heightMm);
  for(const[x,y]of[[0,0],[w,0],[w,h],[0,h]]){const index=contour.outer.findIndex(edge=>Number(edge.from.xMm)===x&&Number(edge.from.yMm)===y);contour=roundContourCorner(contour,0,index,radius);}
  return contour;
 }
 if(shape==='round_arch'||shape==='segment_arch'){
  const rise=shape==='round_arch'?w/2:positive(options.archRiseMm??mm(w*.18),'Bogenhöhe');
  if(rise>w/2||rise>=h)throw Error('Die Bogenhöhe darf höchstens die halbe Breite betragen und muss kleiner als die Gesamthöhe sein.');
  const radius=w*w/(8*rise)+rise/2,cy=h-radius,shoulder=h-rise;
  return valid({outer:[line(point(0,0),point(w,0)),line(point(w,0),point(w,shoulder)),{kind:'circular_arc',from:point(w,shoulder),to:point(0,shoulder),center:point(w/2,cy),clockwise:false},line(point(0,shoulder),point(0,0))],holes:[]});
 }
 if(shape==='oval'){
  const radius=Math.max(w,h)/2,step=2*Math.acos(Math.max(-1,1-.04/radius)),count=Math.max(32,Math.min(4096,Math.ceil(2*Math.PI/step/4)*4));
  return valid(polygon(Array.from({length:count},(_,i)=>{const angle=i*2*Math.PI/count;return[w/2+w/2*Math.cos(angle),h/2+h/2*Math.sin(angle)];})));
 }
 if(shape==='circle'){
  if(Math.abs(w-h)>.005)throw Error('Ein Kreis benötigt dieselbe Breite und Höhe. Für andere Proportionen „Oval“ wählen.');
  const center=point(w/2,h/2);return valid({outer:[{kind:'circular_arc',from:point(w,h/2),to:point(0,h/2),center,clockwise:false},{kind:'circular_arc',from:point(0,h/2),to:point(w,h/2),center,clockwise:false}],holes:[]});
 }
 if(shape==='heart'){
  const r=w/4,cy=h-r;if(cy<=0)throw Error('Die Herzform benötigt eine Höhe größer als ein Viertel ihrer Breite.');
  return valid({outer:[line(point(w/2,0),point(w,cy)),{kind:'circular_arc',from:point(w,cy),to:point(w/2,cy),center:point(3*w/4,cy),clockwise:false},{kind:'circular_arc',from:point(w/2,cy),to:point(0,cy),center:point(w/4,cy),clockwise:false},line(point(0,cy),point(w/2,0))],holes:[]});
 }
 const outlines:Partial<Record<MemorialShape,number[][]>>={
  chamfered:[[0,0],[w,0],[w,h*.84],[w*.8,h],[w*.2,h],[0,h*.84]],
  pointed:[[0,0],[w,0],[w,h*.78],[w/2,h],[0,h*.78]],
  slant_left:[[0,0],[w,0],[w,h*.82],[0,h]],
  slant_right:[[0,0],[w,0],[w,h],[0,h*.82]],
  book:[[0,0],[w,0],[w,h*.92],[w*.65,h],[w/2,h*.92],[w*.35,h],[0,h*.92]],
  shoulder:[[0,0],[w,0],[w,h*.74],[w*.82,h*.74],[w*.82,h],[w*.18,h],[w*.18,h*.74],[0,h*.74]],
  tapered:[[0,0],[w,0],[w*.86,h],[w*.14,h]]
 };
 const outline=outlines[shape];if(!outline)throw Error('Unbekannte Form.');return valid(polygon(outline));
}

/** Round or bevel one vertex shared by two straight edges, keeping all other parts intact. */
export function roundContourCorner(input:Contour,ringIndex:number,cornerIndex:number,amountMm:string,mode:'round'|'bevel'='round'):Contour{
 const result=structuredClone(input),ring=[result.outer,...result.holes][ringIndex];
 if(!ring||cornerIndex<0||cornerIndex>=ring.length)throw Error('Eine vorhandene Ecke wählen.');
 const previous=ring[(cornerIndex+ring.length-1)%ring.length],next=ring[cornerIndex];
 if(previous.kind!=='line'||next.kind!=='line')throw Error('Diese Ecke grenzt bereits an einen Bogen. Dessen Radius direkt bearbeiten oder die Änderung rückgängig machen.');
 const amount=positive(amountMm,mode==='round'?'Radius':'Fasenrücksprung'),b=next.from;
 const ax=Number(previous.from.xMm)-Number(b.xMm),ay=Number(previous.from.yMm)-Number(b.yMm),cx=Number(next.to.xMm)-Number(b.xMm),cy=Number(next.to.yMm)-Number(b.yMm),la=Math.hypot(ax,ay),lc=Math.hypot(cx,cy);
 if(!la||!lc)throw Error('Die angrenzenden Kanten benötigen eine Länge.');
 const ux=ax/la,uy=ay/la,vx=cx/lc,vy=cy/lc,theta=Math.acos(Math.max(-1,Math.min(1,ux*vx+uy*vy)));
 if(theta<1e-5||Math.abs(Math.PI-theta)<1e-5)throw Error('An dieser Stelle liegt keine bearbeitbare Ecke vor.');
 const tangent=mode==='round'?amount/Math.tan(theta/2):amount;
 if(tangent>=la-.01||tangent>=lc-.01)throw Error('Der Radius oder Rücksprung ist für die angrenzenden Kanten zu groß.');
 const p=point(Number(b.xMm)+ux*tangent,Number(b.yMm)+uy*tangent),q=point(Number(b.xMm)+vx*tangent,Number(b.yMm)+vy*tangent);
 let joining:PathEdge=line(p,q);
 if(mode==='round'){
  const bisector=Math.hypot(ux+vx,uy+vy),distance=amount/Math.sin(theta/2),center=point(Number(b.xMm)+(ux+vx)/bisector*distance,Number(b.yMm)+(uy+vy)/bisector*distance);
  joining={kind:'circular_arc',from:p,to:q,center,clockwise:(-ux*vy+uy*vx)<0};
 }
 previous.to=p;next.from=q;ring.splice(cornerIndex,0,joining);delete result.importProvenance;return valid(result);
}

/** Set an arc's radius while preserving its endpoints and existing center side. */
export function contourArcRadius(input:Contour,ringIndex:number,edgeIndex:number,radiusMm:string):Contour{
 const result=structuredClone(input),edge=[result.outer,...result.holes][ringIndex]?.[edgeIndex];if(!edge||edge.kind!=='circular_arc')throw Error('Einen Kreisbogen auswählen.');
 const r=positive(radiusMm,'Radius'),x=Number(edge.to.xMm)-Number(edge.from.xMm),y=Number(edge.to.yMm)-Number(edge.from.yMm),length=Math.hypot(x,y);
 if(!length)throw Error('Bei einem Vollkreis müssen die Formmaße gemeinsam geändert werden.');if(r<length/2)throw Error('Der Radius muss mindestens der halben Sehnenlänge entsprechen.');
 const mx=(Number(edge.from.xMm)+Number(edge.to.xMm))/2,my=(Number(edge.from.yMm)+Number(edge.to.yMm))/2,h=Math.sqrt(Math.max(0,r*r-length*length/4)),candidates=[point(mx-y/length*h,my+x/length*h),point(mx+y/length*h,my-x/length*h)];
 candidates.sort((a,b)=>Math.hypot(Number(a.xMm)-Number(edge.center.xMm),Number(a.yMm)-Number(edge.center.yMm))-Math.hypot(Number(b.xMm)-Number(edge.center.xMm),Number(b.yMm)-Number(edge.center.yMm)));edge.center=candidates[0];delete result.importProvenance;return valid(result);
}
