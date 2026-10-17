import {dec,money} from '@schubert/domain';
export function orderCostRow(input:any){
 const issues:string[]=[];const confirmedNet=input.confirmed_net===undefined?input.budget_net:input.confirmed_net;if(input.confirmed_net!==undefined&&(input.agreed_at===null||confirmedNet===null))issues.push('Bestätigter Beauftragungszeitpunkt oder damaliger Auftragswert fehlt.');
 if(Number(input.material_unknown)>0)issues.push('Bewerteter Materialverbrauch oder passende Auftragswährung ist nicht bestätigt.');
 if(Number(input.labor_unknown)>0)issues.push('Bestätigter interner Arbeitskostensatz in der Auftragswährung fehlt.');
 if(Number(input.allocation_unknown)>0)issues.push('Kostenart oder Währungsgrundlage einer Eingangsrechnung ist ungeklärt.');
 if(Number(input.committed_unknown)>0)issues.push('Preis oder Zuordnung einer Restverpflichtung fehlt.');
 if(!input.estimate_id)issues.push('Bestätigte Restschätzung fehlt.');
 const actual=Number(input.material_unknown)+Number(input.labor_unknown)+Number(input.allocation_unknown)>0?null:money(dec(input.material_actual??0).add(input.labor_actual??0).add(input.direct_services??0));
 const committed=Number(input.committed_unknown)>0?null:money(input.committed_remaining??0);
 const uncommitted=input.estimate_id?money(input.uncommitted_remaining_amount):null;
 const etc=committed!==null&&uncommitted!==null?money(dec(committed).add(uncommitted)):null;
 const eac=actual!==null&&etc!==null?money(dec(actual).add(etc)):null;
 const contribution=eac!==null&&confirmedNet!==null&&confirmedNet!==undefined?money(dec(confirmedNet).minus(eac)):null;
 return{...input,budget_net:confirmedNet,ordered_net:confirmedNet,order_id:input.id,order_number:input.number,planned_costs:Number(input.planned_unknown)>0||Number(input.planned_lines)===0?null:money(input.planned_costs??0),direct_actual_costs:actual,committed_remaining_costs:committed,uncommitted_remaining_costs:uncommitted,etc,eac,expected_contribution:contribution,expected_contribution_percent:contribution!==null&&dec(confirmedNet).gt(0)?dec(contribution).div(confirmedNet).mul(100).toFixed(2):null,estimate_version:input.estimate_version??null,estimate_date:input.estimate_date??null,cost_level:'direct',issues,by_type:[{label:'Materialverbrauch',direct_actual_costs:Number(input.material_unknown)?null:money(input.material_actual??0)},{label:'Freigegebene Arbeit',direct_actual_costs:Number(input.labor_unknown)?null:money(input.labor_actual??0)},{label:'Direkte Fremd-, Maschinen- und Transportleistungen',direct_actual_costs:Number(input.allocation_unknown)?null:money(input.direct_services??0)}]};
}
export function agingBucket(due:string|Date|null,asOf:string){if(!due)return'unknown';const days=Math.floor((Date.parse(asOf)-new Date(due).getTime())/86400000);return days<=0?'not_due':days<=14?'1_14':days<=30?'15_30':days<=60?'31_60':'over_60';}
export function capacityRows(daily:any[]){
 const groups=new Map<string,any>();for(const d of daily){const key=d.team_name+'|'+d.week_start,group=groups.get(key)??{team_name:d.team_name,week_start:d.week_start,contract_hours:'0',available_hours:'0',planned_hours:'0',issues:[]};
  group.planned_hours=dec(group.planned_hours).add(d.planned_hours??0).toFixed(2);
  if(d.contract_hours===null||d.basis_missing){group.contract_hours=null;group.available_hours=null;if(!group.issues.includes('Bestätigte Beschäftigungs-, Arbeitsmodell- oder Kalendergrundlage fehlt.'))group.issues.push('Bestätigte Beschäftigungs-, Arbeitsmodell- oder Kalendergrundlage fehlt.');}
  else{if(d.available_hours===null){group.available_hours=null;if(!group.issues.includes('Bestätigte Abwesenheitsstunden fehlen.'))group.issues.push('Bestätigte Abwesenheitsstunden fehlen.');}if(group.contract_hours!==null)group.contract_hours=dec(group.contract_hours).add(d.contract_hours).toFixed(2);if(group.available_hours!==null)group.available_hours=dec(group.available_hours).add(d.available_hours??0).toFixed(2);}groups.set(key,group);
 }return[...groups.values()];
}

