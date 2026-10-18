import {describe,it,expect} from 'vitest';
import {tourSteps,tourPosition} from '../apps/web/src/lib/client/onboarding-tour.js';
describe('Guided onboarding',()=>{
 it('keeps the tour short and excludes inaccessible business areas',()=>{
  const employee=tourSteps(['account.self','orders','time','documents']);expect(employee.map(s=>s.id)).toEqual(['welcome','today','orders','time','documents','help','appearance']);
  expect(tourSteps([]).map(s=>s.id)).toEqual(['welcome','today','help','appearance']);
  const admin=tourSteps(['crm','orders','planning','time','hr','billing','documents']);expect(admin).toHaveLength(7);expect(admin[4].href).toBe('/studio');
  expect(tourSteps(['billing.read']).some(s=>s.href==='/invoices')).toBe(true);
 });
 it.each([{width:1440,height:1000},{width:768,height:1024},{width:375,height:812},{width:320,height:568}])('keeps the coach visible in $width × $height',viewport=>{
  for(const target of[null,{x:20,y:24,width:viewport.width-40,height:80},{x:viewport.width-180,y:viewport.height-110,width:160,height:80}]){
   const point=tourPosition(target,{width:420,height:380},viewport);expect(point.left).toBeGreaterThanOrEqual(16);expect(point.top).toBeGreaterThanOrEqual(16);expect(point.left+Math.min(420,viewport.width-32)).toBeLessThanOrEqual(viewport.width-16);expect(point.top+380).toBeLessThanOrEqual(viewport.height-16);
  }
 });
});
