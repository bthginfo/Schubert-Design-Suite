import type {Row} from './types.ts';

export const reportMetrics = [
  {key:'ordered_net',legacy:'orderedNet',label:'Beauftragter Nettowert',unit:'currency',href:'/orders',help:'Angenommene Aufträge und bestätigte Nachträge; nicht ausgewählte Optionen bleiben ausgeschlossen.'},
  {key:'invoiced_net',legacy:'invoicedNet',label:'Fakturierter Nettowert',unit:'currency',href:'/invoices',help:'Wirksam ausgestellte Rechnungen mit ihren Berichtigungen. Anzahlungen und Schlussrechnungen werden nicht doppelt gezählt.'},
  {key:'performance_value',legacy:'performanceValue',label:'Bewertete Leistung',unit:'currency',href:'/performance-valuations',help:'Bestätigte Leistungsbewertung mit dokumentierter Grundlage. Dieser Wert ist weder Zahlungseingang noch automatisch Umsatz.'},
  {key:'received_payments',legacy:'receivedPayments',label:'Tatsächliche Zahlungseingänge',unit:'currency',href:'/payments',help:'Tatsächlich gebuchte Eingänge nach Erstattungen. Noch nicht zugeordnete Beträge bleiben gesondert erkennbar.'},
  {key:'receivables_open',legacy:'openReceivables',label:'Offene Forderungen',unit:'currency',href:'/receivables',help:'Noch offene, bestätigte Kundenforderungen nach Zahlungen und Verrechnungen.'},
  {key:'payables_open',legacy:'openPayables',label:'Offene Verbindlichkeiten',unit:'currency',href:'/payables',help:'Noch offene, bestätigte Lieferantenverbindlichkeiten nach Zahlungen und Verrechnungen.'},
  {key:'direct_actual_costs',legacy:'directActualCosts',label:'Direkte Istkosten',unit:'currency',href:'/orders',help:'Tatsächlich verbrauchtes Material, freigegebene Arbeit und bestätigte direkte Fremdleistungen. Offene Bewertungsgrundlagen werden ausgewiesen.'},
  {key:'quote_win_rate',legacy:'winRate',label:'Abschlussquote',unit:'percent',href:'/quotes',help:'Gewonnene geteilt durch gewonnene und verlorene Angebotsfälle im ausgewiesenen Zeitraum; Versionen zählen nicht als neue Fälle.'},
  {key:'planned_utilization',legacy:'utilization',label:'Geplante Auslastung',unit:'percent',href:'/dispatch',help:'Geplante Stunden im Verhältnis zur bestätigten verfügbaren Kapazität nach Abwesenheiten.'},
  {key:'time_completeness',legacy:'timeCompleteness',label:'Vollständigkeit der Zeiten',unit:'percent',href:'/time-reviews',help:'Bestätigte Zeitgrundlagen für den betrachteten Zeitraum. Fehlende Abgaben sind keine Nullstunden.'}
] as const;

export function reportNumber(value:unknown):number|null {
  if(value===null||value===undefined||value==='')return null;
  const number=Number(value);
  return Number.isFinite(number)?number:null;
}

export function reportMoney(value:unknown,currency?:string):string {
  const number=reportNumber(value);
  if(number===null)return 'Noch nicht bestätigt';
  if(currency&&/^[A-Z]{3}$/.test(currency))return new Intl.NumberFormat('de-DE',{style:'currency',currency}).format(number);
  return new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(number)+' · Währung offen';
}

export function reportQuantity(value:unknown,unit=''):string {
  const number=reportNumber(value);
  return number===null?'Noch nicht bestätigt':new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(number)+(unit?' '+unit:'');
}

export function reportMetricValue(metrics:Row,key:string,legacy?:string):unknown {
  const value=metrics[key]??(legacy?metrics[legacy]:undefined);
  if(value&&typeof value==='object')return value.value??value.amount??null;
  return value;
}

export function metricDrilldown(href:string,from:string,to:string,business='',metric='') {
  const [path,query='']=href.split('?');
  const params=new URLSearchParams(query);
  if(from)params.set('from',from);
  if(to)params.set('to',to);
  if(business)params.set('business_unit',business);
  if(metric)params.set('metric',metric);
  return path+(params.size?'?'+params:'');
}

export function reportMonthDrilldown(href:string,month:string,from:string,to:string,business='',currency='',metric='') {
  let startsOn=from,endsOn=to;
  if(/^\d{4}-\d{2}$/.test(month)){
    const first=month+'-01';
    const last=month+'-'+String(new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate()).padStart(2,'0');
    startsOn=from&&from>first?from:first;
    endsOn=to&&to<last?to:last;
  }
  const url=new URL(metricDrilldown(href,startsOn,endsOn,business,metric),'https://report.invalid');
  if(/^[A-Z]{3}$/.test(currency))url.searchParams.set('currency',currency);
  return url.pathname+url.search;
}

export function reportList(value:unknown):Row[] {return Array.isArray(value)?value:[];}
