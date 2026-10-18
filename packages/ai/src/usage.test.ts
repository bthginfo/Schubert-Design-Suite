import {describe,it,expect} from 'vitest';
import {normalizeUsage,usageCost,taskType} from './usage.js';
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
  expect(profile.cachedInputCostPerMillion).toBe('0.01');
  expect(profile.cacheWriteCostPerMillion).toBe('0.125');
  const estimate=estimatedTextCost(profile,{});
  expect(estimate.cost).toBeGreaterThanOrEqual((estimate.inputTokenCeiling*.125+profile.maxOutputTokens*.5)/1e6);
  expect(routeModel({textModel:'custom-model'},'standard',{}).cachedInputCostPerMillion).toBeUndefined();
 });
});