function day(value:any){if(value instanceof Date)return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(value);return String(value??'').slice(0,10);}
const quantity=(value:any)=>value===null||value===undefined||value===''?null:dec(value);
const positive=(value:any)=>{const amount=quantity(value);return amount&&amount.gt(0)?amount:dec(0);};

/** Free stock, reservations and supply lots are spent once in a planning projection, never booked. */
export function materialForecast(input:{requirements:any[];stocks:any[];reservations:any[];supplies:any[];consumption:any[];from:string;to:string;asOf:string}){
 const free=new Map<string,ReturnType<typeof dec>>(),unknown=new Set<string>(),reserved=new Map<string,ReturnType<typeof dec>>(),consumed=new Map<string,ReturnType<typeof dec>>();
 const productKey=(row:any)=>row.product_id+'|'+row.unit;
 const orderKey=(row:any)=>row.order_id+'|'+productKey(row);
 for(const item of input.stocks){const key=productKey(item);if(item.quantity===null||item.quantity===undefined){unknown.add(key);continue;}const available=dec(item.quantity).minus(item.reserved_quantity??0);free.set(key,(free.get(key)??dec(0)).add(available.gt(0)?available:0));}
 for(const item of input.reservations){const key=orderKey(item);reserved.set(key,(reserved.get(key)??dec(0)).add(item.quantity));}
 for(const item of input.consumption){const key=orderKey(item);consumed.set(key,(consumed.get(key)??dec(0)).add(item.consumed_quantity??0));}
 const lots=input.supplies.map(item=>({...item,remaining:positive(item.quantity),confirmed:!!item.confirmed&&!!item.delivery_date}));
 const groups=new Map<string,any>();
 for(const item of [...input.requirements].sort((a,b)=>day(a.required_on).localeCompare(day(b.required_on))||String(a.id).localeCompare(String(b.id)))){
  const date=day(item.required_on),key=productKey(item),owner=orderKey(item);if(date>input.to)continue;
  const known=quantity(item.quantity),used=known?positive(consumed.get(owner)??0).lte(known)?positive(consumed.get(owner)??0):known:dec(0);
  consumed.set(owner,positive(consumed.get(owner)??0).minus(used));
  const outstanding=known?known.minus(used):null;
  const groupKey=key+'|'+date,group=groups.get(groupKey)??{product_id:item.product_id,product_name:item.product_name,unit:item.unit,required_at:date,required_quantity:dec(0),outstanding_quantity:dec(0),consumed_quantity:dec(0),allocated_stock:dec(0),allocated_supply:dec(0),requirement_ids:[],order_ids:[],order_names:[],unknown:false,quantity_unknown:false,issues:[]};
  group.requirement_ids.push(item.id);if(!group.order_ids.includes(item.order_id)){group.order_ids.push(item.order_id);group.order_names.push(item.order_number||item.order_title||'Auftrag');}
  if(!known){group.unknown=true;group.quantity_unknown=true;group.issues.push('Bestätigte Bedarfsmenge fehlt.');groups.set(groupKey,group);continue;}
  group.required_quantity=group.required_quantity.add(known);group.consumed_quantity=group.consumed_quantity.add(used);group.outstanding_quantity=group.outstanding_quantity.add(outstanding!);
  let missing=outstanding!;
  const take=(available:ReturnType<typeof dec>)=>{const amount=available.gte(missing)?missing:available;missing=missing.minus(amount);return amount;};
  const own=positive(reserved.get(owner)??0),ownUsed=take(own);reserved.set(owner,own.minus(ownUsed));group.allocated_stock=group.allocated_stock.add(ownUsed);
  const supply=(dedicated:boolean)=>{for(const lot of lots.filter(lot=>productKey(lot)===key&&lot.confirmed&&day(lot.delivery_date)<=date&&(dedicated?lot.order_id===item.order_id:!lot.order_id)).sort((a,b)=>day(a.delivery_date).localeCompare(day(b.delivery_date))||String(a.id).localeCompare(String(b.id)))){const amount=take(lot.remaining);lot.remaining=lot.remaining.minus(amount);group.allocated_supply=group.allocated_supply.add(amount);if(missing.eq(0))break;}};supply(true);
  const pool=free.get(key)??dec(0),poolUsed=take(pool);free.set(key,pool.minus(poolUsed));group.allocated_stock=group.allocated_stock.add(poolUsed);supply(false);
  if(missing.gt(0)&&unknown.has(key))group.unknown=true;
  if(lots.some(lot=>productKey(lot)===key&&lot.remaining.gt(0)&&(!lot.order_id||lot.order_id===item.order_id)&&(!lot.confirmed||day(lot.delivery_date)>date)))group.issues.push('Unbestätigte oder nach dem Bedarf liegende Liefertermine zählen nicht als gesicherter Zulauf.');
  groups.set(groupKey,group);
 }
 const cumulative=new Map<string,ReturnType<typeof dec>>();
 return [...groups.values()].sort((a,b)=>a.required_at.localeCompare(b.required_at)||a.product_id.localeCompare(b.product_id)).map(group=>{
  const key=productKey(group);cumulative.set(key,(cumulative.get(key)??dec(0)).add(group.outstanding_quantity));
  const gap=group.outstanding_quantity.minus(group.allocated_stock).minus(group.allocated_supply);
  return{...group,required_quantity:group.quantity_unknown?null:group.required_quantity.toString(),outstanding_quantity:group.quantity_unknown?null:group.outstanding_quantity.toString(),consumed_quantity:group.consumed_quantity.toString(),expected_stock:group.allocated_stock.toString(),confirmed_supply:group.allocated_supply.toString(),shortage:group.unknown?null:(gap.gt(0)?gap:dec(0)).toString(),cumulative_required_quantity:cumulative.get(key)!.toString(),allocated_stock:undefined,allocated_supply:undefined,issues:[...new Set(group.issues)],stock_as_of:input.asOf,basis:'Aktueller bestätigter Bestand; Bedarfe nach Termin kumuliert. Diese Vorschau erzeugt keine Reservierung.',href:'/material-requirements?'+new URLSearchParams({product_id:group.product_id,required_on:group.required_at})};
 }).filter(group=>group.required_at>=input.from);
}

