import {it,expect} from 'vitest';import {sourceHref} from '../apps/web/src/lib/client/source-links.ts';import type {AppData} from '../apps/web/src/lib/client/types.ts';
const data={context:{role:'Finance',permissions:['reports','finance.read']},navigation:[],summary:{reportContext:{from:'2026-10-01',to:'2026-10-31',businessUnit:'stone'}}} as unknown as AppData;
it('retains the report context and specific record when a source workspace is not authorized',()=>{
 const href=sourceHref(data,'/orders/03152414-2386-4457-921c-8576ecf2d6cf'),url=new URL(href,'https://app.invalid');
 expect(url.pathname).toBe('/reports');expect(Object.fromEntries(url.searchParams)).toEqual({from:'2026-10-01',to:'2026-10-31',business_unit:'stone',tab:'sources',source:'orders',source_id:'03152414-2386-4457-921c-8576ecf2d6cf'});
});
it('retains explicit monthly filters, keeps permitted links and never emits an arbitrary external source',()=>{
 const href=sourceHref(data,'/invoices?from=2026-09-01&to=2026-09-30&metric=invoiced_net');expect(href).toContain('from=2026-09-01');expect(href).toContain('metric=invoiced_net');
 expect(sourceHref({...data,navigation:[{slug:'orders'}]},'/orders/known')).toBe('/orders/known');expect(sourceHref(data,'javascript:alert(1)')).toBe('/reports?tab=quality');expect(sourceHref(data,'//outside.invalid')).toBe('/reports?tab=quality');
});
