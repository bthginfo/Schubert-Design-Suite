import type {Handle,HandleServerError} from '@sveltejs/kit/hooks';
import {svelteKitHandler} from 'better-auth/svelte-kit';
import {building} from '$app/env';
import {randomUUID} from 'node:crypto';
import {auth,contextFor} from '#lib/server/auth.ts';
export const handle:Handle=async({event,resolve})=>{event.locals.correlationId=randomUUID();event.locals.user=null;event.locals.session=null;event.locals.context=null;
if(!building&&['POST','PUT','PATCH','DELETE'].includes(event.request.method)){const origin=event.request.headers.get('origin');if(origin!==event.url.origin&&!['/api/v1/render-assets/read','/api/v1/backup/source'].includes(event.url.pathname))return Response.json({ok:false,error:{code:'ORIGIN',message:'Anfrage bitte direkt aus der Anwendung erneut ausführen.',correlationId:event.locals.correlationId}},{status:403});}
if(!building&&!event.url.pathname.startsWith('/_app/')&&!event.url.pathname.endsWith('/service-worker.js')&&process.env.DATABASE_URL&&process.env.BETTER_AUTH_SECRET){try{const session=await auth().api.getSession({headers:event.request.headers});if(session){event.locals.user={id:session.user.id,name:session.user.name,email:session.user.email};event.locals.session=session.session;event.locals.context=await contextFor(session.user.id,event.locals.correlationId,session.session.id);}if(event.url.pathname.startsWith('/api/auth/'))return auth().handler(event.request);}catch(e){console.error(JSON.stringify({code:'AUTH_UNAVAILABLE',correlationId:event.locals.correlationId}));if(event.url.pathname.startsWith('/api/auth/'))return Response.json({error:{message:'Anmeldung derzeit nicht verfügbar. Verbindung und Einrichtung prüfen.'}},{status:503});}}
let response:Response;
if(event.url.pathname.startsWith('/api/v1/')){
 // Native download navigation must keep the API route even with Accept:text/html.
 const handlers=await import('./routes/api/v1/[...endpoint]/+server.ts');
 const method=event.request.method==='HEAD'?'GET':event.request.method;
 const handler=handlers[method as keyof typeof handlers];
 event.params.endpoint=event.url.pathname.slice('/api/v1/'.length);
 response=typeof handler==='function'?await handler(event):new Response(null,{status:405,headers:{Allow:'GET, POST, HEAD'}});
 if(event.request.method==='HEAD')response=new Response(null,{status:response.status,headers:response.headers});
}else response=await resolve(event);
if(!event.url.pathname.startsWith('/_app/')&&!event.url.pathname.endsWith('/service-worker.js')){response.headers.set('Cache-Control','private, no-store');response.headers.set('X-Robots-Tag','noindex, nofollow');}response.headers.set('X-Content-Type-Options','nosniff');response.headers.set('Referrer-Policy','same-origin');response.headers.set('X-Frame-Options','DENY');response.headers.set('Permissions-Policy','geolocation=(),camera=(self),microphone=(self)');response.headers.set('X-Correlation-ID',event.locals.correlationId);response.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://shop.strassacker.com; font-src 'self'; connect-src 'self' https://vercel.com/api/blob/ https://blob.vercel-storage.com https://*.blob.vercel-storage.com; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");return response;};
export const handleError:HandleServerError=(caught)=>{const {event}=caught;if(process.env.APP_ENV==='development'&&caught.error instanceof Error)console.error(JSON.stringify({code:'DEV_RENDER_ERROR',message:caught.error.message,stack:caught.error.stack}));console.error(JSON.stringify({code:'REQUEST_FAILED',correlationId:event.locals.correlationId}));return {message:'Der Vorgang konnte nicht abgeschlossen werden. Bitte erneut versuchen.',correlationId:event.locals.correlationId};};
