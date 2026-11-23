<script lang="ts">
  import type { AppData } from '#lib/client/types.ts';
  import { permitted } from '#lib/client/api.ts';
  import Icon from './Icon.svelte';

  let { data }: { data: AppData } = $props();
  const workspace = $derived(data.summary.workspace);
  const office = $derived(data.path?.split('?')[0] === 'office' || data.path?.startsWith('/office'));
  const quickActions = $derived([
    ...(office && permitted(data, 'sales') ? [{ label: 'Angebot anlegen', href: '/quotes?create=1', icon: 'plus' }] : []),
    ...(office && permitted(data, 'billing') ? [{ label: 'Rechnungsentwurf', href: '/invoices?create=1', icon: 'file' }] : []),
    ...(!office && permitted(data, 'purchasing') ? [{ label: 'Bestellung anlegen', href: '/purchase-orders?create=1', icon: 'plus' }] : []),
    ...(!office && permitted(data, 'inventory') ? [{ label: 'Lager öffnen', href: '/stock', icon: 'box' }] : []),
  ]);
  const featured = $derived(workspace.cards.slice(0, 2));
  const remaining = $derived(workspace.cards.slice(2));
  let areaQuery = $state('');
  const extraAreas = $derived(workspace.extra.filter((item: { label: string }) =>
    item.label.toLocaleLowerCase('de').includes(areaQuery.trim().toLocaleLowerCase('de'))));
</script>

<div class="workspace-hub">
  <header class="hub-heading page-heading">
    <div><h1>{workspace.title}</h1><p>{workspace.intro}</p></div>
    {#if quickActions.length}
      <div class="hub-actions">
        {#each quickActions as action, index}
          <a class="btn" class:primary={index === 0} href={action.href}><Icon name={action.icon} size={17}/>{action.label}</a>
        {/each}
      </div>
    {/if}
  </header>

  <nav class="hub-cards" aria-label={office ? 'Angebote und Rechnungen' : 'Bestellen und Rechnungseingang'}>
    {#each featured as card}
      <a href={card.href} class="hub-card">
        <span class="card-icon"><Icon name={card.icon} size={21}/></span>
        <span class="row-copy"><strong>{card.label}</strong><small>{card.description}</small></span>
        <span class="row-count" aria-label={card.total + ' Einträge'}>{card.total}</span>
        <Icon name="chevron" size={17}/>
      </a>
    {/each}
  </nav>

  {#if remaining.length}
    <section class="hub-overview">
      <h2>{office ? 'Zahlungen und Buchhaltung' : 'Material und Lieferanten'}</h2>
      <nav class="hub-list" aria-label={office ? 'Abrechnung und Finanzen' : 'Einkauf und Bestand'}>
        {#each remaining as card}
          <a class="hub-row" href={card.href}>
            <Icon name={card.icon} size={18}/>
            <span class="row-copy"><strong>{card.label}</strong><small>{card.description}</small></span>
            <span class="row-count" aria-label={card.total + (card.open ? ' offen' : ' Einträge')}>{card.total}{#if card.open}<small>offen</small>{/if}</span>
            <Icon name="chevron" size={15}/>
          </a>
        {/each}
      </nav>
    </section>
  {/if}

  {#if workspace.extra.length}
    <details class="hub-more">
      <summary>Weitere Bereiche</summary>
      <div class="hub-directory">
        <label class="area-search"><Icon name="search" size={17}/><input type="search" bind:value={areaQuery} placeholder="Bereich suchen" aria-label="Fachaufgabe suchen"/></label>
        <nav aria-label="Weitere Fachaufgaben">
          {#each extraAreas as item}<a href={item.href}>{item.label}<Icon name="chevron" size={15}/></a>{/each}
        </nav>
        {#if !extraAreas.length}<p class="no-areas" role="status">Kein passender Bereich gefunden.</p>{/if}
      </div>
    </details>
  {/if}
  {#if data.navigation.some((item: { slug: string }) => item.slug === 'customers')}
    <a class="hub-customer-link text-link" href="/customers"><Icon name="users" size={17}/>Zu den Kundenakten<Icon name="chevron" size={15}/></a>
  {/if}
</div>

<style>
  .workspace-hub { max-width: 1080px; margin-inline: auto; }
  .hub-heading { align-items: center; margin-bottom: 26px; }
  .hub-actions { display: flex; flex-wrap: wrap; gap: 8px; flex: none; }
  .hub-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .hub-card, .hub-row {
    display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center;
    gap: 12px; color: var(--ink); min-width: 0; padding: 15px 18px;
  }
  .hub-card { min-height: 88px; border: 1px solid var(--line); border-radius: 16px; background: var(--paper); }
  .hub-card:hover, .hub-row:hover { background: var(--input-surface); }
  .card-icon { display: grid; place-items: center; width: 35px; height: 35px; border-radius: 10px; background: var(--accent-wash); color: var(--forest); }
  .row-copy { display: grid; gap: 3px; min-width: 0; }
  .row-copy strong { font-size: 1rem; font-weight: 600; overflow-wrap: anywhere; }
  .row-copy small { font-size: .85rem; color: var(--muted); line-height: 1.45; }
  .row-count { color: var(--muted); font-variant-numeric: tabular-nums; font-size: .88rem; text-align: end; }
  .row-count small { display: block; }
  .hub-card :global(svg:last-child), .hub-row :global(svg) { color: var(--muted); }
  .card-icon :global(svg:last-child) { color: var(--forest); }
  .hub-overview { margin-top: 28px; }
  .hub-overview h2 { margin: 0 0 10px 2px; font-size: 1.15rem; }
  .hub-list { background: var(--paper); border: 1px solid var(--line); border-radius: 16px; }
  .hub-row + .hub-row { border-top: 1px solid var(--line-soft); }
  .hub-row:first-child { border-radius: 16px 16px 0 0; }
  .hub-row:last-child { border-radius: 0 0 16px 16px; }
  .hub-row:only-child { border-radius: 16px; }
  .hub-more { margin-top: 14px; }
  .hub-directory { display: grid; gap: 12px; padding: 4px 4px 12px; }
  .area-search { display: flex; align-items: center; gap: 10px; max-width: 27rem; padding-inline: 12px; border: 1px solid var(--line); border-radius: 11px; color: var(--muted); background: var(--paper); }
  .area-search:focus-within { outline: 2px solid var(--forest); outline-offset: 2px; }
  .area-search input { min-width: 0; width: 100%; min-height: 44px; outline: none; border: 0; box-shadow: none; background: transparent; color: var(--ink); }
  .hub-directory nav { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 4px 14px; }
  .hub-directory nav a { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 44px; padding: 8px; border-radius: 9px; overflow-wrap: anywhere; }
  .hub-directory nav a:hover { background: var(--wash); }
  .no-areas { color: var(--muted); }
  .hub-customer-link { display: flex; width: fit-content; margin-top: 12px; min-height: 44px; }
  @media (max-width: 1080px) {
    .hub-heading { align-items: flex-start; flex-direction: column; gap: 14px; }
  }
  @media (max-width: 760px) {
    .hub-heading { margin-bottom: 18px; }
    .hub-actions { width: 100%; }
    .hub-actions :global(.btn) { flex: 1 1 145px; justify-content: center; min-height: 44px; }
    .hub-cards, .hub-directory nav { grid-template-columns: 1fr; }
    .hub-card, .hub-row { padding: 13px; gap: 10px; min-height: 68px; }
    .hub-overview { margin-top: 22px; }
    .area-search input { font-size: 1rem; }
  }
</style>
