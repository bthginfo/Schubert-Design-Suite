<script lang="ts">
  import {searchableSelect} from '#lib/client/searchable-select.ts';
  import {onDestroy} from 'svelte';
  import {request} from '#lib/client/api.ts';
 import ReferencePicker from'../ReferencePicker.svelte';import{stoneAppearance}from'./stone-appearance.ts';
 let{id,materials=[],value='',onchange}:{id:string;materials?:any[];value?:string;onchange:(value:string)=>void}=$props();
 let expanded=$state(false),search=$state(''),family=$state(''),limit=$state(12),found:any[]|null=$state(null),known:any[]=$state([]),busy=$state(false),error=$state('');
 let timer:ReturnType<typeof setTimeout>|undefined,generation=0;
 const cache=new Map<string,any[]>();
 const catalog=$derived((found??materials).filter(m=>m.properties?.sourceCatalog)),families=$derived([...new Set([...materials,...known].filter(m=>m.properties?.sourceCatalog).map(m=>String(m.properties.stoneType)))].sort());
 const matches=$derived(catalog.filter(m=>(!family||m.properties.stoneType===family)&&(!search||(m.name+' '+(m.properties.origin??'')).toLocaleLowerCase('de').includes(search.toLocaleLowerCase('de')))));
 const selected=$derived([...known,...materials].find(m=>m.id===value)),selectedAppearance=$derived(stoneAppearance(selected));
 function searchLibrary(){
  clearTimeout(timer);const current=++generation,q=search.trim();limit=12;error='';found=null;
  if(q.length<2){busy=false;return;}
  const cached=cache.get(q.toLocaleLowerCase('de'));if(cached){found=cached;busy=false;return;}
  busy=true;timer=setTimeout(async()=>{
   try{const result=await request('/api/v1/lookups/material-versions?'+new URLSearchParams({q}),undefined,'GET');if(current!==generation)return;const rows=Array.isArray(result)?result:result?.items??[];cache.set(q.toLocaleLowerCase('de'),rows);if(cache.size>20)cache.delete(cache.keys().next().value!);known=[...new Map([...known,...rows].map(row=>[row.id,row])).values()].slice(-300);found=rows;}
   catch(cause){if(current===generation)error=cause instanceof Error?cause.message:'Die Suche ist fehlgeschlagen. Bitte erneut versuchen.';}
   finally{if(current===generation)busy=false;}
  },300);
 }
 onDestroy(()=>{clearTimeout(timer);generation++;});
</script>
<ReferencePicker {id} reference="material-versions" initial={materials.map(m=>({id:m.id,name:m.name}))} {value} {onchange}/>
<details class="material-library" bind:open={expanded}><summary>Steinbibliothek durchsuchen{#if catalog.length}<span>{catalog.length}</span>{/if}</summary>{#if expanded}
 {#if materials.some(material=>material.properties?.sourceCatalog)||found}<div class="library-filters"><label>Stein suchen<input type="search" bind:value={search} oninput={searchLibrary} placeholder="Name · ab 2 Zeichen im gesamten Bestand"/></label><label>Gesteinsart<select use:searchableSelect={family} bind:value={family} onchange={()=>limit=12}><option value="">Alle Gesteinsarten</option>{#each families as item}<option value={item}>{item}</option>{/each}</select></label></div>
 {#if busy}<p role="status">Gesamte Steinbibliothek wird durchsucht …</p>{/if}
 {#if error}<p role="alert">{error} <button type="button" class="btn small" onclick={searchLibrary}>Erneut suchen</button></p>{/if}
 <div class="material-options" role="group" aria-label="Material auswählen">{#each matches.slice(0,limit) as material}{@const appearance=stoneAppearance(material)}<button type="button" aria-pressed={value===material.id} class:chosen={value===material.id} onclick={()=>onchange(material.id)}><span class="swatch" class:unknown={!appearance.known} style={`background-color:${appearance.color};${appearance.path?`background-image:url('${appearance.path}')`:''}`} aria-hidden="true">{#if appearance.hint}<em>{appearance.hint}</em>{/if}</span><strong>{material.name.replace(' · Katalogreferenz','')}</strong><small>{material.properties.stoneType} · {material.properties.origin??'Herkunft offen'}</small></button>{/each}</div>
 {#if !matches.length&&!busy&&!error}<p>Keine passenden Steine. Ändern Sie den Namen oder die Gesteinsart.</p>{/if}{#if matches.length>limit}<button type="button" class="btn small" onclick={()=>limit+=12}>Weitere {Math.min(12,matches.length-limit)} Materialien</button>{/if}
 {#if found?.length===30}<p>Die ersten 30 Treffer. Mit einem genaueren Namen grenzen Sie die Suche ein.</p>{/if}
 <p class="material-note">Reale Handelsnamen mit Quellenbezug. Die Muster zeigen eine repräsentative Gesteinsstruktur. Das genaue Plattenbild, Liefermaß und die Eignung prüfen Sie anhand des Lieferantenmusters.</p>
 {:else}<p>Die Bibliothek kann auf der Studioübersicht unter „Steinbibliothek ergänzen“ geladen werden. Eigene Materialstände lassen sich bereits oben auswählen.</p>{/if}{/if}</details>
{#if selected&&!selectedAppearance.known}<p class="material-source">{selectedAppearance.hint}: Plan und 3D zeigen den Stein neutral grau, bis eine Farbe hinterlegt ist.</p>{/if}
{#if selected?.properties?.sourceUrl}<p class="material-source"><a href={selected.properties.sourceUrl} target="_blank" rel="noreferrer">Lieferantenreferenz öffnen</a> · Stand {selected.properties.checkedOn}</p>{/if}
<style>.material-library{margin:12px 0 18px;padding:14px;background:var(--wash);border-radius:10px}.material-library summary{display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;font-size:13px;font-weight:600;min-height:28px}.material-library summary span{color:var(--muted);font-size:12px;font-weight:400}.library-filters{display:grid;gap:12px;margin:16px 0}.library-filters label{display:block;font-size:12px;font-weight:500}.library-filters input,.library-filters select{width:100%;box-sizing:border-box;min-height:44px;padding:10px;margin-top:6px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink);font:inherit}.material-options{display:grid;grid-template-columns:1fr 1fr;gap:8px}.material-options button{padding:0 0 12px;overflow:hidden;background:var(--paper);color:var(--ink);border:1px solid var(--line);border-radius:10px;text-align:left;cursor:pointer;font:inherit;min-width:0}.material-options button.chosen{border-color:var(--forest);outline:1px solid var(--forest)}.material-options button:focus-visible{outline:2px solid var(--forest);outline-offset:2px}.swatch{display:grid;place-items:end start;height:66px;background-size:cover;background-blend-mode:multiply}.swatch em{margin:6px 8px;padding:2px 6px;border-radius:6px;background:var(--paper);color:var(--muted);font-size:10px;font-style:normal;line-height:1.4}.material-options strong,.material-options small{display:block;margin:8px 10px 0;overflow-wrap:anywhere}.material-options strong{font-size:12px;font-weight:600;line-height:1.4}.material-options small{font-size:11px;color:var(--muted);line-height:1.5;margin-top:4px}.material-note,.material-library p,.material-source{font-size:12px;line-height:1.65;color:var(--muted)}.material-source a{color:var(--forest)}.material-library>.btn{margin-top:12px}@media(max-width:720px){.library-filters input,.library-filters select{font-size:16px;min-height:48px}}</style>
