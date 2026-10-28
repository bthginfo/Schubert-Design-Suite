import type {z} from 'zod';

const lineFields:Record<string,string>={description:'Leistung',quantity:'Menge',unit:'Einheit',unit_price:'Einzelpreis netto',tax_rate:'Steuersatz',discount_percent:'Rabatt',cost_unit:'Geplante Einzelkosten',line_type:'Positionsart',product_id:'Produkt',price_version_id:'Preisgrundlage',tax_category:'Steuerfall',tax_exemption_reason:'Steuerbegründung'};
const labels:Record<string,string>={title:'Titel',name:'Name',customer_id:'Kunde',order_id:'Auftrag',currency:'Belegwährung',valid_until:'Gültig bis',service_date:'Leistungsdatum',due_date:'Fällig am',notes:'Notizen',terms:'Bedingungen'};
const decimalFields=new Set(['quantity','unit_price','tax_rate','discount_percent','cost_unit']);

/** Public validation guidance. Never forward raw input or internal schema messages. */
export function inputErrorDetails(error:Pick<z.ZodError,'issues'>){
  const fields:Record<string,string>={};
  let first='Bitte die markierten Eingaben prüfen.';
  for(const issue of error.issues){
    const path=issue.path.filter((part):part is string|number=>typeof part==='string'||typeof part==='number');
    if(path[0]==='payload')path.shift();
    if(typeof path[0]==='number'&&typeof path[1]==='string'&&Object.hasOwn(lineFields,path[1]))path.unshift('lines');
    const line=path[0]==='lines'&&typeof path[1]==='number'&&typeof path[2]==='string'&&Object.hasOwn(lineFields,path[2]);
    const key=line?String(path[2]):String(path.at(-1)||'');
    if(!key||!path.every(part=>typeof part==='number'||/^[a-zA-Z][a-zA-Z0-9_]*$/.test(part)))continue;
    const label=line?`Position ${Number(path[1])+1} · ${lineFields[key]}`:Object.hasOwn(labels,key)?labels[key]:'Eingabe';
    const guidance=decimalFields.has(key)?`Eine eindeutige Zahl eingeben, zum Beispiel ${key==='unit_price'||key==='cost_unit'?'2400,50':'12,5'}.`
      :key==='description'||key==='title'||key==='name'?'Bitte einen Text eingeben.'
      :key.endsWith('_id')?'Einen vorhandenen Eintrag aus der Auswahl wählen.'
      :['unit','line_type','tax_category'].includes(key)?'Bitte eine verfügbare Option auswählen.'
      :'Bitte die Eingabe prüfen.';
    const field=path.join('.');
    if(Object.hasOwn(fields,field))continue;
    fields[field]=guidance;
    if(Object.keys(fields).length===1)first=`${label}: ${guidance}`;
  }
  return {message:first+(Object.keys(fields).length>1?' Weitere markierte Felder ebenfalls prüfen.':''),fields};
}
