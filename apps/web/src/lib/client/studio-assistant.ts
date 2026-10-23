import {writable} from 'svelte/store';
import type {PlanningStep} from '@schubert/contracts';

export type StudioAssistantContext={
  projectId:string;variantId:string;revisionId:string;baseVersion:number;
  kind:'memorial'|'room_plan';step:PlanningStep;view:'front'|'side'|'top'|'3d';
  selectedElementIds:string[];selectedLabels:string[];dirty:boolean;historic:boolean;
};
export const studioAssistantContext=writable<StudioAssistantContext|null>(null);
let prepare:(()=>Promise<StudioAssistantContext>)|null=null;

export function registerStudioAssistant(handler:()=>Promise<StudioAssistantContext>){
  prepare=handler;
  return()=>{if(prepare===handler){prepare=null;studioAssistantContext.set(null);}};
}

export async function prepareStudioAssistant(){
  if(!prepare)throw new Error('Der Plan wird noch geladen. Bitte öffnen Sie die aktuelle Variante.');
  // Commit the focused measurement's change event before waiting for a save.
  if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
  return prepare();
}
