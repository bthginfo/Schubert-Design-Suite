<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import { manufacturerLookupLabels, type ManufacturerLookupResult } from "@schubert/contracts";
  import { request } from "#lib/client/api.ts";
  import Icon from "./Icon.svelte";

  let {
    id,
    initialQuery = "",
    showHeading = true,
    canManageAssets = false,
  }: {
    id: string;
    initialQuery?: string;
    showHeading?: boolean;
    canManageAssets?: boolean;
  } = $props();

  let query = $state(untrack(() => initialQuery));
  let result = $state<ManufacturerLookupResult | null>(null);
  let busy = $state(false);
  let error = $state("");
  let controller: AbortController | undefined;

  function resetResult() {
    controller?.abort();
    controller = undefined;
    busy = false;
    error = "";
    result = null;
  }

  async function search() {
    const term = query.trim();
    if (busy || term.length < 2) return;
    resetResult();
    const run = new AbortController();
    controller = run;
    busy = true;
    try {
      const response: ManufacturerLookupResult = await request("/api/v1/planning/manufacturer-products/search", { query: term }, "POST", run.signal);
      if (controller === run) result = response;
    } catch (cause) {
      if (controller === run) error = cause instanceof Error ? cause.message : "Die Suche konnte nicht abgeschlossen werden.";
    } finally {
      if (controller === run) {
        controller = undefined;
        busy = false;
      }
    }
  }

  onDestroy(() => {
    controller?.abort();
    controller = undefined;
  });
</script>

