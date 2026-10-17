import type{DesignSnapshot,PathEdge,Contour}from'@schubert/contracts';
import{D,decimalString,distance}from'./precision.js';
import{arcSweep,contourAreaMm2,contourGrossAreaMm2,contourPerimeterMm}from'./contours.js';

/** Slope endpoints and contours use the host's horizontal XY projection. Thickness is normal to its plane. */
export function surfaceSlope(snapshot:DesignSnapshot,id:string|null){
  const slopes=snapshot.elements.filter(e=>e.kind==='slope'&&e.hostElementId===id&&e.phase!=='demolition');
  if(slopes.length!==1||slopes[0].kind!=='slope')return null;
  const e=slopes[0];if(snapshot.measurements[e.riseMeasureId]?.valueMm==null||snapshot.measurements[e.runMeasureId]?.valueMm==null)return null;
  const dx=new D(e.end.xMm).minus(e.start.xMm),dy=new D(e.end.yMm).minus(e.start.yMm),squared=dx.pow(2).plus(dy.pow(2));if(squared.isZero())return null;
  const rise=new D(e.end.zMm).minus(e.start.zMm),sx=rise.times(dx).div(squared),sy=rise.times(dy).div(squared),factor=new D(1).plus(sx.pow(2)).plus(sy.pow(2)).sqrt();
  return{sx:sx.toNumber(),sy:sy.toNumber(),originZMm:new D(e.start.zMm).minus(sx.times(e.start.xMm)).minus(sy.times(e.start.yMm)).toNumber(),normal:[sx.negated().div(factor).toNumber(),sy.negated().div(factor).toNumber(),new D(1).div(factor).toNumber()],areaFactor:factor.toFixed()};
}
export function surfaceAreaMm2(snapshot:DesignSnapshot,id:string,contour:Contour,gross=false){return decimalString(new D(gross?contourGrossAreaMm2(contour):contourAreaMm2(contour)).times(surfaceSlope(snapshot,id)?.areaFactor??1));}
export function surfaceEdgeLengthMm(snapshot:DesignSnapshot,id:string,edge:PathEdge){
  const slope=surfaceSlope(snapshot,id);if(!slope)return contourPerimeterMm({outer:[edge],holes:[]});
  if(edge.kind==='line'){const dx=new D(edge.to.xMm).minus(edge.from.xMm),dy=new D(edge.to.yMm).minus(edge.from.yMm),dz=dx.times(slope.sx).plus(dy.times(slope.sy));return decimalString(dx.pow(2).plus(dy.pow(2)).plus(dz.pow(2)).sqrt());}
  const radius=Number(distance(edge.from,edge.center)),start=Math.atan2(Number(edge.from.yMm)-Number(edge.center.yMm),Number(edge.from.xMm)-Number(edge.center.xMm)),sweep=arcSweep(edge),a=Math.min(start,start+sweep),b=Math.max(start,start+sweep);
  const fn=(t:number)=>radius*Math.sqrt(1+(-slope.sx*Math.sin(t)+slope.sy*Math.cos(t))**2),simpson=(l:number,r:number)=>(r-l)*(fn(l)+4*fn((l+r)/2)+fn(r))/6;
  function integrate(l:number,r:number,whole:number,error:number,depth:number):number{const mid=(l+r)/2,left=simpson(l,mid),right=simpson(mid,r),delta=left+right-whole;return depth===0||Math.abs(delta)<=15*error?left+right+delta/15:integrate(l,mid,left,error/2,depth-1)+integrate(mid,r,right,error/2,depth-1);}
  const count=Math.max(1,Math.ceil((b-a)/(Math.PI/4)));let total=0;for(let i=0;i<count;i++){const left=a+(b-a)*i/count,right=a+(b-a)*(i+1)/count;total+=integrate(left,right,simpson(left,right),.0001/count,20);}return decimalString(total);
}
