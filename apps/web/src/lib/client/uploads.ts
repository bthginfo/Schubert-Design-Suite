import {request,RequestError} from './api';
/** Direct private upload avoids the function request limit; server completion checks original bytes. */
export async function uploadOriginal(file:File,entityType?:string,entityId?:string,signal?:AbortSignal){
 if(!file.size||file.size>40*1024*1024)throw new Error('Eine nicht leere Datei bis 40 MB auswählen.');
 const deadline=AbortSignal.timeout(90000),active=signal?AbortSignal.any([signal,deadline]):deadline;
 try{
  if(file.size<=4_000_000){const form=new FormData();form.set('file',file);if(entityType)form.set('entity_type',entityType);if(entityId)form.set('entity_id',entityId);return await request('/api/v1/uploads',form,'POST',active);}
  const {put}=await import('@vercel/blob/client');
  const bytes=await file.arrayBuffer(),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
  const mime=file.type||({pdf:'application/pdf',csv:'text/csv',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',xml:'application/xml',txt:'text/plain',svg:'image/svg+xml',glb:'model/gltf-binary',dxf:'application/dxf',zip:'application/zip'} as Record<string,string>)[file.name.split('.').at(-1)?.toLowerCase()??'']||'application/octet-stream';
  const intent=await request('/api/v1/uploads/intents',{name:file.name,mime_type:mime,size_bytes:file.size,content_hash:digest,...(entityType?{entity_type:entityType}:{}),...(entityId?{entity_id:entityId}:{})},'POST',active);
  await put(intent.pathname,file,{token:intent.clientToken,access:'private',contentType:mime,multipart:file.size>8*1024*1024,abortSignal:active});
  return await request('/api/v1/uploads/complete',{intent_id:intent.id},'POST',active);
 }catch(cause){
  if(deadline.aborted)throw new RequestError('Die Dateiübertragung konnte innerhalb von 90 Sekunden nicht bestätigt werden. Gespeicherte Angaben bleiben erhalten. Prüfen Sie den Dateistand und versuchen Sie es bei stabiler Verbindung erneut.',{code:'UPLOAD_TIMEOUT'});
  if(signal?.aborted)throw new RequestError('Die Dateiübertragung wurde beendet. Prüfen Sie den gespeicherten Dateistand, bevor Sie dieselbe Datei erneut übertragen.',{code:'UPLOAD_ABORTED'});
  throw cause;
 }
}
