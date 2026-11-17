import {describe,expect,it} from 'vitest';
import {assistantPrivateScreen} from '@schubert/contracts';
import {assistantHistory,sourceReferences,selectedPlanningElements,type AssistantSource} from './assistant';
const source:AssistantSource={key:'local-only',documentId:'selected-document',name:'Konkrete Testquelle',pageNumber:3,includeImage:false};
describe('explicit assistant document references',()=>{
 it('keeps conversation origins across navigation without including cancelled or unfinished work',()=>{
  const rows=[{role:'user',text:'Alte Frage',status:'completed',origin:{label:'Kunde Weber',href:'/customers/record'}},
   {role:'user',text:'Nicht zugestellt',status:'failed'},{role:'user',text:'Noch offen',status:'pending'},
   {role:'assistant',text:'Antwort zum Kunden',origin:{label:'Kunde Weber',href:'/customers/record'}},
   {role:'user',text:'Abgebrochen',status:'cancelled'}];
  const history=assistantHistory(rows);
  expect(history).toHaveLength(2);expect(history[0].text).toContain('/customers/record');expect(history[1].text).toContain('Kunde Weber');
  expect(JSON.stringify(history)).not.toMatch(/Nicht zugestellt|Noch offen|Abgebrochen/);
 });
 it('bounds transcript size, preserves applied-state notes and excludes external origin URLs',()=>{
  const history=assistantHistory(Array.from({length:9},(_,i)=>({role:'assistant',text:'Antwort '+i,origin:{label:'Vorgang',href:'https://untrusted.invalid'}})));
  expect(history).toHaveLength(6);expect(history[0].text).toContain('Antwort 3');expect(JSON.stringify(history)).not.toContain('untrusted.invalid');
  const applied={role:'assistant',text:'Entwurf',applied:true,records:[{record:{number:'ANG-2026-42'}}]};
  expect(assistantHistory([applied])[0].text).toContain('Übernommen: ANG-2026-42');
  expect(assistantHistory([{...applied,undone:true}])[0].text).not.toContain('Übernommen');
  expect(assistantHistory([{role:'user',text:'ü'.repeat(2000)}])[0].text).toHaveLength(1800);
 });
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
 it('excludes private screens from the ambient context',()=>{
  for(const path of ['team','time','leave','work-calendars','account','settings','audit','bank-imports'])expect(assistantPrivateScreen(path)).toBe(true);
  expect(assistantPrivateScreen('reports')).toBe(false);
 });
});
