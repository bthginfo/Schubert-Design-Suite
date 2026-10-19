import {z} from 'zod';
import {one} from '@schubert/db';
import {assertVersion} from '@schubert/domain';
import {register} from './core.js';
import {appearanceSchema} from '@schubert/contracts';
import {saveAppearance} from './appearance.js';
register('account.onboarding.update','account.self',async r=>{
 const p=z.object({status:z.enum(['in_progress','completed','deferred']),step:z.number().int().min(0).max(20),guideVersion:z.union([z.literal(2),z.literal(3)]).optional(),appearance:appearanceSchema.optional(),appearanceVersion:z.number().int().nonnegative().optional()}).strict().parse(r.payload);
 await r.db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['onboarding:'+r.ctx.tenantId+':'+r.ctx.actorId]);
 const previous=await one<any>(r.db,'SELECT * FROM user_onboarding WHERE actor_id=$1 FOR UPDATE',[r.ctx.actorId]);
 if(previous)assertVersion(previous.version,r.command.expectedVersion);
 if(p.appearance)await saveAppearance(r,p.appearance,p.appearanceVersion);
 const progress={status:p.status,step:p.step};
 if(previous){return r.update('user_onboarding',previous.id,{...progress,guide_version:p.guideVersion??1},previous.version);}
 return r.insert('user_onboarding',{...progress,actor_id:r.ctx.actorId,guide_version:p.guideVersion??1});
});
