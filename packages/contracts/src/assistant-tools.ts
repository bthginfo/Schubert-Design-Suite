import type {AssistantPlanBinding,AssistantRecordLink,AssistantSuiteArea} from './assistant-suite.js';
import type {AssistantAction} from './assistant-actions.js';

export const assistantReadToolNames=['lookup_planning_catalog','inspect_current_plan','find_suite_records','resolve_dispatch_assignment'] as const;
export type AssistantReadToolName=typeof assistantReadToolNames[number];
export type AssistantReadToolUsage={name:AssistantReadToolName;label:string;cached:boolean;elapsedMs:number;resultItems:number};
export type AssistantReadToolAccess={
  version:string;
  available:readonly AssistantReadToolName[];
  execute:(name:AssistantReadToolName,args:unknown)=>Promise<unknown>;
  suite?:{
    areas:readonly AssistantSuiteArea[];
    actions:()=>AssistantAction[];
    links:()=>AssistantRecordLink[];
    reference:(area:string,id:string)=>Record<string,unknown>|undefined;
    recipients:()=>string[];
    plans:()=>readonly {binding:AssistantPlanBinding;context:Record<string,any>}[];
  };
};
export const ASSISTANT_READ_TOOL_VERSION='schubert-read-tools-3';
export const ASSISTANT_READ_RESULT_BYTES=5000;
export const ASSISTANT_READ_CALLS=2;
