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
  <header class="hub-heading">
    <div><h1>{workspace.title}</h1><p>{workspace.intro}</p></div>
    {#if quickActions.length}
      <div class="hub-actions">
        {#each quickActions as action, index}
          <a class="btn" class:primary={index === 0} href={action.href}><Icon name={action.icon} size={17}/>{action.label}</a>
        {/each}
      </div>
    {/if}
  </header>

  <nav class="hub-cards" aria-label={'Häufige Aufgaben in ' + workspace.title}>
    {#each featured as card}
      <a href={card.href} class="hub-card">
        <span class="card-icon"><Icon name={card.icon} size={23}/></span>
        <div class="card-content"><h2>{card.label}</h2><p>{card.description}</p></div>
        <div class="card-bottom"><span><strong>{card.total}</strong> {card.open ? 'offene Posten' : card.total === 1 ? 'Eintrag' : 'Einträge'}</span><span class="card-open">Öffnen <Icon name="arrow" size={17}/></span></div>
      </a>
    {/each}
  </nav>

  {#if remaining.length}
    <section class="hub-overview">
      <header><h2>{office ? 'Abrechnung & Überblick' : 'Einkauf & Bestand'}</h2><span>Ihre Arbeitsbereiche</span></header>
      <nav aria-label={office ? 'Abrechnung und Finanzen' : 'Weitere Einkaufsaufgaben'}>
        {#each remaining as card}
          <a class="hub-row" href={card.href}>
            <span class="row-icon"><Icon name={card.icon} size={20}/></span>
            <span class="row-copy"><strong>{card.label}</strong><small>{card.description}</small></span>
            <span class="row-count">{card.total}<small>{card.open ? 'offen' : card.total === 1 ? 'Eintrag' : 'Einträge'}</small></span>
            <Icon name="chevron" size={16}/>
          </a>
        {/each}
      </nav>
    </section>
  {/if}

  {#if workspace.extra.length}
    <details class="hub-more">
      <summary>Weitere Bereiche & Fachaufgaben<span>{workspace.extra.length}</span></summary>
      <label class="area-search"><Icon name="search" size={17}/><input type="search" bind:value={areaQuery} placeholder="Bereich suchen" aria-label="Fachaufgabe suchen"/></label>
      <nav aria-label="Weitere Fachaufgaben">
        {#each extraAreas as item}<a href={item.href}>{item.label}<Icon name="arrow" size={15}/></a>{/each}
      </nav>
      {#if !extraAreas.length}<p class="no-areas" role="status">Kein passender Bereich gefunden.</p>{/if}
    </details>
  {/if}
  {#if data.navigation.some((item: { slug: string }) => item.slug === 'customers')}
    <a class="hub-customer-link" href="/customers"><Icon name="users" size={21}/><span><strong>Von einem Kunden aus arbeiten</strong><small>Angebote, Aufträge und Unterlagen zusammen öffnen.</small></span><Icon name="arrow" size={18}/></a>
  {/if}
</div>

<style>
  .workspace-hub { max-width: 1120px; margin: 0 auto; }
  .hub-heading { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin: 6px 0 30px; }
  .hub-heading h1 { font-size: 36px; letter-spacing: -.035em; }
  .hub-heading p { max-width: 60ch; margin-top: 10px; font-size: 14px; line-height: 1.7; }
  .hub-actions { display: flex; flex-wrap: wrap; gap: 8px; flex: none; }
  .hub-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
  .hub-card { display: grid; grid-template-columns: auto minmax(0,1fr); gap: 16px; padding: 26px; border: 1px solid var(--line-soft); border-radius: 22px; background: var(--paper); color: var(--ink); box-shadow: var(--content-shadow); transition: transform .18s ease, box-shadow .18s ease; }
  .hub-card:hover { transform: translateY(-2px); box-shadow: var(--panel-shadow); }
  .card-icon { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; background: var(--accent-wash); color: var(--forest); }
  .card-content h2 { font-size: 19px; letter-spacing: -.025em; margin: 0; }
  .card-content p { font-size: 13px; line-height: 1.65; margin-top: 6px; }
  .card-bottom { grid-column: 1/-1; display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-top: 14px; font-size: 12px; color: var(--muted); }
  .card-bottom strong { color: var(--ink); font-size: 28px; font-weight: 550; letter-spacing: -.04em; margin-right: 6px; font-variant-numeric: tabular-nums; }
  .card-open { display: flex; align-items: center; gap: 8px; color: var(--forest); font-weight: 550; }
  .hub-overview { margin-top: 26px; overflow: hidden; border: 1px solid var(--line-soft); border-radius: 20px; background: var(--paper); box-shadow: var(--content-shadow); }
  .hub-overview>header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 21px 24px 13px; }
  .hub-overview h2 { font-size: 17px; }
  .hub-overview>header>span { color: var(--muted); font-size: 12px; }
  .hub-row { display: flex; align-items: center; gap: 16px; min-height: 84px; padding: 16px 24px; border-top: 1px solid var(--line-soft); }
  .hub-row:hover { background: var(--input-surface); }
  .row-icon { color: var(--muted); display: grid; place-items: center; width: 36px; flex: none; }
  .row-copy { flex: 1; min-width: 0; }
  .row-copy strong { display: block; font-size: 14px; font-weight: 550; }
  .row-copy small { display: block; font-size: 13px; color: var(--muted); margin-top: 3px; line-height: 1.5; }
  .row-count { flex: none; text-align: right; color: var(--ink); font-size: 19px; font-weight: 550; font-variant-numeric: tabular-nums; }
  .row-count small { display: block; color: var(--muted); font-size: 11px; font-weight: 400; }
  .hub-row>:global(svg) { color: var(--muted); }
  .hub-more { margin-top: 22px; }
  .hub-more>summary>span { color: var(--muted); font-size: 12px; }
  .hub-more nav { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 4px 12px; padding: 8px 0; }
  .hub-more nav a { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 48px; padding: 10px 12px; border-radius: 10px; font-size: 13px; color: var(--ink); }
  .hub-more nav a:hover { background: var(--paper); }
  .area-search { display: flex; align-items: center; gap: 10px; max-width: 360px; padding: 9px 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--paper); color: var(--muted); }
  .area-search input { width: 100%; min-width: 0; min-height: 28px; border: 0; background: transparent; color: var(--ink); font: inherit; font-size: 14px; }
  .no-areas { font-size: 13px; margin-top: 14px; }
  .hub-customer-link { display: flex; align-items: center; gap: 14px; padding: 22px 5px; margin-top: 10px; color: var(--forest); }
  .hub-customer-link span { flex: 1; min-width: 0; }
  .hub-customer-link strong, .hub-customer-link small { display: block; }
  .hub-customer-link strong { font-size: 14px; font-weight: 550; }
  .hub-customer-link small { font-size: 12px; color: var(--muted); margin-top: 5px; }
  @media(max-width:1100px) { .hub-heading { align-items: flex-start; flex-direction: column; gap: 18px; } }
  @media(max-width:600px) {
    .hub-heading { margin: 0 0 24px; } .hub-heading h1 { font-size: 30px; }
    .hub-cards { grid-template-columns: minmax(0,1fr); gap: 12px; } .hub-card { padding: 20px; border-radius: 18px; gap: 12px; }
    .card-bottom { margin-top: 3px; } .hub-overview>header { padding: 18px 18px 13px; } .hub-overview>header>span { display: none; }
    .hub-row { padding: 15px; gap: 10px; } .row-copy small { font-size: 12px; }
    .hub-more nav { grid-template-columns: minmax(0,1fr); } .area-search { max-width: none; } .area-search input { font-size: 16px; }
  }
  @media(prefers-reduced-motion:reduce) { .hub-card { transition: none; } .hub-card:hover { transform: none; } }
</style>
