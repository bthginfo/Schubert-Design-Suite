/// <reference lib="webworker" />
import {self as sw} from '$app/service-worker';
import {immutable,assets as publicAssets} from '$app/manifest';
import {version} from '$app/env';
const cacheName=`schubert-shell-${version}`;
const staticAssets=[...immutable,...publicAssets].map(entry=>entry.path.startsWith('/')?entry.path:'/'+entry.path).filter(path=>/\.(?:js|css|woff2?|svg|png|webmanifest)$/.test(path)||path==='/offline-time.html');
const assets=new Set(staticAssets);
sw.addEventListener('install',event=>{event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(staticAssets)));});
sw.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('schubert-shell-')&&key!==cacheName)await caches.delete(key);await sw.clients.claim();})());});
sw.addEventListener('fetch',event=>{
  const request=event.request;const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==sw.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/portal/'))return;
  if(assets.has(url.pathname)){event.respondWith((async()=>{const cache=await caches.open(cacheName);return await cache.match(request)||fetch(request);})());return;}
  if(request.mode==='navigate'&&['/time','/offline-time','/offline-time.html'].includes(url.pathname)){event.respondWith((async()=>{try{return await fetch(request);}catch{const cache=await caches.open(cacheName);return await cache.match('/offline-time.html')||new Response('Offline-Zeiterfassung ist auf diesem Gerät noch nicht eingerichtet.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});}})());}
});
