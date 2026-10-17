import type{Contour,Point3}from'@schubert/contracts';
import{D,mm}from'./precision.js';
import{rectangleContour}from'./contours.js';
export type RectangularBorderPart={key:string;label:string;position:Point3;contour:Contour;widthMm:string;lengthMm:string;heightMm:string};
/** Four actual butt-jointed stones. The declared joint is empty space, never stone volume. */
export function rectangularBorderParts(widthMm:string,depthMm:string,railWidthMm:string,heightMm:string,jointMm:string):RectangularBorderPart[]{
 const[w,d,t,h,j]=[widthMm,depthMm,railWidthMm,heightMm,jointMm].map(v=>new D(mm(v)));if([w,d,t,h].some(v=>v.lte(0))||j.lt(0))throw Error('Außenmaße, Randbreite und Steinhöhe müssen positiv sein; die ausdrücklich gewählte Stoßfuge darf null sein.');
 const side=d.minus(t.times(2)).minus(j.times(2));if(w.lte(t.times(2))||side.lte(0))throw Error('Randbreite und Stoßfugen lassen keine offene Innenfläche mit vier getrennten Steinbauteilen übrig.');
 return[
  {key:'front',label:'Vorderer Querstein',x:new D(0),y:new D(0),width:w,length:t},
  {key:'back',label:'Hinterer Querstein',x:new D(0),y:d.minus(t),width:w,length:t},
  {key:'left',label:'Linker Längsstein',x:new D(0),y:t.plus(j),width:t,length:side},
  {key:'right',label:'Rechter Längsstein',x:w.minus(t),y:t.plus(j),width:t,length:side},
 ].map(p=>({key:p.key,label:p.label,position:{xMm:mm(p.x),yMm:mm(p.y),zMm:mm(h)},contour:rectangleContour(mm(p.width),mm(p.length)),widthMm:mm(p.width),lengthMm:mm(p.length),heightMm:mm(h)}));
}
