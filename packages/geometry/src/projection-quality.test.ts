import {expect,it} from 'vitest';
import {createDesign,rectangleContour,targetMeasure,projectDesign,projectDimensions} from './index.js';
function roundedStone(){
 const s=createDesign('memorial'),contour=rectangleContour('800','800');
 contour.outer[2]={kind:'circular_arc',from:{xMm:'800',yMm:'800'},to:{xMm:'0',yMm:'800'},center:{xMm:'400',yMm:'800'},clockwise:false};
 s.measurements.t=targetMeasure('160');s.measurements.h=targetMeasure('1200');
 const base={parentId:'root',phase:'planned' as const,locked:false,sourceEvidenceVersionIds:[]};
 s.elements.push({...base,id:'stone',label:'Stele',kind:'stone_piece',purpose:'memorial',transform:{position:{xMm:'0',yMm:'0',zMm:'0'},rotationDeg:{x:'90',y:'0',z:'0'}},finishedContour:contour,thicknessMeasureId:'t',materialSpecVersionId:'unassigned:material',stockItemId:null,grainDirectionDeg:null,edgeTreatments:[],machiningFeatureIds:[]},
 {...base,id:'height',label:'Höhe',kind:'dimension',refs:[{elementId:'stone',feature:'height'}],measureId:'h',mode:'driving',offsetMm:'30'});return s;
}
it.each(['side','top'] as const)('draws a rounded stone %s silhouette without tessellation hatching',view=>{
 const s=roundedStone(),before=JSON.stringify(s),p=projectDesign(s,view);
 expect(p.shapes).toHaveLength(4);expect(p.shapes.every(shape=>shape.points.length===2&&!shape.closed&&!shape.secondary)).toBe(true);
 expect(p.bounds.width).toBe(view==='side'?160:800);expect(p.bounds.height).toBe(view==='side'?1200:160);
 expect(JSON.stringify(s)).toBe(before);
});
it('does not overlay a coincident rear contour or zero-length extrusion edges on the front',()=>{
 const p=projectDesign(roundedStone(),'front');expect(p.shapes).toHaveLength(1);expect(p.shapes[0].points.length).toBeGreaterThan(20);expect(p.bounds.height).toBe(1200);
});
it('keeps edge-on height dimensions outside the solid',()=>{
 const d=projectDimensions(roundedStone(),'side')[0];expect(d.outward.x).toBe(-1);expect(d.outward.y).toBe(0);
});
