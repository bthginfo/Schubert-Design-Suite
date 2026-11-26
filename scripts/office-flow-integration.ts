import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {ActorContext} from '@schubert/contracts';
import {withTenant,one} from '@schubert/db';
import {executeCommand,loadPage,invalidateReads} from '@schubert/application';

/** Office flow Inquiry → Quote → Order: source link, phone acceptance with call note, organisation carry-over and linked records. */
export async function officeFlowIntegration(actor:(role:string)=>ActorContext,test:(label:string,run:()=>Promise<void>)=>Promise<void>){
  const office=actor('Office'),employee=actor('Employee');
  const marker='TEST Büroablauf '+randomUUID().slice(0,8);
  const call=(name:string,payload:Record<string,unknown>,record?:any,key=randomUUID())=>executeCommand(office,{name,payload,id:record?.id,expectedVersion:record?.version,idempotencyKey:key});
  const page=(path:string,query='')=>{invalidateReads(office);return loadPage(office,path,new URL('https://test.invalid/'+path+'?'+(query?query+'&':'')+'check='+randomUUID()));};
  const phone='0841 '+String(Date.now()).slice(-6)+'-12';
  const customer=await call('crm.customer.create',{name:marker+' Familie Brandl',party_type:'person',city:'Pfaffenhofen Büroprobe '+marker.slice(-8),email:'brandl.'+marker.slice(-8)+'@schubert.test',phone});
  const other=await call('crm.customer.create',{name:marker+' andere Familie'});
  const responsible=office.employeeId;
  const inquiry=await call('crm.inquiry.create',{title:marker+' Grabmal Doppelgrab',customer_id:customer.id,channel:'phone',business_unit:'memorial',assigned_to:responsible});
  const validUntil=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(new Date(Date.now()+30*86_400_000));
  const lines=[{description:'Grabmal Granit nach Kundenwunsch',quantity:'1',unit:'piece',unit_price:'3200.00',tax_rate:'19',line_type:'item',optional:false,selected:true}];
  let quote:any,order:any;

  await test('Office flow: a quote keeps its source inquiry, and a different customer’s inquiry is rejected',async()=>{
    const proposal=await page('quotes','create=1&inquiry_id='+inquiry.id);
    assert.equal(proposal.summary.createInitialValues.inquiry_id,inquiry.id);
    await assert.rejects(()=>call('sales.quote.create',{title:marker+' falsche Quelle',customer_id:other.id,inquiry_id:inquiry.id,valid_until:validUntil,lines}),(error:any)=>error.code==='QUOTE_INQUIRY_CUSTOMER'&&!!error.fields?.inquiry_id);
    quote=await call('sales.quote.create',{...proposal.summary.createInitialValues,valid_until:validUntil,currency:'EUR',lines});
    assert.equal(quote.inquiry_id,inquiry.id);
    await assert.rejects(()=>call('sales.quote.update',{customer_id:other.id},quote),(error:any)=>error.code==='QUOTE_INQUIRY_CUSTOMER');
    const detail=await page('quotes/'+quote.id);
    assert.deepEqual(detail.related.inquiries.map((row:any)=>row.id),[inquiry.id]);
    assert.deepEqual(detail.related.customers.map((row:any)=>row.id),[customer.id]);
    assert.deepEqual(detail.related.orders,[]);
    assert.equal(detail.summary.quoteOutput,null);
    const source=await page('inquiries/'+inquiry.id);assert(source.related.quotes.some((row:any)=>row.id===quote.id));
  });

  await test('Office flow: a phone acceptance needs a call note and creates the order with the inquiry’s area and responsible person',async()=>{
    quote=await call('sales.quote.review',{},quote);quote=await call('sales.quote.approve',{confirmed:true},quote);quote=await call('sales.quote.publish',{confirmed:true},quote);
    const published=await page('quotes/'+quote.id);
    assert.equal(published.summary.quoteOutput.versionId,quote.published_version_id);assert.equal(published.summary.quoteOutput.revision,1);
    assert.equal(published.summary.quoteOutput.job?.status!==undefined,true,'the PDF job of the published version is reported with its state');
    assert(Array.isArray(published.related.mail_attachments)&&Array.isArray(published.related.outgoing_messages));
    await assert.rejects(()=>call('sales.quote.accept',{person_name:'Herr Brandl',statement:'Telefonisch ok',channel:'phone',confirmed:true},quote),(error:any)=>error.code==='ACCEPTANCE_CALL_NOTE');
    await assert.rejects(()=>call('sales.quote.accept',{person_name:'Herr Brandl',statement:'Zusage am Telefon für die veröffentlichte Version.',channel:'fax',confirmed:true},quote));
    const statement='Telefonat 26.11.2026, 10:15 Uhr: Herr Brandl nimmt Angebot '+quote.number+' Version 1 verbindlich an.';
    order=await call('sales.quote.accept',{person_name:'Herr Brandl',statement,channel:'phone',confirmed:true},quote);
    assert.match(order.number,/AUF/);assert.equal(order.business_unit,'memorial');assert.equal(order.assigned_to,responsible);
    assert.equal(order.budget_net,'3200.00');assert.equal(order.customer_id,customer.id);
    const acceptance=await withTenant(office,db=>one<any>(db,'SELECT channel,statement,order_id FROM quote_acceptances WHERE quote_id=$1',[quote.id]));
    assert.deepEqual(acceptance,{channel:'phone',statement,order_id:order.id});
  });

  await test('Office flow: quote, order and inquiry list each other as linked records within read permissions',async()=>{
    const accepted=await page('quotes/'+quote.id);
    assert.equal(accepted.detail.status,'accepted');assert.deepEqual(accepted.related.orders.map((row:any)=>row.number),[order.number]);
    const orderPage=await page('orders/'+order.id);
    assert.deepEqual(orderPage.related.quotes.map((row:any)=>row.id),[quote.id]);assert.deepEqual(orderPage.related.inquiries.map((row:any)=>row.id),[inquiry.id]);
    const inquiryPage=await page('inquiries/'+inquiry.id);assert.deepEqual(inquiryPage.related.orders.map((row:any)=>row.id),[order.id]);
    const narrow={...office,permissions:['sales']};invalidateReads(narrow);
    const limited=await loadPage(narrow,'quotes/'+quote.id,new URL('https://test.invalid/quotes/'+quote.id+'?narrow='+randomUUID()));
    assert.equal(limited.related.inquiries,undefined);assert.equal(limited.related.customers,undefined);assert.equal(limited.related.orders,undefined);
    await assert.rejects(()=>loadPage(employee,'quotes/'+quote.id,new URL('https://test.invalid/quotes/'+quote.id)));
  });

  await test('Office flow: customer search also finds city, e-mail and phone digits with bound parameters',async()=>{
    for(const q of [customer.city,customer.email.toUpperCase(),phone.replace(/[^0-9]/g,''),phone.replace(/-/,' / ')]){
      const list=await page('customers','q='+encodeURIComponent(q));assert(list.records.some((row:any)=>row.id===customer.id),'not found by '+q);
    }
    const injection=await page('customers','q='+encodeURIComponent("%' OR 1=1 --"));assert(!injection.records.some((row:any)=>row.id===customer.id));
  });
}
