import {describe,it,expect,vi} from 'vitest';
import {ASSISTANT_READ_RESULT_BYTES,ASSISTANT_READ_TOOL_VERSION,type AssistantReadToolAccess} from '@schubert/contracts';
import {createDesign,applyOperations} from '@schubert/geometry';
import {availableSkills} from './skills.js';
import {respondWithOptionalSkills,estimatedSkillResponseCost,affordableSkillResponse} from './skill-response.js';
import {parseReadToolCall,requiredAssistantRead} from './specialist-tools.js';
import {planningWorkflowFacts,inspectPlanningSnapshot} from './planning-facts.js';
import {qualityCases,qualityReplayOutput} from './quality-cases.js';
import {bindPlanningDraft} from './planning-draft.js';
import {routeModel,compactContext} from './model-routing.js';
import type {ClaudeMessage,ClaudeRequest} from './claude.js';

const context={entityType:'planning',designKind:'memorial',allowedCommands:['planning.design.change']};
const parameters:ClaudeRequest={model:'claude-opus-5-5',max_tokens:200,system:[{type:'text',text:'authorized instructions'}],messages:[{role:'user',content:[{type:'text',text:'authorized context'}]}]};
let sequence=0;
const call=(name:string,input:unknown)=>({type:'tool_use',id:'toolu_'+name+'_'+(sequence++),name,input});
const response=(content:unknown[]=[]):ClaudeMessage=>({id:'msg_synthetic',type:'message',role:'assistant',model:'claude-opus-5-5',stop_reason:content.some((block:any)=>block.type==='tool_use')?'tool_use':'end_turn',content:content.length?content:[{type:'text',text:'{}'}],usage:{input_tokens:10,output_tokens:5,cache_creation_input_tokens:0,cache_read_input_tokens:0}}) as unknown as ClaudeMessage;
function access(execute=vi.fn().mockResolvedValue({items:[{id:'actual-reference',technicalApproval:false}]})):AssistantReadToolAccess{
  return{version:ASSISTANT_READ_TOOL_VERSION,available:['lookup_planning_catalog','inspect_current_plan'],execute};
}
const lookup=()=>call('lookup_planning_catalog',{kind:'materials',query:'Granit'});

