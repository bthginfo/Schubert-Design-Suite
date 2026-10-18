import {ident,type DbClient} from '@schubert/db';

/** Restore identities explicitly, letting PostgreSQL recompute generated columns. */
export async function insertRestoredRows(db:Pick<DbClient,'query'>,schema:string,table:string,values:Record<string,unknown>[]){
 if(!values.length)return;
 const columns=(await db.query("SELECT a.attname FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=$1 AND a.attnum>0 AND NOT a.attisdropped AND a.attgenerated='' ORDER BY a.attnum",[table])).rows.map(r=>ident(r.attname));
 if(!columns.length)throw Error('Restore target has no writable columns.');
 const target=ident(schema)+'.'+ident(table),list=columns.join(',');
 await db.query(`INSERT INTO ${target} (${list}) OVERRIDING SYSTEM VALUE SELECT ${list} FROM jsonb_populate_recordset(NULL::${target},$1::jsonb)`,[JSON.stringify(values)]);
}
