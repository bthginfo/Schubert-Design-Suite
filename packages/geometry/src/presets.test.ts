import{describe,it,expect}from'vitest';
import{memorialShapes,memorialContour,roundContourCorner,contourArcRadius}from'./presets.js';
import{rectangleContour,validateContour,contourAreaMm2,contourBounds,sampleRing}from'./contours.js';
describe('Editable memorial outlines and corner radii',()=>{
 it('includes exact arc extrema in both sampling directions without extending a partial arc',()=>{
  const arc=memorialContour('round_arch','600','900').outer[2];
  if(arc.kind!=='circular_arc')throw Error('Expected an arc');
  for(const edge of [arc,{...arc,from:arc.to,to:arc.from,clockwise:true}]){
   const points=sampleRing([edge]);expect(points).toContainEqual({xMm:'300',yMm:'900'});
   expect(Math.min(...points.map(p=>Number(p.xMm)))).toBeGreaterThanOrEqual(0);
   expect(Math.max(...points.map(p=>Number(p.xMm)))).toBeLessThanOrEqual(600);
   expect(Math.min(...points.map(p=>Number(p.yMm)))).toBeGreaterThanOrEqual(600);
  }
  const quarter={...arc,to:{xMm:'300',yMm:'900'}};
  expect(sampleRing([quarter]).every(p=>Number(p.xMm)>=300&&Number(p.yMm)>=600)).toBe(true);
 });
 it.each(memorialShapes)('$label has a closed, valid contour and retains the chosen dimensions',({id})=>{
  const contour=memorialContour(id,'800',id==='circle'?'800':'1200');expect(validateContour(contour)).toEqual([]);const bounds=contourBounds(contour);expect(Number(bounds.maxX)-Number(bounds.minX)).toBeCloseTo(800,1);expect(Number(bounds.maxY)-Number(bounds.minY)).toBeCloseTo(id==='circle'?800:1200,1);expect(Number(contourAreaMm2(contour))).toBeGreaterThan(0);
 });
 it('removes the exact quarter-circle corner area while preserving the other edges and undo input',()=>{
  const source=rectangleContour('100','100'),rounded=roundContourCorner(source,0,1,'10');expect(rounded.outer).toHaveLength(5);expect(source.outer).toHaveLength(4);expect(rounded.outer.filter(e=>e.kind==='circular_arc')).toHaveLength(1);expect(Number(contourAreaMm2(rounded))).toBeCloseTo(10000-100*(1-Math.PI/4),4);
 });
 it('bevels a selected corner and refuses radii that consume adjacent edges',()=>{
  const source=rectangleContour('100','100');expect(Number(contourAreaMm2(roundContourCorner(source,0,1,'10','bevel')))).toBeCloseTo(9950,4);expect(()=>roundContourCorner(source,0,1,'101')).toThrow(/zu groß/);
 });
 it('changes an arc radius without moving its endpoints and rejects impossible chords',()=>{
  const source=memorialContour('round_arch','800','1200'),changed=contourArcRadius(source,0,2,'500'),arc=changed.outer[2];expect(arc.from).toEqual(source.outer[2].from);expect(arc.to).toEqual(source.outer[2].to);expect(validateContour(changed)).toEqual([]);expect(()=>contourArcRadius(source,0,2,'399')).toThrow(/Sehnenlänge/);
 });
 it('requires circle proportions explicitly and rejects invalid design sizes',()=>{
  expect(()=>memorialContour('circle','800','1000')).toThrow(/dieselbe/);expect(()=>memorialContour('rectangle','0','1000')).toThrow();expect(()=>memorialContour('round_arch','800','300')).toThrow(/Bogenhöhe/);
 });
});
