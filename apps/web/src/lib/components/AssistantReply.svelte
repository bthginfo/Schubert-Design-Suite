<script lang="ts">
  import type { AssistantSkillUsage } from "@schubert/contracts";
  let {
    text,
    assumptions = [],
    missingInputs = [],
    skillsUsed = [],
    disabled = false,
    onfollowup,
  }: {
    text: string;
    assumptions?: string[];
    missingInputs?: string[];
    skillsUsed?: AssistantSkillUsage[];
    disabled?: boolean;
    onfollowup: (text: string) => void;
  } = $props();
  const uid = $props.id();
  let answers: Record<number, string> = $state({});
  const paragraphs = $derived(text.split(/\n\s*\n/).filter(Boolean));
  const questions = $derived([...new Set(missingInputs)].slice(0, 20));
  const hasAnswers = $derived(
    Object.values(answers).some((value) => value.trim()),
  );
  function prepare() {
    const reply = questions
      .flatMap((question, index) =>
        answers[index]?.trim() ? [question + "\n" + answers[index].trim()] : [],
      )
      .join("\n\n");
    if (reply) onfollowup("Zu Ihren Rückfragen:\n\n" + reply);
  }
</script>

<div class="assistant-reply">
  <div class="reply-summary">
    {#each paragraphs as paragraph}<p>{paragraph}</p>{/each}
  </div>
  {#if questions.length}<section
      class="clarifications"
      aria-label="Offene Angaben beantworten"
    >
      <h4>Noch zu klären</h4>
      <p class="reply-hint">
        Beantworten Sie, was Sie schon wissen. Vor dem Senden können Sie die
        Nachricht bearbeiten.
      </p>
      {#each questions as question, index}<div class="clarification">
          <label for={uid + "-question-" + index}>{question}</label><textarea
            id={uid + "-question-" + index}
            rows="2"
            maxlength="1500"
            bind:value={answers[index]}
            {disabled}
            placeholder="Ihre Angabe – Maße bitte mit Einheit"
          ></textarea><button
            type="button"
            class="text-link"
            {disabled}
            onclick={() =>
              (answers[index] =
                "Noch nicht bekannt. Bitte als offen behandeln.")}
            >Noch nicht bekannt</button
          >
        </div>{/each}<button
        type="button"
        class="btn small"
        disabled={disabled || !hasAnswers}
        onclick={prepare}>Antworten in Nachricht übernehmen</button
      >
    </section>{/if}
  {#if assumptions.length}<details class="reply-assumptions">
      <summary>Annahmen der KI ({assumptions.length})</summary>
      <p class="reply-hint">
        Diese Angaben sind nicht bestätigt. Prüfen oder korrigieren Sie sie.
      </p>
      <ul>
        {#each assumptions as assumption}<li>
            <span>{assumption}</span><button
              type="button"
              class="text-link"
              {disabled}
              aria-label={"Annahme korrigieren: " + assumption}
              onclick={() =>
                onfollowup(
                  "Die Annahme „" + assumption + "“ bitte korrigieren:\n",
                )}>Korrigieren</button
            >
          </li>{/each}
      </ul>
    </details>{/if}
  {#if skillsUsed.length}<details class="reply-skills">
      <summary>Verwendete Fachhilfe</summary>
      <ul>
        {#each skillsUsed as skill (skill.id)}<li>
            <span>{skill.label}</span><small
              >Deutschland · Version {skill.version}</small
            >
          </li>{/each}
      </ul>
      <p class="reply-hint">
        Die KI hat diese Arbeitshilfe für Ihre Anfrage ausgewählt. Grundlage
        bleiben der übermittelte Stand und Ihre ausgewählten Unterlagen.
      </p>
    </details>{/if}
</div>

<style>
  .assistant-reply {
    white-space: normal;
  }
  .reply-summary p {
    margin: 0 0 12px;
    font-size: 14px;
    line-height: 1.8;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .reply-summary p:last-child {
    margin-bottom: 0;
  }
  .clarifications {
    margin-top: 16px;
    padding: 14px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--paper);
  }
  h4 {
    font-size: 13px;
    margin: 0 0 6px;
    font-weight: 600;
  }
  .reply-hint {
    font-size: 12px;
    line-height: 1.7;
    color: var(--muted);
    margin: 0 0 12px;
  }
  .clarification {
    margin: 14px 0;
  }
  .clarification label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.6;
    margin-bottom: 7px;
  }
  .clarification textarea {
    width: 100%;
    min-height: 64px;
    padding: 9px 11px;
    background: var(--input-surface);
    border: 1px solid var(--line);
    border-radius: 9px;
    font: inherit;
    font-size: 13px;
    line-height: 1.6;
    color: var(--ink);
    resize: vertical;
  }
  .clarification .text-link {
    min-height: 36px;
    font-size: 11px;
    margin-top: 3px;
  }
  .reply-assumptions {
    margin-top: 14px;
    font-size: 12px;
    line-height: 1.7;
  }
  .reply-skills {
    margin-top: 10px;
    font-size: 12px;
    line-height: 1.7;
    color: var(--muted);
  }
  .reply-skills summary {
    min-height: 44px;
    display: list-item;
    padding: 10px 0;
    cursor: pointer;
  }
  .reply-skills ul {
    padding-left: 18px;
    margin: 0 0 8px;
  }
  .reply-skills small {
    display: block;
    font-size: 11px;
  }
  .reply-assumptions summary {
    min-height: 40px;
    cursor: pointer;
    color: var(--warning);
  }
  .reply-assumptions ul {
    padding-left: 18px;
    margin: 0 0 12px;
  }
  .reply-assumptions li {
    margin-bottom: 6px;
  }
  .reply-assumptions li > span {
    display: block;
  }
  .reply-assumptions li .text-link {
    min-height: 44px;
    font-size: 12px;
  }
  @media (max-width: 760px) {
    .clarification textarea {
      font-size: 16px;
    }
    .clarification .text-link {
      min-height: 44px;
    }
    .clarifications > .btn {
      min-height: 44px;
      white-space: normal;
      width: 100%;
    }
  }
</style>
