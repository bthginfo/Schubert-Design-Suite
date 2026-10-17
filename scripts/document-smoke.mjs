import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parse} from 'dotenv';
const secrets=parse(await readFile('.env.workers.local'));
const base=process.env.TEST_DOCUMENT_WORKER_URL??'https://schubert-suite-files.vercel.app';
async function call(path,body){const response=await fetch(base+path,{method:'POST',headers:{Authorization:'Bearer '+secrets.DOCUMENT_WORKER_SECRET,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)});const result=await response.json();if(!response.ok)throw new Error('Document worker '+response.status+' '+JSON.stringify(result));return result;}
const invoice={number:'TEST-2026-001',title:'Synthetischer Prüffall – keine ausgestellte Rechnung',kind:'normal',currency:'EUR',service_date:'2026-10-17',due_date:'2026-10-31',issued_at:'2026-10-17T10:00:00Z',terms:'Nur Softwareprüfung.'};
const issuer={name:'Synthetischer Prüfbetrieb',street:'Teststraße 1',postal_code:'85051',city:'Ingolstadt',country:'DE',vat_id:'DE123456789',tax_number:'123/456/78901',iban:'DE89370400440532013000',bank_holder:'Synthetischer Prüfbetrieb'};
const customer={name:'Synthetische Kundin Änne Müller',street:'Musterstraße 2',postal_code:'85049',city:'Ingolstadt',country:'DE'};
const lines=[{position:1,description:'Synthetischer Naturstein – geprüftes Maß',quantity:'2.5',unit:'m2',unit_price:'100.00',discount_percent:'0',tax_rate:'19',net_amount:'250.00',line_type:'item',selected:true,optional:false}];
const snapshot={schemaVersion:1,invoice,issuer,customer,lines,net_total:'250.00',tax_total:'47.50',gross_total:'297.50',prepaid_total:'0.00',payable_total:'297.50',tax_summaries:[{tax_rate:'19',net_amount:'250.00',tax_amount:'47.50'}]};
await mkdir('../../work/qa-documents',{recursive:true});await writeFile('../../work/qa-documents/invoice-fixture.json',JSON.stringify(snapshot));
const output=await call('/invoice/generate',{snapshot});
if(!output.valid||!output.pdfaValid||!output.pdfBase64||!output.xmlBase64)throw new Error('Independent invoice validation failed.');
await mkdir('../../work/qa-documents',{recursive:true});
await writeFile('../../work/qa-documents/invoice-synthetic.pdf',Buffer.from(output.pdfBase64,'base64'));await writeFile('../../work/qa-documents/invoice-synthetic.xml',Buffer.from(output.xmlBase64,'base64'));await writeFile('../../work/qa-documents/invoice-report.json',JSON.stringify({...output,pdfBase64:undefined,xmlBase64:undefined},null,2));
console.log(JSON.stringify({invoice:{valid:output.valid,pdfaValid:output.pdfaValid,profile:output.profile,validator:output.validator,pdfBytes:Buffer.from(output.pdfBase64,'base64').length}}));
const scan=await call('/scan',{bytes:Buffer.from('Synthetische, harmlose Originaldatei.').toString('base64')});if(!scan.clean)throw new Error('Clean scanner fixture blocked.');
const eicar=Buffer.from('WDVPIVAlQEFQWzRcUFpYNTQoUF4pN0NDKTd9JEVJQ0FSLVNUQU5EQVJELUFOVElWSVJVUy1URVNULUZJTEUhJEgrSCo=','base64');const blocked=await call('/scan',{bytes:eicar.toString('base64')});if(blocked.clean!==false)throw new Error('Antivirus test fixture was not blocked.');
console.log(JSON.stringify({scanner:{cleanFixture:scan.clean,eicarBlocked:!blocked.clean,engine:scan.engine}}));
const preview=await call('/planning/source-preview',{mime:'application/pdf',pageIndex:0,bytes:output.pdfBase64});if(preview.sourceHash!==output.pdfHash||!preview.textPositions.length)throw new Error('Source page preview lacks provenance.');await writeFile('../../work/qa-documents/invoice-preview.png',Buffer.from(preview.pngBase64,'base64'));
console.log(JSON.stringify({preview:{width:preview.width,height:preview.height,textPositions:preview.textPositions.length}}));

const inspection=await call('/invoice/inspect',{bytes:output.pdfBase64});if(!inspection.valid||!inspection.pdfaValid||inspection.pdfHash!==output.pdfHash||inspection.xmlHash!==output.report.xmlHash)throw new Error('Persisted PDF inspection failed.');console.log(JSON.stringify({originalInspection:{valid:inspection.valid,pdfaValid:inspection.pdfaValid,pdfHash:inspection.pdfHash,xmlHash:inspection.xmlHash}}));
