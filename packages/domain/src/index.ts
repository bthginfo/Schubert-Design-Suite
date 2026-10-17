import { Decimal } from 'decimal.js';
import type { SalesLine } from '@schubert/contracts';
Decimal.set({precision:40,rounding:Decimal.ROUND_HALF_UP});
export {Decimal};
export class DomainError extends Error {constructor(public code:string,message:string,public status=422,public fields?:Record<string,string>){super(message);this.name='DomainError';}}
export function requireRule(condition:unknown,code:string,message:string,status=422):asserts condition{if(!condition)throw new DomainError(code,message,status);}
export const dec=(v:Decimal.Value)=>new Decimal(typeof v==='string'?v.replace(',','.'):v);
export const money=(v:Decimal.Value)=>dec(v).toFixed(2);
export function calculateLines(lines:SalesLine[]){
 const groups=new Map<string,{rate:string;category:string|null;reason:string|null;base:Decimal}>();let net=new Decimal(0),sectionNet=new Decimal(0);const calculated=lines.map((line,index)=>{
 requireRule(dec(line.discount_percent).gte(0)&&dec(line.discount_percent).lte(100),'DISCOUNT','Rabatt muss zwischen 0 und 100 Prozent liegen.');
 requireRule(dec(line.quantity).gte(0),'QUANTITY','Menge darf nicht negativ sein.');requireRule(dec(line.tax_rate).gte(0)&&dec(line.tax_rate).lte(100),'TAX_RATE','Steuersatz prüfen.');
 if(line.line_type==='heading')sectionNet=new Decimal(0);requireRule(line.cost_unit===undefined||line.cost_unit===null||dec(line.cost_unit).gte(0),'LINE_COST','Geplante Einzelkosten dürfen nicht negativ sein.');const selected=line.line_type==='item'&&(!line.optional||line.selected);const amount=line.line_type==='subtotal'?sectionNet:selected?dec(line.quantity).mul(line.unit_price).mul(dec(1).minus(dec(line.discount_percent).div(100))).toDecimalPlaces(2):new Decimal(0);
 if(line.line_type==='subtotal')sectionNet=new Decimal(0);if(selected){sectionNet=sectionNet.add(amount);net=net.add(amount);const category=line.tax_category??null,reason=line.tax_exemption_reason??null,key=[dec(line.tax_rate).toString(),category,reason].join('|'),old=groups.get(key);groups.set(key,{rate:line.tax_rate,category,reason,base:(old?.base??new Decimal(0)).add(amount)});}
 return {...line,position:index+1,net_amount:amount.toFixed(2)};});
 const tax_summaries=[...groups.values()].map(({rate,category,reason,base})=>({tax_rate:rate,tax_category:category,tax_exemption_reason:reason,net_amount:money(base),tax_amount:money(base.mul(rate).div(100))}));
 const tax=tax_summaries.reduce((sum,g)=>sum.add(g.tax_amount),new Decimal(0));return {lines:calculated,net_total:money(net),tax_total:money(tax),gross_total:money(net.add(tax)),tax_summaries};
}
export function finalReceivable(total:string,receivedAdvances:string[]){return money(dec(total).minus(receivedAdvances.reduce((a,v)=>a.add(v),new Decimal(0))));}
export function proportionalCut(totalArea:string,totalCost:string,outputs:{area:string}[]){const area=outputs.reduce((s,o)=>s.add(o.area),new Decimal(0));requireRule(area.eq(totalArea),'CUT_BALANCE','Flächen von Fertigteilen, Resten und Verschnitt müssen die Eingangsfläche ergeben.');let assigned=new Decimal(0);return outputs.map((o,i)=>{const cost=i===outputs.length-1?dec(totalCost).minus(assigned):dec(totalCost).mul(o.area).div(totalArea).toDecimalPlaces(2);assigned=assigned.add(cost);return {...o,cost:money(cost)};});}
export function durationSeconds(start:string|Date,end:string|Date){const duration=(new Date(end).getTime()-new Date(start).getTime())/1000;requireRule(Number.isFinite(duration)&&duration>=0,'TIME_INTERVAL','Ende muss nach Beginn liegen.');return Math.round(duration);}
export function laborCost(seconds:number,rate:string){return money(dec(seconds).div(3600).mul(rate));}
export const rolePermissions:Record<string,string[]>={
 Owner:['crm','sales','orders','billing','billing.invoice.issue','finance','purchasing','catalog','inventory','planning','dispatch','time','time.approve','documents','imports','tasks','reports','portal.publish','admin','audit','system','finance.bank.manage'],
 Office:['reports.read','crm','sales','orders','billing','purchasing','catalog','documents','tasks','time','portal.publish'],
 Finance:['catalog.read','crm','billing','billing.invoice.issue','finance','purchasing','documents','reports','time','tasks'],
 Planner:['reports.read','orders','planning','catalog','documents','time','tasks'],Dispatcher:['reports.read','documents','orders','dispatch','time','time.approve','tasks'],Workshop:['documents','orders','inventory','time','tasks'],Employee:['documents','orders','time','tasks'],HR:['hr','time','time.approve','tasks'],TaxAdvisor:['finance.read','reports','documents','time'],TechAdmin:['system','admin.technical'],Portal:[]};
rolePermissions.SuperAdmin=[...new Set([...rolePermissions.Owner,'hr','admin.technical','admin.integrations'])];
for(const permissions of Object.values(rolePermissions))if(permissions.includes('documents')||permissions.includes('hr'))permissions.push('documents.upload');
export function assertPermission(permissions:string[],permission:string){requireRule(permissions.includes(permission),'FORBIDDEN','Für diesen Vorgang fehlt die Berechtigung.',403);}
export function assertVersion(actual:number,expected?:number){requireRule(expected!==undefined&&actual===expected,'VERSION_CONFLICT','Der Datensatz wurde inzwischen geändert. Aktuellen Stand laden und Änderungen prüfen.',409);}
export function assertFreshAuth(at?:Date|null){requireRule(at&&Date.now()-new Date(at).getTime()<5*60_000,'REAUTH_REQUIRED','Passwort für diesen sensiblen Vorgang erneut bestätigen.',403);}
export function earliestErasureDate(date:string,years:number){const year=new Date(date).getUTCFullYear();return new Date(Date.UTC(year+years+1,0,1));}
export function escapeCsv(value:unknown){let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
export function htmlEscape(v:unknown){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}

export {invoicePolicySchema,invoicePolicyDecision} from './invoice-policy.js';
