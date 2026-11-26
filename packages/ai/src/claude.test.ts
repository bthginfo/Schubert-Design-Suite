import {describe,it,expect} from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import {claudeClient,claudeSchema,providerFailure} from './claude.js';

describe('Claude client configuration',()=>{
 it('sends the workspace of an organization-wide key on every request and rejects malformed IDs',()=>{
  const client=claudeClient('sk-ant-synthetic-key-for-tests',1000,'wrkspc_011CZkZaBF1tNoB5wlCeusgy') as any;
  expect(client._options.defaultHeaders).toEqual({'anthropic-workspace-id':'wrkspc_011CZkZaBF1tNoB5wlCeusgy'});
  expect((claudeClient('sk-ant-synthetic-key-for-tests',1000) as any)._options.defaultHeaders).toBeUndefined();
  expect(()=>claudeClient('sk-ant-synthetic-key-for-tests',1000,'default')).toThrow(/wrkspc_/);
 });
 it('explains a missing workspace and missing credits instead of a generic provider error',()=>{
  const error=(message:string,status=400)=>Anthropic.APIError.generate(status,{type:'error',error:{type:'invalid_request_error',message}},message,new Headers());
  expect(providerFailure(error('This API key is not scoped to a workspace, so this request must include the anthropic-workspace-id header'))?.code).toBe('AI_PROVIDER_WORKSPACE');
  expect(providerFailure(error('Your credit balance is too low to access the Anthropic API.'))?.code).toBe('AI_PROVIDER_CREDITS');
  expect(providerFailure(error('overloaded',529))?.code).toBe('AI_PROVIDER_BUSY');
  expect(providerFailure(new Error('network'))).toBeNull();
 });
 it('reduces schemas to the structured-output subset',()=>{
  expect(claudeSchema({type:'object',properties:{a:{type:['string','null'],maxLength:4},b:{type:'array',items:{type:'string',pattern:'x'},maxItems:2}},required:['a','b']}))
   .toEqual({type:'object',properties:{a:{anyOf:[{type:'string'},{type:'null'}]},b:{type:'array',items:{type:'string'}}},required:['a','b'],additionalProperties:false});
 });
});
