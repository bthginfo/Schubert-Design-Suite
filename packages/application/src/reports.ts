import {z} from 'zod';
import {one,rows,ident} from '@schubert/db';
import {assertFreshAuth,assertVersion,requireRule,dec} from '@schubert/domain';
import {register,getRecord,hash,type Runtime} from './core.js';
import {reportDetails,reportRange,metricRegistry,REPORT_DEFINITION_VERSION} from './report-data.js';
import {assertDocumentAccess} from './document-access.js';
const decimal=z.union([z.string(),z.number()]).transform(v=>String(v).replace(',','.')).refine(v=>/^-?\d+(?:\.\d{1,6})?$/.test(v));
const schemas={
 cost_estimate:z.object({order_id:z.uuid(),as_of:z.iso.date(),uncommitted_remaining_amount:decimal.refine(v=>dec(v).gte(0)),currency:z.string().regex(/^[A-Z]{3}$/),cost_level:z.literal('direct'),basis:z.string().min(10).max(10000),rule_version_id:z.uuid()}),
 valuation:z.object({order_id:z.uuid(),effective_on:z.iso.date(),value_net:decimal.refine(v=>dec(v).gte(0)),currency:z.string().regex(/^[A-Z]{3}$/),basis:z.string().min(10).max(10000),rule_version_id:z.uuid()}),
 liquidity:z.object({bank_account_id:z.uuid(),as_of:z.iso.date(),amount:decimal,currency:z.string().regex(/^[A-Z]{3}$/),source_document_id:z.uuid().optional(),source_document_version_id:z.uuid().optional()})
};
async function validateBasis(r:Runtime,data:any,kind:string){
 if(kind!=='liquidity'){
  const order=await getRecord(r.db,'orders',data.order_id);requireRule(order.currency===data.currency,'REPORT_CURRENCY','Schätzung und Auftrag müssen dieselbe Währung haben. Für eine Umrechnung ist eine eigene bestätigte Grundlage erforderlich.');
  const rule=await getRecord(r.db,'rule_versions',data.rule_version_id),on=data.as_of??data.effective_on;
  requireRule(rule.status==='approved'&&rule.approved_by&&['reports','controlling','cost_estimate','valuation','performance_valuation'].includes(rule.domain)&&(!rule.valid_from||new Date(rule.valid_from).toISOString().slice(0,10)<=on)&&(!rule.valid_until||new Date(rule.valid_until).toISOString().slice(0,10)>=on),'REPORT_RULE','Eine fachlich bestätigte und am Stichtag gültige Bewertungsregel aus dem Bereich controlling oder reports auswählen.');
 }else{
  const account=await getRecord(r.db,'bank_account_versions',data.bank_account_id);requireRule(!account.party_id&&account.verified_at,'LIQUIDITY_ACCOUNT','Ein eigenes bestätigtes Bankkonto auswählen.');
  if(data.source_document_id){const doc=await getRecord(r.db,'documents',data.source_document_id);data.source_document_version_id=doc.current_version_id;delete data.source_document_id;}
  requireRule(data.source_document_version_id,'LIQUIDITY_SOURCE','Den geprüften Kontoauszug der Eröffnung auswählen.');const v=await getRecord(r.db,'document_versions',data.source_document_version_id),doc=await getRecord(r.db,'documents',v.document_id);await assertDocumentAccess(r.db,r.ctx,doc);requireRule(doc.status==='available'&&v.status==='available','LIQUIDITY_SOURCE','Die Originalversion des Kontoauszugs muss geprüft verfügbar sein.');
 }
}
for(const [kind,table]of Object.entries({cost_estimate:'cost_estimates',valuation:'performance_valuations',liquidity:'liquidity_openings'})){
 for(const action of ['create','update'])register('reports.'+kind+'.'+action,'finance',async r=>{
  const record=action==='update'?await getRecord(r.db,table,r.command.id,true):null;if(record){assertVersion(record.version,r.command.expectedVersion);requireRule(record.status==='draft','REPORT_IMMUTABLE','Bestätigte Grundlagen erhalten eine neue Version als eigenen Entwurf.');}
  const data=(schemas[kind as keyof typeof schemas]as z.ZodType<any>).parse({...record,...r.payload});await validateBasis(r,data,kind);
  return record?r.update(table,record.id,data,record.version):r.insert(table,{...data,status:'draft'});
 });
 register('reports.'+kind+'.approve','finance',async r=>{assertFreshAuth(r.ctx.reauthenticatedAt);const record=await getRecord(r.db,table,r.command.id,true);assertVersion(record.version,r.command.expectedVersion);requireRule(record.status==='draft','REPORT_IMMUTABLE','Nur den noch unbestätigten Entwurf freigeben.');requireRule(String(r.payload.reason??'').trim().length>=10,'REPORT_APPROVAL','Prüfumfang und fachliche Grundlage nachvollziehbar bestätigen.');await validateBasis(r,{...record},kind);return r.update(table,record.id,{status:'approved',approved_by:r.ctx.actorId,approved_at:new Date(),notes:r.payload.reason},record.version);});
}
export async function ensureMetricRegistry(r:Runtime){
 const current=await rows<any>(r.db,'SELECT key,definition_version FROM metric_definitions'),existing=new Set(current.map(x=>x.key+':'+x.definition_version));
 for(const definition of metricRegistry)if(!existing.has(definition.key+':'+definition.definition_version)){const {sources,...data}=definition;await r.insert('metric_definitions',{...data,status:'published'});}
}
register('reports.snapshot.create','reports',async r=>{
 const p=z.object({from:z.iso.date(),to:z.iso.date(),business_unit:z.enum(['bath','stone','memorial','service']).optional()}).parse(r.payload),url=new URL('https://reports.invalid/');url.search=new URLSearchParams(p).toString();reportRange(url);
 await r.db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[r.ctx.tenantId+':metric-definitions']);await ensureMetricRegistry(r);
 const snapshot=JSON.parse(JSON.stringify(await reportDetails(r.db,r.ctx,url))),definitions=Object.fromEntries(metricRegistry.map(x=>[x.key,x.definition_version]));
 const record=await r.insert('report_snapshots',{name:'Controlling '+p.from+' bis '+p.to,filters:p,definition_version:REPORT_DEFINITION_VERSION,definition_versions:definitions,data_as_of:snapshot.as_of,snapshot,content_hash:hash(snapshot),currency:snapshot.context.currency,status:'frozen'});
 await r.insert('job_runs',{name:'Eingefrorenen Bericht mit Tabellen exportieren',job_type:'reports.export',payload:{reportId:record.id,contentHash:record.content_hash},status:'pending'});return{id:record.id,version:record.version,document_id:null,message:'Der genaue Berichtstand ist eingefroren. Das private Exportpaket wird erstellt.'};
});
register('reports.recommendation.feedback','finance',async r=>{
 const p=z.object({outcome:z.enum(['done','deferred','not_applicable']),reason:z.string().min(5).max(4000),from:z.iso.date().optional(),to:z.iso.date().optional(),business_unit:z.enum(['bath','stone','memorial','service']).optional()}).parse(r.payload);
 const url=new URL('https://reports.invalid/');for(const k of ['from','to','business_unit']as const)if(p[k])url.searchParams.set(k,p[k]);const report=await reportDetails(r.db,r.ctx,url),source=report.recommendations.find((x:any)=>x.id===r.command.id);requireRule(source,'RECOMMENDATION_CHANGED','Der Hinweis gehört nicht mehr zum aktuellen Berichtsstand. Auswertung aktualisieren.',409);
 const old=await one<any>(r.db,'SELECT * FROM recommendation_feedback WHERE recommendation_id=$1 FOR UPDATE',[source.id]);if(old)assertVersion(old.version,r.command.expectedVersion);else requireRule(!r.command.expectedVersion||r.command.expectedVersion===1,'VERSION_CONFLICT','Hinweis wurde inzwischen geändert.',409);
 const data={recommendation_id:source.id,outcome:p.outcome,reason:p.reason,source_snapshot:source,status:'recorded'};return old?r.update('recommendation_feedback',old.id,data,old.version):r.insert('recommendation_feedback',{id:source.id,...data});
});
register('purchasing.material_requirement.approve','purchasing',async r=>{const record=await getRecord(r.db,'material_requirements',r.command.id,true);assertVersion(record.version,r.command.expectedVersion);requireRule(record.status==='draft','MATERIAL_REQUIREMENT_STATE','Nur ungeprüften Bedarf bestätigen.');await getRecord(r.db,'orders',record.order_id);const product=await getRecord(r.db,'products',record.product_id);requireRule(product.unit===record.unit&&dec(record.quantity).gt(0),'MATERIAL_REQUIREMENT_UNIT','Artikel, Mengeneinheit und positive bestätigte Bedarfsmenge prüfen.');requireRule(record.source_document_version_id||record.source_revision_id,'MATERIAL_REQUIREMENT_SOURCE','Bestätigten Planstand oder geprüften Bedarfsbeleg angeben.');if(record.source_revision_id){const revision=await getRecord(r.db,'design_revisions',record.source_revision_id);requireRule(revision.status==='approved','MATERIAL_REQUIREMENT_SOURCE','Der Planstand ist noch nicht technisch freigegeben.');}if(record.source_document_version_id){const v=await getRecord(r.db,'document_versions',record.source_document_version_id),doc=await getRecord(r.db,'documents',v.document_id);await assertDocumentAccess(r.db,r.ctx,doc);requireRule(doc.status==='available'&&v.status==='available','MATERIAL_REQUIREMENT_SOURCE','Bedarfsbeleg muss geprüft verfügbar sein.');}return r.update('material_requirements',record.id,{status:'approved',approved_at:new Date(),approved_by:r.ctx.actorId},record.version);});
