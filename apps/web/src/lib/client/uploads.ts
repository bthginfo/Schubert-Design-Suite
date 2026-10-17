import {request} from './api';
/** Direct private upload avoids the function request limit; server completion checks original bytes. */
export async function uploadOriginal(file:File,entityType?:string,entityId?:string){
 if(!file.size||file.size>40*1024*1024)throw new Error('Eine nicht leere Datei bis 40 MB auswählen.');
 if(file.size<=4_000_000){const form=new FormData();form.set('file',file);if(entityType)form.set('entity_type',entityType);if(entityId)form.set('entity_id',entityId);return request('/api/v1/uploads',form);}
 const {put}=await import('@vercel/blob/client');
 const bytes=await file.arrayBuffer(),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
 const mime=file.type||({pdf:'application/pdf',csv:'text/csv',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',xml:'application/xml',txt:'text/plain',svg:'image/svg+xml',glb:'model/gltf-binary',dxf:'application/dxf',zip:'application/zip'} as Record<string,string>)[file.name.split('.').at(-1)?.toLowerCase()??'']||'application/octet-stream';
 const intent=await request('/api/v1/uploads/intents',{name:file.name,mime_type:mime,size_bytes:file.size,content_hash:digest,...(entityType?{entity_type:entityType}:{}),...(entityId?{entity_id:entityId}:{})});
 await put(intent.pathname,file,{token:intent.clientToken,access:'private',contentType:mime,multipart:file.size>8*1024*1024});
 return request('/api/v1/uploads/complete',{intent_id:intent.id});
}
