<script lang="ts">
  import { tick } from 'svelte';
  import { goto } from '$app/navigation';
  import type { AppData } from '#lib/client/types.ts';
  import { permitted, request } from '#lib/client/api.ts';
  import Icon from './Icon.svelte';

  type Destination = { label: string; href: string; icon: string; keywords?: string };
  let { data, areas }: { data: AppData; areas: Destination[] } = $props();
  let dialog: HTMLDialogElement;
  let trigger: HTMLButtonElement;
  let field: HTMLInputElement;
  let query = $state('');
  const documents = $derived(permitted(data, 'documents') || permitted(data, 'documents.read'));
  const common = $derived([
    ...(permitted(data, 'crm') ? [{ label: 'Kunde anlegen', href: '/customers?create=1', icon: 'plus', keywords: 'CRM Kontakt' }] : []),
    ...(permitted(data, 'sales') ? [{ label: 'Angebot anlegen', href: '/quotes?create=1', icon: 'plus', keywords: 'Preis Kostenvoranschlag' }] : []),
    ...(permitted(data, 'billing') ? [{ label: 'Rechnungsentwurf anlegen', href: '/invoices?create=1', icon: 'plus', keywords: 'Rechnung abrechnen' }] : []),
    ...(permitted(data, 'purchasing') ? [{ label: 'Bestellung anlegen', href: '/purchase-orders?create=1', icon: 'plus', keywords: 'Material einkaufen' }] : []),
    ...(permitted(data, 'dispatch') ? [{ label: 'Einsatz einteilen', href: '/dispatch?create=1', icon: 'calendar', keywords: 'Monteur Termin planen Dispo' }] : []),
    ...(permitted(data, 'time') ? [{ label: 'Arbeitszeit erfassen', href: '/time', icon: 'clock', keywords: 'Stunden nachtragen' }] : []),
  ]);
  const pages = $derived((data.navigation ?? []).map((item: { label: string; slug: string }) => ({ label: item.label, href: '/' + item.slug, icon: 'arrow' })));
  const normalize = (value: string) => value.toLocaleLowerCase('de').normalize('NFKD').replace(/\p{M}/gu, '').replaceAll('ß', 'ss');
  const tokens = $derived(normalize(query.trim()).split(/\s+/).filter(Boolean));
  const results = $derived.by(() => {
    const destinations: Destination[] = [...common, ...areas, ...pages, {label:'Hilfe & Einführung',href:'/help',icon:'help',keywords:'Rundgang Tour Anleitung'}];
    const matches = tokens.length
      ? destinations.filter(item => tokens.every(token => normalize(item.label + ' ' + (item.keywords ?? '')).includes(token)))
      : destinations;
    const exact = normalize(query.trim());
    if (exact) matches.sort((a, b) => Number(normalize(b.label) === exact) - Number(normalize(a.label) === exact));
    const unique = new Map<string, Destination>();
    for (const item of matches) if (!unique.has(item.href)) unique.set(item.href, item);
    return [...unique.values()].slice(0, tokens.length ? 24 : 6);
  });

  // Business records (customers, orders, quotes …) through the permission-checked reference search.
  type RecordHit = { id: string; name: string; href: string; kind: string; icon: string };
  const recordSources = $derived([
    { reference: 'customers', kind: 'Kunde', icon: 'user', permission: 'crm' },
    { reference: 'orders', kind: 'Auftrag', icon: 'layers', permission: 'orders' },
    { reference: 'quotes', kind: 'Angebot', icon: 'file', permission: 'sales' },
    { reference: 'invoices', kind: 'Rechnung', icon: 'file', permission: 'billing' },
    { reference: 'inquiries', kind: 'Anfrage', icon: 'pen', permission: 'crm' },
    { reference: 'suppliers', kind: 'Lieferant', icon: 'user', permission: 'purchasing' },
  ].filter(source => permitted(data, source.permission) || permitted(data, source.permission + '.read')));
  let records: RecordHit[] = $state([]);
  let searching = $state(false);
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let searchGeneration = 0;
  $effect(() => {
    const text = query.trim();
    clearTimeout(searchTimer);
    const current = ++searchGeneration;
    if (text.length < 2 || !recordSources.length) { records = []; searching = false; return; }
    searching = true;
    searchTimer = setTimeout(async () => {
      const groups = await Promise.all(recordSources.map(async source => {
        try {
          const result = await request(`/api/v1/lookups/${source.reference}?q=${encodeURIComponent(text)}`, undefined, 'GET');
          const items: { id: string; name: string }[] = Array.isArray(result) ? result : result?.items ?? result?.records ?? [];
          return items.slice(0, 5).map(item => ({ id: item.id, name: item.name, href: `/${source.reference}/${item.id}`, kind: source.kind, icon: source.icon }));
        } catch { return []; }
      }));
      if (current !== searchGeneration) return;
      records = groups.flat().slice(0, 15);
      searching = false;
    }, 250);
  });

  async function open() {
    if (dialog.open) return;
    query = '';
    dialog.showModal();
    await tick();
    field.focus({ preventScroll: true });
  }

  function shortcut(event: KeyboardEvent) {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k' ||
      document.querySelector('dialog[open], [aria-modal="true"]') || document.fullscreenElement) return;
    event.preventDefault();
    void open();
  }

  function moveFocus(event: KeyboardEvent) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const links = [...dialog.querySelectorAll<HTMLAnchorElement>('.workspace-search-results a')];
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (!links.length || (index < 0 && document.activeElement !== field)) return;
    event.preventDefault();
    const next = event.key === 'ArrowDown' ? index + 1 : index < 0 ? links.length - 1 : index - 1;
    (links[next] ?? field).focus();
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    const exactDestination = results.find(item => normalize(item.label) === normalize(query.trim()));
    const href = exactDestination?.href ?? records[0]?.href ?? results[0]?.href ?? (documents && query.trim() ? '/documents?q=' + encodeURIComponent(query.trim()) : '');
    if (!href) return;
    dialog.close();
    void goto(href).catch(() => { void open(); });
  }
