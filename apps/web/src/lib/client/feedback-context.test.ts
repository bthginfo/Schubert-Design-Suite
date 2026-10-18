import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {configureFeedback,recordFeedbackStep,feedbackSnapshot,feedbackRequestAction,feedbackFetch} from './feedback-context';
describe('Session-only feedback trace',()=>{
 beforeEach(()=>{vi.stubGlobal('location',{pathname:'/studio',search:'?token=NEVER_KEEP'});vi.stubGlobal('navigator',{userAgent:'Mozilla Windows Chrome/1 Edg/1'});vi.stubGlobal('innerWidth',1440);vi.stubGlobal('innerHeight',1000);configureFeedback('test',true);});
 afterEach(()=>{configureFeedback('',false);vi.unstubAllGlobals();vi.useRealTimers();});
 it('bounds memory and excludes expired actions without writing to storage',()=>{
  vi.useFakeTimers();for(let i=0;i<45;i++){recordFeedbackStep('control','Speichern','opened');vi.advanceTimersByTime(1000);}
  const context=feedbackSnapshot('development');expect(context.steps).toHaveLength(40);expect(context.steps.every(s=>s.page==='/studio')).toBe(true);
  vi.advanceTimersByTime(901_000);expect(feedbackSnapshot('development').steps).toHaveLength(0);
 });
 it('clears context when disabled or when the authenticated person changes',()=>{
  recordFeedbackStep('control','Speichern','opened');configureFeedback('another-user',true);expect(feedbackSnapshot('development').steps).toHaveLength(0);
  recordFeedbackStep('control','Speichern','opened');configureFeedback('another-user',false);expect(feedbackRequestAction('/api/v1/ai/chat',{message:'PRIVATE'})).toBeNull();expect(feedbackSnapshot('development').steps).toHaveLength(0);
 });
 it('observes direct studio failures without geometry, inscription or raw error messages',async()=>{
  const path='/api/v1/designs/970b1c9b-bc0a-4599-9eb1-a2aaf491eb41/commands';
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({error:{code:'VERSION_CONFLICT',message:'PRIVATE',correlationId:'970b1c9b-bc0a-4599-9eb1-a2aaf491eb41'}}),{status:409,headers:{'Content-Type':'application/json'}})));
  expect((await feedbackFetch(path,{method:'POST',body:JSON.stringify({inscription:'PRIVATE'})})).status).toBe(409);
  const trace=feedbackSnapshot('development');expect(trace.steps.map(s=>s.outcome)).toEqual(['started','failed']);expect(trace.steps[1].error_code).toBe('VERSION_CONFLICT');expect(JSON.stringify(trace)).not.toContain('PRIVATE');
  expect(feedbackRequestAction('/api/v1/commands',{name:'account.password.update',payload:{password:'PRIVATE'}})).toBeNull();expect(feedbackRequestAction('/api/v1/reauth',{})).toBeNull();
 });
});
