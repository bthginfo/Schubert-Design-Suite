import type {Field} from './types.ts';

type Section = {title:string;description?:string;keys:string[];optional?:boolean};
const contact:Section[]=[
  {title:'Kontakt',description:'So finden und erreichen Sie den Geschäftspartner.',keys:['name','party_type','email','phone']},
  {title:'Anschrift',keys:['street','postal_code','city','country']},
  {title:'Abrechnung',description:'Bei Bedarf ergänzen. Die Angaben werden vor der Rechnungsausstellung geprüft.',keys:['vat_id','payment_days'],optional:true},
  {title:'Notizen',keys:['notes'],optional:true}
];
const sales:Section[]=[
  {title:'Grundlage',keys:['title','customer_id','order_id','currency','kind','corrects_invoice_id']},
  {title:'Termine',keys:['valid_until','invoice_date','service_date','due_date','planned_transmission_date']},
  {title:'Rechnungsgrundlagen',description:'Die bestätigten Regeln und Empfängerangaben bestimmen die Prüfung vor der Ausstellung.',keys:['settlement_rule_version_id','rule_version_id','recipient_profile_version_id','recipient_regime','tax_category','tax_exemption_reason']},
  {title:'Bedingungen & Notizen',keys:['terms','notes'],optional:true}
];
const definitions:Record<string,Section[]>={customers:contact,suppliers:contact,quotes:sales,invoices:sales,
  inquiries:[{title:'Vorhaben',keys:['title','customer_id','business_unit','description']},{title:'Nächste Schritte',keys:['channel','requested_date','next_contact','assigned_to']}],
  orders:[{title:'Auftrag',keys:['title','customer_id','currency','business_unit']},{title:'Ort & Organisation',keys:['site_id','grave_plot_id','due_date','assigned_to']},{title:'Notizen',keys:['notes'],optional:true}]
};
export function formSections(slug:string,fields:Field[]){
  const definitionsForModule=definitions[slug]||[{title:'',keys:fields.filter(field=>field.key!=='notes').map(field=>field.key)},{title:'Notizen',keys:['notes'],optional:fields.length>6}];
  const used=new Set<string>();
  const result=definitionsForModule.map(section=>{
    const selected=section.keys.flatMap(key=>{const field=fields.find(field=>field.key===key);if(!field)return [];used.add(key);return [field];});
    return {...section,fields:selected,optional:!!section.optional&&!selected.some(field=>field.required)};
  }).filter(section=>section.fields.length);
  const remainder=fields.filter(field=>!used.has(field.key));
  if(remainder.length)result.push({title:'Weitere Angaben',keys:remainder.map(field=>field.key),fields:remainder,optional:false});
  return result;
}
