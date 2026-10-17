import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {requireRule} from '@schubert/domain';

export type ZipEntry={path:string;compressedSize:number;size:number;method:number;crc:number;offset:number;dataOffset:number};
const limits={entries:2000,total:128*1024*1024,file:40*1024*1024,ratio:200};
const signature=(b:Buffer,o:number,n:number)=>o>=0&&o+4<=b.length&&b.readUInt32LE(o)===n;
function safePath(raw:Buffer,flags:number){
 let value:string;
 if(flags&0x800){try{value=new TextDecoder('utf-8',{fatal:true}).decode(raw);}catch{throw new Error('ZIP_PATH_ENCODING');}}
 else{requireRule([...raw].every(v=>v<128),'ZIP_PATH_ENCODING','Ältere ZIP-Zeichenkodierung: Export bitte als UTF-8-ZIP wiederholen.');value=raw.toString('ascii');}
 value=value.replaceAll('\\','/').normalize('NFC');
 requireRule(value.length>0&&value.length<=1024&&!/[\x00-\x1f\x7f:]/.test(value)&&!value.startsWith('/')&&value.split('/').length<=16&&value.split('/').every(p=>p!=='.'&&p!=='..'),'ZIP_PATH','Unsicherer oder zu tiefer Pfad im Ordnerexport.');
 return value;
}
/** Central-directory inspection allocates no expanded contents. ZIP64/multipart/encryption are deliberately outside this bounded import. */
export function inspectZip(input:Uint8Array):ZipEntry[]{
 const b=Buffer.from(input);requireRule(b.length>=22&&b.length<=limits.file,'ZIP_SIZE','ZIP-Datei auf höchstens40MB je Charge begrenzen.');
 let end=-1;for(let p=b.length-22;p>=Math.max(0,b.length-65557);p--)if(signature(b,p,0x06054b50)&&p+22+b.readUInt16LE(p+20)===b.length){end=p;break;}
 requireRule(end>=0,'ZIP_FORMAT','ZIP-Abschlussverzeichnis fehlt.');
 const count=b.readUInt16LE(end+10),directorySize=b.readUInt32LE(end+12),start=b.readUInt32LE(end+16);
 requireRule(b.readUInt16LE(end+4)===0&&b.readUInt16LE(end+6)===0&&b.readUInt16LE(end+8)===count&&count>0&&count<=limits.entries&&start+directorySize===end,'ZIP_LIMIT','Nur einteilige ZIP-Dateien mit höchstens2.000Einträgen verwenden; ZIP64 wird nicht verarbeitet.');
 const entries:ZipEntry[]=[],paths=new Set<string>(),ranges:{start:number;end:number}[]=[];let p=start,total=0;
 for(let i=0;i<count;i++){
  requireRule(p+46<=end&&signature(b,p,0x02014b50),'ZIP_DIRECTORY','Beschädigter ZIP-Verzeichniseintrag.');
  const flags=b.readUInt16LE(p+8),method=b.readUInt16LE(p+10),crc=b.readUInt32LE(p+16),compressedSize=b.readUInt32LE(p+20),size=b.readUInt32LE(p+24),nameLength=b.readUInt16LE(p+28),extraLength=b.readUInt16LE(p+30),commentLength=b.readUInt16LE(p+32),external=b.readUInt32LE(p+38),offset=b.readUInt32LE(p+42),next=p+46+nameLength+extraLength+commentLength;
  requireRule(next<=end&&!(flags&0x2041)&&[0,8].includes(method)&&b.readUInt16LE(p+34)===0,'ZIP_UNSUPPORTED','Verschlüsselte, mehrteilige oder unbekannt komprimierte ZIP-Datei.');
  const kind=(external>>>16)&0xf000;requireRule(kind===0||kind===0x8000||kind===0x4000,'ZIP_SYMLINK','Symbolische Links und Spezialdateien sind im Ordnerexport nicht zulässig.');
  const raw=b.subarray(p+46,p+46+nameLength),path=safePath(raw,flags);requireRule(!paths.has(path.toLocaleLowerCase('en')),'ZIP_DUPLICATE_PATH','Mehrdeutige oder doppelte Pfade im Ordnerexport.');paths.add(path.toLocaleLowerCase('en'));
  requireRule(offset+30<=start&&signature(b,offset,0x04034b50),'ZIP_HEADER','Lokaler ZIP-Kopf fehlt.');
  const localName=b.readUInt16LE(offset+26),localExtra=b.readUInt16LE(offset+28),dataOffset=offset+30+localName+localExtra;
  requireRule(b.readUInt16LE(offset+6)===flags&&b.readUInt16LE(offset+8)===method&&b.subarray(offset+30,offset+30+localName).equals(raw)&&dataOffset+compressedSize<=start,'ZIP_HEADER','Lokaler Dateikopf und Verzeichnis stimmen nicht überein.');
  if(!(flags&8))requireRule(b.readUInt32LE(offset+14)===crc&&b.readUInt32LE(offset+18)===compressedSize&&b.readUInt32LE(offset+22)===size,'ZIP_HEADER','Abweichende ZIP-Größen oder Prüfsumme.');
  requireRule(size<=limits.file&&size<=Math.max(1024*1024,compressedSize*limits.ratio)&&size!==0xffffffff&&compressedSize!==0xffffffff,'ZIP_EXPANSION','Eine Datei überschreitet die Entpackgrenze oder das zulässige Kompressionsverhältnis.');
  total+=size;requireRule(total<=limits.total,'ZIP_EXPANSION','Die Entpackgröße übersteigt128MB; bitte mehrere kleinere Exportchargen verwenden.');
  ranges.push({start:offset,end:dataOffset+compressedSize});if(!path.endsWith('/'))entries.push({path,compressedSize,size,method,crc,offset,dataOffset});p=next;
 }
 ranges.sort((a,b)=>a.start-b.start);requireRule(ranges.every((r,i)=>i===0||r.start>=ranges[i-1].end)&&p===end,'ZIP_OVERLAP','Überlappende oder widersprüchliche ZIP-Einträge.');
 return entries;
}
const crcTable=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let n=0;n<8;n++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes:Uint8Array){let c=0xffffffff;for(const byte of bytes)c=crcTable[(c^byte)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
export function extractZipEntry(input:Uint8Array,entry:ZipEntry){
 requireRule(!/\.(zip|7z|rar|tar|gz|bz2|xz|exe|dll|bat|cmd|ps1|com|scr|msi|js|html?)$/i.test(entry.path),'ZIP_NESTED_ARCHIVE','Verschachtelte Archive und ausführbare Dateien werden nicht übernommen.');
 const compressed=Buffer.from(input).subarray(entry.dataOffset,entry.dataOffset+entry.compressedSize),bytes=entry.method===0?compressed:inflateRawSync(compressed,{maxOutputLength:Math.max(1,entry.size)});
 requireRule(bytes.length===entry.size&&crc32(bytes)===entry.crc,'ZIP_CHECKSUM','Entpackte Originaldatei stimmt nicht mit Größe und Prüfsumme überein.');
 return{bytes,hash:createHash('sha256').update(bytes).digest('hex')};
}
