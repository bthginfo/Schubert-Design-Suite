import type{Contour,DesignSnapshot,DesignElement,StonePieceElement}from'@schubert/contracts';
import{D,mm,decimalString}from'./precision.js';
import{contourAreaMm2,contourEdges,pointInContour,polygonContour,withThroughCutouts}from'./contours.js';
import{measureValue}from'./model.js';
import{surfaceAreaMm2}from'./slope.js';
export type MachiningElement=Extract<DesignElement,{kind:'machining'}>;
export const machiningNames:Record<MachiningElement['machiningType'],string>={cutout:'Durchausschnitt',borehole:'Bohrung',groove:'Nut',drip_edge:'Tropfnut',miter:'Gehrung'};
export function machiningDepth(snapshot:DesignSnapshot,feature:MachiningElement):string|null{const host=snapshot.elements.find(e=>e.id===feature.hostElementId);return feature.machiningType==='cutout'||feature.machiningType==='miter'?host?.kind==='stone_piece'?measureValue(snapshot,host.thicknessMeasureId):null:measureValue(snapshot,feature.depthMeasureId);}
export function hostMachining(snapshot:DesignSnapshot,hostId:string){return snapshot.elements.filter((e):e is MachiningElement=>e.kind==='machining'&&e.hostElementId===hostId&&e.phase!=='demolition');}
export type MiterCut={contour:Contour;mesh:{verticesMm:[string,string,string][];faces:number[][]};widthMm:string;remainingWidthMm:string;removedVolumeMm3:string;keepPlane:{normal:[number,number,number];constantMm:number}};
/** A true planar bevel on a straight rectangular workpiece. The restriction is
 * explicit: no arbitrary freeform contour is silently treated as a rectangle. */
export function miterCut(snapshot:DesignSnapshot,host:StonePieceElement,edgeIndex:number,angleDeg:string,face:'front'|'back'='front'):MiterCut{
 const edges=host.finishedContour.outer;if(edges.length!==4||edges.some(e=>e.kind!=='line')||host.finishedContour.holes.length||host.finishedContour.islands?.length)throw Error('Eine parametrische Gehrung benötigt ein gerades rechteckiges Einzelbauteil ohne Innenkonturen. Freiform-Gehrungen brauchen eine eigene geprüfte Fertigungskontur.');
 const edge=edges[edgeIndex];if(!edge||edge.kind!=='line')throw Error('Eine konkrete gerade Außenkante für die Gehrung auswählen.');
 const vectors=edges.map(e=>[Number(e.to.xMm)-Number(e.from.xMm),Number(e.to.yMm)-Number(e.from.yMm)]);for(let i=0;i<4;i++){const a=vectors[i],b=vectors[(i+1)%4];if(Math.abs(a[0]*b[0]+a[1]*b[1])>Math.hypot(...a)*Math.hypot(...b)*1e-8)throw Error('Die Gehrungskante gehört nicht zu einem rechtwinkligen Rechteck.');}
 const thickness=measureValue(snapshot,host.thicknessMeasureId),angle=Number(angleDeg);if(thickness===null||Number(thickness)<=0)throw Error('Für eine Gehrung zuerst die tatsächliche Materialstärke festlegen.');if(!Number.isFinite(angle)||angle<=0||angle>=90)throw Error('Gehrungswinkel zur Bauteilfläche muss ausdrücklich größer als 0 und kleiner als 90 Grad sein.');
 const a=[Number(edge.from.xMm),Number(edge.from.yMm)],b=[Number(edge.to.xMm),Number(edge.to.yMm)],length=Math.hypot(b[0]-a[0],b[1]-a[1]),ux=(b[0]-a[0])/length,uy=(b[1]-a[1])/length;let nx=-uy,ny=ux;const mid={xMm:mm((a[0]+b[0])/2+nx*.01),yMm:mm((a[1]+b[1])/2+ny*.01)};if(!pointInContour(mid,host.finishedContour)){nx=-nx;ny=-ny;}
 const width=Number(mm(Number(thickness)/Math.tan(angle*Math.PI/180))),available=Math.hypot(...vectors[(edgeIndex+1)%4]);if(width<=0||width>=available-.005)throw Error('Diese Gehrung würde das Bauteil vollständig durchtrennen oder ist bei 0,01 mm nicht auflösbar. Winkel, Stärke oder Bauteilbreite fachlich korrigieren.');
 const c=[b[0]+nx*width,b[1]+ny*width],d=[a[0]+nx*width,a[1]+ny*width],contour=polygonContour([a,b,c,d].map(([x,y])=>({xMm:mm(x),yMm:mm(y)}))),outer=face==='front'?0:-Number(thickness),inner=face==='front'?-Number(thickness):0;
 const verticesMm:[string,string,string][]=[[a[0],a[1],outer],[b[0],b[1],outer],[d[0],d[1],outer],[c[0],c[1],outer],[a[0],a[1],inner],[b[0],b[1],inner]].map(([x,y,z])=>[mm(x),mm(y),mm(z)]),faces=[[0,1,3,2],[0,4,5,1],[0,2,4],[1,5,3],[2,3,5,4]];
 const t=Number(thickness),normal:[number,number,number]=[nx*t/width,ny*t/width,face==='front'?-1:1],constantMm=-(normal[0]*a[0]+normal[1]*a[1])+(face==='front'?-t:0);
 return{contour,mesh:{verticesMm,faces},widthMm:mm(width),remainingWidthMm:mm(available-width),removedVolumeMm3:decimalString(new D(length).times(width).times(t).div(2)),keepPlane:{normal,constantMm}};
}
/** Horizontal depth intervals are shared by interactive 3D and quantities.
 * Unresolved cuts remain explicitly listed; their depth is never invented. */
