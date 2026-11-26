import {describe,expect,it} from 'vitest';
import type {DesignOperation,DesignSnapshot,Measure} from '@schubert/contracts';
import {applyOperations,createDesign,rectangleContour,targetMeasure} from '@schubert/geometry';
import {restingPosition,seatOperations,stackCandidates,stackConstraint,stackFollowUps,stackLinks,stoneWorldBox,underneathPosition} from './memorial-stack.ts';

function stone(snapshot:DesignSnapshot,id:string,label:string,w:string,h:string,t:string,position={xMm:'0',yMm:'0',zMm:'0'}):DesignOperation[]{
  const measurements:Record<string,Measure>={[`${id}:thickness`]:targetMeasure(t),[`${id}:width`]:targetMeasure(w),[`${id}:height`]:targetMeasure(h)};
  const base={parentId:snapshot.frames[0].id,phase:'planned' as const,locked:false,sourceEvidenceVersionIds:[]};
  return [
    ...(['width','height'] as const).map(key=>({type:'add_element' as const,element:{...base,id:`${id}:dimension:${key}`,label:`${label} · ${key}`,kind:'dimension' as const,refs:[{elementId:id,feature:key}],measureId:`${id}:${key}`,mode:'driving' as const,offsetMm:'30'},measurements})),
    {type:'add_element',element:{...base,id,label,kind:'stone_piece',purpose:'memorial',transform:{position,rotationDeg:{x:'90',y:'0',z:'0'}},finishedContour:rectangleContour(w,h),thicknessMeasureId:`${id}:thickness`,materialSpecVersionId:'unassigned:material',stockItemId:null,grainDirectionDeg:null,edgeTreatments:[],machiningFeatureIds:[]},measurements}
  ];
}
const close=(a:number,b:number)=>expect(Math.abs(a-b)).toBeLessThan(.02);

describe('Stein mittig auf Sockel',()=>{
  it('puts a new Sockel centred under an existing stele and lifts the stele onto it',()=>{
    let snapshot=applyOperations(createDesign('memorial'),stone(createDesign('memorial'),'stele','Stele','600','900','160'));
    const ops=stone(snapshot,'base','Sockel','700','200','250');
    const placed=underneathPosition(applyOperations(snapshot,ops,{validate:false}),'base','stele')!;
    (ops.at(-1) as any).element.transform.position=placed;
    ops.push(...seatOperations(applyOperations(snapshot,ops,{validate:false}),'stele','base'),stackConstraint('stele','base'));
    snapshot=applyOperations(snapshot,ops);
    const stele=stoneWorldBox(snapshot,'stele')!,base=stoneWorldBox(snapshot,'base')!;
    close(stele.minZ,base.maxZ);close(base.minZ,0);close(base.maxZ,200);
    close((stele.minX+stele.maxX)/2,(base.minX+base.maxX)/2);close((stele.minY+stele.maxY)/2,(base.minY+base.maxY)/2);
    // The stele keeps its horizontal place; only the Sockel is centred under it.
    close(stele.minX,0);close(stele.maxX,600);
    expect(stackLinks(snapshot)).toEqual([{constraintId:expect.stringMatching(/^stack:/),stoneId:'stele',baseId:'base',centred:true}]);
  });

  it('keeps the stele resting on the Sockel when the Sockel height or width changes',()=>{
    let snapshot=applyOperations(createDesign('memorial'),[...stone(createDesign('memorial'),'base','Sockel','700','200','250'),...stone(createDesign('memorial'),'stele','Stele','600','900','160')]);
    const position=restingPosition(snapshot,'stele','base')!;
    snapshot=applyOperations(snapshot,[{type:'set_element_position',elementId:'stele',position},stackConstraint('stele','base')]);
    const change:DesignOperation[]=[{type:'set_design_target',measureId:'base:height',valueMm:'250'},{type:'set_design_target',measureId:'base:width',valueMm:'800'}];
    const followUps=stackFollowUps(applyOperations(snapshot,change,{validate:false}),change);
    expect(followUps).toHaveLength(1);
    const next=applyOperations(snapshot,[...change,...followUps]);
    const stele=stoneWorldBox(next,'stele')!,base=stoneWorldBox(next,'base')!;
    close(base.maxZ,250);close(stele.minZ,250);close((stele.minX+stele.maxX)/2,(base.minX+base.maxX)/2);
    // Without the follow-up move, the domain „steht auf“ relation reports the misaligned stone.
    expect(()=>applyOperations(snapshot,[{type:'set_design_target',measureId:'base:width',valueMm:'800'}])).toThrow(/nicht mittig auf dem Sockel/);
    expect(()=>applyOperations(snapshot,[{type:'set_design_target',measureId:'base:height',valueMm:'250'}])).toThrow(/Der Stein steht nicht auf dem Sockel\. Unterkante 200 mm, Oberkante Sockel 250 mm/);
  });

  it('leaves a stone the user positioned explicitly to the binding check',()=>{
    let snapshot=applyOperations(createDesign('memorial'),[...stone(createDesign('memorial'),'base','Sockel','700','200','250'),...stone(createDesign('memorial'),'stele','Stele','600','900','160')]);
    snapshot=applyOperations(snapshot,[{type:'set_element_position',elementId:'stele',position:restingPosition(snapshot,'stele','base')!},stackConstraint('stele','base')]);
    const lift:DesignOperation[]=[{type:'move_element',elementId:'stele',delta:{xMm:'0',yMm:'0',zMm:'20'}}];
    expect(stackFollowUps(applyOperations(snapshot,lift,{validate:false}),lift)).toEqual([]);
    expect(()=>applyOperations(snapshot,lift)).toThrow(/Auflage „Stele“ auf „Sockel“: Der Stein steht nicht auf dem Sockel/);
  });

  it('still recognises the former vertical centre binding of older revisions',()=>{
    let snapshot=applyOperations(createDesign('memorial'),[...stone(createDesign('memorial'),'base','Sockel','700','200','250'),...stone(createDesign('memorial'),'stele','Stele','600','900','160')]);
    snapshot=applyOperations(snapshot,[{type:'set_element_position',elementId:'stele',position:restingPosition(snapshot,'stele','base')!},{type:'add_constraint',constraint:{id:'stack:legacy',kind:'vertical',refs:[{elementId:'stele',feature:'center'},{elementId:'base',feature:'center'}],measureId:null,ruleVersionId:null}}]);
    expect(stackLinks(snapshot)).toEqual([{constraintId:'stack:legacy',stoneId:'stele',baseId:'base',centred:true}]);
    const change:DesignOperation[]=[{type:'set_design_target',measureId:'base:height',valueMm:'260'}];
    expect(stackFollowUps(applyOperations(snapshot,change,{validate:false}),change)).toHaveLength(1);
  });

  it('offers named Sockel stones as bases and free stones to carry',()=>{
    const snapshot=applyOperations(createDesign('memorial'),[...stone(createDesign('memorial'),'base','Sockel','700','200','250'),...stone(createDesign('memorial'),'stele','Stele','600','900','160')]);
    expect(stackCandidates(snapshot,'stone').map(e=>e.id)).toEqual(['stele']);
    expect(stackCandidates(snapshot,'base','stele').map(e=>e.id)).toEqual(['base']);
  });
});
