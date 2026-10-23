import type {ActorContext} from '@schubert/contracts';
import {moduleBySlug} from '@schubert/contracts';
import {rows,ident,type DbClient} from '@schubert/db';
import {requireRule} from '@schubert/domain';
import {filteredWhere} from './read-filters.js';

/** Narrow financial source evidence for report readers. This never opens a
 * customer, order or invoice editing permission or returns their private payload. */
export async function reportSources(db:DbClient,ctx:ActorContext,url:URL){
 const source=url.searchParams.get('source');if(!source)return null;
 requireRule(ctx.permissions.some(p=>['reports','reports.read'].includes(p))&&ctx.permissions.some(p=>['finance','finance.read'].includes(p)),'FORBIDDEN','Finanzquellen sind für diesen Zugang nicht freigegeben.',403);
 const columns:Record<string,string[]>={orders:['budget_net','currency','due_date'],invoices:['net_total','tax_total','gross_total','currency','issued_at'],payments:['amount','currency','booking_date'],receivables:['original_amount','open_amount','currency','due_date'],'performance-valuations':['value_net','currency','effective_on']};
 requireRule(Object.hasOwn(columns,source),'REPORT_SOURCE','Diese Quelle steht nicht als Finanznachweis zur Verfügung.');
 const m=moduleBySlug(source)!;const params:any[]=[ctx.legalEntityId];
 const sourceId=url.searchParams.get('source_id');if(sourceId)requireRule(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourceId),'REPORT_SOURCE','Belegreferenz prüfen.');let where='legal_entity_id=$1';if(sourceId){params.push(sourceId);where+=' AND id=$2::uuid';}else where+=filteredWhere(m,url,params);
 const records=await rows(db,`SELECT id,number,name,title,status,${columns[source].map(ident).join(',')} FROM ${ident(m.table)} WHERE ${where} ORDER BY created_at DESC,id DESC LIMIT 201`,params);
 return {label:m.label,source,columns:['number','title','status',...columns[source]],records:records.slice(0,200),hasMore:records.length>200,canOpen:ctx.permissions.some(p=>p===m.permission||p===m.permission+'.read')};
}
