import 'dotenv/config';
import {readdir,readFile} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import pg from 'pg';
const connectionString=process.env.DATABASE_MIGRATION_URL;if(!connectionString)throw new Error('DATABASE_MIGRATION_URL is required; never migrate through application credentials.');
const db=new pg.Client({connectionString,ssl:connectionString.includes('neon.tech')?{rejectUnauthorized:true}:undefined});await db.connect();
try{await db.query('SELECT pg_advisory_lock(4201781)');await db.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
for(const file of (await readdir('packages/db/migrations')).filter(x=>x.endsWith('.sql')).sort()){const sql=await readFile('packages/db/migrations/'+file,'utf8');const hash=createHash('sha256').update(sql).digest('hex');const old=(await db.query('SELECT checksum FROM schema_migrations WHERE name=$1',[file])).rows[0];if(old){if(old.checksum!==hash)throw new Error('Previously applied migration changed: '+file);continue;}await db.query('BEGIN');try{await db.query(sql);await db.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[file,hash]);await db.query('COMMIT');console.log('Applied '+file);}catch(e){await db.query('ROLLBACK');throw e;}}
await db.query('SELECT pg_advisory_unlock(4201781)');}finally{await db.end();}
