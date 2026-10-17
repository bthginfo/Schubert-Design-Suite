import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parse} from 'dotenv';
const env=parse(await readFile('.env')),team='team_VKBirSmFsmvJQkigngksd8aN',name='schubert-suite-maintenance';
async function api(path,method='GET',body){const response=await fetch('https://api.vercel.com'+path+(path.includes('?')?'&':'?')+'teamId='+team,{method,headers:{Authorization:'Bearer '+env.VERCEL_TOKEN,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const value=await response.json();if(!response.ok)throw new Error('Maintenance project '+response.status+' '+(value.error?.code??'')+' '+(value.error?.message??''));return value;}
let project;try{project=await api('/v9/projects/'+name);}catch{project=await api('/v11/projects','POST',{name,framework:null,installCommand:'pnpm install --frozen-lockfile',buildCommand:'node maintenance.mjs',outputDirectory:'public'});}
const stage=resolve('../../work/deploy-maintenance');await mkdir(stage+'/.vercel',{recursive:true});
await writeFile(stage+'/.vercel/project.json',JSON.stringify({projectId:project.id,orgId:team,projectName:name}));
await writeFile(stage+'/package.json',JSON.stringify({private:true,type:'module',packageManager:'pnpm@11.25.0',dependencies:{pg:'8.23.1'}}));
await cp('packages/db/migrations',stage+'/migrations',{recursive:true});await cp('scripts/maintenance.mjs',stage+'/maintenance.mjs');
await writeFile(stage+'/vercel.json',JSON.stringify({$schema:'https://openapi.vercel.sh/vercel.json',regions:['fra1']}));
console.log(JSON.stringify({projectId:project.id,name,stage,purpose:'Build-only schema migration. Disconnect the database after a verified successful deployment.'}));
