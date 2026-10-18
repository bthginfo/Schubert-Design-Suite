import {one} from '@schubert/db';
import {appearanceSchema,type Appearance} from '@schubert/contracts';
import {assertVersion,requireRule} from '@schubert/domain';
import {register,type Runtime} from './core.js';

export async function saveAppearance(r:Runtime,value:Appearance,expectedVersion?:number){
 requireRule(r.ctx.actorType==='employee','FORBIDDEN','Die Darstellung gehört zu einem persönlichen internen Zugang.',403);
 await r.db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['appearance:'+r.ctx.tenantId+':'+r.ctx.legalEntityId+':'+r.ctx.actorId]);
 const previous=await one<any>(r.db,'SELECT * FROM user_preferences WHERE actor_id=$1 FOR UPDATE',[r.ctx.actorId]);
 if(previous){assertVersion(previous.version,expectedVersion);return r.update('user_preferences',previous.id,value,previous.version);}
 requireRule(expectedVersion===undefined||expectedVersion===0,'VERSION_CONFLICT','Ihre Darstellung wurde zwischenzeitlich geändert. Bitte neu laden.',409);
 return r.insert('user_preferences',{...value,actor_id:r.ctx.actorId});
}
register('account.appearance.update','account.self',r=>saveAppearance(r,appearanceSchema.parse(r.payload),r.command.expectedVersion));
