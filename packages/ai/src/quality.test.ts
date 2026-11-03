import {describe,it,expect} from 'vitest';
import {qualityCases} from './quality-cases.js';
import {evaluateAssistantQuality} from './quality.js';
import {assistantResponseFormat} from './response-format.js';
import {qualityToolCases,qualityToolReplay} from './quality-tools.js';

const answer={text:'Ein bearbeitbarer Entwurf.',targetId:null,baseVersion:null,commands:[],missingInputs:[],assumptions:[],clarifications:[],visualization:null,planningDraft:null};
describe('Task-specific AI quality rubric with negative controls',()=>{
  it('requires the actual factual read and a correct answer rather than accepting plausible prose',()=>{
    for(const test of qualityToolCases()){
      const toolsUsed=[{name:test.expect.requiredTool!,label:'TEST',cached:false,elapsedMs:1,resultItems:1}];
      expect(evaluateAssistantQuality(test,qualityToolReplay(test),{toolsUsed}).passed).toBe(true);
      expect(evaluateAssistantQuality(test,qualityToolReplay(test)).passed).toBe(false);
      expect(evaluateAssistantQuality(test,{...qualityToolReplay(test),text:'Erfundene Antwort'},{toolsUsed}).passed).toBe(false);
    }
  });
  it('has fixed synthetic cases covering dimensions, text, missing information, permissions and catalogue evidence',()=>{
    const cases=qualityCases();expect(new Set(cases.map(c=>c.id)).size).toBe(10);
    expect(new Set(cases.map(c=>c.category)).size).toBe(7);
  });
  it('checks the actual geometry of clear centimetre and metre room drafts',()=>{
    for(const test of qualityCases().filter(c=>c.expect.roomMm)){
      const good={...answer,planningDraft:{kind:'rectangular_room',label:'Bad',clearWidthMm:'4200',clearDepthMm:'3200',heightMm:'2500',wallThicknessMm:'200'}};
      expect(evaluateAssistantQuality(test,good).passed).toBe(true);
      expect(evaluateAssistantQuality(test,{...good,planningDraft:{...good.planningDraft,clearWidthMm:'420'}}).passed).toBe(false);
    }
  });
  it('detects invented dimensions and missing clarification, without accepting prose as an executable plan',()=>{
    const test=qualityCases().find(c=>c.id==='memorial-missing-measures')!;
    expect(evaluateAssistantQuality(test,{...answer,missingInputs:['Welche Breite, Höhe und Stärke sind gewünscht?']}).passed).toBe(true);
    expect(evaluateAssistantQuality(test,answer).passed).toBe(false);
    expect(evaluateAssistantQuality(qualityCases()[0],{...answer,text:'Alles ist fertig.'}).passed).toBe(false);
  });
  it('requires literal inscription characters and correct material thickness',()=>{
    const test=qualityCases()[0],draft={kind:'memorial_assembly',label:'Stein',shape:'rectangle',widthMm:'800',heightMm:'1200',thicknessMm:'160',base:null,inscription:test.expect.exactText,materialWish:null};
    const valid=evaluateAssistantQuality(test,{...answer,planningDraft:draft});
    expect(valid.passed).toBe(true);
    expect(evaluateAssistantQuality(test,{...answer,planningDraft:{...draft,inscription:'Anderer Wortlaut'}}).passed).toBe(false);
  });
  it('rejects actions smuggled through a source and oversized question lists',()=>{
    const test=qualityCases().find(c=>c.id==='source-injection')!;
    expect(evaluateAssistantQuality(test,answer).passed).toBe(true);
    expect(evaluateAssistantQuality(test,{...answer,commands:[{name:'billing.invoice.issue',inputJson:'{}'}]}).passed).toBe(false);
    expect(evaluateAssistantQuality(test,{...answer,missingInputs:['a','b','c','d']}).passed).toBe(false);
  });
  it('binds initial memorial output to the compact server-expanded contract',()=>{
    const format=assistantResponseFormat(qualityCases()[0].context);
    expect(format.properties.commands).toMatchObject({maxItems:0});
    expect(format.required).toContain('planningDraft');
  });
});
