import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import pg from 'pg';
if(process.env.VERCEL_ENV!=='production')throw new Error('Maintenance is restricted to a production build.');
const url=process.env.DATABASE_URL_UNPOOLED??process.env.DATABASE_URL;if(!url)throw new Error('Build-only migration connection missing.');
const db=new pg.Client({connectionString:url,ssl:{rejectUnauthorized:true}});await db.connect();
const applied=[];
try{await db.query('SELECT pg_advisory_lock(4201781)');
for(const name of(await readdir('migrations')).filter(x=>x.endsWith('.sql')).sort()){
 const sql=await readFile('migrations/'+name,'utf8'),checksum=createHash('sha256').update(sql).digest('hex');
 const old=(await db.query('SELECT checksum FROM schema_migrations WHERE name=$1',[name])).rows[0];
 if(old){if(old.checksum!==checksum)throw new Error('An applied migration changed: '+name);continue;}
 await db.query('BEGIN');try{await db.query(sql);await db.query('INSERT INTO schema_migrations(name,checksum)VALUES($1,$2)',[name,checksum]);await db.query('COMMIT');applied.push(name);}catch(error){await db.query('ROLLBACK');throw new Error('Migration '+name+' failed with database code '+error.code);}
}
if(process.env.BACKUP_DB_PASSWORD){const exists=(await db.query("SELECT 1 FROM pg_roles WHERE rolname='schubert_backup'")).rowCount,password="'"+process.env.BACKUP_DB_PASSWORD.replaceAll("'","''")+"'";if(!exists){await db.query('CREATE ROLE schubert_backup LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT PASSWORD '+password);await db.query('ALTER ROLE schubert_backup SET default_transaction_read_only=on');}else{const role=(await db.query("SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname='schubert_backup'")).rows[0];if(!role||Object.values(role).some(Boolean))throw new Error('Backup reader privilege drift');}await db.query('GRANT USAGE ON SCHEMA public TO schubert_backup');await db.query('GRANT SELECT ON ALL TABLES IN SCHEMA public TO schubert_backup');await db.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO schubert_backup');}
await db.query('SELECT pg_advisory_unlock(4201781)');await mkdir('public',{recursive:true});await writeFile('public/maintenance.json',JSON.stringify({complete:true,applied}));await writeFile('public/index.html','<!doctype html><html lang="de"><meta name="robots" content="noindex"><title>Schemaaktualisierung</title><p>Die Datenbankmigration wurde erfolgreich geprüft.</p></html>');
console.log(JSON.stringify({migrationComplete:true,applied}));
}finally{await db.end();}
