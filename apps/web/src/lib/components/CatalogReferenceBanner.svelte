<script lang="ts">
 import {invalidateAll} from '$app/navigation';
 import {command,permitted} from '#lib/client/api.ts';
 import type {AppData} from '#lib/client/types.ts';
 import Icon from './Icon.svelte';
 import ManufacturerLookup from './ManufacturerLookup.svelte';
 let {data}:{data:AppData}=$props();
 let busy=$state(false),message=$state(''),error=$state('');
 let showCatalog=$state(false);
 async function add(){if(busy)return;busy=true;error='';try{const result=await command('catalog.reference.import',undefined,{});message=result.added?`${result.added} belegte Herstellerprodukte ergänzt.`:'Die hinterlegte Herstellerauswahl ist bereits vollständig vorhanden.';await invalidateAll();}catch(problem){error=(problem as Error).message;}finally{busy=false;}}
</script>
<details class="catalog-panel" ontoggle={(event) => { showCatalog = event.currentTarget.open; }}>
  <summary><Icon name="box" size={19}/>Herstellerkatalog durchsuchen</summary>
  {#if showCatalog}
    <div class="catalog-search"><ManufacturerLookup id="business-manufacturer" showHeading={false} canSaveCatalog={permitted(data,'catalog')}/></div>
  {/if}
</details>
<section class="catalog-reference-banner"><div><h2>Beratungsmodelle</h2><p>28 Grundmodelle von antoniolupi, Duravit und Kaldewei mit veröffentlichten Maßen und Quellen.</p><a href="/product-versions">Produktstände und Quellen ansehen<Icon name="arrow" size={14}/></a></div>{#if permitted(data,'catalog')}<button class="btn" disabled={busy} onclick={add}><Icon name="plus" size={16}/>{busy?'Wird ergänzt …':'Beratungsmodelle ergänzen'}</button>{/if}</section>
{#if message}<p class="notice success" role="status">{message}</p>{/if}{#if error}<p class="notice error" role="alert">{error}</p>{/if}
<style>.catalog-reference-banner{display:flex;gap:30px;justify-content:space-between;align-items:center;background:var(--wash);padding:26px 28px;border:1px solid var(--line);border-radius:12px;margin:0 0 26px}.catalog-reference-banner>div{max-width:750px;min-width:0}h2{font-size:22px;letter-spacing:-.03em;font-weight:550;margin:9px 0 12px}p{font-size:13px;line-height:1.75;color:var(--muted)}a{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--forest);margin-top:14px;min-height:30px}.btn{flex:none;max-width:220px;white-space:normal}@media(max-width:760px){.catalog-reference-banner{padding:22px;flex-direction:column;gap:20px;align-items:flex-start}.btn{max-width:100%}}
.catalog-panel{background:var(--paper);border:1px solid var(--line);border-radius:12px;margin:0 0 16px}
.catalog-panel summary{display:flex;align-items:center;gap:10px;min-height:54px;padding:10px 18px;color:var(--ink);font-weight:600;cursor:pointer;list-style:none}
.catalog-panel summary::-webkit-details-marker{display:none}
.catalog-panel summary::after{content:'';width:7px;height:7px;margin-inline-start:auto;border:solid var(--muted);border-width:0 1.5px 1.5px 0;transform:rotate(45deg)}
.catalog-panel[open] summary::after{transform:rotate(225deg)}
.catalog-search{padding:16px 18px;border-top:1px solid var(--line)}
</style>
