import type {Row} from './types.ts';

export const deliveryUnits=[{value:'piece',label:'Stück'},{value:'mm',label:'mm'},{value:'m',label:'m'},{value:'m2',label:'m²'},{value:'m3',label:'m³'},{value:'kg',label:'kg'},{value:'h',label:'Stunde'},{value:'day',label:'Tag'},{value:'package',label:'Pauschale'}];
export const deliveryKinds=[{value:'delivery',label:'Tatsächlich geliefert'},{value:'return',label:'Tatsächlich zurückgenommen'},{value:'missing',label:'Fehlmenge dokumentieren'}];

/** Delivery documents carry quantities and provenance only. Commercial values never leave this editor. */
export function deliveryLinePayload(lines:Row[]){return lines.map(line=>({
  ...(line.id?{id:line.id}:{}),description:String(line.description||'').trim(),quantity:String(line.quantity??'').trim().replace(',','.'),unit:line.unit||'piece',movement_kind:line.movement_kind||'delivery',
  ...(line.order_line_id?{order_line_id:line.order_line_id}:{}),...(line.stock_item_id?{stock_item_id:line.stock_item_id}:{}),...(line.lot_number?.trim()?{lot_number:line.lot_number.trim()}:{}),...(line.notes?.trim()?{notes:line.notes.trim()}:{})
}));}

export function deliveryLineProblem(lines:Row[]){
  if(!lines.length)return 'Ergänzen Sie mindestens eine konkrete Lieferposition mit Menge und Einheit.';
  for(const [index,line]of deliveryLinePayload(lines).entries()){
    if(!line.description)return `Position ${index+1}: Bitte die tatsächlich gelieferte, zurückgenommene oder fehlende Sache beschreiben.`;
    if(!/^\d+(?:\.\d+)?$/.test(line.quantity)||!Number.isFinite(Number(line.quantity))||Number(line.quantity)<=0)return `Position ${index+1}: Eine Menge größer als null eingeben, zum Beispiel 2,5.`;
    if(!deliveryUnits.some(unit=>unit.value===line.unit))return `Position ${index+1}: Die passende Mengeneinheit auswählen.`;
    if(!deliveryKinds.some(kind=>kind.value===line.movement_kind))return `Position ${index+1}: Gelieferte Menge, Rücknahme oder Fehlmenge auswählen.`;
  }
  return '';
}
