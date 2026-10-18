import {z} from 'zod';
import {one} from '@schubert/db';
import {assertVersion} from '@schubert/domain';
import {register} from './core.js';
register('account.onboarding.update','account.self',async r=>{
 const p=z.object({status:z.enum(['in_progress','completed','deferred']),step:z.number().int().min(0).max(20)}).strict().parse(r.payload);
 await r.db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['onboarding:'+r.ctx.tenantId+':'+r.ctx.actorId]);
 const previous=await one<any>(r.db,'SELECT * FROM user_onboarding WHERE actor_id=$1 FOR UPDATE',[r.ctx.actorId]);
 if(previous){assertVersion(previous.version,r.command.expectedVersion);return r.update('user_onboarding',previous.id,{...p,guide_version:1},previous.version);}
 return r.insert('user_onboarding',{...p,actor_id:r.ctx.actorId,guide_version:1});
});
