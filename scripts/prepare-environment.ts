import dotenv from 'dotenv';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const current=dotenv.parse(await readFile('.env','utf8').catch(()=>''));const pulled=dotenv.parse(await readFile('.env.local','utf8'));
if(!pulled.DATABASE_URL||pulled.DATABASE_URL==='[SENSITIVE]')throw new Error('Linked development database credentials are required.');
const values={...current,...pulled,DATABASE_MIGRATION_URL:pulled.DATABASE_URL_UNPOOLED??pulled.DATABASE_URL,APP_ENV:'development',BETTER_AUTH_URL:'http://localhost:5173',BETTER_AUTH_SECRET:current.BETTER_AUTH_SECRET??randomBytes(48).toString('base64url'),SETUP_TOKEN:current.SETUP_TOKEN??randomBytes(32).toString('base64url'),CRON_SECRET:current.CRON_SECRET??randomBytes(32).toString('base64url'),APP_DB_PASSWORD:current.APP_DB_PASSWORD??randomBytes(32).toString('base64url')};
await writeFile('.env',Object.entries(values).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join('\n')+'\n',{mode:0o600});console.log('Development environment prepared; secret values hidden.');
