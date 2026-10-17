import pg from 'pg';
// A PostgreSQL calendar day has no time zone. Never convert DATE to a local-midnight instant.
pg.types.setTypeParser(1082,(value:string)=>value);
import {tables} from './definitions.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { ActorContext } from '@schubert/contracts';
import { DomainError } from '@schubert/domain';
export {tables,immutableTables} from './definitions.js';
export type DbClient=pg.PoolClient;
const pools=new Map<string,pg.Pool>();
export function getPool(url=process.env.DATABASE_URL){if(!url)throw new DomainError('DATABASE_UNAVAILABLE','Die PostgreSQL-Verbindung ist noch nicht eingerichtet.',503);let pool=pools.get(url);if(!pool){pool=new pg.Pool({connectionString:url,max:6,idleTimeoutMillis:20000,connectionTimeoutMillis:15000,ssl:url.includes('neon.tech')?{rejectUnauthorized:true}:undefined});pools.set(url,pool);}return pool;}
export function getDrizzle(){return drizzle(getPool());}
export async function withTenant<T>(ctx:ActorContext,run:(db:DbClient)=>Promise<T>){const db=await getPool().connect();try{await db.query('BEGIN');await db.query("SELECT set_config('app.tenant_id',$1,true),set_config('app.actor_id',$2,true),set_config('app.legal_entity_id',$3,true)",[ctx.tenantId,ctx.actorId,ctx.legalEntityId]);const result=await run(db);await db.query('COMMIT');return result;}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}}
export async function rows<T=Record<string,unknown>>(db:DbClient,sql:string,params:unknown[]=[]){return (await db.query(sql,params)).rows as T[];}
export async function one<T=Record<string,unknown>>(db:DbClient,sql:string,params:unknown[]=[]){return (await rows<T>(db,sql,params))[0]??null;}
export function ident(value:string){if(!/^[a-z_][a-z0-9_]*$/.test(value))throw new Error('Invalid SQL identifier');return '"'+value+'"';}
function parameter(table:string,key:string,value:unknown){if(typeof value==='string'&&tables[table]?.[key]?.startsWith('numeric')){if(!/^-?\d+(?:[.,]\d+)?$/.test(value))throw new DomainError('DECIMAL','Bitte eine eindeutige Dezimalzahl ohne Tausendertrennzeichen eingeben.',422,{[key]:'Zum Beispiel 2,5'});value=value.replace(',','.');}return value!==null&&value!==undefined&&typeof value!=='string'&&tables[table]?.[key]?.startsWith('json')?JSON.stringify(value):value;}
export async function insert(db:DbClient,table:string,data:Record<string,unknown>){const keys=Object.keys(data);const values=keys.map(k=>parameter(table,k,data[k]));return (await db.query(`INSERT INTO ${ident(table)} (${keys.map(ident).join(',')}) VALUES (${keys.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,values)).rows[0];}
/** Bounded record batches keep large imports to a few round trips. Defaults still apply to omitted columns. */
export async function insertMany(db:DbClient,table:string,records:Record<string,unknown>[]){
 if(!records.length)return[];if(!tables[table]||records.length>5000)throw new DomainError('BULK_SCOPE','Importcharge oder Ziel ist nicht freigegeben.');
 const keys=[...new Set(records.flatMap(Object.keys))];const common=['id','tenant_id','legal_entity_id','name','title','number','notes','status','version','created_at','updated_at','created_by','updated_by'];
 for(const key of keys)if(!common.includes(key)&&!tables[table][key])throw new DomainError('BULK_FIELD','Unbekanntes Importfeld.');
 const normalized=records.map(row=>Object.fromEntries(keys.map(key=>{let value:unknown=row[key]??null;if(typeof value==='string'&&tables[table][key]?.startsWith('numeric'))value=parameter(table,key,value);return[key,value];})));
 const result:any[]=[];for(let at=0;at<normalized.length;at+=250){const part=normalized.slice(at,at+250);const data=await db.query(`INSERT INTO ${ident(table)} (${keys.map(ident).join(',')}) SELECT ${keys.map(ident).join(',')} FROM jsonb_populate_recordset(NULL::${ident(table)},$1::jsonb) RETURNING *`,[JSON.stringify(part)]);result.push(...data.rows);}return result;
}
export async function update(db:DbClient,table:string,id:string,data:Record<string,unknown>,expectedVersion?:number){const keys=Object.keys(data).filter(k=>k!=='id'&&k!=='tenant_id');const params=keys.map(k=>parameter(table,k,data[k]));params.push(id);let clause=`id=$${params.length}`;if(expectedVersion!==undefined){params.push(expectedVersion);clause+=` AND version=$${params.length}`;}const result=await db.query(`UPDATE ${ident(table)} SET ${keys.map((k,i)=>`${ident(k)}=$${i+1}`).join(',')},version=version+1,updated_at=now() WHERE ${clause} RETURNING *`,params);if(!result.rows[0])throw new DomainError('VERSION_CONFLICT','Datensatz wurde geändert oder ist nicht mehr verfügbar.',409);return result.rows[0];}
export async function closePools(){await Promise.all([...pools.values()].map(p=>p.end()));pools.clear();}
