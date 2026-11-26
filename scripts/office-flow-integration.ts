import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {ActorContext} from '@schubert/contracts';
import {withTenant,one} from '@schubert/db';
import {executeCommand,loadPage,invalidateReads} from '@schubert/application';

/** Office flow Quote → Order: phone acceptance with call note, the PDF/mail state of the published version and linked records. */
export async function officeFlowIntegration(actor:(role:string)=>ActorContext,test:(label:string,run:()=>Promise<void>)=>Promise<void>){
  const office=actor('Office'),employee=actor('Employee');
  const marker='TEST Büroablauf '+randomUUID().slice(0,8);
  const call=(name:string,payload:Record<string,unknown>,record?:any,key=randomUUID())=>executeCommand(office,{name,payload,id:record?.id,expectedVersion:record?.version,idempotencyKey:key});
  const page=(path:string,query='')=>{invalidateReads(office);return loadPage(office,path,new URL('https://test.invalid/'+path+'?'+(query?query+'&':'')+'check='+randomUUID()));};
  const phone='0841 '+String(Date.now()).slice(-6)+'-12';
  const customer=await call('crm.customer.create',{name:marker+' Familie Brandl',party_type:'person',city:'Pfaffenhofen Büroprobe '+marker.slice(-8),email:'brandl.'+marker.slice(-8)+'@schubert.test',phone});
  const validUntil=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(new Date(Date.now()+30*86_400_000));
  const lines=[{description:'Grabmal Granit nach Kundenwunsch',quantity:'1',unit:'piece',unit_price:'3200.00',tax_rate:'19',line_type:'item',optional:false,selected:true}];
  let quote:any,order:any;

  await test('Office flow: a draft quote lists its customer and no order yet',async()=>{
    quote=await call('sales.quote.create',{title:marker+' Grabmal Doppelgrab',customer_id:customer.id,valid_until:validUntil,currency:'EUR',lines});
    const detail=await page('quotes/'+quote.id);
    assert.deepEqual(detail.related.customers.map((row:any)=>row.id),[customer.id]);
    assert.deepEqual(detail.related.orders,[]);
    assert.equal(detail.summary.quoteOutput,null);
  });

  await test('Office flow: a phone acceptance needs a call note and creates the order from the frozen version',async()=>{
    quote=await call('sales.quote.review',{},quote);quote=await call('sales.quote.approve',{confirmed:true},quote);quote=await call('sales.quote.publish',{confirmed:true},quote);
    const published=await page('quotes/'+quote.id);
    assert.equal(published.summary.quoteOutput.versionId,quote.published_version_id);assert.equal(published.summary.quoteOutput.revision,1);
    assert.equal(typeof published.summary.quoteOutput.job?.status,'string','the PDF job of the published version is reported with its state');
    assert(Array.isArray(published.related.mail_attachments)&&Array.isArray(published.related.outgoing_messages));
    await assert.rejects(()=>call('sales.quote.accept',{person_name:'Herr Brandl',statement:'Telefonisch ok',channel:'phone',confirmed:true},quote),(error:any)=>error.code==='ACCEPTANCE_CALL_NOTE');
    await assert.rejects(()=>call('sales.quote.accept',{person_name:'Herr Brandl',statement:'Zusage am Telefon für die veröffentlichte Version.',channel:'fax',confirmed:true},quote));
    const statement='Telefonat 26.11.2026, 10:15 Uhr: Herr Brandl nimmt Angebot '+quote.number+' Version 1 verbindlich an.';
    order=await call('sales.quote.accept',{person_name:'Herr Brandl',statement,channel:'phone',confirmed:true},quote);
    assert.match(order.number,/AUF/);assert.equal(order.budget_net,'3200.00');assert.equal(order.customer_id,customer.id);
    const acceptance=await withTenant(office,db=>one<any>(db,'SELECT channel,statement,order_id FROM quote_acceptances WHERE quote_id=$1',[quote.id]));
    assert.deepEqual(acceptance,{channel:'phone',statement,order_id:order.id});
  });

  await test('Office flow: quote and order list each other as linked records within read permissions',async()=>{
    const accepted=await page('quotes/'+quote.id);
    assert.equal(accepted.detail.status,'accepted');assert.deepEqual(accepted.related.orders.map((row:any)=>row.number),[order.number]);
    const orderPage=await page('orders/'+order.id);
    assert.deepEqual(orderPage.related.quotes.map((row:any)=>row.id),[quote.id]);
    const narrow={...office,permissions:['sales']};invalidateReads(narrow);
    const limited=await loadPage(narrow,'quotes/'+quote.id,new URL('https://test.invalid/quotes/'+quote.id+'?narrow='+randomUUID()));
    assert.equal(limited.related.customers,undefined);assert.equal(limited.related.orders,undefined);
    await assert.rejects(()=>loadPage(employee,'quotes/'+quote.id,new URL('https://test.invalid/quotes/'+quote.id)));
  });

  await test('Office flow: customer search also finds city, e-mail and phone digits with bound parameters',async()=>{
    for(const q of [customer.city,customer.email.toUpperCase(),phone.replace(/[^0-9]/g,''),phone.replace(/-/,' / ')]){
      const list=await page('customers','q='+encodeURIComponent(q));assert(list.records.some((row:any)=>row.id===customer.id),'not found by '+q);
    }
    const injection=await page('customers','q='+encodeURIComponent("%' OR 1=1 --"));assert(!injection.records.some((row:any)=>row.id===customer.id));
  });
}
