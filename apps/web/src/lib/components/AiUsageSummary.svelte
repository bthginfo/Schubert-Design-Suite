<script lang="ts">
  import type {Row} from '#lib/client/types.ts';
  import {usageAmount,usageCount,usageMonth} from '#lib/client/ai-usage.ts';
  import Icon from './Icon.svelte';
  let {usage,compact=false}:{usage:Row;compact?:boolean}=$props();
</script>
<section class="panel usage-summary" class:compact aria-labelledby="usage-summary-title">
  <header class="panel-header"><div><h2 id="usage-summary-title">KI-Verbrauch</h2><p>{usageMonth(usage.period)} · nur diese Suite</p></div><a class="text-link" href="/settings?tab=usage">Verbrauch im Detail<Icon name="arrow" size={15}/></a></header>
  <div class="panel-body"><dl class="usage-summary-values">
    <div><dt>Erfasste Tokens</dt><dd>{usageCount(usage.totals.total_tokens)}</dd></div>
    <div><dt>Erfasste Kosten · geschätzt / abgeglichen</dt><dd>{usage.totals.requests&&usage.totals.missing_cost===usage.totals.requests?'Noch offen':usageAmount(usage.totals.cost)}</dd></div>
    <div><dt>API-Aufrufe</dt><dd>{usageCount(usage.totals.requests)}</dd></div>
  </dl>{#if usage.totals.missing_cost||usage.totals.missing_usage}<p class="field-help mt">Bei {usage.totals.missing_cost} Aufrufen sind die Kosten noch offen, bei {usage.totals.missing_usage} fehlen vollständige Tokenangaben.</p>{/if}</div>
</section>
<style>
  .usage-summary{margin-bottom:28px}.usage-summary-values{display:flex;flex-wrap:wrap;gap:24px 56px;margin:0}.usage-summary-values dt{font-size:12px;color:var(--muted);margin-bottom:7px}.usage-summary-values dd{font-size:22px;font-weight:550;font-variant-numeric:tabular-nums;margin:0}.usage-summary .panel-header{flex-wrap:wrap;gap:16px}
  @media(max-width:760px){.usage-summary-values{gap:22px}.usage-summary-values>div{flex:1 1 180px}.usage-summary .panel-header{align-items:flex-start}}
.usage-summary.compact{margin:0;display:grid;grid-template-columns:minmax(210px,.85fr) minmax(0,1.7fr);align-items:center}.compact .panel-header{border-bottom:0;align-items:flex-start;flex-direction:column;gap:6px;padding:20px 24px}.compact .panel-header h2{font-size:14px}.compact .panel-header p{font-size:11px}.compact .panel-header .text-link{font-size:12px}.compact .panel-body{padding:20px 24px;border-left:1px solid var(--line-soft,var(--line))}.compact .usage-summary-values{gap:18px 30px;justify-content:space-between}.compact .usage-summary-values>div{flex:1 1 110px}.compact .usage-summary-values dt{font-size:11px;line-height:1.6;margin-bottom:5px}.compact .usage-summary-values dd{font-size:19px}.compact .field-help{font-size:11px}@media(max-width:1000px){.usage-summary.compact{grid-template-columns:1fr}.compact .panel-header{flex-direction:row;justify-content:space-between;align-items:center;padding:18px 20px}.compact .panel-body{border-left:0;border-top:1px solid var(--line-soft,var(--line));padding:18px 20px}}@media(max-width:760px){.compact .usage-summary-values{gap:20px}.compact .usage-summary-values>div{flex:1 1 125px}.compact .panel-header{padding:18px}.compact .panel-body{padding:20px 18px}}
</style>
