import type {IncomingMessage,ServerResponse} from 'node:http';

/** Build Output functions receive native Node streams, not Express request bodies. */
export function nodeWebHandler(callback:(request:Request)=>Promise<Response>,maximumBodyBytes=1024*1024){
 return async(request:IncomingMessage,response:ServerResponse)=>{
  const chunks:Buffer[]=[];let size=0;
  for await(const part of request){const bytes=Buffer.isBuffer(part)?part:Buffer.from(part);size+=bytes.length;if(size>maximumBodyBytes){response.statusCode=413;response.end();return;}chunks.push(bytes);}
  const headers=new Headers();for(const[key,value]of Object.entries(request.headers))for(const item of Array.isArray(value)?value:value===undefined?[]:[value])headers.append(key,item);
  const method=request.method??'POST',body=['GET','HEAD'].includes(method)?undefined:new Uint8Array(Buffer.concat(chunks));
  const reply=await callback(new Request('https://queue.internal'+(request.url??'/'),{method,headers,body}));
  response.statusCode=reply.status;reply.headers.forEach((value,key)=>response.setHeader(key,value));response.end(Buffer.from(await reply.arrayBuffer()));
 };
}
