import {describe,expect,it} from 'vitest';
import type {DesignOperation,DesignSnapshot,Measure} from '@schubert/contracts';
import {applyOperations,createDesign,rectangleContour,targetMeasure,validateDesign} from '@schubert/geometry';
import {confirmableMeasureIds,groupStudioIssues} from './issues.ts';

function stone(snapshot:DesignSnapshot,id:string,label:string,w:string,h:string,t:string):DesignOperation[]{
  const measurements:Record<string,Measure>={[`${id}:thickness`]:targetMeasure(t),[`${id}:width`]:targetMeasure(w),[`${id}:height`]:targetMeasure(h)};
  const base={parentId:snapshot.frames[0].id,phase:'planned' as const,locked:false,sourceEvidenceVersionIds:[]};
  return [
    ...(['width','height'] as const).map(key=>({type:'add_element' as const,element:{...base,id:`${id}:dimension:${key}`,label:`${label} · ${key==='width'?'Breite':'Höhe'}`,kind:'dimension' as const,refs:[{elementId:id,feature:key}],measureId:`${id}:${key}`,mode:'driving' as const,offsetMm:'30'},measurements})),
    {type:'add_element',element:{...base,id,label,kind:'stone_piece',purpose:'memorial',transform:{position:{xMm:'0',yMm:'0',zMm:'0'},rotationDeg:{x:'90',y:'0',z:'0'}},finishedContour:rectangleContour(w,h),thicknessMeasureId:`${id}:thickness`,materialSpecVersionId:'unassigned:material',stockItemId:null,grainDirectionDeg:null,edgeTreatments:[],machiningFeatureIds:[]},measurements}
  ];
}
function memorial(){
  let s=createDesign('memorial');
  s=applyOperations(s,[...stone(s,'stele','Stele','600','900','160'),...stone(s,'base','Sockel','700','200','250')]);
  const m:Record<string,Measure>={'ins:lh':targetMeasure('40'),'ins:mw':targetMeasure(null),'ins:gap':targetMeasure('12')};
  return applyOperations(s,[{type:'add_element',element:{id:'ins',label:'Inschrift',parentId:s.frames[0].id,phase:'planned',locked:false,sourceEvidenceVersionIds:[],kind:'inscription',surfaceElementId:'stele',originUV:{uMm:'300',vMm:'394.43'},rotationDeg:'0',exactText:'Maria',fontVariantVersionId:'unassigned:font',referenceAssetVersionIds:[],renderingBasis:'shop_image_reference',requestedHeightMeasureId:'ins:lh',requestedLowercaseHeightMeasureId:null,requestedMaxWidthMeasureId:'ins:mw',lineGapMeasureId:'ins:gap',supplyForm:'individual_letters',materialSpecVersionId:null,materialArticleReference:null,finishSpecVersionId:null,alignment:'center',glyphPlacements:[]},measurements:m}]);
}

describe('check list groups',()=>{
  it('groups by part, names each measure and marks what it blocks',()=>{
    const snapshot=memorial(),groups=groupStudioIssues(snapshot,validateDesign(snapshot),validateDesign(snapshot,{forRelease:true}));
    expect(groups.map(g=>g.label)).toEqual(['Stele','Sockel','Inschrift']);
    const stele=groups[0];
    expect(stele.gate).toBe('production');
    expect(stele.items.map(i=>i.text)).toEqual(expect.arrayContaining(['Breite Stele 600 mm – Wunschmaß noch nicht fachlich bestätigt','Höhe Stele 900 mm – Wunschmaß noch nicht fachlich bestätigt','Materialstärke Stele 160 mm – Wunschmaß noch nicht fachlich bestätigt','Konkrete Materialversion fehlt.']));
    expect(groups[1].items.map(i=>i.text)).toContain('Tiefe Sockel 250 mm – Wunschmaß noch nicht fachlich bestätigt');
    const inscription=groups[2].items.map(i=>i.text);
    expect(inscription).toContain('Maximale Schriftbreite Inschrift – Maß noch unbekannt');
    expect(inscription).toContain('Gewünschte Zeichenhöhe Inschrift 40 mm – Wunschmaß noch nicht fachlich bestätigt');
    expect(groups[2].items.find(i=>i.text.startsWith('Herstellerbildreferenz'))?.gate).toBe('note');
    // Every message stays distinguishable inside its part.
    for(const group of groups)expect(new Set(group.items.map(i=>i.text)).size).toBe(group.items.length);
    expect(groups.flatMap(g=>g.items)).toHaveLength(15);
  });
  it('lists only known, unconfirmed Wunschmaße for bulk confirmation',()=>{
    const snapshot=memorial(),ids=confirmableMeasureIds(groupStudioIssues(snapshot,validateDesign(snapshot),validateDesign(snapshot,{forRelease:true})));
    expect(ids).toEqual(expect.arrayContaining(['stele:width','stele:height','stele:thickness','base:width','ins:lh','ins:gap']));
    expect(ids).not.toContain('ins:mw');
  });
  it('marks draft errors as blocking the presentation',()=>{
    const groups=groupStudioIssues(null,{blocking:['Genau ein eingefrorener Root-Frame ist erforderlich.'],warnings:[]},{blocking:['Genau ein eingefrorener Root-Frame ist erforderlich.'],warnings:[]});
    expect(groups).toEqual([expect.objectContaining({label:'Gesamter Plan',gate:'presentation'})]);
  });
});
