import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {ActorContext} from '@schubert/contracts';
import {executeCommand} from '@schubert/application';
import {assistantInputSchema,prepareAssistantContext} from '../packages/application/src/assistant-context.js';
import {planningDraftOperations} from '../packages/ai/src/planning-draft.js';

export async function assistantWorkflowIntegration(actor:(role:string)=>ActorContext,test:(name:string,run:()=>Promise<void>)=>Promise<void>){
 const owner=actor('Owner');
 await test('AI receives a live studio revision, step and deterministic checks; stale and foreign contexts fail before any model call',async()=>{
  const created=await executeCommand(owner,{name:'planning.project.create',idempotencyKey:randomUUID(),payload:{kind:'memorial',name:'Synthetische KI-Kontextprüfung'}});
  const path='studio/'+created.project.id;
  const input=(step:'geometry'|'design'|'review'|'output',revision=created.revision.id,version=created.variant.version)=>assistantInputSchema.parse({message:'Prüfe den aktuellen Schritt.',context:{path,variantId:created.variant.id,planning_work:{step,revision_id:revision,base_version:version,view:'front'}}});
  const first=await prepareAssistantContext(owner,input('geometry'),'http://localhost');
  assert.equal(first.context.revisionId,created.revision.id);assert.equal(first.context.workflow.step,'geometry');assert.deepEqual(first.context.allowedCommands,['planning.design.change']);
  const operations=planningDraftOperations({snapshot:created.revision.snapshot},{kind:'memorial_slab',label:'TEST Stein',widthMm:'800',heightMm:'1200',thicknessMm:'160'});
  const changed=await executeCommand(owner,{name:'planning.design.change',id:created.variant.id,expectedVersion:created.variant.version,idempotencyKey:randomUUID(),payload:{base_revision_id:created.revision.id,operations}});
  await assert.rejects(()=>prepareAssistantContext(owner,input('geometry'),'http://localhost'),(error:any)=>error.code==='AI_STALE_CONTEXT');
  for(const step of ['review','output'] as const){
   const prepared=await prepareAssistantContext(owner,input(step,changed.revision.id,changed.variant.version),'http://localhost');
   assert.equal(prepared.context.revisionId,changed.revision.id);assert.equal(prepared.context.workflow.step,step);assert.deepEqual(prepared.context.allowedCommands,[]);assert(Array.isArray(prepared.context.validation.blocking));
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
