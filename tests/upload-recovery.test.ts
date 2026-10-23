import {afterEach,it,expect,vi} from 'vitest';
import {uploadOriginal} from '../apps/web/src/lib/client/uploads.ts';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function pendingTransport(){vi.stubGlobal('fetch',vi.fn((_url:string,options:RequestInit)=>new Promise((_resolve,reject)=>{const fail=()=>reject(new DOMException('Transport interrupted','AbortError'));if(options.signal?.aborted)fail();else options.signal?.addEventListener('abort',fail,{once:true});})));}
it('a bounded upload timeout returns a German recovery instruction and releases the caller',async()=>{
 const deadline=new AbortController();vi.spyOn(AbortSignal,'timeout').mockReturnValue(deadline.signal);pendingTransport();
 const result=uploadOriginal(new File(['synthetic original'],'synthetic.txt',{type:'text/plain'}));
 const failure=expect(result).rejects.toMatchObject({code:'UPLOAD_TIMEOUT',message:expect.stringContaining('Gespeicherte Angaben bleiben erhalten')});deadline.abort();await failure;
});
it('explicit cancellation is distinct from a provider deadline and preserves uncertainty about the saved file',async()=>{
 const deadline=new AbortController(),cancel=new AbortController();vi.spyOn(AbortSignal,'timeout').mockReturnValue(deadline.signal);pendingTransport();
 const result=uploadOriginal(new File(['synthetic original'],'synthetic.txt',{type:'text/plain'}),undefined,undefined,cancel.signal);
 const failure=expect(result).rejects.toMatchObject({code:'UPLOAD_ABORTED',message:expect.stringContaining('Dateistand')});cancel.abort();await failure;expect(deadline.signal.aborted).toBe(false);
});
