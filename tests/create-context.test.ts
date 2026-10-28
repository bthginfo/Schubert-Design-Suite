import {describe,it,expect} from 'vitest';
import {createContext,createHref,dispatchCreateContext} from '../apps/web/src/lib/client/create-context.js';
import type {Field} from '../apps/web/src/lib/client/types.js';

const order='639ca87a-0316-4bf2-aef6-d78f4297e084',other='0975cc29-a498-4270-8497-e448314be7be',employee='5b514080-7e94-4995-a561-bcbcb2b91544';
const fields:Field[]=[{key:'order_id',label:'Auftrag',type:'reference',reference:'orders'},{key:'employee_id',label:'Mitarbeiter',type:'reference',reference:'team'},{key:'starts_at',label:'Beginn',type:'datetime-local'},{key:'ends_at',label:'Ende',type:'datetime-local'},{key:'due_date',label:'Fällig am',type:'date'},{key:'status',label:'Status',type:'select',options:[{value:'confirmed',label:'Bestätigt'}]},{key:'title',label:'Titel',type:'text'}];
const lookups={orders:[{id:order,name:'Auftrag A'}],team:[{id:employee,name:'Mitarbeiter A'}]};

describe('Contextual record creation proposals',()=>{
 it('accepts only known authorized references and valid calendar days, leaving arbitrary URL fields out',()=>{
  const values=createContext(fields,lookups,new URLSearchParams({order_id:order.toUpperCase(),employee_id:other,due_date:'2026-10-25',status:'confirmed',title:'Injected title',tenant_id:other,starts_at:'2026-10-25T20:00'}));
  expect(values).toEqual({order_id:order,due_date:'2026-10-25'});
 });
 it('retains legacy order context while rejecting unavailable or wrong reference values',()=>{
  expect(createContext(fields,lookups,new URLSearchParams({order}))).toEqual({order_id:order});
  expect(createContext(fields,lookups,new URLSearchParams({order_id:other,employee_id:order}))).toEqual({});
 });
 it('suggests editable local dispatch hours on the selected valid day and keeps employee proposals authorized',()=>{
  const suggested=dispatchCreateContext('2026-10-25',employee);
  expect(createContext(fields,lookups,new URLSearchParams({order_id:order}),suggested)).toEqual({order_id:order,employee_id:employee,starts_at:'2026-10-25T08:00',ends_at:'2026-10-25T09:00'});
  expect(createContext(fields,lookups,new URLSearchParams(),dispatchCreateContext('2026-10-25',other))).not.toHaveProperty('employee_id');
  expect(dispatchCreateContext('2026-02-30',employee)).toEqual({});
 });
 it('rejects impossible dates, malformed local times and status changes while retaining explicitly supplied editable source text',()=>{
  expect(createContext(fields,lookups,new URLSearchParams({due_date:'2026-02-30',title:'Nicht aus der URL übernehmen'}),{starts_at:'2026-02-30T08:00',ends_at:'2026-10-25T25:00',status:'confirmed',title:'Übernommene Anfrage'})).toEqual({title:'Übernommene Anfrage'});
 });
 it('carries only explicit relationship UUIDs into a create link',()=>{
  const target=new URL(createHref('invoices',{order_id:order,customer_id:other,title:'Ignore',status:'issued',tenant_id:employee,supplier_id:'not-an-id'}),'https://test.invalid');
  expect(target.pathname).toBe('/invoices');expect(Object.fromEntries(target.searchParams)).toEqual({create:'1',customer_id:other,order_id:order});
 });
});
