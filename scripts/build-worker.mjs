import {build} from 'esbuild';
import {mkdir,writeFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
if(process.env.VERCEL==='1'){
  const target=resolve('apps/web/.vercel/output/functions/schubert-jobs.func');await mkdir(target,{recursive:true});
  await build({entryPoints:['apps/worker/src/queue.ts'],bundle:true,platform:'node',target:'node24',format:'cjs',outfile:target+'/index.cjs',external:['pg-native'],legalComments:'linked',logLevel:'warning'});
  await writeFile(target+'/.vc-config.json',JSON.stringify({runtime:'nodejs24.x',handler:'index.cjs',launcherType:'Nodejs',maxDuration:800,regions:['fra1'],experimentalTriggers:[{type:'queue/v2beta',topic:'schubert-jobs-v1',consumer:'schubert-job-processor',maxDeliveries:8,retryAfterSeconds:60,maxConcurrency:2}]}));
  console.log('Private event-driven job consumer built.');
}
