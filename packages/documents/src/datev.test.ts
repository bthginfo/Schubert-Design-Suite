import {describe,it,expect} from 'vitest';
import {parse} from 'csv-parse/sync';
import iconv from 'iconv-lite';
import {createDatevLedgerCsv} from './datev.js';
const profile={advisor:'12345',client:'123',accountLength:4,fiscalYear:2026},range={from:'2026-10-01',to:'2026-10-31'},accounts={account:'10000',counter_account:'8400',tax_key:'9'};
const record={number:'RE-2026-001',kind:'invoice',amount:'278.46',currency:'EUR',date:'2026-10-17',direction:'incoming',accounts};
describe('DATEV format700/13',()=>{
 it('produces31headerfields,125versioned columns and positive amounts with the proper side',()=>{
  const result=createDatevLedgerCsv([record,{...record,number:'GS-1',amount:'-50'}],profile,range,'2026-10-17T10:00:00Z');const data=parse(iconv.decode(result,'windows-1252'),{delimiter:';',relax_column_count:true});expect(data[0]).toHaveLength(31);expect(data[1]).toHaveLength(125);expect(data[2]).toHaveLength(125);expect(data[2].slice(0,3)).toEqual(['278,46','S','EUR']);expect(data[3].slice(0,2)).toEqual(['50,00','H']);expect(data[2][19]).toBe('');
 });
 it('preserves DATEV syntax separately from formula-safe office exports',()=>{
  const result=createDatevLedgerCsv([{...record,number:'RE-1',accounts:{...accounts,tax_key:'0'}}],profile,range,'2026-10-17T10:00:00Z');expect(result[0]).not.toBe(0xef);expect(iconv.decode(result,'windows-1252')).toContain('"Schubert RE-1"');expect(()=>createDatevLedgerCsv([{...record,currency:'USD'}],profile,range,'2026-10-17')).toThrow();
 });
});
