import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {withTenant,one} from '@schubert/db';
import {executeCommand,loadPage,invalidateReads} from '@schubert/application';
import type {ActorContext} from '@schubert/contracts';
export async function appearanceIntegration(actor:(role:string)=>ActorContext,test:(label:string,run:()=>Promise<void>)=>Promise<void>){
 const employee=actor('Employee'),owner=actor('Owner');
 const call=(ctx:ActorContext,name:string,payload:object,version?:number,key=randomUUID())=>executeCommand(ctx,{name,payload,expectedVersion:version,idempotencyKey:key});
 let saved:any;
 await test('Personal appearance is idempotent, versioned, validated and isolated by actor and tenant',async()=>{
  const prior=await withTenant(employee,db=>one<any>(db,'SELECT * FROM user_preferences WHERE actor_id=$1',[employee.actorId])),key=randomUUID();
  saved=await call(employee,'account.appearance.update',{accent:'ocean',mode:'dark'},prior?.version??0,key);
  assert.deepEqual(await call(employee,'account.appearance.update',{accent:'ocean',mode:'dark'},prior?.version??0,key),JSON.parse(JSON.stringify(saved)));
  await assert.rejects(()=>call(employee,'account.appearance.update',{accent:'clay',mode:'light'},saved.version-1),(e:any)=>e.code==='VERSION_CONFLICT');
  await assert.rejects(()=>call(employee,'account.appearance.update',{accent:'url(javascript:bad)',mode:'dark'},saved.version));
  await assert.rejects(()=>call(employee,'account.appearance.update',{accent:'rose',mode:'light',actor_id:owner.actorId},saved.version));
  for(const ctx of [owner,{...employee,tenantId:randomUUID()},{...employee,legalEntityId:randomUUID()}])assert.equal(await withTenant(ctx,db=>one(db,'SELECT id FROM user_preferences WHERE id=$1',[saved.id])),null);
  assert.equal((await withTenant(owner,db=>db.query("UPDATE user_preferences SET accent='slate' WHERE id=$1 RETURNING id",[saved.id]))).rowCount,0);
  invalidateReads(employee);const page=await loadPage(employee,'account',new URL('https://test.invalid/account'));assert.equal(page.summary.appearance.accent,'ocean');assert.equal(page.summary.appearance.mode,'dark');
 });
 await test('Completing onboarding saves appearance atomically and rolls back both on conflict',async()=>{
  const prior=await withTenant(employee,db=>one<any>(db,'SELECT * FROM user_onboarding WHERE actor_id=$1',[employee.actorId]));
  await assert.rejects(()=>call(employee,'account.onboarding.update',{status:'completed',step:6,appearance:{accent:'violet',mode:'system'},appearanceVersion:saved.version-1},prior?.version),(e:any)=>e.code==='VERSION_CONFLICT');
  const unchanged=await withTenant(employee,db=>one<any>(db,'SELECT * FROM user_onboarding WHERE actor_id=$1',[employee.actorId]));assert.equal(unchanged?.version,prior?.version);
  const complete=await call(employee,'account.onboarding.update',{status:'completed',step:6,appearance:{accent:'violet',mode:'system'},appearanceVersion:saved.version},prior?.version);assert.equal(complete.status,'completed');
  const pref=await withTenant(employee,db=>one<any>(db,'SELECT * FROM user_preferences WHERE actor_id=$1',[employee.actorId]));assert.equal(pref.accent,'violet');assert.equal(pref.mode,'system');assert.equal(pref.version,saved.version+1);
 });
}
