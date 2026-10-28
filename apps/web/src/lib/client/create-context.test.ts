import {describe,it,expect} from 'vitest';
import {moduleBySlug} from '@schubert/contracts';
import {createContext,createHref} from './create-context.ts';

describe('Editable quote start values',()=>{
  const fields=moduleBySlug('quotes')!.fields;
  const customer='53b239c7-d8d9-4829-903a-b6e6ff67c0fd';
  const lookups={customers:[{id:customer,name:'Müller'}]};
  it('copies server-authorized source text and customer without accepting arbitrary URL text or prices',()=>{
    const params=new URLSearchParams({title:'Fremder Text',notes:'URL-Injektion',currency:'USD',customer_id:customer});
    expect(createContext(fields,lookups,params,{title:'Grabmal Müller',notes:'Originalanfrage\n80 cm breit',customer_id:customer})).toEqual({title:'Grabmal Müller',notes:'Originalanfrage\n80 cm breit',customer_id:customer});
    expect(createContext(fields,lookups,params)).toEqual({customer_id:customer});
    expect(createContext(fields,lookups,params,{customer_id:'9de13f5b-7249-4302-bb76-fb43b9ac67b5'}).customer_id).toBeUndefined();
  });
  it('carries inquiry provenance only into the quote flow and requires valid IDs',()=>{
    const context={customer_id:customer,inquiry_id:customer,title:'untrusted',unit_price:'1'};
    const quote=new URL(createHref('quotes',context),'https://test.invalid');
    expect(quote.searchParams.get('inquiry_id')).toBe(customer);
    expect(quote.searchParams.has('title')).toBe(false);
    expect(new URL(createHref('orders',context),'https://test.invalid').searchParams.has('inquiry_id')).toBe(false);
    expect(new URL(createHref('quotes',{inquiry_id:'not-an-id'}),'https://test.invalid').searchParams.has('inquiry_id')).toBe(false);
  });
});
