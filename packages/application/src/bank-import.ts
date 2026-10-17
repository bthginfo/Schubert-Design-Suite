import {XMLParser} from 'fast-xml-parser';
import {parse} from 'csv-parse/sync';
import {dec,money,requireRule} from '@schubert/domain';
import {hash} from './core.js';
export type BankRow={external_id:string|null;booking_date:string;value_date:string|null;amount:string;currency:string;reference:string;counterparty:string|null;counterparty_iban:string|null;raw:Record<string,unknown>;fingerprint:string};
const array=(v:any):any[]=>v==null?[]:Array.isArray(v)?v:[v];
const text=(v:any)=>typeof v==='object'&&v!==null?String(v['#text']??''):String(v??'');
function on(value:unknown){const source=String(value??'').trim();const de=source.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);const date=de?`${de[3]}-${de[2]}-${de[1]}`:source.slice(0,10);requireRule(/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date)),'BANK_DATE','Buchungsdatum im Kontoauszug eindeutig zuordnen.');return date;}
function numeric(value:unknown){let raw=String(value??'').trim();if(/^-?\d{1,3}(?:\.\d{3})*,\d{1,2}$/.test(raw))raw=raw.replaceAll('.','').replace(',','.');else raw=raw.replace(',','.');requireRule(/^-?\d+(?:\.\d{1,2})?$/.test(raw),'BANK_AMOUNT','Bankbetrag muss eindeutig auf Cent angegeben sein.');return money(raw);}
function row(input:Omit<BankRow,'fingerprint'>):BankRow{requireRule(/^[A-Z]{3}$/.test(input.currency)&&input.reference.length<=20000,'BANK_CURRENCY','Währung oder Verwendungszweck prüfen.');return{...input,fingerprint:hash({date:input.booking_date,valueDate:input.value_date,amount:input.amount,currency:input.currency,reference:input.reference,counterpartyIban:input.counterparty_iban})};}
/** CAMT entry totals remain intact when a bank does not expose individual transaction amounts. */
export function parseBankStatement(bytes:Uint8Array,mime:string,mapping:Record<string,string>={}):BankRow[]{
 requireRule(bytes.length<=10*1024*1024,'BANK_SIZE','Auszug auf höchstens 10 MB pro Import begrenzen.');const source=Buffer.from(bytes).toString('utf8');
 if(mime==='text/csv'){
  const records=parse(source,{columns:true,bom:true,skip_empty_lines:true,delimiter:source.split('\n')[0].includes(';')?';':',',max_record_size:100000,to:5001}) as Record<string,string>[];
  requireRule(records.length<=5000,'BANK_SIZE','Höchstens 5.000 Bankbuchungen pro Charge importieren.');
  return records.map(raw=>{const value=(key:string)=>raw[mapping[key]??key];return row({external_id:value('external_id')||null,booking_date:on(value('booking_date')),value_date:value('value_date')?on(value('value_date')):null,amount:numeric(value('amount')),currency:String(value('currency')??'').toUpperCase(),reference:String(value('reference')??''),counterparty:value('counterparty')||null,counterparty_iban:value('counterparty_iban')?.replaceAll(' ','')||null,raw});});
 }
 requireRule(['application/xml','text/xml'].includes(mime)&&!/<!(?:DOCTYPE|ENTITY)/i.test(source),'BANK_XML','Einen XML-Kontoauszug ohne externe Entitäten verwenden.');
 const xml=new XMLParser({removeNSPrefix:true,ignoreAttributes:false,parseTagValue:false}).parse(source),statements=array(xml.Document?.BkToCstmrStmt?.Stmt??xml.BkToCstmrStmt?.Stmt);
 requireRule(statements.length>0,'CAMT_FORMAT','Erwartet wird ein CAMT.053-Kontoauszug mit Buchungseinträgen.');const result:BankRow[]=[];
 for(const statement of statements)for(const entry of array(statement.Ntry)){
  const signed=numeric(text(entry.Amt)),direction=text(entry.CdtDbtInd),entryAmount=dec(signed).abs().mul(direction==='CRDT'?1:-1);requireRule(['CRDT','DBIT'].includes(direction),'CAMT_DIRECTION','Bankseitige Soll-/Haben-Angabe fehlt.');
  const details=array(entry.NtryDtls).flatMap(x=>array(x.TxDtls));
  const split=details.length>1&&details.every(x=>x.AmtDtls?.TxAmt?.Amt)&&details.reduce((sum,x)=>sum.add(text(x.AmtDtls.TxAmt.Amt)),dec(0)).eq(entryAmount.abs());
  const transactions=split?details:[details.length===1?details[0]:null];
  for(let i=0;i<transactions.length;i++){
   const tx=transactions[i],part=split?dec(text(tx.AmtDtls.TxAmt.Amt)).abs().mul(direction==='CRDT'?1:-1):entryAmount;
   const parties=tx?.RltdPties??{},counterparty=direction==='CRDT'?parties.Dbtr:parties.Cdtr,account=direction==='CRDT'?parties.DbtrAcct:parties.CdtrAcct;
   const refs=tx?.Refs??{},external=[text(entry.AcctSvcrRef)||text(entry.NtryRef),split?(text(refs.AcctSvcrRef)||text(refs.TxId)||String(i)):null].filter(Boolean).join(':');
   const reference=tx?[...array(tx.RmtInf?.Ustrd).map(text),...array(tx.RmtInf?.Strd).map(x=>text(x.CdtrRefInf?.Ref))].filter(Boolean).join(' '):'Sammelbuchung · Einzelzuordnung anhand des Originalauszugs prüfen';
   result.push(row({external_id:external&&!/NOTPROVIDED/i.test(external)?external:null,booking_date:on(entry.BookgDt?.Dt??entry.BookgDt?.DtTm),value_date:entry.ValDt?on(entry.ValDt.Dt??entry.ValDt.DtTm):null,amount:money(part),currency:String(entry.Amt?.['@_Ccy']??'').toUpperCase(),reference,counterparty:counterparty?text(counterparty.Nm??counterparty.Pty?.Nm)||null:null,counterparty_iban:account?text(account.Id?.IBAN)||null:null,raw:{statementId:text(statement.Id),entryReference:text(entry.NtryRef),entry,transaction:tx}}));
  }
 }
 requireRule(result.length>0&&result.length<=5000,'BANK_SIZE','Der Auszug muss zwischen 1 und 5.000 Buchungen enthalten.');return result;
}
export function bankCandidates(tx:Pick<BankRow,'amount'|'currency'|'reference'>,items:any[]){
 return items.filter(item=>item.currency===tx.currency&&dec(item.outstanding).abs().gt(0)&&((item.target_kind==='receivable')===dec(item.outstanding).gt(0))===dec(tx.amount).gt(0)).map(item=>{
  const amountMatch=dec(tx.amount).abs().eq(dec(item.outstanding).abs()),numberMatch=!!item.document_number&&tx.reference.toLocaleLowerCase().includes(item.document_number.toLocaleLowerCase());
  return{...item,score:(amountMatch?50:0)+(numberMatch?50:0),reasons:[...(amountMatch?['Betrag stimmt überein']:[]),...(numberMatch?['Belegnummer im Verwendungszweck']:[])]};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,10);
}
