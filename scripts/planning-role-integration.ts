import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {ActorContext} from '@schubert/contracts';
import {executeCommand, loadPage} from '@schubert/application';
import {planningDraftOperations} from '../packages/ai/src/planning-draft.js';

export async function planningRoleIntegration(actor: (role:string)=>ActorContext, test:(label:string,run:()=>Promise<void>)=>Promise<void>) {
  for (const role of ['Office', 'Employee']) for (const kind of ['memorial', 'room_plan'] as const) {
    await test(`${role} creates, saves and reopens an editable ${kind} draft without manufacturing release`, async()=>{
      const context=actor(role);
      const plan=await executeCommand(context,{name:'planning.project.create',idempotencyKey:randomUUID(),payload:{name:`TEST UX 28.10.2026 ${role} ${kind} ${randomUUID().slice(0,8)}`,kind}});
      const draft=kind==='memorial'?{kind:'memorial_assembly',label:'TEST Grabstein',shape:'round_arch',widthMm:'600',heightMm:'900',thicknessMm:'120',base:{widthMm:'700',heightMm:'140',depthMm:'180'},inscription:'MARIA MUSTER\n1950 - 2025\nIn liebevoller Erinnerung',materialWish:'grauer Granit'}:{kind:'rectangular_room',label:'TEST Bad',clearWidthMm:'3000',clearDepthMm:'2400',heightMm:'2500',wallThicknessMm:'115'};
      const operations=planningDraftOperations({snapshot:plan.revision.snapshot},draft);
      const saved=await executeCommand(context,{name:'planning.design.change',id:plan.variant.id,expectedVersion:plan.variant.version,idempotencyKey:randomUUID(),payload:{base_revision_id:plan.revision.id,operations}});
      const reopened=await loadPage(context,'studio/'+plan.project.id,new URL(`https://test.invalid/studio/${plan.project.id}?variant=${plan.variant.id}`));
      assert.equal(reopened.view,'studio');
      assert.equal(reopened.related.revisions[0].id,saved.revision.id);
      assert.deepEqual(reopened.related.revisions[0].snapshot,saved.revision.snapshot);
      assert(saved.revision.snapshot.elements.some((element:any)=>element.kind===(kind==='memorial'?'stone_piece':'room')));
      assert.equal(saved.revision.revision_number,2);
      if(kind==='memorial'){
        assert.equal(saved.revision.snapshot.elements.filter((element:any)=>element.kind==='stone_piece').length,2);
        assert.equal(saved.revision.snapshot.elements.find((element:any)=>element.kind==='inscription').exactText,draft.inscription);
      }
      await assert.rejects(()=>executeCommand(context,{name:'planning.approval.create',idempotencyKey:randomUUID(),payload:{variant_id:plan.variant.id,revision_id:saved.revision.id,kind:'technical',statement:'TEST: Freigabe muss ohne Qualifikation gesperrt bleiben.'}}),(error:any)=>error.code==='FORBIDDEN');
    });
  }
}
