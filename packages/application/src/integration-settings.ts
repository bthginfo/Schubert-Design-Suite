import {z} from 'zod';
import {requireRule,assertFreshAuth,dec} from '@schubert/domain';
import {one} from '@schubert/db';
import {sealConfiguration,openConfiguration,connectionIn} from '@schubert/adapters';
import {register,hash,type Runtime} from './core.js';
import {DEFAULT_TEXT_MODEL,DEFAULT_DESIGN_MODEL,DEFAULT_OFFICE_MODEL,DEFAULT_QUICK_MODEL,DEFAULT_MAX_REQUEST_COST,DEFAULT_DESIGN_MAX_REQUEST_COST,DEFAULT_MONTHLY_BUDGET} from '../../ai/src/model-routing.js';
import {AI_PROVIDER,MEDIA_PROVIDER,claudeEfforts,claudeModelPrices,workspaceIdPattern} from '../../ai/src/claude.js';
const positive=z.string().refine(value=>{try{return dec(value).gt(0);}catch{return false;}},'Positiven Betrag angeben.');
async function saveConnection(r:Runtime,provider:string,configuration:Record<string,unknown>,secretReference:string|null){
 const prior=await connectionIn(r.db,provider),data={provider,configuration,secret_reference:secretReference,fingerprint:hash(configuration),status:'configured'};
 const current=prior?await r.update('integration_connections',prior.id,data,prior.version):await r.insert('integration_connections',data);
 const snapshot=await r.insert('integration_connection_versions',{connection_id:current.id,provider,configuration,secret_reference:secretReference,fingerprint:current.fingerprint,source_version:current.version,status:'frozen'});
 return r.update('integration_connections',current.id,{current_version_id:snapshot.id},current.version);
}
register('integrations.archive.update','admin.integrations',async r=>{
 assertFreshAuth(r.ctx.reauthenticatedAt);const p=z.object({provider:z.literal('vercel_blob'),storageLimitMb:z.coerce.number().positive().max(800).default(800),monthlyTransferLimitMb:z.coerce.number().positive().max(800).default(800),monthlyAdvancedOps:z.coerce.number().int().positive().max(1500).default(1500),monthlySimpleOps:z.coerce.number().int().positive().max(5000).default(5000),approvalStatement:z.string().min(20).max(4000)}).parse(r.payload);
 requireRule(process.env.BLOB_READ_WRITE_TOKEN,'ARCHIVE_STORAGE','Privater Vercel-Dateispeicher ist noch nicht verbunden.',503);
 const configuration={...p,providerDeletionLock:false,protection:'application_retention_sha256_audit',approvedAt:new Date().toISOString(),approvedBy:r.ctx.actorId},result=await saveConnection(r,'archive',configuration,null);
 await r.update('legal_entities',r.ctx.legalEntityId,{archive_verified:false,archive_region:process.env.VERCEL_REGION??'fra1'});return{id:result.id,version:result.version,...configuration,configured:true,verified:false};
});
register('integrations.archive.probe','admin.integrations',async r=>{assertFreshAuth(r.ctx.reauthenticatedAt);const connection=await connectionIn(r.db,'archive');requireRule(connection,'ARCHIVE_CONFIGURATION','Interne Archivgrenzen zuerst bestätigen.');return r.insert('job_runs',{name:'Privates Archiv und Anwendungssperren praktisch prüfen',job_type:'archive.probe',payload:{configurationHash:connection.fingerprint},status:'pending'});});
const effort=z.enum(claudeEfforts as unknown as [string,...string[]]);
const claudeModel=z.string().trim().min(1).max(150).regex(/^claude-[a-z0-9.-]+$/,'Eine Claude-Modellkennung wie claude-opus-5-5 angeben.');
const anthropicSettings=z.object({apiKey:z.string().trim().min(20).max(500).regex(/^sk-ant-/,'Claude-API-Schlüssel beginnen mit sk-ant-.').optional(),
 textModel:claudeModel.default(DEFAULT_TEXT_MODEL),designModel:claudeModel.default(DEFAULT_DESIGN_MODEL),
 effort:effort.default('low'),planningEffort:effort.default('medium'),designEffort:effort.default('high'),documentEffort:effort.default('medium'),quickEffort:effort.default('low'),
 // Office and quick models are published models so their rates are known; planning and review accept own model ids.
 officeModel:z.string().refine(id=>id in claudeModelPrices,'Ein veröffentlichtes Claude-Modell auswählen.').default(DEFAULT_OFFICE_MODEL),quickModel:z.string().refine(id=>id in claudeModelPrices,'Ein veröffentlichtes Claude-Modell auswählen.').default(DEFAULT_QUICK_MODEL),
 inputCostPerMillion:positive.optional(),outputCostPerMillion:positive.optional(),designInputCostPerMillion:positive.optional(),designOutputCostPerMillion:positive.optional(),
 maxRequestCost:positive.default(DEFAULT_MAX_REQUEST_COST),designMaxRequestCost:positive.default(DEFAULT_DESIGN_MAX_REQUEST_COST),monthlyBudget:positive.default(DEFAULT_MONTHLY_BUDGET),
 workspaceId:z.union([z.literal(''),z.string().trim().regex(workspaceIdPattern,'Workspace-ID im Format wrkspc_… angeben.')]).optional()});
