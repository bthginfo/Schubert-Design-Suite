<script lang="ts">
  import type {Row} from '#lib/client/types.ts';
  import {display} from '#lib/client/api.ts';
  import {deliveryKinds} from '#lib/client/delivery-lines.ts';
  let {rows,compact=false}:{rows:Row[];compact?:boolean}=$props();
  function movement(value:string){return deliveryKinds.find(item=>item.value===value)?.label||'Art noch nicht bestätigt';}
</script>
<section class:panel={!compact} class="delivery-summary">{#if !compact}<header class="panel-header"><div><h2>Dokumentierter Lieferumfang</h2><p>Tatsächliche Mengen mit getrennten Rücknahmen und Fehlmengen.</p></div><span class="count">{rows.length}</span></header>{/if}
<div class="table-scroll"><table class="data-table"><thead><tr><th>Position / Zustand</th><th>Art</th><th class="number">Menge</th><th>Einheit</th><th>Charge</th></tr></thead><tbody>{#each rows as line,index}<tr><td><strong class="record-title">{index+1}. {line.description}</strong>{#if line.notes}<p class="record-subtitle">{line.notes}</p>{/if}</td><td>{movement(line.movement_kind)}</td><td class="number">{display(line.quantity,'quantity')}</td><td>{display(line.unit)}</td><td>{line.lot_number||'Nicht angegeben'}</td></tr>{/each}</tbody></table></div>
{#if !rows.length}<p class="panel-body field-help">Noch keine konkreten Lieferpositionen dokumentiert. Ergänzen Sie Menge und Einheit vor der Empfangsbestätigung.</p>{/if}
</section>
<style>.delivery-summary{min-width:0}.delivery-summary .record-subtitle{white-space:pre-wrap}.delivery-summary .data-table{min-width:540px}</style>
