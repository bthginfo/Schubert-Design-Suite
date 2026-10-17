import {dec,money,requireRule} from '@schubert/domain';
/** Frozen tax groups determine posting amounts. Accounts always come from the approved advisor mapping. */
export function datevPostings(record:any,kind:'invoice'|'supplier_invoice'|'payment',mapping:Record<string,any>){
 const groups=kind==='payment'?[]:record.tax_summaries??record.snapshot?.tax_summaries??record.frozen_snapshot?.tax_summaries??[];
 const totals=groups.length?groups.map((group:any)=>({category:group.tax_category??record.tax_category??'S',rate:dec(group.tax_rate).toString(),amount:money(dec(group.net_amount).add(group.tax_amount)),net:money(group.net_amount),tax:money(group.tax_amount)})):[{category:record.tax_category??null,rate:null,amount:money(kind==='payment'?record.amount:record.gross_total),net:null,tax:null}];
 requireRule(dec(totals.reduce((sum:any,g:any)=>sum.add(g.amount),dec(0))).eq(kind==='payment'?record.amount:record.gross_total),'DATEV_TAX_TOTAL','Die eingefrorenen Steuergruppen ergeben nicht den Originalbetrag. Originalprüfung erforderlich.');
 return totals.map((group:any)=>{
  const prefix=kind==='invoice'?record.kind:kind==='supplier_invoice'?'supplier_invoice':'payment_'+record.direction;
  const exact=group.rate===null?prefix:prefix+':'+group.category+':'+group.rate;
  const legacy=kind==='invoice'?group.category:prefix;
  const fallbackAllowed=totals.length===1&&(kind!=='invoice'||['normal','credit','correction','partial'].includes(record.kind));
  const key=mapping[exact]?exact:mapping[prefix]&&totals.length===1?prefix:fallbackAllowed&&mapping[legacy]?legacy:exact,accounts=mapping[key];
  requireRule(accounts&&/^\d{4,9}$/.test(accounts.account)&&/^\d{4,9}$/.test(accounts.counter_account)&&/^\d{0,4}$/.test(accounts.tax_key??''),'DATEV_MAPPING','Für '+exact+' fehlt ein von der Kanzlei bestätigtes Kontenmapping. Unterschiedliche Steuergruppen und Anzahlungs-/Schlussrechnungsfälle getrennt zuordnen.');
  return{...group,taxCategory:group.category,taxRate:group.rate,mappingKey:key,accounts};
 });
}
