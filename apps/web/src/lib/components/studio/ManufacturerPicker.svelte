<script lang="ts">
  import {onMount,tick} from 'svelte';
  import {manufacturerAssetKinds,manufacturerAssetScopes} from '@schubert/contracts';
  import {request} from '#lib/client/api.ts';
  import type {Row} from '#lib/client/types.ts';
  import Icon from '../Icon.svelte';
  let {studio='both',purpose='planning',canImportContour=false,onchoose,onclose}:{studio?:string;purpose?:'planning'|'ai';canImportContour?:boolean;onchoose:(asset:Row,action:'plan'|'outline'|'ai')=>void;onclose:()=>void}=$props();
  let dialog:HTMLDialogElement,items:Row[]=$state([]),query=$state(''),busy=$state(false),error=$state(''),cursor=$state<string|null>(null),more=$state(false);
  let requestNumber=0;
  async function search(append=false){
    const current=++requestNumber;busy=true;error='';
    try{const params=new URLSearchParams({studio,q:query.trim(),...(append&&cursor?{cursor}:{})});const result=await request('/api/v1/planning/manufacturer-assets?'+params,undefined,'GET');if(current!==requestNumber)return;items=append?[...items,...result.items]:result.items;cursor=result.nextCursor;more=result.hasMore;}
    catch(problem){if(current===requestNumber)error=(problem as Error).message;}
    finally{if(current===requestNumber)busy=false;}
  }
  const visible=$derived(items.filter(item=>purpose==='ai'?item.use_ai:item.use_planning||item.use_ai));
  const isOutline=(row:Row)=>['image/svg+xml','application/dxf','image/vnd.dxf','application/x-dxf'].includes(row.mime_type);
  const isPlan=(row:Row)=>['application/pdf','image/png','image/jpeg','image/webp','image/tiff'].includes(row.mime_type);
  function choose(row:Row,action:'plan'|'outline'|'ai'){onchoose(row,action);onclose();}
  onMount(()=>{const opener=document.activeElement as HTMLElement|null;dialog.showModal();void search();return()=>{requestNumber++;dialog.close();void tick().then(()=>{if(!document.querySelector('dialog[open]')&&opener?.isConnected)opener.focus();});};});
</script>

