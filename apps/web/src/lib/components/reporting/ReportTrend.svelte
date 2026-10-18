<script lang="ts">
  import type {Row} from '#lib/client/types.ts';
  import {display} from '#lib/client/api.ts';
  import {reportMonthDrilldown,reportMetrics,reportMoney,reportNumber,reportQuantity} from '#lib/client/reports.ts';
  import Icon from '../Icon.svelte';
  import TrendPlot from './TrendPlot.svelte';
  let {rows,from,to,business,currency,definitions=[]}:{rows:Row[];from:string;to:string;business:string;currency?:string;definitions?:Row[]}=$props();
  let metric=$state('invoiced_net');
  const selected=$derived(reportMetrics.find(item=>item.key===metric)||reportMetrics[1]);
  const definition=$derived(definitions.find(item=>(item.key||item.metric_key)===metric));
  const series=$derived(rows.map(row=>({...row,value:row[metric]??(row.metric_key===metric?row.value:undefined),currency:row.currency||currency||''})));
  const currencies=$derived([...new Set(series.map(row=>row.currency))]);
  const monthLabel=(row:Row)=>/^\d{4}-\d{2}$/.test(String(row.month))?display(row.month+'-01','date').slice(3):row.label||row.month||row.period||'Zeitraum';
  function format(value:unknown,unit:string){return selected.unit==='currency'?reportMoney(value,unit):reportQuantity(value,selected.unit==='percent'?'%':'');}
  function monthHref(row:Row){return reportMonthDrilldown(definition?.href||selected.href,String(row.month||''),from,to,business,row.currency||currency||'',selected.key);}
</script>
<section class="panel"><header class="panel-header"><div><h2>Monatsentwicklung</h2><p>Eine Kennzahl wählen und jeden Monatswert bis zur Quelle nachvollziehen.</p></div><Icon name="chart" size={19}/></header><div class="panel-body">
  <div class="field trend-select"><label for="trend-metric">Welche Entwicklung möchten Sie sehen?</label><select id="trend-metric" bind:value={metric}>{#each reportMetrics.filter(item=>['ordered_net','invoiced_net','performance_value','received_payments'].includes(item.key)) as item}<option value={item.key}>{item.label}</option>{/each}</select><p class="field-help">{definition?.description||selected.help}</p></div>
  {#if series.length}
    {#each currencies as unit}
      {@const group=series.filter(row=>row.currency===unit)}
      {@const values=group.map(row=>reportNumber(row.value)).filter((value):value is number=>value!==null)}
      {#if values.length}
        <TrendPlot label={selected.label+' · '+(unit||'Währung offen')} points={group.map(row=>({label:monthLabel(row),value:reportNumber(row.value),href:monthHref(row)}))} format={value=>format(value,unit)}/>
      {:else}<div class="trend-empty"><Icon name="chart" size={28}/><div><h3>Noch keine bestätigten Werte</h3><p>Für „{selected.label}“ liegt im gewählten Zeitraum noch keine bestätigte Monatsreihe vor. Die zugehörigen Belege erreichen Sie über die Tabelle.</p></div></div>{/if}
      <details class="trend-table"><summary>Werte als Tabelle lesen</summary><div class="table-scroll mt"><table class="data-table"><caption class="sr-only">{selected.label} im gewählten Zeitraum · {unit||'Währung offen'}</caption><thead><tr><th>Monat</th><th class="number">{selected.label}</th><th>Quelle</th></tr></thead><tbody>{#each group as row}<tr><th scope="row">{monthLabel(row)}</th><td class="number">{format(row.value,unit)}</td><td><a class="text-link" href={monthHref(row)}>Belege öffnen<Icon name="arrow" size={13}/></a></td></tr>{/each}</tbody></table></div></details>
    {/each}
  {:else}<div class="empty-state compact"><Icon name="chart" size={27}/><h3>Noch keine bestätigte Monatsreihe</h3><p>Für den gewählten Zeitraum liegen keine berechtigten Auswertungswerte vor. Das ist keine Aussage über Umsatz oder Leistung des Betriebs.</p></div>{/if}
</div></section>
<style>.trend-select{max-width:610px;margin-bottom:28px}.trend-table{margin-top:24px}.trend-empty{display:flex;gap:18px;align-items:flex-start;padding:34px 0 26px;border-top:1px solid var(--line)}.trend-empty :global(svg){color:var(--muted);flex:none;margin-top:3px}.trend-empty h3{font-size:17px;font-weight:550;letter-spacing:-.02em}.trend-empty p{font-size:14px;line-height:1.7;margin-top:9px;max-width:65ch}</style>
