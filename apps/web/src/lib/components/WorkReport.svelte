<script lang="ts">
  import {searchableSelect,visibleFieldControl} from '#lib/client/searchable-select.ts';
  import {scrollRegion} from '#lib/client/scroll-region.ts';
  import {tick,untrack} from 'svelte';
  import {refreshAll} from '$app/navigation';import {command,display} from '#lib/client/api.ts';import type {AppData} from '#lib/client/types.ts';import {orderParts} from '#lib/client/time-format.ts';import Icon from './Icon.svelte';
  let {data,initialOrderId='',initialWorkPackageId='',activity=''}:{data:AppData;initialOrderId?:string;initialWorkPackageId?:string;activity?:string}=$props();let selectedOrder=$state('');let workPackage=$state(untrack(()=>initialWorkPackageId));let performedOn=$state(new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(new Date()));let description=$state('');let quantity=$state('');let unit=$state('piece');let busy=$state(false);let error=$state('');let reportSaved=$state(false);
  // The confirmation stays beside the button until the next entry is started.
  let confirmation=$state('');let fieldErrors=$state<{order?:string;description?:string;quantity?:string}>({});
  const ownReports=$derived((data.related?.work_reports??[]).filter(report=>report.employee_id===data.context?.employeeId));
  const units:Record<string,string>={piece:'Stück',m:'m',m2:'m²',m3:'m³',kg:'kg',h:'h',package:'Pauschale'};
  function startEntry(){confirmation='';}
  function firstWords(text:string,count=8){const words=text.trim().split(/\s+/);return words.slice(0,count).join(' ')+(words.length>count?' …':'');}
  async function focusField(id:string){await tick();const node=visibleFieldControl(document.getElementById(id));node?.focus();node?.scrollIntoView({block:'center'});}
  async function save(event:SubmitEvent){
    event.preventDefault();if(busy)return;error='';
    const orderId=selectedOrder||initialOrderId;const text=description.trim();const amount=quantity.trim().replace(',','.');
    const problems:typeof fieldErrors={};
    if(!reportSaved){if(!orderId)problems.order='Bitte wählen Sie den Auftrag, zu dem die Rückmeldung gehört.';if(text.length<3)problems.description='Bitte beschreiben Sie kurz, was erledigt wurde (mindestens 3 Zeichen).';}
    if(amount!==''&&!(Number(amount)>0))problems.quantity='Bitte eine Menge größer als 0 eingeben, zum Beispiel 3,5.';
    fieldErrors=problems;
    if(problems.order||problems.description||problems.quantity){confirmation='';await focusField(problems.order?'report-order':problems.description?'report-description':'report-quantity');return;}
    busy=true;confirmation='';
    try{
      if(!reportSaved){await command('workforce.time.report',undefined,{order_id:orderId,work_package_id:workPackage||undefined,performed_on:performedOn,description});reportSaved=true;}
      if(amount!=='')await command('workforce.time.quantity',undefined,{order_id:orderId,work_package_id:workPackage||undefined,performed_on:performedOn,quantity:amount,unit,activity:activity||description});
      const order=orderParts(display(orderId,'order_id',data)).number;
      confirmation=`${order} · „${firstWords(text)}“${amount!==''?` · ${quantity.trim()} ${units[unit]??unit}`:''}`;
      description='';quantity='';reportSaved=false;await refreshAll().catch(()=>{});
    }catch(e){error=(reportSaved?'Der Bericht ist bereits gespeichert. Die Menge konnte noch nicht übernommen werden. ':'')+(e instanceof Error?e.message:'Bitte versuchen Sie es erneut.');}
    finally{busy=false;}
  }
