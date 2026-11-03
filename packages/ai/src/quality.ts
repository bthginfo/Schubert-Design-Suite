import type {DesignSnapshot,AssistantReadToolUsage,AssistantReadToolName} from '@schubert/contracts';
import {applyOperations, assistantGuardrailIssues, calculateBOM, rectangularRoomClearPoints, validateDesign} from '@schubert/geometry';
import {assistantOutputSchema} from './response-format.js';
import {planningDraftOperations} from './planning-draft.js';
import {normalizePlanningEdits} from './planning-edits.js';

export type QualityExpectation={
  intent:'answer'|'clarify'|'draft'|'edit'; exactText?:string;
  roomMm?:{width:string;depth:string}; stoneMm?:{thickness:string};
  minimumMissing?:number; forbiddenCommands?:string[];
  requiredTool?:AssistantReadToolName;answerPattern?:string;
};
export type QualityCase={id:string;category:string;message:string;context:Record<string,any>;expect:QualityExpectation};
export type QualityCheck={rule:string;passed:boolean};

/** Deterministic task checks. This is deliberately not an aesthetic or factual LLM grader. */
export function evaluateAssistantQuality(test:QualityCase, raw:unknown,metadata:{toolsUsed?:readonly AssistantReadToolUsage[];includeAnswerText?:boolean}={}) {
  const checks:QualityCheck[]=[];
  const check=(rule:string,passed:boolean)=>checks.push({rule,passed});
  let input=raw;
  if(typeof input==='string') {try{input=JSON.parse(input);}catch{input=null;}}
  const parsed=assistantOutputSchema.safeParse(input);
  check('structured_response',parsed.success);
  if(!parsed.success)return {caseId:test.id,passed:false,checks,requiresHumanVisualReview:test.expect.intent==='draft'||test.expect.intent==='edit'};
  const answer=parsed.data, context=test.context;
  if(test.expect.requiredTool)check('required_factual_read',!!metadata.toolsUsed?.some(t=>t.name===test.expect.requiredTool));
  if(test.expect.answerPattern)check('correct_factual_answer',new RegExp(test.expect.answerPattern,'i').test(answer.text));
  check('permitted_actions',answer.commands.every(c=>(context.allowedCommands??[]).includes(c.name)&&!test.expect.forbiddenCommands?.includes(c.name)));
  check('bounded_questions',answer.missingInputs.length<=3);
  check('honest_visualization',!answer.visualization||context.entityType==='planning');
  if(test.expect.intent==='clarify') {
    check('missing_information',answer.missingInputs.length>=(test.expect.minimumMissing??1));
    check('no_invented_draft',answer.planningDraft==null&&answer.commands.length===0);
  }else if(test.expect.intent==='answer')check('no_unrequested_write',answer.commands.length===0&&answer.planningDraft==null);
  else {
    check('no_unnecessary_questions',answer.missingInputs.length===0);
    check('concrete_plan',test.expect.intent==='draft'?answer.planningDraft!=null:answer.commands.some(c=>c.name==='planning.design.change'));
  }
  let after:DesignSnapshot|undefined;
  if(answer.planningDraft!=null || answer.commands.some(c=>c.name==='planning.design.change')){
    try{
      let operations;
      if(answer.planningDraft!=null){
        check('single_draft_contract',answer.commands.length===0);
        operations=planningDraftOperations(context,answer.planningDraft);
      }else{
        check('current_target',answer.targetId===null||answer.targetId===context.variantId);
        check('current_version',answer.baseVersion===null||answer.baseVersion===context.baseVersion);
        const payloads=answer.commands.filter(c=>c.name==='planning.design.change').map(c=>JSON.parse(c.inputJson));
        check('current_revision',payloads.every(p=>!p.base_revision_id||p.base_revision_id===context.revisionId));
        operations=normalizePlanningEdits(context,payloads.flatMap(p=>p.operations??[]));
      }
      const guardrails=context.workflow?.guardrails??{preserveMeasurements:false,preserveWording:false,selectionOnly:false};
      check('user_boundaries',assistantGuardrailIssues(context.snapshot,operations,guardrails,context.selectedElementIds??[]).length===0);
      after=applyOperations(context.snapshot,operations);
      check('valid_geometry',validateDesign(after).blocking.length===0);
      check('no_attested_ai_measurements',Object.values(after.measurements).every(m=>m.origin!=='ai'||m.reviewStatus!=='confirmed'));
    }catch{check('executable_plan',false);}
  }
  if(test.expect.exactText!==undefined)check('literal_inscription',!!after?.elements.some(e=>e.kind==='inscription'&&e.exactText===test.expect.exactText));
  if(test.expect.stoneMm)check('stone_thickness',!!after&&calculateBOM(after).lines.some(l=>l.category==='Natursteinbauteil'&&l.thicknessMm===test.expect.stoneMm!.thickness));
  if(test.expect.roomMm){
    const room=after?.elements.find(e=>e.kind==='room');
    const points=after&&room?rectangularRoomClearPoints(after,room.id):null;
    const extent=(axis:'xMm'|'yMm')=>points?Math.max(...points.map(p=>Number(p[axis])))-Math.min(...points.map(p=>Number(p[axis]))):null;
    check('clear_room_dimensions',extent('xMm')===Number(test.expect.roomMm.width)&&extent('yMm')===Number(test.expect.roomMm.depth));
  }
  return {caseId:test.id,passed:checks.every(c=>c.passed),checks,requiresHumanVisualReview:test.expect.intent==='draft'||test.expect.intent==='edit',...(metadata.includeAnswerText?{answerText:answer.text.slice(0,3000)}:{})};
}
