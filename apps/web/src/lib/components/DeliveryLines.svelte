<script lang="ts">
  import {searchableSelect} from '#lib/client/searchable-select.ts';
  import {untrack} from 'svelte';
  import type {AppData,Row} from '#lib/client/types.ts';
  import {deliveryKinds,deliveryUnits} from '#lib/client/delivery-lines.ts';
  import ReferencePicker from './ReferencePicker.svelte';
  import Icon from './Icon.svelte';
  let {data,orderId,rows=$bindable([])}:{data:AppData;orderId?:string;rows?:Row[]}=$props();
  let previousOrder:string|undefined;
  let notice=$state('');
  $effect(()=>{const next=orderId;untrack(()=>{if(previousOrder!==undefined&&next!==previousOrder){rows=rows.map(row=>({...row,order_line_id:undefined}));notice='Der Auftrag wurde geändert. Prüfen Sie die Lieferpositionen und wählen Sie ihre passende Auftragsposition erneut.';}previousOrder=next;});});
  function add(){rows=[...rows,{client_key:crypto.randomUUID(),description:'',quantity:'1',unit:'piece',movement_kind:'delivery',notes:''}];}
</script>
<section class="form-section delivery-lines"><h3>Tatsächlicher Lieferumfang</h3><p class="field-help mb">Je Sache eine konkrete Menge und Einheit angeben. Rücknahmen und Fehlmengen getrennt erfassen; Mengen bleiben dabei positiv. Diese Angaben erzeugen keine automatische Lagerbuchung.</p>
{#if notice}<p class="notice info" role="status">{notice}</p>{/if}
{#each rows as line,index (line.client_key)}<article class="line-item"><div class="line-item-header"><h4>Position {index+1}</h4><button class="icon-button" type="button" aria-label={`Lieferposition ${index+1} entfernen`} onclick={()=>rows=rows.filter(row=>row.client_key!==line.client_key)}><Icon name="trash" size={16}/></button></div><div class="field-grid">
  <div class="field full"><label for={`delivery-description-${line.client_key}`}>Was gehört zu dieser Position? *</label><textarea id={`delivery-description-${line.client_key}`} bind:value={line.description} required placeholder="Zum Beispiel: Fensterbank links, Oberfläche poliert"></textarea></div>
  <div class="field"><label for={`delivery-quantity-${line.client_key}`}>Tatsächliche Menge *</label><input id={`delivery-quantity-${line.client_key}`} inputmode="decimal" bind:value={line.quantity} pattern="[0-9]+([,.][0-9]+)?" required/><span class="field-help">Zum Beispiel 2,5. Keine geschätzte Null für eine unbekannte Menge eintragen.</span></div>
  <div class="field"><label for={`delivery-unit-${line.client_key}`}>Einheit *</label><select use:searchableSelect={line.unit} id={`delivery-unit-${line.client_key}`} bind:value={line.unit}>{#each deliveryUnits as unit}<option value={unit.value}>{unit.label}</option>{/each}</select></div>
  <div class="field full"><label for={`delivery-kind-${line.client_key}`}>Was wird dokumentiert? *</label><select use:searchableSelect={line.movement_kind} id={`delivery-kind-${line.client_key}`} bind:value={line.movement_kind}>{#each deliveryKinds as kind}<option value={kind.value}>{kind.label}</option>{/each}</select></div>
  <details class="full delivery-references"><summary>Auftragsposition, Bestand oder Charge zuordnen · optional</summary><div class="field-grid mt"><div class="field full"><label for={`delivery-order-line-${line.client_key}`}>Genaue Auftragsposition</label>{#if orderId}{#key orderId}<ReferencePicker id={`delivery-order-line-${line.client_key}`} bind:value={line.order_line_id} reference="order-lines" parentId={orderId} initial={[]}/>{/key}{:else}<p class="field-help">Zuerst oben den zugehörigen Auftrag auswählen.</p>{/if}<span class="field-help">Nur Positionen des ausgewählten Auftrags werden angeboten. Menge und Einheit mit dem tatsächlichen Lieferumfang vergleichen.</span></div><div class="field full"><label for={`delivery-stock-${line.client_key}`}>Konkreter Lagerbestand</label><ReferencePicker id={`delivery-stock-${line.client_key}`} bind:value={line.stock_item_id} reference="stock" initial={data.lookups.stock||[]}/></div><div class="field full"><label for={`delivery-lot-${line.client_key}`}>Charge / Block</label><input id={`delivery-lot-${line.client_key}`} bind:value={line.lot_number}/></div></div></details>
  <div class="field full"><label for={`delivery-note-${line.client_key}`}>Zustand, Abweichung oder Hinweis · optional</label><textarea id={`delivery-note-${line.client_key}`} bind:value={line.notes} placeholder="Zum Beispiel: Kante beschädigt; Rücknahme mit dem Empfänger abgestimmt"></textarea></div>
</div></article>{/each}
<button class="btn mt" type="button" onclick={add}><Icon name="plus" size={16}/>Lieferposition ergänzen</button>{#if !rows.length}<p class="field-help mt">Beginnen Sie mit der ersten konkreten Sache. Ein Lieferbeleg benötigt mindestens eine Position.</p>{/if}
</section>
<style>.delivery-lines>h3{margin-bottom:9px}.delivery-lines .line-item+.line-item{margin-top:16px}.line-item-header h4{font-size:13px;font-weight:550}.delivery-references{grid-column:1/-1;min-width:0}.delivery-references summary{color:var(--forest);font-size:12px;cursor:pointer;line-height:1.6;min-height:34px}.delivery-lines textarea{min-height:74px}@media(max-width:760px){.line-item-header h4{font-size:14px}.delivery-references summary{font-size:13px;min-height:44px}}</style>
