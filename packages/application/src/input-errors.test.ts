import {describe,it,expect} from 'vitest';
import {z} from 'zod';
import {lineSchema} from '@schubert/contracts';
import {inputErrorDetails} from './input-errors.js';

const line={description:'Grabmal',quantity:'1',unit:'piece',unit_price:'2400,50',tax_rate:'19'};
describe('Public input errors for actual sales line validation',()=>{
  it('points a malformed German price to its exact position without exposing rejected content',()=>{
    const result=z.array(lineSchema).safeParse([line,{...line,unit_price:'2400,5,0'}]);
    expect(result.success).toBe(false);
    if(result.success)return;
    const details=inputErrorDetails(result.error);
    expect(details.fields).toEqual({'lines.1.unit_price':'Eine eindeutige Zahl eingeben, zum Beispiel 2400,50.'});
    expect(details.message).toContain('Position 2 · Einzelpreis netto');
    expect(JSON.stringify(details)).not.toContain('2400,5,0');
  });
  it('preserves full line paths from command envelopes and reports multiple distinct controls',()=>{
    const schema=z.object({payload:z.object({lines:z.array(lineSchema)})});
    const result=schema.safeParse({payload:{lines:[{...line,quantity:'eins',tax_rate:'neunzehn'}]}});
    if(result.success)throw Error('invalid values accepted');
    const details=inputErrorDetails(result.error);
    expect(Object.keys(details.fields)).toEqual(['lines.0.quantity','lines.0.tax_rate']);
    expect(details.message).toContain('Position 1 · Menge');
    expect(details.message).toContain('Weitere markierte Felder');
  });
  it('accepts the corrected real German decimal without changing its value',()=>{
    expect(lineSchema.parse(line).unit_price).toBe('2400.50');
    expect(lineSchema.parse({...line,unit_price:'2450,50'}).unit_price).toBe('2450.50');
  });
  it('does not reveal internal schema or user-generated validation messages',()=>{
    const result=z.object({title:z.string().refine(()=>false,'private rejected input: SECRET')}).safeParse({title:'SECRET'});
    if(result.success)throw Error('expected rejection');
    expect(inputErrorDetails(result.error)).toEqual({message:'Titel: Bitte einen Text eingeben.',fields:{title:'Bitte einen Text eingeben.'}});
  });
});
