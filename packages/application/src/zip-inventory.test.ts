import {describe,it,expect} from 'vitest';
import {zipSync,strToU8} from 'fflate';
import {inspectZip,extractZipEntry} from './zip-inventory.js';
describe('bounded original archive import',()=>{
 it('inventories paths without expansion and extracts exact original bytes',()=>{const bytes=zipSync({'Kunden/Änne/Brief.txt':strToU8('Original mit Umlaut ä')});const entries=inspectZip(bytes);expect(entries.map(e=>e.path)).toEqual(['Kunden/Änne/Brief.txt']);expect(extractZipEntry(bytes,entries[0]).bytes.toString()).toBe('Original mit Umlaut ä');});
 it.each(['../escape.txt','a/../../escape.txt','C:/escape.txt','/root.txt','a\\..\\escape.txt'])('rejects path escape %s',path=>expect(()=>inspectZip(zipSync({[path]:strToU8('x')}))).toThrow());
 it('rejects nested archive extraction before inflating it',()=>{const b=zipSync({'inner.zip':strToU8('not an archive')});expect(()=>extractZipEntry(b,inspectZip(b)[0])).toThrow();});
 it('rejects changed original CRC',()=>{const b=zipSync({'test.txt':[strToU8('Original'),{level:0}]});const entry=inspectZip(b)[0];b[entry.dataOffset]^=1;expect(()=>extractZipEntry(b,entry)).toThrow();});
 it('rejects zip bombs before inflation',()=>expect(()=>inspectZip(zipSync({'huge.txt':new Uint8Array(2*1024*1024)}))).toThrow());
 it('rejects symlinks from the central directory',()=>{const b=zipSync({'link.txt':strToU8('target')});let p=0;while(p<b.length-46&&new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(p,true)!==0x02014b50)p++;new DataView(b.buffer,b.byteOffset,b.byteLength).setUint32(p+38,0xa1ff0000,true);expect(()=>inspectZip(b)).toThrow();});
 it('rejects case-ambiguous duplicate paths',()=>expect(()=>inspectZip(zipSync({'a.txt':strToU8('1'),'A.txt':strToU8('2')}))).toThrow());
});
