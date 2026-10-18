import {it,expect} from 'vitest';
import {formatNumber,validateNumberTemplate,numberingDate} from './numbering.js';
it('previews mid-year migration numbers without truncating a longer sequence',()=>{
 expect(formatNumber('RE-{JJJJ}-{NR}',5,348,{year:2026,month:'10'})).toBe('RE-2026-00348');
 expect(formatNumber('AN/{JJ}/{MM}/{NR}',3,12345,{year:2026,month:'10'})).toBe('AN/26/10/12345');
 expect(numberingDate(new Date('2026-12-31T23:30:00Z')).year).toBe(2027);
});
it('rejects ambiguous templates and annual resets without a year',()=>{
 for(const pattern of ['RE','RE-{NR}-{NR}','RE-{BAD}-{NR}','RE-{NR}\n'])expect(()=>validateNumberTemplate(pattern,5,false)).toThrow();
 expect(()=>validateNumberTemplate('RE-{NR}',5,true)).toThrow();
 expect(()=>validateNumberTemplate('RE-{NR}',5,false)).not.toThrow();
 expect(()=>formatNumber('{NR}',5,0)).toThrow();
});
