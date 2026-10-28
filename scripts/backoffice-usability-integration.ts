import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {dec} from '@schubert/domain';
import type {ActorContext} from '@schubert/contracts';
import {withTenant,insert,one} from '@schubert/db';
import {executeCommand,loadPage,invalidateReads,baseData,inputErrorDetails} from '@schubert/application';
import {inquiryQuoteContext} from '../packages/application/src/inquiry-quote-context.js';
import {customerWorkspace} from '../packages/application/src/customer-workspace.js';

export async function backofficeUsabilityIntegration(actor:(role:string)=>ActorContext,test:(label:string,run:()=>Promise<void>)=>Promise<void>){
  const owner=actor('Owner'),office=actor('Office'),employee=actor('Employee');
  const marker='TEST UAT 2026-10-28 · Backoffice '+randomUUID().slice(0,8);
  const call=(name:string,payload:Record<string,unknown>,record?:any)=>executeCommand(office,{name,payload,id:record?.id,expectedVersion:record?.version,idempotencyKey:randomUUID()});
  const page=(path:string,query='')=>loadPage(office,path,new URL('https://test.invalid/'+path+query));
  const customer=await call('crm.customer.create',{name:marker+' Weber'}),other=await call('crm.customer.create',{name:marker+' anderer Kunde'});
  const description='Dunkelgrauer Granit, 80 cm breit, 120 cm hoch, 16 cm stark. Helga Weber, * 1938 † 2026. Preis und Termin noch offen.';
  const inquiry=await call('crm.inquiry.create',{title:marker+' Grabmal',description,customer_id:customer.id,business_unit:'memorial'});
  let quote:any;

  await test('Inquiry-to-quote copies the actual authorized request into an editable draft without invented prices or dates',async()=>{
    const proposal=await page('quotes','?create=1&inquiry_id='+inquiry.id.toUpperCase());
    const values=proposal.summary.createInitialValues;
    assert.equal(values.title,inquiry.title);assert.equal(values.customer_id,customer.id);
    assert(values.notes.includes(description));assert(values.notes.includes(inquiry.number));
    assert.equal(proposal.summary.createSource.href,'/inquiries/'+inquiry.id);assert.equal(proposal.summary.createSource.version,inquiry.version);
    assert(proposal.lookups.customers.some((row:any)=>row.id===customer.id));
    for(const key of ['lines','unit_price','net_total','service_date','due_date','valid_until'])assert.equal(values[key],undefined);
    quote=await call('sales.quote.create',{...values,title:values.title+' · bearbeitet',currency:'EUR',lines:[{description:'Bestätigte synthetische QA-Position',quantity:'1',unit:'piece',unit_price:'2400,50',tax_rate:'19'}]});
    const saved=await page('quotes/'+quote.id);assert.equal(saved.detail.title,inquiry.title+' · bearbeitet');assert(saved.detail.notes.includes(description));assert.equal(saved.detail.customer_id,customer.id);assert.equal(saved.detail.status,'draft');
    const original=await page('inquiries/'+inquiry.id);assert.equal(original.detail.description,description);assert.equal(original.detail.version,inquiry.version);
  });

  await test('Quote source cannot cross customer, entity, tenant or CRM/Sales permission boundaries',async()=>{
    const sourceUrl=new URL('https://test.invalid/quotes?inquiry_id='+inquiry.id);
    await assert.rejects(()=>page('quotes','?inquiry_id='+inquiry.id+'&customer_id='+other.id),(error:any)=>error.code==='SOURCE_CUSTOMER_SCOPE');
    for(const ctx of [{...office,permissions:['sales']},{...office,permissions:['crm','sales.read']}])await assert.rejects(()=>withTenant(ctx,db=>inquiryQuoteContext(db,ctx,sourceUrl)),(error:any)=>error.code==='FORBIDDEN');
    for(const ctx of [{...office,tenantId:randomUUID()},{...office,legalEntityId:randomUUID()}])await assert.rejects(()=>withTenant(ctx,db=>inquiryQuoteContext(db,ctx,sourceUrl)),(error:any)=>error.code==='NOT_FOUND');
    await assert.rejects(()=>page('quotes','?inquiry_id='+randomUUID()),(error:any)=>error.code==='NOT_FOUND');
    await assert.rejects(()=>page('quotes','?inquiry_id=invalid'),(error:any)=>error.code==='INQUIRY_SOURCE');
    const readSource={...office,permissions:['sales','crm.read']};assert.equal((await withTenant(readSource,db=>inquiryQuoteContext(db,readSource,sourceUrl)))?.values.customer_id,customer.id);
    const ordinary=await page('quotes','?customer_id='+customer.id+'&title='+encodeURIComponent('Nicht übernehmen'));assert.equal(ordinary.summary.createInitialValues,undefined);
  });

  await test('Malformed line prices produce exact public field paths and leave saved amounts and versions unchanged',async()=>{
    let rejected=false;
    try{await call('sales.quote.update',{lines:[{description:'Bestätigte synthetische QA-Position',quantity:'1',unit:'piece',unit_price:'2400,5,0',tax_rate:'19'}]},quote);}
    catch(error){assert(error instanceof z.ZodError);const detail=inputErrorDetails(error);assert.equal(detail.fields['lines.0.unit_price'],'Eine eindeutige Zahl eingeben, zum Beispiel 2400,50.');assert(detail.message.includes('Position 1 · Einzelpreis netto'));rejected=true;}
    assert(rejected);
    const saved=await withTenant(office,db=>one<any>(db,'SELECT q.version,q.net_total,l.unit_price FROM quotes q JOIN quote_lines l ON l.parent_id=q.id WHERE q.id=$1',[quote.id]));
    assert.equal(saved.version,quote.version);assert.equal(saved.net_total,'2400.50');assert(dec(saved.unit_price).eq('2400.50'));
  });

  await test('Customer documents include indirect own-order originals once and preserve personnel, assignment and other-customer boundaries',async()=>{
    const order=await call('sales.order.create',{title:marker+' Auftrag',customer_id:customer.id,currency:'EUR'}),foreign=await call('sales.order.create',{title:marker+' fremder Auftrag',customer_id:other.id,currency:'EUR'});
    const docs=await withTenant(owner,async db=>{
      const add=(name:string,entity_type:string|null=null,entity_id:string|null=null)=>insert(db,'documents',{...baseData(owner),name:marker+' '+name,original_name:'QA-Metadaten-ohne-Datei.txt',notes:'Reine synthetische Zugriffsprüfung, kein echter Upload oder Scannerfolg.',mime_type:'text/plain',size_bytes:0,content_hash:'0'.repeat(64),status:'quarantine',visibility:'internal',entity_type,entity_id});
      const own=await add('indirekte Auftragsunterlage'),otherDoc=await add('Unterlage anderer Kunde'),hr=await add('Personalunterlage','employee',owner.employeeId);
      for(const [doc,target,type] of [[own,order,'orders'],[own,order,'sales.order'],[otherDoc,foreign,'orders'],[hr,order,'orders']] as const)await insert(db,'document_links',{...baseData(owner),document_id:doc.id,entity_type:type,entity_id:target.id,purpose:'TEST UAT · Zugriffsprüfung'});
      return {own,otherDoc,hr};
    });
    invalidateReads(office);
    const detail=await page('customers/'+customer.id),documents=detail.summary.customerWorkspace.sections.find((section:any)=>section.key==='documents');
    assert.equal(documents.total,1);assert.equal(documents.items[0].id,docs.own.id);
    const list=await page('documents','?customer_id='+customer.id);assert.deepEqual(list.records.map((record:any)=>record.id),[docs.own.id]);assert.equal(list.lookups.customers[0].id,customer.id);assert.equal(list.lookups.customers[0].name,customer.name);assert.deepEqual(list.summary.customerContext,{id:customer.id,name:customer.name});
    const otherList=await page('documents','?customer_id='+other.id);assert.deepEqual(otherList.records.map((record:any)=>record.id),[docs.otherDoc.id]);
    const restricted={...employee,permissions:[...employee.permissions,'crm']};
    const before=await withTenant(restricted,db=>customerWorkspace(db,restricted,customer.id));assert.equal(before.sections.find(section=>section.key==='documents')?.total,0);
    await withTenant(owner,db=>insert(db,'dispatch_assignments',{...baseData(owner),title:marker+' Zuweisung',order_id:order.id,employee_id:employee.employeeId,starts_at:'2001-01-01T08:00:00Z',ends_at:'2001-01-01T09:00:00Z',status:'draft'}));
    const assigned=await withTenant(restricted,db=>customerWorkspace(db,restricted,customer.id));assert.equal(assigned.sections.find(section=>section.key==='documents')?.total,1);assert.equal(assigned.sections.find(section=>section.key==='documents')?.items[0].id,docs.own.id);
    for(const ctx of [{...office,tenantId:randomUUID()},{...office,legalEntityId:randomUUID()}]){
      const scoped=await withTenant(ctx,db=>customerWorkspace(db,ctx,customer.id));assert.equal(scoped.sections.find(section=>section.key==='documents')?.total,0);
    }
  });

  await test('Customer originals are counted once despite technical previews, while business PDFs remain visible',async()=>{
    const before=await page('documents','?customer_id='+customer.id);
    const artifacts=await withTenant(owner,async db=>{
      const add=async(jobType:string)=>{
        const job=await insert(db,'job_runs',{...baseData(owner),name:marker+' Artefakt-Metadaten',job_type:jobType,payload:{},status:'pending'});
        return insert(db,'documents',{...baseData(owner),name:marker+' '+jobType,original_name:'QA-Metadaten-ohne-Datei.pdf',notes:'Synthetische Listenprüfung, kein erzeugtes PDF oder Scannerfolg.',mime_type:'application/pdf',size_bytes:0,content_hash:'0'.repeat(64),status:'quarantine',visibility:'internal',entity_type:'customers',entity_id:customer.id,source_job_id:job.id});
      };
      return{preview:await add('document.preview'),planPreview:await add('planning.source.preview'),business:await add('quote.pdf')};
    });
    invalidateReads(office);
    const list=await page('documents','?customer_id='+customer.id);
    assert.deepEqual(new Set(list.records.map((record:any)=>record.id)),new Set([...before.records.map((record:any)=>record.id),artifacts.business.id]));
    const detail=await page('customers/'+customer.id),section=detail.summary.customerWorkspace.sections.find((item:any)=>item.key==='documents');
    assert.equal(section.total,before.records.length+1);
    assert(section.items.some((item:any)=>item.id===artifacts.business.id));
    assert(!section.items.some((item:any)=>[artifacts.preview.id,artifacts.planPreview.id].includes(item.id)));
  });
}
