import {mkdir,writeFile} from 'node:fs/promises';
import {calculateLines} from '@schubert/domain';
import {finalSettlement,type PriorInvoice} from '../packages/application/src/invoice-settlement.js';
const line=(amount:string,rate='19',description='Synthetische, nachgewiesene Leistung')=>({description,quantity:'1',unit:'package' as const,unit_price:amount,tax_rate:rate,tax_category:'S' as const,discount_percent:'0',line_type:'item' as const,optional:false,selected:true});
function prior(id:string,kind:string,lines:any[],allocations:any[]=[],corrects_invoice_id?:string):PriorInvoice{return{id,number:'TEST-'+id,kind,customer_id:'synthetic',currency:'EUR',receivable_id:'op-'+id,snapshot:calculateLines(lines),allocations,corrects_invoice_id};}
const first=()=>prior('AP-1','progress',[line('3000')],[{id:'actual-payment-1',amount:'3570',direction:'incoming'}]),unpaid=()=>prior('AP-2','progress',[line('2000')]);
const cases=[
 {name:'F-Abschlag',total:[line('10000')],prior:[first(),unpaid()],expected:'8330.00'},
 {name:'F-Rueckzahlung',total:[line('10000')],prior:[first(),prior('GS-1','correction',[line('-1000')],[{id:'actual-refund-1',amount:'1190',direction:'outgoing'}],'AP-1')],expected:'9520.00'},
 {name:'F-Echte-Teilleistung-Teilstorno',total:[line('10000')],prior:[prior('TR-1','partial',[line('2000')]),prior('TR-GS-1','correction',[line('-500')],[],'TR-1')],expected:'10115.00'},
 {name:'F-Mehrere-Steuersaetze-Teilzahlung',total:[line('5000'),line('2000','7')],prior:[prior('MIX-1','advance',[line('1000'),line('1000','7')],[{id:'actual-mixed-payment-1',amount:'226',direction:'incoming',tax_basis:'Synthetische ausdrücklich aufgeteilte Bankzahlung',tax_splits:[{tax_rate:'19',tax_category:'S',net_amount:'100',tax_amount:'19',gross_amount:'119'},{tax_rate:'7',tax_category:'S',net_amount:'100',tax_amount:'7',gross_amount:'107'}]}])],expected:'7864.00'},
 {name:'F-Preisnachtrag',total:[line('12000')],prior:[first()],expected:'10710.00'},
 {name:'F-Sicherheitseinbehalt',total:[line('10000')],prior:[prior('AP-1','progress',[line('3000')],[{id:'actual-payment-withheld',amount:'3000',direction:'incoming'}])],expected:'8900.00'},
 {name:'F-Skonto-mit-belegter-Preiskorrektur',total:[line('10000'),line('-60','19','Ausdrücklich bestätigte Preisberichtigung zum vereinbarten Skonto')],prior:[prior('AP-1','progress',[line('3000')],[{id:'actual-discounted-payment',amount:'3498.60',direction:'incoming'}]),prior('SK-GS','correction',[line('-60')],[],'AP-1')],expected:'8330.00'}
];
const issuer={name:'Synthetischer Prüfbetrieb',street:'Teststraße 1',postal_code:'85051',city:'Ingolstadt',country:'DE',vat_id:'DE123456789',tax_number:'123/456/78901',iban:'DE89370400440532013000',bank_holder:'Synthetischer Prüfbetrieb'},customer={name:'Synthetische Kundin Änne Müller',street:'Musterstraße 2',postal_code:'85049',city:'Ingolstadt',country:'DE'};
await mkdir('../../work/qa-settlement',{recursive:true});
for(const fixture of cases){const totals=finalSettlement(fixture.total,fixture.prior);if(totals.payable_total!==fixture.expected)throw new Error(fixture.name+' incorrect actual amount');const snapshot={schemaVersion:2,invoice:{number:fixture.name,kind:'final',currency:'EUR',title:'Nur synthetische Softwareprüfung – keine ausgestellte Geschäftsrechnung',issued_at:'2026-10-17T12:00:00Z',service_date:'2026-10-17',due_date:'2026-10-31',terms:'Ausschließlich isolierter Testfall. Keine Freigabe eines betrieblichen Steuerverfahrens.'},issuer,customer,...totals};await writeFile('../../work/qa-settlement/'+fixture.name+'.json',JSON.stringify(snapshot,null,2));}
console.log(JSON.stringify({fixtures:cases.map(f=>({name:f.name,expectedPayable:f.expected})),synthetic:true}));
