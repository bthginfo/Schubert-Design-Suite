import {describe,expect,it} from 'vitest';
import {sourceReferences,assistantRestrictedPaths,selectedPlanningElements,type AssistantSource} from './assistant';
const source:AssistantSource={key:'local-only',documentId:'selected-document',name:'Konkrete Testquelle',pageNumber:3,includeImage:false};
describe('explicit assistant document references',()=>{
 it('retains template component IDs while bounding untrusted browser selection events',()=>{
  const wall='9b9d590b-6393-44d9-bc91-2329e34413af:wall:0';
  expect(selectedPlanningElements([wall,wall,'',null,42,'x'.repeat(201)])).toEqual([wall]);
  expect(selectedPlanningElements({id:wall})).toEqual([]);
  expect(selectedPlanningElements(Array.from({length:30},(_,i)=>'component:'+i))).toHaveLength(20);
 });
 it('sends only the selected document, zero-based page and explicit image choice',()=>{
  expect(sourceReferences([source])).toEqual([{document_id:'selected-document',page_index:2,include_image:false}]);
  expect(JSON.stringify(sourceReferences([source]))).not.toMatch(/local-only|Konkrete|history|password|bytes/);
 });
 it('blocks image use until a bounded preview has actually completed',()=>{
  expect(()=>sourceReferences([{...source,includeImage:true,preview:{status:'pending'}}])).toThrow(/vorbereiten/);
  expect(sourceReferences([{...source,includeImage:true,preview:{status:'completed',width:1440,height:900}}])[0].include_image).toBe(true);
  expect(()=>sourceReferences([{...source,includeImage:true,preview:{status:'completed',width:2880,height:1800}}])).toThrow(/vorbereiten/);
  expect(sourceReferences([{...source,includeImage:true,preview:{status:'completed',width:512,height:318}}])[0].include_image).toBe(true);
 });
 it('does not invent a page or silently submit more than two sources',()=>{
  expect(()=>sourceReferences([{...source,pageNumber:undefined}])).toThrow();
  expect(()=>sourceReferences([{...source,pageNumber:0}])).toThrow();
  expect(()=>sourceReferences([source,source,source])).toThrow();
  expect(sourceReferences([])).toEqual([]);
 });
 it('keeps personal and administrative contexts behind local field help',()=>{
  for(const path of ['team','time','leave','work-calendars','account','settings','audit'])expect(assistantRestrictedPaths.has(path)).toBe(true);
  expect(assistantRestrictedPaths.has('reports')).toBe(false);
 });
});
