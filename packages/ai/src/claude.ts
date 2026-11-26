import Anthropic from '@anthropic-ai/sdk';
import {DomainError} from '@schubert/domain';

/** Integration key of the text, vision and tool-use provider. Images and speech keep their own optional media connection. */
export const AI_PROVIDER = 'anthropic';
export const MEDIA_PROVIDER = 'openai';
export const CLAUDE_DEFAULT_MODEL = 'claude-opus-5-5';

export type ClaudeEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
export const claudeEfforts: readonly ClaudeEffort[] = ['low', 'medium', 'high', 'xhigh', 'max'];
export type ClaudeRequest = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;
export type ClaudeMessage = Anthropic.Beta.Messages.BetaMessage;
export type ClaudeTool = Anthropic.Beta.Messages.BetaTool;
export type ClaudeContentBlock = Anthropic.Beta.Messages.BetaContentBlockParam;

/** USD per million tokens as published for the Claude API. Cache writes use the 5-minute duration. */
export const claudeModelPrices: Readonly<Record<string, {input: string; output: string; cachedInput: string; cacheWrite: string}>> = {
  'claude-opus-5-5': {input: '4', output: '20', cachedInput: '0.2', cacheWrite: '5'},
  'claude-sonnet-5-5': {input: '2', output: '10', cachedInput: '0.1', cacheWrite: '2.5'},
  'claude-haiku-5-5': {input: '0.1', output: '0.5', cachedInput: '0.01', cacheWrite: '0.125'},
  'claude-fable-5-2': {input: '8', output: '40', cachedInput: '0.2', cacheWrite: '10'},
};

export const workspaceIdPattern = /^wrkspc_[A-Za-z0-9]{8,64}$/;
export function claudeClient(apiKey?: string, timeout = 120000, workspaceId?: string) {
  apiKey ??= process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new DomainError('INTEGRATION_UNAVAILABLE', 'Die Claude-Verbindung ist noch nicht eingerichtet. Die übrigen Funktionen bleiben verfügbar.', 503);
  // Organization-wide keys must name the Workspace whose limits, credits and usage apply.
  workspaceId ||= process.env.ANTHROPIC_WORKSPACE_ID || undefined;
  if (workspaceId && !workspaceIdPattern.test(workspaceId))
    throw new DomainError('AI_PROVIDER_CONFIGURATION', 'Die Claude-Workspace-ID hat kein gültiges Format (wrkspc_…).', 503);
  // No silent paid retries. Overload responses are retried explicitly in claudeCall().
  return new Anthropic({apiKey, timeout, maxRetries: 0, ...(workspaceId ? {defaultHeaders: {'anthropic-workspace-id': workspaceId}} : {})});
}

const generation = (model: string) => /^claude-(?:opus|sonnet|haiku|fable|mythos)-(\d+)(?:-(\d+))?/.exec(model);
function atLeast(model: string, major: number, minor = 0) {
  const match = generation(model);
  if (!match) return false;
  const [own, sub] = [Number(match[1]), Number(match[2] ?? 0)];
  // Date-suffixed legacy ids such as claude-opus-4-20250514 carry no minor version.
  const minorVersion = sub > 99 ? 0 : sub;
  return own > major || (own === major && minorVersion >= minor);
}
/** Adaptive thinking and effort exist on the 4.6 generation and later. Older ids are sent without them. */
export const supportsAdaptiveThinking = (model: string) => atLeast(model, 4, 6);
/** Operator messages inside messages[] keep the cached prefix intact. */
export const supportsMidConversationSystem = (model: string) =>
  /^claude-(?:opus-5|opus-5-5|opus-4-8|fable|mythos|sonnet-5-5|haiku-5-5)/.test(model);
/** Server-side refusal fallbacks are available for these models on the Claude API. */
export const supportsServerFallback = (model: string) =>
  /^claude-(?:fable-5-2|fable-5-1|opus-5-5|opus-5|sonnet-5-5)(?:$|[^0-9])/.test(model);

/**
 * Structured outputs accept a subset of JSON Schema. Value constraints that the API does not
 * enforce are removed here and remain enforced by the application's zod schemas after parsing.
 */
const droppedKeywords = new Set(['minLength', 'maxLength', 'pattern', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'minItems', 'maxItems', 'uniqueItems', 'minProperties', 'maxProperties', 'format']);
export function claudeSchema(schema: unknown): any {
  if (Array.isArray(schema)) return schema.map(claudeSchema);
  if (!schema || typeof schema !== 'object') return schema;
  const source = schema as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (droppedKeywords.has(key)) continue;
    if (key === 'properties' && value && typeof value === 'object') {
      result.properties = Object.fromEntries(Object.entries(value).map(([name, property]) => [name, claudeSchema(property)]));
    } else result[key] = claudeSchema(value);
  }
  if (result.type === 'object' && result.additionalProperties === undefined) result.additionalProperties = false;
  // `type: ["string", "null"]` becomes an explicit union, which every structured-output model accepts.
  if (Array.isArray(result.type)) {
    const {type, ...rest} = result;
    const variants = (type as string[]).map(kind => kind === 'null' ? {type: 'null'} : claudeSchema({...rest, type: kind}));
    const shared = Object.fromEntries(Object.entries(rest).filter(([key]) => key === 'description' || key === 'title'));
    return {...shared, anyOf: variants};
  }
  return result;
}

