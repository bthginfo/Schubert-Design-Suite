import {claudeSchema,supportsAdaptiveThinking,supportsServerFallback,type ClaudeContentBlock,type ClaudeEffort,type ClaudeRequest} from './claude.js';

export type AssistantImage={dataUrl:string};
/** Reference pages are prepared PNG data URLs; Claude receives them before the text they belong to. */
export function assistantUserContent(payload:unknown,images:readonly AssistantImage[]=[]):ClaudeContentBlock[]{
 return [
  ...images.map(image=>({type:'image' as const,source:{type:'base64' as const,media_type:'image/png' as const,data:image.dataUrl.slice(image.dataUrl.indexOf(',')+1)}})),
  {type:'text',text:JSON.stringify(payload)},
 ];
}

/**
 * The single request shape for every structured assistant call.
 * Stable instructions carry the cache breakpoint; per-request facts follow after it.
 */
export function assistantRequest(options:{model:string;effort:ClaudeEffort;maxOutputTokens:number;stableInstructions:string;volatileInstructions:string;schema:unknown;content:ClaudeContentBlock[]}):ClaudeRequest{
 const thinking=supportsAdaptiveThinking(options.model);
 return {
  model:options.model,max_tokens:options.maxOutputTokens,
  ...(thinking?{thinking:{type:'adaptive' as const}}:{}),
  output_config:{...(thinking?{effort:options.effort}:{}),format:{type:'json_schema',schema:claudeSchema(options.schema)}},
  system:[{type:'text',text:options.stableInstructions,cache_control:{type:'ephemeral'}},{type:'text',text:'\n'+options.volatileInstructions}],
  messages:[{role:'user',content:options.content}],
  // A classifier decline is retried server-side on the model Anthropic recommends for that category.
  ...(supportsServerFallback(options.model)?{betas:['server-side-fallback-2026-07-01'],fallbacks:'default' as const}:{}),
 };
}
