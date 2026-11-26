import {z} from 'zod';
import {assistantClarificationSchema, clarificationOutputFormat} from '@schubert/contracts';
import {planningDraftSchema, planningDraftFormat, initialMemorialDraftFormat} from './planning-draft.js';

export const assistantOutputSchema = z.object({
  text:z.string().max(16000), targetId:z.string().nullable(), baseVersion:z.number().int().nullable(),
  commands:z.array(z.object({name:z.string(),inputJson:z.string().max(64000),targetId:z.string().nullable().optional(),baseVersion:z.number().int().nullable().optional()})).max(10),
  missingInputs:z.array(z.string()).max(20), assumptions:z.array(z.string()).max(20),
  clarifications:z.array(assistantClarificationSchema).max(20).default([]),
  planningDraft:planningDraftSchema.nullable().optional(),
  visualization:z.strictObject({intent:z.enum(['plan','photo']),prompt:z.string().min(8).max(6000)}).nullable().default(null),
});
export type AssistantOutput = z.infer<typeof assistantOutputSchema>;

const baseFormat = {
  type:'object', properties:{
    text:{type:'string'},targetId:{type:['string','null']},baseVersion:{type:['integer','null']},
    commands:{type:'array',items:{type:'object',properties:{name:{type:'string'},inputJson:{type:'string'},targetId:{type:['string','null']},baseVersion:{type:['integer','null']}},required:['name','inputJson','targetId','baseVersion'],additionalProperties:false}},
    missingInputs:{type:'array',items:{type:'string'}},assumptions:{type:'array',items:{type:'string'}},
    clarifications:clarificationOutputFormat,
    visualization:{anyOf:[{type:'null'},{type:'object',properties:{intent:{type:'string',enum:['plan','photo']},prompt:{type:'string'}},required:['intent','prompt'],additionalProperties:false}]},
  },required:['text','targetId','baseVersion','commands','missingInputs','assumptions','clarifications','visualization'],additionalProperties:false,
};
export function assistantResponseFormat(context:Record<string,any>) {
  if(context.entityType!=='planning') return baseFormat;
  const initialMemorial=context.designKind==='memorial'&&context.snapshot?.elements?.length===0;
  return {...baseFormat,properties:{...baseFormat.properties,
    commands:initialMemorial&&!context.suite?{...baseFormat.properties.commands,maxItems:0}:baseFormat.properties.commands,
    planningDraft:initialMemorial?initialMemorialDraftFormat:planningDraftFormat,
  },required:[...baseFormat.required,'planningDraft']};
}

/**
 * Structured outputs do not enforce array lengths. Advisory lists are bounded here instead of
 * rejecting a paid answer; commands stay strictly validated by the schema above.
 */
export function boundAssistantOutput(raw:unknown,context:Record<string,any>){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return raw;
  const output={...(raw as Record<string,any>)};
  for(const key of ['missingInputs','assumptions','clarifications'] as const)if(Array.isArray(output[key]))output[key]=output[key].slice(0,20);
  if(Array.isArray(output.clarifications))output.clarifications=output.clarifications.map((item:any)=>item&&Array.isArray(item.options)?{...item,options:item.options.slice(0,6)}:item);
  // An empty memorial starts from the structured first draft only (formerly maxItems: 0 in the schema).
  if(context.entityType==='planning'&&context.designKind==='memorial'&&context.snapshot?.elements?.length===0&&!context.suite&&Array.isArray(output.commands))output.commands=[];
  return output;
}
