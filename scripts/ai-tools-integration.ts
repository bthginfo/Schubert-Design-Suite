import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {ActorContext} from '@schubert/contracts';
import {ASSISTANT_READ_RESULT_BYTES} from '@schubert/contracts';
import {withTenant,one,insert,update} from '@schubert/db';
import {executeCommand,baseData,createAssistantReadTools,assistantInputSchema,prepareAssistantContext} from '@schubert/application';
import {assistant} from '@schubert/ai';
import {compactToolEvidence} from '../packages/application/src/assistant-tools.js';
import {planningDraftOperations} from '../packages/ai/src/planning-draft.js';

/** Actual restricted PostgreSQL + actual SDK; OpenAI transport alone is synthetic. */
export async function aiToolsIntegration(actor:(role:string)=>ActorContext,test:(label:string,run:()=>Promise<void>)=>Promise<void>){
  const owner=actor('Owner'),unique='TEST-AI-TOOLS-'+randomUUID(),call=(name:string,payload:any,record?:any)=>executeCommand(owner,{name,payload,id:record?.id,expectedVersion:record?.version,idempotencyKey:randomUUID()});
  const plan=await call('planning.project.create',{name:unique,kind:'memorial'});
  const ready=await call('planning.design.change',{base_revision_id:plan.revision.id,operations:planningDraftOperations({snapshot:plan.revision.snapshot},{kind:'memorial_slab',label:'TEST Stein',widthMm:'800',heightMm:'1200',thicknessMm:'160'})},plan.variant);
  const prepared=await prepareAssistantContext(owner,assistantInputSchema.parse({message:unique,context:{path:'studio/'+plan.project.id,variantId:ready.variant.id}}),'http://localhost');
  const tools=createAssistantReadTools(owner,prepared.context);
  const ids=await withTenant(owner,async db=>{
    const base=baseData(owner),visible:string[]=[];
    for(let i=0;i<8;i++){
      const spec=await insert(db,'material_specs',{...base,name:unique+' material '+i,status:'active',kind:'stone'});
      const version=await insert(db,'material_spec_versions',{...base,name:unique+' material '+i,status:'source_reference',material_spec_id:spec.id,revision:1,thickness_mm:'160',surface:'poliert',content_hash:'d'.repeat(64),properties:{sourceCatalog:'synthetic-only',sourceUrl:'https://source.invalid/material'},notes:'PRIVATE-NOTES-NOT-FOR-AI'});
      await update(db,'material_specs',spec.id,{active_version_id:version.id});visible.push(version.id);
    }
    const draft=await insert(db,'material_specs',{...base,name:unique+' hidden draft',status:'active'});
    const hidden=await insert(db,'material_spec_versions',{...base,name:unique+' hidden draft',material_spec_id:draft.id,status:'draft',revision:1});
    const product=await insert(db,'products',{...base,name:unique+' product',kind:'stone_piece',active:true,status:'active'});
    const variant=await insert(db,'product_variants',{...base,name:'Synthetic variant',product_id:product.id});
    const version=await insert(db,'product_variant_versions',{...base,name:unique+' product version',product_variant_id:variant.id,revision:1,status:'source_reference',content_hash:'c'.repeat(64),source_url:'https://source.invalid/product',validation_report:{kind:'manufacturer_public_reference',sourceHash:'c'.repeat(64),publicSourceKey:'synthetic-tools-only-'+unique,privateNotes:'PRIVATE-NOTES-NOT-FOR-AI'},notes:'PRIVATE-NOTES-NOT-FOR-AI',width_mm:'800',height_mm:'1200',depth_mm:'160'});
    await update(db,'product_variants',variant.id,{active_version_id:version.id});
    return{visible,hidden:hidden.id,product:version.id};
  });
  await test('AI catalog reads return six actual sourced materials without internal notes or false approval',async()=>{
    const result:any=await tools.execute('lookup_planning_catalog',{kind:'materials',query:unique});
    assert.equal(result.items.length,6);assert.equal(result.possiblyMore,true);
    assert(result.items.every((i:any)=>ids.visible.includes(i.id)&&i.technicalApproval===false&&i.sourceHash==='d'.repeat(64)));
    assert(!JSON.stringify(result).includes(ids.hidden));assert(!JSON.stringify(result).includes('PRIVATE-NOTES'));
    assert(Buffer.byteLength(JSON.stringify(result))<=ASSISTANT_READ_RESULT_BYTES);
    const products:any=await tools.execute('lookup_planning_catalog',{kind:'products',query:unique});
    assert.equal(products.items.length,1);assert.equal(products.items[0].id,ids.product);assert.equal(products.items[0].technicalApproval,false);assert.equal(products.items[0].availability,'unknown');assert(!JSON.stringify(products).includes('PRIVATE-NOTES'));
  });
  await test('Plan inspection calculates the saved stone volume and keeps release evidence unresolved',async()=>{
    const result:any=await tools.execute('inspect_current_plan',{});
    assert.equal(result.revisionId,ready.revision.id);assert.equal(result.lines[0].volumeM3,'0.1536');assert.equal(result.release.grantsManufacturingApproval,false);assert(result.unresolvedMeasurements.length>0);
    const selected=createAssistantReadTools(owner,{...prepared.context,selectedElementIds:[ready.revision.snapshot.elements.find((e:any)=>e.kind==='stone_piece').id]});
    assert.equal((await selected.execute('inspect_current_plan',{}) as any).totals,null);
  });
  await test('Read tools cannot escape the current area, tenant, revision, membership or approved argument schema',async()=>{
    assert.equal(createAssistantReadTools(owner,{entityType:'reports'}).available.length,0);
    await assert.rejects(()=>tools.execute('inspect_current_plan',{tenantId:randomUUID()}));
    const foreign=createAssistantReadTools({...owner,tenantId:randomUUID()},prepared.context);
    await assert.rejects(()=>foreign.execute('inspect_current_plan',{}),(e:any)=>e.code==='SESSION_REVOKED');
    const forged=createAssistantReadTools({...actor('Finance'),permissions:owner.permissions},prepared.context);
    await assert.rejects(()=>forged.execute('inspect_current_plan',{}),(e:any)=>e.code==='FORBIDDEN');
    const stale=createAssistantReadTools(owner,{...prepared.context,baseVersion:0});
    await assert.rejects(()=>stale.execute('inspect_current_plan',{}),(e:any)=>e.code==='AI_STALE_CONTEXT');
    const member=await withTenant(owner,db=>one<any>(db,'SELECT * FROM memberships WHERE user_id=$1',[owner.actorId]));
    try{
      await withTenant(owner,db=>db.query('UPDATE memberships SET active=false WHERE id=$1',[member.id]));
      await assert.rejects(()=>tools.execute('inspect_current_plan',{}),(e:any)=>e.code==='SESSION_REVOKED');
    }finally{await withTenant(owner,db=>db.query('UPDATE memberships SET active=$1 WHERE id=$2',[member.active,member.id]));}
  });
  await test('Evidence truncation respects UTF-8 bytes, valid JSON and explicit omission markers',async()=>{
    const result=compactToolEvidence({items:Array.from({length:100},()=>({name:'ä'.repeat(100)})),meaning:'actual source references'});
    assert(result.truncated&&result.omittedForContext>0);assert(Buffer.byteLength(JSON.stringify(result))<=ASSISTANT_READ_RESULT_BYTES);assert(Array.isArray(JSON.parse(JSON.stringify(result)).items));
  });
  const nativeFetch=globalThis.fetch,priorKey=process.env.OPENAI_API_KEY;let requests:any[]=[],mode='read',attempts=0;
  const prefix='resp_tools_'+randomUUID().replaceAll('-','');
  try{
    process.env.OPENAI_API_KEY='synthetic-offline-read-tools-transport';
    globalThis.fetch=async(input,init)=>{
      const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
      assert.equal(url.origin,'https://api.openai.com');assert.equal(url.pathname,'/v1/responses');
      const body=JSON.parse(String(init?.body??(input instanceof Request?await input.text():'')));requests.push(body);
      if(mode==='failure'&&requests.length===2)return new Response(JSON.stringify({error:{type:'rate_limit_error',message:'synthetic'}}),{status:429,headers:{'content-type':'application/json'}});
      const item=requests.length===1&&mode!=='direct'?{type:'function_call',name:'lookup_planning_catalog',call_id:'synthetic_read',id:'fc_synthetic',arguments:JSON.stringify({kind:'materials',query:unique}),status:'completed'}:{type:'message',id:'msg_synthetic',role:'assistant',status:'completed',content:[{type:'output_text',annotations:[],text:JSON.stringify({text:'TEST: tatsächliche Quellenreferenzen ohne technische Freigabe.',targetId:null,baseVersion:null,commands:[],missingInputs:[],assumptions:[],clarifications:[],planningDraft:null,visualization:null})}]};
      return new Response(JSON.stringify({id:prefix+'_'+(++attempts),object:'response',status:'completed',created_at:Math.floor(Date.now()/1000),model:body.model,output:[item],usage:{input_tokens:1000,output_tokens:100,total_tokens:1100,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:0}}}),{status:200,headers:{'content-type':'application/json'}});
    };
    await test('Actual SDK and PostgreSQL account for two calls, one specialist read and a free repeat answer',async()=>{
      const message=unique+' sdk',result=await assistant(owner,message,prepared.context,'standard',[],undefined,tools);
      assert.equal(requests.length,2);assert.equal(result.toolsUsed.length,1);assert.equal(requests[1].tools.length,0);assert(!JSON.stringify(requests[1].input).includes('PRIVATE-NOTES'));
      const evidence=JSON.parse(requests[1].input[1].content).readOnlyEvidence[0];assert.equal(evidence.result.items.length,6);
      const run=await withTenant(owner,db=>one<any>(db,"SELECT * FROM ai_runs WHERE actor_id=$1 AND provider_id LIKE $2 ORDER BY created_at DESC LIMIT 1",[owner.actorId,prefix+'%']));
      assert.equal(run.input_tokens,2000);assert.equal(run.output_tokens,200);assert.equal(run.usage_details.read_tool_attempts,1);assert.equal(run.usage_details.read_tools[0].name,'lookup_planning_catalog');
      assert(!JSON.stringify(run.usage_details).includes(unique));
      const cached=await assistant(owner,message,prepared.context,'standard',[],undefined,tools);assert.equal(cached.cached,true);assert.equal(cached.actualCost,'0');assert.equal(requests.length,2);
    });
    await test('A failed final SDK call bills the completed selection and never retries a provider limit',async()=>{
      mode='failure';requests=[];
      await assert.rejects(()=>assistant(owner,unique+' fail',prepared.context,'standard',[],undefined,tools),(e:any)=>e.code==='AI_PROVIDER_LIMIT');
      assert.equal(requests.length,2);
      const run=await withTenant(owner,db=>one<any>(db,"SELECT * FROM ai_runs WHERE actor_id=$1 AND provider_id LIKE $2 ORDER BY created_at DESC LIMIT 1",[owner.actorId,prefix+'%']));
      assert.equal(run.usage_details.attempted_calls,2);assert.equal(run.usage_details.read_tool_attempts,1);assert.equal(run.input_tokens,1000);assert(Number(run.cost_actual)>0);
    });
    await test('An actual new saved revision invalidates an earlier specialist tool scope',async()=>{
      await call('planning.design.change',{base_revision_id:ready.revision.id,operations:[{type:'rename_element',elementId:ready.revision.snapshot.elements.find((e:any)=>e.kind==='stone_piece').id,label:'TEST Neuer Planstand'}]},ready.variant);
      await assert.rejects(()=>tools.execute('inspect_current_plan',{}),(e:any)=>e.code==='AI_STALE_CONTEXT');
    });
  }finally{
    globalThis.fetch=nativeFetch;
    if(priorKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=priorKey;
    await withTenant(owner,async db=>{
      const runs=await db.query("SELECT a.id,a.status,a.cost_actual,r.id reservation_id,r.budget_id,r.amount,r.settled FROM ai_runs a JOIN ai_budget_reservations r ON r.run_id=a.id WHERE a.actor_id=$1 AND a.provider_id LIKE $2 FOR UPDATE OF a,r",[owner.actorId,prefix+'%']);
      for(const run of runs.rows){
        await db.query('UPDATE ai_budgets SET spent=spent-$1::numeric,reserved=reserved-$2::numeric WHERE id=$3',[run.settled?run.cost_actual??'0':'0',run.settled?'0':run.amount,run.budget_id]);
        await db.query("UPDATE ai_budget_reservations SET settled=true,status='settled' WHERE id=$1",[run.reservation_id]);
        await db.query("UPDATE ai_runs SET task_type='read_tool_transport_test',usage_details=usage_details||$2::jsonb WHERE id=$1",[run.id,JSON.stringify({synthetic_transport:true,no_provider_charge:true,asserted_status:run.status})]);
      }
    });
  }
}
