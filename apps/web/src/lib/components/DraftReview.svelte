<script lang="ts">
  import {
    assistantDraftFieldKeys,
    type AssistantEditor,
    type AssistantSkillUsage,
  } from "@schubert/contracts";
  import type { AppData, Row } from "#lib/client/types.ts";
  import { request } from "#lib/client/api.ts";
  import Icon from "./Icon.svelte";
  import AssistantReply from "./AssistantReply.svelte";
  import { onDestroy, tick } from "svelte";
  let {
    data,
    record,
    values,
    lines,
  }: { data: AppData; record: Row | null; values: Row; lines: Row[] } =
    $props();
  let open = $state(false),
    busy = $state(false),
    error = $state(""),
    answer = $state(""),
    reviewed = $state("");
  let assumptions: string[] = $state([]),
    missingInputs: string[] = $state([]),
    followup = $state(""),
    notice = $state("");
  let controller: AbortController | null = null,
    run = 0;
  let skillsUsed: AssistantSkillUsage[] = $state([]);
  const uid = $props.id();
  const integration = $derived(
    data.integrations?.ai ?? data.integrations?.openai,
  );
  const available = $derived(!!integration?.available);
  const draft = $derived.by(
    () =>
      ({
        module: data.module!.slug,
        ...(record?.id ? { record_id: record.id } : {}),
        values: Object.fromEntries(
          (data.module?.fields ?? [])
            .slice(0, 40)
            .filter(
              (field) =>
                typeof values[field.key] === "string" ||
                typeof values[field.key] === "number" ||
                typeof values[field.key] === "boolean" ||
                values[field.key] === null,
            )
            .map((field) => [
              field.key,
              typeof values[field.key] === "string"
                ? values[field.key].slice(0, 4000)
                : values[field.key],
            ]),
        ),
        lines: lines.slice(0, 20).map((line) => ({
          description: String(line.description ?? "").slice(0, 1500),
          quantity: String(line.quantity ?? ""),
          unit: String(line.unit ?? ""),
          unit_price: String(line.unit_price ?? ""),
          tax_rate: String(line.tax_rate ?? ""),
          line_type: line.line_type ?? "item",
          optional: !!line.optional,
          selected: !!line.selected,
        })),
        total_line_count: lines.length,
      }) as AssistantEditor,
  );
  const fingerprint = $derived(JSON.stringify(draft));
  const stale = $derived(!!reviewed && reviewed !== fingerprint);
  const sharedLabels = $derived(
    (data.module?.fields ?? [])
      .filter(
        (field) =>
          assistantDraftFieldKeys.includes(field.key) &&
          draft.values[field.key] !== undefined &&
          draft.values[field.key] !== "",
      )
      .map((field) => field.label),
  );
  async function review() {
    if (busy || !available) return;
    busy = true;
    error = "";
    notice = "";
    const input = fingerprint,
      current = ++run,
      signal = (controller = new AbortController()).signal;
    try {
      const result = await request(
        "/api/v1/ai/chat",
        {
          message:
            "Prüfe diesen aktuellen Formularentwurf. Nenne höchstens fünf konkrete Rückfragen oder Unstimmigkeiten und den nächsten sinnvollen Bearbeitungsschritt. Berücksichtige ausgefüllte Felder. Erfinde keine Preise, Maße oder steuerlichen Grundlagen. Speichere und ändere nichts." +
            (followup.trim()
              ? "\n\nErgänzende Angaben zur Prüfung:\n" + followup.trim()
              : ""),
          context: { path: data.path, editor: JSON.parse(input) },
        },
        "POST",
        signal,
      );
      if (current !== run) return;
      if (typeof result.text !== "string")
        throw new Error("Die Prüfung hat keinen lesbaren Hinweis geliefert.");
      answer = result.text;
      assumptions = result.assumptions ?? [];
      missingInputs = result.missingInputs ?? [];
      skillsUsed = result.skillsUsed ?? [];
      reviewed = input;
      followup = "";
    } catch (problem) {
      if (current === run && !signal.aborted)
        error =
          problem instanceof Error
            ? problem.message
            : "Die KI-Prüfung ist derzeit nicht verfügbar.";
    } finally {
      if (current === run) {
        busy = false;
        controller = null;
      }
    }
  }
  function stop() {
    controller?.abort();
    run++;
    busy = false;
    controller = null;
    notice =
      "Anfrage beendet. Ihre Formulareingaben bleiben erhalten. Bereits begonnene Verarbeitung kann Kosten verursachen.";
  }
  async function prepareFollowup(text: string) {
    const next = followup.trim() ? followup.trim() + "\n\n" + text : text;
    if (next.length > 4000) {
      error =
        "Die Ergänzung wird zu lang. Kürzen Sie Ihre Angaben vor dem nächsten Prüfen.";
      return;
    }
    followup = next;
    await tick();
    document.getElementById(uid + "-followup")?.focus();
  }
  onDestroy(() => {
    run++;
    controller?.abort();
  });
</script>

