<script lang="ts">
  import { onDestroy, onMount, untrack } from "svelte";
  import {
    manufacturerLookupLabels, type ManufacturerCatalogEntry, type ManufacturerCatalogResult, type ManufacturerCatalogSource,
  } from "@schubert/contracts";
  import { command, request } from "#lib/client/api.ts";
  import { searchableSelect } from "#lib/client/searchable-select.ts";
  import Icon from "./Icon.svelte";

  let {
    id,
    initialQuery = "",
    showHeading = true,
    canManageAssets = false,
    canSaveCatalog = false,
  }: {
    id: string;
    initialQuery?: string;
    showHeading?: boolean;
    canManageAssets?: boolean;
    canSaveCatalog?: boolean;
  } = $props();

  let query = $state(untrack(() => initialQuery));
  let mode = $state<"catalog" | "online">("catalog");
  let providerId = $state("");
  let result = $state<ManufacturerCatalogResult | null>(null);
  let providers = $state<ManufacturerCatalogSource[]>([]);
  let busy = $state(false);
  let error = $state("");
  let saving = $state("");
  let saveError = $state("");
  let saved = $state<Record<string, string>>({});
  let controller: AbortController | undefined;
  const currentProvider = $derived(providers.find(provider => provider.id === (providerId || result?.searchedProviderId)));
  const sourcesWithEntries = $derived(providers.filter(provider => provider.count > 0).length);
  const formatDate = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });
  const typeLabels = { article: "Art.-Nr.", model: "Modell", product: "Produktseite", series: "Serie" } as const;
  const coverageLabels = {
    articles: "Artikelstammdaten",
    index: "Produkt- und Serienverzeichnis",
    partner: "Stammdaten oder CAD über Fachzugang",
    website: "Offizielle Herstellerseite",
    unresolved: "Identität noch zu bestätigen",
  } as const;

  function resetResult() {
    controller?.abort();
    controller = undefined;
    busy = false;
    error = "";
    result = null;
  }

  async function search(append = false) {
    if (busy || (mode === "online" && query.trim().length < 2)) return;
    const offset = append ? result?.nextOffset : 0;
    if (offset == null) return;
    if (!append) resetResult();
    const run = new AbortController();
    controller = run;
    busy = true;
    try {
      const endpoint = mode === "online" ? "online" : "search";
      const response: ManufacturerCatalogResult = await request(
        "/api/v1/planning/manufacturer-catalog/" + endpoint,
        { query: query.trim(), offset, ...(providerId ? { providerId } : {}) },
        "POST", run.signal,
      );
      if (controller !== run) return;
      if (mode === "catalog" || !providers.length) providers = response.providers;
      result = append && result
        ? { ...response, items: [...new Map([...result.items, ...response.items].map(item => [item.id, item])).values()] }
        : response;
    } catch (cause) {
      if (controller === run) error = cause instanceof Error ? cause.message : "Die Suche konnte nicht abgeschlossen werden.";
    } finally {
      if (controller === run) {
        controller = undefined;
        busy = false;
      }
    }
  }

  function selectMode(next: "catalog" | "online") {
    if (next === mode) return;
    resetResult();
    mode = next;
    if (mode === "catalog") void search();
  }

  function chooseProvider(id: string) {
    providerId = id;
    resetResult();
    if (mode === "catalog") void search();
  }

  async function saveArticle(item: ManufacturerCatalogEntry) {
    const digest = providers.find(provider => provider.id === item.providerId)?.digest;
    if (!digest || saving) return;
    saving = item.id;
    saveError = "";
    try {
      const result = await command("catalog.manufacturer_reference.adopt", undefined, {
        providerId: item.providerId, referenceId: item.id, digest,
      });
      saved = { ...saved, [item.id]: result.productId };
    } catch (cause) {
      saveError = cause instanceof Error ? cause.message : "Der Artikel konnte nicht gespeichert werden.";
    } finally {
      saving = "";
    }
  }

  onMount(() => { void search(); });
  onDestroy(() => {
    controller?.abort();
    controller = undefined;
  });
