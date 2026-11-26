/// <reference lib="webworker" />
import {self as sw} from '$app/service-worker';
import {immutable,assets as publicAssets} from '$app/manifest';
import {version} from '$app/env';
const cacheName=`schubert-shell-${version}`;
const staticAssets=[...immutable,...publicAssets].map(entry=>entry.path.startsWith('/')?entry.path:'/'+entry.path).filter(path=>/\.(?:js|css|woff2?|svg|png|webmanifest)$/.test(path)||path==='/offline-time.html');
const assets=new Set(staticAssets);
// One missing asset must not leave the device without the offline time page: cache it first, the rest individually.
sw.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(cacheName);await cache.add('/offline-time.html').catch(()=>{});await Promise.allSettled(staticAssets.filter(path=>path!=='/offline-time.html').map(path=>cache.add(path)));})());});
const offlinePage=(title:string,text:string)=>new Response(`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · SCHUBERT</title><style>body{margin:0;font:16px/1.6 system-ui,sans-serif;background:#eef2f7;color:#192337}main{max-width:520px;margin:12vh auto;padding:28px 22px}h1{font-size:26px;line-height:1.25;margin:0 0 10px}p{color:#5d6a7c}a,button{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:12px 18px;margin:8px 8px 0 0;border-radius:12px;border:1px solid #c9d3df;background:#fff;color:#315c4c;font:inherit;font-weight:600;text-decoration:none}button{background:#315c4c;color:#fff;border-color:#315c4c}@media(prefers-color-scheme:dark){body{background:#0d1422;color:#eef3fc}p{color:#b8c6d9}a{background:#182437;color:#a3d8b6;border-color:#35465e}button{background:#a3d8b6;color:#101827;border-color:#a3d8b6}}</style></head><body><main><h1>${title}</h1><p>${text}</p><button type="button" onclick="location.reload()">Erneut versuchen</button><a href="/offline-time.html">Offline-Zeiterfassung öffnen</a></main><script>addEventListener('online',()=>location.reload())</script></body></html>`,{status:503,headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}});
sw.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('schubert-shell-')&&key!==cacheName)await caches.delete(key);await sw.clients.claim();})());});
sw.addEventListener('fetch',event=>{
  const request=event.request;const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==sw.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/portal/'))return;
  if(assets.has(url.pathname)){event.respondWith((async()=>{const cache=await caches.open(cacheName);return await cache.match(request)||fetch(request);})());return;}
  if(request.mode==='navigate'&&['/time','/offline-time','/offline-time.html'].includes(url.pathname)){event.respondWith((async()=>{try{return await fetch(request);}catch{const cache=await caches.open(cacheName);return await cache.match('/offline-time.html')||offlinePage('Keine Verbindung','Die Offline-Zeiterfassung ist auf diesem Gerät noch nicht geladen. Sobald wieder Netz da ist, lädt die Seite automatisch neu.');}})());return;}
  if(request.mode==='navigate'){event.respondWith((async()=>{try{return await fetch(request);}catch{return offlinePage('Keine Verbindung','Diese Seite braucht eine Internetverbindung. Arbeitszeit können Sie offline weiter erfassen. Sobald wieder Netz da ist, lädt die Seite automatisch neu.');}})());}
});
