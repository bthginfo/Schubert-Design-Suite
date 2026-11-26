<script lang="ts">
  import {searchableSelect} from '#lib/client/searchable-select.ts';
import CatalogReferenceBanner from './CatalogReferenceBanner.svelte';
  import {scrollRegion} from '#lib/client/scroll-region.ts';
  import {page} from '$app/state';import {goto,replaceState,afterNavigate} from '$app/navigation';import {onMount,untrack} from 'svelte';
  import {dispatchCreateContext} from '#lib/client/create-context.ts';
  import type {AppData,Action,Row} from '#lib/client/types.ts';import {display,label,recordName,permitted} from '#lib/client/api.ts';import {currencyAmount} from '#lib/client/finance.ts';import Icon from './Icon.svelte';import Status from './Status.svelte';import RecordEditor from './RecordEditor.svelte';import ActionDialog from './ActionDialog.svelte';import UploadPanel from './UploadPanel.svelte';import DispatchCalendar from './DispatchCalendar.svelte';import WorkflowGuide from './WorkflowGuide.svelte';import CreditOffset from './CreditOffset.svelte';import ExportDialog from './ExportDialog.svelte';
  let {data}:{data:AppData}=$props();let query=$state('');let status=$state('');let selected:string[]=$state([]);let editor=$state(false);let editorInitial:Row=$state({});let activeAction:Action|null=$state(null);let savedViews:{name:string;q:string;status:string;filters?:Record<string,string>}[]=$state([]);let viewName=$state('');let viewError=$state('');let viewMessage=$state('');let exporting=$state(false);
  let filtersOpen=$state(false),selectionMode=$state(false);
  const module=$derived(data.module!);const rows=$derived(data.records||[]);const financeColumns:Record<string,string[]>={'cost-estimates':['order_id','as_of','uncommitted_remaining_amount','currency','status'],'performance-valuations':['order_id','effective_on','value_net','currency','status'],'liquidity-openings':['bank_account_id','as_of','amount','currency','status'],'material-requirements':['order_id','product_id','quantity','unit','required_on','status'],receivables:['invoice_number','party_name','open_amount','due_date','status'],payables:['invoice_number','party_name','open_amount','due_date','status'],'bank-accounts':['holder','iban','verified_at','status'],'bank-imports':['name','bank_account_id','status','created_at'],'bank-transactions':['booking_date','counterparty','amount','reference','status'],'credit-offsets':['created_at','party_name','amount','reason'],dunning:['receivable_id','stage','next_due_date','status'],datev:['name','starts_on','ends_on','status'],'accounting-periods':['name','starts_on','ends_on','status']};const columns=$derived(financeColumns[module?.slug]||module?.columns?.filter(c=>c!=='id')||['name','status']);const createLabels:Record<string,string>={'bank-imports':'Kontoauszug hinzufügen',dunning:'Zahlungserinnerung vorbereiten',datev:'DATEV-Übergabe vorbereiten','accounting-periods':'Buchungsperiode anlegen','cost-estimates':'Restschätzung vorbereiten','performance-valuations':'Leistungsbewertung vorbereiten','liquidity-openings':'Anfangsbestand vorbereiten'};const createLabel=$derived(createLabels[module.slug]||module.singular+' anlegen');const canExport=$derived((permitted(data,'finance')||permitted(data,'finance.read'))&&(permitted(data,module.permission||'')||permitted(data,(module.permission||'')+'.read')));const exportFilters=$derived(new URLSearchParams({kind:module.slug,...Object.fromEntries([...normalizedFilters()].filter(([key])=>filterKeys.includes(key)))}));const canCreate=$derived(module.slug!=='documents'&&!module?.readOnly&&!module?.readonly&&permitted(data,module?.permission||`${module?.commandPrefix}.create`)&&!createBlocked);const availableStatuses=$derived([...new Set([...[page.url.searchParams.get('status')].filter(Boolean),...(module.states||[]),...module.actions.flatMap(a=>[...(a.statuses||[]),...(a.targetStatus?[a.targetStatus]:[])]),...rows.map(r=>r.status||r.legal_status).filter(Boolean),...(module?.fields.find(f=>f.key==='status')?.options||[]).map(o=>o.value)])]);
  // The server rejects commercial order changes for field and dispatch roles, so no create button there.
  // Office follow-ups that field roles may still create stay available as a secondary action.
  const createBlocked=$derived(module.slug==='orders'&&['Employee','Workshop','Dispatcher'].includes(data.context?.role??''));
  const createSecondary=$derived(['Employee','Workshop'].includes(data.context?.role??'')&&['tasks','work-packages'].includes(module.slug));
  const filterKeys=['q','status','from','to','business_unit','bucket','currency','disputed','as_of','product_id','required_on','unallocated','direction','order_id','metric','mode','date','employee_id','customer_id','supplier_id'];
  const contextFilters=$derived([...normalizedFilters()].filter(([key])=>filterKeys.includes(key)&&!['q','status','mode','date','employee_id'].includes(key)));
  const contextCustomer=$derived((permitted(data,'crm')||permitted(data,'crm.read'))?data.lookups?.customers?.find(item=>item.id===page.url.searchParams.get('customer_id')?.toLowerCase()):undefined);
  const uploadCustomer=$derived(module.slug==='documents'&&permitted(data,'crm')&&data.summary?.customerContext?.id===contextCustomer?.id?data.summary.customerContext:undefined);
  const filterNames:Record<string,string>={customer_id:'Kunde',supplier_id:'Lieferant',metric:'Kennzahl',from:'Von',to:'Bis',business_unit:'Geschäftsbereich',bucket:'Fälligkeitsgruppe',currency:'Währung',disputed:'Strittig',as_of:'Stichtag',product_id:'Material',required_on:'Bedarf am',unallocated:'Ohne Zuordnung',direction:'Zahlungsrichtung',order_id:'Auftrag'};
  function normalizedFilters(){const params=new URLSearchParams([...page.url.searchParams]),legacy=params.get('order');if(legacy&&!params.has('order_id'))params.set('order_id',legacy);params.delete('order');return params;}
  function listParams(){return new URLSearchParams([...normalizedFilters()].filter(([key])=>filterKeys.includes(key)));}
  function nextHref(){const params=listParams();params.set('cursor',String(data.summary?.nextCursor||''));return `/${module.slug}?${params}`;}
  function filterHref(params:URLSearchParams){const applied=new URLSearchParams([...params].filter(([key,value])=>filterKeys.includes(key)&&value!==''));applied.sort();return '/'+module.slug+(applied.size?'?'+applied:'');}
  function viewHref(view:{q:string;status:string;filters?:Record<string,string>}){return filterHref(new URLSearchParams(view.filters??{q:view.q,status:view.status}));}
  const currentViewHref=$derived(filterHref(listParams()));
  const appliedQuery=$derived(page.url.searchParams.get('q')||page.url.searchParams.get('status'));

  function contextLabel(key:string,value:string){if(['customer_id','supplier_id'].includes(key))return data.lookups?.[key==='customer_id'?'customers':'suppliers']?.find(item=>item.id===value.toLowerCase())?.name||'Ausgewählt';if(key==='metric')return ({ordered_net:'Beauftragter Nettowert',invoiced_net:'Fakturierter Nettowert',performance_value:'Bewertete Leistung',received_payments:'Zahlungseingänge'} as Record<string,string>)[value]||value;if(['product_id','order_id'].includes(key)){const ref=key==='product_id'?'products':'orders';return data.lookups?.[ref]?.find(item=>item.id===value)?.name||'Gezielt ausgewählt';}if(['from','to','as_of','required_on'].includes(key))return display(value,'date');if(value==='true')return 'Ja';if(value==='false')return 'Nein';return display(value,key);}
  $effect(()=>{query=page.url.searchParams.get('q')||'';status=page.url.searchParams.get('status')||'';selected=[];});
  let shownModule=$state('');
  $effect(()=>{if(module.slug!==shownModule){shownModule=module.slug;editor=false;editorInitial={};activeAction=null;}});
  // Kit 3 shallow replacement changes page.state/page.shallow, not page.url.
  // Consume a create request once per completed navigation, never on data refresh.
  afterNavigate(()=>untrack(()=>{
    const requested=new URL(window.location.href);
    if(requested.pathname.replace(/\/$/,'')!==`/${module.slug}`||requested.searchParams.get('create')!=='1')return;
    const consumed=new URL(requested.href);consumed.searchParams.delete('create');
    if(canCreate)openEditor(data.summary?.createInitialValues||{});
    // History availability must not prevent working in the already opened editor.
    void replaceState(consumed,page.state).catch(()=>{});
  }));
  function openEditor(initial:Row=data.summary?.createInitialValues||{}){editorInitial=initial;editor=true;}
  function createDispatch({day,employeeId}:{day:string;employeeId?:string}){if(canCreate)openEditor(dispatchCreateContext(day,employeeId));}
  function resetHref(clearContext=false){const params=clearContext?new URLSearchParams():listParams();params.delete('q');params.delete('status');if(clearContext&&module.slug==='dispatch')for(const key of ['mode','date','employee_id']){const value=page.url.searchParams.get(key);if(value)params.set(key,value);}return `/${module.slug}${params.size?'?'+params:''}`;}
  onMount(()=>{try{const stored=JSON.parse(localStorage.getItem(`schubert-views:${data.user?.id}:${module.slug}`)||'[]');savedViews=Array.isArray(stored)?stored.filter(v=>v&&typeof v.name==='string'&&typeof v.q==='string'&&typeof v.status==='string'):[];}catch{savedViews=[];}});
  function search(event?:SubmitEvent){event?.preventDefault();const params=listParams();if(query)params.set('q',query);else params.delete('q');if(status)params.set('status',status);else params.delete('status');goto(`/${module.slug}${params.size?'?'+params:''}`);}
  function saveView(){
    viewError='';viewMessage='';const name=viewName.trim();
    if(!name){viewError='Bitte geben Sie einen Namen für die Ansicht ein.';return;}
    const next=[...savedViews.filter(v=>v.name!==name),{name,q:query,status,filters:{...Object.fromEntries(listParams()),q:query,status}}];
    try{localStorage.setItem(`schubert-views:${data.user?.id}:${module.slug}`,JSON.stringify(next));savedViews=next;viewName='';viewMessage='Ansicht „'+name+'“ auf diesem Gerät gespeichert.';}
    catch{viewError='Die Ansicht konnte auf diesem Gerät nicht gespeichert werden.';}
  }
  function toggle(id:string,checked:boolean){selected=checked?[...new Set([...selected,id])]:selected.filter(v=>v!==id);}
  function cellValue(record:Row,key:string){if(isMoney(key))return currencyAmount(record[key],record.currency);if(key==='invoice_number')return record.invoice_number||record.document_number||'Beleg';if(key==='party_name')return record.party_name||display(record.party_id,'party_id',data);if(key.endsWith('_name')&&record[key]===undefined)return display(record[key.replace(/_name$/,'_id')],key.replace(/_name$/,'_id'),data);return display(record[key],module.fields.find(f=>f.key===key)?.type==='date'?'date':key,data);}
  function isMoney(key:string){return /amount|price|total|value_net/.test(key);}
