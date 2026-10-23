<script lang="ts">
  import {searchableSelect} from '#lib/client/searchable-select.ts';
  import {onMount,onDestroy,untrack} from 'svelte';
  import {request} from '#lib/client/api.ts';
  type Choice={id:string;name:string};
  let {id,value=$bindable(),reference,initial=[],required=false,invalid=false,describedBy,parentId,emptyText,asOf,kind,onchange}:{id:string;value?:string;reference:string;initial?:Choice[];required?:boolean;invalid?:boolean;describedBy?:string;parentId?:string;emptyText?:string;asOf?:string;kind?:string;onchange?:(value:string,choice?:Choice)=>void}=$props();
  let found:Choice[]|null=$state(null),known:Choice[]=$state([]),busy=$state(false),error=$state('');
  let timer:ReturnType<typeof setTimeout>|undefined,generation=0;
  const options=$derived.by(()=>{
    const rows=found??(kind?[]:initial),selected=value?[...rows,...known,...initial].find(item=>item.id===value):null;
    return [...(selected&&!rows.some(item=>item.id===value)?[selected]:[]),...rows,...(value&&!selected?[{id:value,name:'Gespeicherte Auswahl · Bezeichnung wird geladen'}]:[])];
  });
  function search(query:string){
    clearTimeout(timer);const current=++generation;busy=true;error='';
    timer=setTimeout(async()=>{
      try{
        const params=new URLSearchParams({q:query,...(value?{include_id:value}:{}),...(parentId?{parent_id:parentId}:{}),...(asOf?{as_of:asOf}:{}),...(kind?{kind}:{})});
        const result=await request(`/api/v1/lookups/${encodeURIComponent(reference)}?${params}`,undefined,'GET');
        if(current!==generation)return;
        const matches:Choice[]=Array.isArray(result)?result:result?.items||result?.records||[];
        known=[...new Map([...known,...initial,...matches].map(item=>[item.id,item])).values()].slice(-300);found=matches;
      }catch(cause){if(current===generation)error=cause instanceof Error?cause.message:'Suche fehlgeschlagen. Bitte erneut versuchen.';}
      finally{if(current===generation)busy=false;}
    },200);
  }
  let mounted=false;let scope='';
  onMount(()=>{mounted=true;scope=[reference,parentId,asOf,kind].join('|');search('');});
  $effect(()=>{const next=[reference,parentId,asOf,kind].join('|');if(mounted&&next!==scope){scope=next;found=null;untrack(()=>search(''));}});
  onDestroy(()=>{clearTimeout(timer);generation++;});
</script>
<select use:searchableSelect={{value,search,busy,error}} {id} bind:value {required} onchange={(event)=>{const selectedId=event.currentTarget.value;onchange?.(selectedId,options.find(item=>item.id===selectedId));}} aria-invalid={invalid} aria-describedby={[describedBy,`${id}-search-help`].filter(Boolean).join(' ')}><option value="">Bitte auswählen</option>{#each options as item}<option value={item.id}>{item.name}</option>{/each}</select>
<p id={`${id}-search-help`} class="field-help">{emptyText&&found?.length===0?emptyText:'Name oder Belegnummer eingeben · durchsucht den gesamten freigegebenen Bestand.'}</p>
{#if error}<p class="field-error" role="alert">{error}<button type="button" class="text-link" onclick={()=>search('')}>Erneut laden</button></p>{/if}
