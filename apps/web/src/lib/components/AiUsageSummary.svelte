<script lang="ts">
  import type {Row} from '#lib/client/types.ts';
  import {usageAmount,usageCount,usageMonth} from '#lib/client/ai-usage.ts';
  import Icon from './Icon.svelte';
  let {usage}:{usage:Row}=$props();
</script>
<section class="panel usage-summary" aria-labelledby="usage-summary-title">
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
</style>
