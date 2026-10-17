import {readFile} from 'node:fs/promises';
import {parse} from 'dotenv';
import pg from 'pg';
const env=parse(await readFile('.env')),secret=parse(await readFile('.env.backup.local'));
if(!secret.BACKUP_DB_PASSWORD||env.APP_ENV==='production')throw new Error('Development-only reader provisioning.');
const db=new pg.Client({connectionString:env.DATABASE_MIGRATION_URL,ssl:{rejectUnauthorized:true}});await db.connect();try{
 const exists=(await db.query("SELECT 1 FROM pg_roles WHERE rolname='schubert_backup'")).rowCount;
 const password="'"+secret.BACKUP_DB_PASSWORD.replaceAll("'","''")+"'";
 if(!exists){await db.query('CREATE ROLE schubert_backup LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT PASSWORD '+password);await db.query('ALTER ROLE schubert_backup SET default_transaction_read_only=on');}else{const role=(await db.query("SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname='schubert_backup'")).rows[0];if(!role||Object.values(role).some(Boolean))throw new Error('Reader role privilege drift');}await db.query('GRANT USAGE ON SCHEMA public TO schubert_backup');await db.query('GRANT SELECT ON ALL TABLES IN SCHEMA public TO schubert_backup');await db.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO schubert_backup');
 console.log(JSON.stringify({readOnlyBackupRole:true,bypassRls:false}));
}catch(error){throw new Error('Reader provisioning failed: '+(error.code??'unknown'));}finally{await db.end();}
