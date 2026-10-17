import{it,expect}from'vitest';
import{edgeSetDistanceMm,edgeDistanceMm,edgeSetsIntersect,edgeIntersections,polygonContour,validateContour,rectangleContour,mm,withThroughCutouts,contourAreaMm2}from'./index.js';
import type{PathEdge}from'@schubert/contracts';
const line=(x:number,y:number,u:number,v:number):PathEdge=>({kind:'line',from:{xMm:mm(x),yMm:mm(y)},to:{xMm:mm(u),yMm:mm(v)}});
it('keeps analytical arc/line intersections and distances identical to exhaustive pairs',()=>{
 let seed=19217;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 const edges:PathEdge[]=Array.from({length:45},()=>line(random()*1000,random()*1000,random()*1000,random()*1000));
 edges.push({kind:'circular_arc',from:{xMm:'1200',yMm:'0'},to:{xMm:'1200',yMm:'0'},center:{xMm:'1000',yMm:'0'},clockwise:false},{kind:'circular_arc',from:{xMm:'1500',yMm:'100'},to:{xMm:'1400',yMm:'200'},center:{xMm:'1400',yMm:'100'},clockwise:true});
 for(let i=0;i<edges.length;i+=3){const a=edges.slice(i,i+3),b=edges.slice().reverse().slice(0,19),expected=Math.min(...a.flatMap(x=>b.map(y=>Number(edgeDistanceMm(x,y)))));expect(Number(edgeSetDistanceMm(a,b))).toBe(expected);expect(edgeSetsIntersect(a,b)).toBe(a.some(x=>b.some(y=>edgeIntersections(x,y).length)));}
 const circle=edges.at(-2)!;expect(edgeSetsIntersect([circle],[line(1000,-250,1000,250)])).toBe(true);expect(edgeSetsIntersect([circle],[line(1210,-250,1210,250)])).toBe(false);
});
it('validates a ten-thousand-edge source without a quadratic Decimal array or stack overflow',()=>{
 const points=Array.from({length:10000},(_,i)=>({xMm:mm(100000*Math.cos(i*Math.PI*2/10000)),yMm:mm(100000*Math.sin(i*Math.PI*2/10000))})),contour=polygonContour(points);
 expect(validateContour(contour)).toEqual([]);const inner=rectangleContour('100','100');expect(Number(edgeSetDistanceMm(contour.outer,inner.outer))).toBeGreaterThan(99800);
},15000);
it('still catches crossing, touching and nested source parts after bounds filtering',()=>{
 const crossed=polygonContour([{xMm:'0',yMm:'0'},{xMm:'100',yMm:'100'},{xMm:'0',yMm:'100'},{xMm:'100',yMm:'0'}]);expect(validateContour(crossed).join()).toContain('Selbstschnitt');
 const part=rectangleContour('100','100');part.islands=[rectangleContour('50','50')];expect(validateContour(part).join()).toContain('überdecken');
});
it('accepts reactive browser proxies and never mutates the source contour',()=>{
 const wrap=(value:any):any=>value&&typeof value==='object'?new Proxy(value,{get:(target,key)=>wrap(Reflect.get(target,key))}):value;
 const source=rectangleContour('1000','600'),hole=rectangleContour('200','100');for(const edge of hole.outer)for(const point of[edge.from,edge.to]){point.xMm=mm(Number(point.xMm)+100);point.yMm=mm(Number(point.yMm)+100);}
 const result=withThroughCutouts(wrap(source),[wrap(hole)]);expect(source.holes).toEqual([]);expect(contourAreaMm2(result)).toBe('580000');expect(()=>structuredClone(result)).not.toThrow();
});