<details class="draft-review" bind:open>
  <summary
    ><Icon name="spark" size={17} /><span>Entwurf mit KI prüfen</span><span
      class="optional">Optional</span
    ><Icon name="down" size={14} /></summary
  >
  {#if open}<div class="review-body">
      <p>
        Die KI prüft Ihre aktuellen Eingaben und formuliert Rückfragen. Sie
        speichern den Entwurf anschließend selbst.
      </p>
      <details class="shared-context">
        <summary>Diese Angaben werden übermittelt</summary>
        <p>
          {sharedLabels.length
            ? sharedLabels.join(" · ")
            : "Noch keine Texteingaben."}{lines.length
            ? ` · ${Math.min(lines.length, 20)} von ${lines.length} Positionen`
            : ""}. Außerdem: welche Grundangaben ausgefüllt sind. Interne
          Einzelkosten und andere Akten werden nicht übermittelt.
        </p>
      </details>
      {#if !available}<p class="review-unavailable">
          {integration?.message ??
            "Die KI-Verbindung ist noch nicht eingerichtet. Sie können das Formular regulär ausfüllen und speichern."}
        </p>{/if}
      {#if stale}<p class="review-stale" role="status">
          Ihre Eingaben haben sich seit dieser Prüfung geändert. Prüfen Sie den
          aktuellen Entwurf erneut.
        </p>{/if}
      {#if answer}<div
          class="review-answer"
          aria-label="KI-Hinweise zum Entwurf"
        >
          {#key reviewed + answer}<AssistantReply
              text={answer}
              {assumptions}
              {missingInputs}
              {skillsUsed}
              disabled={busy}
              onfollowup={prepareFollowup}
            />{/key}
        </div>
        <label class="followup-label" for={uid + "-followup"}
          >Ergänzung für die nächste Prüfung</label
        ><textarea
          id={uid + "-followup"}
          class="field-control"
          maxlength="4000"
          rows="3"
          bind:value={followup}
          disabled={busy}
          placeholder="Rückfragen beantworten oder Hinweise korrigieren"
        ></textarea>
        <p>
          Diese Ergänzung wird mit den aktuellen Formularwerten geprüft. Sie
          ändert keine Felder automatisch.
        </p>{/if}
      {#if notice}<p role="status">{notice}</p>{/if}
      {#if error}<p class="review-error" role="alert">{error}</p>{/if}
      {#if busy}<p role="status">
          KI prüft den übermittelten Formularstand …
        </p>{/if}
      <div class="review-actions">
        <span>Erst dieser Klick startet die KI-Anfrage.</span>{#if busy}<button
            class="btn small"
            type="button"
            onclick={stop}>Anfrage abbrechen</button
          >{:else}<button
            class="btn small"
            type="button"
            disabled={!available}
            onclick={review}
            ><Icon name="spark" size={15} />{answer
              ? "Aktuelle Eingaben prüfen"
              : "Eingaben prüfen"}</button
          >{/if}
      </div>
    </div>{/if}
</details>

<style>
  .draft-review {
    margin-top: 24px;
    border: 1px solid var(--line);
    border-radius: 13px;
    background: var(--paper);
    overflow: clip;
  }
  .draft-review > summary {
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 52px;
    padding: 13px 16px;
    font-size: 13px;
    font-weight: 500;
    color: var(--forest);
    cursor: pointer;
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  .draft-review > summary::marker {
    content: "";
  }
  .draft-review > summary :global(svg:last-child) {
    margin-left: 3px;
    transition: transform 0.18s;
  }
  .draft-review[open] > summary :global(svg:last-child) {
    transform: rotate(180deg);
  }
  .optional {
    margin-left: auto;
    font-size: 11px;
    font-weight: 400;
    color: var(--muted);
  }
  .review-body {
    padding: 0 16px 16px;
  }
  .review-body p {
    font-size: 12px;
    line-height: 1.7;
    color: var(--muted);
  }
  .shared-context {
    margin: 13px 0;
  }
  .shared-context summary {
    font-size: 12px;
    line-height: 1.6;
    min-height: 32px;
    cursor: pointer;
  }
  .shared-context p {
    margin-top: 6px;
  }
  .review-answer {
    padding: 15px;
    margin: 12px 0;
    border-radius: 10px;
    background: var(--wash);
    color: var(--ink);
    font-size: 13px;
    line-height: 1.8;
    overflow-wrap: anywhere;
  }
  .followup-label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    margin: 14px 0 7px;
  }
  .review-body textarea {
    min-height: 86px;
    font: inherit;
    font-size: 14px;
    line-height: 1.6;
  }
  .review-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 14px;
  }
  .review-actions > span {
    font-size: 11px;
    color: var(--muted);
  }
  .review-body .review-error {
    color: var(--danger);
  }
  .review-body .review-stale {
    color: var(--warning);
    background: var(--warning-wash);
    border-radius: 8px;
    padding: 10px;
  }
  @media (max-width: 600px) {
    .review-actions {
      flex-wrap: wrap;
    }
    .review-actions .btn {
      width: 100%;
      min-height: 48px;
    }
    .draft-review > summary {
      min-height: 52px;
    }
    .review-body textarea {
      font-size: 16px;
    }
  }
</style>
