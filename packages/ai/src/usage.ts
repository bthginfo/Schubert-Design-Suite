import {dec} from '@schubert/domain';

const tokens=(value:unknown):number|null=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:null;
export function normalizeUsage(raw:any){
 const input=tokens(raw?.input_tokens),output=tokens(raw?.output_tokens);
 const cached=tokens(raw?.input_tokens_details?.cached_tokens),written=tokens(raw?.input_tokens_details?.cache_write_tokens);
 return {input,output,details:{cached_tokens:cached,cache_write_tokens:written,
  input_text_tokens:tokens(raw?.input_tokens_details?.text_tokens),input_image_tokens:tokens(raw?.input_tokens_details?.image_tokens),
  reasoning_tokens:tokens(raw?.output_tokens_details?.reasoning_tokens)}};
}

/** Missing usage in either paid response must keep the reservation unresolved. */
export function aggregateTextResponses(responses:readonly {id?:string;usage?:unknown}[]){
 const id=responses.at(-1)?.id??null;
 const usage=responses.map(response=>normalizeUsage(response.usage));
 if(!usage.length||usage.some(item=>item.input===null||item.output===null))return{id,usage:undefined};
 const sum=(key:'input'|'output')=>usage.reduce((total,item)=>total+item[key]!,0);
 const details=(keys:('cached_tokens'|'cache_write_tokens'|'reasoning_tokens')[])=>Object.fromEntries(keys.flatMap(key=>usage.some(item=>item.details[key]!==null)?[[key,usage.reduce((total,item)=>total+(item.details[key]??0),0)]]:[]));
 return{id,usage:{input_tokens:sum('input'),output_tokens:sum('output'),input_tokens_details:details(['cached_tokens','cache_write_tokens']),output_tokens_details:details(['reasoning_tokens'])}};
}
export function taskType(context:Record<string,any>,review=false){
 if(context.entityType==='probe')return 'connection_test';
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
 if(!pricing.input||!pricing.output)return null;
 // Cached and reasoning tokens are subsets, never added again to total tokens.
 const read=d.cached_tokens??0,write=d.cache_write_tokens??0;
 if(read+write>usage.input||d.reasoning_tokens!==null&&d.reasoning_tokens>usage.output)return null;
 return dec(usage.input-read-write).mul(pricing.input).add(dec(read).mul(pricing.cachedInput??pricing.input)).add(dec(write).mul(pricing.cacheWrite??pricing.input)).add(dec(usage.output).mul(pricing.output)).div(1_000_000).toString();
}
