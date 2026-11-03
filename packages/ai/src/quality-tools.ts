import {ASSISTANT_READ_TOOL_VERSION,type AssistantReadToolAccess} from '@schubert/contracts';
import {DomainError} from '@schubert/domain';
import {qualityCases} from './quality-cases.js';
import type {QualityCase} from './quality.js';
import {inspectPlanningSnapshot} from './planning-facts.js';
import {catalogLookupSchema} from './specialist-tools.js';

/** Controlled, explicitly synthetic evidence for live model tool-use evaluation. */
export function qualityToolCases():QualityCase[]{
  const context=structuredClone(qualityCases().find(t=>t.id==='literal-text-edit')!.context);
  return[
    {id:'tool-plan-volume',category:'factual_tool',context,message:'TEST: Rufe die Planprüfung auf und nenne das berechnete Volumen des vorhandenen Natursteins in m³ mit vier Nachkommastellen. Nichts ändern, keine Maße bestätigen.',expect:{intent:'answer',requiredTool:'inspect_current_plan',answerPattern:'0[,.]1536'}},
    {id:'tool-source-reference',category:'factual_tool',context:structuredClone(context),message:'TEST: Suche mit der Materialbibliothek nach TEST Schiefer. Nenne den gefundenen Materialnamen exakt und erkläre den Prüfstatus. Keine Planung ändern oder Freigabe behaupten.',expect:{intent:'answer',requiredTool:'lookup_planning_catalog',answerPattern:'TEST Schiefer S17'}},
  ];
}
export function qualityReadTools(test:QualityCase):AssistantReadToolAccess{
  const available:AssistantReadToolAccess['available']=test.context.entityType==='planning'?['lookup_planning_catalog','inspect_current_plan']:[];
  return{version:ASSISTANT_READ_TOOL_VERSION,available,async execute(name,args){
    if(!available.includes(name))throw new DomainError('AI_TOOL_SCOPE','Outside the synthetic evaluation case.');
    if(name==='inspect_current_plan')return inspectPlanningSnapshot(test.context.snapshot);
    const parsed=catalogLookupSchema.parse(args);
    if(test.id!=='tool-source-reference'||parsed.kind!=='materials'||!parsed.query.toLowerCase().includes('schiefer'))return{source:'synthetic_evaluation_fixture',kind:parsed.kind,items:[],possiblyMore:false,meaning:'Die kontrollierte Testbibliothek enthält hierfür keinen Treffer. Keine Produktbezüge erfinden.'};
    return{source:'synthetic_evaluation_fixture',kind:'materials',items:[{id:'00000000-0000-4000-8000-000000000071',name:'TEST Schiefer S17',status:'source_reference',sourceHash:'7'.repeat(64),sourceUrl:'https://example.invalid/synthetic-material',technicalApproval:false}],possiblyMore:false,meaning:'Explizit synthetische Quelle für die Qualitätsprüfung. Keine technische Freigabe und kein realer Herstellerartikel.'};
  }};
}
export function qualityToolReplay(test:QualityCase){return{text:test.id==='tool-plan-volume'?'TEST: 0,1536 m³; keine Freigabe.':'TEST Schiefer S17; synthetische ungeprüfte Quellenreferenz.',targetId:null,baseVersion:null,commands:[],missingInputs:[],assumptions:[],clarifications:[],planningDraft:null,visualization:null};}
