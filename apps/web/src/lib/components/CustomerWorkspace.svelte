<script lang="ts">
  import {tick} from 'svelte';
  import {page} from '$app/state';
  import {goto} from '$app/navigation';
  import type {CustomerWorkspaceSection} from '@schubert/contracts';
  import type {AppData, Row} from '#lib/client/types.ts';
  import {display, recordName, permitted} from '#lib/client/api.ts';
  import {createHref} from '#lib/client/create-context.ts';
  import Icon from './Icon.svelte';
  import Status from './Status.svelte';
  import RecordEditor from './RecordEditor.svelte';
  import RecordDetail from './RecordDetail.svelte';

  let {data}: {data: AppData} = $props();
  let editing = $state(false);
  const customer = $derived(data.detail!);
  const sections: CustomerWorkspaceSection[] = $derived(data.summary.customerWorkspace?.sections ?? []);
  const nextActions=$derived(data.summary.customerWorkspace?.nextActions??[]);
  const selected = $derived(sections.find(section => section.key === page.url.searchParams.get('bereich')));
  const detailed = $derived(page.url.searchParams.get('ansicht') === 'akte');
  const current = $derived(sections.filter(section => ['orders','inquiries','quotes'].includes(section.key))
    .flatMap(section => section.items.filter(item => !['completed','cancelled','closed','archived','won','lost','accepted','expired','superseded','rejected'].includes(item.status))
      .slice(0,3).map(item => ({...item, section}))).slice(0,6));
  const descriptions: Record<string,string> = {
    orders:'laufend', inquiries:'offen', quotes:'in Bearbeitung', studio:'aktive Entwürfe', documents:'im Kundenordner', invoices:'in Vorbereitung',
  };
  async function select(section?: CustomerWorkspaceSection) {
    const params = new URLSearchParams();if(section) params.set('bereich',section.key);
    await goto(`/customers/${customer.id}${params.size?'?'+params:''}`,{reset:false});
    await tick();
    const heading=document.getElementById(section?'customer-records-title':'customer-name');
    heading?.focus({preventScroll:true});
    heading?.scrollIntoView({block:window.matchMedia('(max-width:760px)').matches?'start':'nearest',behavior:'auto'});
  }
  function href(section: CustomerWorkspaceSection, item: Row) {return `/${section.slug}/${item.id}`;}
  const initials = $derived(customer.name?.split(/\s+/).slice(0,2).map((word:string)=>word[0]).join('') || 'K');
</script>