</script>
<div class="page-heading" data-tour="records-heading"><div><h1>{module.label}</h1><p>{module.description}</p></div><div class="page-heading-actions">{#if canExport}<button class="btn" onclick={()=>exporting=true}><Icon name="download" size={16}/>Export</button>{/if}{#if canCreate}<button class="btn" class:primary={!createSecondary} onclick={()=>openEditor()}><Icon name="plus" size={16}/>{createLabel}</button>{/if}</div></div>
{#if module.slug==='products'}<CatalogReferenceBanner {data}/>{/if}<WorkflowGuide {data}/>{#if module.slug==='credit-offsets'}<CreditOffset {data}/>{/if}{#if ['documents','imports','price-imports'].includes(module.slug)&&!module.readOnly&&!module.readonly}<UploadPanel {data} importMode={module.slug!=='documents'} entityType={uploadCustomer?'customers':undefined} entityId={uploadCustomer?.id} entityName={uploadCustomer?.name}/>{/if}
{#if module.slug==='dispatch'}<DispatchCalendar {data} oncreate={canCreate?createDispatch:undefined}/>{/if}
<section class="panel records-workspace" aria-label={module.label}>
  <form class="record-toolbar" onsubmit={search}>
    <div class="record-tools">
      <div class="search-field">
        <Icon name="search" size={18}/>
        <label class="sr-only" for="record-search">{module.label} durchsuchen</label>
        <input id="record-search" type="search" bind:value={query} placeholder={`${module.label} durchsuchen`}/>
        <button type="submit" class="record-search-submit">Suchen</button>
      </div>
      <button type="button" class="btn record-filter-toggle" aria-expanded={filtersOpen} aria-controls="record-filters" onclick={()=>filtersOpen=!filtersOpen}>
        <Icon name="filter" size={16}/>Filter{#if page.url.searchParams.get('status')||contextFilters.length}<span class="record-filter-active">aktiv</span>{/if}
      </button>
      {#if rows.length}<button type="button" class="btn record-select-toggle" aria-pressed={selectionMode}
        onclick={()=>{selectionMode=!selectionMode;if(!selectionMode)selected=[];}}>{selectionMode?'Fertig':'Auswählen'}</button>{/if}
    </div>
    <div id="record-filters" class="record-filters" hidden={!filtersOpen}>
      <div class="field">
        <label for="record-status">Status filtern</label>
        <select use:searchableSelect={status} id="record-status" class="field-control filter-select" bind:value={status}>
          <option value="">Alle Status</option>
          {#each availableStatuses as item}<option value={item}>{display(item,'status')}</option>{/each}
        </select>
      </div>
      <button type="submit" class="btn">Anwenden</button>
      {#if appliedQuery}<a class="text-link" href={resetHref()}>Suche und Status zurücksetzen</a>{/if}
    </div>
  </form>
  {#if filtersOpen}
  <details class="record-save-view"><summary class="small muted" style="cursor:pointer">Aktuelle Filter als Ansicht speichern</summary><div class="toolbar mt"><div class="field"><label for="view-name">Name der Ansicht</label><input id="view-name" bind:value={viewName} placeholder="Zum Beispiel Offene Vorgänge"/></div><button class="btn" onclick={saveView}>Ansicht speichern</button></div>{#if viewError}<p class="field-error" role="alert">{viewError}</p>{:else if viewMessage}<p class="field-help" role="status">{viewMessage}</p>{/if}</details>
  {/if}
  <p class="record-result-count">{rows.length} {rows.length===1?'Eintrag':'Einträge'}{data.summary?.total>rows.length?` von ${data.summary.total}`:''}</p>
{#if contextFilters.length}<div class="notice info"><Icon name="filter" size={17}/><div><strong class="small">{page.url.searchParams.has('metric')?'Aus der Auswertung übernommene Auswahl':contextFilters.some(([key])=>key==='order_id')?'Auswahl für diesen Auftrag':'Aktive Auswahl'}</strong><p class="field-help">{contextFilters.map(([key,value])=>(filterNames[key]||label(key))+': '+contextLabel(key,value)).join(' · ')}</p>{#if page.url.searchParams.get('metric')==='performance_value'}<p class="field-help mt">Gezeigt wird je Auftrag der letzte bestätigte Leistungsstand bis zum Stichtag. Er kann vor Beginn des gewählten Zeitraums liegen.</p>{:else if page.url.searchParams.get('metric')==='ordered_net'}<p class="field-help mt">Diese Aufträge haben im gewählten Zeitraum eine Annahme oder einen wirksamen Nachtrag. Der Auftragsgesamtwert kann mehrere Ereignisse enthalten.</p>{:else if page.url.searchParams.get('metric')==='received_payments'}<p class="field-help mt">Eingänge und belegte Kundenerstattungen bilden die Kennzahl. Bei einem Geschäftsbereich zählt nur die zugeordnete Teilmenge; die Belegliste zeigt jeweils die vollständige Zahlung.</p>{/if}{#if contextCustomer}<a class="btn small mt" href={`/customers/${contextCustomer.id}`}><Icon name="arrow" size={14}/>Zur Kundenübersicht</a>{/if}<a class="text-link mt" href={resetHref(true)}>Alle Filter aufheben<Icon name="close" size={12}/></a></div></div>{/if}
{#if savedViews.length}<div class="subnav" aria-label="Gespeicherte Ansichten">{#each savedViews as view}<a class:active={currentViewHref===viewHref(view)} aria-current={currentViewHref===viewHref(view)?'true':undefined} href={viewHref(view)}>{view.name}</a>{/each}</div>{/if}
{#if selected.length}<div class="notice info"><Icon name="check"/><div class="notice-content">{selected.length} Einträge ausgewählt<div class="inline-actions mt">{#each module.actions.filter(a=>(a.permission?permitted(data,a.permission):permitted(data,module.permission||''))&&rows.filter(r=>selected.includes(r.id)).every(r=>!a.statuses?.length||a.statuses.includes(r.status||r.legal_status))) as action}<button class="btn small" onclick={()=>activeAction=action}>{action.label}</button>{/each}<button class="btn small ghost" onclick={()=>selected=[]}>Auswahl aufheben</button></div></div></div>{/if}
<div class="table-scroll desktop-only" use:scrollRegion={module.label}><table class="data-table"><thead><tr>{#if selectionMode}<th style="width:35px"><input type="checkbox" aria-label="Alle sichtbaren Einträge auswählen" indeterminate={selected.length>0&&selected.length<rows.length} checked={rows.length>0&&selected.length===rows.length} onchange={(e)=>selected=e.currentTarget.checked?rows.map(r=>r.id):[]}/></th>{/if}{#each columns as key}<th class:number={isMoney(key)}>{module.fields.find(f=>f.key===key)?.label||label(key)}</th>{/each}<th><span class="sr-only">Öffnen</span></th></tr></thead><tbody>{#each rows as record}<tr>{#if selectionMode}<td><input type="checkbox" checked={selected.includes(record.id)} aria-label={`${recordName(record,data)} auswählen`} onchange={(e)=>toggle(record.id,e.currentTarget.checked)}/></td>{/if}{#each columns as key,index}<td class:number={isMoney(key)}>{#if key.includes('status')}<Status value={record[key]}/>{:else if index===0||['name','title','display_name'].includes(key)}<a class="record-title" href={`/${module.slug}/${record.id}`}>{cellValue(record,key)}</a>{#if index===0&&record.number&&record.number!==record[key]}<span class="record-subtitle">{record.number}</span>{/if}{:else}{cellValue(record,key)}{/if}</td>{/each}<td><a class="icon-button" aria-label={`${recordName(record,data)} öffnen`} href={`/${module.slug}/${record.id}`}><Icon name="chevron" size={16}/></a></td></tr>{/each}</tbody></table></div><div class="mobile-only mobile-records">{#each rows as record}<article class="mobile-record"><div class="mobile-record-head">{#if selectionMode}<label class="check-field"><input type="checkbox" checked={selected.includes(record.id)} aria-label={`${recordName(record,data)} auswählen`} onchange={(e)=>toggle(record.id,e.currentTarget.checked)}/></label>{/if}<a href={`/${module.slug}/${record.id}`} style="flex:1"><h3>{recordName(record,data)}</h3></a>{#if record.status||record.legal_status}<Status value={record.status||record.legal_status}/>{/if}</div><a href={`/${module.slug}/${record.id}`} class="mobile-record-details">{#each columns.slice(1).filter(k=>!k.includes('status')) as key}<span>{#if module.slug==='leave'}{module.fields.find(field=>field.key===key)?.label||label(key)}: {/if}{cellValue(record,key)}</span>{/each}</a></article>{/each}</div>{#if !rows.length}<div class="empty-state"><div class="empty-icon"><Icon name={module.slug==='documents'?'file':'briefcase'} size={25}/></div><h3>{appliedQuery||contextFilters.length?'Keine passenden Einträge':'Hier sind noch keine Einträge'}</h3><p>{appliedQuery||contextFilters.length?'Passen Sie Ihre Suche oder die angezeigten Filter an.':canCreate?`Noch keine Einträge in „${module.label}“. Mit „${module.singular?module.singular+' anlegen':'Neu anlegen'}“ legen Sie den ersten an.`:'Bestätigte Einträge erscheinen hier nach dem zugehörigen Prüf- oder Buchungsschritt.'}</p>{#if appliedQuery||contextFilters.length}<a class="btn" href={resetHref(!appliedQuery)}>Filter zurücksetzen</a>{:else if canCreate}<button class="btn" class:primary={!createSecondary} onclick={()=>openEditor()}><Icon name="plus" size={16}/>{createLabel}</button>{/if}</div>{/if}{#if page.url.searchParams.has('cursor')||data.summary?.hasMore}<footer class="panel-footer">{#if page.url.searchParams.has('cursor')}<a class="text-link" href={currentViewHref}>Zur ersten Seite</a>{/if}{#if data.summary?.hasMore}<span class="small muted">Weitere Einträge sind verfügbar.</span><a class="btn small" href={nextHref()}>Nächste Seite<Icon name="arrow" size={14}/></a>{/if}</footer>{/if}</section>
{#if editor}<RecordEditor {data} initialValues={editorInitial} onclose={()=>editor=false}/>{/if}{#if activeAction}<ActionDialog {data} action={activeAction} records={rows.filter(r=>selected.includes(r.id))} onclose={()=>activeAction=null} onsaved={()=>{selected=[];}}/>{/if}

{#if exporting}<ExportDialog {data} filters={exportFilters} onclose={()=>exporting=false}/>{/if}


<style>
  .record-toolbar { margin: 0; }
  .record-tools { display: flex; align-items: stretch; gap: 8px; }
  .record-tools .search-field { display: flex; flex: 1 1 200px; min-width: 0; padding-inline-start: 12px; padding-inline-end: 4px; }
  .search-field input { flex: 1; min-width: 0; }
  .record-search-submit { min-height: 38px; padding: 5px 10px; border-radius: 8px; color: var(--forest); font-weight: 600; }
  .record-search-submit:hover, .record-select-toggle[aria-pressed=true], .record-filter-toggle[aria-expanded=true] { background: var(--accent-wash); color: var(--forest); }
  .record-filters { display: flex; gap: 10px; align-items: flex-end; padding-top: 14px; flex-wrap: wrap; }
  .record-filters[hidden] { display: none; }
  .record-filters .field { flex: 0 1 16rem; min-width: 11rem; }
  .record-filters .text-link { min-height: 44px; }
  .record-filter-active { color: var(--forest); font-size: .75rem; }
  .record-save-view { margin: 8px 20px 0; }
  .record-result-count { color: var(--muted); margin: 0 20px 10px; font-size: .8rem; }
  .record-tools :global(.btn) { min-height: 44px; }
  @media (max-width: 760px) {
    .record-tools { flex-wrap: wrap; }
    .record-tools .search-field { flex-basis: 100%; }
    .record-search-submit { min-height: 44px; }
    .record-save-view { margin-inline: 12px; }
    .record-result-count { margin-inline: 14px; }
  }
</style>
