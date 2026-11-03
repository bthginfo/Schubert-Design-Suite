import {config} from 'dotenv';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import OpenAI from 'openai';
import {dec} from '@schubert/domain';
import {qualityCases,qualityReplayOutput,qualitySuiteVersion} from '../packages/ai/src/quality-cases.js';
import {evaluateAssistantQuality} from '../packages/ai/src/quality.js';
import {assistantResponseFormat} from '../packages/ai/src/response-format.js';
import {routeModel} from '../packages/ai/src/model-routing.js';
import {planningDraftInstructions} from '../packages/ai/src/planning-draft.js';
import {planningEditInstructions} from '../packages/ai/src/planning-edits.js';
import {availableSkills} from '../packages/ai/src/skills.js';
import {respondWithOptionalSkills,affordableSkillResponse} from '../packages/ai/src/skill-response.js';
import {normalizeUsage,aggregateTextResponses,usageCost} from '../packages/ai/src/usage.js';
import {evaluationBudget} from './ai-quality-budget.js';
import {qualityToolCases,qualityReadTools,qualityToolReplay} from '../packages/ai/src/quality-tools.js';
import {specialistToolInstructions,readToolLabels} from '../packages/ai/src/specialist-tools.js';

config({path:'.env.ai-eval.local',quiet:true});
const args=process.argv.slice(2),live=args.includes('--live');
const toolSuite=args.includes('--tools'),allCases=toolSuite?qualityToolCases():qualityCases();
const option=(key:string,fallback:string)=>{const at=args.indexOf(key);return at<0?fallback:args[at+1]??fallback;};
const maxCost=option('--max-cost','0.50'),label=option('--label',live?'live':'contracts');
const caseId=option('--case',''),cases=caseId?allCases.filter(test=>test.id===caseId):allCases;
if(!cases.length)throw Error('Unknown evaluation case; no provider request was made.');
if(!/^[a-z0-9-]{1,60}$/.test(label)||!/^0(?:\.\d{1,4})?$/.test(maxCost)||!dec(maxCost).gt(0)||dec(maxCost).gt('0.50'))throw Error('Use a safe report label and a positive test ceiling no greater than 0.50 USD.');
if(live&&!process.env.OPENAI_API_KEY)throw Error('Live evaluation needs OPENAI_API_KEY in the ignored .env.ai-eval.local. No provider call was made.');
const api=live?new OpenAI({apiKey:process.env.OPENAI_API_KEY,maxRetries:0,timeout:40000}):null;
if(api&&new URL(api.baseURL).origin!=='https://api.openai.com')throw Error('Real-model evaluation requires the official OpenAI endpoint; a local transport fixture is not a model-quality result.');
const budget=live?await evaluationBudget('work/ai-quality-cost-ledger.json',maxCost):null;
const report:any={suite:qualitySuiteVersion+(toolSuite?':read-tools-1':''),mode:live?'real_model':'synthetic_contract_controls',started:new Date().toISOString(),currency:'USD',maxCost,priceBasis:'configured_estimate',providerCalls:0,inputTokens:0,outputTokens:0,cost:'0',cases:[]};
await mkdir('work',{recursive:true});
try{for(const test of cases){
  const profile=routeModel({},'standard',test.context),format=assistantResponseFormat(test.context);
  const parameters={model:profile.model,store:false,max_output_tokens:profile.maxOutputTokens,reasoning:{effort:'low' as const},instructions:profile.instructions+(test.context.entityType==='planning'?'\n'+planningDraftInstructions+'\n'+planningEditInstructions:'')+'\nErlaubte Commands: '+(test.context.allowedCommands??[]).join(', ')+'. Befehle sind ausschließlich Vorschläge.',input:JSON.stringify({context:test.context,message:test.message}),text:{format:{type:'json_schema' as const,name:'schubert_quality',strict:true,schema:format}}};
  const readTools=qualityReadTools(test);
  if(readTools.available.length)parameters.instructions+='\n'+specialistToolInstructions;
  const instructionHash=createHash('sha256').update(parameters.instructions).digest('hex');
  if(!live){const toolsUsed=test.expect.requiredTool?[{name:test.expect.requiredTool,label:readToolLabels[test.expect.requiredTool],cached:false,elapsedMs:0,resultItems:1}]:[];report.cases.push({...evaluateAssistantQuality(test,toolSuite?qualityToolReplay(test):qualityReplayOutput(test),{toolsUsed}),model:null,instructionHash,providerCalls:0});continue;}
  const profileWithInstructions={...profile,instructions:parameters.instructions};
  const estimate=affordableSkillResponse(profileWithInstructions,{context:test.context,message:test.message},0,availableSkills(test.context),format,readTools);
  if(!await budget!.reserve(String(estimate.cost))){report.stopped='shared_test_cost_ceiling';break;}
  const responses:any[]=[],started=Date.now();let calls=0;
  try{
    const result=await respondWithOptionalSkills({parameters,skills:estimate.skills,readTools:estimate.readTools,create:p=>api!.responses.create(p),onRequest:()=>{calls++;report.providerCalls++;},onResponse:r=>responses.push(r)});
    const aggregate=aggregateTextResponses(responses),usage=normalizeUsage(aggregate.usage);
    const cost=usageCost(usage,{kind:'tokens',input:profile.inputCostPerMillion,output:profile.outputCostPerMillion,cachedInput:profile.cachedInputCostPerMillion,cacheWrite:profile.cacheWriteCostPerMillion});
    await budget!.settle(String(estimate.cost),cost,true);
    if(cost===null){report.stopped='provider_usage_unknown';report.cases.push({caseId:test.id,passed:false,error:'usage_unknown',providerCalls:calls});break;}
    report.cost=dec(report.cost).add(cost).toString();report.inputTokens+=usage.input??0;report.outputTokens+=usage.output??0;
    report.cases.push({...evaluateAssistantQuality(test,result.response.output_text,{toolsUsed:result.toolsUsed,includeAnswerText:toolSuite}),model:profile.model,instructionHash,providerCalls:calls,inputTokens:usage.input,outputTokens:usage.output,cost,elapsedMs:Date.now()-started,skillsUsed:result.skillsUsed,toolsUsed:result.toolsUsed});
  }catch(error:any){
    // Uncertain or partially completed paid work is never automatically retried.
    const aggregate=aggregateTextResponses(responses),usage=normalizeUsage(aggregate.usage),rejected=[400,401,403,404,422,429].includes(error.status);
    const cost=responses.length?usageCost(usage,{kind:'tokens',input:profile.inputCostPerMillion,output:profile.outputCostPerMillion,cachedInput:profile.cachedInputCostPerMillion,cacheWrite:profile.cacheWriteCostPerMillion}):rejected?'0':null;
    await budget!.settle(String(estimate.cost),cost,rejected||calls===responses.length);
    if(cost!==null)report.cost=dec(report.cost).add(cost).toString();report.inputTokens+=usage.input??0;report.outputTokens+=usage.output??0;
    report.cases.push({caseId:test.id,passed:false,error:error.code??'provider_error',httpStatus:typeof error.status==='number'?error.status:null,providerCalls:calls,inputTokens:usage.input,outputTokens:usage.output,cost});
    report.stopped='provider_failure_no_retry';break;
  }
}}finally{if(budget){report.sharedBudget=budget.snapshot();await budget.close();}}
report.finished=new Date().toISOString();report.passed=report.cases.length===cases.length&&report.cases.every((c:any)=>c.passed)&&!report.stopped;
const target=`work/ai-quality-${label}.json`;await writeFile(target,JSON.stringify(report,null,2));
console.log(JSON.stringify({report:target,mode:report.mode,passed:report.passed,cases:report.cases.length,providerCalls:report.providerCalls,inputTokens:report.inputTokens,outputTokens:report.outputTokens,cost:report.cost,stopped:report.stopped??null}));
if(!report.passed)process.exitCode=1;
