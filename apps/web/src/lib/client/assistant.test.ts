import {describe,expect,it} from 'vitest';
import {sourceReferences,assistantRestrictedPaths,type AssistantSource} from './assistant';
const source:AssistantSource={key:'local-only',documentId:'selected-document',name:'Konkrete Testquelle',pageNumber:3,includeImage:false};
describe('explicit assistant document references',()=>{
 it('sends only the selected document, zero-based page and explicit image choice',()=>{
  expect(sourceReferences([source])).toEqual([{document_id:'selected-document',page_index:2,include_image:false}]);
  expect(JSON.stringify(sourceReferences([source]))).not.toMatch(/local-only|Konkrete|history|password|bytes/);
 });
 it('blocks image use until a bounded preview has actually completed',()=>{
  expect(()=>sourceReferences([{...source,includeImage:true,preview:{status:'pending'}}])).toThrow(/vorbereiten/);
  expect(()=>sourceReferences([{...source,includeImage:true,preview:{status:'completed',width:1440,height:900}}])).toThrow(/vorbereiten/);
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
