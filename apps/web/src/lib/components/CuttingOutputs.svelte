<script lang="ts">
  import {searchableSelect} from '#lib/client/searchable-select.ts';
  import {onMount} from 'svelte';import type {Row} from '#lib/client/types.ts';import Icon from './Icon.svelte';
  let {value=$bindable(),lookups={}}:{value?:any;lookups?:Record<string,{id:string;name:string}[]>}=$props();
  let rows:Row[]=$state([]);let ready=$state(false);
  const empty=()=>({key:crypto.randomUUID(),name:'',kind:'',quantity:'',unit:'',area_mm2:'',width_mm:'',height_mm:'',thickness_mm:'',order_id:''});
  onMount(()=>{try{const parsed=typeof value==='string'?JSON.parse(value):value;rows=Array.isArray(parsed)&&parsed.length?parsed.map(row=>({...empty(),...row})):[empty(),empty()];}catch{rows=[empty(),empty()];}ready=true;});
  $effect(()=>{if(ready)value=JSON.stringify(rows.map(row=>Object.fromEntries(Object.entries(row).filter(([key,item])=>key!=='key'&&item!==''))));});
</script>
<section class="cutting-outputs full">
  <h3>Was entsteht aus diesem Zuschnitt?</h3>
  <p class="small">Erfassen Sie jedes Fertigteil, jedes Reststück und den tatsächlichen Verschnitt. Die nachgewiesenen Ausgangsflächen müssen zusammen die vollständige Eingangsfläche abbilden.</p>
  {#each rows as row,index}<div class="cutting-output">
    <div class="cutting-output-header"><h4>Teil {index+1}</h4><button type="button" class="icon-button" aria-label={`Teil ${index+1} entfernen`} disabled={rows.length<=2} onclick={()=>rows=rows.filter(r=>r.key!==row.key)}><Icon name="trash" size={16}/></button></div>
    <div class="field-grid">
      <div class="field"><label for={`cut-name-${row.key}`}>Bezeichnung *</label><input id={`cut-name-${row.key}`} bind:value={row.name} required placeholder="Zum Beispiel Küchenplatte links"/></div>
      <div class="field"><label for={`cut-kind-${row.key}`}>Ergebnisart *</label><select use:searchableSelect={row.kind} id={`cut-kind-${row.key}`} bind:value={row.kind} required><option value="">Bitte auswählen</option><option value="finished">Fertigteil</option><option value="remnant">Weiterverwendbares Reststück</option><option value="scrap">Verschnitt / Ausschuss</option></select></div>
      <div class="field"><label for={`cut-quantity-${row.key}`}>Tatsächliche Menge *</label><input id={`cut-quantity-${row.key}`} inputmode="decimal" bind:value={row.quantity} required/><span class="field-help">Eine konkrete Platte als ein Stück führen. Flächenmengen in m² angeben.</span></div>
      <div class="field"><label for={`cut-unit-${row.key}`}>Einheit dieses Ausgangs *</label><select use:searchableSelect={row.unit} id={`cut-unit-${row.key}`} bind:value={row.unit} required><option value="">Einheit auswählen</option><option value="piece">Stück</option><option value="m2">m²</option></select></div>
      <div class="field"><label for={`cut-area-${row.key}`}>Nachgewiesene Gesamtfläche · mm²</label><input id={`cut-area-${row.key}`} inputmode="decimal" bind:value={row.area_mm2}/><span class="field-help">Für unregelmäßige Teile oder Verschnitt. Alternativ Breite und Länge unten angeben. 1 m² sind 1.000.000 mm².</span></div>
      <div class="field"><label for={`cut-order-${row.key}`}>Gehört zu Auftrag · optional</label><select use:searchableSelect={row.order_id} id={`cut-order-${row.key}`} bind:value={row.order_id}><option value="">Noch nicht zugeordnet</option>{#each lookups.orders||[] as order}<option value={order.id}>{order.name}</option>{/each}</select></div>
      {#each [{key:'width_mm',label:'Breite · mm'},{key:'height_mm',label:'Länge · mm'},{key:'thickness_mm',label:'Stärke · mm'}] as field}<div class="field"><label for={`cut-${field.key}-${row.key}`}>{field.label} · optional</label><input id={`cut-${field.key}-${row.key}`} inputmode="decimal" bind:value={row[field.key]}/></div>{/each}
    </div>
  </div>{/each}
  <button type="button" class="btn mt" disabled={rows.length>=100} onclick={()=>rows=[...rows,empty()]}><Icon name="plus" size={16}/>Weiteres Teil aufnehmen</button>
  <p class="field-help mt">Der Server prüft die Mengen- und Kostenbilanz. Erst die Bestätigung verbucht den Zuschnitt und erzeugt die einzelnen Bestände.</p>
</section>
<style>.cutting-outputs{grid-column:1/-1}.cutting-outputs>h3{font-size:17px;margin-bottom:10px}.cutting-output{margin-top:24px;border-top:1px solid var(--line);padding-top:14px}.cutting-output-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.cutting-output-header h4{font-size:14px;font-weight:600}.cutting-outputs .field-grid{gap:18px}</style>