describe('Bounded specialist reads',()=>{
  it('routes explicit factual requests within the granted tools while leaving help and mixed requests open',()=>{
    const names=access().available;
    expect(requiredAssistantRead('Bitte suche Material Impala in der Steinbibliothek.',names)).toBe('lookup_planning_catalog');
    expect(requiredAssistantRead('Prüfe den aktuellen Plan und nenne das berechnete Volumen.',names)).toBe('inspect_current_plan');
    expect(requiredAssistantRead('Wie suche ich in der Materialbibliothek?',names)).toBeUndefined();
    expect(requiredAssistantRead('Bitte nicht suchen, erkläre nur die Materialwahl.',names)).toBeUndefined();
    expect(requiredAssistantRead('Suche Material und berechne das Volumen des Plans.',names)).toBeUndefined();
    expect(requiredAssistantRead('Suche Material Impala.',[])).toBeUndefined();
  });
  it('requires an explicitly requested factual tool instead of letting optional guidance replace the read',async()=>{
    const create=vi.fn().mockResolvedValueOnce(response([lookup()])).mockResolvedValueOnce(response());
    const result=await respondWithOptionalSkills({parameters,skills:availableSkills(context),readTools:access(),requiredRead:'lookup_planning_catalog',create});
    // Current Claude models reject forced tool choice: the required read is the only offered tool and is named in the system tail.
    expect(create.mock.calls[0][0].tool_choice).toEqual({type:'auto',disable_parallel_tool_use:true});
    expect(create.mock.calls[0][0].tools.map((tool:any)=>tool.name)).toEqual(['lookup_planning_catalog']);
    expect(JSON.stringify(create.mock.calls[0][0].system)).toContain('Rufe lookup_planning_catalog im ersten Schritt auf');
    expect(result.toolsUsed).toHaveLength(1);
    const missing=vi.fn().mockResolvedValue(response());
    await expect(respondWithOptionalSkills({parameters,skills:[],readTools:access(),requiredRead:'lookup_planning_catalog',create:missing})).rejects.toMatchObject({code:'AI_TOOL_SCOPE'});
    expect(missing).toHaveBeenCalledTimes(1);
  });
  it('answers simple help in one provider call without any database tool',async()=>{
    const readTools=access(),create=vi.fn().mockResolvedValue(response());
    const result=await respondWithOptionalSkills({parameters,skills:availableSkills(context),readTools,create});
    expect(create).toHaveBeenCalledTimes(1);expect(readTools.execute).not.toHaveBeenCalled();expect(result.toolsUsed).toEqual([]);
  });
  it('loads domain instructions and actual catalog facts together, then finishes without replaying model output',async()=>{
    const create=vi.fn().mockResolvedValueOnce(response([lookup(),call('load_schubert_skills',{skill_ids:['schubert-memorial-de']})])).mockResolvedValueOnce(response());
    const result=await respondWithOptionalSkills({parameters,skills:availableSkills(context),readTools:access(),create});
    expect(create).toHaveBeenCalledTimes(2);expect(result.skillsUsed).toHaveLength(1);expect(result.toolsUsed[0]).toMatchObject({name:'lookup_planning_catalog',cached:false,resultItems:1});
    const first=create.mock.calls[0][0],final=create.mock.calls[1][0];
    // The final call repeats the identical cached prefix and only appends the tool step.
    expect(final.tools).toEqual(first.tools);expect(final.system).toEqual(first.system);expect(final.tool_choice).toEqual({type:'none'});
    expect(final.messages[0]).toEqual(parameters.messages[0]);expect(final.messages[1].role).toBe('assistant');
    const results=final.messages[2].content;expect(results).toHaveLength(2);expect(results.every((block:any)=>block.type==='tool_result')).toBe(true);
    expect(JSON.parse(results[0].content).result.items[0].id).toBe('actual-reference');
    expect(final.messages[3]).toMatchObject({role:'system'});expect(final.messages[3].content).toContain('Fachhilfen');
  });
  it('deduplicates identical reads inside one response and records the saved round trip',async()=>{
    const readTools=access(),onReadToolRequest=vi.fn(),create=vi.fn().mockResolvedValueOnce(response([lookup(),lookup()])).mockResolvedValueOnce(response());
    const result=await respondWithOptionalSkills({parameters,skills:[],readTools,create,onReadToolRequest});
    expect(readTools.execute).toHaveBeenCalledTimes(1);expect(onReadToolRequest).toHaveBeenCalledTimes(1);expect(result.toolsUsed.map(t=>t.cached)).toEqual([false,true]);expect(result.toolEvidence).toHaveLength(1);
  });
  it.each([
    ['delete_invoice',{}],['inspect_current_plan',{tenantId:'another-tenant'}],['lookup_planning_catalog',{kind:'materials',query:'Granit',url:'https://outside.invalid'}],['lookup_planning_catalog',{kind:'materials',query:'x'}],
  ])('rejects unauthorized tools or widened arguments before executing %s',async(name,args)=>{
    const readTools=access(),create=vi.fn().mockResolvedValue(response([call(name,args)]));
    await expect(respondWithOptionalSkills({parameters,skills:[],readTools,create})).rejects.toMatchObject({code:'AI_TOOL_SCOPE'});expect(readTools.execute).not.toHaveBeenCalled();expect(create).toHaveBeenCalledTimes(1);
  });
  it('rejects a third read and a new tool loop without starting a third provider request',async()=>{
    const readTools=access(),create=vi.fn().mockResolvedValue(response([lookup(),lookup(),lookup()]));
    await expect(respondWithOptionalSkills({parameters,skills:[],readTools,create})).rejects.toMatchObject({code:'AI_TOOL_SCOPE'});expect(readTools.execute).not.toHaveBeenCalled();
    const loop=vi.fn().mockResolvedValueOnce(response([lookup()])).mockResolvedValueOnce(response([lookup()]));
    await expect(respondWithOptionalSkills({parameters,skills:[],readTools,create:loop})).rejects.toMatchObject({code:'AI_SKILL_SCOPE'});expect(loop).toHaveBeenCalledTimes(2);
  });
  it('limits evidence by UTF-8 bytes and never sends an oversized result to the next model call',async()=>{
    const readTools=access(vi.fn().mockResolvedValue({items:['ü'.repeat(ASSISTANT_READ_RESULT_BYTES)]})),create=vi.fn().mockResolvedValue(response([lookup()]));
    await expect(respondWithOptionalSkills({parameters,skills:[],readTools,create})).rejects.toMatchObject({code:'AI_TOOL_OUTPUT'});expect(create).toHaveBeenCalledTimes(1);
  });
  it('reports an attempted failed read and preserves the first paid response for settlement',async()=>{
    const onResponse=vi.fn(),onReadToolRequest=vi.fn(),create=vi.fn().mockResolvedValue(response([lookup()]));
    await expect(respondWithOptionalSkills({parameters,skills:[],readTools:access(vi.fn().mockRejectedValue(new Error('unavailable'))),create,onResponse,onReadToolRequest})).rejects.toThrow('unavailable');
    expect(create).toHaveBeenCalledTimes(1);expect(onResponse).toHaveBeenCalledTimes(1);expect(onReadToolRequest).toHaveBeenCalledTimes(1);
  });
  it('keeps authoritative reads and removes optional guidance first when its budget is tight',()=>{
    const profile=routeModel({},'standard',context),readTools=access(),skills=availableSkills(context);
    const withoutSkills=estimatedSkillResponseCost(profile,{},0,[],{},readTools);
    const full=estimatedSkillResponseCost(profile,{},0,skills,{},readTools);
    expect(full.cost).toBeGreaterThan(withoutSkills.cost);
    const estimate=affordableSkillResponse({...profile,maxRequestCost:String(withoutSkills.cost)},{},0,skills,{},readTools);
    expect(estimate.skills).toEqual([]);expect(estimate.readTools).toBe(readTools);expect(estimate.cost).toBe(withoutSkills.cost);
  });
  it('fits a deep review into its budget while keeping the authorized tools',()=>{
    const profile=routeModel({},'design_review',context),readTools=access();
    const full=estimatedSkillResponseCost(profile,{},0,[],{},readTools);
    const required=estimatedSkillResponseCost(profile,{},0,[],{},readTools,'inspect_current_plan');
    expect(required.cost).toBeLessThan(full.cost);

    const maxRequestCost=(full.cost-0.01).toFixed(6);
    const fitted=affordableSkillResponse({...profile,maxRequestCost},{},0,[],{},readTools);
    expect(fitted.cost).toBeLessThanOrEqual(Number(maxRequestCost));
    expect(fitted.readTools).toBe(readTools);
    expect(fitted.maxOutputTokens).toBeLessThan(profile.maxOutputTokens);
    expect(fitted.maxOutputTokens).toBeGreaterThanOrEqual(6000);
  });
  it('rejects an unaffordable factual response before a provider call instead of silently disabling data access',()=>{
    const profile=routeModel({},'standard',{}),direct=estimatedSkillResponseCost(profile,{},0,[],{}),withReads=estimatedSkillResponseCost(profile,{},0,[],{},access());
    expect(withReads.cost).toBeGreaterThan(direct.cost);
    expect(()=>affordableSkillResponse({...profile,maxRequestCost:String(direct.cost+0.00001)},{},0,[],{},access())).toThrow(/Kostenreservierung/);
    const estimate=affordableSkillResponse({...profile,maxRequestCost:String(direct.cost+0.00001)},{},0,[],{});
    expect(estimate.cost).toBe(direct.cost);
    expect(()=>parseReadToolCall('lookup_planning_catalog','{'.repeat(1001),access().available)).toThrow();
    expect(()=>parseReadToolCall('lookup_planning_catalog',{kind:'materials',query:'x'.repeat(1001)},access().available)).toThrow();
  });
  it('stops remaining database reads after cancellation and retains completed-call billing evidence',async()=>{
    const controller=new AbortController(),onResponse=vi.fn(),onReadToolsUsed=vi.fn();
    const readTools=access(vi.fn().mockImplementation(async()=>{controller.abort();return{items:[{id:'actual-reference'}]};}));
    const create=vi.fn().mockResolvedValue(response([lookup(),call('inspect_current_plan',{})]));
    await expect(respondWithOptionalSkills({parameters,skills:[],readTools,create,signal:controller.signal,onResponse,onReadToolsUsed})).rejects.toMatchObject({name:'AbortError'});
    expect(readTools.execute).toHaveBeenCalledTimes(1);expect(create).toHaveBeenCalledTimes(1);expect(onResponse).toHaveBeenCalledTimes(1);
    expect(onReadToolsUsed).toHaveBeenLastCalledWith([expect.objectContaining({name:'lookup_planning_catalog',resultItems:1})]);
  });
});