<dialog bind:this={dialog} aria-labelledby="manufacturer-picker-title" oncancel={onclose} onclose={onclose}>
  <header><div><p>{purpose==='ai'?'BEWUSST GEWÄHLTE KI-QUELLE':'ORIGINALE FÜR IHRE PLANUNG'}</p><h2 id="manufacturer-picker-title">Herstellerdaten auswählen</h2></div><button type="button" aria-label="Herstellerbibliothek schließen" onclick={onclose}><Icon name="close" size={21}/></button></header>
  <form class="picker-search" onsubmit={event=>{event.preventDefault();void search();}}><label class="sr-only" for="manufacturer-picker-search">Hersteller oder Modell suchen</label><input id="manufacturer-picker-search" type="search" bind:value={query} maxlength="150" placeholder="Hersteller, Modell oder Artikel …"/><button class="btn" disabled={busy} type="submit">Suchen</button></form>
  <div class="picker-results" aria-busy={busy}>
    <p class="picker-hint">{purpose==='ai'?'Hier erscheinen Originale, deren Übermittlung an KI ausdrücklich erlaubt wurde. Die Auswahl startet keine KI-Anfrage.':'Wählen Sie eine Originaldatei für diesen Plan. Maßeinheit und Maßstab werden beim Import geprüft.'}</p>
    {#if error}<p class="picker-error" role="alert">{error}</p>{/if}
    {#each visible as row}<article><div class="asset-copy"><span class="asset-icon"><Icon name={row.kind==='reference'?'image':'file'} size={21}/></span><div><h3>{row.name}</h3><p>{row.manufacturer_name}{row.article_reference?' · '+row.article_reference:''}</p><small>{manufacturerAssetKinds[row.kind as keyof typeof manufacturerAssetKinds]} · {manufacturerAssetScopes[row.studio_scope as keyof typeof manufacturerAssetScopes]}{row.source_unit?' · Original: '+row.source_unit:''}</small></div></div>{#if row.notes}<p class="asset-note">{row.notes}</p>{/if}
      <div class="picker-actions">{#if purpose==='planning'&&row.use_planning&&isPlan(row)}<button type="button" class="btn small" onclick={()=>choose(row,'plan')}>Als Planvorlage öffnen<Icon name="arrow" size={14}/></button>{/if}{#if purpose==='planning'&&row.use_planning&&isOutline(row)}<button type="button" class="btn small" disabled={!canImportContour} onclick={()=>choose(row,'outline')}>Kontur übernehmen<Icon name="arrow" size={14}/></button>{/if}{#if row.use_ai}<button type="button" class="btn small" onclick={()=>choose(row,'ai')}><Icon name="spark" size={14}/>Als KI-Referenz auswählen</button>{/if}<a class="text-link" data-sveltekit-reload href={`/api/v1/documents/${row.document_id}/download?version=${row.document_version_id}`} target="_blank" rel="noreferrer">Original öffnen<Icon name="arrow" size={13}/></a></div>
      {#if purpose==='planning'&&row.use_planning&&isOutline(row)&&!canImportContour}<p class="picker-hint">Zum Übernehmen zuerst ein Steinbauteil oder eine Belagsfläche im Plan auswählen.</p>{/if}
      {#if row.kind==='model'}<p class="picker-hint">3D-Originale werden über die technische Produktbibliothek mit Einheiten, Achsen und Nutzungsrechten geprüft.</p>{/if}
    </article>{:else}{#if !busy}<div class="picker-empty"><Icon name="box" size={28}/><h3>{query?'Keine passenden Originale':'Noch keine passenden Herstellerdaten'}</h3><p>Der Superadmin oder eine berechtigte Person kann Originaldateien in der Herstellerbibliothek hinzufügen und für dieses Studio bereitstellen.</p></div>{/if}{/each}
    {#if busy}<p class="picker-hint" role="status">Herstellerdaten werden geladen …</p>{/if}{#if more}<button type="button" class="btn full" disabled={busy} onclick={()=>search(true)}>Weitere Originale laden</button>{/if}
  </div><footer><span>Originalfassungen bleiben privat und versioniert.</span><button type="button" class="btn" onclick={onclose}>Schließen</button></footer>
</dialog>

<style>
  dialog{padding:0;border:1px solid var(--line);border-radius:18px;width:min(720px,calc(100% - 28px));max-width:none;max-height:90dvh;overflow:hidden;background:var(--paper);color:var(--ink);box-shadow:var(--overlay-shadow)}dialog::backdrop{background:#08111f80}dialog[open]{display:flex;flex-direction:column}header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:24px;border-bottom:1px solid var(--line-soft)}header p{font-size:10px;letter-spacing:.08em;color:var(--muted);margin:0 0 6px}header h2{font-size:21px;margin:0;line-height:1.4}header button{display:grid;place-items:center;min-width:44px;min-height:44px;border-radius:10px;color:var(--muted)}.picker-search{display:flex;gap:8px;padding:16px 24px;border-bottom:1px solid var(--line-soft)}.picker-search input{flex:1;min-width:0;min-height:44px;padding:10px 13px;border:1px solid var(--line);border-radius:10px;background:var(--input-surface);color:var(--ink);font:inherit;font-size:14px}.picker-results{padding:17px 24px;overflow:auto;min-height:180px;overscroll-behavior:contain}.picker-hint{font-size:12px;color:var(--muted);line-height:1.7;margin:0 0 12px}.picker-error{color:var(--danger);font-size:13px;line-height:1.7}.picker-results article{padding:18px 0;border-top:1px solid var(--line-soft)}.asset-copy{display:flex;align-items:center;gap:12px}.asset-icon{display:grid;place-items:center;width:39px;height:43px;background:var(--wash);border-radius:10px;color:var(--forest);flex:none}.asset-copy h3{font-size:14px;margin:0 0 4px}.asset-copy p{font-size:12px;margin:0 0 4px;line-height:1.6}.asset-copy small{font-size:11px;color:var(--muted)}.asset-note{font-size:12px;line-height:1.7;margin-top:10px}.picker-actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:13px 0 10px}.picker-actions .text-link{font-size:12px;min-height:40px;padding:5px}.picker-empty{text-align:center;padding:26px 10px;color:var(--muted)}.picker-empty h3{font-size:16px;color:var(--ink);margin:13px 0 8px}.picker-empty p{font-size:13px;line-height:1.8}footer{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:15px 24px;border-top:1px solid var(--line);background:var(--input-surface)}footer span{font-size:11px;color:var(--muted)}
  @media(max-width:600px){header,.picker-search,.picker-results{padding:17px}.picker-search input{font-size:16px;min-height:48px}.picker-actions .btn{min-height:48px;width:100%}footer{padding:14px 17px}footer span{max-width:180px}}
</style>
