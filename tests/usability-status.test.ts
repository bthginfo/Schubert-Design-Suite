import {expect,it} from 'vitest';
import {display,recordName,statusTone} from '../apps/web/src/lib/client/api.ts';
it('does not classify unavailable or unpaid as success by substring',()=>{
 for(const status of ['unavailable','not_accepted','unpaid','partially_paid','outcome_unknown'])expect(statusTone(status)).not.toBe('success');
 expect(statusTone('available')).toBe('success');expect(statusTone('paid')).toBe('success');expect(display('validated','status')).toBe('Geprüft');
});
it('resolves assigned people and explains unavailable labels without exposing opaque identifiers',()=>{
 const id='03152414-2386-4457-921c-8576ecf2d6cf',context={lookups:{team:[{id,name:'Petra Vogt'}]}};
 expect(display(id,'assigned_to',context)).toBe('Petra Vogt');expect(display(id,'customer_id',{lookups:{}})).toBe('Bezeichnung nicht verfügbar');
});
it('names an absence with its employee and kind and displays decimal day amounts naturally',()=>{
 const id='03152414-2386-4457-921c-8576ecf2d6cf',data={lookups:{team:[{id,name:'Jan Richter'}]},module:{singular:'Abwesenheitsantrag'}};
 expect(recordName({id:'absence-id',employee_id:id,kind:'other'},data)).toBe('Jan Richter · Sonstiges');
 expect(display('1.000000','days')).toBe('1');expect(display('0.500000','days')).toBe('0,5');
});
