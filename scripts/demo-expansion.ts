import{randomUUID}from'node:crypto';
import{register,executeCommand,hash,type Runtime}from'@schubert/application';
import{one,rows}from'@schubert/db';
import{modules,type ActorContext}from'@schubert/contracts';
import{DomainError}from'@schubert/domain';
import{memorialContour,targetMeasure,validateDesign,rectangleContour,IDENTITY_TRANSFORM}from'@schubert/geometry';
import{writeFile,readFile}from'node:fs/promises';

/** Explicit expansion of the operator's existing TEST fixture set; no generated ledgers or approvals. */
export async function expandDemoData(ctx:ActorContext,{dryRun,production}:{dryRun:boolean;production:boolean}){
 const name='Schubert · Testbetrieb 2026-10 · v2 · Erweiterte Rundgänge';let preview:any;
 register('system.demo.expand','admin',async(r:Runtime)=>{
  await r.db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['demo:'+r.ctx.tenantId]);
  const existing=await one<any>(r.db,'SELECT * FROM demo_datasets WHERE name=$1',[name]);if(existing)return{...existing,alreadyInstalled:true};
  const base=await one<any>(r.db,'SELECT * FROM demo_datasets WHERE dataset_version=1 AND status=$1 ORDER BY created_at LIMIT 1',['active']);
  if(!base)throw Error('Zuerst den vorhandenen Testbestand v1 installieren.');
  const note='TESTDATEN · frei erfunden · Erweiterung v2. Keine echten Aufträge, Personalangaben, Zahlungen oder Freigaben.',registry:{table:string;id:string;label:string}[]=[],coverage:Record<string,any>={};
  const permitted=new Set(modules.map(m=>m.table));for(const table of['quote_lines','order_lines','invoice_lines','purchase_order_lines'])permitted.add(table);
  for(const table of['documents','document_versions','blob_objects','audit_log','job_runs','notifications','demo_datasets','bank_accounts','bank_account_versions','bank_statement_imports','bank_imports','bank_transactions','payments','employee_cost_rate_versions','work_calendars','accounting_periods','liquidity_openings','time_account_openings','time_account_adjustments','tax_decisions','recipient_invoice_profiles','glyph_assets','product_assets'])permitted.delete(table);
  const originals=new Map<string,any>();
  const manifest=(base.records as{table:string;id:string;label:string}[]).filter(x=>permitted.has(x.table));
  for(const table of new Set(manifest.map(x=>x.table))){const found=await rows<any>(r.db,`SELECT * FROM "${table}" WHERE id=ANY($1::uuid[])`,[manifest.filter(x=>x.table===table).map(x=>x.id)]);for(const row of found)originals.set(row.id,row);}
  const sharedColumns=new Set(['id','version','tenant_id','legal_entity_id','created_at','updated_at','created_by','updated_by','approved_by','approved_at','accepted_at','accepted_by','issued_at','issued_by','published_at','published_by','immutable_at','archived_at']);
  const labels=['Familie Hartmann · Küche','Familie Seidel · Grabmal','Praxis Lindenhof · Empfang','Familie König · Dusche'];
  const day=(offset:number)=>{const date=new Date();date.setUTCDate(date.getUTCDate()+offset);return date.toISOString().slice(0,10);};
  const safeInsert=async(table:string,data:any,label:string)=>{const created=await r.insert(table,{...data,notes:note+(data.notes?' '+data.notes:'')});registry.push({table,id:created.id,label});coverage[table]=(coverage[table]??0)+1;return created;};
  for(let batch=0;batch<labels.length;batch++){
   const label=labels[batch],ids=new Map(manifest.filter(item=>originals.has(item.id)).map(item=>[item.id,randomUUID()])),cloned=new Map<string,any>();
   const rewrite=(value:any):any=>typeof value==='string'?(ids.get(value)??value):Array.isArray(value)?value.map(rewrite):value&&typeof value==='object'&&!(value instanceof Date)?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rewrite(v)])):value;
   // Follow the original dependency order; all IDs are reserved before any insert.
   for(const entry of manifest){const old=originals.get(entry.id);if(!old)continue;if(old.issued_at||old.published_at||old.approved_at)continue;
    const data:any=Object.fromEntries(Object.entries(old).filter(([key])=>!sharedColumns.has(key)).map(([key,v])=>[key,rewrite(v)]));data.id=ids.get(entry.id);
    for(const key of['name','title'])if(typeof data[key]==='string')data[key]=`TEST · ${label} · ${data[key].replace(/^TEST\s*[·–-]\s*/,'')}`;
    if(data.number)data.number=`TEST2-${batch+1}-${data.number}`;
    if(data.normalized_number)data.normalized_number=`TEST2${batch+1}${data.normalized_number}`;
    if(data.supplier_number)data.supplier_number=`TEST2-${batch+1}-${data.supplier_number}`;
    if(data.email)data.email=`test-${batch+1}-${entry.id.slice(0,8)}@example.invalid`;
    if(data.iban)data.iban=null;if(data.content_hash)data.content_hash=hash({old:data.content_hash,batch,dataset:2});
    if(entry.table==='parties'&&data.is_customer){data.name='TEST · '+(String(old.name).includes('Bergmann')?['Familie Becker','Familie Sommer','Atelier Nord','Familie Wagner'][batch]:label.split(' · ')[0]);data.city=['Ingolstadt','Eichstätt','Neuburg an der Donau','Kösching'][batch];data.street='Beispielstraße '+(20+batch);}
    if(entry.table==='orders'){data.title='TEST · '+label+' · '+(String(old.title).includes('Familiengrab')?'Beratung und Gestaltung':'Aufmaß und Umsetzung');data.due_date=day(3+batch*5);data.budget_net=String([7400,4200,9800,5600][batch]);}
    if(entry.table==='quotes'||entry.table==='invoices'){data.title='TEST · '+label+' · '+(entry.table==='quotes'?'Angebotsentwurf':'Rechnungsentwurf');data.status='draft';data.valid_until=entry.table==='quotes'?day(14+batch):undefined;if(entry.table==='invoices')delete data.valid_until;}
    if(entry.table==='dispatch_assignments'){data.title='TEST · '+label+' · '+['Aufmaß','Beratung','Montage','Nachkontrolle'][batch];data.starts_at=day(batch*3)+'T08:00:00Z';data.ends_at=day(batch*3)+'T10:00:00Z';data.status='planned';}
    if(entry.table==='tasks'){data.title='TEST · '+['Küchenmaße mit Kunden abstimmen','Inschriftentwurf gemeinsam prüfen','Liefertermin für Empfangstheke klären','Duschgefälle vor Ort aufnehmen'][batch];data.due_date=day(batch+1);data.priority=batch===2?'high':'normal';data.status='open';}
    if(entry.table==='stock_items'){data.name='TEST · '+['Granitplatte dunkel 2800 × 1600 × 30','Marmorplatte hell 2400 × 1200 × 20','Reststück Quarzit 900 × 600 × 30','Fliesen 600 × 300 × 10'][batch];data.kind=batch===2?'remnant':batch===3?'bulk':'slab';data.quantity=['4.48','2.88','0.54','24'][batch];data.reserved_quantity='0';data.width_mm=['2800','2400','900','600'][batch];data.height_mm=['1600','1200','600','300'][batch];data.thickness_mm=['30','20','30','10'][batch];}
    if(entry.table==='employees')data.name='TEST · '+['Mara Muster','Jonas Beispiel','Sofia Probe','Leon Test'][batch];
    const created=await safeInsert(entry.table,data,data.name??data.title??entry.label);cloned.set(entry.id,created);
   }
   const order=manifest.map(x=>cloned.get(x.id)).find(x=>x?.title?.startsWith('TEST · '+label+' · ')&&x.customer_id&&x.budget_net);
   if(order){
    // Dates spread across this and adjacent months so day/week/month views are populated.
    for(let visit=0;visit<4;visit++){const employee=manifest.filter(x=>x.table==='employees').map(x=>cloned.get(x.id)).find(Boolean);await safeInsert('dispatch_assignments',{title:`TEST · ${label} · ${['Aufmaß','Materialannahme','Montage','Abnahme vorbereiten'][visit]}`,order_id:order.id,employee_id:employee?.id??r.ctx.employeeId,starts_at:day(-8+batch*7+visit*5)+'T08:00:00Z',ends_at:day(-8+batch*7+visit*5)+'T11:00:00Z',location:'TEST · Musterbaustelle '+(batch+1),status:'planned'},'TEST · Einsatzfolge');}
    const employee=manifest.filter(x=>x.table==='employees').map(x=>cloned.get(x.id)).find(Boolean);
    if(employee){for(let d=0;d<3;d++){const started=day(-7+batch-d)+'T06:00:00Z',ended=day(-7+batch-d)+'T09:30:00Z',session=await safeInsert('time_sessions',{employee_id:employee.id,started_at:started,ended_at:ended,active:false,current_order_id:order.id,current_activity:'TEST · '+['Aufmaß','Werkstatt','Montage'][d],status:'draft'},'TEST · Nacherfasster Zeitentwurf');const segment=await safeInsert('time_segments',{time_session_id:session.id,employee_id:employee.id,kind:'work',started_at:started,ended_at:ended,status:'draft'},'TEST · Arbeitsabschnitt');await safeInsert('time_allocations',{time_session_id:session.id,time_segment_id:segment.id,employee_id:employee.id,order_id:order.id,activity:'TEST · '+['Aufmaß','Werkstatt','Montage'][d],started_at:started,ended_at:ended,status:'draft'},'TEST · Auftragszeit');}}
   }
  }
  // Additional editable planning examples with visible multi-line inscriptions.
  const sceneTemplates=JSON.parse(await readFile('scripts/demo-scenes.json','utf8')),sourceScenes:any[]=Object.entries(sceneTemplates).map(([kind,snapshot])=>({kind,snapshot}));
  const libraryMaterials=await rows<any>(r.db,"SELECT id,name FROM material_spec_versions WHERE properties->>'sourceCatalog' IS NOT NULL ORDER BY name LIMIT 160"),material=libraryMaterials[0];
  const materialFor=(name:string)=>libraryMaterials.find(m=>m.name.startsWith(name))??material;
  for(const[shape,label,text]of[['round_arch','Rundbogen · Familie Seidel','Anna Seidel\n1948 – 2025\nIn liebevoller Erinnerung'],['heart','Herzform · Familie Sommer','Paul Sommer\n1952 – 2024'],['book','Buchkontur · Familie Weber','Erika Weber\n1946 – 2025'],['oval','Ovale Tafel · Familie Fuchs','Familie Fuchs\nFür immer verbunden']]){
   const source=sourceScenes.find(x=>x.kind==='memorial');if(!source)continue;const project=await safeInsert('planning_projects',{name:'TEST · '+label,kind:'memorial',status:'draft'},label),variant=await safeInsert('design_variants',{planning_project_id:project.id,name:'TEST · Gestaltungsentwurf',status:'draft'},label),revisionId=randomUUID();
   const snapshot=structuredClone(source.snapshot);Object.assign(snapshot,{planningProjectId:project.id,variantId:variant.id,revisionId,parentRevisionId:null});
   const stone=snapshot.elements.find((e:any)=>e.kind==='stone_piece');if(stone){stone.finishedContour=memorialContour(shape as any,'800','1200');const chosen=materialFor(({round_arch:'Impala',heart:'Nero Assoluto Zimbabwe',book:'Bianco Carrara C',oval:'Jura grau'} as Record<string,string>)[shape]??'Impala');if(chosen)stone.materialSpecVersionId=chosen.id;const id=randomUUID(),height=id+':height',gap=id+':gap',width=id+':width';Object.assign(snapshot.measurements,{[height]:targetMeasure('45'),[gap]:targetMeasure('20'),[width]:targetMeasure('640')});snapshot.elements.push({id,label:'TEST · Inschrift frei verschieben',kind:'inscription',parentId:snapshot.frames[0].id,phase:'planned',locked:false,sourceEvidenceVersionIds:[],surfaceElementId:stone.id,originUV:{uMm:'400',vMm:'450'},rotationDeg:'0',exactText:text,fontVariantVersionId:'unassigned:font',previewFontKey:shape==='heart'?'greatvibes':'cinzel',previewColor:shape==='book'||shape==='oval'?'#313b43':'#dfc08a',referenceAssetVersionIds:[],renderingBasis:'shop_image_reference',requestedHeightMeasureId:height,requestedLowercaseHeightMeasureId:null,requestedMaxWidthMeasureId:width,lineGapMeasureId:gap,supplyForm:'engraved',materialSpecVersionId:null,materialArticleReference:null,finishSpecVersionId:null,alignment:'center',glyphPlacements:[]});}
   if(validateDesign(snapshot).blocking.length)throw Error('Invalid expanded demo scene '+label+': '+validateDesign(snapshot).blocking.join(', '));
   const revision=await safeInsert('design_revisions',{id:revisionId,variant_id:variant.id,snapshot,content_hash:hash(snapshot),schema_version:snapshot.schemaVersion,revision_number:1,status:'draft'},label);await r.update('design_variants',variant.id,{head_revision_id:revision.id});
  }
  for(const[label,width,length]of[['Küche · Arbeitsplatte mit Ausschnitt','2800','650'],['Empfang · Gerundete Natursteintheke','2200','800'],['Bad · Waschtisch mit Rundung','1600','600']]){
   const source=sourceScenes.find(x=>x.kind==='room_plan');if(!source)continue;
   const project=await safeInsert('planning_projects',{name:'TEST · '+label,kind:'room_plan',status:'draft'},label),variant=await safeInsert('design_variants',{planning_project_id:project.id,name:'TEST · Raum und Steinbauteil',status:'draft'},label),revisionId=randomUUID(),snapshot=structuredClone(source.snapshot);
   Object.assign(snapshot,{planningProjectId:project.id,variantId:variant.id,revisionId,parentRevisionId:null});
   const id=randomUUID(),thickness=id+':thickness';snapshot.measurements[thickness]=targetMeasure('30');
   const contour=memorialContour('rounded',width,length,{radiusMm:'50'});if(label.startsWith('Küche'))contour.holes.push(rectangleContour('500','400').outer.map(edge=>({...edge,from:{xMm:String(Number(edge.from.xMm)+900),yMm:String(Number(edge.from.yMm)+125)},to:{xMm:String(Number(edge.to.xMm)+900),yMm:String(Number(edge.to.yMm)+125)}})));
   snapshot.elements.push({id,label:'TEST · '+label,kind:'stone_piece',parentId:snapshot.frames[0].id,phase:'planned',locked:false,sourceEvidenceVersionIds:[],transform:{...structuredClone(IDENTITY_TRANSFORM),position:{xMm:'500',yMm:'2000',zMm:'900'}},purpose:'countertop',finishedContour:contour,thicknessMeasureId:thickness,materialSpecVersionId:material?.id??'unassigned:material',stockItemId:null,grainDirectionDeg:'0',edgeTreatments:[],machiningFeatureIds:[]});
   if(validateDesign(snapshot).blocking.length)throw Error('Invalid expanded room scene '+label+': '+validateDesign(snapshot).blocking.join('; '));
   const revision=await safeInsert('design_revisions',{id:revisionId,variant_id:variant.id,snapshot,content_hash:hash(snapshot),schema_version:snapshot.schemaVersion,revision_number:1,status:'draft'},label);await r.update('design_variants',variant.id,{head_revision_id:revision.id});
  }
  const total=registry.length;preview={records:total,coverage};if(dryRun)throw new DomainError('DEMO_EXPANSION_PREFLIGHT','Expansion preflight rolled back.');
  return r.insert('demo_datasets',{name,records:registry,coverage:{...coverage,note,sharedSourceDatasetId:base.id},dataset_version:2,status:'active'});
 });
 try{const result=await executeCommand(ctx,{name:'system.demo.expand',idempotencyKey:'schubert-training-2026-10-v2',payload:{reason:'Vom Betreiber angeforderte zusätzliche, zusammenhängende TEST-Datensätze für alle Arbeitsbereiche.'}});await writeFile('work/demo-expansion-'+(production?'production':'synthetic')+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify({installed:true,id:result.id,records:result.records?.length,coverage:result.coverage,alreadyInstalled:result.alreadyInstalled??false}));}
 catch(error){if(dryRun&&error instanceof DomainError&&error.code==='DEMO_EXPANSION_PREFLIGHT')console.log(JSON.stringify({preflight:true,rolledBack:true,...preview}));else throw error;}
}
