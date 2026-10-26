import type { AssistantSource } from "./assistant.ts";
type Handoff = {
  intent: "plan" | "photo";
  prompt: string;
  sources: AssistantSource[];
};
// Kept in this tab only; source content and prompts never enter the URL.
const queued = new Map<string, Handoff>();
export function queueVisualization(projectId: string, handoff: Handoff) {
  queued.clear();
  queued.set(projectId, handoff);
}
export function takeVisualization(projectId: string) {
  const handoff = queued.get(projectId);
  queued.delete(projectId);
  return handoff;
}