</script>
<section class="panel"><header class="panel-header"><div><h2>Was wurde erledigt?</h2><p>Eine kurze Rückmeldung ergänzt Ihre Zeit. Sie können sie auch später nachtragen.</p></div><Icon name="pen" size={18}/></header>
<form class="panel-body" onsubmit={save} novalidate><div class="field-grid">
  <div class="field"><label for="report-order">Auftrag *</label><select use:searchableSelect={selectedOrder||initialOrderId} id="report-order" value={selectedOrder||initialOrderId} onchange={e=>{selectedOrder=e.currentTarget.value;fieldErrors.order=undefined;startEntry();}} required disabled={reportSaved} aria-invalid={fieldErrors.order?'true':undefined} aria-describedby={fieldErrors.order?'report-order-error':undefined}><option value="">Auftrag auswählen</option>{#each data.lookups?.orders||[] as order}<option value={order.id}>{order.name}</option>{/each}</select>{#if fieldErrors.order}<span class="field-error" id="report-order-error">{fieldErrors.order}</span>{:else}<span class="field-help">Wählen Sie den Auftrag, an dem Sie tatsächlich gearbeitet haben.</span>{/if}</div>
  <div class="field"><label for="report-performed">Leistungstag *</label><input id="report-performed" type="date" bind:value={performedOn} oninput={startEntry} required disabled={reportSaved}/></div>
  {#if data.lookups?.['work-packages']?.length}<div class="field full"><label for="report-package">Arbeitspaket · optional</label><select use:searchableSelect={workPackage} id="report-package" bind:value={workPackage} disabled={reportSaved}><option value="">Gesamter Auftrag</option>{#each data.lookups['work-packages'] as work}<option value={work.id}>{work.name}</option>{/each}</select></div>{/if}
  <div class="field full"><label for="report-description">Ihre Rückmeldung *</label><textarea id="report-description" bind:value={description} oninput={()=>{fieldErrors.description=undefined;startEntry();}} required minlength="3" disabled={reportSaved} aria-invalid={fieldErrors.description?'true':undefined} aria-describedby={fieldErrors.description?'report-description-error':'report-description-help'} placeholder="Zum Beispiel: Aufmaß im Erdgeschoss abgeschlossen. Eine Anschlussposition ist noch mit dem Kunden zu klären."></textarea>{#if fieldErrors.description}<span class="field-error" id="report-description-error">{fieldErrors.description}</span>{:else}<span class="field-help" id="report-description-help">Was ist fertig, was ist offen? Eine kurze sachliche Beschreibung genügt.</span>{/if}</div>
  <div class="field"><label for="report-quantity">Erbrachte Menge · optional</label><input id="report-quantity" inputmode="decimal" bind:value={quantity} oninput={()=>{fieldErrors.quantity=undefined;startEntry();}} aria-invalid={fieldErrors.quantity?'true':undefined} aria-describedby={fieldErrors.quantity?'report-quantity-error':'report-quantity-help'}/>{#if fieldErrors.quantity}<span class="field-error" id="report-quantity-error">{fieldErrors.quantity}</span>{:else}<span class="field-help" id="report-quantity-help">Zum Beispiel 3,5. Die Menge ist von Ihrer Arbeitszeit getrennt.</span>{/if}</div>
  <div class="field"><label for="report-unit">Passende Einheit</label><select use:searchableSelect={unit} id="report-unit" bind:value={unit}><option value="piece">Stück</option><option value="m">Meter</option><option value="m2">Quadratmeter</option><option value="m3">Kubikmeter</option><option value="kg">Kilogramm</option><option value="h">Stunden</option><option value="package">Pauschale</option></select></div>
</div>
<div class="save-row mt"><button type="submit" class="btn primary" disabled={busy}>{busy?'Wird gespeichert …':reportSaved?'Offene Menge speichern':'Rückmeldung speichern'}<Icon name="check" size={16}/></button>
  <div class="save-result" role="status" aria-atomic="true">{#if confirmation}<Icon name="check" size={16}/><p><strong>Rückmeldung gespeichert</strong><span class="save-summary">{confirmation}</span></p>{/if}</div>
</div>
{#if error}<div class="notice error mt" role="alert"><Icon name="alert"/><div>{error}</div></div>{/if}
<p class="field-help mt">Die Rückmeldung benötigt eine Serververbindung. Ihre lokale Zeiterfassung können Sie davon unabhängig fortsetzen.</p></form>{#if ownReports.length}<div class="panel-body" style="border-top:1px solid var(--line)"><h3 style="font-size:16px;margin-bottom:20px">Meine letzten Rückmeldungen</h3>{#each ownReports.slice(0,8) as report}<article class="timeline-item"><h3>{display(report.order_id,'order_id',data)}</h3><p>{display(report.performed_on,'date')}</p><p style="white-space:pre-wrap">{report.description}</p></article>{/each}</div>{/if}{#if data.related?.time_quantity_entries?.length}<div class="panel-body" style="border-top:1px solid var(--line)"><h3 style="font-size:16px;margin-bottom:18px">Meine letzten Leistungsangaben</h3><div class="table-scroll" use:scrollRegion={'Meine Leistungsangaben'}><table class="data-table"><thead><tr><th>Tag</th><th>Auftrag</th><th>Menge</th><th>Leistung</th></tr></thead><tbody>{#each data.related.time_quantity_entries.slice(0,10) as entry}<tr><td>{display(entry.performed_on,'date')}</td><td>{display(entry.order_id,'order_id',data)}</td><td>{display(entry.quantity,'quantity')} {display(entry.unit)}</td><td>{display(entry.activity,'activity')}</td></tr>{/each}</tbody></table></div></div>{/if}</section>
<style>
.save-row{display:flex;flex-wrap:wrap;align-items:center;gap:12px 16px}
.save-result{display:flex;align-items:flex-start;gap:8px;flex:1 1 220px;min-width:0;color:var(--forest)}
.save-result:empty{flex:0 1 0}
.save-result :global(svg){flex:none;margin-top:3px}
.save-result p{min-width:0;margin:0;font-size:13px;line-height:1.5}
.save-result strong{display:block;font-weight:600}
.save-summary{display:block;overflow:hidden;color:var(--ink);text-overflow:ellipsis;white-space:nowrap}
@media(max-width:760px){.save-row .btn{width:100%}.save-result{flex-basis:100%}}
</style>
