import {readFile} from 'node:fs/promises';
import {parse} from 'dotenv';
import {createServer} from 'node:http';
const local=parse(await readFile('.env')),secrets=parse(await readFile('.env.backup.local')),testing=parse(await readFile('.env.testing.local')),vault=parse(await readFile('../../work/deploy-backup/.vercel/.env.production.local'));
if(local.APP_ENV==='production'||!vault.BLOB_READ_WRITE_TOKEN||vault.BLOB_READ_WRITE_TOKEN==='[SENSITIVE]')throw new Error('Isolated development backup configuration missing.');
const reader=new URL(local.DATABASE_URL);reader.username='schubert_backup';reader.password=secrets.BACKUP_DB_PASSWORD;
Object.assign(process.env,secrets,{BLOB_READ_WRITE_TOKEN:vault.BLOB_READ_WRITE_TOKEN,DEV_DATABASE_URL:reader.toString(),DEV_TENANT_ID:testing.TEST_TENANT_ID,DEV_LEGAL_ENTITY_ID:testing.TEST_LEGAL_ENTITY_ID,ASSET_GATEWAY_URL:'http://127.0.0.1:5173/api/v1/backup/source',RECOVERY_CONFIGURATION:JSON.stringify({authSecret:local.BETTER_AUTH_SECRET,integrationEncryptionKey:local.INTEGRATION_ENCRYPTION_KEY,localTest:true})});
const{default:handler}=await import('../apps/backup-worker/api/index.mjs');
createServer(handler).listen(8085,'127.0.0.1',()=>console.log('Isolated backup service on 127.0.0.1:8085; real Neon reader and separate private Blob store.'));
