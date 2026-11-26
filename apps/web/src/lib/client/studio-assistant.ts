import {reportLengthValidity} from './length-validation.ts';
import {writable} from 'svelte/store';
import type {PlanningStep,DesignOperation} from '@schubert/contracts';

export type StudioAssistantContext={
  projectId:string;variantId:string;revisionId:string;baseVersion:number;
  presetId?:string|null;displayUnit:'mm'|'cm'|'m';kind:'memorial'|'room_plan';step:PlanningStep;view:'front'|'side'|'top'|'3d';
  selectedElementIds:string[];selectedLabels:string[];dirty:boolean;historic:boolean;
};
export const studioAssistantContext=writable<StudioAssistantContext|null>(null);
let prepare:(()=>Promise<StudioAssistantContext>)|null=null;
type Adopt=(baseRevisionId:string,operations:DesignOperation[],result:any)=>boolean;
let adopt:Adopt|null=null;

export function registerStudioAssistant(handler:()=>Promise<StudioAssistantContext>,accept?:Adopt){
  prepare=handler;
  adopt=accept??null;
  return()=>{if(prepare===handler){prepare=null;adopt=null;studioAssistantContext.set(null);}};
}
export function adoptStudioAssistantResult(baseRevisionId:string,operations:DesignOperation[],result:any){return adopt?.(baseRevisionId,operations,result)??false;}

export async function prepareStudioAssistant(){
  if(!prepare)throw new Error('Der Plan wird noch geladen. Bitte öffnen Sie die aktuelle Variante.');
  // Commit the focused measurement's change event before waiting for a save.
  if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
  if(!reportLengthValidity(document.querySelector('.studio-root'),{allowEmptyForms:true}))throw new Error('Bitte das ungültige Maß im Plan korrigieren, bevor die KI den Plan erhält.');
  return prepare();
}

/**
 * What the last studio-bound assistant reply offers. The studio states this next to
 * „KI für diesen Schritt“, so a reply without applicable commands never looks like
 * a pending change. Assistant.svelte reports each reply via reportStudioAssistantReply.
 */
export type StudioAssistantReply={variantId:string;revisionId:string;step:PlanningStep;kind:'proposal'|'notes';commandCount:number;at:number};
export const studioAssistantReply=writable<StudioAssistantReply|null>(null);
export function studioReplyKind(result:any):{kind:'proposal'|'notes';commandCount:number}{
  const proposal=result?.proposal;
  const commands=proposal?.proposedCommands??proposal?.commands??proposal?.changes;
  const commandCount=Array.isArray(commands)?commands.length:commands&&typeof commands==='object'?Object.keys(commands).length:0;
  return{kind:proposal?.id&&commandCount>0?'proposal':'notes',commandCount};
}
export function reportStudioAssistantReply(work:Pick<StudioAssistantContext,'variantId'|'revisionId'|'step'>|null,result:any){
  if(!work)return;
  studioAssistantReply.set({variantId:work.variantId,revisionId:work.revisionId,step:work.step,...studioReplyKind(result),at:Date.now()});
}
