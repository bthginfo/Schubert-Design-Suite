import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {parse} from 'dotenv';
import {resolve} from 'node:path';
const local=parse(await readFile('.env'));
const main='prj_tgQqF0Vm2sgbL2w1TxRvvufHdqsA',team='team_VKBirSmFsmvJQkigngksd8aN';
let secrets={};try{secrets=parse(await readFile('.env.workers.local'));}catch{}
secrets.RENDER_WORKER_SECRET??=randomBytes(48).toString('base64url');secrets.DOCUMENT_WORKER_SECRET??=randomBytes(48).toString('base64url');
await writeFile('.env.workers.local',Object.entries(secrets).map(([key,value])=>key+'='+JSON.stringify(value)).join('\n')+'\n');
async function api(path,method='GET',body){const response=await fetch('https://api.vercel.com'+path+(path.includes('?')?'&':'?')+'teamId='+team,{method,headers:{Authorization:'Bearer '+local.VERCEL_TOKEN,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const result=await response.json();if(!response.ok)throw new Error('Worker configuration failed: '+response.status+' '+(result.error?.code??'request'));return result;}
const kind=process.argv[2];if(!['render','document'].includes(kind))throw new Error('Specify render or document.');
const name=kind==='render'?'schubert-suite-renderer':'schubert-suite-documents';let project;
try{project=await api('/v9/projects/'+name);}catch{project=await api('/v11/projects','POST',{name,framework:null,rootDirectory:'apps/'+kind+'-worker',resourceConfig:{fluid:true,functionDefaultRegions:['fra1'],functionDefaultTimeout:800,functionDefaultMemoryType:'performance'},ssoProtection:{deploymentType:'preview'}});}
await api('/v9/projects/'+project.id,'PATCH',{framework:null,rootDirectory:null,resourceConfig:{fluid:true,functionDefaultRegions:['fra1'],functionDefaultTimeout:800,functionDefaultMemoryType:'performance'}});
const secretKey=kind==='render'?'RENDER_WORKER_SECRET':'DOCUMENT_WORKER_SECRET';
const entries={PORT:'8080',[secretKey]:secrets[secretKey],ASSET_GATEWAY_URL:'https://schubert-design-suite.vercel.app/api/v1/render-assets/read',...(kind==='render'?{RENDER_TIMEOUT_SECONDS:'720',RENDER_THREADS:'2',RENDER_CONCURRENCY:'1'}:{DOCUMENT_CONCURRENCY:'2'})};
await api('/v10/projects/'+project.id+'/env?upsert=true','POST',Object.entries(entries).map(([key,value])=>({key,value,type:key.endsWith('_SECRET')?'sensitive':'plain',target:['production']})));
await api('/v10/projects/'+main+'/env?upsert=true','POST',[{key:secretKey,value:secrets[secretKey],type:'sensitive',target:['production']},{key:kind==='render'?'RENDER_WORKER_URL':'DOCUMENT_WORKER_URL',value:kind==='document'?'https://schubert-suite-files.vercel.app':'https://'+name+'.vercel.app',type:'plain',target:['production']}]);
const stage=resolve('../../work/deploy-'+kind);await mkdir(stage+'/apps',{recursive:true});await cp('apps/'+kind+'-worker',stage+'/apps/'+kind+'-worker',{recursive:true,filter:source=>!source.includes('__pycache__')&&!source.includes('.venv')&&!source.endsWith('.pyc')});await mkdir(stage+'/.vercel',{recursive:true});await writeFile(stage+'/.vercel/project.json',JSON.stringify({projectId:project.id,orgId:team,projectName:name}));
await writeFile(stage+'/vercel.json',JSON.stringify({$schema:'https://openapi.vercel.sh/vercel.json',regions:['fra1'],services:{worker:{root:'apps/'+kind+'-worker',runtime:'container',entrypoint:'Dockerfile.vercel'}},rewrites:[{source:'/(.*)',destination:{service:'worker'}}]}));
console.log(JSON.stringify({project:project.name,projectId:project.id,stage,secrets:'configured without printing values'}));
