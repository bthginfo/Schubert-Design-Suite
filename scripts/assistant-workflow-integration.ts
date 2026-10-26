import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {ActorContext} from '@schubert/contracts';
import {executeCommand,applyAIProposal} from '@schubert/application';
import {withTenant,insert,one} from '@schubert/db';
import {inverseOperations} from '@schubert/geometry';
import {assistantInputSchema,prepareAssistantContext} from '../packages/application/src/assistant-context.js';
import {planningDraftOperations} from '../packages/ai/src/planning-draft.js';

export async function assistantWorkflowIntegration(actor:(role:string)=>ActorContext,test:(name:string,run:()=>Promise<void>)=>Promise<void>){
 const owner=actor('Owner');
 await test('AI edit boundaries survive context preparation and an empty selection fails before any model call',async()=>{
  const plan=await executeCommand(owner,{name:'planning.project.create',idempotencyKey:randomUUID(),payload:{kind:'memorial',name:'TEST Bearbeitungsgrenzen'}}),guardrails={preserveMeasurements:true,preserveWording:true,selectionOnly:false};
  const input=assistantInputSchema.parse({message:'Prüfe den Entwurf.',context:{path:'studio/'+plan.project.id,variantId:plan.variant.id,planning_work:{step:'design',revision_id:plan.revision.id,base_version:plan.variant.version,view:'front',display_unit:'cm',guardrails}}});
  const prepared=await prepareAssistantContext(owner,input,'http://localhost');assert.deepEqual(prepared.context.workflow.guardrails,guardrails);assert.equal(prepared.context.workflow.displayUnit,'cm');assert.equal(prepared.context.workflow.geometryUnit,'mm');
  input.context!.planning_work!.guardrails!.selectionOnly=true;await assert.rejects(()=>prepareAssistantContext(owner,input,'http://localhost'),(error:any)=>error.code==='AI_SELECTION_REQUIRED');
 });
 await test('Persisted AI proposal boundaries are rechecked; apply is idempotent and a stale undo preserves later work',async()=>{
  const plan=await executeCommand(owner,{name:'planning.project.create',idempotencyKey:randomUUID(),payload:{kind:'memorial',name:'TEST Sichere KI-Übernahme'}}),operations=planningDraftOperations({snapshot:plan.revision.snapshot},{kind:'memorial_slab',label:'TEST Stein',widthMm:'800',heightMm:'1200',thicknessMm:'160'});
  const ready=await executeCommand(owner,{name:'planning.design.change',id:plan.variant.id,expectedVersion:plan.variant.version,idempotencyKey:randomUUID(),payload:{base_revision_id:plan.revision.id,operations}}),stone=ready.revision.snapshot.elements.find((e:any)=>e.kind==='stone_piece');
  async function saved(ops:any[],guardrails:any){return withTenant(owner,db=>insert(db,'ai_proposals',{tenant_id:owner.tenantId,legal_entity_id:owner.legalEntityId,created_by:owner.actorId,actor_id:owner.actorId,entity_type:'planning',entity_id:plan.variant.id,base_version:ready.variant.version,action_type:'draft_changes',commands:[{name:'planning.design.change',input:{base_revision_id:ready.revision.id,operations:ops}}],missing_inputs:[],validation:{guardrails,selectedElementIds:[stone.id]},expires_at:new Date(Date.now()+600000),status:'proposed'}));}
  const protectedProposal=await saved([{type:'set_design_target',measureId:stone.thicknessMeasureId,valueMm:'180'}],{preserveMeasurements:true,preserveWording:true,selectionOnly:true});
  await assert.rejects(()=>applyAIProposal(owner,protectedProposal.id),(error:any)=>error.code==='AI_EDIT_BOUNDARY');
  const unchanged=await withTenant(owner,db=>one<any>(db,'SELECT head_revision_id,version FROM design_variants WHERE id=$1',[plan.variant.id]));assert.equal(unchanged.head_revision_id,ready.revision.id);assert.equal(unchanged.version,ready.variant.version);
  const moves=[{type:'move_element',elementId:stone.id,delta:{xMm:'10',yMm:'0',zMm:'0'}}],accepted=await saved(moves,{preserveMeasurements:true,preserveWording:true,selectionOnly:true});
  const applied=await applyAIProposal(owner,accepted.id),duplicate=await applyAIProposal(owner,accepted.id);assert.equal(applied.revision.id,duplicate.revision.id);
  const inverse=inverseOperations(ready.revision.snapshot,moves as any)!;
  const undone=await executeCommand(owner,{name:'planning.design.change',id:plan.variant.id,expectedVersion:applied.variant.version,idempotencyKey:randomUUID(),payload:{base_revision_id:applied.revision.id,operations:inverse}});assert.deepEqual(undone.revision.snapshot.elements,ready.revision.snapshot.elements);
  const later=await executeCommand(owner,{name:'planning.design.change',id:plan.variant.id,expectedVersion:undone.variant.version,idempotencyKey:randomUUID(),payload:{base_revision_id:undone.revision.id,operations:[{type:'rename_element',elementId:stone.id,label:'TEST Spätere Arbeit bleibt erhalten'}]}});
  await assert.rejects(()=>executeCommand(owner,{name:'planning.design.change',id:plan.variant.id,expectedVersion:applied.variant.version,idempotencyKey:randomUUID(),payload:{base_revision_id:applied.revision.id,operations:inverse}}),(error:any)=>error.code==='VERSION_CONFLICT'||error.code==='REVISION_CONFLICT');
  const head=await withTenant(owner,db=>one<any>(db,'SELECT head_revision_id FROM design_variants WHERE id=$1',[plan.variant.id]));assert.equal(head.head_revision_id,later.revision.id);
 });
 await test('AI receives a live studio revision, step and deterministic checks; stale and foreign contexts fail before any model call',async()=>{
  const created=await executeCommand(owner,{name:'planning.project.create',idempotencyKey:randomUUID(),payload:{kind:'memorial',name:'Synthetische KI-Kontextprüfung'}});
  const path='studio/'+created.project.id;
  const input=(step:'geometry'|'design'|'review'|'output',revision=created.revision.id,version=created.variant.version)=>assistantInputSchema.parse({message:'Prüfe den aktuellen Schritt.',context:{path,variantId:created.variant.id,planning_work:{step,revision_id:revision,base_version:version,view:'front'}}});
  const first=await prepareAssistantContext(owner,input('geometry'),'http://localhost');
  assert.equal(first.context.revisionId,created.revision.id);assert.equal(first.context.workflow.step,'geometry');assert(first.context.allowedCommands.includes('planning.design.change'));assert(first.context.allowedCommands.includes('sales.order.create'));
  const operations=planningDraftOperations({snapshot:created.revision.snapshot},{kind:'memorial_slab',label:'TEST Stein',widthMm:'800',heightMm:'1200',thicknessMm:'160'});
  const changed=await executeCommand(owner,{name:'planning.design.change',id:created.variant.id,expectedVersion:created.variant.version,idempotencyKey:randomUUID(),payload:{base_revision_id:created.revision.id,operations}});
  await assert.rejects(()=>prepareAssistantContext(owner,input('geometry'),'http://localhost'),(error:any)=>error.code==='AI_STALE_CONTEXT');
  for(const step of ['review','output'] as const){
   const prepared=await prepareAssistantContext(owner,input(step,changed.revision.id,changed.variant.version),'http://localhost');
   assert.equal(prepared.context.revisionId,changed.revision.id);assert.equal(prepared.context.workflow.step,step);assert(prepared.context.allowedCommands.includes('planning.design.change'));assert(Array.isArray(prepared.context.validation.blocking));
   if(step==='review')assert(prepared.context.releaseValidation.blocking.length>0);
  }
  const foreign=assistantInputSchema.parse({...input('design',changed.revision.id,changed.variant.version),context:{...input('design',changed.revision.id,changed.variant.version).context,variantId:randomUUID()}});
  await assert.rejects(()=>prepareAssistantContext(owner,foreign,'http://localhost'));
 });
 await test('Form review excludes internal costs and secret fields and cannot produce business writes',async()=>{
  const input=assistantInputSchema.parse({message:'Prüfe den Entwurf.',context:{path:'quotes',editor:{module:'quotes',values:{title:'TEST Angebot',currency:'EUR',internal_secret:'never forward',customer_id:randomUUID()},lines:[{description:'Arbeitsplatte',quantity:'2',unit:'m2',unit_price:'250,50',tax_rate:'19',line_type:'item',optional:false,selected:true}],total_line_count:1}}});
  const prepared=await prepareAssistantContext(owner,input,'http://localhost');
  assert.equal(prepared.context.workflow.step,'record_edit');assert.equal(prepared.context.workingCopy.status,'untrusted_unsaved_draft');assert.deepEqual(prepared.context.allowedCommands,[]);
  assert.equal(prepared.context.workingCopy.values.title,'TEST Angebot');assert(!JSON.stringify(prepared.context).includes('never forward'));
  assert.equal(prepared.context.workingCopy.fieldDefinitions.find((field:any)=>field.key==='customer_id').present,true);
  const customer=await executeCommand(owner,{name:'crm.customer.create',idempotencyKey:randomUUID(),payload:{name:'TEST gespeicherter Formularbezug',party_type:'person',email:'persisted@example.invalid'}});
  const quote=await executeCommand(owner,{name:'sales.quote.create',idempotencyKey:randomUUID(),payload:{title:'TEST alter gespeicherter Entwurf',customer_id:customer.id,lines:[{description:'ALTE POSITION NICHT ÜBERMITTELN',quantity:'1',unit:'piece',unit_price:'999',tax_rate:'19'}]}});
  const editing=await prepareAssistantContext(owner,assistantInputSchema.parse({...input,context:{path:'quotes/'+quote.id,editor:{...input.context!.editor!,record_id:quote.id}}}),'http://localhost');
  assert.equal(editing.context.record,undefined);assert.equal(editing.context.lines,undefined);assert.equal(editing.context.allowedRecipients,undefined);
  assert(!JSON.stringify(editing.context).includes('ALTE POSITION NICHT ÜBERMITTELN'));
  await assert.rejects(()=>prepareAssistantContext(owner,assistantInputSchema.parse({...input,context:{...input.context,editor:{...input.context!.editor!,module:'customers'}}}),'http://localhost'),(error:any)=>error.code==='AI_EDITOR_SCOPE');
  await assert.rejects(()=>prepareAssistantContext(actor('HR'),assistantInputSchema.parse({message:'Personal prüfen',context:{path:'team'}}),'http://localhost'),(error:any)=>error.code==='AI_CONTEXT');
 });
}