</script>

<svelte:window onkeydown={shortcut}/>
<button type="button" class="workspace-search-trigger icon-button" aria-label="Suite durchsuchen"
  title="Suite durchsuchen" aria-haspopup="dialog" bind:this={trigger} onclick={open}>
  <Icon name="search" size={18}/><span>Suchen</span>
</button>

<dialog bind:this={dialog} class="workspace-search-dialog" aria-labelledby="workspace-search-title"
  onkeydown={moveFocus} onclose={() => trigger.focus({ preventScroll: true })}>
  <header>
    <h2 id="workspace-search-title">Suite durchsuchen</h2>
    <button type="button" class="icon-button" aria-label="Suche schließen" onclick={() => dialog.close()}><Icon name="close" size={19}/></button>
  </header>
  <form class="workspace-search-field" onsubmit={submit}>
    <Icon name="search" size={20}/>
    <label class="sr-only" for="workspace-query">Kunden, Vorgänge oder Bereiche suchen</label>
    <input id="workspace-query" type="search" bind:this={field} bind:value={query}
      placeholder={recordSources.length ? 'Kunde, Belegnummer, Bereich …' : documents ? 'Bereich, Aufgabe oder Dokument' : 'Bereich oder Aufgabe'} autocomplete="off" maxlength="160"/>
  </form>
  <div class="workspace-search-results">
    {#if records.length}
      <p class="result-label">Kunden und Vorgänge</p>
      <ul>
        {#each records as record (record.href)}
          <li><a href={record.href} onclick={() => dialog.close()}><Icon name={record.icon} size={17}/><span>{record.name}<small>{record.kind}</small></span><Icon name="chevron" size={15}/></a></li>
        {/each}
      </ul>
    {:else if searching}
      <p class="result-label" role="status">Kunden und Vorgänge werden gesucht …</p>
    {/if}
    {#if results.length}
      <p class="result-label">{tokens.length ? 'Bereiche und Aufgaben' : 'Direkt öffnen'}</p>
      <ul>
        {#each results as result (result.href)}
          <li><a href={result.href} onclick={() => dialog.close()}><Icon name={result.icon} size={17}/><span>{result.label}</span><Icon name="chevron" size={15}/></a></li>
        {/each}
      </ul>
    {:else if !records.length && !searching}
      <p class="no-results" role="status">Nichts gefunden. Kundenname, Belegnummer (z. B. AUF-2026-00060) oder einen Bereich eingeben.</p>
    {/if}
    {#if documents && query.trim()}
      <a class="document-search" href={'/documents?q=' + encodeURIComponent(query.trim())} onclick={() => dialog.close()}>
        <Icon name="file" size={17}/><span>„{query.trim()}“ in Dokumenten suchen</span><Icon name="chevron" size={15}/>
      </a>
    {/if}
  </div>
</dialog>

<style>
  .workspace-search-trigger {
    width: auto; min-height: 42px; padding-inline: 13px; gap: 8px;
    background: color-mix(in srgb, var(--paper) 46%, transparent);
    color: var(--muted); border-radius: 999px; white-space: nowrap;
    font-size: .85rem; font-weight: 500;
  }
  .workspace-search-trigger:hover { background: var(--paper); color: var(--ink); }
  .workspace-search-dialog {
    width: min(37rem, calc(100vw - 28px)); max-width: none; max-height: min(72dvh, 40rem); margin: min(13dvh, 105px) auto auto;
    padding: 0; border: 1px solid var(--glass-border); border-radius: 22px; background: var(--paper); color: var(--ink); box-shadow: var(--overlay-shadow);
  }
  header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px 4px 22px; }
  h2 { font-size: 1.2rem; font-weight: 650; }
  header .icon-button { min-width: 44px; min-height: 44px; border-radius: 50%; }
  .workspace-search-field {
    display: flex; align-items: center; gap: 10px; padding-inline: 13px; margin: 4px 18px 12px;
    border-radius: 13px; border: 1px solid var(--line); background: var(--input-surface); color: var(--muted);
  }
  .workspace-search-field:focus-within { outline: 2px solid var(--forest); outline-offset: 2px; }
  input { width: 100%; min-height: 46px; min-width: 0; outline: none; border: 0; box-shadow: none; background: transparent; color: var(--ink); font-size: 1rem; }
  .workspace-search-results { padding: 0 17px 16px; }
  .result-label, .no-results { color: var(--muted); padding: 8px 8px 5px; font-size: .85rem; }
  ul { margin: 0; padding: 0; list-style: none; }
  li + li { border-top: 1px solid var(--line-soft); }
  .workspace-search-results a { display: flex; align-items: center; gap: 12px; min-height: 47px; padding: 8px; border-radius: 9px; }
  .workspace-search-results a:hover, .workspace-search-results a:focus-visible { background: var(--wash); }
  a span { flex: 1; overflow-wrap: anywhere; }
  a span small { display: block; margin-top: 1px; color: var(--muted); font-size: .78rem; }
  a :global(svg) { flex: none; color: var(--muted); }
  .document-search { margin-top: 8px; border-top: 1px solid var(--line-soft); color: var(--forest); }
  @media (max-width: 760px) {
    .workspace-search-trigger { width: 44px; min-height: 44px; padding: 0; }
    .workspace-search-trigger span { display: none; }
    .workspace-search-dialog { margin-top: max(12px, env(safe-area-inset-top)); }
  }
</style>
