import {describe,it,expect} from 'vitest';
import {normalizeUsage,usageCost,taskType,aggregateTextResponses} from './usage.js';
import {routeModel,estimatedTextCost} from './model-routing.js';
describe('Provider usage and task attribution',()=>{
 it('does not count cached inputs or reasoning outputs twice',()=>{
  const usage=normalizeUsage({input_tokens:1000,output_tokens:200,input_tokens_details:{cached_tokens:600,cache_write_tokens:100},output_tokens_details:{reasoning_tokens:150}});
  expect(usage.input!+usage.output!).toBe(1200);
  expect(usageCost(usage,{kind:'tokens',input:'2',cachedInput:'0.2',cacheWrite:'2.5',output:'10'})).toBe('0.00297');
 });
 it('preserves missing usage, zero usage and malformed usage distinctly',()=>{
  expect(usageCost(normalizeUsage(null),{input:'2',output:'10'})).toBeNull();
  expect(usageCost(normalizeUsage({input_tokens:0,output_tokens:0}),{input:'2',output:'10'})).toBe('0');
  expect(normalizeUsage({input_tokens:-1,output_tokens:'12'}).input).toBeNull();
  expect(usageCost(normalizeUsage({input_tokens:1,output_tokens:2,input_tokens_details:{cached_tokens:3}}),{input:'2',output:'10'})).toBeNull();
 });
 it('requires complete modality counts before estimating image costs',()=>{
  const p={kind:'image',text:'5',image:'8',output:'30'};
  expect(usageCost(normalizeUsage({input_tokens:100,output_tokens:400}),p)).toBeNull();
  expect(usageCost(normalizeUsage({input_tokens:100,output_tokens:400,input_tokens_details:{text_tokens:20,image_tokens:80}}),p)).toBe('0.01274');
 });
 it('distinguishes office, documents, both design kinds, reviews and tests',()=>{
  expect(taskType({entityType:'customers'})).toBe('office_assistant');
  expect(taskType({sources:[{documentId:'source'}]})).toBe('document_analysis');
  expect(taskType({entityType:'planning',designKind:'room_plan'})).toBe('room_design');
  expect(taskType({entityType:'planning',snapshot:{kind:'room_plan'}},true)).toBe('room_review');
  expect(taskType({entityType:'memorial'},true)).toBe('memorial_review');
  expect(taskType({entityType:'probe'})).toBe('connection_test');
 });
 it('reserves the cache-write ceiling and freezes the documented cache rates',()=>{
  const profile=routeModel({},'standard',{});
  expect(profile.cachedInputCostPerMillion).toBe('0.2');
  expect(profile.cacheWriteCostPerMillion).toBe('5');
  const estimate=estimatedTextCost(profile,{});
  expect(estimate.cost).toBeGreaterThanOrEqual((estimate.inputTokenCeiling*5+profile.maxOutputTokens*20)/1e6);
  expect(routeModel({textModel:'custom-model'},'standard',{}).cachedInputCostPerMillion).toBeUndefined();
 });
 it('counts Claude cache writes and reads once and keeps thinking inside output',()=>{
  const usage=normalizeUsage({input_tokens:200,cache_creation_input_tokens:300,cache_read_input_tokens:500,output_tokens:400,output_tokens_details:{thinking_tokens:250}});
  expect(usage).toMatchObject({input:1000,output:400,details:{cached_tokens:500,cache_write_tokens:300,reasoning_tokens:250}});
  // 200×4 + 300×5 + 500×0.2 + 400×20 per million
  expect(usageCost(usage,{kind:'tokens',input:'4',cachedInput:'0.2',cacheWrite:'5',output:'20'})).toBe('0.0104');
  expect(normalizeUsage({input_tokens:10,cache_read_input_tokens:null,cache_creation_input_tokens:null,output_tokens:2}).input).toBe(10);
 });
 it('keeps a refusal fallback reserved for review instead of pricing it at the requested model',()=>{
  const usage=normalizeUsage({input_tokens:100,cache_read_input_tokens:0,cache_creation_input_tokens:0,output_tokens:10,iterations:[{type:'message'},{type:'fallback_message'}]});
  expect(usageCost(usage,{kind:'tokens',input:'4',output:'20'})).toBeNull();
  expect(normalizeUsage(aggregateTextResponses([{id:'a',usage:{input_tokens:1,cache_read_input_tokens:0,cache_creation_input_tokens:0,output_tokens:1,iterations:[{type:'fallback_message'}]}}]).usage).details).toMatchObject({fallback_served:true});
 });
});

import {boundAssistantOutput,assistantOutputSchema} from './response-format.js';
describe('Claude structured-output bounds enforced by the application',()=>{
 it('bounds advisory lists instead of discarding a paid answer and keeps first memorial drafts command-free',()=>{
  const many=Array.from({length:30},(_,i)=>'Frage '+i);
  const raw={text:'ok',targetId:null,baseVersion:null,commands:[{name:'planning.design.change',inputJson:'{}',targetId:null,baseVersion:null}],missingInputs:many,assumptions:many,clarifications:[{question:'Welche Form?',kind:'choice',options:['a','b','c','d','e','f','g','h']}],visualization:null};
  const empty=boundAssistantOutput(raw,{entityType:'planning',designKind:'memorial',snapshot:{elements:[]}}) as any;
  expect(empty.commands).toEqual([]);expect(empty.missingInputs).toHaveLength(20);expect(empty.clarifications[0].options).toHaveLength(6);
  expect(()=>assistantOutputSchema.parse(empty)).not.toThrow();
  const existing=boundAssistantOutput(raw,{entityType:'planning',designKind:'memorial',snapshot:{elements:[{id:'stone'}]}}) as any;
  expect(existing.commands).toHaveLength(1);
  expect(boundAssistantOutput('not-an-object',{})).toBe('not-an-object');
 });
});