export function stoneDepthSlices(snapshot:DesignSnapshot,host:StonePieceElement){
 const thickness=measureValue(snapshot,host.thicknessMeasureId),features=hostMachining(snapshot,host.id),unresolvedIds:string[]=[];if(thickness===null)return{slices:[],unresolvedIds:[host.id]};const t=Number(thickness),cuts=features.filter(f=>f.machiningType!=='miter').flatMap(feature=>{const depth=machiningDepth(snapshot,feature);if(depth===null){unresolvedIds.push(feature.id);return[];}const d=Math.min(t,Number(depth)),back=feature.face==='back';return[{feature,top:back?-t+d:0,bottom:back?-t:-d}];}),breaks=[...new Set([-t,0,...cuts.flatMap(c=>[c.bottom,c.top])])].sort((a,b)=>a-b),slices=[];
 for(let i=0;i<breaks.length-1;i++){const bottom=breaks[i],top=breaks[i+1];if(top-bottom<1e-8)continue;const mid=(bottom+top)/2,active=cuts.filter(c=>c.bottom<mid&&mid<c.top);slices.push({bottomMm:mm(bottom),topMm:mm(top),contour:withThroughCutouts(host.finishedContour,active.map(c=>c.feature.contour))});}
 return{slices,unresolvedIds};
}
export function machiningVolumeMm3(snapshot:DesignSnapshot,host:StonePieceElement):string|null{
 const thickness=measureValue(snapshot,host.thicknessMeasureId);if(thickness===null)return null;const factor=new D(surfaceAreaMm2(snapshot,host.id,host.finishedContour)).div(contourAreaMm2(host.finishedContour));let volume=new D(surfaceAreaMm2(snapshot,host.id,host.finishedContour)).times(thickness);
 for(const f of hostMachining(snapshot,host.id)){if(f.machiningType==='miter'){if(!f.miter)return null;try{volume=volume.minus(new D(miterCut(snapshot,host,f.miter.edgeIndex,f.miter.angleDeg,f.face).removedVolumeMm3).times(factor));}catch{return null;}}
 else{const depth=machiningDepth(snapshot,f);if(depth===null)return null;volume=volume.minus(new D(surfaceAreaMm2(snapshot,host.id,f.contour)).times(depth));}}
 return decimalString(D.max(0,volume));
}
