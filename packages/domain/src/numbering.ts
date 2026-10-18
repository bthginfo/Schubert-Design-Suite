export const numberingScopes=[
 {scope:'invoices',label:'Rechnungen',prefix:'RE',table:'invoices'},
 {scope:'quotes',label:'Angebote',prefix:'AN',table:'quotes'},
 {scope:'orders',label:'Aufträge',prefix:'AUF',table:'orders'},
 {scope:'customers',label:'Kunden',prefix:'KD',table:'parties'},
 {scope:'suppliers',label:'Lieferanten',prefix:'LF',table:'parties'},
 {scope:'purchase-orders',label:'Bestellungen',prefix:'PUR',table:'purchase_orders'},
 {scope:'deliveries',label:'Lieferscheine',prefix:'LS',table:'delivery_notes'},
 {scope:'payments',label:'Zahlungen',prefix:'ZA',table:'payments'},
 {scope:'supplier-invoices',label:'Rechnungseingang · interne Nummer',prefix:'ER',table:'supplier_invoices'},
 {scope:'stock',label:'Lagerstücke',prefix:'MAT',table:'stock_items'},
 {scope:'employees',label:'Beschäftigte',prefix:'MA',table:'employees'},
 {scope:'inquiries',label:'Anfragen',prefix:'INQ',table:'inquiries'},
 {scope:'change-orders',label:'Nachträge',prefix:'CHA',table:'change_orders'},
 {scope:'work-packages',label:'Arbeitspakete',prefix:'WOR',table:'work_packages'},
 {scope:'tasks',label:'Aufgaben',prefix:'TAS',table:'tasks'},
];
export function numberingDate(now=new Date()){
 const parts=new Intl.DateTimeFormat('en',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit'}).formatToParts(now);
 return {year:Number(parts.find(p=>p.type==='year')!.value),month:parts.find(p=>p.type==='month')!.value};
}
export function validateNumberTemplate(template:string,padding:number,annual:boolean){
 if(!template||template.length>80||!/^[\p{L}\p{N}{} /_.-]+$/u.test(template))throw new Error('Bis zu 80 Zeichen verwenden: Buchstaben, Zahlen, Leerzeichen, Punkt, Schrägstrich, Bindestrich und Platzhalter.');
 if((template.match(/\{NR\}/g)??[]).length!==1)throw new Error('Der Platzhalter {NR} muss genau einmal enthalten sein.');
 if(/[{}]/.test(template.replace(/\{(?:NR|JJJJ|JJ|MM)\}/g,'')))throw new Error('Erlaubte Platzhalter: {NR}, {JJJJ}, {JJ} und {MM}.');
 if(!Number.isInteger(padding)||padding<1||padding>10)throw new Error('Für die laufende Nummer 1 bis 10 Mindeststellen wählen.');
 if(annual&&!/\{(?:JJJJ|JJ)\}/.test(template))throw new Error('Ein jährlicher Neustart benötigt {JJJJ} oder {JJ}. Ohne Jahresangabe bitte „Fortlaufend“ wählen.');
}
export function formatNumber(template:string,padding:number,next:number,date=numberingDate()){
 if(!Number.isInteger(next)||next<1||next>2147483647)throw new Error('Die nächste Nummer muss zwischen 1 und 2.147.483.647 liegen.');
 return template.replace(/\{(NR|JJJJ|JJ|MM)\}/g,(_,key:string)=>({NR:String(next).padStart(padding,'0'),JJJJ:String(date.year),JJ:String(date.year).slice(-2),MM:date.month})[key]!);
}
