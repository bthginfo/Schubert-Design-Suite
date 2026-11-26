import {dec} from '@schubert/domain';

const tokens=(value:unknown):number|null=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:null;
/** Claude reports uncached input, cache writes and cache reads separately; the canonical record counts all input once. */
function claudeUsage(raw:any){
 const uncached=tokens(raw.input_tokens),written=raw.cache_creation_input_tokens==null?0:tokens(raw.cache_creation_input_tokens),read=raw.cache_read_input_tokens==null?0:tokens(raw.cache_read_input_tokens);
 const fallback=Array.isArray(raw.iterations)&&raw.iterations.some((entry:any)=>entry?.type==='fallback_message');
 return {input_tokens:uncached===null||written===null||read===null?null:uncached+written+read,output_tokens:raw.output_tokens,
  input_tokens_details:{cached_tokens:read,cache_write_tokens:written},
  output_tokens_details:{reasoning_tokens:raw.output_tokens_details?.thinking_tokens??null},...(fallback?{fallback_served:true}:{})};
}
const isClaudeUsage=(raw:any)=>!!raw&&typeof raw==='object'&&('cache_read_input_tokens' in raw||'cache_creation_input_tokens' in raw);
export function normalizeUsage(source:any){
 const raw=isClaudeUsage(source)?claudeUsage(source):source;
 const input=tokens(raw?.input_tokens),output=tokens(raw?.output_tokens);
 const cached=tokens(raw?.input_tokens_details?.cached_tokens),written=tokens(raw?.input_tokens_details?.cache_write_tokens);
 return {input,output,details:{cached_tokens:cached,cache_write_tokens:written,
  input_text_tokens:tokens(raw?.input_tokens_details?.text_tokens),input_image_tokens:tokens(raw?.input_tokens_details?.image_tokens),
  reasoning_tokens:tokens(raw?.output_tokens_details?.reasoning_tokens),...(raw?.fallback_served===true?{fallback_served:true}:{})}};
}

/** Missing usage in either paid response must keep the reservation unresolved. */
export function aggregateTextResponses(responses:readonly {id?:string;usage?:unknown}[]){
 const id=responses.at(-1)?.id??null;
 const usage=responses.map(response=>normalizeUsage(response.usage));
 if(!usage.length||usage.some(item=>item.input===null||item.output===null))return{id,usage:undefined};
 const sum=(key:'input'|'output')=>usage.reduce((total,item)=>total+item[key]!,0);
 const details=(keys:('cached_tokens'|'cache_write_tokens'|'reasoning_tokens')[])=>Object.fromEntries(keys.flatMap(key=>usage.some(item=>item.details[key]!==null)?[[key,usage.reduce((total,item)=>total+(item.details[key]??0),0)]]:[]));
 const fallback=usage.some(item=>(item.details as {fallback_served?:boolean}).fallback_served);
 return{id,usage:{input_tokens:sum('input'),output_tokens:sum('output'),input_tokens_details:details(['cached_tokens','cache_write_tokens']),output_tokens_details:details(['reasoning_tokens']),...(fallback?{fallback_served:true}:{})}};
}
export function taskType(context:Record<string,any>,review=false,activity?:{command:string;area?:string}){
 if(context.entityType==='probe')return 'connection_test';
 if(activity){
  const {command,area}=activity;
  if(/^(billing|purchasing\.invoice)\./.test(command)||['invoices','supplier-invoices','receivables','payables','payments'].includes(area??''))return 'billing_assistant';
  if(command.startsWith('workforce.dispatch.')||['dispatch','team'].includes(area??''))return 'dispatch_assistant';
  if(command.startsWith('sales.')||area==='quotes')return 'sales_assistant';
  if(command.startsWith('crm.')||['customers','contacts','addresses'].includes(area??''))return 'customer_assistant';
  if(command||(area&&area!=='studio'))return taskType({...context,entityType:'suite'});
 }
 if(['planning','studio','memorial','room_plan'].includes(context.entityType)){
  const kind=context.designKind??context.snapshot?.kind??context.entityType;
  return kind==='room_plan'?(review?'room_review':'room_design'):(review?'memorial_review':'memorial_design');
 }
 return context.sourceKind||Array.isArray(context.sources)&&context.sources.length?'document_analysis':'office_assistant';
}
export function usageCost(usage:ReturnType<typeof normalizeUsage>,pricing:any):string|null{
 if(usage.input===null||usage.output===null)return null;
 const d=usage.details;
 if(pricing.kind==='image'){
  if(d.input_text_tokens===null||d.input_image_tokens===null||d.input_text_tokens+d.input_image_tokens!==usage.input)return null;
  return dec(d.input_text_tokens).mul(pricing.text).add(dec(d.input_image_tokens).mul(pricing.image)).add(dec(usage.output).mul(pricing.output)).div(1_000_000).toString();
 }
 // A refusal fallback is billed at another model's rates; it stays reserved for an explicit reconciliation.
 if(!pricing.input||!pricing.output||(d as {fallback_served?:boolean}).fallback_served)return null;
 // Cached and reasoning tokens are subsets, never added again to total tokens.
 const read=d.cached_tokens??0,write=d.cache_write_tokens??0;
 if(read+write>usage.input||d.reasoning_tokens!==null&&d.reasoning_tokens>usage.output)return null;
 return dec(usage.input-read-write).mul(pricing.input).add(dec(read).mul(pricing.cachedInput??pricing.input)).add(dec(write).mul(pricing.cacheWrite??pricing.input)).add(dec(usage.output).mul(pricing.output)).div(1_000_000).toString();
}
