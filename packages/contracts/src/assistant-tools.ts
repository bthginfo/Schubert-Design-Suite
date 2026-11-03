export const assistantReadToolNames=['lookup_planning_catalog','inspect_current_plan'] as const;
export type AssistantReadToolName=typeof assistantReadToolNames[number];
export type AssistantReadToolUsage={name:AssistantReadToolName;label:string;cached:boolean;elapsedMs:number;resultItems:number};
export type AssistantReadToolAccess={
  version:string;
  available:readonly AssistantReadToolName[];
  execute:(name:AssistantReadToolName,args:unknown)=>Promise<unknown>;
};
export const ASSISTANT_READ_TOOL_VERSION='schubert-read-tools-1';
export const ASSISTANT_READ_RESULT_BYTES=5000;
export const ASSISTANT_READ_CALLS=2;
