import {z} from 'zod';
import {rows,one} from '@schubert/db';
import {assertFreshAuth,assertPermission,assertVersion,requireRule,money,dec} from '@schubert/domain';
import {register,getRecord,hash,type Runtime} from './core.js';
import {assertDocumentAccess} from './document-access.js';

const kinds=['customers','suppliers','products','orders','invoices','payments','employees','historical_documents'] as const;
const countsSchema=z.object(Object.fromEntries(kinds.map(k=>[k,z.number().int().nonnegative()])) as Record<typeof kinds[number],z.ZodNumber>);
const currencySchema=z.object({invoice_net:z.string(),invoice_gross:z.string(),payment_incoming:z.string(),payment_outgoing:z.string(),receivable_open:z.string()});
const totalsSchema=z.object({counts:countsSchema,currencies:z.record(z.string().regex(/^[A-Z]{3}$/),currencySchema)});
function normalize(value:z.infer<typeof totalsSchema>){return{counts:value.counts,currencies:Object.fromEntries(Object.entries(value.currencies).filter(([,v])=>Object.values(v).some(n=>!dec(n).eq(0))).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,Object.fromEntries(Object.entries(v).map(([k,n])=>[k,money(n)]))]))};}
async function locked(r:Runtime){const c=await getRecord(r.db,'migration_cutovers',r.command.id,true);assertVersion(c.version,r.command.expectedVersion);return c;}
async function actual(r:Runtime,id:string){
 const batches=await rows<any>(r.db,'SELECT id,status,version,is_final_delta FROM import_batches WHERE cutover_id=$1 ORDER BY id',[id]);
 requireRule(batches.length&&batches.every(b=>b.status==='committed')&&batches.some(b=>b.is_final_delta),'CUTOVER_BATCHES','Alle zugeordneten Chargen müssen übernommen sein; ein finaler Deltaimport nach dem Schreibstopp/Watermark ist erforderlich.');
 const mapped=await rows<any>(r.db,`SELECT DISTINCT m.entity_type,m.entity_id FROM legacy_id_map m JOIN import_batches b ON b.id=m.batch_id WHERE b.cutover_id=$1 AND m.status='committed'`,[id]);
 const counts=Object.fromEntries(kinds.map(k=>[k,mapped.filter(m=>m.entity_type===k).length])) as z.infer<typeof countsSchema>;
 const invoices=mapped.filter(m=>m.entity_type==='invoices').map(m=>m.entity_id),payments=mapped.filter(m=>m.entity_type==='payments').map(m=>m.entity_id);
 const values=await rows<any>(r.db,`WITH i AS(SELECT currency,sum(net_total) net,sum(gross_total) gross FROM invoices WHERE id=ANY($1::uuid[]) GROUP BY currency),p AS(SELECT currency,sum(amount) FILTER(WHERE direction='incoming') incoming,sum(amount) FILTER(WHERE direction='outgoing') outgoing FROM payments WHERE id=ANY($2::uuid[]) GROUP BY currency),o AS(SELECT currency,sum(open_amount) balance FROM receivables WHERE invoice_id=ANY($1::uuid[]) GROUP BY currency),currencies AS(SELECT currency FROM i UNION SELECT currency FROM p UNION SELECT currency FROM o) SELECT c.currency,COALESCE(i.net,0)::text invoice_net,COALESCE(i.gross,0)::text invoice_gross,COALESCE(p.incoming,0)::text payment_incoming,COALESCE(p.outgoing,0)::text payment_outgoing,COALESCE(o.balance,0)::text receivable_open FROM currencies c LEFT JOIN i USING(currency) LEFT JOIN p USING(currency) LEFT JOIN o USING(currency) ORDER BY c.currency`,[invoices,payments]);
 const missingOriginals=await one<any>(r.db,"SELECT count(*)::int n FROM invoices WHERE id=ANY($1::uuid[]) AND(historical_import IS DISTINCT FROM true OR artifact_status<>'archived' OR source_document_version_id IS NULL)",[invoices]);
 requireRule(missingOriginals.n===0,'CUTOVER_ARCHIVE','Historische Rechnungsoriginale müssen vor dem Abschluss unverändert archiviert sein.');
 return{totals:normalize({counts,currencies:Object.fromEntries(values.map(v=>{const{currency,...numbers}=v;return[currency,numbers];}))}),batches};
}
register('migration.cutover.create','imports',async r=>{const p=z.object({name:z.string().min(3).max(250),source_system:z.enum(['diestein','drive','csv','xlsx','xml'])}).parse(r.payload);return r.insert('migration_cutovers',{...p,status:'draft'});});
register('migration.cutover.fence','imports',async r=>{
 assertPermission(r.ctx.permissions,'finance');assertFreshAuth(r.ctx.reauthenticatedAt);const c=await locked(r);requireRule(c.status==='draft','CUTOVER_STATE','Quellsperre ist bereits bestätigt.');
 const p=z.object({source_fence_kind:z.enum(['write_stop','watermark']),source_fence_statement:z.string().min(20).max(10000),source_watermark:z.string().max(2000).optional(),evidence_document_version_id:z.uuid(),source_totals:totalsSchema}).parse(r.payload);
 requireRule(p.source_fence_kind!=='watermark'||(p.source_watermark?.trim().length??0)>=3,'CUTOVER_WATERMARK','Den konsistenten Änderungs-Watermark aus dem Altsystem eintragen.');const v=await getRecord(r.db,'document_versions',p.evidence_document_version_id),d=await getRecord(r.db,'documents',v.document_id);await assertDocumentAccess(r.db,r.ctx,d);requireRule(v.status==='available'&&d.status==='available','CUTOVER_EVIDENCE','Geprüften Nachweis der tatsächlichen Quellsperre beziehungsweise des Watermark-Verfahrens auswählen.');
 const legal=await getRecord(r.db,'legal_entities',r.ctx.legalEntityId,true);await r.update('legal_entities',legal.id,{recovery_locked:true},legal.version);
 return r.update('migration_cutovers',c.id,{...p,source_totals:normalize(p.source_totals),fenced_at:new Date(),status:'source_fenced'},c.version);
});
register('migration.cutover.attach','imports',async r=>{
 const c=await locked(r);requireRule(['draft','source_fenced'].includes(c.status),'CUTOVER_STATE','Abgeglichenen Schnitt nicht nachträglich verändern.');const p=z.object({batch_ids:z.array(z.uuid()).min(1).max(100),is_final_delta:z.boolean().default(false)}).parse(r.payload);
 requireRule(!p.is_final_delta||c.status==='source_fenced','CUTOVER_SOURCE_OPEN','Finalen Deltaimport erst nach bestätigter Alt-Schreibsperre beziehungsweise gesichertem Watermark zuordnen.');
 for(const id of [...new Set(p.batch_ids)]){const b=await getRecord(r.db,'import_batches',id,true);requireRule(!b.cutover_id&&b.source_system===c.source_system,'CUTOVER_BATCH_SCOPE','Charge ist bereits zugeordnet oder stammt aus einem anderen Quellsystem.');requireRule(!p.is_final_delta||new Date(b.created_at)>=new Date(c.fenced_at),'CUTOVER_DELTA_DATE','Finale Deltacharge erst nach dem bestätigten Quellschnitt anlegen.');await r.update('import_batches',b.id,{cutover_id:c.id,is_final_delta:p.is_final_delta},b.version);}
 return r.update('migration_cutovers',c.id,{status:c.status},c.version);
});
register('migration.cutover.reconcile','imports',async r=>{
 assertPermission(r.ctx.permissions,'finance');const c=await locked(r);requireRule(['source_fenced','reconciled'].includes(c.status),'CUTOVER_STATE','Zuerst tatsächliche Quellsperre und finalen Deltaimport bestätigen.');const result=await actual(r,c.id),matches=hash(result.totals)===hash(c.source_totals);
 return r.update('migration_cutovers',c.id,{reconciliation:{...result,matches,expected:c.source_totals,checkedAt:new Date().toISOString(),contentHash:hash(result)},status:matches?'reconciled':'source_fenced'},c.version);
});
register('migration.cutover.release','imports',async r=>{
 assertPermission(r.ctx.permissions,'finance');assertFreshAuth(r.ctx.reauthenticatedAt);const c=await locked(r);requireRule(c.status==='reconciled'&&c.reconciliation?.matches,'CUTOVER_RECONCILIATION','Anzahlen, Rechnungsbeträge, offene Posten und Zahlungen müssen vollständig übereinstimmen.');
 const statement=z.string().min(30).max(10000).parse(r.payload.statement),result=await actual(r,c.id);requireRule(hash(result)===c.reconciliation.contentHash&&hash(result.totals)===hash(c.source_totals),'CUTOVER_CHANGED','Bestand hat sich nach dem Abgleich geändert. Erneut abgleichen.',409);
 const another=await one(r.db,"SELECT id FROM migration_cutovers WHERE id<>$1 AND status IN('source_fenced','reconciled') LIMIT 1",[c.id]);requireRule(!another,'CUTOVER_OTHER_OPEN','Ein anderer finaler Datenschnitt ist noch offen.');
 for(const table of ['invoices','quotes','orders','payments'])await r.db.query(`INSERT INTO number_counters(tenant_id,legal_entity_id,scope,year,last_value,locked) SELECT $1,$2,$3,(regexp_match(number,'-(\\d{4})-(\\d+)$'))[1]::int,max((regexp_match(number,'-(\\d{4})-(\\d+)$'))[2]::bigint),false FROM ${table} WHERE number~'-[0-9]{4}-[0-9]+$' GROUP BY (regexp_match(number,'-(\\d{4})-(\\d+)$'))[1] ON CONFLICT(tenant_id,legal_entity_id,scope,year) DO UPDATE SET last_value=GREATEST(number_counters.last_value,EXCLUDED.last_value)`,[r.ctx.tenantId,r.ctx.legalEntityId,table]);
 const legal=await getRecord(r.db,'legal_entities',r.ctx.legalEntityId,true);await r.update('legal_entities',legal.id,{recovery_locked:false},legal.version);return r.update('migration_cutovers',c.id,{status:'released',released_at:new Date(),released_by:r.ctx.actorId,release_statement:statement},c.version);
});

register('migration.cutover.update','imports',async r=>{const c=await locked(r);requireRule(c.status==='draft','CUTOVER_FROZEN','Den bestätigten Quellschnitt nicht nachträglich ändern.');const p=z.object({name:z.string().min(3).max(250),source_system:z.enum(['diestein','drive','csv','xlsx','xml'])}).parse(r.payload);return r.update('migration_cutovers',c.id,p,c.version);});
