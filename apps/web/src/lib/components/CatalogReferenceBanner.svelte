<script lang="ts">
 import {invalidateAll} from '$app/navigation';
 import {command,permitted} from '#lib/client/api.ts';
 import type {AppData} from '#lib/client/types.ts';
 import Icon from './Icon.svelte';
 let {data}:{data:AppData}=$props();
 let busy=$state(false),message=$state(''),error=$state('');
 async function add(){if(busy)return;busy=true;error='';try{const result=await command('catalog.reference.import',undefined,{});message=result.added?`${result.added} belegte Herstellerprodukte ergänzt.`:'Die hinterlegte Herstellerauswahl ist bereits vollständig vorhanden.';await invalidateAll();}catch(problem){error=(problem as Error).message;}finally{busy=false;}}
</script>
<section class="catalog-reference-banner"><div><h2>Mit echten Produkten planen.</h2><p>28 belegte Grundmodelle von antoniolupi, Duravit und Kaldewei stehen für die Beratung bereit. Artikel, veröffentlichte Maße und Quellen bleiben zusammen gespeichert. Ausführung, Preise, Verfügbarkeit und technische Freigabe ergänzen Sie im jeweiligen Vorgang.</p><a href="/product-versions">Produktstände und Quellen ansehen<Icon name="arrow" size={14}/></a></div>{#if permitted(data,'catalog')}<button class="btn" disabled={busy} onclick={add}><Icon name="plus" size={16}/>{busy?'Wird ergänzt …':'Herstellerauswahl ergänzen'}</button>{/if}</section>
{#if message}<p class="notice success" role="status">{message}</p>{/if}{#if error}<p class="notice error" role="alert">{error}</p>{/if}
<style>.catalog-reference-banner{display:flex;gap:30px;justify-content:space-between;align-items:center;background:var(--wash);padding:26px 28px;border:1px solid var(--line);border-radius:12px;margin:0 0 26px}.catalog-reference-banner>div{max-width:750px;min-width:0}h2{font-size:22px;letter-spacing:-.03em;font-weight:550;margin:9px 0 12px}p{font-size:13px;line-height:1.75;color:var(--muted)}a{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--forest);margin-top:14px;min-height:30px}.btn{flex:none;max-width:220px;white-space:normal}@media(max-width:760px){.catalog-reference-banner{padding:22px;flex-direction:column;gap:20px;align-items:flex-start}.btn{max-width:100%}}
</style>
