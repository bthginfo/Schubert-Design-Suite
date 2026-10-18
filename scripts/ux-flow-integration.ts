import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {withTenant,rows,one,insertMany} from '@schubert/db';
import {executeCommand,loadPage,invalidateReads,baseData,prepareAssistantContext,assistantInputSchema,applyAIProposal} from '@schubert/application';
import {searchPlanningProducts} from '../packages/application/src/catalog-search.js';
import {validatePlanningReferences} from '../packages/application/src/planning.js';
import {rectangleContour} from '@schubert/geometry';
import type {ActorContext} from '@schubert/contracts';
import {planningDraftOperations} from '../packages/ai/src/planning-draft.js';

export async function uxFlowIntegration(actor:(role:string)=>ActorContext,test:(label:string,run:()=>Promise<void>)=>Promise<void>){
 const owner=actor('Owner'),employee=actor('Employee');
 const call=(ctx:ActorContext,name:string,payload:object={},record?:any,key=randomUUID())=>executeCommand(ctx,{name,payload,id:record?.id,expectedVersion:record?.version,idempotencyKey:key});
 await test('Studio search reaches older projects and keyset pagination returns each tied timestamp once',async()=>{
  const prefix='Synthetic search '+randomUUID(),fixtures=Array.from({length:31},(_,i)=>({...baseData(owner),id:randomUUID(),name:prefix+' '+i,kind:'room_plan',status:'draft',updated_at:'2002-01-01T12:00:00.123456Z'}));
  await withTenant(owner,db=>insertMany(db,'planning_projects',fixtures));
  try{
   invalidateReads(owner);const first=await loadPage(owner,'studio',new URL('https://test.invalid/studio?q='+encodeURIComponent(prefix)));assert.equal(first.records.length,25);assert.equal(first.summary.projectHasMore,true);
   const second=await loadPage(owner,'studio',new URL(first.summary.projectNext,'https://test.invalid'));assert.equal(second.records.length,6);assert.equal(second.summary.projectHasMore,false);assert.equal(new Set([...first.records,...second.records].map((r:any)=>r.id)).size,31);
   const exact=await loadPage(owner,'studio',new URL('https://test.invalid/studio?q='+encodeURIComponent(prefix+' 30')));assert.equal(exact.records.length,1);assert.equal(exact.records[0].id,fixtures[30].id);
  }finally{await withTenant(owner,db=>db.query('DELETE FROM planning_projects WHERE id=ANY($1::uuid[])',[fixtures.map(r=>r.id)]));invalidateReads(owner);}
 });
 await test('Month calendar includes more than 25 assignments, overlaps, exclusive boundaries and employee filter',async()=>{
  const seed=Array.from({length:30},(_,i)=>({...baseData(owner),id:randomUUID(),title:'Synthetic calendar '+i,employee_id:employee.employeeId,starts_at:'2003-10-15T08:00:00Z',ends_at:'2003-10-15T09:00:00Z',status:'planned'}));
  const overlap={...seed[0],id:randomUUID(),title:'Synthetic overlap',starts_at:'2003-09-28T10:00:00Z',ends_at:'2003-09-30T10:00:00Z'};
  const boundary={...seed[0],id:randomUUID(),title:'Synthetic boundary',starts_at:'2003-09-28T10:00:00Z',ends_at:'2003-09-28T22:00:00Z'};
  const other={...seed[0],id:randomUUID(),title:'Synthetic other employee',employee_id:owner.employeeId};
  const fixtures=[...seed,overlap,boundary,other],ids=fixtures.map(row=>row.id);
  await withTenant(owner,db=>insertMany(db,'dispatch_assignments',fixtures));
  try{
   invalidateReads(owner);const page=await loadPage(owner,'dispatch',new URL('https://test.invalid/dispatch?mode=month&date=2003-10-15'));
   assert.equal(page.summary.calendar.days.length,42);assert.equal(page.records.length,25);assert(page.related.calendar_assignments.length>=32);assert(page.related.calendar_assignments.some((r:any)=>r.id===overlap.id));assert(!page.related.calendar_assignments.some((r:any)=>r.id===boundary.id));
   const filtered=await loadPage(owner,'dispatch',new URL('https://test.invalid/dispatch?mode=month&date=2003-10-15&employee_id='+employee.employeeId));assert(filtered.related.calendar_assignments.every((r:any)=>r.employee_id===employee.employeeId));assert(!filtered.related.calendar_assignments.some((r:any)=>r.id===other.id));
   const legacy=await loadPage(owner,'dispatch',new URL('https://test.invalid/dispatch?from=2003-09-29&to=2003-10-20'));assert(legacy.related.calendar_assignments.some((r:any)=>r.id===overlap.id),'Old date filters must not discard assignments that started before the view');
   await assert.rejects(()=>loadPage(owner,'dispatch',new URL('https://test.invalid/dispatch?date=2003-02-30')),(error:any)=>error.code==='CALENDAR_DATE');
   await assert.rejects(()=>loadPage(owner,'dispatch',new URL('https://test.invalid/dispatch?from=2003-01-01&to=2003-12-31')),(error:any)=>error.code==='CALENDAR_RANGE');
  }finally{await withTenant(owner,db=>db.query('DELETE FROM dispatch_assignments WHERE id=ANY($1::uuid[])',[ids]));invalidateReads(owner);}
 });
 await test('Companion room and memorial drafts persist as editable, unreviewed revisions with real version checks',async()=>{
  for(const kind of ['room_plan','memorial']){
   const created=await call(owner,'planning.project.create',{name:'Synthetic companion '+kind+' '+randomUUID().slice(0,8),kind});
   const draft=kind==='room_plan'?{kind:'rectangular_room',label:'Badentwurf',clearWidthMm:'4000',clearDepthMm:'6000',heightMm:'2600',wallThicknessMm:'200'}:{kind:'memorial_slab',label:'Grabmalentwurf',widthMm:'800',heightMm:'1200',thicknessMm:'160'};
   const operations=planningDraftOperations({snapshot:created.revision.snapshot},draft),proposal={...baseData(owner),id:randomUUID(),actor_id:owner.actorId,entity_type:'planning',entity_id:created.variant.id,base_version:created.variant.version,action_type:'draft_changes',commands:[{name:'planning.design.change',input:{base_revision_id:created.revision.id,operations}}],missing_inputs:[],validation:{serverGeneratedPlanningDraft:true},expires_at:new Date(Date.now()+300000),status:'proposed'},untrusted={...proposal,id:randomUUID(),validation:{serverGeneratedPlanningDraft:false}};
   await withTenant(owner,db=>insertMany(db,'ai_proposals',[proposal,untrusted]));await assert.rejects(()=>applyAIProposal(owner,untrusted.id),(error:any)=>error.code==='AI_OPERATION');const result=await applyAIProposal(owner,proposal.id);
   assert(result.revision.snapshot.elements.length>0);assert(Object.values(result.revision.snapshot.measurements).every((m:any)=>m.reviewStatus==='unreviewed'));assert.equal(result.variant.version,created.variant.version+1);
   assert.throws(()=>planningDraftOperations({snapshot:result.revision.snapshot},draft),(error:any)=>error.code==='AI_DRAFT_SCOPE');
   await assert.rejects(()=>call(owner,'planning.design.change',{base_revision_id:created.revision.id,operations},created.variant));
   const stored=await withTenant(owner,db=>one<any>(db,'SELECT snapshot FROM design_revisions WHERE id=$1',[result.revision.id]));assert.deepEqual(stored.snapshot,result.revision.snapshot);
   const input=assistantInputSchema.parse({message:'Ausgewählte Komponente bearbeiten.',context:{path:'studio/'+created.project.id,variantId:created.variant.id,selected_element_ids:[result.revision.snapshot.elements[0].id]}}),prepared=await prepareAssistantContext(owner,input,'https://test.invalid');assert.deepEqual(prepared.context.selectedElementIds,input.context!.selected_element_ids);
   await assert.rejects(()=>prepareAssistantContext(owner,{...input,context:{...input.context!,selected_element_ids:['foreign:component']}},'https://test.invalid'),(error:any)=>error.code==='AI_ELEMENT_SCOPE');
  }
 });
 await test('Public manufacturer catalog imports once, retains provenance, plans a real size and blocks technical release',async()=>{
  const imported=await call(owner,'catalog.reference.import');assert([0,28].includes(imported.added));const repeated=await call(owner,'catalog.reference.import');assert.equal(repeated.added,0);
  await assert.rejects(()=>call(employee,'catalog.reference.import'),(error:any)=>error.code==='FORBIDDEN');
  const search=await searchPlanningProducts(owner,{q:'253009'});assert.equal(search.items.length,1);const product=search.items[0] as any;assert.equal(Number(product.width_mm),370);assert.equal(Number(product.depth_mm),480);assert.equal(product.height_mm,null);assert.equal(product.status,'source_reference');assert.equal(product.approved_at,null);assert.equal(product.availability_status,'unknown');assert(product.source_url.startsWith('https://pro.duravit.de/'));
  await assert.rejects(()=>withTenant(owner,db=>db.query('UPDATE product_variant_versions SET width_mm=999 WHERE id=$1',[product.id])),/public_product_reference_immutable/);
  assert.equal(await withTenant({...owner,legalEntityId:randomUUID()},db=>one(db,'SELECT id FROM product_variant_versions WHERE id=$1',[product.id])),null);
  const project=await call(owner,'planning.project.create',{name:'Synthetic sourced catalog '+randomUUID().slice(0,8),kind:'room_plan'}),id=randomUUID();
  const operation={type:'add_element',element:{id,kind:'catalog_object',label:'ME by Starck 253009',parentId:project.revision.snapshot.frames[0].id,phase:'planned',locked:false,sourceEvidenceVersionIds:[],transform:{position:{xMm:'0',yMm:'0',zMm:'0'},rotationDeg:{x:'0',y:'0',z:'0'}},productVariantVersionId:product.id,assetVersionId:null,accuracy:'approximate',footprint:rectangleContour('370','480'),connectionElementIds:[],clearanceElementIds:[]}};
  const changed=await call(owner,'planning.design.change',{base_revision_id:project.revision.id,operations:[operation]},project.variant);
  const saved=changed.revision.snapshot,e=saved.elements.find((row:any)=>row.id===id);assert.equal(e.productVariantVersionId,product.id);assert.equal(e.accuracy,'approximate');assert.equal(saved.measurements[e.heightMeasureId].reviewStatus,'unreviewed');
  await assert.rejects(()=>withTenant(owner,db=>validatePlanningReferences(db,owner,saved,true)),(error:any)=>error.code==='CATALOG_APPROVAL');
  const source=await withTenant(owner,db=>one<any>(db,'SELECT * FROM product_variant_versions WHERE id=$1',[product.id]));const revised=await call(owner,'catalog.product_version.revise',{reason:'Synthetic review to add original technical evidence'},source);assert.equal(revised.status,'draft');assert.equal(revised.previous_version_id,product.id);assert.equal(revised.approved_at,null);
 });
}
