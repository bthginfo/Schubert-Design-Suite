import {withTenant,update} from '@schubert/db';
import type {ActorContext} from '@schubert/contracts';
import {requireRule} from '@schubert/domain';
import {getRecord,executeCommand} from './core.js';

/** Only persisted server validation can authorize geometry created by a draft template. */
export async function applyAIProposal(ctx:ActorContext,id:string){
 const proposal=await withTenant(ctx,db=>getRecord(db,'ai_proposals',id,false));
 requireRule(proposal.actor_id===ctx.actorId&&proposal.status==='proposed'&&new Date(proposal.expires_at)>new Date(),'PROPOSAL_EXPIRED','Vorschlag ist nicht mehr anwendbar.',409);
 requireRule(!proposal.missing_inputs?.length&&proposal.commands.length===1,'PROPOSAL_REVIEW','Fehlende Angaben oder mehrere Änderungen zuerst im Fachdialog prüfen.');
 const command=proposal.commands[0];
 requireRule(['crm.inquiry.create','sales.quote.create','communication.email.create','planning.design.change','communication.task.create'].includes(command.name),'AI_COMMAND','Vorschlag ist nicht freigegeben.');
 if(command.name==='planning.design.change'){
  const generated=proposal.validation?.serverGeneratedPlanningDraft===true;
  requireRule(Array.isArray(command.input.operations)&&command.input.operations.length>0&&command.input.operations.every((operation:any)=>generated?operation.type==='add_element':['move_element','set_element_position','rotate_element','set_design_target','set_inscription_text','set_inscription_layout'].includes(operation.type)),'AI_OPERATION','Diese Planaktion erfordert eine gesonderte fachliche Bestätigung.');
 }
 const result=await executeCommand(ctx,{name:command.name,id:proposal.entity_id??undefined,expectedVersion:proposal.base_version??undefined,idempotencyKey:'ai-proposal-'+proposal.id,payload:command.input});
 await withTenant(ctx,db=>update(db,'ai_proposals',proposal.id,{status:'applied'}));return result;
}
