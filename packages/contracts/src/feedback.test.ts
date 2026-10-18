import {describe,it,expect} from 'vitest';
import {feedbackPage,feedbackSubmitSchema,feedbackContextSchema} from './feedback.js';
const id='970b1c9b-bc0a-4599-9eb1-a2aaf491eb41';
describe('Minimized feedback diagnostics',()=>{
 it('keeps useful record and studio references but removes secrets and search terms',()=>{
  expect(feedbackPage('/customers/'+id+'?q=PRIVATE&token=SECRET#PRIVATE')).toEqual({path:'/customers/'+id,label:'Kunden · Detail'});
  expect(feedbackPage('/studio/'+id+'?variant='+id+'&source=PRIVATE').path).toBe('/studio/'+id+'?variant='+id);
  expect(feedbackPage('/settings?tab=feedback&api_key=SECRET').path).toBe('/settings?tab=feedback');
  expect(feedbackPage('/settings?tab=SECRET').path).toBe('/settings');
 });
 it('does not retain external URLs, personal path names or unknown routes',()=>{
  for(const path of ['https://example.com/customers','//evil.test/customers','/customers/Jane-Smith','/password-reset/SECRET','/customers/'+id+'/PRIVATE','/\\evil.test/customers'])expect(feedbackPage(path)).toEqual({path:'/',label:'Arbeitsbereich'});
 });
 const context={steps:[{kind:'navigation',action:'Seite öffnen',page:'/customers?q=SECRET',age_seconds:0,outcome:'opened'}],browser:'Edge',os:'Windows',viewport:{width:1440,height:1000},client_release:'development'};
 it('rejects extra fields and oversized history rather than persisting arbitrary request payloads',()=>{
  expect(feedbackContextSchema.parse(context).steps[0].page).toBe('/customers');
  for(const invalid of [{...context,form_values:'SECRET'},{...context,steps:[{...context.steps[0],payload:{password:'SECRET'}}]},{...context,steps:Array(41).fill(context.steps[0])},{...context,steps:[{...context.steps[0],age_seconds:901}]},{...context,client_release:'SECRET'}])expect(feedbackContextSchema.safeParse(invalid).success).toBe(false);
 });
 it('accepts comments without optional diagnostics and refuses client supplied identities',()=>{
  const report={category:'bug',message:'  Eine hilfreiche Rückmeldung  ',page:'/studio?token=SECRET',context:null};
  expect(feedbackSubmitSchema.parse(report).message).toBe('Eine hilfreiche Rückmeldung');
  expect(feedbackSubmitSchema.safeParse({...report,actor_id:id}).success).toBe(false);
  expect(feedbackSubmitSchema.safeParse({...report,message:'   '}).success).toBe(false);
 });
});
