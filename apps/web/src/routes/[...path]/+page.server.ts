import {redirect} from '@sveltejs/kit';
import {loadPage,integrations} from '@schubert/application';
import {getPool} from '@schubert/db';
export async function load({locals,params,url,cookies}:any){const path=params.path??'';const empty={path,user:locals.user,context:locals.context,records:[],related:{},summary:{},settings:{},lookups:{},integrations:integrations(),connected:!!process.env.DATABASE_URL};
if(path==='withdrawal')return {...empty,view:'withdrawal'};
if(path.startsWith('portal/')){const {portalPage}=await import('@schubert/application');return {...empty,...await portalPage(url,locals.correlationId,cookies.get('schubert_portal'))};}
if(['login','setup'].includes(path)){let setupAvailable=false;try{setupAvailable=!(await getPool().query('SELECT completed FROM bootstrap_state WHERE id=1')).rows[0]?.completed;}catch{}return {...empty,view:path,summary:{setupAvailable}};}
if(!locals.user||!locals.context)redirect(303,'/login');try{return {...empty,...await loadPage(locals.context,path,url)};}catch(e:any){return {...empty,view:'error',error:e.status&&e.status<500?e.message:'Die Daten sind momentan nicht verfügbar. Verbindung und Einrichtung prüfen.',summary:{correlationId:locals.correlationId}};}}
