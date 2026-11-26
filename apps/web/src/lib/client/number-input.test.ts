import {describe,it,expect} from 'vitest';
import {canonicalNumber,formatNumberInput,lineNumberProblem,lineProblems,parseNumberInput,payloadNumber,weekdaysBetween} from './number-input.ts';

describe('German number entry',()=>{
  it('accepts the formats office users actually type for amounts',()=>{
    for(const [input,expected] of [
      ['2.400,00','2400.00'],['2400,5','2400.5'],['2400.50','2400.50'],['2 400,00','2400.00'],['2 400,00','2400.00'],
      ['2.400,00 €','2400.00'],['€ 2400,50','2400.50'],['2400 EUR','2400'],['1.234.567,89','1234567.89'],['1,234.56','1234.56'],
      ['380','380'],[',5','0.5'],['5,','5'],['-12,5','-12.5'],['0,00','0.00'],
    ])expect(canonicalNumber(input,'money'),input).toBe(expected);
  });
  it('reads "." with exactly three digits as thousands only for money fields',()=>{
    expect(parseNumberInput('2.400','money')).toEqual({ok:true,value:'2400',ambiguous:true});
    expect(parseNumberInput('2.400','decimal')).toEqual({ok:true,value:'2.400',ambiguous:true});
    expect(canonicalNumber('1.234','percent')).toBe('1.234');
    expect(canonicalNumber('0.500','money')).toBe('0.500');
    expect(canonicalNumber('2400.000','money')).toBe('2400.000');
    expect(canonicalNumber('1.5','money')).toBe('1.5');
  });
  it('keeps "." and "," as decimal separator for quantities and tax rates',()=>{
    expect(canonicalNumber('1.5','decimal')).toBe('1.5');
    expect(canonicalNumber('2,25','decimal')).toBe('2.25');
    expect(canonicalNumber('19','percent')).toBe('19');
    expect(canonicalNumber('19 %','percent')).toBe('19');
    expect(canonicalNumber('7,5%','percent')).toBe('7.5');
  });
  it('rejects ambiguous or malformed input instead of guessing',()=>{
    for(const input of ['2400,5,0','1.2.3','1,234,567','12.34.56','abc','1e5','2 40,00','2,400.000,5','.','€','Infinity','24 00'])
      expect(parseNumberInput(input,'money').ok,input).toBe(false);
    expect(parseNumberInput('','money')).toEqual({ok:false,empty:true});
    expect(parseNumberInput('  ','decimal')).toEqual({ok:false,empty:true});
  });
  it('never reinterprets JavaScript numbers',()=>{
    expect(canonicalNumber(1.234,'money')).toBe('1.234');
    expect(canonicalNumber(2400,'money')).toBe('2400');
    expect(parseNumberInput(Number.NaN,'money').ok).toBe(false);
  });
  it('builds payload values with the existing fallbacks and leaves invalid text to the command',()=>{
    expect(payloadNumber('2.400,00','money','0')).toBe('2400.00');
    expect(payloadNumber('','money','0')).toBe('0');
    expect(payloadNumber('zwei','money','0')).toBe('zwei');
  });
  it('formats canonical values for German display',()=>{
    expect(formatNumberInput('2400.00','money')).toBe('2.400,00');
    expect(formatNumberInput('1234567','money')).toBe('1.234.567');
    expect(formatNumberInput('1000.5','decimal')).toBe('1000,5');
    expect(formatNumberInput('-0.5','percent')).toBe('-0,5');
  });
  it('round-trips every canonical value through the German display',()=>{
    for(const kind of ['money','decimal','percent'] as const)for(const value of ['0','1.234','2400.00','1000','1234567.891','-12.5','19','0.500'])
      expect(canonicalNumber(formatNumberInput(value,kind),kind),kind+' '+value).toBe(value);
  });
});

describe('line value problems',()=>{
  const line={description:'Grabmal',quantity:'1',unit:'piece',unit_price:'2.400,00',tax_rate:'19',discount_percent:'0',line_type:'item'};
  it('accepts a German price and reports concrete positions otherwise',()=>{
    expect(lineProblems([line])).toEqual([]);
    const problems=lineProblems([line,{...line,unit_price:'2400,5,0'},{...line,tax_rate:''}]);
    expect(problems.map(problem=>problem.summary)).toEqual(['Preis in Position 2 prüfen','Steuersatz in Position 3 eingeben']);
    expect(problems[0].message).toContain('2.400,00');
  });
  it('checks ranges and ignores values hidden for headings or texts',()=>{
    expect(lineNumberProblem({...line,tax_rate:'119'},'tax_rate')).toContain('zwischen 0 und 100');
    expect(lineNumberProblem({...line,quantity:'-1'},'quantity')).toContain('nicht negativ');
    expect(lineNumberProblem({...line,discount_percent:''},'discount_percent')).toBe('');
    expect(lineNumberProblem({...line,cost_unit:''},'cost_unit')).toBe('');
    expect(lineProblems([{...line,line_type:'heading',unit_price:'',tax_rate:'x'}])).toEqual([]);
  });
});

describe('weekdays between two dates',()=>{
  it('counts Monday to Friday inclusively',()=>{
    expect(weekdaysBetween('2026-11-30','2026-12-04')).toBe(5); // Mon–Fri
    expect(weekdaysBetween('2026-11-28','2026-11-29')).toBe(0); // Sat–Sun
    expect(weekdaysBetween('2026-11-27','2026-11-30')).toBe(2); // Fri–Mon
    expect(weekdaysBetween('2026-12-01','2026-12-01')).toBe(1);
    expect(weekdaysBetween('2026-12-21','2027-01-08')).toBe(15);
    expect(weekdaysBetween('2026-01-01','2026-12-31')).toBe(261);
  });
  it('returns null for incomplete or reversed ranges',()=>{
    expect(weekdaysBetween('2026-12-04','2026-12-01')).toBeNull();
    expect(weekdaysBetween('2026-02-30','2026-03-01')).toBeNull();
    expect(weekdaysBetween('','2026-03-01')).toBeNull();
  });
});