/** Optional media provider: concept images and speech input. Text, vision and tools run on Claude. */
const mediaSettings=z.object({apiKey:z.string().min(20).max(500).optional(),transcriptionModel:z.string().max(150).optional(),imageModel:z.string().max(150).optional(),imageFallbackModel:z.string().max(150).default('gpt-image-2'),imageTextCostPerMillion:positive.default('5'),imageInputCostPerMillion:positive.default('8'),imageOutputCostPerMillion:positive.default('30'),imageMaxRequestCost:positive.default('0.5'),imageMaxOutputTokens:z.number().int().positive().max(100000).default(8192),imageMaxInputTokensPerReference:z.number().int().positive().max(100000).default(8192),transcriptionInputCostPerMillion:positive.default('1.25'),transcriptionOutputCostPerMillion:positive.default('5'),transcriptionMaxRequestCost:positive.default('0.031'),transcriptionMaxInputTokens:z.number().int().positive().max(1000000).default(16000),transcriptionMaxOutputTokens:z.number().int().positive().max(100000).default(2000)});
register('integrations.smtp.update','admin.integrations',async r=>{assertFreshAuth(r.ctx.reauthenticatedAt);const p=z.object({host:z.string().min(3).max(253).regex(/^[a-zA-Z0-9.-]+$/),port:z.union([z.literal(465),z.literal(587),z.literal(2525)]),user:z.string().min(1).max(320),from:z.email(),password:z.string().min(1).max(500).optional(),replyTo:z.email().optional()}).parse(r.payload);const prior=await connectionIn(r.db,'smtp');const secrets=prior?openConfiguration(r.ctx,'smtp',prior.secret_reference):{};if(p.password)secrets.password=p.password;requireRule(secrets.password,'SMTP_PASSWORD','SMTP-Passwort oder App-Passwort fehlt.');const {password,...configuration}=p;const result=await saveConnection(r,'smtp',configuration,sealConfiguration(r.ctx,'smtp',secrets));return {id:result.id,version:result.version,...configuration,hasPassword:true,configured:true};});
register('integrations.smtp.test','admin.integrations',async r=>{assertFreshAuth(r.ctx.reauthenticatedAt);const p=z.object({recipient:z.email()}).parse(r.payload);const settings=await connectionIn(r.db,'smtp');requireRule(settings,'SMTP_CONFIGURATION','Zuerst SMTP-Einstellungen speichern.');const email=await r.insert('outgoing_messages',{recipient:p.recipient,sender:settings.configuration.from,connection_version_id:settings.current_version_id,reply_to:settings.configuration.replyTo??null,attachment_version_ids:[],attachment_snapshot:[],subject:'SCHUBERT · SMTP-Verbindung prüfen',body:'Dies ist die ausdrücklich angeforderte Testnachricht der SCHUBERT Design Suite. Ein vom Mailserver angenommener Versand bestätigt noch keine Zustellung im Postfach.',message_id:'<smtp-test-'+r.command.idempotencyKey+'@schubert.local>',content_hash:hash({recipient:p.recipient,kind:'smtp-test'}),approved_by:r.ctx.actorId,approved_at:new Date(),status:'queued'});await r.insert('job_runs',{actor_id:r.ctx.actorId,job_type:'email.send',name:'Ausdrücklich angeforderte SMTP-Testmail',payload:{messageId:email.id,contentHash:email.content_hash,test:true},status:'pending'});return {id:email.id,status:'queued',message:'Die Testnachricht wurde zur tatsächlichen Übermittlung eingereiht.'};});
register('integrations.anthropic.update','admin.integrations',async r=>{
 assertFreshAuth(r.ctx.reauthenticatedAt);const p=anthropicSettings.parse(r.payload);
 // Published rates for known models are filled in; an unknown model needs explicit rates before it can be used.
 for(const [model,input,output] of [[p.textModel,'inputCostPerMillion','outputCostPerMillion'],[p.designModel,'designInputCostPerMillion','designOutputCostPerMillion']] as const){
  const known=claudeModelPrices[model];if(known){p[input]??=known.input;p[output]??=known.output;}
  requireRule(p[input]&&p[output],'AI_COST_PROFILE','Für '+model+' die aktuellen Ein- und Ausgabepreise je 1 Mio. Tokens angeben.');
 }
 requireRule(dec(p.maxRequestCost).lte(p.monthlyBudget)&&dec(p.designMaxRequestCost).lte(p.monthlyBudget),'AI_BUDGET','Die Obergrenzen je Aufruf dürfen das Monatsbudget nicht überschreiten.');
 const prior=await connectionIn(r.db,AI_PROVIDER),secrets=prior?openConfiguration(r.ctx,AI_PROVIDER,prior.secret_reference):{};
 if(p.apiKey)secrets.apiKey=p.apiKey;
 requireRule(secrets.apiKey||process.env.ANTHROPIC_API_KEY,'AI_KEY','Claude-API-Schlüssel fehlt. Ihn in der Claude Console unter API Keys erstellen.');
 const {apiKey,workspaceId,...profile}=p;const configuration={...profile,...(workspaceId?{workspaceId}:{}),provider:AI_PROVIDER,automaticEscalation:false,promptVersion:'schubert-design-claude-2026-11-26.1',billingCurrency:'USD'};
 const result=await saveConnection(r,AI_PROVIDER,configuration,secrets.apiKey?sealConfiguration(r.ctx,AI_PROVIDER,secrets):null);
 const period=new Date().toISOString().slice(0,7);const budget=await one<any>(r.db,'SELECT * FROM ai_budgets WHERE period=$1 AND legal_entity_id=$2 FOR UPDATE',[period,r.ctx.legalEntityId]);
 if(budget){requireRule(dec(p.monthlyBudget).gte(dec(budget.spent).add(budget.reserved)),'AI_BUDGET_COMMITTED','Bereits verbrauchte oder reservierte Kosten dürfen nicht unterschritten werden.');await r.update('ai_budgets',budget.id,{limit_amount:p.monthlyBudget},budget.version);}
 else await r.insert('ai_budgets',{period,limit_amount:p.monthlyBudget,spent:'0',reserved:'0',currency:'USD',status:'active'});
 return {id:result.id,version:result.version,...configuration,hasApiKey:true,configured:true};
});
register('integrations.openai.update','admin.integrations',async r=>{
 assertFreshAuth(r.ctx.reauthenticatedAt);const p=mediaSettings.parse(r.payload);
 const prior=await connectionIn(r.db,MEDIA_PROVIDER),secrets=prior?openConfiguration(r.ctx,MEDIA_PROVIDER,prior.secret_reference):{};
 if(p.apiKey)secrets.apiKey=p.apiKey;if(!secrets.apiKey&&process.env.OPENAI_API_KEY)secrets.apiKey=process.env.OPENAI_API_KEY;
 requireRule(secrets.apiKey,'MEDIA_KEY','Für Konzeptbilder und Spracheingabe einen OpenAI-Projektschlüssel angeben.');
 const {apiKey,...profile}=p;const configuration={...profile,purpose:'media',billingCurrency:'USD'};
 const result=await saveConnection(r,MEDIA_PROVIDER,configuration,sealConfiguration(r.ctx,MEDIA_PROVIDER,secrets));
 return {id:result.id,version:result.version,...configuration,hasApiKey:true,configured:true};
});

