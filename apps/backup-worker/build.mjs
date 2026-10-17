import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('.vercel/output/functions/backup.func',{recursive:true});
await build({entryPoints:['api/index.mjs'],bundle:true,platform:'node',target:'node24',format:'cjs',outfile:'.vercel/output/functions/backup.func/index.cjs',external:['pg-native'],legalComments:'linked'});
await writeFile('.vercel/output/functions/backup.func/.vc-config.json',JSON.stringify({runtime:'nodejs24.x',handler:'index.cjs',launcherType:'Nodejs',maxDuration:800,regions:['fra1']}));
await writeFile('.vercel/output/config.json',JSON.stringify({version:3,routes:[{src:'/.*',dest:'/backup'}]}));
