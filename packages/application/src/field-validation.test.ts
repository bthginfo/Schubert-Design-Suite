import {describe,it,expect} from 'vitest';
import {moduleBySlug} from '@schubert/contracts';
import {validatedFields} from './field-validation.js';

describe('Business form validation', () => {
  const customer = moduleBySlug('customers')!;
  it('rejects whitespace and null required names with field-local guidance', () => {
    for (const name of ['   ', '\n\t', null]) {
      try { validatedFields(customer,{name}); throw Error('accepted'); }
      catch(error:any) { expect(error.code).toBe('FIELD_REQUIRED');expect(error.fields.name).toContain('Bitte ausfüllen'); }
    }
  });
  it('normalizes exact country names and codes without guessing unknown countries', () => {
    for (const country of ['Deutschland',' DE ','de','Germany']) expect(validatedFields(customer,{name:'Müller',country}).country).toBe('DE');
    expect(validatedFields(customer,{name:'Müller',country:'Österreich'}).country).toBe('AT');
    expect(()=>validatedFields(customer,{name:'Müller',country:'XX'})).toThrow('Land');
  });
  it('retains Unicode names and multiline notes and trims surrounding email whitespace', () => {
    expect(validatedFields(customer,{name:'  Müller & Söhne 🌿  ',email:'  muster@example.com ',notes:'Zeile 1\n  Zeile 2'})).toEqual({name:'Müller & Söhne 🌿',email:'muster@example.com',notes:'Zeile 1\n  Zeile 2'});
  });
  it('rejects impossible calendar dates instead of silently moving them to the next month', () => {
    const inquiry=moduleBySlug('inquiries')!;
    expect(()=>validatedFields(inquiry,{title:'Bad',requested_date:'2026-02-30'})).toThrow('Kalenderdatum');
    expect(validatedFields(inquiry,{title:'Bad',requested_date:'2028-02-29'}).requested_date).toBe('2028-02-29');
  });
  it('preserves explicit zero and false while allowing optional fields to be cleared', () => {
    expect(validatedFields(customer,{payment_days:'0',email:' '},true)).toEqual({payment_days:'0',email:null});
    expect(()=>validatedFields(customer,{payment_days:'-1'},true)).toThrow('Kalendertage');
    expect(()=>validatedFields(customer,{payment_days:'2,5'},true)).toThrow('Kalendertage');
    expect(validatedFields(moduleBySlug('graves')!,{permit_required:false},true).permit_required).toBe(false);
  });
});