register('integrations.anthropic.test','admin.integrations',async r=>{assertFreshAuth(r.ctx.reauthenticatedAt);return r.insert('job_runs',{name:'Claude-Verbindung mit synthetischen Daten praktisch prüfen',job_type:'ai.probe',payload:{},status:'pending'});});

register('integrations.ai.usage.resolve','admin.integrations',async r=>{assertFreshAuth(r.ctx.reauthenticatedAt);const p=z.object({run_id:z.uuid(),actual_cost:z.string().refine(v=>{try{return dec(v).gte(0);}catch{return false;}}),reason:z.string().min(20)}).parse(r.payload),run=await one<any>(r.db,"SELECT * FROM ai_runs WHERE id=$1 AND status IN('outcome_unknown','cost_review') FOR UPDATE",[p.run_id]);requireRule(run,'AI_USAGE_REVIEW','Nur einen noch unklaren tatsächlich überprüften Anbieteraufruf abgleichen.');const reservation=await one<any>(r.db,'SELECT * FROM ai_budget_reservations WHERE run_id=$1 FOR UPDATE',[run.id]);requireRule(reservation&&!reservation.settled,'AI_USAGE_REVIEW','Die Reservierung wurde bereits abgerechnet.');const budget=await one<any>(r.db,'SELECT * FROM ai_budgets WHERE id=$1 FOR UPDATE',[reservation.budget_id]);await r.update('ai_budgets',budget.id,{reserved:dec(budget.reserved).minus(reservation.amount).toString(),spent:dec(budget.spent).add(p.actual_cost).toString()},budget.version);await r.update('ai_budget_reservations',reservation.id,{settled:true,status:'reviewed',notes:p.reason},reservation.version);return r.update('ai_runs',run.id,{cost_actual:p.actual_cost,cost_basis:'provider_confirmed',status:'cost_reconciled',notes:p.reason},run.version);});
