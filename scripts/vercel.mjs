import dotenv from 'dotenv';
import {existsSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
dotenv.config({path:join(root,'.env'),override:true,quiet:true});
const args=process.argv.slice(2),index=args.indexOf('--cwd');let cwd=process.cwd();if(index>=0){cwd=resolve(cwd,args[index+1]);args.splice(index,2);}
const pnpm=join(dirname(process.execPath),'node_modules','corepack','dist','pnpm.js');if(!existsSync(pnpm))throw new Error('Corepack pnpm entrypoint not found.');const child=spawn(process.execPath,[pnpm,'dlx','vercel@64.4.0',...args],{env:process.env,stdio:'inherit',cwd});child.on('exit',code=>process.exit(code??1));