<div class="manufacturer-lookup" role="search" aria-label="Herstellerartikel suchen">
  {#if showHeading}<h3>Beim Hersteller suchen</h3>{/if}
  <label for={id + "-query"}>Produktname, Artikelnummer oder Produktlink</label>
  <div class="search-line">
    <input
      id={id + "-query"}
      type="search"
      bind:value={query}
      oninput={resetResult}
      onkeydown={(event) => {
        if (event.key === "Enter" && !event.isComposing) {
          event.preventDefault();
          event.stopPropagation();
          void search();
        }
      }}
      maxlength="300"
      placeholder="z. B. Duravit 233555"
      aria-describedby={id + "-hint"}
      autocomplete="off"
    />
    <button class="btn primary" type="button" disabled={busy || query.trim().length < 2} onclick={search}>
      <Icon name="search" size={17} /> Suchen
    </button>
  </div>
  <p class="hint" id={id + "-hint"}>Ein Herstellername grenzt die Suche ein. Für Geberit können Sie einen Produktlink einsetzen.</p>

  {#if busy}
    <p class="search-status" role="status">Herstellerkataloge werden geprüft …</p>
  {:else if error}
    <p class="search-status error" role="alert">{error}</p>
  {:else if result}
    <p class="search-status" role="status">
      {#if result.items.length}{result.items.length} Treffer
        {result.hasMore ? " · Weitere Treffer im Herstellerkatalog." : ""}
      {:else if result.sources.some(source => source.status === "searched")}Keine passenden Artikel gefunden.
      {:else}Die Quellen unten zeigen, wie Sie weitersuchen können.
      {/if}
    </p>
    {#if result.items.length}
      <ul class="catalog-results" aria-label="Gefundene Herstellerartikel">
        {#each result.items as item (item.sourceUrl + "#" + item.article)}
          <li>
            <div class="result-body">
              <p class="item-number">{item.manufacturer} · {item.articleKind === "model" ? "Modell" : "Art.-Nr."} {item.article}</p>
              <h4>{item.name}</h4>
              {#if item.variant}<p class="variant">{item.variant}</p>{/if}
              {#if item.dimensions.length}
                <dl class="dimensions">
                  {#each item.dimensions as dimension}
                    <div><dt>{dimension.label}</dt><dd>{dimension.value}</dd></div>
                  {/each}
                </dl>
              {/if}
            </div>
            <div class="result-actions">
              <a class="source-link" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Zum Produkt<Icon name="arrow" size={14} /></a>
              {#if item.planningDataUrl}
                <a href={item.planningDataUrl} target="_blank" rel="noopener noreferrer">CAD &amp; Planungsdaten<Icon name="arrow" size={14} /></a>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
      {#if canManageAssets}
        <a class="library-link" href="/manufacturer-assets" target="_blank" rel="noopener">Originaldatei in die Herstellerbibliothek aufnehmen<Icon name="arrow" size={14} /></a>
      {/if}
    {/if}
    {#each result.sources.filter(source => source.status !== "searched" || !result?.items.length || result.hasMore) as source (source.provider)}
      <div class="source-status">
        <p>
          <strong>{manufacturerLookupLabels[source.provider]}</strong>
          {#if source.status === "unavailable"} · Abruf momentan nicht verfügbar.
          {:else if source.status === "needs_detail" && source.provider === "geberit"} · Produktlink aus dem Herstellerkatalog einsetzen.
          {:else if source.status === "needs_detail"} · Modellname zur Nummer ergänzen oder einen Produktlink einsetzen.
          {/if}
        </p>
        <a href={source.url} target="_blank" rel="noopener noreferrer">Herstellerkatalog öffnen<Icon name="arrow" size={14} /></a>
      </div>
    {/each}
  {/if}
</div>

<style>
  .manufacturer-lookup { min-width: 0; }
  h3 { margin: 0 0 14px; font-size: 18px; letter-spacing: -.025em; }
  label { display: block; margin-bottom: 6px; color: var(--ink); font-size: 13px; font-weight: 550; }
  .search-line { display: flex; flex-wrap: wrap; gap: 8px; }
  input {
    flex: 1 1 145px; min-width: 0; width: 100%; padding: 9px 11px; min-height: 44px;
    border: 1px solid var(--line); border-radius: 10px; background: var(--input-surface);
    color: var(--ink); font: inherit;
  }
  .search-line button { min-height: 44px; padding-inline: 12px; }
  .search-line :global(svg), a :global(svg) { flex: none; }
  .hint, .search-status { font-size: 13px; line-height: 1.55; margin: 8px 0 0; color: var(--muted); }
  .search-status { margin-top: 16px; color: var(--ink); }
  .search-status.error { color: var(--danger); }
  .catalog-results { list-style: none; display: grid; gap: 8px; margin: 10px 0 0; padding: 0; }
  .catalog-results li { border: 1px solid var(--line); border-radius: 12px; background: var(--paper); overflow: hidden; }
  .result-body { padding: 12px 14px 10px; overflow-wrap: anywhere; }
  .item-number, .variant { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.55; }
  .variant { margin-top: 4px; }
  h4 { margin: 3px 0 0; color: var(--ink); font-size: 14px; line-height: 1.45; font-weight: 600; }
  .dimensions { display: flex; flex-wrap: wrap; gap: 6px 12px; margin: 9px 0 0; font-size: 12px; }
  .dimensions div { display: flex; gap: 5px; flex-wrap: wrap; align-items: baseline; }
  dt { color: var(--muted); }
  dd { color: var(--ink); font-variant-numeric: tabular-nums; margin: 0; font-weight: 600; }
  .result-actions { display: flex; flex-wrap: wrap; gap: 0 16px; border-top: 1px solid var(--line); padding: 0 14px; }
  a { display: inline-flex; align-items: center; gap: 5px; min-height: 44px; color: var(--forest); font-size: 12px; line-height: 1.4; }
  a:hover { text-decoration: underline; text-underline-offset: 3px; }
  .source-link { font-weight: 600; }
  .source-status { margin-top: 10px; border-top: 1px solid var(--line); padding-top: 10px; }
  .source-status p { margin: 0; font-size: 12px; line-height: 1.55; color: var(--muted); }
  .source-status strong { color: var(--ink); }
  .library-link { margin-top: 4px; }
  @media (max-width: 760px) { input { font-size: 16px; } }
</style>