{#if detailed}
  <a class="text-link mb" href={`/customers/${customer.id}`}><Icon name="back" size={16}/>Zur Kundenübersicht</a>
  <RecordDetail {data}/>
{:else}
  <div class="customer-workspace" data-customer-area={selected?.key ?? 'overview'}>
    <a class="text-link customer-back" href="/customers"><Icon name="back" size={15}/>Alle Kunden</a>
    <header class="customer-heading">
      <div class="customer-identity"><span class="customer-avatar" aria-hidden="true">{initials}</span><div><p class="eyebrow">Kundenübersicht{customer.number?' · '+customer.number:''}</p><h1 id="customer-name" tabindex="-1">{customer.name}</h1><p>{[customer.city,customer.phone,customer.email].filter(Boolean).join(' · ') || 'Alle Vorgänge und Unterlagen an einem Ort.'}</p></div></div>
      <div class="customer-actions">
        {#if permitted(data,'crm')}<a class="btn primary" href={createHref('inquiries',{customer_id:customer.id})}><Icon name="plus" size={16}/>Anfrage anlegen</a>{/if}
        {#if permitted(data,'crm')}<button class="btn" onclick={()=>editing=true}><Icon name="edit" size={15}/>Kundendaten</button>{:else}<a class="btn" href={`/customers/${customer.id}?ansicht=akte`}>Kundendaten</a>{/if}
      </div>
    </header>

    {#if !selected}<section class="customer-next" aria-labelledby="customer-next-title"><header><h2 id="customer-next-title">Als Nächstes</h2><p>Offene Aufgaben und Rückmeldungen aus den zugeordneten Vorgängen.</p></header>{#if nextActions.length}<div>{#each nextActions as action}<a class="next-action" href={action.href}><span class="next-action-copy"><strong>{action.title}</strong><span>{action.detail}</span><small>{action.owner??'Noch nicht zugewiesen'} · {action.dueDate?'Termin '+display(action.dueDate,'date'):'Ohne festen Termin'}</small></span><span class="next-action-end">{#if action.overdue}<small class="overdue">Überfällig</small>{/if}<span>{action.action}<Icon name="arrow" size={14}/></span></span></a>{/each}</div>{:else}<p class="next-empty">Aktuell sind aus den für Sie sichtbaren Vorgängen keine nächsten Aktionen vorgemerkt.</p>{/if}</section>{/if}
    <nav class="customer-tiles" aria-label="Vorgänge dieses Kunden">
      {#each sections as section}<button class="customer-tile" class:chosen={selected?.key===section.key} aria-pressed={selected?.key===section.key} onclick={()=>select(section)}>
        <span class="tile-heading"><span class="tile-icon"><Icon name={section.icon} size={20}/></span><Icon name="arrow" size={16}/></span>
        <span class="tile-label">{section.label}<strong>{section.total}</strong></span>
        <span class="tile-description">{section.key==='documents'?`${section.total} ${section.total===1?'Datei':'Dateien'} im Kundenkontext`:`${section.active} ${descriptions[section.key]||'aktiv'}`}</span>
      </button>{/each}
    </nav>

    <div class="customer-columns"><section class="panel customer-focus" aria-label={selected?.label??'Aktuelle Vorgänge'}>
      <header class="panel-header"><div><h2 id="customer-records-title" tabindex="-1">{selected?.label??'Aktuelle Vorgänge'}</h2><p>{selected?'Die zuletzt bearbeiteten Vorgänge dieses Kunden.':'Was gerade läuft, ohne zwischen Bereichen zu wechseln.'}</p></div>{#if selected}<button class="text-link" onclick={()=>select()}>Zur Übersicht</button>{/if}</header>
      <div class="panel-body">
        {#if selected}
          {#each selected.items as item}<a class="customer-record" href={href(selected,item)}><span class="record-symbol"><Icon name={selected.icon} size={19}/></span><span class="record-copy"><strong>{recordName(item)}</strong><small>{item.number&&item.number!==item.title?item.number+' · ':''}{item.due_date?'Termin '+display(item.due_date,'date'):item.updated_at?'Bearbeitet '+display(item.updated_at,'updated_at'):selected.label}</small></span><Status value={item.status}/><Icon name="chevron" size={16}/></a>{:else}<div class="customer-empty"><Icon name={selected.icon} size={25}/><h3>Noch keine {selected.label}</h3><p>{selected.key==='studio'?'Planungen erscheinen hier, sobald sie mit einem Auftrag, Objekt oder einer Grabstätte dieses Kunden verbunden sind.':`Hier finden Sie künftig die ${selected.label} zu ${customer.name}.`}</p></div>{/each}
          <div class="customer-list-actions"><a class="btn" href={selected.href}>Alle {selected.label} ansehen<Icon name="arrow" size={15}/></a>
            {#if ['inquiries','quotes','orders','invoices'].includes(selected.key)&&permitted(data,({inquiries:'crm',quotes:'sales',orders:'orders',invoices:'billing'} as Record<string,string>)[selected.key])}<a class="btn primary" href={createHref(selected.key,{customer_id:customer.id})}><Icon name="plus" size={15}/>{({inquiries:'Anfrage',quotes:'Angebot',orders:'Auftrag',invoices:'Rechnung'} as Record<string,string>)[selected.key]} anlegen</a>{/if}
          </div>
        {:else}
          {#each current as item}<a class="customer-record" href={href(item.section,item)}><span class="record-symbol"><Icon name={item.section.icon} size={19}/></span><span class="record-copy"><small>{item.section.label}</small><strong>{recordName(item)}</strong><small>{item.due_date?'Termin '+display(item.due_date,'date'):item.number||'Ohne festen Termin'}</small></span><Status value={item.status}/><Icon name="chevron" size={16}/></a>{:else}<div class="customer-empty"><Icon name="briefcase" size={27}/><h3>Bereit für das nächste Vorhaben</h3><p>Beginnen Sie mit einer Anfrage. Kunde und Kontaktdaten werden direkt übernommen.</p>{#if permitted(data,'crm')}<a class="btn primary" href={createHref('inquiries',{customer_id:customer.id})}>Erste Anfrage anlegen<Icon name="arrow" size={15}/></a>{/if}</div>{/each}
        {/if}
      </div>
    </section>

    <aside class="customer-side">
      <section class="panel"><header class="panel-header"><h2>Kontakt</h2></header><div class="panel-body contact-details"><a class="text-link" href={`/customers/${customer.id}?ansicht=akte`}>Daten, Kommunikation & Verlauf<Icon name="arrow" size={15}/></a>
        {#if customer.phone}<a href={'tel:'+customer.phone}><span>Telefon</span><strong>{customer.phone}</strong></a>{/if}
        {#if customer.email}<a href={'mailto:'+customer.email}><span>E-Mail</span><strong>{customer.email}</strong></a>{/if}
        {#if customer.street||customer.city}<p><span>Adresse</span><strong>{#if customer.street}{customer.street}<br/>{/if}{[customer.postal_code,customer.city].filter(Boolean).join(' ')}</strong></p>{/if}
        {#if !customer.phone&&!customer.email&&!customer.city}<p class="small muted">Kontaktdaten können Sie über „Kundendaten“ ergänzen.</p>{/if}

      </div></section>
      {#if customer.notes}<section class="panel"><header class="panel-header"><h2>Gut zu wissen</h2></header><div class="panel-body"><p class="customer-note">{customer.notes}</p></div></section>{/if}
    </aside></div>
  </div>
{/if}
{#if editing}<RecordEditor {data} record={customer} onclose={()=>editing=false}/>{/if}

<style>
.customer-next{margin-bottom:24px;padding:20px 22px;border:1px solid var(--line);border-radius:15px;background:var(--paper)}.customer-next header{margin-bottom:8px}.customer-next h2{margin:0 0 6px;font-size:18px}.customer-next header p,.next-empty{font-size:13px;color:var(--muted);line-height:1.6}.next-action{display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:76px;padding:15px 0;border-bottom:1px solid var(--line);color:var(--ink);text-decoration:none}.next-action:last-child{border:0}.next-action-copy{display:grid;gap:5px;min-width:0;overflow-wrap:anywhere}.next-action-copy strong{font-size:14px}.next-action-copy>span,.next-action-copy small{font-size:12px;color:var(--muted)}.next-action-end{display:grid;justify-items:end;gap:8px;flex:none;font-size:12px;color:var(--forest)}.next-action-end>span{display:flex;align-items:center;gap:7px}.next-action .overdue{color:var(--danger);font-size:12px}.next-action:hover strong{text-decoration:underline}.next-action:focus-visible{outline:2px solid var(--forest);outline-offset:4px}@media(max-width:760px){.customer-next{padding:17px}.next-action{align-items:start;flex-direction:column;gap:11px}.next-action-end{width:100%;display:flex;align-items:center;justify-content:space-between;min-height:28px}}

  #customer-records-title,#customer-name{scroll-margin-top:90px}
  .customer-workspace{max-width:1440px;margin:0 auto}.customer-back{margin-bottom:20px}.customer-heading{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:28px}.customer-identity{display:flex;align-items:center;gap:18px;min-width:0}.customer-avatar{display:grid;place-items:center;width:62px;height:62px;border-radius:19px;background:var(--accent-wash);color:var(--forest);font-size:22px;font-weight:650;flex:none}.eyebrow{color:var(--muted);font-size:11px;letter-spacing:.06em;font-weight:550;text-transform:uppercase;margin-bottom:7px}.customer-heading h1{font-size:29px;line-height:1.2;letter-spacing:-.035em;overflow-wrap:anywhere}.customer-identity>div>p:last-child{font-size:13px;color:var(--muted);line-height:1.7;margin-top:9px;overflow-wrap:anywhere}.customer-actions{display:flex;gap:8px;flex:none}
  .customer-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:26px}.customer-tile{display:grid;gap:15px;padding:20px 22px;text-align:left;background:var(--paper);border:1px solid var(--line);border-radius:16px;color:var(--ink);transition:border-color .18s,box-shadow .18s,transform .18s;min-width:0}.customer-tile:hover,.customer-tile.chosen{border-color:var(--forest);box-shadow:0 4px 18px color-mix(in srgb,var(--forest) 8%,transparent)}.customer-tile:active{transform:translateY(1px)}.tile-heading{display:flex;align-items:center;justify-content:space-between;color:var(--muted)}.tile-icon{display:grid;place-items:center;width:37px;height:37px;background:var(--wash);border-radius:11px;color:var(--forest)}.tile-label{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:15px;font-weight:550}.tile-label strong{font-size:27px;line-height:1;font-weight:600;letter-spacing:-.04em}.tile-description{font-size:12px;color:var(--muted);line-height:1.5}
  .customer-columns{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:24px;align-items:start}.customer-side{display:grid;gap:20px}.customer-focus .panel-body{padding:0 22px 20px}.customer-record{display:flex;align-items:center;gap:14px;padding:19px 0;border-bottom:1px solid var(--line-soft,var(--line));color:var(--ink);text-decoration:none;min-width:0}.customer-record:hover .record-copy strong{color:var(--forest)}.record-symbol{display:grid;place-items:center;flex:none;width:38px;height:38px;border-radius:11px;background:var(--wash);color:var(--forest)}.record-copy{display:grid;gap:6px;min-width:0;flex:1}.record-copy strong{font-size:14px;line-height:1.5;overflow-wrap:anywhere}.record-copy small{font-size:11px;line-height:1.5;color:var(--muted)}.customer-record>:global(svg){flex:none}.customer-empty{text-align:center;padding:32px 18px;color:var(--muted);max-width:48ch;margin:auto}.customer-empty>:global(svg){margin:auto}.customer-empty h3{font-size:17px;color:var(--ink);margin-top:14px}.customer-empty p{font-size:13px;line-height:1.7;margin:10px 0 18px}.customer-list-actions{display:flex;gap:10px;flex-wrap:wrap;padding-top:20px}.contact-details{display:grid;gap:20px}.contact-details>a:not(.text-link),.contact-details>p{display:grid;gap:6px;text-decoration:none;min-width:0}.contact-details span{font-size:11px;color:var(--muted)}.contact-details strong{font-size:13px;font-weight:450;line-height:1.65;color:var(--ink);overflow-wrap:anywhere}.contact-details .text-link{font-size:12px;min-height:36px}.customer-note{font-size:13px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere}
  @media(max-width:1050px){.customer-heading{align-items:flex-start;flex-wrap:wrap}.customer-columns{grid-template-columns:minmax(0,1fr) 250px}.customer-actions{margin-left:80px}}@media(max-width:760px){.customer-heading{gap:17px;margin-bottom:22px}.customer-heading h1{font-size:25px}.customer-avatar{width:48px;height:48px;border-radius:15px;font-size:18px}.customer-identity{gap:12px;align-items:flex-start}.customer-actions{margin:0;width:100%;flex-wrap:wrap}.customer-actions .btn{flex:1}.customer-tiles{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:20px}.customer-tile{padding:15px;gap:12px;border-radius:14px}.tile-label{font-size:14px}.tile-label strong{font-size:24px}.tile-description{font-size:11px}.customer-columns{grid-template-columns:minmax(0,1fr);gap:20px}.customer-focus .panel-body{padding:0 17px 17px}.customer-record{gap:10px;flex-wrap:wrap}.record-symbol{width:32px;height:32px}.customer-record :global(.status){max-width:100%}.customer-record>:global(svg){display:none}.record-copy strong{font-size:14px}.customer-list-actions .btn{flex:1}.contact-details strong{font-size:14px}}
  @media(prefers-reduced-motion:reduce){.customer-tile{transition:none}.customer-tile:active{transform:none}}
</style>
