export type DatevRow={id:string;kind:string;category:string;rate:string;account:string;counter:string;tax:string;mode:'exact'|'kind'|'legacy';legacyKey?:string};
export function parseDatevMapping(value:unknown):DatevRow[]{
 const source=typeof value==='string'?JSON.parse(value||'{}'):value??{};
 if(!source||Array.isArray(source)||typeof source!=='object')throw new Error('Die gespeicherte Kontenzuordnung ist nicht lesbar.');
 return Object.entries(source).map(([key,mapping]:[string,any],index)=>{if(!mapping||typeof mapping!=='object'||Array.isArray(mapping))throw new Error('Die gespeicherte Kontenzuordnung ist nicht lesbar.');const parts=key.split(':');return{id:String(index),kind:parts.length===3?parts[0]:['S','Z','E','AE','K','G','O'].includes(key)?'':key,category:parts.length===3?parts[1]:['S','Z','E','AE','K','G','O'].includes(key)?key:'',rate:parts[2]??'',account:String(mapping.account??''),counter:String(mapping.counter_account??''),tax:String(mapping.tax_key??''),mode:parts.length===3?'exact':['S','Z','E','AE','K','G','O'].includes(key)?'legacy':'kind',legacyKey:key};});
}
export function datevRowKey(row:DatevRow){
 if(row.mode==='legacy')return row.legacyKey??row.category;
 if(row.mode==='kind')return row.kind;
 if(!row.kind||!row.category||!/^\d+(?:[.,]\d+)?$/.test(row.rate)||Number(row.rate.replace(',','.'))>100)throw new Error('Belegart, Steuerfall und einen Steuersatz von 0 bis 100 aus dem bestätigten Kanzleiverfahren angeben.');
 return[row.kind,row.category,String(Number(row.rate.replace(',','.')))].join(':');
}
export function serializeDatevMapping(rows:DatevRow[]){
 const mapping:Record<string,{account:string;counter_account:string;tax_key:string}>={};
 for(const row of rows){const key=datevRowKey(row);if(!key)throw new Error('Eine Belegart auswählen.');if(mapping[key])throw new Error('Dieser Beleg- und Steuerfall ist mehrfach zugeordnet.');if(!/^\d{4,9}$/.test(row.account)||!/^\d{4,9}$/.test(row.counter)||!/^\d{0,4}$/.test(row.tax))throw new Error('Bestätigte vier- bis neunstellige Konten und höchstens vierstelligen BU-Schlüssel prüfen.');mapping[key]={account:row.account,counter_account:row.counter,tax_key:row.tax};}
 return JSON.stringify(mapping);
}
