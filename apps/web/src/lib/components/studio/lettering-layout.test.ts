import {describe,expect,it} from 'vitest';
import type {DesignSnapshot,InscriptionElement} from '@schubert/contracts';
import {applyOperations,createDesign,rectangleContour,targetMeasure} from '@schubert/geometry';
import {inscriptionCenter,inscriptionPlacement,letteringLayout} from './lettering-layout.ts';

function fixture():{snapshot:DesignSnapshot;element:InscriptionElement}{
  let snapshot=createDesign('memorial');
  snapshot=applyOperations(snapshot,[{type:'add_element',element:{id:'stele',label:'Stele',parentId:snapshot.frames[0].id,phase:'planned',locked:false,sourceEvidenceVersionIds:[],kind:'stone_piece',purpose:'memorial',transform:{position:{xMm:'0',yMm:'0',zMm:'0'},rotationDeg:{x:'90',y:'0',z:'0'}},finishedContour:rectangleContour('600','900'),thicknessMeasureId:'t',materialSpecVersionId:'unassigned:material',stockItemId:null,grainDirectionDeg:null,edgeTreatments:[],machiningFeatureIds:[]},measurements:{t:targetMeasure('160')}}]);
  snapshot={...snapshot,measurements:{...snapshot.measurements,h:targetMeasure('40'),g:targetMeasure('12')}};
  const element:InscriptionElement={id:'i',label:'Inschrift',parentId:snapshot.frames[0].id,phase:'planned',locked:false,sourceEvidenceVersionIds:[],kind:'inscription',surfaceElementId:'stele',originUV:{uMm:'0',vMm:'0'},rotationDeg:'0',exactText:'Maria Muster\n* 1950 † 2025',fontVariantVersionId:'unassigned:font',referenceAssetVersionIds:[],renderingBasis:'shop_image_reference',requestedHeightMeasureId:'h',requestedLowercaseHeightMeasureId:null,requestedMaxWidthMeasureId:null,lineGapMeasureId:'g',supplyForm:'engraved',materialSpecVersionId:null,materialArticleReference:null,finishSpecVersionId:null,alignment:'center',glyphPlacements:[]};
  return{snapshot,element};
}

describe('inscription placement presets',()=>{
  it('places the text block at the named height, horizontally centred',()=>{
    const {snapshot,element}=fixture(),layout=letteringLayout(snapshot,element);
    expect(inscriptionPlacement(snapshot,element,'center')).toEqual(inscriptionCenter(snapshot,element));
    const top=inscriptionPlacement(snapshot,element,'top'),third=inscriptionPlacement(snapshot,element,'upper_third');
    expect(top.uMm).toBe('300');expect(third.uMm).toBe('300');
    expect(Number(top.vMm)+layout.top).toBeCloseTo(900-72,1);
    expect(Number(third.vMm)+(layout.top-layout.bottom)/2).toBeCloseTo(600,1);
    expect(Number(top.vMm)).toBeGreaterThan(Number(third.vMm));
  });
});
