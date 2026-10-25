import {describe,expect,it} from 'vitest';
import {lengthInput,lengthLabel,parseLength,lengthUnits} from './length-units.js';

describe('Planning display units keep one canonical millimetre model',()=>{
  it('accepts the same physical dimension in German mm, cm and m inputs',()=>{
    expect(parseLength('1400','mm')).toBe('1400');expect(parseLength('140','cm')).toBe('1400');expect(parseLength('1,4','m')).toBe('1400');
  });
  it('uses an explicitly typed unit without changing the selected default',()=>{
    expect(parseLength('2,5 cm','m')).toBe('25');expect(parseLength('-12 mm','cm')).toBe('-12');expect(parseLength('1.25 M','mm')).toBe('1250');
  });
  it('round-trips every supported unit at the actual 0.01 mm model precision',()=>{
    for(const unit of lengthUnits)for(const value of ['0','0.01','-0.01','12.34','1400','1000000000'])expect(parseLength(lengthInput(value,unit),unit)).toBe(value);
    expect(parseLength('0,000009','m')).toBe('0.01');
  });
  it('rejects ambiguous or unsafe input instead of accepting a partial number',()=>{
    for(const value of ['1,2,3','1.234,56','2 ft','Infinity','1e3','--2','1000000001 mm'])expect(parseLength(value,'mm')).toBeNull();
    expect(parseLength('1000001','m')).toBeNull();
  });
  it('formats editable values without thousands separators and keeps display labels local',()=>{
    expect(lengthInput('1200','mm')).toBe('1200');expect(lengthInput('1200','m')).toBe('1,2');expect(lengthInput(null,'cm')).toBe('');
    expect(lengthLabel('1200','mm')).toBe('1.200');expect(lengthLabel('1200','m')).toBe('1,2');
  });
});
