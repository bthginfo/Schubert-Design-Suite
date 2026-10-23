import type {
  Response,
  ResponseCreateParamsNonStreaming,
} from "openai/resources/responses/responses";
import { DomainError } from "@schubert/domain";
import { estimatedTextCost } from "./model-routing.js";
import {
  loadedSkillInstructions,
  loadRequestedSkills,
  skillTool,
  skillUsage,
  type AssistantSkill,
} from "./skills.js";

type Options = {
  parameters: ResponseCreateParamsNonStreaming;
  skills: readonly AssistantSkill[];
  create: (parameters: ResponseCreateParamsNonStreaming) => Promise<Response>;
  signal?: AbortSignal;
  onRequest?: () => void;
  onResponse?: (response: Response) => void;
  onSkillsLoaded?: (skills: readonly AssistantSkill[]) => void;
};

/** At most one model-selected load and one final answer. No general agent loop. */
export async function respondWithOptionalSkills(options: Options) {
  const { parameters, skills, signal } = options;
  const request = async (input: ResponseCreateParamsNonStreaming) => {
    signal?.throwIfAborted();
    options.onRequest?.();
    const response = await options.create(input);
    options.onResponse?.(response);
    signal?.throwIfAborted();
    if (response.status !== "completed")
      throw new DomainError(
        "AI_RESPONSE_INCOMPLETE",
        "Die KI-Antwort wurde nicht vollständig geliefert. Es wurde nichts geändert und kein weiterer kostenpflichtiger Versuch gestartet.",
        502,
      );
    return response;
  };
  const first = await request({
    ...parameters,
    tools: skills.length ? [skillTool(skills)] : [],
    tool_choice: skills.length ? "auto" : "none",
    parallel_tool_calls: false,
  });
  const calls = first.output.filter((item) => item.type === "function_call");
  if (!calls.length) return { response: first, skillsUsed: [] };
  if (calls.length !== 1)
    throw new DomainError(
      "AI_SKILL_SCOPE",
      "Die Fachhilfe-Anfrage überschreitet den zulässigen Umfang. Es wurde nichts geändert und kein weiterer Modellaufruf gestartet.",
      422,
    );
  const loaded = loadRequestedSkills(calls[0].name, calls[0].arguments, skills);
  options.onSkillsLoaded?.(loaded);
  // A fresh, stateless final request receives the identical authorized input.
  // We deliberately do not replay model reasoning, partial proposals or an
  // unbounded transcript. The selected instructions are the only addition.
  const response = await request({
    ...parameters,
    instructions: parameters.instructions + loadedSkillInstructions(loaded),
    tools: [],
    tool_choice: "none",
    parallel_tool_calls: false,
  });
  if (response.output.some((item) => item.type === "function_call"))
    throw new DomainError(
      "AI_SKILL_SCOPE",
      "Eine weitere Fachhilfe-Anfrage ist für diese Antwort nicht zulässig. Es wurde nichts geändert.",
      422,
    );
  return { response, skillsUsed: skillUsage(loaded) };
}

export function estimatedSkillResponseCost(
  profile: Parameters<typeof estimatedTextCost>[0],
  input: unknown,
  imageCount: number,
  skills: readonly AssistantSkill[],
  responseSchema: unknown,
) {
  const instructions =
    profile.instructions +
    "\n" +
    JSON.stringify(responseSchema) +
    (skills.length ? "\n" + JSON.stringify(skillTool(skills)) : "");
  const first = estimatedTextCost(
    { ...profile, instructions },
    input,
    imageCount,
  );
  if (!skills.length) return first;
  // Every authorized context offers at most one domain skill plus source review.
  // Reserve the full two-call ceiling even if the model later answers directly.
  const final = estimatedTextCost(
    {
      ...profile,
      instructions: instructions + loadedSkillInstructions(skills),
    },
    input,
    imageCount,
  );
  return {
    inputTokenCeiling: first.inputTokenCeiling + final.inputTokenCeiling,
    cost: Math.ceil((first.cost + final.cost) * 1000000) / 1000000,
  };
}