/** Contractual due dates are scenarios, never asserted bank receipts or guessed delay dates. */
export function liquidityForecast(input:{accounts:any[];openings:any[];payments:any[];openItems:any[];from:string;to:string;asOf:string;currency:string;businessUnit?:string|null}){
 const baseline=input.to<input.asOf?input.to:input.asOf;
 const currencies=new Set<string>([input.currency,...input.openItems.map(row=>row.currency),...input.openings.map(row=>row.currency)].filter(Boolean));
 const balances=new Map<string,ReturnType<typeof dec>>(),unknown=new Set<string>(),accountProofs:any[]=[];
 let unknownCurrency=false;
 for(const account of input.accounts){
  const accountIds=account.bank_account_ids||[account.id];const candidates=input.openings.filter(row=>accountIds.includes(row.bank_account_id)&&day(row.as_of)<=baseline).sort((a,b)=>day(b.as_of).localeCompare(day(a.as_of))||String(b.created_at??'').localeCompare(String(a.created_at??'')));
  const opening=candidates[0],declared=opening?.currency||input.openings.find(row=>accountIds.includes(row.bank_account_id))?.currency;
  if(declared)currencies.add(declared);else unknownCurrency=true;
  if(!opening){if(declared)unknown.add(declared);accountProofs.push({bank_account_id:account.id,holder:account.holder,currency:declared||null,current_balance:null,message:'Kein am Stichtag bestätigter Anfangsbestand.'});continue;}
  const posted=input.payments.filter(row=>accountIds.includes(row.bank_account_id)&&day(row.booking_date)>=day(opening.as_of)&&day(row.booking_date)<=baseline);
  if(posted.some(row=>row.currency!==opening.currency)){unknown.add(opening.currency);accountProofs.push({bank_account_id:account.id,holder:account.holder,currency:opening.currency,current_balance:null,message:'Kontobewegungen haben ungeklärte abweichende Währungen.'});continue;}
  const balance=posted.reduce((sum,row)=>sum.add(row.direction==='outgoing'?dec(row.amount).neg():dec(row.amount)),dec(opening.amount));
  balances.set(opening.currency,(balances.get(opening.currency)??dec(0)).add(balance));accountProofs.push({bank_account_id:account.id,holder:account.holder,currency:opening.currency,opening_amount:opening.amount,opening_date:day(opening.as_of),source_document_version_id:opening.source_document_version_id,current_balance:money(balance)});
 }
 const results:any[]=[];
 for(const currency of currencies){
  const items=input.openItems.filter(row=>row.currency===currency),excluded=items.filter(row=>!row.due_date||day(row.due_date)<baseline||row.disputed||dec(row.open_amount).lt(0));
  const events=items.filter(row=>row.due_date&&day(row.due_date)>=baseline&&day(row.due_date)<=input.to&&!row.disputed&&dec(row.open_amount).gt(0));
  const dates=[...new Set([baseline,...events.map(row=>day(row.due_date)),...(input.from>baseline?[input.from]:[]),input.to])].filter(date=>date>=baseline&&date<=input.to).sort();
  const hasBalance=input.accounts.length>0&&!unknownCurrency&&!unknown.has(currency)&&balances.has(currency)&&!input.businessUnit;
  const base=hasBalance?balances.get(currency)!:null;
  const historical=input.to<input.asOf;
  for(const scenario of historical?['actual']:['due_dates','no_unconfirmed_receipts']){
   let running=base;
   for(const date of dates){
    const today=historical?[]:events.filter(row=>day(row.due_date)===date);
    const incoming=today.filter(row=>row.kind==='receivable').reduce((sum,row)=>sum.add(row.open_amount),dec(0));
    const outgoing=today.filter(row=>row.kind==='payable').reduce((sum,row)=>sum.add(row.open_amount),dec(0));
    const receipts=scenario==='no_unconfirmed_receipts'?dec(0):incoming;
    const opening=running;running=running?running.add(receipts).minus(outgoing):null;
    if(date<input.from)continue;
    const explanation=[input.businessUnit?'Der Bankbestand ist nicht verlässlich auf einzelne Geschäftsbereiche aufgeteilt.':!hasBalance?'Mindestens ein eigener Bankanfangsbestand oder eine Kontowährung ist nicht bestätigt.':'Bestand aus bestätigter Eröffnung und tatsächlich zugeordneten Kontobuchungen.',historical?'Historischer Bankstand; heutige offene Posten werden nicht rückwirkend als damalige Prognose verwendet.':scenario==='no_unconfirmed_receipts'?'Ausdrückliche Vorsichtsannahme: keine noch unbestätigten Kundeneingänge; fällige bestätigte Ausgänge bleiben enthalten.':'Noch offene, unstrittige positive Posten zu ihrer vertraglichen Fälligkeit; Zahlungseingänge sind nicht zugesichert.',excluded.length?`${excluded.length} Posten mit überfälligem/fehlendem Termin, Strittigkeit oder Gutschrift benötigen gesonderte Klärung; es wird kein Zahlungstag erfunden.`:''].filter(Boolean).join(' ');
    results.push({date,as_of:baseline,currency,scenario,scenario_label:scenario==='actual'?'Nachgewiesener Bankstand':scenario==='due_dates'?'Vertragliche Fälligkeiten · ungesichert':'Ohne unbestätigte Kundeneingänge',opening_balance:opening===null?null:money(opening),expected_inflows:money(receipts),expected_outflows:money(outgoing),expected_balance:running===null?null:money(running),excluded_count:excluded.length,excluded_items:excluded.map(row=>({id:row.id,kind:row.kind,amount:row.open_amount,due_date:row.due_date,disputed:row.disputed,href:'/'+(row.kind==='payable'?'payables':'receivables')+'/'+row.id})),accounts:accountProofs.filter(row=>!row.currency||row.currency===currency),message:explanation,href:undefined});
   }
  }
 }
 return results;
}
