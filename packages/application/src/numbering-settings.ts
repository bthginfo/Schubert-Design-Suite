import {z} from 'zod';
import {one} from '@schubert/db';
import {assertFreshAuth,assertVersion,requireRule,numberingDate,numberingScopes,formatNumber,validateNumberTemplate} from '@schubert/domain';
import {register} from './core.js';
import {lockNumbering,numberExists} from './numbering-engine.js';
register('settings.numbering.update','admin',async r=>{
 assertFreshAuth(r.ctx.reauthenticatedAt);
 const p=z.object({scope:z.string(),template:z.string().trim(),padding:z.number().int().min(1).max(10),annual:z.boolean(),next:z.number().int().min(1).max(2147483647),reason:z.string().trim().min(8).max(1000)}).strict().parse(r.payload);
 requireRule(numberingScopes.some(s=>s.scope===p.scope),'NUMBER_SCOPE','Einen unterstützten Nummernkreis auswählen.');
 try{validateNumberTemplate(p.template,p.padding,p.annual);}catch(e){requireRule(false,'NUMBER_TEMPLATE',(e as Error).message);}
 await lockNumbering(r.db,r.ctx,p.scope);
 const previous=await one<any>(r.db,'SELECT * FROM numbering_profiles WHERE legal_entity_id=$1 AND scope=$2 FOR UPDATE',[r.ctx.legalEntityId,p.scope]);
 if(previous)assertVersion(previous.version,r.command.expectedVersion);
 const date=numberingDate(),year=p.annual?date.year:0;
 const counter=await one<any>(r.db,'SELECT * FROM number_counters WHERE legal_entity_id=$1 AND scope=$2 AND year=$3 FOR UPDATE',[r.ctx.legalEntityId,p.scope,year]);
 requireRule(!counter?.locked,'NUMBER_CIRCLE_LOCKED','Dieser Nummernkreis ist bis zum Wiederherstellungsabgleich gesperrt.');
 requireRule(p.next>Number(counter?.last_value??0),'NUMBER_BACKWARDS','Die nächste Nummer muss über dem bereits verbrauchten Stand liegen. Ein Zurücksetzen ist nicht möglich.',409);
 requireRule(!await numberExists(r.db,r.ctx,p.scope,formatNumber(p.template,p.padding,p.next,date)),'NUMBER_ALREADY_USED','Die vorgeschlagene nächste Nummer ist bereits vergeben.',409);
 const fields={scope:p.scope,template:p.template,padding:p.padding,annual:p.annual,notes:p.reason};
 const profile=previous?await r.update('numbering_profiles',previous.id,fields,previous.version):await r.insert('numbering_profiles',fields);
 await r.db.query('INSERT INTO number_counters(tenant_id,legal_entity_id,scope,year,last_value)VALUES($1,$2,$3,$4,$5)ON CONFLICT(tenant_id,legal_entity_id,scope,year)DO UPDATE SET last_value=EXCLUDED.last_value',[r.ctx.tenantId,r.ctx.legalEntityId,p.scope,year,p.next-1]);
 return {...profile,next:p.next,year,preview:formatNumber(p.template,p.padding,p.next,date)};
});
