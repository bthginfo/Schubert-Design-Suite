import { describe, expect, it } from 'vitest';
import { designSnapshotSchema, type DesignElement, type DesignSnapshot } from '@schubert/contracts';
import { createDesign, applyOperations, targetMeasure, mm, toRenderer, fromRenderer, transformPoint, worldPoint, rectangleContour,
  contourAreaMm2, contourPerimeterMm, validateContour, validateDesign, calculateBOM, scaledDrawingSize, renderTechnicalSvg,surfaceMatrix,applyMatrix,surfaceEdgeLengthMm } from './index.js';

const base={parentId:'root',phase:'planned' as const,locked:false,sourceEvidenceVersionIds:[]};
function stone():DesignSnapshot{
  const plan=createDesign('memorial');plan.measurements.t=targetMeasure('30');
  plan.elements.push({...base,id:'stone',label:'Stein',kind:'stone_piece',transform:{position:{xMm:'0',yMm:'0',zMm:'0'},rotationDeg:{x:'0',y:'0',z:'0'}},purpose:'memorial',finishedContour:rectangleContour('2000','3000'),thicknessMeasureId:'t',materialSpecVersionId:'material-v1',stockItemId:null,grainDirectionDeg:null,edgeTreatments:[],machiningFeatureIds:[]});return plan;
}
function room():DesignSnapshot{
  const plan=createDesign('room_plan');for(const [id,value]of Object.entries({height:'2500',core:'200',level:'0'}))plan.measurements[id]=targetMeasure(value);
  for(const [i,p]of [[0,0],[2000,0],[2000,3000],[0,3000]].entries())plan.elements.push({...base,id:`n${i}`,label:`Knoten ${i}`,kind:'node',point:{xMm:String(p[0]),yMm:String(p[1]),zMm:'0'}});
  for(let i=0;i<4;i++)plan.elements.push({...base,id:`w${i}`,label:`Wand ${i}`,kind:'wall',startNodeId:`n${i}`,endNodeId:`n${(i+1)%4}`,heightMeasureId:'height',coreThicknessMeasureId:'core',layers:[]});
  plan.elements.push({...base,id:'room',label:'Raum',kind:'room',roomId:'room-record',floorId:'floor-record',boundary:Array.from({length:4},(_,i)=>({wallId:`w${i}`,side:'left' as const})),floorLayers:[],finishedFloorLevelMeasureId:'level'});return plan;
}
describe('canonical geometry contract',()=>{
  it('quantizes half-up at 0.01 mm, rejects unsafe bounds and accepts no measurement floats',()=>{
    expect(mm('12.345')).toBe('12.35');expect(mm('-12.345')).toBe('-12.35');expect(mm('1000')).toBe('1000');expect(()=>mm('1000000001')).toThrow();
    const s=stone() as unknown as Record<string,unknown>;expect(designSnapshotSchema.safeParse({...s,unit:'m'}).success).toBe(false);
  });
  it('uses the documented renderer axes once and round-trips',()=>{expect(toRenderer({xMm:'1000',yMm:'2000',zMm:'500'})).toEqual([1,.5,-2]);expect(fromRenderer([1,.5,-2])).toEqual({xMm:'1000',yMm:'2000',zMm:'500'});});
  it('uses Rz Ry Rx on column vectors and freezes frame chaining',()=>{
    expect(transformPoint({xMm:'100',yMm:'0',zMm:'0'},{position:{xMm:'10',yMm:'20',zMm:'30'},rotationDeg:{x:'0',y:'0',z:'90'}})).toEqual({xMm:'10',yMm:'120',zMm:'30'});
    const s=room();s.frames[0].transform.position.xMm='1000';expect(worldPoint(s,'n1').xMm).toBe('3000');
  });
  it('calculates the 2000 × 3000 reference as 6 m² and 100 × 150 mm at 1:20',()=>{
    expect(contourAreaMm2(rectangleContour('2000','3000'))).toBe('6000000');expect(calculateBOM(stone()).totals.stoneNetAreaM2).toBe('6');
    expect(scaledDrawingSize('2000','3000',20)).toEqual({widthMm:'100',heightMm:'150'});expect(contourPerimeterMm(rectangleContour('2000','3000'))).toBe('10000');
  });
  it('subtracts closed holes without changing the stored outer contour',()=>{const c=rectangleContour('2000','3000');c.holes.push(rectangleContour('500','500').outer.map(e=>({...e,from:{xMm:mm(Number(e.from.xMm)+100),yMm:mm(Number(e.from.yMm)+100)},to:{xMm:mm(Number(e.to.xMm)+100),yMm:mm(Number(e.to.yMm)+100)}})));expect(validateContour(c)).toEqual([]);expect(contourAreaMm2(c)).toBe('5750000');});
  it('validates true circular arc radii and uses analytical arc area/perimeter',()=>{
    const c={outer:[{kind:'circular_arc' as const,from:{xMm:'100',yMm:'0'},to:{xMm:'100',yMm:'0'},center:{xMm:'0',yMm:'0'},clockwise:false}],holes:[]};
    expect(validateContour(c)).toEqual([]);expect(Number(contourAreaMm2(c))).toBeCloseTo(Math.PI*10000,5);expect(Number(contourPerimeterMm(c))).toBeCloseTo(Math.PI*200,6);
  });
  it('rejects open, self-crossing and exterior hole contours',()=>{
    const c=rectangleContour('2000','3000');c.outer[0].to.xMm='1999';expect(validateContour(c).join()).toContain('offen');
    const d=rectangleContour('2000','3000');d.outer[0].to={xMm:'2000',yMm:'3000'};d.outer[1].from=d.outer[0].to;d.outer[1].to={xMm:'2000',yMm:'0'};d.outer[2].from=d.outer[1].to;expect(validateContour(d).join()).toContain('Selbstschnitt');
    const e=rectangleContour('2000','3000');e.holes=[rectangleContour('4000','4000').outer];expect(validateContour(e).join()).toContain('Ausschnitt');
  });
  it('rejects unknown measure IDs and concurrent embedded sizes',()=>{
    const s=stone();delete s.measurements.t;expect(validateDesign(s).blocking.join()).toContain('fehlt');
    const e=stone();(e.elements[0] as unknown as Record<string,unknown>).thicknessMm='40';expect(designSnapshotSchema.safeParse(e).success).toBe(false);
  });
  it('keeps unknown distinct from zero and never confirms a missing value',()=>{
    const s=stone();s.measurements.t.valueMm=null;expect(validateDesign(s).blocking).toEqual([]);expect(validateDesign(s,{forRelease:true}).blocking.join()).toContain('unbekannt');
    s.measurements.t.reviewStatus='confirmed';expect(validateDesign(s).blocking.join()).toContain('Unbekanntes');
  });
  it('requires real survey evidence and does not allow AI attestation',()=>{
    const s=stone();s.measurements.t={...targetMeasure('30'),semantic:'as_built',reviewStatus:'confirmed',origin:'ai',confirmedBy:'tech',confirmedAt:'2026-10-17T12:00:00Z'};expect(validateDesign(s).blocking.join()).toContain('Messevidenz');
    expect(()=>applyOperations(stone(),[{type:'confirm_survey_measurement',measureId:'t',confirmedBy:'tech',confirmedAt:'2026-10-17T12:00:00Z'}])).toThrow('Aufmaß');
  });
  it('detects source cycles and inherited unresolved derived measures',()=>{
    const s=stone();s.measurements.a={...targetMeasure('10'),semantic:'derived',sourceMeasureIds:['b'],derivedByKernelVersion:s.geometryEngineVersion};s.measurements.b={...s.measurements.a,sourceMeasureIds:['a']};expect(validateDesign(s).blocking.join()).toContain('Zyklische');
    delete s.measurements.b;s.measurements.a.sourceMeasureIds=['t'];s.measurements.a.reviewStatus='confirmed';s.measurements.a.confirmedBy='tech';s.measurements.a.confirmedAt='2026-10-17T12:00:00Z';expect(validateDesign(s).blocking.join()).toContain('ungeklärte Quellen');
  });
  it('keeps snapshots immutable and creates semantic movement changes',()=>{
    const s=stone(),next=applyOperations(s,[{type:'move_element',elementId:'stone',delta:{xMm:'15',yMm:'20',zMm:'0'}}]);expect((s.elements[0]as Extract<DesignElement,{kind:'stone_piece'}>).transform.position.xMm).toBe('0');expect((next.elements[0]as Extract<DesignElement,{kind:'stone_piece'}>).transform.position.xMm).toBe('15');
  });
  it('updates a driving dimension and independent duplicate design targets',()=>{
    const s=stone();s.measurements.width=targetMeasure('2000');s.elements.push({...base,id:'dim',label:'Breite',kind:'dimension',refs:[{elementId:'stone',feature:'width'}],measureId:'width',mode:'driving',offsetMm:'0'});
    const next=applyOperations(s,[{type:'set_design_target',measureId:'width',valueMm:'1000'}]);expect(calculateBOM(next).totals.stoneNetAreaM2).toBe('3');
    const copy=applyOperations(next,[{type:'duplicate_element',elementId:'stone',newId:'copy',offset:{xMm:'0',yMm:'0',zMm:'0'}}]);expect((copy.elements.find(e=>e.id==='copy')as Extract<DesignElement,{kind:'stone_piece'}>).thicknessMeasureId).not.toBe('t');
  });
  it('validates shared room walls and opening bounds',()=>{
    const s=room();expect(validateDesign(s).blocking).toEqual([]);expect(calculateBOM(s).lines.find(l=>l.category==='Raumfläche')?.quantity).toBe('6');
    const opening={...base,id:'door',label:'Tür',kind:'opening' as const,wallId:'w0',openingType:'door' as const,offsetAlongWallMeasureId:'offset',widthMeasureId:'width',heightMeasureId:'openingH',sillHeightMeasureId:'sill',hingeSide:'left' as const,openingDirection:'inward' as const};
    expect(()=>applyOperations(s,[{type:'add_opening',element:opening,measurements:{offset:targetMeasure('1800'),width:targetMeasure('900'),openingH:targetMeasure('2100'),sill:targetMeasure('0')}}])).toThrow('Wandende');
  });
  it('duplicates wall nodes independently and keeps group locks inherited',()=>{
    const s=room();const copy=applyOperations(s,[{type:'duplicate_element',elementId:'w0',newId:'copy-wall',offset:{xMm:'100',yMm:'0',zMm:'0'}}]);
    expect(worldPoint(copy,'n0').xMm).toBe('0');const wall=copy.elements.find(e=>e.id==='copy-wall');expect(wall?.kind).toBe('wall');if(wall?.kind==='wall')expect(worldPoint(copy,wall.startNodeId).xMm).toBe('100');
    const locked=stone();locked.elements.push({...base,id:'group',label:'Gruppe',kind:'group',locked:true,transform:{position:{xMm:'0',yMm:'0',zMm:'0'},rotationDeg:{x:'0',y:'0',z:'0'}}});locked.elements[0].parentId='group';expect(()=>applyOperations(locked,[{type:'move_element',elementId:'stone',delta:{xMm:'10',yMm:'0',zMm:'0'}}])).toThrow('gesperrten Gruppe');
  });
  it('splits a wall without duplicating shared room boundaries',()=>{
    const s=applyOperations(room(),[{type:'split_wall',elementId:'w0',newNodeId:'split',newWallId:'split-wall',distanceMm:'1000'}]);expect(s.elements.filter(e=>e.kind==='wall')).toHaveLength(5);expect(validateDesign(s).blocking).toEqual([]);expect(calculateBOM(s).lines.find(l=>l.category==='Raumfläche')?.quantity).toBe('6');
  });
  it('rejects parent cycles and dangling removals',()=>{
    const s=stone();s.elements[0].parentId='stone';expect(validateDesign(s).blocking.join()).toContain('Zyklischer');
    expect(()=>applyOperations(room(),[{type:'remove_element',elementId:'w0'}])).toThrow('verweist');
  });
  it('preserves locked existing inscription literal text',()=>{
    const s=stone();s.measurements.h=targetMeasure('35');s.measurements.gap=targetMeasure('10');
    s.elements.push({...base,id:'text',label:'Bestand',kind:'inscription',locked:true,phase:'existing',surfaceElementId:'stone',originUV:{uMm:'50',vMm:'100'},rotationDeg:'0',exactText:'MÜLLER · Groß / ẞ',fontVariantVersionId:'font-v1',referenceAssetVersionIds:[],renderingBasis:'shop_image_reference',requestedHeightMeasureId:'h',requestedLowercaseHeightMeasureId:null,requestedMaxWidthMeasureId:null,lineGapMeasureId:'gap',supplyForm:'wording',materialSpecVersionId:null,materialArticleReference:'71740',finishSpecVersionId:null,alignment:'center',glyphPlacements:[]});
    expect(()=>applyOperations(s,[{type:'set_inscription_text',elementId:'text',exactText:'MULLER'}])).toThrow('gesperrt');expect(()=>applyOperations(s,[{type:'set_element_lock',elementId:'text',locked:false}])).toThrow('geschützt');
    const bom=calculateBOM(s);expect(bom.lines.find(l=>l.category==='Inschrift')?.inscription?.exactText).toBe('MÜLLER · Groß / ẞ');expect(validateDesign(s).warnings.join()).toContain('keine belegte Einzelzeichenbreite');
  });
  it('escapes SVG content and preserves fixed model mm scale',()=>{
    const s=stone();s.elements[0].label='<script>alert(1)</script>';const svg=renderTechnicalSvg(s,'top',20);expect(svg).toContain('width="100mm"');expect(svg).toContain('height="150mm"');expect(svg).not.toContain('<script>');expect(svg).toContain('&lt;script&gt;');
  });
  it('keeps signed slopes, their endpoints, actual areas and normal thickness consistent',()=>{
    const s=stone();s.measurements.rise=targetMeasure('-2000');s.measurements.run=targetMeasure('2000');s.elements.push({...base,id:'fall',label:'Gefälle',kind:'slope',hostElementId:'stone',start:{xMm:'0',yMm:'0',zMm:'0'},end:{xMm:'2000',yMm:'0',zMm:'-2000'},riseMeasureId:'rise',runMeasureId:'run',ruleVersionId:null});
    expect(validateDesign(s).blocking).toEqual([]);expect(Number(calculateBOM(s).totals.stoneNetAreaM2)).toBeCloseTo(6*Math.SQRT2,7);
    expect(applyMatrix({xMm:'2000',yMm:'0',zMm:'0'},surfaceMatrix(s,'stone')).zMm).toBe('-2000');
    const matrix=surfaceMatrix(s,'stone');expect(Math.hypot(matrix[2],matrix[6],matrix[10])).toBeCloseTo(1,10);
    const next=applyOperations(s,[{type:'set_design_target',measureId:'rise',valueMm:'-1000'}]);expect(next.elements.find(e=>e.kind==='slope')?.kind).toBe('slope');expect(applyMatrix({xMm:'2000',yMm:'0',zMm:'0'},surfaceMatrix(next,'stone')).zMm).toBe('-1000');
    expect(Number(surfaceEdgeLengthMm(s,'stone',s.elements[0].kind==='stone_piece'?s.elements[0].finishedContour.outer[0]:neverEdge()))).toBeCloseTo(2000*Math.SQRT2,5);
  });
  it('does not overwrite a previous as-built measurement identifier',()=>{
    const s=stone();s.measurements.survey={...targetMeasure('35'),semantic:'as_built'};expect(()=>applyOperations(s,[{type:'record_survey_measurement',measureId:'survey',valueMm:'36',evidenceVersionId:'source',measurementMethod:'Kontrolle',measuredBy:'person',measuredAt:'2026-10-17T08:00:00Z',tolerancePlusMm:'1',toleranceMinusMm:'1'}])).toThrow('neue Maß-ID');
  });
});
function neverEdge():never{throw new Error('fixture');}