describe('Planning facts and stage guidance',()=>{
  it('distinguishes a concept from manufacturing evidence, without extra model or database work',()=>{
    const snapshot=createDesign('memorial'),facts=planningWorkflowFacts({...context,snapshot});
    expect(facts?.state).toBe('empty');expect(facts?.purpose).toContain('verhindern keine');
    const test=qualityCases().find(t=>t.id==='memorial-literal')!,draft=qualityReplayOutput(test),bound=bindPlanningDraft(test.context,draft.planningDraft);
    const payload=JSON.parse(bound.commands[0].inputJson),planned=applyOperations(test.context.snapshot,payload.operations);
    expect(planningWorkflowFacts({...context,snapshot:planned})?.state).toBe('editable_concept');
    const inspected=inspectPlanningSnapshot(planned);expect(inspected.release.grantsManufacturingApproval).toBe(false);expect(inspected.lines.length).toBeGreaterThan(0);expect(inspected.unresolvedMeasurements.length).toBeGreaterThan(0);
    const inscription=planned.elements.find(e=>e.kind==='inscription')!;
    const compact=compactContext({...context,snapshot:planned,selectedElementIds:[inscription.id]},1);
    expect(compact.snapshot.elements[0].kind).toBe('inscription');expect(compact.snapshot.omittedElementCount).toBeGreaterThan(0);
    expect(routeModel({},'standard',compact).instructions).toContain('"hasBase":true');
  });
});
