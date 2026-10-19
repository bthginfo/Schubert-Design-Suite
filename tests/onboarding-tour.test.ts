import {describe,it,expect} from 'vitest';
import {tourSteps,tourPosition,tourResumeIndex,TOUR_VERSION} from '../apps/web/src/lib/client/onboarding-tour.js';
import {rolePermissions} from '@schubert/domain';
import {helpFor} from '../apps/web/src/lib/client/help-content.js';
describe('Guided onboarding',()=>{
 it('includes all authorized main areas without truncating later steps',()=>{
  const employee=tourSteps(['account.self','orders','time','documents']);expect(employee.map(s=>s.id)).toEqual(['welcome','today','orders','time','documents','help','appearance']);
  expect(tourSteps([]).map(s=>s.id)).toEqual(['welcome','today','help','appearance']);
  const admin=tourSteps(rolePermissions.SuperAdmin);expect(admin).toHaveLength(20);expect(admin.map(s=>s.id)).toEqual(['welcome','today','customers','quotes','orders','studio','products','purchasing','stock','team','dispatch','time','invoices','documents','tasks','reports','settings','usage','help','appearance']);
  expect(tourSteps(['billing.read']).some(s=>s.href==='/invoices')).toBe(true);
 });
 it.each(Object.entries(rolePermissions).filter(([role])=>role!=='Portal'))('only visits permitted stations for %s',(_role,permissions)=>{
  const steps=tourSteps(permissions);for(const step of steps)if(step.permission)expect(permissions.includes(step.permission)||permissions.includes(step.permission+'.read')).toBe(true);
  expect(new Set(steps.map(s=>s.id)).size).toBe(steps.length);expect(steps.length-1).toBeLessThanOrEqual(20);
  for(const permission of ['purchasing','dispatch','inventory','catalog','reports','tasks'])expect(steps.some(s=>s.permission===permission)).toBe(permissions.includes(permission)||permissions.includes(permission+'.read'));
 });
 it('resumes paused version-2 tours at the same station after the expansion',()=>{
  const permissions=rolePermissions.SuperAdmin;expect(tourSteps(permissions)[tourResumeIndex(permissions,{guide_version:2,step:4})].id).toBe('studio');
  expect(tourSteps(permissions)[tourResumeIndex(permissions,{guide_version:2,step:5})].id).toBe('help');
  expect(tourSteps(permissions)[tourResumeIndex(permissions,{guide_version:2,step:6})].id).toBe('appearance');
  expect(tourResumeIndex(permissions,{guide_version:TOUR_VERSION,step:999})).toBe(19);expect(tourResumeIndex(permissions,{guide_version:1,step:3})).toBe(0);
 });
 it('provides dispatch help and read-only report guidance alongside the tour',()=>{
  expect(helpFor(['dispatch']).some(g=>g.id==='dispatch')).toBe(true);expect(helpFor(['reports.read']).some(g=>g.id==='reports')).toBe(true);expect(helpFor([]).some(g=>g.id==='dispatch')).toBe(false);
 });
 it.each([{width:1440,height:1000},{width:768,height:1024},{width:375,height:812},{width:320,height:568}])('keeps the coach visible in $width × $height',viewport=>{
  for(const target of[null,{x:20,y:24,width:viewport.width-40,height:80},{x:viewport.width-180,y:viewport.height-110,width:160,height:80}]){
   const point=tourPosition(target,{width:420,height:380},viewport);expect(point.left).toBeGreaterThanOrEqual(16);expect(point.top).toBeGreaterThanOrEqual(16);expect(point.left+Math.min(420,viewport.width-32)).toBeLessThanOrEqual(viewport.width-16);expect(point.top+380).toBeLessThanOrEqual(viewport.height-16);
  }
 });
});
