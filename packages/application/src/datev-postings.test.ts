import {describe,it,expect} from 'vitest';
import {datevPostings} from './datev-postings.js';
const account={account:'10000',counter_account:'8400',tax_key:'3'};
describe('frozen DATEV posting groups',()=>{
 it('requires separate confirmed mappings for mixed tax rates',()=>{const invoice={kind:'normal',gross_total:'226',snapshot:{tax_summaries:[{tax_category:'S',tax_rate:'19',net_amount:'100',tax_amount:'19'},{tax_category:'S',tax_rate:'7',net_amount:'100',tax_amount:'7'}]}};expect(()=>datevPostings(invoice,'invoice',{S:account})).toThrow();const result=datevPostings(invoice,'invoice',{'normal:S:19':account,'normal:S:7':{...account,counter_account:'8300',tax_key:'2'}});expect(result.map((x:any)=>x.amount)).toEqual(['119.00','107.00']);expect(result.map((x:any)=>x.accounts.counter_account)).toEqual(['8400','8300']);});
 it('does not infer advance or final accounts from normal tax mappings',()=>{for(const kind of ['advance','progress','final']){const record={kind,gross_total:'119',tax_category:'S'};expect(()=>datevPostings(record,'invoice',{S:account})).toThrow();expect(datevPostings(record,'invoice',{[kind]:account})[0].mappingKey).toBe(kind);}});
 it('keeps negative credit amounts and rejects inconsistent frozen totals',()=>{expect(datevPostings({kind:'credit',gross_total:'-119',tax_category:'S'},'invoice',{S:account})[0].amount).toBe('-119.00');expect(()=>datevPostings({kind:'normal',gross_total:'119',snapshot:{tax_summaries:[{tax_rate:'19',net_amount:'100',tax_amount:'20'}]}},'invoice',{S:account})).toThrow();});
});
