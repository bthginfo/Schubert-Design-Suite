import {zipSync,strToU8} from 'fflate';
import {withTenant,update} from '@schubert/db';
import type {ActorContext} from '@schubert/contracts';
import {csvExport,createBusinessPdf} from '@schubert/documents';
import {requireRule} from '@schubert/domain';
import {getRecord,hash} from './core.js';
export async function runReportExport(ctx:ActorContext,job:any,deps:{guardLease:Function;generatedDocument:Function}){
 const record=await withTenant(ctx,db=>getRecord(db,'report_snapshots',job.payload.reportId));
 requireRule(record.content_hash===job.payload.contentHash&&hash(record.snapshot)===record.content_hash,'REPORT_SNAPSHOT_HASH','Der eingefrorene Bericht stimmt nicht mit seinem Inhaltsnachweis überein.');
 if(record.document_id)return{reportId:record.id,documentId:record.document_id};
 const s=record.snapshot,financial=s.context.financial===true;
 const files:Record<string,Uint8Array>={'Bericht.json':strToU8(JSON.stringify(s,null,2)),'Kennzahlendefinitionen.json':strToU8(JSON.stringify(s.definitions,null,2))};
 const tables:[string,any[],string[]][]=[
  ['Teamkapazitaet',s.capacity??[],['team_name','week_start','contract_hours','available_hours','planned_hours','issues']],
  ['Materialbedarf',s.material_forecast??[],['product_name','unit','required_at','required_quantity','consumed_quantity','outstanding_quantity','cumulative_required_quantity','expected_stock','confirmed_supply','shortage','stock_as_of','order_names','basis']],
  ['Zeitvollstaendigkeit',s.time_completeness??[],['day','expected_days','reported_days','missing_basis']],
  ['Pruefhinweise',s.issues??[],['title','description','entity_type','status','href']],
  ['Naechste_Schritte',s.recommendations??[],['title','reason','outcome','feedback_reason','as_of','href']]
 ];
 if(financial)tables.unshift(
  ['Monatsentwicklung',s.series??[],['month','currency','ordered_net','invoiced_net','performance_value','received_payments']],
  ['Auftragskosten',s.order_costs??[],['order_number','title','currency','ordered_net','planned_costs','direct_actual_costs','committed_remaining_costs','uncommitted_remaining_costs','etc','eac','expected_contribution','expected_contribution_percent','performance_value','valuation_date','estimate_version','estimate_date','cost_level','issues']],
  ['Faelligkeiten',s.aging??[],['kind','bucket','label','currency','disputed','amount','count']],
  ['Liquiditaet',s.liquidity??[],['date','as_of','currency','scenario','scenario_label','opening_balance','expected_inflows','expected_outflows','expected_balance','excluded_count','message']],
  ['Unzugeordnete_Zahlungen',s.unallocated_payments??[],['currency','direction','amount']]
 );
 for(const [name,rows,columns]of tables)files[name+'.csv']=strToU8(csvExport(rows,columns));
 const value=(v:unknown,unit='')=>v===null||v===undefined?'noch nicht bestätigt':String(v)+(unit?' '+unit:'');
 const lines:any[]=[];
 const heading=(description:string)=>lines.push({line_type:'heading',description});
 const text=(description:string)=>lines.push({line_type:'text',description});
 if(financial){
  heading('Bestätigte Hauptkennzahlen · '+s.context.currency);
  for(const [key,label]of [['ordered_net','Beauftragter Nettowert'],['invoiced_net','Fakturierter Nettowert'],['received_payments','Tatsächliche Zahlungseingänge'],['receivables_open','Aktuell offene Forderungen'],['direct_actual_costs','Direkte Istkosten']])text(label+': '+value(s.metrics?.[key],s.context.currency));
  heading('Direkte Auftragskosten und Restaufwand');
  for(const order of s.order_costs??[])text(order.order_number+' · '+order.title+' · '+order.currency+'\nIstkosten '+value(order.direct_actual_costs)+' · Restkosten '+value(order.etc)+' · Erwartete Gesamtkosten '+value(order.eac)+'\n'+(order.issues??[]).join(' · '));
  heading('Liquidität · belegte Grundlage und ausdrückliche Szenarien');
  for(const row of s.liquidity??[])text(row.date+' · '+row.scenario_label+' · '+row.currency+'\nTagesbeginn/Grundlage '+row.as_of+' · Ausgangsbestand '+value(row.opening_balance)+' · erwartete Eingänge '+value(row.expected_inflows)+' · erwartete Ausgänge '+value(row.expected_outflows)+' · erwarteter Bestand '+value(row.expected_balance)+'\n'+(row.message??''));
 }
 heading('Verfügbare Teamkapazität');
 for(const row of s.capacity??[])text(row.team_name+' · Woche ab '+row.week_start+'\nVertraglich '+value(row.contract_hours,'Stunden')+' · verfügbar '+value(row.available_hours,'Stunden')+' · geplant '+value(row.planned_hours,'Stunden')+'\n'+(row.issues??[]).join(' · '));
 heading('Materialbedarf nach Datum und Produkt');
 if(!(s.material_forecast??[]).length)text('Noch keine bestätigte Materialvorschau im ausgewiesenen Stand. Fehlender Bedarf ist keine bestätigte Nullmenge.');
 for(const row of s.material_forecast??[])text(row.product_name+' · benötigt am '+row.required_at+' · '+row.unit+'\nOffener Bedarf '+value(row.outstanding_quantity)+' · kumuliert '+value(row.cumulative_required_quantity)+' · zugeteilter Bestand '+value(row.expected_stock)+' · bestätigter Zugang '+value(row.confirmed_supply)+' · Fehlmenge '+value(row.shortage)+'\n'+row.basis);
 heading('Begründete Prüfschritte');
 for(const row of s.recommendations??[])text(row.title+'\n'+row.reason+(row.outcome?'\nDokumentierte Rückmeldung: '+row.outcome+(row.feedback_reason?' · '+row.feedback_reason:''):''));
 const terms='Datenstand '+new Date(record.data_as_of).toLocaleString('de-DE',{timeZone:'Europe/Berlin'})+' · '+record.definition_version+'\n'+(financial?'Die beigefügten Tabellen und JSON-Daten erhalten die Definitionen, Währungen und unbekannten Werte. Direkte Auftragskosten enthalten keine pauschalen Gemeinkosten; dies ist kein Hauptbuch oder steuerlicher Jahresgewinn.':'Diese gesicherte Auswertung enthält ausschließlich die berechtigte operative Sicht: Kapazität, Material und belegte Klärungsschritte. Fehlende Grundlagen bleiben als unbekannt ausgewiesen.');
 files['Bericht.pdf']=await createBusinessPdf({issuer:{name:s.context.legalEntityName},customer:{name:'Interne Auswertung'},quote:{number:'Bericht '+record.id,title:(financial?'Controlling ':'Operative Auswertung ')+record.filters.from+' bis '+record.filters.to,terms},lines:lines.map((line,index)=>({...line,position:index+1})),net_total:'0',tax_total:'0',gross_total:'0'},{kind:financial?'Controlling · gespeicherter Bericht':'Gesicherte operative Auswertung',omitTotals:true});
 files['Pruefsumme.txt']=strToU8('SHA-256 des kanonischen Berichtssnapshots: '+record.content_hash+'\nDefinitionsstand: '+record.definition_version+'\n');
 await deps.guardLease(ctx,job);
 const doc=await deps.generatedDocument(ctx,zipSync(files,{level:6}),'Controlling_'+record.filters.from+'_'+record.filters.to+'.zip','application/zip','report_snapshot',record.id,'internal',job);
 await withTenant(ctx,async db=>{const live=await getRecord(db,'job_runs',job.id,true);requireRule(live.status==='running'&&String(live.fencing_token)===String(job.fencing_token)&&new Date(live.lease_until)>new Date(),'STALE_JOB_FENCE','Ein neuer Berichtversuch hat die Ausgabe übernommen.',409);await update(db,'report_snapshots',record.id,{document_id:doc.id,status:'ready'});});
 return{reportId:record.id,documentId:doc.id,contentHash:record.content_hash};
}
