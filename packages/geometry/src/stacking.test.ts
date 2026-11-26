import{describe,expect,it}from'vitest';
import type{DesignOperation,DesignSnapshot}from'@schubert/contracts';
import{applyOperations,createDesign,memorialContour,rectangleContour,targetMeasure,validateDesign}from'./index.js';
import{restingPosition,stoneWorldBox}from'./stacking.js';

function stone(id:string,label:string,w:string,h:string,t:string,position={xMm:'0',yMm:'0',zMm:'0'},purpose:'memorial'|'base'='memorial',contour=rectangleContour(w,h)):DesignOperation{
  return{type:'add_element',element:{id,label,parentId:'root',phase:'planned',locked:false,sourceEvidenceVersionIds:[],kind:'stone_piece',purpose,transform:{position,rotationDeg:{x:'90',y:'0',z:'0'}},finishedContour:contour,thicknessMeasureId:id+':t',materialSpecVersionId:'unassigned:material',stockItemId:null,grainDirectionDeg:null,edgeTreatments:[],machiningFeatureIds:[]},measurements:{[id+':t']:targetMeasure(t)}};
}
const restsOn=(centred=true):DesignOperation=>({type:'add_constraint',constraint:{id:'stack:test',kind:'rests_on',refs:[{elementId:'stele',feature:centred?'bottom_center':'bottom'},{elementId:'base',feature:centred?'top_center':'top'}],measureId:null,ruleVersionId:null}});
function stacked(contour?:ReturnType<typeof rectangleContour>):DesignSnapshot{
  let s=applyOperations(createDesign('memorial'),[stone('base','Sockel','700','200','250',undefined,'base'),stone('stele','Stele','600','900','160',undefined,'memorial',contour)]);
  s=applyOperations(s,[{type:'set_element_position',elementId:'stele',position:restingPosition(s,'stele','base')!},restsOn()]);
  return s;
}

describe('Auflage (rests_on)',()=>{
  it('accepts a stele standing centred on its Sockel, also with an arched top',()=>{
    for(const contour of[undefined,memorialContour('round_arch','600','900'),memorialContour('heart','600','900'),memorialContour('oval','600','900')]){
      const s=stacked(contour),stele=stoneWorldBox(s,'stele')!,base=stoneWorldBox(s,'base')!;
      expect(stele.minZ).toBeCloseTo(base.maxZ,2);expect((stele.minX+stele.maxX)/2).toBeCloseTo((base.minX+base.maxX)/2,2);expect((stele.minY+stele.maxY)/2).toBeCloseTo((base.minY+base.maxY)/2,2);
      expect(validateDesign(s).blocking).toEqual([]);
    }
  });
  it('rejects lifting the stele off the Sockel with a clear German message',()=>{
    const s=stacked();
    expect(()=>applyOperations(s,[{type:'move_element',elementId:'stele',delta:{xMm:'0',yMm:'0',zMm:'20'}}])).toThrow(/Auflage „Stele“ auf „Sockel“: Der Stein steht nicht auf dem Sockel\. Unterkante 220 mm, Oberkante Sockel 200 mm/);
    expect(()=>applyOperations(s,[{type:'set_design_target',measureId:'base:t',valueMm:'300'}])).toThrow(/nicht mittig auf dem Sockel/);
  });
  it('allows an off-centre stone only on the plain resting relation and only while it is supported',()=>{
    let s=applyOperations(createDesign('memorial'),[stone('base','Sockel','700','200','250',undefined,'base'),stone('stele','Stele','600','900','160',{xMm:'40',yMm:'0',zMm:'200'})]);
    s=applyOperations(s,[restsOn(false)]);
    expect(validateDesign(s).blocking).toEqual([]);
    expect(()=>applyOperations(s,[{type:'move_element',elementId:'stele',delta:{xMm:'500',yMm:'0',zMm:'0'}}])).toThrow(/außerhalb der Sockeloberseite/);
  });
  it('refuses a malformed relation and keeps old vertical stack bindings loadable',()=>{
    const s=stacked();
    expect(()=>applyOperations(s,[{type:'add_constraint',constraint:{id:'bad',kind:'rests_on',refs:[{elementId:'base',feature:'top'},{elementId:'stele',feature:'top'}],measureId:null,ruleVersionId:null}}])).toThrow(/Unterseite/);
    const legacy=applyOperations(createDesign('memorial'),[stone('base','Sockel','700','200','250'),stone('stele','Stele','600','900','160',{xMm:'50',yMm:'45',zMm:'200'}),{type:'add_constraint',constraint:{id:'stack:old',kind:'vertical',refs:[{elementId:'stele',feature:'center'},{elementId:'base',feature:'center'}],measureId:null,ruleVersionId:null}}]);
    expect(validateDesign(legacy).blocking).toEqual([]);
  });
});
