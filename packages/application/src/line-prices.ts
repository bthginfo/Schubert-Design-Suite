import {dec,requireRule} from '@schubert/domain';
import type {SalesLine} from '@schubert/contracts';
export function priceCalendarDay(value:unknown){if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return value;const parsed=new Date(value as string);return Number.isFinite(parsed.getTime())?new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(parsed):'';}
const date=priceCalendarDay;
export function bindLinePrices(input:{lines:SalesLine[];prices:any[];existing:any[];currency:string;asOf:string;timestamp:string;sales:boolean}){
 const prices=new Map(input.prices.map(price=>[price.id,price]));
 return input.lines.map((line,index)=>{
  if(!line.price_version_id)return{...line,price_applied_at:null};
  const price=prices.get(line.price_version_id);
  requireRule(price&&price.product_id===line.product_id,'LINE_PRICE_PRODUCT','Preisstand und Artikel müssen zusammengehören.');
  const prior=input.existing.find(old=>(line.id?old.id===line.id:old.position===index+1)&&old.product_id===line.product_id&&old.price_version_id===line.price_version_id&&old.unit===line.unit&&dec(old.unit_price).eq(line.unit_price)&&dec(old.tax_rate).eq(line.tax_rate));
  const selectedOn=prior?.price_applied_at?date(prior.price_applied_at):input.asOf;
  requireRule(price.selection_current!==false||prior,'LINE_PRICE_SUPERSEDED','Dieser Preisstand wurde für neue Übernahmen bereits ersetzt. Wählen Sie den aktuellen freigegebenen Stand; bestehende Bindungen bleiben erhalten.');
  requireRule(price.currency===input.currency&&price.unit===line.unit,'LINE_PRICE_UNIT','Preisstand, Positions- und Belegwährung sowie Einheit müssen übereinstimmen.');
  requireRule(input.sales?price.status==='approved'&&price.approved_at:price.status==='approved','LINE_PRICE_APPROVAL','Nur einen tatsächlich freigegebenen passenden Preisstand übernehmen.');
  requireRule(price.valid_from&&date(price.valid_from)<=selectedOn&&(!price.valid_until||date(price.valid_until)>=selectedOn),'LINE_PRICE_DATE','Dieser Preisstand war am Übernahmedatum nicht gültig. Einen passenden aktuellen Preis wählen oder den Preis ausdrücklich manuell erfassen.');
  requireRule(dec(line.quantity).abs().gte(price.min_quantity??0),'LINE_PRICE_QUANTITY','Die Positionsmenge unterschreitet die bestätigte Mindestmenge des Preisstands.');
  const basis=dec(price.basis_quantity??1);requireRule(basis.gt(0),'LINE_PRICE_BASIS','Die Preisbasismenge muss bestätigt und positiv sein.');
  requireRule(dec(line.unit_price).eq(dec(price.amount).div(basis).toDecimalPlaces(6)),'LINE_PRICE_AMOUNT','Der Einzelpreis entspricht nicht dem ausgewählten Preisstand. Für eine bewusste manuelle Preisabweichung die Preisbindung lösen.');
  if(input.sales)requireRule(price.tax_rate!==null&&price.tax_rate!==undefined&&dec(line.tax_rate).eq(price.tax_rate),'LINE_PRICE_TAX','Der Steuersatz weicht vom bestätigten Verkaufspreisstand ab. Einen passenden Stand wählen oder die Preisbindung für den besonderen Steuerfall lösen.');
  return{...line,price_applied_at:prior?.price_applied_at??input.timestamp};
 });
}
