<script lang="ts">
  import type {Row} from '#lib/client/types.ts';
  import {display} from '#lib/client/api.ts';
  import {reportMonthDrilldown,reportMetrics,reportMoney,reportNumber,reportQuantity} from '#lib/client/reports.ts';
  import Icon from '../Icon.svelte';
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
      {@const maximum=Math.max(0,...values.map(value=>Math.abs(value)))}
      {@const negatives=values.some(value=>value<0)}
      <div class="trend-currency"><h3>{selected.label} · {selected.unit==='currency'?(unit||'Währung nicht bestätigt'):selected.unit==='percent'?'Prozent':'Anzahl'}</h3><p class="field-help">{negatives?'Die Mittellinie kennzeichnet null; negative Werte zeigen nach links.':'Balken beginnen bei null.'} Die Tabelle enthält alle Werte und Datenlücken.</p></div>
      <div class="trend-chart" aria-label={`${selected.label} nach Monat`}>
        {#each group as row}
          {@const value=reportNumber(row.value)}
          <div class="trend-row"><a href={monthHref(row)} class="trend-month">{monthLabel(row)}</a><div class:negative-axis={negatives} class="trend-track" aria-hidden="true">{#if value!==null}<span class:negative={value<0} class="trend-bar" style={`width:${maximum?Math.abs(value)/maximum*(negatives?50:100):0}%;left:${negatives?(value<0?50-(maximum?Math.abs(value)/maximum*50:0):50):0}%`}></span>{:else}<span class="trend-missing">Grundlage fehlt</span>{/if}</div><span class="trend-value">{format(row.value,unit)}</span></div>
        {/each}
      </div>
      <details class="trend-table"><summary>Werte als Tabelle lesen</summary><div class="table-scroll mt"><table class="data-table"><caption class="sr-only">{selected.label} im gewählten Zeitraum · {unit||'Währung offen'}</caption><thead><tr><th>Monat</th><th class="number">{selected.label}</th><th>Quelle</th></tr></thead><tbody>{#each group as row}<tr><th scope="row">{monthLabel(row)}</th><td class="number">{format(row.value,unit)}</td><td><a class="text-link" href={monthHref(row)}>Belege öffnen<Icon name="arrow" size={13}/></a></td></tr>{/each}</tbody></table></div></details>
    {/each}
  {:else}<div class="empty-state compact"><Icon name="chart" size={27}/><h3>Noch keine bestätigte Monatsreihe</h3><p>Für den gewählten Zeitraum liegen keine berechtigten Auswertungswerte vor. Das ist keine Aussage über Umsatz oder Leistung des Betriebs.</p></div>{/if}
</div></section>
<style>.trend-select{max-width:610px;margin-bottom:27px}.trend-currency{margin-top:24px;margin-bottom:18px}.trend-currency h3{font-size:14px;font-weight:550}.trend-currency p{margin-top:5px}.trend-chart{display:grid;gap:17px}.trend-row{display:grid;grid-template-columns:70px minmax(45px,1fr) minmax(135px,auto);gap:15px;align-items:center;font-size:12px}.trend-month{color:var(--forest);text-decoration:underline;text-underline-offset:3px}.trend-track{position:relative;height:21px;background:#f0f2ed;border-radius:3px;overflow:hidden}.trend-bar{height:100%;position:absolute;background:#5f7f62;border-radius:2px}.trend-bar.negative{background:#a46b5c}.trend-track.negative-axis:after{content:'';position:absolute;left:50%;top:0;bottom:0;border-left:1px solid #8d998b}.trend-missing{display:block;font-size:10px;text-align:center;line-height:21px;color:var(--muted)}.trend-value{text-align:right;font-variant-numeric:tabular-nums;font-size:12px}.trend-table{margin-top:24px}.trend-table summary{font-size:12px;cursor:pointer;color:var(--forest)}@media(max-width:760px){.trend-row{grid-template-columns:53px minmax(30px,1fr);gap:9px 12px}.trend-value{grid-column:2;text-align:left;font-size:12px}.trend-month{grid-row:span 2;align-self:start;padding-top:2px;font-size:13px}.trend-select{margin-bottom:22px}.trend-currency h3{font-size:15px}.trend-table summary{font-size:13px;min-height:42px;display:flex;align-items:center}}</style>
