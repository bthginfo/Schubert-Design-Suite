<script lang="ts">
  import { refreshAll } from "$app/navigation";
  import type { AppData } from "#lib/client/types.ts";
  import { display, permitted } from "#lib/client/api.ts";
  import Icon from "./Icon.svelte";
  import EmailOutbox from "./EmailOutbox.svelte";
  /** The published customer version: its generated PDF and the existing reviewed mail path for that exact file. */
  let { data }: { data: AppData } = $props();
  const record = $derived(data.detail || {});
  const output = $derived(data.summary?.quoteOutput as
    | { versionId: string; revision: number; validUntil?: string; document: { id: string; name: string; versionId: string } | null; job: { id: string; status: string } | null; documentsReadable: boolean }
    | null
    | undefined);
  const pdfHref = $derived(output?.document ? `/api/v1/documents/${output.document.id}/download?version=${output.document.versionId}&inline=1` : "");
  const jobState = $derived(output?.job?.status ?? "");
  const working = $derived(["pending", "running", "retry"].includes(jobState));
  const failed = $derived(["failed", "unavailable", "outcome_unknown"].includes(jobState));
  const canMail = $derived(permitted(data, "sales") && !!record.customer_id);
  let mailOpen = $state(false);
  let refreshing = $state(false);
  // The reviewed mail composer files the message in the customer's correspondence; attachments are limited to this quote's PDFs.
  const mailData = $derived({ ...data, module: { ...data.module!, slug: "customers" }, detail: { ...record, id: record.customer_id } } as AppData);
  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    await refreshAll().catch(() => {});
    refreshing = false;
  }
</script>

{#if output}
  <section class="panel quote-output" aria-labelledby="quote-output-heading">
    <header class="panel-header">
      <div>
        <h2 id="quote-output-heading">Angebotsdokument</h2>
        <p class="small muted">Version {output.revision}{output.validUntil ? " · gültig bis " + display(output.validUntil, "date") : ""}</p>
      </div>
      <Icon name="file" size={18} />
    </header>
    <div class="panel-body">
      {#if output.document}
        <p class="field-help">Das PDF dieser unveränderlichen Kundenversion ist erstellt. Ansehen, drucken oder geprüft per E-Mail senden.</p>
      {:else if !output.documentsReadable}
        <p class="field-help">Für das Ansehen des PDFs benötigen Sie Zugriff auf Dokumente.</p>
      {:else if working}
        <div class="notice info" role="status"><Icon name="refresh" size={16} /><div>Das Angebots-PDF wird im Hintergrund erstellt. Aktualisieren Sie den Stand in einem Moment.</div></div>
      {:else if failed}
        <div class="notice warning" role="status">
          <Icon name="alert" size={16} />
          <div>
            <strong>Das Angebots-PDF ist nicht verfügbar.</strong>
            <p class="small">Die Erstellung oder Ablage im privaten Dateispeicher ist fehlgeschlagen. Die veröffentlichte Version bleibt unverändert.{#if permitted(data, "system")} <a class="text-link" href={`/jobs/${output.job?.id}`}>Verarbeitung prüfen und erneut ausführen</a>{:else} Bitte die technische Administration informieren; dort kann die Verarbeitung erneut gestartet werden.{/if}</p>
          </div>
        </div>
      {:else}
        <p class="field-help">Für diese Version liegt noch kein PDF vor.</p>
      {/if}
      <div class="inline-actions mt">
        {#if pdfHref}<a class="btn primary" href={pdfHref} target="_blank" rel="noreferrer" data-sveltekit-reload><Icon name="file" size={16} />PDF ansehen</a>
        {:else}<button class="btn" type="button" disabled title="Das PDF ist noch nicht verfügbar."><Icon name="file" size={16} />PDF ansehen</button>{/if}
        {#if canMail}<button class="btn" type="button" aria-expanded={mailOpen} aria-controls="quote-mail" onclick={() => (mailOpen = !mailOpen)}><Icon name="mail" size={16} />Per E-Mail senden</button>{/if}
        {#if working}<button class="btn small" type="button" disabled={refreshing} onclick={refresh}><Icon name="refresh" size={15} />Stand aktualisieren</button>{/if}
      </div>
      {#if canMail && mailOpen}
        <div class="quote-mail mt" id="quote-mail">
          {#if !output.document}<p class="field-help mb">Ohne verfügbares PDF können Sie die Nachricht vorbereiten; das Angebot lässt sich erst nach der Erstellung als Anlage auswählen.</p>{/if}
          <EmailOutbox data={mailData} />
        </div>
      {/if}
    </div>
  </section>
{/if}

<style>
  .quote-output .panel-header p { margin-top: .2rem; }
  .quote-mail { border-top: 1px solid var(--line-soft, var(--line)); padding-top: 1rem; }
</style>
