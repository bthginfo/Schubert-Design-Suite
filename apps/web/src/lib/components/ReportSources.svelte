<script lang="ts">
 import {scrollRegion} from '#lib/client/scroll-region.ts';
 import {currencyAmount} from '#lib/client/finance.ts';
 const isMoney=(key:string)=>/amount|total|value_net|budget_net/.test(key);
 import type {AppData} from '#lib/client/types.ts';import {display,label,recordName} from '#lib/client/api.ts';
 let {data}:{data:AppData}=$props();const source=$derived(data.summary.reportSource);
</script>
<section class="panel"><header class="panel-header"><div><h2>Quellennachweis · {source?.label??'Finanzdaten'}</h2><p>Begrenzte Lesesicht zu den gesetzten Filtern. Ihre Rolle erhält dadurch keine Bearbeitungsrechte im Fachbereich.</p></div></header><div class="panel-body">{#if source?.hasMore}<div class="notice warning" role="status">Die ersten 200 Belege werden angezeigt. Grenzen Sie den Zeitraum weiter ein; dies ist keine vollständige Exportdatei.</div>{/if}{#if source?.records?.length}<div class="table-scroll" use:scrollRegion={'Quellennachweis'}><table class="data-table"><thead><tr>{#each source.columns as key}<th>{label(key)}</th>{/each}</tr></thead><tbody>{#each source.records as row}<tr>{#each source.columns as key,index}<td>{#if index===0&&source.canOpen}<a class="text-link" href={`/${source.source}/${row.id}`}>{row[key]||recordName(row)}</a>{:else}{isMoney(key)?currencyAmount(row[key],row.currency||'EUR'):display(row[key],key,data)}{/if}</td>{/each}</tr>{/each}</tbody></table></div>{:else}<p>Für diese Filter liegen keine Quellen vor. Prüfen Sie Zeitraum und Geschäftsbereich.</p>{/if}</div></section>
