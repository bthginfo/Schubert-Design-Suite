/** Explicit operator-run training data. Never runs during build or normal startup. */
import 'dotenv/config';
import {config,parse} from 'dotenv';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {modules,designSnapshotSchema,type ActorContext} from '@schubert/contracts';
import {rolePermissions,calculateLines,DomainError} from '@schubert/domain';
import {withTenant,one,rows,closePools} from '@schubert/db';
import {register,executeCommand,hash,ingestUpload,type Runtime} from '@schubert/application';
import {expandDemoData}from'./demo-expansion.js';

const production=process.argv.includes('--production'),dryRun=process.argv.includes('--dry-run');
if(!production)config({path:'.env.testing.local',quiet:true});
else{
 const source=JSON.parse(await readFile('.vercel/provisioning-result.json','utf8')),secrets=parse(await readFile('.env.provisioning.local'));
 const url=new URL(source.applicationConnectionBase);
 if(!source.completed||url.username!=='schubert_app'||!url.hostname.startsWith('ep-dawn-math-')||!secrets.APP_DB_PASSWORD)throw Error('Verified production application connection required.');
 url.password=secrets.APP_DB_PASSWORD;process.env.DATABASE_URL=url.toString();
 process.env.BETTER_AUTH_SECRET=secrets.BETTER_AUTH_SECRET;process.env.INTEGRATION_ENCRYPTION_KEY=secrets.INTEGRATION_ENCRYPTION_KEY;
}
const contextUrl=production?process.env.DATABASE_URL:process.env.DATABASE_MIGRATION_URL;
const adminDb=new pg.Client({connectionString:contextUrl,ssl:contextUrl?.includes('neon.tech')?{rejectUnauthorized:true}:undefined});
await adminDb.connect();
let ctx:ActorContext;
try{
 const target=production?(await adminDb.query('SELECT tenant_id,legal_entity_id FROM bootstrap_state WHERE id=1')).rows[0]:{tenant_id:process.env.TEST_TENANT_ID,legal_entity_id:process.env.TEST_LEGAL_ENTITY_ID};
 if(!target?.tenant_id||!target.legal_entity_id)throw Error('Target tenant is not configured.');
 await adminDb.query('BEGIN');await adminDb.query("SELECT set_config('app.tenant_id',$1,true),set_config('app.legal_entity_id',$2,true)",[target.tenant_id,target.legal_entity_id]);
 const member=(await adminDb.query("SELECT * FROM memberships WHERE tenant_id=$1 AND legal_entity_id=$2 AND active AND role=$3 ORDER BY created_at LIMIT 1",[target.tenant_id,target.legal_entity_id,production?'SuperAdmin':'Owner'])).rows[0];
 if(!member)throw Error('Authorized administrator missing.');
 ctx={tenantId:target.tenant_id,legalEntityId:target.legal_entity_id,actorId:member.user_id,employeeId:member.employee_id,role:member.role,permissions:[...new Set([...(rolePermissions[member.role]??[]),...(member.permissions??[])])],permissionVersion:member.permission_version,correlationId:randomUUID(),actorType:'employee',identityAssurance:'individual_session',reauthenticatedAt:new Date()};
 await adminDb.query('COMMIT');
}finally{await adminDb.end();}
const datasetName='Schubert · Testbetrieb 2026-10 · v1';
let preview:any;
try{
 if(process.argv.includes('--stones')){console.log(JSON.stringify(await executeCommand(ctx,{name:'catalog.stones.import',idempotencyKey:'stone-catalog-2026-10-19-v1',payload:{}})));}
 else if(process.argv.includes('--expand')){await expandDemoData(ctx,{dryRun,production});}
 else{
 const prior=await withTenant(ctx,db=>one<any>(db,'SELECT * FROM demo_datasets WHERE name=$1',[datasetName]));
 if(prior){console.log(JSON.stringify({alreadyInstalled:true,id:prior.id,records:prior.records.length,coverage:prior.coverage}));}
 else{
  const issued=await withTenant(ctx,db=>one<any>(db,'SELECT count(*)::int n FROM invoices WHERE issued_at IS NOT NULL'));
  if(production&&issued.n)throw Error('Training data may not be mixed with an already operating invoice system.');
  let document=await withTenant(ctx,db=>one<any>(db,dryRun?"SELECT * FROM documents WHERE current_version_id IS NOT NULL ORDER BY created_at LIMIT 1":"SELECT * FROM documents WHERE name='TEST - Schubert Beispielunterlagen.pdf' ORDER BY created_at LIMIT 1"));
  if(!document){
   if(production)throw Error('Upload TEST - Schubert Beispielunterlagen.pdf through the live application before installing training data. Production files must use the live private storage connection.');
   if(dryRun)throw Error('A synthetic uploaded document is required for the database preflight.');
   const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),page=pdf.addPage([595,842]);
   page.drawText('SCHUBERT | TESTBETRIEB',{x:48,y:772,size:20,font:bold,color:rgb(.15,.3,.24)});
   const lines=['Beispielunterlagen zum Kennenlernen der Design Suite','', 'Alle Angaben sind frei erfunden. Kein Angebot, keine Rechnung,','kein Herstellerbeleg und keine Freigabe zur Fertigung.','', 'Szenario A: Familiengrab Lenz','Stele 800 x 1200 x 160 mm; Beratung und Inschriftentwurf.','', 'Szenario B: Bad der Familie Bergmann','Raum 4200 x 3200 mm, Wandhoehe 2600 mm, Tuer 900 mm.','', 'Beispielmaterial: heller Kalkstein und dunkler Granit.','Beispielpreis: 300 EUR / m2. Keine Herstellerpreisangabe.','', 'Pruefen Sie Kundenakte, Angebot, Auftrag, Planung und Dokumente.','Die Datei ist ausschliesslich eine Unterlage fuer den Testbetrieb.'];
   lines.forEach((text,i)=>page.drawText(text,{x:48,y:720-i*25,size:12,font}));
   document=await ingestUpload(ctx,await pdf.save(),'TEST - Schubert Beispielunterlagen.pdf','application/pdf');
  }
  const scenes=JSON.parse(await readFile('scripts/demo-scenes.json','utf8'));
  register('system.demo.install','admin',async(r:Runtime)=>{
   await r.db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['demo:'+r.ctx.tenantId]);
   const existing=await one<any>(r.db,'SELECT id FROM demo_datasets WHERE name=$1',[datasetName]);if(existing)return existing;
   const schema=await rows<any>(r.db,"SELECT table_name,column_name,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public'");
   const columns=new Map<string,Map<string,any>>();for(const col of schema){if(!columns.has(col.table_name))columns.set(col.table_name,new Map());columns.get(col.table_name)!.set(col.column_name,col);}
   const registry:{table:string;id:string;label:string}[]=[],records:Record<string,any>={},coverage:Record<string,string>={};
   const today=new Date().toISOString().slice(0,10),year=new Date().getFullYear(),tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10);
   const note='TESTDATEN · frei erfunden · Datensatz aus '+datasetName+'. Vor Produktivstart gemeinsam mit dem Testbestand entfernen.';
   const put=async(table:string,data:Record<string,any>,label=String(data.name??data.title??table))=>{
    const cols=columns.get(table);if(!cols)throw Error('Unknown fixture table '+table);
    for(const key of Object.keys(data))if(!cols.has(key))throw Error('Unknown fixture column '+table+'.'+key);
    const result=await r.insert(table,{name:'TEST · '+label,notes:note,status:'draft',...data});registry.push({table,id:result.id,label});return result;
   };
   records.documents=document;records['document-versions']=await one<any>(r.db,'SELECT * FROM document_versions WHERE id=$1',[document.current_version_id]);
   if(!records['document-versions'])throw Error('Example document has no persisted version.');
   registry.push({table:'documents',id:document.id,label:document.name},{table:'document_versions',id:records['document-versions'].id,label:document.name});
   if(records['document-versions'].blob_object_id)registry.push({table:'blob_objects',id:records['document-versions'].blob_object_id,label:document.name});
   const defaults:Record<string,Record<string,any>>={
    customers:{name:'TEST · Familie Lenz',is_customer:true,party_type:'person',street:'Beispielweg 12',postal_code:'85049',city:'Ingolstadt',country:'DE',email:'familie.lenz@example.invalid',status:'active'},
    suppliers:{name:'TEST · Musterstein Werkstatt',is_supplier:true,party_type:'organization',street:'Musterweg 8',postal_code:'85051',city:'Ingolstadt',country:'DE',email:'einkauf@example.invalid',status:'active'},
    inquiries:{title:'TEST · Familiengrab Lenz – Beratung und Entwurf',description:'Helle Gestaltung, ruhige Inschrift und pflegeleichte Einfassung. Erstgespräch vorbereiten.',status:'planning'},
    sites:{name:'TEST · Wohnhaus Bergmann',street:'Beispielgarten 4',postal_code:'85049',city:'Ingolstadt'},
    buildings:{name:'TEST · Wohnhaus'},floors:{name:'TEST · Erdgeschoss',datum_label:'OK Fertigfußboden = 0 mm'},rooms:{name:'TEST · Bad, 4,2 × 3,2 m'},
    cemeteries:{name:'TEST · Beispielfriedhof',city:'Ingolstadt'},graves:{name:'TEST · Familiengrab Lenz, Feld T-12'},
    quotes:{title:'TEST · Grabmal Lenz – Angebotsentwurf',currency:'EUR',valid_until:tomorrow},
    orders:{title:'TEST · Bad Bergmann – Naturstein und Montage',currency:'EUR',budget_net:'4800',due_date:tomorrow,status:'in_progress',planning_status:'in_progress',procurement_status:'pending',execution_status:'planned'},
    'work-packages':{name:'TEST · Aufmaß und Badplanung',quantity:'1',unit:'package',status:'in_progress'},
    'change-orders':{title:'TEST · Zusätzliche Ablage im Duschbereich',reason:'Beispielwunsch nach der ersten Beratung',amount:'240'},
    deliveries:{title:'TEST · Material für Badmontage',delivery_date:tomorrow},acceptances:{title:'TEST · Vorbereitete Abnahme – Bad'},defects:{title:'TEST · Muster: Fuge am Waschtisch prüfen',description:'Beispiel einer offenen Nacharbeit ohne echten Schadensfall.',status:'open'},
    invoices:{title:'TEST · Rechnungsentwurf Bad Bergmann',kind:'normal',currency:'EUR',service_date:today,due_date:tomorrow},
    payments:{direction:'incoming',amount:'500',booking_date:today,currency:'EUR',reference:'TEST – keine echte Bankbewegung',source:'manual',status:'unallocated'},
    'supplier-invoices':{title:'TEST · Beispielrechnung Musterstein',supplier_number:'TEST-LF-2026-001',normalized_number:'TESTLF2026001',kind:'invoice',invoice_date:today,currency:'EUR',net_total:'1000',tax_total:'190',gross_total:'1190'},
    'purchase-orders':{title:'TEST · Naturstein für Bad Bergmann',currency:'EUR'},products:{name:'TEST · Heller Kalkstein, geschliffen',unit:'m2',description:'Fiktives Material für die Produktauswahl. Keine Herstellerzusage.'},
    'price-imports':{name:'TEST · Preislistenprüfung – Beispielimport'},stock:{name:'TEST · Kalksteinplatte 2400 × 1200 × 30',quantity:'2.88',reserved_quantity:'0',unit:'m2',kind:'slab',width_mm:'2400',height_mm:'1200',thickness_mm:'30',cost_total:'864',status:'available'},
    'stock-locations':{name:'TEST · Werkstatt, Gestell A'},inventory:{name:'TEST · Inventur Werkstatt',count_date:today,status:'draft'},imports:{name:'TEST · Kundenübernahme – Zuordnung prüfen',import_kind:'csv'},cutovers:{name:'TEST · Umstieg aus bisherigem System'},
    team:{name:'TEST · Anna Beispiel',team_name:'Planung & Werkstatt',employment_start:year+'-01-01',weekly_hours:'40',holiday_region:'DE-BY',status:'active'},
    dispatch:{title:'TEST · Aufmaß Bad Bergmann',starts_at:today+'T12:00:00Z',ends_at:today+'T14:00:00Z',location:'TEST · Beispielgarten 4',status:'planned'},
    leave:{starts_on:tomorrow,ends_on:tomorrow,days:'1',reason:'TEST · Abwesenheitsantrag zum Ausprobieren',status:'requested'},
    tasks:{title:'TEST · Ersten Entwurf mit Familie Lenz besprechen',description:'Grabmalplanung öffnen, Maße prüfen und eine Rückfrage dokumentieren.',due_date:tomorrow,priority:'normal',status:'open'},
    resources:{name:'TEST · Montagefahrzeug 1',kind:'vehicle',status:'available'},
    rules:{name:'TEST · Prüfablauf vor Planfreigabe',domain:'reports',source_url:'https://example.invalid/testbetrieb',valid_from:today,content:{testOnly:true,steps:['Maße kontrollieren','Material und Inschrift prüfen','Verantwortliche Freigabe einholen']}},
    'sales-prices':{name:'TEST · Kalkstein – Beispielpreis',revision:1,amount:'300',currency:'EUR',basis_quantity:'1',unit:'m2',tax_rate:'19',min_quantity:'1',valid_from:today,price_basis:'manual'},
    materials:{name:'TEST · Heller Kalkstein'},'material-versions':{name:'TEST · Geschliffener Kalkstein – Musterstand'},'product-variants':{name:'TEST · Platte 600 × 600 × 20'},'product-versions':{name:'TEST · Technischer Beispielstand',manufacturer_sku:'TEST-600',width_mm:'600',depth_mm:'600',height_mm:'20'},
    'product-availability':{name:'TEST · Ungeprüfte Beispielverfügbarkeit',revision:1,availability_status:'unknown',checked_on:today,valid_until:tomorrow},'product-assets':{name:'TEST · Beispielunterlage – keine Herstellerfreigabe',asset_kind:'reference'},
    'edge-treatments':{name:'TEST · Gerade Kante mit kleiner Fase'},finishes:{name:'TEST · Geschliffen, matt'},'glyph-library':{name:'TEST · Beschriftungsentwurf – kein Originalzeichen',text:'Lenz',nominal_font_height_mm:'40'},'material-boards':{name:'TEST · Bad Bergmann – Materialauswahl'},'selected-samples':{name:'TEST · Helles Kalksteinmuster'},
    'employment-periods':{starts_on:year+'-01-01',weekly_hours:'40',holiday_region:'DE-BY'},'work-schedules':{valid_from:year+'-01-01',mon:'8',tue:'8',wed:'8',thu:'8',fri:'8',sat:'0',sun:'0'},'cost-rates':{valid_from:year+'-01-01',rate:'42',currency:'EUR',kind:'hourly'},'leave-entitlements':{year,days:'30',kind:'annual'},'work-calendars':{name:'TEST · Beispielkalender Bayern',region:'DE-BY',year},'time-openings':{as_of:today,hours:'0',reason:'TEST · Beispielanfangsstand'},'time-adjustments':{effective_on:today,hours:'1',kind:'correction',reason:'TEST · Ungeprüfter Korrekturentwurf'},
    'bank-accounts':{name:'TEST · Unbestätigtes Beispielkonto',iban:'DE76000000000000000000',holder:'TESTBETRIEB',verified_at:null},
    'bank-imports':{name:'TEST · Beispiel-Kontoauszug',content_hash:document.content_hash},'bank-transactions':{counterparty:'TEST · Familie Bergmann',amount:'500',currency:'EUR',booking_date:today,reference:'TEST · Beispielzahlung',status:'needs_review'},
    datev:{name:'TEST · DATEV – vorbereiteter Zeitraum',starts_on:year+'-01-01',ends_on:today},'accounting-periods':{name:'TEST · Laufendes Geschäftsjahr',starts_on:year+'-01-01',ends_on:year+'-12-31',status:'open'},
    'cost-estimates':{as_of:today,uncommitted_remaining_amount:'1200',currency:'EUR',cost_level:'order',basis:'TEST · Beispielschätzung für die Erprobung'},'performance-valuations':{effective_on:today,value_net:'1600',currency:'EUR',basis:'TEST · Unbestätigter Bewertungsentwurf'},'liquidity-openings':{as_of:today,amount:'8000',currency:'EUR'},'material-requirements':{quantity:'5',unit:'m2',required_on:tomorrow},
    'recipient-invoice-profiles':{name:'TEST · Beispielprofil – noch nicht freigegeben',standard:'xrechnung',buyer_reference:'TEST-REFERENZ',process_id:'TEST',seller_endpoint:'test@example.invalid',seller_endpoint_scheme:'EM',buyer_endpoint:'kunde@example.invalid',buyer_endpoint_scheme:'EM',seller_contact:'TEST',seller_phone:'00000000',seller_email:'test@example.invalid',transmission_channel:'manual',valid_from:today,valid_until:year+'-12-31'},'tax-decisions':{name:'TEST · Steuerprüfung – Entwurf',tax_category:'S',basis:'TEST · Keine fachliche Steuerfreigabe',valid_from:today,valid_until:year+'-12-31'},
   };
   const excluded=new Set(['documents','document-versions','fonts','audit','jobs','notifications','receivables','payables','credit-offsets','dunning']);
   records.fonts=await one<any>(r.db,'SELECT * FROM font_variants ORDER BY selection_ref LIMIT 1');
   const reference=(slug:string)=>slug==='users'?{id:r.ctx.actorId}:slug==='parties'?records.customers:slug==='employees'?records.team:slug==='stock-items'?records.stock:slug.endsWith('rules')?records.rules:records[slug];
   let queue=modules.filter(m=>!excluded.has(m.slug));
   for(let pass=0;queue.length&&pass<12;pass++){
    const deferred:typeof queue=[];
    for(const m of queue){
     const cols=columns.get(m.table)!;const data:any={name:'TEST · '+m.label,title:'TEST · '+m.label,...defaults[m.slug]};
     let pending=false;
     for(const f of m.fields){if(data[f.key]!==undefined||!f.required&&f.type!=='reference')continue;if(f.type==='reference'){const target=reference(f.reference!);if(target)data[f.key]=target.id;else if(f.required)pending=true;}else if(f.required){const col=cols.get(f.key);data[f.key]=col?.udt_name==='jsonb'?{}:f.type==='select'?(f.options?.[0]?.value??'draft'):f.type==='date'?today:f.type==='datetime-local'?today+'T12:00:00Z':f.type==='money'||f.type==='number'?'1':f.type==='checkbox'?false:'TEST · '+f.label;}}
     if(pending){deferred.push(m);continue;}
     for(const [key,col]of cols){if(col.is_nullable!=='NO'||col.column_default!==null||['id','tenant_id','legal_entity_id','created_by','updated_by'].includes(key)||data[key]!==undefined)continue;if(key==='revision')data[key]=1;else if(key==='employee_id'&&records.team)data[key]=records.team.id;else if(key==='actor_id')data[key]=r.ctx.actorId;else if(key==='source_document_version_id')data[key]=records['document-versions'].id;else if(key==='content_hash')data[key]=document.content_hash;else if(key==='document_id')data[key]=document.id;else if(key==='import_id'&&records['bank-imports'])data[key]=records['bank-imports'].id;else if(key==='font_variant_id'&&records.fonts)data[key]=records.fonts.id;else if(col.udt_name==='jsonb')data[key]={testOnly:true};else if(['int4','int8','numeric'].includes(col.udt_name))data[key]=1;else if(col.udt_name==='uuid'){pending=true;}else if(key!=='created_at'&&key!=='updated_at')data[key]='TEST';}
     if(pending){deferred.push(m);continue;}
     // Empty optional references are never invented; supply real links when already available.
     for(const [key,target]of Object.entries({customer_id:records.customers,party_id:records.customers,supplier_id:records.suppliers,order_id:records.orders,employee_id:records.team,assigned_to:{id:r.ctx.employeeId},source_document_version_id:records['document-versions'],document_version_id:records['document-versions'],document_id:document,source_document_id:document,asset_document_id:document,import_id:records['bank-imports']})){if(cols.has(key)&&target?.id&&data[key]===undefined)data[key]=target.id;}
     if(m.slug==='dispatch')data.employee_id=r.ctx.employeeId;
     // Names/titles are common fields. Other optional blueprint fields must exist in this schema.
     const known=Object.fromEntries(Object.entries(data).filter(([key])=>cols.has(key)));
     if(!['invoices','supplier-invoices'].includes(m.slug))known.number='TEST-'+m.slug.toUpperCase().slice(0,12)+'-01';
     records[m.slug]=await put(m.table,known,m.label);coverage[m.slug]='Testdatensatz angelegt';
    }queue=deferred;
   }
   if(queue.length)throw Error('Unresolved example dependencies: '+queue.map(m=>m.slug).join(', '));
   const second=await put('parties',{...defaults.customers,name:'TEST · Familie Bergmann',email:'familie.bergmann@example.invalid',number:'TEST-KD-02'});records.secondCustomer=second;
   await r.update('orders',records.orders.id,{customer_id:second.id});await r.update('sites',records.sites.id,{customer_id:second.id});await r.update('invoices',records.invoices.id,{customer_id:second.id});
   records.memorialOrder=await put('orders',{number:'TEST-AUF-02',title:'TEST · Familiengrab Lenz – Stein und Inschrift',customer_id:records.customers.id,currency:'EUR',budget_net:'4800',due_date:tomorrow,status:'in_progress'});
   await put('inquiries',{number:'TEST-ANFRAGE-02',title:'TEST · Badmodernisierung Familie Bergmann',customer_id:second.id,description:'Naturstein für Waschtisch und Dusche; Raumaufteilung im Planungsstudio prüfen.',status:'planning'});
   const totals=calculateLines([{description:'TEST · Naturstein, Lieferung und Bearbeitung',quantity:'12',unit:'m2',unit_price:'300',tax_rate:'19',discount_percent:'0',line_type:'item',optional:false,selected:true},{description:'TEST · Planung und Montage',quantity:'16',unit:'h',unit_price:'75',tax_rate:'19',discount_percent:'0',line_type:'item',optional:false,selected:true}]);
   for(const [slug,table,lineTable]of [['quotes','quotes','quote_lines'],['orders','orders','order_lines'],['memorialOrder','orders','order_lines'],['invoices','invoices','invoice_lines'],['purchase-orders','purchase_orders','purchase_order_lines']]){
    for(const line of totals.lines){const cols=columns.get(lineTable)!;await put(lineTable,Object.fromEntries(Object.entries({...line,parent_id:records[slug].id,status:'draft'}).filter(([k])=>cols.has(k))),'TEST · Beispielposition');}
    const cols=columns.get(table)!;await r.update(table,records[slug].id,Object.fromEntries(Object.entries({net_total:totals.net_total,tax_total:totals.tax_total,gross_total:totals.gross_total}).filter(([k])=>cols.has(k))));
   }
   for(const kind of ['memorial','room_plan']){
    const project=await put('planning_projects',{name:kind==='memorial'?'TEST · Grabmal Lenz – Rundbogenstele':'TEST · Bad Bergmann – Grundriss',kind,order_id:kind==='memorial'?records.memorialOrder.id:records.orders.id,...(kind==='memorial'?{grave_plot_id:records.graves.id}:{site_id:records.sites.id})});
    const variant=await put('design_variants',{planning_project_id:project.id,name:'TEST · Entwurf zum Ausprobieren'}),revisionId=randomUUID();
    const snapshot=designSnapshotSchema.parse({...structuredClone(scenes[kind]),planningProjectId:project.id,variantId:variant.id,revisionId,parentRevisionId:null});
    const revision=await put('design_revisions',{id:revisionId,variant_id:variant.id,snapshot,content_hash:hash(snapshot),schema_version:snapshot.schemaVersion,revision_number:1});await r.update('design_variants',variant.id,{head_revision_id:revision.id});
    coverage['studio:'+kind]=project.id;
   }
   await put('notifications',{name:'TEST · Willkommen',user_id:r.ctx.actorId,title:'TEST · Ihr Rundgang ist vorbereitet',notes:note+' Öffnen Sie Hilfe & Einführung oder einen Datensatz mit TEST im Namen.',link:'/help',dedup_key:'demo-welcome-'+r.ctx.actorId,status:'unread',available_at:new Date()});
   const ownTime=await one(r.db,'SELECT id FROM time_sessions WHERE employee_id=$1 AND started_at>=$2::date LIMIT 1',[r.ctx.employeeId,today]);
   if(r.ctx.employeeId&&!ownTime){const times={started_at:today+'T06:00:00Z',ended_at:today+'T08:00:00Z'},session=await put('time_sessions',{employee_id:r.ctx.employeeId,...times,active:false,current_order_id:records.orders.id,current_activity:'TEST · Beispielaufmaß',status:'draft'}),segment=await put('time_segments',{time_session_id:session.id,employee_id:r.ctx.employeeId,kind:'work',...times,status:'draft'});await put('time_allocations',{time_session_id:session.id,time_segment_id:segment.id,employee_id:r.ctx.employeeId,order_id:records.orders.id,work_package_id:records['work-packages'].id,activity:'TEST · Beispielaufmaß',...times,status:'draft'});coverage.time='Unfreigegebener Beispielzeitraum, klar als TEST gekennzeichnet';}
   // Read-only financial ledgers are deliberately not forged from draft invoices.
   for(const slug of ['receivables','payables','credit-offsets','dunning'])coverage[slug]='Entsteht aus bestätigten Fachvorgängen; zugehörige Rechnungsentwürfe und Zahlung sind vorbereitet.';
   Object.assign(coverage,{documents:'Echte private Beispiel-PDF mit Dateiprüfung','document-versions':'Version der Beispiel-PDF',fonts:'Vorhandene echte Katalogreferenzen',audit:'Tatsächlicher Installationsnachweis',jobs:'Tatsächliche Dateiprüfung und Verarbeitung',notifications:'Persönliche Testmitteilung'});
   const entity=await one<any>(r.db,'SELECT version FROM legal_entities WHERE id=$1',[r.ctx.legalEntityId]);await r.update('legal_entities',r.ctx.legalEntityId,{training_mode:true},entity.version);
   preview={records:registry.length,coverage};
   if(dryRun)throw new DomainError('DEMO_PREFLIGHT_COMPLETE','Preflight transaction rolled back.');
   return put('demo_datasets',{name:datasetName,records:registry,coverage,dataset_version:1,status:'active'},datasetName);
  });
  try{
   const result=await executeCommand(ctx,{name:'system.demo.install',idempotencyKey:'schubert-training-2026-10-v1',payload:{reason:'Vom Betreiber angeforderte, klar gekennzeichnete Testdaten bis zum Produktivstart.'}});
   await mkdir('work',{recursive:true});await writeFile('work/demo-manifest-'+(production?'production':'synthetic')+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify({installed:true,id:result.id,records:result.records?.length,coverage:result.coverage}));
  }catch(e){if(dryRun&&e instanceof DomainError&&e.code==='DEMO_PREFLIGHT_COMPLETE')console.log(JSON.stringify({preflight:true,rolledBack:true,...preview}));else throw e;}
 }
 }
}finally{await closePools();}
