import {describe,it,expect}from'vitest';import{routeModel,compactContext,estimatedTextCost}from'./model-routing.js';
import {assistantModelProfiles,planningVisualizationContext,isQuickQuestion} from './model-routing.js';
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
  expect(assistantModelProfiles({}).standard.maxRequestCost).toBe('1.00');
  expect(assistantModelProfiles({}).provider).toBe('anthropic');
  const configuration=Object.freeze({maxRequestCost:'0.02',designMaxRequestCost:'0.09',monthlyBudget:'3'}),shown=assistantModelProfiles(configuration);
  expect(shown.standard.maxRequestCost).toBe('0.02');expect(shown.design.maxRequestCost).toBe('0.09');expect(shown.monthlyBudget).toBe('3');
  expect(routeModel(configuration,'standard',{}).maxRequestCost).toBe(shown.standard.maxRequestCost);
 });
 it('routes each task to the most economical suitable model',()=>{
  // How-to questions: Haiku. Office work and every document or photo: Sonnet. Studios and deep review: Opus.
  expect(routeModel({},'standard',{entityType:'customers'},{message:'Wie lege ich einen neuen Kunden an?'})).toMatchObject({tier:'quick',model:'claude-haiku-5-5',effort:'low',maxOutputTokens:4000,inputCostPerMillion:'0.1'});
  expect(routeModel({},'standard',{entityType:'customers'},{message:'Wie lege ich einen Kunden an?',imageCount:1})).toMatchObject({tier:'office',model:'claude-sonnet-5-5',effort:'medium'});
  expect(routeModel({},'standard',{entityType:'quotes'},{message:'Erstelle ein Angebot für Familie Lenz.'})).toMatchObject({tier:'office',model:'claude-sonnet-5-5',effort:'low',maxOutputTokens:8000,inputCostPerMillion:'2',cachedInputCostPerMillion:'0.1'});
  expect(routeModel({},'standard',{entityType:'documents',sources:[{documentId:'a'}]},{message:'Was bedeutet diese Position?'})).toMatchObject({tier:'office',effort:'medium'});
  expect(routeModel({},'standard',{entityType:'planning'},{message:'Wie lege ich eine Inschrift an?'})).toMatchObject({tier:'planning',model:'claude-opus-5-5',effort:'medium',maxOutputTokens:12000});
  expect(routeModel({},'standard',{entityType:'probe'})).toMatchObject({tier:'quick',model:'claude-haiku-5-5'});
  expect(routeModel({officeModel:'claude-unpriced'},'standard',{entityType:'quotes'},{message:'Erstelle ein Angebot'}).model).toBe('claude-opus-5-5');
  expect(routeModel({officeModel:'claude-opus-5-5',quickModel:'claude-sonnet-5-5'},'standard',{entityType:'customers'},{message:'Wo finde ich offene Rechnungen?'}).model).toBe('claude-sonnet-5-5');
 });
 it('recognises how-to questions but not requests phrased as questions',()=>{
  for(const message of ['Wie lege ich einen neuen Kunden an?','Wie kann ich eine Rechnung anlegen?','Wo finde ich offene Rechnungen?','Was bedeutet Abnahme?'])expect(isQuickQuestion(message),message).toBe(true);
  for(const message of ['Erstelle eine Rechnung für Auftrag 12','Lege den Kunden Müller an','Wie wäre es, wenn du ein Angebot entwirfst?','Fasse die Unterlage zusammen','Wie viel?\nBitte Rechnung erstellen',''])expect(isQuickQuestion(message),message).toBe(false);
 });
 it('uses high effort for explicit plan reviews with the published Claude token rates',()=>{
  const routed=routeModel({},'design_review',{entityType:'planning'});
  expect(routed).toMatchObject({model:'claude-opus-5-5',effort:'high',inputCostPerMillion:'4',outputCostPerMillion:'20',cachedInputCostPerMillion:'0.2',cacheWriteCostPerMillion:'5',review:true,maxOutputTokens:16000});
  expect(()=>routeModel({},'design_review',{entityType:'customers'})).toThrow();
 });
 it('honors saved models, prices and effort without inventing rates for unknown models',()=>{
  const config=Object.freeze({textModel:'claude-sonnet-5-5',designModel:'claude-opus-5-5',designInputCostPerMillion:'4.40',designMaxRequestCost:'0.80',monthlyBudget:'30',effort:'medium',planningEffort:'high',designEffort:'xhigh'});
  const profiles=assistantModelProfiles(config);
  expect(profiles.planning).toMatchObject({model:'claude-sonnet-5-5',effort:'high',inputCostPerMillion:'2',outputCostPerMillion:'10'});
  expect(profiles.office).toMatchObject({model:'claude-sonnet-5-5',effort:'medium'});expect(profiles.quick.model).toBe('claude-haiku-5-5');
  expect(profiles.design).toMatchObject({model:'claude-opus-5-5',effort:'xhigh',inputCostPerMillion:'4.40',maxRequestCost:'0.80'});
  // A saved own input rate derives its cache rates from that rate rather than from the published table.
  expect(routeModel(config,'design_review',{entityType:'planning'})).toMatchObject({cachedInputCostPerMillion:'0.44',cacheWriteCostPerMillion:'5.5'});
  expect(profiles.monthlyBudget).toBe('30');
  expect(routeModel({effort:'turbo'},'standard',{}).effort).toBe('low');
  expect(routeModel({textModel:'claude-custom'},'standard',{entityType:'planning'}).inputCostPerMillion).toBeUndefined();
  expect(()=>estimatedTextCost(routeModel({textModel:'claude-custom'},'standard',{entityType:'planning'}),{})).toThrow(/Preise/);
 });
 it('separates cacheable instructions from per-request workflow facts',()=>{
  const routed=routeModel({},'standard',{entityType:'planning',designKind:'memorial',workflow:{step:'review',label:'Prüfen'}});
  expect(routed.stableInstructions).toContain('Grabmal:');expect(routed.stableInstructions).not.toContain('Aktueller Arbeitsschritt');
  expect(routed.volatileInstructions).toContain('Aktueller Arbeitsschritt');
  expect(routeModel({},'standard',{entityType:'planning',designKind:'memorial',workflow:{step:'design',label:'Gestalten'}}).stableInstructions).toBe(routed.stableInstructions);
 });
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
