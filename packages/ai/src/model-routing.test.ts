import {describe,it,expect}from'vitest';import{routeModel,compactContext,estimatedTextCost}from'./model-routing.js';
import {assistantModelProfiles,planningVisualizationContext} from './model-routing.js';
import {planningOperationAllowed} from '@schubert/contracts';
describe('Cost-aware task routing',()=>{
 it('keeps office draft actions alongside evidence rules when a paper sketch is attached',()=>{
  const profile=routeModel({},'standard',{entityType:'orders',sourceKind:'image'});
  expect(profile.instructions).toContain('Auftrags-/Angebotsentwurf');
  expect(profile.instructions).toContain('initial_plan');
  expect(profile.instructions).toContain('Jede Angabe bindet Dokumenthash, Seite und Fundstelle');
  expect(profile.instructions).toContain('OCR-Kandidaten bleiben ungeprüft');
  const plan=routeModel({},'standard',{entityType:'planning',designKind:'memorial',sourceKind:'image'});
  expect(plan.instructions).toContain('Geburt wird konventionell mit * und Tod mit †');
  expect(plan.instructions).toContain('OCR-Kandidaten bleiben ungeprüft');
 });
 it('shows the enforced default cost ceiling and preserves a lower configured limit',()=>{
  expect(assistantModelProfiles({}).standard.maxRequestCost).toBe('0.10');
  const configuration=Object.freeze({maxRequestCost:'0.02',designMaxRequestCost:'0.09',monthlyBudget:'3'}),shown=assistantModelProfiles(configuration);
  expect(shown.standard.maxRequestCost).toBe('0.02');expect(shown.design.maxRequestCost).toBe('0.09');expect(shown.monthlyBudget).toBe('3');
  expect(routeModel(configuration,'standard',{}).maxRequestCost).toBe(shown.standard.maxRequestCost);
 });
 it('uses Luna for ordinary and structured design tasks without automatic escalation',()=>{expect(routeModel({},'standard',{entityType:'planning'}).model).toBe('gpt-6-luna');expect(routeModel({},'standard',{entityType:'customers'}).model).toBe('gpt-6-luna');});
 it('uses Sol only for the explicit design review and keeps independent prices',()=>{const routed=routeModel({},'design_review',{entityType:'planning'});expect(routed.model).toBe('gpt-6.1-sol');expect(routed.inputCostPerMillion).toBe('2');expect(()=>routeModel({},'design_review',{entityType:'customers'})).toThrow();});
 it('loads only the relevant skill and preserves literal inscriptions',()=>{const context=compactContext({snapshot:{kind:'memorial',elements:[{id:'a',kind:'inscription',exactText:'Müller · * 12.03.1947 † 01.01.2025',secret:'omit'}]}});expect(context.snapshot.elements[0].exactText).toContain('Müller');expect(context.snapshot.elements[0].secret).toBeUndefined();expect(routeModel({},'standard',{entityType:'planning',designKind:'room_plan'}).instructions).not.toContain('Grabmal:');});
});

it('uses a conservative affordable pre-call token bound',()=>{const p=routeModel({},'standard',{entityType:'planning'});const estimate=estimatedTextCost(p,{message:'Prüfe den Plan.'});expect(estimate.inputTokenCeiling).toBeGreaterThan(8192);expect(estimate.cost).toBeLessThan(Number(p.maxRequestCost));});
it('preserves canonical finished contours, nodes, thickness and referenced measures',()=>{const c=compactContext({snapshot:{elements:[{id:'stone',kind:'stone_piece',finishedContour:{outer:[],holes:[]},thicknessMeasureId:'thickness'},{id:'node',kind:'node',point:{xMm:'2',yMm:'3',zMm:'0'}}],measurements:{thickness:{valueMm:'30',reviewStatus:'confirmed'},irrelevant:{valueMm:'999'}}}});expect(c.snapshot.measurements.thickness.valueMm).toBe('30');expect(c.snapshot.measurements.irrelevant).toBeUndefined();expect(c.snapshot.elements[0].finishedContour).toBeDefined();expect(c.snapshot.elements[1].point.xMm).toBe('2');});

it('keeps the selected inscription, its distant host and driving dimensions in a large plan',()=>{
 const unrelated=Array.from({length:80},(_,index)=>({id:'other:'+index,kind:'technical_note',text:'Other'}));
 const context=compactContext({selectedElementIds:['text'],snapshot:{elements:[...unrelated,{id:'stone',kind:'stone_piece',thicknessMeasureId:'thickness'},{id:'width',kind:'dimension',measureId:'width-value',refs:[{elementId:'stone'}]},{id:'text',kind:'inscription',surfaceElementId:'stone',exactText:'Müller\n1948 – 2025'}],measurements:{thickness:{valueMm:'160'},'width-value':{valueMm:'800',sourceMeasureIds:['survey']},survey:{valueMm:'800',semantic:'as_built'}}}});
 expect(context.snapshot.elements.slice(0,3).map((element:any)=>element.id)).toEqual(['text','stone','width']);
 expect(context.snapshot.measurements['width-value'].valueMm).toBe('800');expect(context.snapshot.measurements.survey.semantic).toBe('as_built');expect(context.snapshot.omittedElementCount).toBe(43);
});

it('keeps each studio step focused while allowing explicit edits across steps',()=>{
 const review=routeModel({},'standard',{entityType:'planning',designKind:'memorial',workflow:{step:'review',label:'Prüfen'}});
 expect(review.instructions).toContain('Nur prüfen');
 expect(planningOperationAllowed('review','set_design_target')).toBe(true);
 expect(planningOperationAllowed('output','move_element')).toBe(true);
 expect(planningOperationAllowed('geometry','set_inscription_text')).toBe(true);
 expect(planningOperationAllowed('design','set_inscription_text')).toBe(true);
 const edit=routeModel({},'standard',{entityType:'quotes',workflow:{purpose:'Nur den aktuellen Formularentwurf prüfen.'}});
 expect(edit.instructions).toContain('Nur den aktuellen Formularentwurf prüfen.');
});

it('bounds image context at complete JSON elements and preserves Unicode names',()=>{
 const snapshot={elements:Array.from({length:40},(_,index)=>({id:'note:'+index,kind:'technical_note',text:'Müller · Äußere Fläche '.repeat(35)}))};
 const encoded=planningVisualizationContext({snapshot,entityType:'planning'},4000),context=JSON.parse(encoded);
 expect(new TextEncoder().encode(encoded).length).toBeLessThanOrEqual(4000);
 expect(context.snapshot.elements[0].text).toContain('Müller · Äußere Fläche');
 expect(context.snapshot.omittedElementCount).toBeGreaterThan(0);
});

it('keeps display units explicit while every proposed geometry value remains millimetres',()=>{
 const context={entityType:'planning',designKind:'room_plan',workflow:{step:'geometry',label:'Raum & Aufmaß',displayUnit:'m',geometryUnit:'mm'}};
 const routed=routeModel({},'standard',context);
 expect(routed.instructions).toContain('Die Oberfläche zeigt Maße in m.');
 expect(routed.instructions).toContain('Command-Werte bleiben Dezimalstrings in mm');
 expect(routed.instructions).toContain('bei uneindeutigen Maßangaben rückfragen');
 const compact=compactContext({...context,snapshot:{elements:[],measurements:{}}});
 expect(compact.workflow.displayUnit).toBe('m');expect(compact.snapshot.units).toBe('mm');
});