export type FunctionDefinition = {name: string; description: string; parameters: Record<string, unknown>};
export function claudeTool(definition: FunctionDefinition): ClaudeTool {
  return {name: definition.name, description: definition.description, strict: true, input_schema: claudeSchema(definition.parameters) as ClaudeTool['input_schema']};
}

export function messageText(message: Pick<ClaudeMessage, 'content'>) {
  return message.content.filter((block): block is Anthropic.Beta.Messages.BetaTextBlock => block.type === 'text').map(block => block.text).join('');
}
export function toolUses(message: Pick<ClaudeMessage, 'content'>) {
  return message.content.filter((block): block is Anthropic.Beta.Messages.BetaToolUseBlock => block.type === 'tool_use');
}

/** Each model call either completes or names a concrete, non-retried reason. */
export function assertCompleted(message: ClaudeMessage) {
  if (message.stop_reason === 'refusal')
    throw new DomainError('AI_REFUSAL', 'Claude hat diese Anfrage aus Sicherheitsgründen nicht beantwortet. Formulieren Sie die Aufgabe bitte konkreter und ohne fremde Anweisungen aus Dokumenten. Es wurde nichts geändert.', 422);
  if (message.stop_reason === 'max_tokens' || message.stop_reason === 'pause_turn' || message.stop_reason === 'model_context_window_exceeded')
    throw new DomainError('AI_RESPONSE_INCOMPLETE', 'Die KI-Antwort wurde nicht vollständig geliefert. Es wurde nichts geändert und kein weiterer kostenpflichtiger Versuch gestartet. Bitte die Aufgabe kleiner fassen.', 502);
  return message;
}

/** An overloaded API answers 529 without processing the request; one bounded retry is not a paid repetition. */
export async function claudeCall<T>(run: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!(error instanceof Anthropic.APIError) || error.status !== 529 || signal?.aborted) throw error;
    await new Promise(resolve => setTimeout(resolve, 1500));
    signal?.throwIfAborted();
    return run();
  }
}

export type ProviderFailure = {status: number; code: string; message: string};
/** Translate provider errors into user-facing German states without exposing provider internals. */
export function providerFailure(error: unknown): ProviderFailure | null {
  if (!(error instanceof Anthropic.APIError) || typeof error.status !== 'number') return null;
  const text = String((error as any).error?.error?.message ?? error.message ?? '');
  if (/credit balance is too low|billing/i.test(text))
    return {status: 402, code: 'AI_PROVIDER_CREDITS', message: 'Das Claude-Guthaben der verbundenen Organisation reicht nicht. In der Claude Console unter Billing Guthaben prüfen oder die API-Credits des Claude-Plans mit genau dieser Organisation verknüpfen.'};
  if (/scoped to a workspace|workspace-id header|valid workspace ID/i.test(text))
    return {status: 503, code: 'AI_PROVIDER_WORKSPACE', message: 'Dieser Claude-Schlüssel gilt für die ganze Organisation. Der Superadmin trägt unter Administration → Integrationen → „Claude verbinden“ die Workspace-ID (wrkspc_…) ein oder verwendet einen Schlüssel aus einem Workspace.'};
  if (error.status === 401 || error.status === 403)
    return {status: 503, code: 'AI_PROVIDER_CONFIGURATION', message: 'Der Claude-API-Schlüssel wurde abgelehnt. Der Superadmin kann unter Administration → Integrationen einen gültigen Schlüssel hinterlegen.'};
  if (error.status === 404)
    return {status: 503, code: 'AI_PROVIDER_CONFIGURATION', message: 'Das eingestellte Claude-Modell ist für diese Organisation nicht verfügbar. Bitte das Modellprofil unter Administration → Integrationen prüfen.'};
  if (error.status === 429)
    return {status: 429, code: 'AI_PROVIDER_LIMIT', message: 'Die Claude-Organisation hat gerade ihr Anfragelimit erreicht. Bitte in einer Minute erneut versuchen.'};
  if (error.status === 529)
    return {status: 503, code: 'AI_PROVIDER_BUSY', message: 'Claude ist gerade stark ausgelastet. Bitte gleich noch einmal senden. Ihre Eingaben bleiben erhalten; es wurde nichts berechnet.'};
  if (error.status === 413)
    return {status: 422, code: 'AI_CONTEXT', message: 'Die Anfrage ist für Claude zu groß. Weniger Unterlagen oder einen kleineren Ausschnitt auswählen.'};
  if ([400, 422].includes(error.status))
    return {status: 503, code: 'AI_PROVIDER_CONFIGURATION', message: 'Claude hat die Anfrage als ungültig abgewiesen. Der Superadmin kann Modellprofil und Einstellungen prüfen.'};
  return null;
}
