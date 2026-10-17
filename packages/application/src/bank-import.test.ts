import {describe,it,expect} from 'vitest';
import {parseBankStatement,bankCandidates} from './bank-import.js';
describe('bank statement originals',()=>{
 it('parses German CSV amounts without inventing a currency or booking date',()=>{
  const csv=Buffer.from('Tag;Euro;WKZ;Zweck\r\n17.10.2026;1.234,56;EUR;RE-2026-004\r\n');const data=parseBankStatement(csv,'text/csv',{booking_date:'Tag',amount:'Euro',currency:'WKZ',reference:'Zweck'});expect(data[0]).toMatchObject({booking_date:'2026-10-17',amount:'1234.56',currency:'EUR',reference:'RE-2026-004'});expect(()=>parseBankStatement(csv,'text/csv',{})).toThrow();
 });
 it('keeps a CAMT entry intact when individual amounts do not reconcile',()=>{
  const xml=Buffer.from('<Document><BkToCstmrStmt><Stmt><Id>1</Id><Ntry><Amt Ccy="EUR">120.00</Amt><CdtDbtInd>DBIT</CdtDbtInd><BookgDt><Dt>2026-10-17</Dt></BookgDt><NtryRef>BANK-9</NtryRef><NtryDtls><TxDtls><AmtDtls><TxAmt><Amt Ccy="EUR">60.00</Amt></TxAmt></AmtDtls></TxDtls><TxDtls><AmtDtls><TxAmt><Amt Ccy="EUR">50.00</Amt></TxAmt></AmtDtls></TxDtls></NtryDtls></Ntry></Stmt></BkToCstmrStmt></Document>');const data=parseBankStatement(xml,'application/xml');expect(data).toHaveLength(1);expect(data[0].amount).toBe('-120.00');expect(data[0].reference).toContain('Sammelbuchung');
 });
 it('rejects XML entities and retains uncertain bank candidates for human review',()=>{
  expect(()=>parseBankStatement(Buffer.from('<!DOCTYPE bank [<!ENTITY bad SYSTEM "file:///etc/passwd">]><bank/>'),'application/xml')).toThrow();
  const candidates=bankCandidates({amount:'-50',currency:'EUR',reference:'Erstattung G-2'},[{target_kind:'receivable',target_id:'credit',outstanding:'-50',currency:'EUR',document_number:'G-2'},{target_kind:'receivable',target_id:'invoice',outstanding:'50',currency:'EUR',document_number:'RE-2'}]);expect(candidates.map(x=>x.target_id)).toEqual(['credit']);expect(candidates[0].score).toBe(100);
 });
});
