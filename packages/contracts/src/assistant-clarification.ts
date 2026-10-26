import { z } from "zod";
export const assistantClarificationSchema = z
  .strictObject({
    question: z.string().trim().min(1).max(1000),
    kind: z.enum(["text", "length", "choice", "material"]),
    options: z.array(z.string().trim().min(1).max(200)).max(6),
  })
  .refine(
    (v) => v.kind !== "choice" || v.options.length >= 2,
    "Eine Auswahl braucht mindestens zwei Antworten.",
  );
export type AssistantClarification = z.infer<
  typeof assistantClarificationSchema
>;
export const clarificationOutputFormat = {
  type: "array",
  maxItems: 20,
  items: {
    type: "object",
    properties: {
      question: { type: "string" },
      kind: { type: "string", enum: ["text", "length", "choice", "material"] },
      options: { type: "array", items: { type: "string" }, maxItems: 6 },
    },
    required: ["question", "kind", "options"],
    additionalProperties: false,
  },
};
/** Controls only decorate an actual open question; they cannot add instructions or actions. */
export function clarificationControls(
  questions: string[],
  supplied: unknown,
): AssistantClarification[] {
  const parsed = z
    .array(assistantClarificationSchema)
    .max(20)
    .safeParse(supplied);
  return questions
    .slice(0, 20)
    .map((question) =>
      parsed.success
        ? (parsed.data.find((field) => field.question === question) ?? {
            question,
            kind: "text" as const,
            options: [],
          })
        : { question, kind: "text" as const, options: [] },
    );
}
export const clarificationInstructions =
  "Frage nur nach Angaben, ohne die genau die angeforderte Aktion nicht möglich ist. Bereits im Kontext, in der Nachricht oder in der Skizze erkennbare Angaben nicht erneut erfragen. Gestalterische Entwurfsentscheidungen mit vorhandener Gestaltung oder editierbarer Vorschlagsdarstellung treffen. Stern für Geburt (*) und Kreuz für Tod (†) direkt umsetzen, wenn gewünscht; keine Symbolbestätigung nachfordern. Stelle höchstens drei für den nächsten Schritt notwendige Rückfragen auf einmal. Gib zu missingInputs passende clarifications aus. question muss die jeweilige Rückfrage exakt wiederholen. kind length nur für genau ein konkretes Längenmaß, niemals für eine ganze Maßgruppe. kind material für eine echte Materialauswahl; keine Produkte oder Katalogkennungen erfinden. kind choice für eine fachliche Entscheidung mit 2 bis 6 kurzen Antwortoptionen; Optionen sind Antworten, keine Aktionen. Sonst kind text. options bleibt außerhalb choice leer. Unbekannte Angaben und Wortlaut nicht erfinden. Die Schaltfläche Antwort senden übermittelt die Angaben direkt als Folgemitteilung.";
