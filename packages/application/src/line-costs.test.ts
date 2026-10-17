import {it,expect} from 'vitest';
import {bindLineCosts} from './line-costs.js';
const line:any={description:'Belegte Position',quantity:'2',unit:'m2',unit_price:'100',tax_rate:'19',discount_percent:'0',line_type:'item',optional:false,selected:true};
const old={...line,position:1,cost_unit:'63.500000'};
it('preserves a hidden planned cost when office changes quantity or sale price',()=>{expect(bindLineCosts([{...line,quantity:'3',unit_price:'125'}],[old],false)[0].cost_unit).toBe('63.500000');});
it('ignores unauthorized supplied or erased cost data',()=>{for(const cost_unit of ['1',null])expect(bindLineCosts([{...line,cost_unit}],[old],false)[0].cost_unit).toBe('63.500000');});
it('marks a changed article or unit as unknown and keeps restricted provenance',()=>{const result=bindLineCosts([{...line,unit:'piece'}],[old],false)[0];expect(result.cost_unit).toBeNull();expect(result.cost_review_required).toBe(true);expect(result.cost_evidence).toMatchObject({previousCostUnit:'63.500000'});});
it('rejects negative internal unit costs even for an authorized accountant',()=>{expect(()=>bindLineCosts([{...line,cost_unit:'-1'}],[old],true)).toThrow();});
