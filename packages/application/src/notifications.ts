import type {ActorContext} from '@schubert/contracts';
import {modules} from '@schubert/contracts';
import {rolePermissions,requireRule} from '@schubert/domain';
import {withTenant,rows,one,insert,insertMany,type DbClient} from '@schubert/db';
import {baseData,register,hash,getRecord} from './core.js';
import {connectionIn} from '@schubert/adapters';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
const POLICY='notifications/2';
type Rule={pattern:RegExp;title:string;category:string;permission?:string;roles?:string[];route:string;own?:boolean;task?:boolean};
const rules:Rule[]=[
 {pattern:/^system\.receivable\.overdue\./,title:'Offene Forderung ist überfällig',category:'finance',permission:'finance',route:'receivables',task:true},
 {pattern:/^system\.payable\.overdue\./,title:'Eingangsbeleg ist zur Zahlung fällig',category:'finance',permission:'finance',route:'payables',task:true},
 {pattern:/^(crm\.inquiry\.create|public\.inquiry)\./,title:'Neue Anfrage bearbeiten',category:'sales',permission:'crm',route:'inquiries',task:true},
 {pattern:/^sales\.quote\.accept\./,title:'Angebot wurde angenommen',category:'sales',permission:'sales',route:'orders',task:true},
 {pattern:/^(portal\.(message|declaration)|public\.withdrawal|withdrawal)\./,title:'Neue Rückmeldung aus dem Kundenportal',category:'portal',permission:'portal.publish',route:'orders',task:true},
 {pattern:/^planning\.design\.change\./,title:'Ein Planstand wurde geändert',category:'planning',permission:'planning',route:'studio'},
 {pattern:/^planning\.(approval|release)/,title:'Freigabe zur Planung prüfen',category:'planning',permission:'planning',route:'studio'},
 {pattern:/^purchasing\.order\.(confirm_delivery|update)\./,title:'Lieferzusage wurde aktualisiert',category:'purchasing',permission:'purchasing',route:'purchase-orders',task:true},
 {pattern:/^purchasing\.invoice\.(create|update)\./,title:'Eingangsbeleg zur Prüfung',category:'finance',permission:'finance',route:'supplier-invoices',task:true},
 {pattern:/^workforce\.time\.(submit|propose_correction)\./,title:'Zeiterfassung zur Prüfung',category:'time',permission:'time.approve',route:'time'},
 {pattern:/^workforce\.leave\.create\./,title:'Urlaubsantrag zur Entscheidung',category:'leave',permission:'hr',route:'leave'},
 {pattern:/^workforce\.leave\.(approve|reject|cancel)\./,title:'Ihr Urlaubsantrag wurde entschieden',category:'leave',route:'leave',own:true},
 {pattern:/^dispatch\.assignment\./,title:'Ihr Einsatzplan wurde aktualisiert',category:'dispatch',route:'dispatch',own:true},
 {pattern:/^administration\.membership\.update\./,title:'Zugangsberechtigung wurde geändert',category:'security',roles:['SuperAdmin','Owner'],route:'account',own:true},
 {pattern:/^account\.(profile|password)/,title:'Persönlicher Zugang wurde geändert',category:'security',route:'account',own:true},
 {pattern:/^system\.job\.(failed|unavailable|outcome_unknown)\./,title:'Hintergrundverarbeitung benötigt Prüfung',category:'system',roles:['SuperAdmin','Owner','TechAdmin'],route:'jobs',task:true}
];
const has=(member:any,permission:string)=>[...(rolePermissions[member.role]??[]),...(member.permissions??[])].includes(permission);
function quietUntil(pref:any,now:Date){if(!pref?.quiet_start||!pref?.quiet_end)return now;const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}),start=pref.quiet_start,end=pref.quiet_end,current=clock.format(now);const quiet=start<end?current>=start&&current<end:current>=start||current<end;if(!quiet)return now;for(let minutes=1;minutes<=24*60;minutes++){const next=new Date(now.getTime()+minutes*60000),time=clock.format(next);if(time===end)return next;}return now;}
function digestTime(now:Date){const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',hourCycle:'h23'});for(let hours=1;hours<=48;hours++){const next=new Date(now.getTime()+hours*3600000);next.setUTCMinutes(0,0,0);if(next>now&&clock.format(next)==='09')return next;}return new Date(now.getTime()+86400000);}
export async function queueNotificationEmails(db:DbClient,ctx:ActorContext){
 const smtp=await connectionIn(db,'smtp'),configured=smtp?.configuration?.from&&smtp.secret_reference||process.env.SMTP_HOST&&process.env.SMTP_FROM;if(!configured)return;
 const recipients=await rows<any>(db,"SELECT d.user_id,min(d.eligible_at) next_at FROM notification_deliveries d WHERE channel='email' AND status IN('pending','waiting_config') AND NOT EXISTS(SELECT 1 FROM job_runs j WHERE j.job_type='notifications.email' AND j.payload->>'userId'=d.user_id AND j.status IN('pending','retry','running')) GROUP BY d.user_id LIMIT 100");
 for(const recipient of recipients)await insert(db,'job_runs',{...baseData(ctx),name:'Persönlich abonnierte Mitteilungen senden',job_type:'notifications.email',payload:{userId:recipient.user_id},next_attempt_at:recipient.next_at,status:'pending'});
}
export async function dispatchNotifications(ctx:ActorContext,limit=100){return withTenant(ctx,async db=>{
 const events=await rows<any>(db,'SELECT e.*,to_jsonb(j) job_record FROM outbox_events e LEFT JOIN job_runs j ON e.aggregate_type=\'job_runs\' AND j.id=e.aggregate_id WHERE e.published_at IS NULL ORDER BY e.created_at,e.id LIMIT $1 FOR UPDATE OF e SKIP LOCKED',[Math.min(500,limit)]);if(!events.length)return 0;
 const members=await rows<any>(db,'SELECT m.*,u.email FROM memberships m JOIN "user" u ON u.id=m.user_id WHERE m.active'),prefs=await rows<any>(db,'SELECT * FROM notification_preferences');
 const seenIds=new Set((await rows<any>(db,'SELECT event_id FROM consumer_inbox WHERE consumer_name=$1 AND event_id=ANY($2::uuid[])',[POLICY,events.map(e=>e.id)])).map(x=>x.event_id));const processed:any[]=[];
 for(const event of events){
  if(!seenIds.has(event.id)){
   let rule=rules.find(rule=>rule.pattern.test(event.event_type)),record:any=null,table=modules.find(m=>m.table===event.aggregate_type)?.table;
   if(table&&rule)record=await one<any>(db,`SELECT * FROM "${table}" WHERE id=$1`,[event.aggregate_id]);
   if(event.aggregate_type==='job_runs'){
    record=event.job_record;
    if(record?.status==='completed'){
     if(record.job_type==='invoice.artifacts')rule={pattern:/.*/,title:'Rechnungsoriginal ist versandbereit',category:'finance',permission:'billing',route:'invoices'};
     if(record.job_type==='catalog.price.stage')rule={pattern:/.*/,title:'Preisimport ist zur Prüfung bereit',category:'purchasing',permission:'catalog',route:'price-imports',task:true};
     if(record.job_type==='migration.stage')rule={pattern:/.*/,title:'Importbestand ist zur Prüfung bereit',category:'system',permission:'imports',route:'imports'};
     if(record.job_type==='planning.package'){
      const ready=await one<any>(db,"SELECT p.package_ready,p.revision_id,s.order_id FROM release_packages p JOIN design_revisions r ON r.id=p.revision_id JOIN design_variants v ON v.id=r.variant_id JOIN planning_projects s ON s.id=v.planning_project_id WHERE p.revision_id=$1 AND p.package_ready",[record.payload.revisionId]);
      if(ready){record.order_id=ready.order_id;rule={pattern:/.*/,title:'Freigegebene Fertigungsunterlagen sind bereit',category:'planning',roles:['SuperAdmin','Owner','Dispatcher','Workshop'],route:'orders'};}
     }
    }
   }
   if(rule){
    const employeeId=record?.employee_id??(event.aggregate_type==='memberships'?record?.employee_id:null),userId=record?.user_id??(rule.category==='security'?event.actor_id:null),orderId=record?.order_id??(table==='orders'?record.id:null);
    const assigned=orderId?await rows<any>(db,"SELECT employee_id FROM dispatch_assignments WHERE order_id=$1 AND status NOT IN('cancelled','deleted')",[orderId]):[];
    const recipients=members.filter(member=>{
     const own=rule!.own&&(member.user_id===userId||!!employeeId&&member.employee_id===employeeId),allowed=(rule!.permission&&has(member,rule!.permission))||rule!.roles?.includes(member.role);
     if(!own&&!allowed)return false;
     if(['Employee','Workshop'].includes(member.role)&&rule!.category==='planning')return assigned.some(a=>a.employee_id===member.employee_id);
     return true;
    });
    const entityId=record?.payload?.invoiceId??record?.payload?.batchId??(rule.route==='orders'?orderId:null)??(table&&rule.route===modules.find(m=>m.table===table)?.slug?record?.id:null),link='/'+rule.route+(entityId?'/'+entityId:'');
    for(const recipient of recipients){
     const pref=prefs.find(p=>p.user_id===recipient.user_id&&p.category===rule!.category&&p.channel==='in_app'),emailPref=prefs.find(p=>p.user_id===recipient.user_id&&p.category===rule!.category&&p.channel==='email');
     const dedup=event.id+':'+POLICY+':'+recipient.user_id,availableAt=quietUntil(pref,new Date()),notification=pref?.enabled===false?null:await one<any>(db,"INSERT INTO notifications(tenant_id,legal_entity_id,user_id,title,category,link,dedup_key,event_id,policy_version,available_at,status)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'unread')ON CONFLICT(tenant_id,dedup_key)DO NOTHING RETURNING id",[ctx.tenantId,ctx.legalEntityId,recipient.user_id,rule.title,rule.category,link,dedup,event.id,POLICY,availableAt]);
     if(notification)await insert(db,'notification_deliveries',{...baseData(ctx),event_id:event.id,policy_version:POLICY,user_id:recipient.user_id,channel:'in_app',action:'notify',notification_id:notification.id,status:'delivered'});
     if(emailPref?.enabled===true){const eligibleAt=quietUntil(emailPref,emailPref.digest?digestTime(new Date()):new Date());await db.query("INSERT INTO notification_deliveries(tenant_id,legal_entity_id,event_id,policy_version,user_id,channel,action,notification_id,payload,eligible_at,status)VALUES($1,$2,$3,$4,$5,'email','notify',$6,$7,$8,'pending')ON CONFLICT DO NOTHING",[ctx.tenantId,ctx.legalEntityId,event.id,POLICY,recipient.user_id,notification?.id??null,JSON.stringify({title:rule.title,category:rule.category,link}),eligibleAt]);}
    }
    if(rule.task&&recipients.length)await insert(db,'tasks',{...baseData(ctx),title:rule.title,description:'Mitteilung und tatsächlichen Originalstand öffnen: '+link,action_link:link,source_event_id:event.id,order_id:orderId??null,assigned_to:recipients.find(m=>m.employee_id)?.employee_id??null,priority:'normal',status:'open'});
   }
   processed.push({...baseData(ctx),consumer_name:POLICY,event_id:event.id,status:'processed'});
  }

 }
 await insertMany(db,'consumer_inbox',processed);await db.query("UPDATE outbox_events SET published_at=now(),status='published' WHERE id=ANY($1::uuid[])",[events.map(e=>e.id)]);
 await queueNotificationEmails(db,ctx);return events.length;
});}
register('communication.notification.preferences.update','tasks',async r=>{
 const p=z.object({channel:z.enum(['in_app','email']),category:z.enum(['sales','portal','planning','purchasing','finance','time','leave','dispatch','security','system']),enabled:z.boolean(),quiet_start:z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),quiet_end:z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),digest:z.boolean().default(false)}).parse(r.payload);
 for(const time of[p.quiet_start,p.quiet_end])requireRule(!time||Number(time.slice(0,2))<24&&Number(time.slice(3))<60,'QUIET_TIME','Eine gültige Uhrzeit auswählen.');requireRule(!!p.quiet_start===!!p.quiet_end,'QUIET_TIME','Beginn und Ende der Ruhezeit gemeinsam einstellen.');requireRule(!p.digest||p.channel==='email','DIGEST_CHANNEL','Sammelzustellung ist für E-Mail vorgesehen. In-App-Mitteilungen bleiben einzeln erreichbar.');
 return(await r.db.query("INSERT INTO notification_preferences(tenant_id,legal_entity_id,user_id,channel,category,enabled,quiet_start,quiet_end,digest,status)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'configured')ON CONFLICT(tenant_id,user_id,channel,category)DO UPDATE SET enabled=EXCLUDED.enabled,quiet_start=EXCLUDED.quiet_start,quiet_end=EXCLUDED.quiet_end,digest=EXCLUDED.digest,updated_at=now(),version=notification_preferences.version+1 RETURNING *",[r.ctx.tenantId,r.ctx.legalEntityId,r.ctx.actorId,p.channel,p.category,p.enabled,p.quiet_start??null,p.quiet_end??null,p.digest])).rows[0];
});
export async function prepareNotificationEmail(ctx:ActorContext,job:any){return withTenant(ctx,async db=>{
 const existing=await one<any>(db,"SELECT * FROM outgoing_messages WHERE message_id=$1",['<notifications-'+job.id+'@schubert.local>']);if(existing)return existing;
 const user=await one<any>(db,'SELECT u.id,u.email FROM "user" u JOIN memberships m ON m.user_id=u.id WHERE m.user_id=$1 AND m.active',[job.payload.userId]);
 const pending=await rows<any>(db,"SELECT * FROM notification_deliveries WHERE channel='email' AND user_id=$1 AND eligible_at<=now() AND status IN('pending','waiting_config') ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED",[job.payload.userId]);if(!pending.length)return null;
 const preferences=await rows<any>(db,"SELECT category,enabled FROM notification_preferences WHERE user_id=$1 AND channel='email'",[job.payload.userId]);const permitted=pending.filter(d=>user&&preferences.some(p=>p.category===d.payload?.category&&p.enabled));
 const skipped=pending.filter(d=>!permitted.includes(d));if(skipped.length)await db.query("UPDATE notification_deliveries SET status='cancelled',updated_at=now() WHERE id=ANY($1::uuid[])",[skipped.map(d=>d.id)]);if(!permitted.length)return null;
 requireRule(user.email&&!/\.invalid$/i.test(user.email),'NOTIFICATION_ADDRESS','Eine erreichbare persönliche E-Mail-Adresse hinterlegen.');
 const smtp=await connectionIn(db,'smtp');requireRule(smtp?.configuration?.from&&smtp.secret_reference||process.env.SMTP_HOST&&process.env.SMTP_FROM,'MAIL_NOT_CONFIGURED','SMTP-Verbindung ist noch nicht verfügbar.',503);
 const base=process.env.BETTER_AUTH_URL??'https://schubert-design-suite.vercel.app',data={recipient:user.email,sender:smtp?.configuration?.from??process.env.SMTP_FROM,reply_to:smtp?.configuration?.replyTo??null,connection_version_id:smtp?.current_version_id??null,subject:permitted.length===1?'Schubert · '+permitted[0].payload.title:'Schubert · '+permitted.length+' neue Mitteilungen',body:'Ihre abonnierten Mitteilungen:\n\n'+permitted.map(d=>d.payload.title+'\n'+new URL(d.payload.link,base).toString()).join('\n\n')+'\n\nDetails stehen nach der Anmeldung bereit. Ihre Versandwünsche können Sie unter „Mein Zugang“ ändern.',attachment_version_ids:[],attachment_snapshot:[]};
 const message=await insert(db,'outgoing_messages',{...baseData(ctx),...data,message_id:'<notifications-'+job.id+'@schubert.local>',content_hash:hash(data),approved_by:user.id,approved_at:new Date(),status:'queued'});await db.query("UPDATE notification_deliveries SET outgoing_message_id=$1,status='sending',updated_at=now() WHERE id=ANY($2::uuid[])",[message.id,permitted.map(d=>d.id)]);return message;
});}
