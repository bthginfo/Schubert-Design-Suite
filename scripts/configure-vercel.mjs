import {readFile,writeFile}from'node:fs/promises';import{parse}from'dotenv';
const local=parse(await readFile('.env')),secrets=parse(await readFile('.env.provisioning.local'));
const project='prj_tgQqF0Vm2sgbL2w1TxRvvufHdqsA',team='team_VKBirSmFsmvJQkigngksd8aN';
async function api(path,method='GET',body){const response=await fetch('https://api.vercel.com'+path+(path.includes('?')?'&':'?')+'teamId='+team,{method,headers:{Authorization:'Bearer '+local.VERCEL_TOKEN,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const result=await response.json();if(!response.ok)throw new Error('Vercel configuration failed: '+response.status+' '+(result.error?.code??'request'));return result;}
const mode=process.argv[2];
if(mode==='bootstrap'){
 const current=await api('/v9/projects/'+project);await writeFile('.vercel/provisioning-settings.json',JSON.stringify({framework:current.framework,buildCommand:current.buildCommand,installCommand:current.installCommand,outputDirectory:current.outputDirectory,rootDirectory:current.rootDirectory}));
 await api('/v9/projects/'+project,'PATCH',{framework:null,buildCommand:'cd ../.. && pnpm exec tsx scripts/provision-production.ts',outputDirectory:'provisioning-output',sourceFilesOutsideRootDirectory:true});
 const variables=Object.entries(secrets).map(([key,value])=>({key,value,type:key==='PROVISIONING_RUN_ID'?'plain':'sensitive',target:['production']}));variables.push({key:'PROVISIONING_ONLY',value:'true',type:'plain',target:['production']},{key:'APP_ENV',value:'production',type:'plain',target:['production']});
 await api('/v10/projects/'+project+'/env?upsert=true','POST',variables);
 console.log('One-time production provisioning build configured; credential values remain hidden.');
}else if(mode==='finalize'){
 const manifest=JSON.parse(await readFile('.vercel/provisioning-result.json','utf8'));if(!manifest.completed||manifest.runId!==secrets.PROVISIONING_RUN_ID)throw new Error('Provisioning result does not match this authorized run.');
 const url=new URL(manifest.applicationConnectionBase);url.password=secrets.APP_DB_PASSWORD;
 await api('/v10/projects/'+project+'/env?upsert=true','POST',[{key:'DATABASE_URL',value:url.toString(),type:'sensitive',target:['production']},{key:'PROVISIONING_ONLY',value:'false',type:'plain',target:['production']}]);
 const list=await api('/v10/projects/'+project+'/env');for(const e of list.envs??[])if(['ADMIN_INITIAL_EMAIL','ADMIN_INITIAL_NAME','ADMIN_INITIAL_PASSWORD','APP_DB_PASSWORD','PROVISIONING_RUN_ID'].includes(e.key)&&e.target?.includes('production'))await api('/v9/projects/'+project+'/env/'+e.id,'DELETE');
 await api('/v9/projects/'+project,'PATCH',{framework:'sveltekit',buildCommand:'cd ../.. && pnpm build',outputDirectory:null,sourceFilesOutsideRootDirectory:true});
 console.log('Production runtime restricted to the application role; one-time administrator credentials removed from runtime environment.');
}else throw new Error('Specify bootstrap or finalize.');
