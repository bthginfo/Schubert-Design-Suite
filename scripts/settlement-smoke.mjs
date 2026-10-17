import {readFile,writeFile,readdir} from 'node:fs/promises';
import {parse} from 'dotenv';
import {createHash} from 'node:crypto';
const env=parse(await readFile('.env.workers.local')),url=process.env.TEST_DOCUMENT_WORKER_URL??'https://schubert-suite-files.vercel.app',root='../../work/qa-settlement',results=[];
for(const name of(await readdir(root)).filter(n=>n.endsWith('.json')&&n.startsWith('F-'))){
 const snapshot=JSON.parse(await readFile(root+'/'+name,'utf8')),response=await fetch(url+'/invoice/generate',{method:'POST',headers:{Authorization:'Bearer '+env.DOCUMENT_WORKER_SECRET,'Content-Type':'application/json'},body:JSON.stringify({snapshot}),signal:AbortSignal.timeout(180000)}),output=await response.json();if(!response.ok||!output.valid||!output.pdfaValid)throw new Error(name+' failed independent validation: '+(output.error??response.status));
 const xml=Buffer.from(output.xmlBase64,'base64'),pdf=Buffer.from(output.pdfBase64,'base64');if((snapshot.prepaid_tax_summaries??[]).length&&(!xml.includes(Buffer.from('Anrechnungsaufstellung.csv'))||!xml.includes(Buffer.from('AttachmentBinaryObject'))))throw new Error(name+' lacks actual structured tax/cash annex');
 await writeFile(root+'/'+name.replace('.json','.pdf'),pdf);await writeFile(root+'/'+name.replace('.json','.xml'),xml);
 const result={fixture:name,payable:snapshot.payable_total,valid:output.valid,pdfaValid:output.pdfaValid,validator:output.validator,pdfHash:createHash('sha256').update(pdf).digest('hex'),xmlHash:createHash('sha256').update(xml).digest('hex'),pdfBytes:pdf.length};results.push(result);console.log(JSON.stringify(result));
}
await writeFile(root+'/validation-results.json',JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));
