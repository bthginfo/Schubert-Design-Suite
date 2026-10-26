import {reportLengthValidity} from './length-validation.ts';
import {writable} from 'svelte/store';
import type {PlanningStep,DesignOperation} from '@schubert/contracts';

export type StudioAssistantContext={
  projectId:string;variantId:string;revisionId:string;baseVersion:number;
  displayUnit:'mm'|'cm'|'m';kind:'memorial'|'room_plan';step:PlanningStep;view:'front'|'side'|'top'|'3d';
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
