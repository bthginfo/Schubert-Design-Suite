<script lang="ts">
  import {request,display} from '#lib/client/api.ts';
  import {currencyAmount} from '#lib/client/finance.ts';
  import type {Row} from '#lib/client/types.ts';
  import Icon from './Icon.svelte';
  let {productId,priceId,currency,quantity,prefix,onapply,onclear}:{productId?:string;priceId?:string;currency:string;quantity?:string;prefix:string;onapply:(row:Row)=>void;onclear:()=>void}=$props();
  let rows:Row[]=$state([]);let selected=$state('');let busy=$state(false);let loaded=$state(false);let error=$state('');let lastProduct=$state('');
  $effect(()=>{if((productId||'')!==lastProduct){lastProduct=productId||'';rows=[];selected='';loaded=false;error='';}});
  function decimal(value:unknown){return Number(String(value??'').replace(',','.'));}
  const choice=$derived(rows.find(row=>row.id===selected));
  const eligible=$derived(!!choice&&choice.currency===currency&&Number.isFinite(decimal(quantity))&&Math.abs(decimal(quantity))>=Number(choice.min_quantity||0));
  async function load(){if(busy||!productId)return;error='';busy=true;try{const result=await request('/api/v1/lookups/sales-prices?'+new URLSearchParams({parent_id:productId}),undefined,'GET');rows=Array.isArray(result)?result:[];loaded=true;selected='';}catch(cause){error=cause instanceof Error?cause.message:'Freigegebene Verkaufspreise konnten nicht geladen werden.';}finally{busy=false;}}
  function apply(){if(!choice||!eligible)return;onapply(choice);}
</script>
<div class="sales-price-picker">
  {#if priceId}<p class="field-help"><Icon name="lock" size={12}/>An einen geprüften Verkaufspreisstand gebunden. Einheiten und Steuersatz gehören zu dieser Preisgrundlage.</p><button type="button" class="text-link mt" onclick={onclear}>Preisbindung für bewusste manuelle Eingabe lösen</button>{/if}
  <div class="inline-actions mt"><button type="button" class="btn small" disabled={busy||!productId} onclick={load}><Icon name={busy?'refresh':'search'} size={14} class={busy?'spin':''}/>{busy?'Wird gesucht …':loaded?'Preisstände aktualisieren':'Freigegebene Verkaufspreise anzeigen'}</button><a class="text-link" href="/sales-prices" target="_blank" rel="noreferrer">Verkaufspreise verwalten<Icon name="arrow" size={12}/></a></div>
  {#if loaded&&rows.length}<div class="field mt"><label for={`${prefix}-price-version`}>Gültiger Verkaufspreisstand</label><select id={`${prefix}-price-version`} bind:value={selected}><option value="">Passenden Stand auswählen</option>{#each rows as row}<option value={row.id}>{row.name} · {currencyAmount(row.amount,row.currency)} / {display(row.basis_quantity,'quantity')} {display(row.unit)} · ab {display(row.min_quantity,'quantity')} · Stand {display(row.valid_from,'date')}</option>{/each}</select><span class="field-help">Nur eigene fachlich freigegebene Verkaufspreise. Lieferanten-Einkaufspreise werden hier nicht angeboten.</span></div>{#if choice}<p class="field-help mt">{choice.currency!==currency?'Die Währung passt nicht zum Beleg.':!eligible?'Die Positionsmenge liegt unter der bestätigten Mindestmenge.':'Übernimmt Nettopreis je Einheit, Preiseinheit und bestätigten Steuersatz. Vorhandener Rabatt bleibt bestehen.'}</p><button type="button" class="btn mt" disabled={!eligible} onclick={apply}>Diesen Verkaufspreis übernehmen<Icon name="check" size={14}/></button>{/if}{:else if loaded}<p class="field-help mt">Für dieses Produkt ist heute noch kein freigegebener Verkaufspreis auswählbar. Geben Sie Ihren bestätigten Verkaufspreis bewusst manuell ein oder lassen Sie einen passenden Preisstand freigeben.</p>{/if}
  {#if error}<p class="field-error mt" role="alert">{error}</p>{/if}
</div>
<style>.sales-price-picker{padding-top:4px}.sales-price-picker>.field-help{display:flex;align-items:flex-start;gap:6px}.sales-price-picker>.field-help :global(svg){flex:none;margin-top:2px}.sales-price-picker>.text-link{font-size:11px}.sales-price-picker .inline-actions{align-items:center;gap:15px}.sales-price-picker :global(select){max-width:100%;text-overflow:ellipsis}@media(max-width:760px){.sales-price-picker>.text-link{font-size:12px;min-height:40px}.sales-price-picker :global(.btn){min-height:44px}}</style>
