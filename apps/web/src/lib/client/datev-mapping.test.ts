import {describe,it,expect} from 'vitest';
import {parseDatevMapping,serializeDatevMapping,type DatevRow} from './datev-mapping';
const accounts={account:'8400',counter_account:'10000',tax_key:'3'};
describe('advisor-approved DATEV tax case mapping',()=>{
 it('retains exact mixed-rate and special-kind keys without a general fallback',()=>{const mapping={'normal:S:19':accounts,'normal:S:7':{...accounts,account:'8300'},'advance:S:19':{...accounts,account:'1718'},'final:S:19':accounts};expect(JSON.parse(serializeDatevMapping(parseDatevMapping(mapping)))).toEqual(mapping);});
 it('preserves an existing general mapping and separate cash directions',()=>{const mapping={S:accounts,payment_incoming:accounts,payment_outgoing:{...accounts,account:'1200'}};expect(JSON.parse(serializeDatevMapping(parseDatevMapping(mapping)))).toEqual(mapping);});
 it('normalizes comma tax rates and rejects duplicate effective cases',()=>{const rows=parseDatevMapping({'normal:S:19':accounts});rows[0].rate='19,00';expect(JSON.parse(serializeDatevMapping(rows))).toHaveProperty('normal:S:19');expect(()=>serializeDatevMapping([...rows,{...rows[0],id:'duplicate'}])).toThrow(/mehrfach/);});
 it('rejects incomplete tax cases, invalid rates and invented malformed accounts',()=>{const row=parseDatevMapping({'advance:S:19':accounts})[0];for(const patch of [{rate:''},{category:''},{rate:'101'},{account:'1'},{counter:'kein Konto'}])expect(()=>serializeDatevMapping([{...row,...patch} as DatevRow])).toThrow();});
});
