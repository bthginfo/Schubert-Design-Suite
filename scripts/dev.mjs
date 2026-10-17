import {config} from 'dotenv';
import {spawn} from 'node:child_process';
config({quiet:true});
config({path:'.env.workers.local',quiet:true});
if(process.env.LOCAL_DOCUMENT_WORKER==='true')process.env.DOCUMENT_WORKER_URL='http://127.0.0.1:8084';
const env={...process.env};
for(const name of ['VERCEL_TOKEN','DATABASE_MIGRATION_URL','APP_DB_PASSWORD'])delete env[name];
const child=spawn(process.platform==='win32'?'pnpm.cmd':'pnpm',['--filter','@schubert/web','dev','--host','127.0.0.1',...process.argv.slice(2)],{stdio:'inherit',env,shell:process.platform==='win32'});
child.on('exit',code=>process.exit(code??1));
