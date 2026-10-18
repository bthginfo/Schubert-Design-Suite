import {one,ident,type DbClient} from '@schubert/db';
import {numberingDate,numberingScopes,formatNumber,validateNumberTemplate} from '@schubert/domain';
import {requireRule} from '@schubert/domain';
import {moduleBySlug,type ActorContext} from '@schubert/contracts';
export async function lockNumbering(db:DbClient,ctx:ActorContext,scope:string){await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[ctx.tenantId+':'+ctx.legalEntityId+':numbering:'+scope]);}
export async function numberExists(db:DbClient,ctx:ActorContext,scope:string,number:string){
 const table=numberingScopes.find(s=>s.scope===scope)?.table??moduleBySlug(scope)?.table;
 return !!await one(db,`SELECT 1 FROM numbering_allocations WHERE legal_entity_id=$1 AND scope=$2 AND number=$3 ${table?`UNION ALL SELECT 1 FROM ${ident(table)} WHERE legal_entity_id=$1 AND number=$3`:''} LIMIT 1`,[ctx.legalEntityId,scope,number]);
}
export async function allocateNumber(db:DbClient,ctx:ActorContext,scope:string,prefix:string){
 await lockNumbering(db,ctx,scope);
 const date=numberingDate(),profile=await one<any>(db,'SELECT template,padding,annual FROM numbering_profiles WHERE legal_entity_id=$1 AND scope=$2',[ctx.legalEntityId,scope]);
 const template=profile?.template??prefix+'-{JJJJ}-{NR}',padding=profile?.padding??5,year=profile?.annual===false?0:date.year;
 validateNumberTemplate(template,padding,profile?.annual??true);
 const counter=await one<any>(db,`INSERT INTO number_counters(tenant_id,legal_entity_id,scope,year,last_value)VALUES($1,$2,$3,$4,1)ON CONFLICT(tenant_id,legal_entity_id,scope,year) DO UPDATE SET last_value=number_counters.last_value+1 WHERE NOT number_counters.locked AND number_counters.last_value<2147483647 RETURNING last_value`,[ctx.tenantId,ctx.legalEntityId,scope,year]);
 requireRule(counter,'NUMBER_CIRCLE_LOCKED','Der Nummernkreis ist gesperrt oder ausgeschöpft. Einstellungen prüfen.');
 const number=formatNumber(template,padding,counter.last_value,date);
 requireRule(!await numberExists(db,ctx,scope,number),'NUMBER_ALREADY_USED','Diese Nummer wurde bereits verwendet. Der Administrator muss den nächsten freien Stand im Nummernkreis einstellen.',409);
 await db.query('INSERT INTO numbering_allocations(tenant_id,legal_entity_id,scope,number,sequence,year,actor_id)VALUES($1,$2,$3,$4,$5,$6,$7)',[ctx.tenantId,ctx.legalEntityId,scope,number,counter.last_value,year,ctx.actorId]);
 return number;
}
