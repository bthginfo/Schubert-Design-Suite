<script lang="ts">
  import type { Action, AppData, Row } from "#lib/client/types.ts";
  import Icon from "./Icon.svelte";
  /** Quote lifecycle at a glance: where the quote stands and the one step that comes next. */
  let { data, actions, busy = false, onaction }: { data: AppData; actions: Action[]; busy?: boolean; onaction: (action: Action) => void } = $props();
  const record = $derived(data.detail || {});
  const steps = [
    { status: "draft", label: "Entwurf" },
    { status: "under_review", label: "In Prüfung" },
    { status: "approved", label: "Freigegeben" },
    { status: "published", label: "Veröffentlicht" },
    { status: "accepted", label: "Angenommen" },
  ];
  const plan: Record<string, { action: string; title: string; detail: string }> = {
    draft: { action: "sales.quote.review", title: "Zur Prüfung geben", detail: "Positionen, Preise und Gültigkeit prüfen. Danach bleibt der Entwurf bis zur Freigabe unverändert." },
    under_review: { action: "sales.quote.approve", title: "Freigeben", detail: "Inhalt und Preise bestätigen. Danach kann die Kundenversion veröffentlicht werden." },
    approved: { action: "sales.quote.publish", title: "Version veröffentlichen", detail: "Erzeugt die unveränderliche Kundenversion und das Angebots-PDF." },
    published: { action: "sales.quote.accept", title: "Annahme dokumentieren", detail: "Sobald der Kunde zusagt: annehmende Person, Erklärung und Nachweis erfassen. Der Auftrag wird dabei automatisch angelegt." },
    rejected: { action: "sales.quote.revise", title: "Angebot abgelehnt", detail: "Für ein geändertes Angebot eine neue Version beginnen." },
    expired: { action: "sales.quote.revise", title: "Angebot abgelaufen", detail: "Die Gültigkeit ist vorbei. Für eine erneute Zusage eine neue Version mit aktueller Gültigkeit erstellen." },
    superseded: { action: "", title: "Durch eine neue Version ersetzt", detail: "Diese Fassung bleibt unverändert im Verlauf erhalten." },
  };
  const closed = $derived(["rejected", "expired", "superseded"].includes(record.status));
  const accepted = $derived(record.status === "accepted");
  const position = $derived(closed ? 3 : Math.max(0, steps.findIndex((step) => step.status === record.status)));
  const step = $derived(plan[record.status]);
  const action = $derived(step?.action ? actions.find((item) => item.name === step.action) : undefined);
  const order: Row | null = $derived(
    record.order_id ? ((data.related?.orders || []).find((item) => item.id === record.order_id) ?? { id: record.order_id }) : null,
  );
  const canOpenOrder = $derived((data.navigation || []).some((item: { slug: string }) => item.slug === "orders"));
</script>

<section class="panel quote-progress" aria-labelledby="quote-progress-heading">
  <ol class="quote-steps" aria-label="Ablauf vom Angebot zum Auftrag">
    {#each steps as item, index}
      {@const done = index < position || (accepted && index === position)}
      <li class:done class:current={index === position} aria-current={index === position ? "step" : undefined}>
        <span class="quote-step-marker" aria-hidden="true">{#if done}<Icon name="check" size={13} />{:else}{index + 1}{/if}</span>
        <span class="quote-step-label">{item.label}<span class="sr-only">{done ? " · erledigt" : index === position ? " · aktueller Stand" : " · folgt"}</span></span>
      </li>
    {/each}
  </ol>
  <div class="quote-next">
    {#if accepted}
      <div>
        <h2 id="quote-progress-heading">{order?.number ? `Auftrag ${order.number} angelegt` : "Angebot angenommen · Auftrag angelegt"}</h2>
        <p>Die Annahme ist mit der genauen Angebotsversion gespeichert. Nächster Schritt im Auftrag: Auftrag bestätigen und dem Kunden die Auftragsbestätigung zusenden.</p>
      </div>
      {#if order && canOpenOrder}<a class="btn primary" href={`/orders/${order.id}`}>Zum Auftrag<Icon name="arrow" size={16} /></a>{/if}
    {:else if step}
      <div>
        <h2 id="quote-progress-heading">{#if closed}{step.title}{:else}<span class="quote-next-kicker">Nächster Schritt:</span> {step.title}{/if}</h2>
        <p>{step.detail}</p>
        {#if step.action && !action && !closed}<p class="quote-next-owner"><Icon name="lock" size={14} />Diesen Schritt führt eine dafür berechtigte Person aus.</p>{/if}
      </div>
      {#if action}<button class="btn primary" disabled={busy} onclick={() => onaction(action)}>{closed ? action.label : step.title}<Icon name="arrow" size={16} /></button>{/if}
    {/if}
  </div>
</section>

<style>
  .quote-progress { padding: 1.1rem 1.3rem 1.2rem; margin-bottom: 1.1rem; }
  .quote-steps { list-style: none; margin: 0 0 1rem; padding: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .25rem; counter-reset: none; }
  .quote-steps li { position: relative; display: flex; flex-direction: column; align-items: center; gap: .35rem; text-align: center; color: var(--muted); font-size: .8rem; min-width: 0; }
  .quote-steps li + li::before { content: ""; position: absolute; top: 13px; right: calc(50% + 17px); width: calc(100% - 30px); height: 2px; background: var(--line); }
  .quote-steps li.done + li::before, .quote-steps li.done + li.current::before { background: var(--forest); }
  .quote-step-marker { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--line); background: var(--paper); font-weight: 600; font-size: .78rem; position: relative; z-index: 1; }
  .quote-steps li.done .quote-step-marker { border-color: var(--forest); background: var(--forest); color: var(--paper); }
  .quote-steps li.current .quote-step-marker { border-color: var(--forest); color: var(--forest); box-shadow: 0 0 0 4px var(--success-wash); }
  .quote-steps li.current.done .quote-step-marker { color: var(--paper); }
  .quote-steps li.current { color: var(--ink); font-weight: 600; }
  .quote-step-label { overflow-wrap: anywhere; line-height: 1.25; }
  .quote-next { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-top: .9rem; border-top: 1px solid var(--line-soft, var(--line)); }
  .quote-next > div { min-width: 0; }
  .quote-next h2 { font-size: 1.15rem; margin: 0 0 .3rem; overflow-wrap: anywhere; }
  .quote-next-kicker { color: var(--muted); font-weight: 500; }
  .quote-next p { color: var(--muted); overflow-wrap: anywhere; }
  .quote-next-owner { display: flex; align-items: center; gap: .4rem; margin-top: .45rem; font-size: .88rem; }
  .quote-next .btn { min-height: 44px; flex-shrink: 0; }
  @media (max-width: 560px) {
    .quote-progress { padding: 1rem; }
    .quote-steps li:not(.current) .quote-step-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    .quote-next { flex-direction: column; align-items: stretch; }
  }
</style>
