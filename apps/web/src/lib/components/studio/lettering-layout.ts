import type{DesignSnapshot,InscriptionElement}from'@schubert/contracts';
import {inscriptionPreviewDefaults} from '@schubert/contracts';
import{measureValue,applyMatrix,surfaceMatrix,projectPoint,sampleRing,type DesignView}from'@schubert/geometry';
import{planningFont}from'./planning-fonts.ts';

const loaded=new Map<string,Promise<void>>();
// A CSS FontFace keeps its failed state. An explicit retry creates a fresh face.
export function loadPlanningFont(key?:string,retry=false):Promise<void>{
 const font=planningFont(key);let ready=loaded.get(font.key);
 if(!ready){ready=retry?new FontFace(font.family,`url("${font.path}")`,{style:"normal",weight:"400"}).load().then(face=>{document.fonts.add(face);}):document.fonts.load(`400 100px "${font.family}"`,'Erinnerung Äöß 0123456789').then(()=>{if(!document.fonts.check(`400 100px "${font.family}"`))throw Error('Entwurfsschrift konnte nicht geladen werden.');});loaded.set(font.key,ready);ready.catch(()=>loaded.delete(font.key));}
 return ready;
}
/** Visual layout only. Supplier glyph geometry and production dimensions stay separate. */
export function letteringLayout(snapshot:DesignSnapshot,element:InscriptionElement,widthAtFontSize?:(text:string,size:number)=>number){
 const font=planningFont(element.previewFontKey),height=Number(measureValue(snapshot,element.requestedHeightMeasureId)??40),gap=Number(measureValue(snapshot,element.lineGapMeasureId)??height*.35),maxWidth=Number(measureValue(snapshot,element.requestedMaxWidthMeasureId)??0);
 const fontSize=Math.max(.01,height)/font.capRatio,lines=element.exactText.split(/\r?\n/),advance=Math.max(height,fontSize*(font.capRatio+font.descender))+Math.max(0,gap);
 const widths=lines.map(line=>widthAtFontSize?.(line,fontSize)??Array.from(line).length*fontSize*.56),naturalWidth=Math.max(1,...widths),scale=maxWidth>0?Math.min(1,maxWidth/naturalWidth):1,width=naturalWidth*scale;
 const left=element.alignment==='center'?-width/2:element.alignment==='right'?-width:0,top=(lines.length-1)*advance+fontSize*font.ascender,bottom=fontSize*font.descender;
 return{font,fontSize,scale,width,left,top,bottom,height:top+bottom,rows:lines.map((text,index)=>({text,baseline:(lines.length-1-index)*advance})),anchor:element.alignment==='center'?'middle':element.alignment==='right'?'end':'start',heightEstimated:measureValue(snapshot,element.requestedHeightMeasureId)===null,color:element.previewColor??inscriptionPreviewDefaults.color};
}
export function letteringProjection(snapshot:DesignSnapshot,element:InscriptionElement,view:DesignView){
 const m=surfaceMatrix(snapshot,element.surfaceElementId),angle=Number(element.rotationDeg)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 const p=(x:number,y:number)=>projectPoint(applyMatrix({xMm:String(Number(element.originUV.uMm)+x*c-y*s),yMm:String(Number(element.originUV.vMm)+x*s+y*c),zMm:'0'},m),view);
 const o=p(0,0),x=p(1,0),y=p(0,1),a=Number(x.xMm)-Number(o.xMm),b=-(Number(x.yMm)-Number(o.yMm)),c2=-(Number(y.xMm)-Number(o.xMm)),d=Number(y.yMm)-Number(o.yMm);
 return Math.abs(a*d-b*c2)<.001?null:`matrix(${a} ${b} ${c2} ${d} ${o.xMm} ${-Number(o.yMm)})`;
}
export function inscriptionCenter(snapshot:DesignSnapshot,element:InscriptionElement){
 const host=snapshot.elements.find(e=>e.id===element.surfaceElementId),contour=host?.kind==='stone_piece'?host.finishedContour:host?.kind==='surface'?host.contour:null;if(!contour)throw Error('Eine Stein- oder Beschriftungsfläche auswählen.');
 const points=sampleRing(contour.outer),xs=points.map(p=>Number(p.xMm)),ys=points.map(p=>Number(p.yMm));
 const layout=letteringLayout(snapshot,element),centerX=(Math.min(...xs)+Math.max(...xs))/2,centerY=(Math.min(...ys)+Math.max(...ys))/2;
 return{uMm:String(Math.round(centerX*100)/100),vMm:String(Math.round((centerY-(layout.top-layout.bottom)/2)*100)/100)};
}
