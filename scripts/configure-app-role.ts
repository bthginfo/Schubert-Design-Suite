import 'dotenv/config';
import pg from 'pg';
import dotenv from 'dotenv';
import {readFile,writeFile} from 'node:fs/promises';
const connectionString=process.env.DATABASE_MIGRATION_URL!;const password=process.env.APP_DB_PASSWORD!;if(!password||!connectionString)throw new Error('Separate migration credentials and application password required.');
const db=new pg.Client({connectionString,ssl:connectionString.includes('neon.tech')?{rejectUnauthorized:true}:undefined});await db.connect();
try{const exists=await db.query("SELECT 1 FROM pg_roles WHERE rolname='schubert_app'");if(!exists.rowCount)await db.query('CREATE ROLE schubert_app LOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD '+"'"+password.replaceAll("'","''")+"'");
await db.query('GRANT USAGE ON SCHEMA public TO schubert_app');await db.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO schubert_app');await db.query('GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO schubert_app');await db.query('REVOKE ALL ON schema_migrations FROM schubert_app');await db.query('GRANT EXECUTE ON FUNCTION lookup_membership(text) TO schubert_app');await db.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
const appUrl=new URL(process.env.DATABASE_URL!);appUrl.username='schubert_app';appUrl.password=password;const values=dotenv.parse(await readFile('.env','utf8'));values.DATABASE_URL=appUrl.toString();await writeFile('.env',Object.entries(values).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join('\n')+'\n',{mode:0o600});console.log('Application principal configured without ownership, DDL, superuser or RLS bypass.');}finally{await db.end();}