</script>

<div class="manufacturer-lookup" role="search" aria-label="Herstellerartikel suchen">
  {#if showHeading}<h3>Herstellerkatalog</h3>{/if}
  <div class="catalog-modes" role="group" aria-label="Suchquelle">
    <button type="button" aria-pressed={mode === "catalog"} onclick={() => selectMode("catalog")}><Icon name="box" size={16}/>Im Katalog</button>
    <button type="button" aria-pressed={mode === "online"} onclick={() => selectMode("online")}><Icon name="search" size={16}/>Beim Hersteller suchen</button>
  </div>
  {#if providers.length}
    <label for={id + "-provider"}>Hersteller</label>
    <select
      id={id + "-provider"}
      use:searchableSelect={providerId}
      value={providerId}
      onchange={(event) => chooseProvider(event.currentTarget.value)}
    >
      <option value="">Alle Hersteller</option>
      {#each providers as provider (provider.id)}
        <option value={provider.id}>{provider.name}</option>
      {/each}
    </select>
  {/if}
  <label for={id + "-query"}>{mode === "catalog" ? "Produktname, Artikelnummer oder GTIN" : "Produktname, Artikelnummer oder Produktlink"}</label>
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
      placeholder={mode === "catalog" ? "z. B. KEUCO Stageline" : "z. B. Duravit 233555"}
      aria-describedby={id + "-hint"}
      autocomplete="off"
    />
    <button class="btn primary" type="button" disabled={busy || (mode === "online" && query.trim().length < 2)} onclick={() => search()}>
      <Icon name="search" size={17} /> Suchen
    </button>
  </div>
  <p class="hint" id={id + "-hint"}>
    {#if mode === "catalog"}Der Katalog enthält Artikel und verlinkte Serien. {result?.checkedAt ? "Abgleich vom " + formatDate.format(new Date(result.checkedAt)) + "." : ""}
    {:else}Wählen Sie den Hersteller oder nennen Sie ihn im Suchbegriff. Für Geberit können Sie einen Produktlink einsetzen.
    {/if}
  </p>
  {#if currentProvider?.website && (mode === "online" || currentProvider.coverage === "partner" || !currentProvider.count)}
    <a class="manufacturer-link" href={currentProvider.website} target="_blank" rel="noopener noreferrer">{currentProvider.name} öffnen<Icon name="arrow" size={14} /></a>
  {/if}

  {#if busy && !result}
    <p class="search-status" role="status">{mode === "catalog" ? "Katalog wird geladen …" : "Herstellerquelle wird geprüft …"}</p>
  {:else if error}
    <p class="search-status error" role="alert">{error}</p>
  {:else if result}
    <p class="search-status" role="status">
      {#if result.lookupNotice}{result.lookupNotice}
      {:else if result.total}{result.total.toLocaleString("de-DE")} Treffer
      {:else}Keine passenden Artikel oder Serien gefunden.
      {/if}
    </p>
    {#if result.siteSearch}
      <a class="manufacturer-link" href={result.siteSearch} target="_blank" rel="noopener noreferrer">Websuche auf der Hersteller-Domain<Icon name="arrow" size={14} /></a>
    {/if}
    {#if saveError}<p class="search-status error" role="alert">{saveError}</p>{/if}
    {#if result.items.length}
      <ul class="catalog-results" aria-label="Gefundene Herstellerartikel">
        {#each result.items as item (item.id)}
          <li>
            <div class="result-body">
              <p class="item-number">{item.manufacturer} · {typeLabels[item.articleKind]}{item.article ? " " + item.article : ""}{item.discontinued ? " · Auslaufartikel laut Hersteller" : ""}</p>
              <h4>{item.name}</h4>
              {#if item.variant}<p class="variant">{item.variant}</p>{/if}
              {#if item.gtin}<p class="variant">GTIN {item.gtin}</p>{/if}
              {#if item.dimensions.length}
                <dl class="dimensions">
                  {#each item.dimensions as dimension}
                    <div><dt>{dimension.label}</dt><dd>{dimension.value}</dd></div>
                  {/each}
                </dl>
              {/if}
            </div>
            <div class="result-actions">
              <a class="source-link" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{mode === "online" && item.articleKind === "article" ? "Zum Produkt" : "Quelle öffnen"}<Icon name="arrow" size={14} /></a>
              {#if item.planningDataUrl}
                <a href={item.planningDataUrl} target="_blank" rel="noopener noreferrer">CAD &amp; Planungsdaten<Icon name="arrow" size={14} /></a>
              {/if}
              {#if saved[item.id]}
                <a href={"/products/" + saved[item.id]} target="_blank" rel="noopener">Im Betriebskatalog<Icon name="arrow" size={14} /></a>
              {:else if canSaveCatalog && mode === "catalog" && item.articleKind === "article" && item.article}
                <button class="save-reference" type="button" onclick={() => saveArticle(item)} disabled={!!saving}>
                  {saving === item.id ? "Wird gespeichert …" : "In Betriebskatalog übernehmen"}
                </button>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
      {#if result.nextOffset !== null}
        <button class="btn small load-more" type="button" disabled={busy} onclick={() => search(true)}>{busy ? "Wird geladen …" : "Mehr Treffer laden"}</button>
      {/if}
      {#if canManageAssets}
        <a class="library-link" href="/manufacturer-assets" target="_blank" rel="noopener">Originaldatei in die Herstellerbibliothek aufnehmen<Icon name="arrow" size={14} /></a>
      {/if}
    {/if}
    {#each (result.lookupSources ?? []).filter(source => source.status !== "searched" || !result?.items.length) as source (source.provider)}
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

  {#if mode === "catalog" && providers.length}
    <details class="catalog-directory">
      <summary>Quellen und Abgleich · {sourcesWithEntries} mit Katalogdaten</summary>
      <ul>
        {#each providers as provider (provider.id)}
          <li>
            <strong>{provider.name}</strong>
            <span>{coverageLabels[provider.coverage]}{provider.count ? " · " + provider.count.toLocaleString("de-DE") + " Einträge" : ""}
              {provider.state === "unavailable" ? " · Abruf fehlgeschlagen" : ""}
              {provider.checkedAt ? " · Stand " + formatDate.format(new Date(provider.checkedAt)) : ""}</span>
            {#if provider.website}<a href={provider.website} target="_blank" rel="noopener noreferrer">Quelle öffnen<Icon name="arrow" size={14} /></a>{/if}
          </li>
        {/each}
      </ul>
    </details>
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

  .catalog-modes { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 14px; }
  .catalog-modes button { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 7px 11px; color: var(--muted); border-radius: 9px; border: 1px solid var(--line); font: inherit; font-size: 13px; }
  .catalog-modes button[aria-pressed=true] { color: var(--ink); background: var(--wash); font-weight: 600; }
  select { width: 100%; min-height: 44px; border: 1px solid var(--line); border-radius: 10px; background: var(--input-surface); color: var(--ink); padding: 8px 10px; margin-bottom: 12px; font: inherit; }
  .manufacturer-link { margin-top: 3px; }
  .save-reference { min-height: 44px; color: var(--forest); font: inherit; font-size: 12px; text-align: left; }
  .save-reference:hover { text-decoration: underline; }
  .load-more { min-height: 44px; margin-top: 10px; }
  .catalog-directory { margin-top: 14px; }
  .catalog-directory summary { padding: 10px 0; font-size: 13px; color: var(--ink); cursor: pointer; }
  .catalog-directory ul { list-style: none; padding: 0; margin: 0; }
  .catalog-directory li { display: grid; padding: 10px 0 0; border-top: 1px solid var(--line); font-size: 12px; gap: 3px; }
  .catalog-directory li span { color: var(--muted); }
</style>
