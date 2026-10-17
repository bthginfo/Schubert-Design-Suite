import {createServer} from 'node:http';
import {once} from 'node:events';
import {describe,it,expect} from 'vitest';
import {nodeWebHandler} from './node-web-handler.js';

describe('native queue transport',()=>{
 it('preserves binary callback bytes and event headers across a real HTTP server',async()=>{
  let observed:Uint8Array|undefined,event:string|null=null;
  const server=createServer(nodeWebHandler(async request=>{observed=new Uint8Array(await request.arrayBuffer());event=request.headers.get('ce-id');return new Response(null,{status:204,headers:{'x-queue-result':'acknowledged'}});}));
  server.listen(0,'127.0.0.1');await once(server,'listening');try{const address=server.address() as {port:number};const bytes=new Uint8Array([0,255,10,128,65]);const reply=await fetch('http://127.0.0.1:'+address.port+'/private-consumer',{method:'POST',headers:{'ce-id':'synthetic-event','content-type':'application/octet-stream'},body:bytes});expect(reply.status).toBe(204);expect(reply.headers.get('x-queue-result')).toBe('acknowledged');expect([...observed!]).toEqual([...bytes]);expect(event).toBe('synthetic-event');}finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
 });
 it('rejects oversized bodies before any queue callback can run',async()=>{
  let called=false;const server=createServer(nodeWebHandler(async()=>{called=true;return new Response(null,{status:204});},1024));server.listen(0,'127.0.0.1');await once(server,'listening');try{const address=server.address() as {port:number};const reply=await fetch('http://127.0.0.1:'+address.port+'/private-consumer',{method:'POST',body:new Uint8Array(1025)});expect(reply.status).toBe(413);expect(called).toBe(false);}finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
 });
});
