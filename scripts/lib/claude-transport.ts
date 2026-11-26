import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

/**
 * Offline stand-ins for the Claude Messages API used by the PostgreSQL integration checks.
 * They exercise the real Anthropic SDK request/response path; they never establish model quality.
 */
export const CLAUDE_ORIGIN='https://api.anthropic.com';
export type SyntheticUsage={input_tokens:number;output_tokens:number;cache_creation_input_tokens?:number;cache_read_input_tokens?:number};
const defaultUsage:SyntheticUsage={input_tokens:1000,output_tokens:100,cache_creation_input_tokens:0,cache_read_input_tokens:0};

export const toolUse=(name:string,input:unknown,id='toolu_'+randomUUID().replaceAll('-','').slice(0,20))=>({type:'tool_use',id,name,input});
export const answerText=(answer:Record<string,unknown>)=>({type:'text',text:JSON.stringify({targetId:null,baseVersion:null,commands:[],missingInputs:[],assumptions:[],clarifications:[],planningDraft:null,visualization:null,...answer})});

export function claudeMessage(options:{id:string;model:string;content:unknown[];usage?:SyntheticUsage;stop_reason?:string}){
 return {id:options.id,type:'message',role:'assistant',model:options.model,content:options.content,
  stop_reason:options.stop_reason??(options.content.some((block:any)=>block.type==='tool_use')?'tool_use':'end_turn'),stop_sequence:null,stop_details:null,
  usage:{...defaultUsage,...options.usage}};
}
export const jsonResponse=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','request-id':'req_synthetic_'+randomUUID()}});
export const claudeError=(status:number,type:string)=>jsonResponse({type:'error',error:{type,message:'synthetic '+type}},status);

/** Read the request body and assert the official Messages endpoint. */
export async function claudeRequest(input:RequestInfo|URL,init?:RequestInit){
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 assert.equal(url.origin,CLAUDE_ORIGIN);assert.equal(url.pathname,'/v1/messages');
 return JSON.parse(String(init?.body??(input instanceof Request?await input.text():'')));
}
/** Synthetic fetch: the free token count is answered locally, every Messages request goes to the handler. */
export function claudeFetch(handler:(body:any)=>Promise<Response>|Response,counted:any[]=[]):typeof fetch{
 return async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:(input as Request).url);
  assert.equal(url.origin,CLAUDE_ORIGIN,'Synthetic transport must never send a real request');
  const body=JSON.parse(String(init?.body??(input instanceof Request?await input.text():'')));
  if(url.pathname==='/v1/messages/count_tokens'){counted.push(body);return jsonResponse({input_tokens:Math.ceil(JSON.stringify(body).length/3)});}
  assert.equal(url.pathname,'/v1/messages');
  return handler(body);
 };
}
/** The authorized {context,message} payload of the first user turn. */
export function userPayload(body:any){
 const text=(body.messages[0].content as any[]).filter(block=>block.type==='text');
 return JSON.parse(text[0].text);
}
/** Parsed read results sent back as tool_result blocks in the follow-up call. */
export function toolResults(body:any){
 return body.messages.flatMap((message:any)=>Array.isArray(message.content)?message.content:[]).filter((block:any)=>block.type==='tool_result').map((block:any)=>JSON.parse(block.content));
}
/** Every operator instruction the model receives: system blocks plus mid-conversation system messages. */
export function instructionsOf(body:any){
 return [...(Array.isArray(body.system)?body.system.map((block:any)=>block.text):[String(body.system??'')]),
  ...body.messages.filter((message:any)=>message.role==='system').map((message:any)=>typeof message.content==='string'?message.content:JSON.stringify(message.content))].join('\n');
}
