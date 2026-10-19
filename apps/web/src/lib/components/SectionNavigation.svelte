<script lang="ts">
  import {searchableSelect} from '#lib/client/searchable-select.ts';
  import {goto} from '$app/navigation';
  import Icon from './Icon.svelte';
  let {items,active,label}:{items:{slug:string;label:string}[];active:string;label:string}=$props();
  let expanded=$state(false),search=$state('');
  let trigger=$state<HTMLButtonElement>();
  const primary=$derived(items.filter(item=>['customers','orders','quotes','invoices','payments','suppliers','purchase-orders','stock','dispatch','time','team','reports','settings','documents','studio'].includes(item.slug)).slice(0,4));
  const current=$derived(items.find(item=>item.slug===active));
  const visible=$derived(current&&!primary.some(item=>item.slug===active)?[...primary.slice(0,3),current]:primary);
  const filtered=$derived(items.filter(item=>item.label.toLocaleLowerCase('de').includes(search.trim().toLocaleLowerCase('de'))));
  $effect(()=>{active;expanded=false;search='';});
</script>
<svelte:window onkeydown={(event)=>{if(expanded&&event.key==='Escape'){expanded=false;trigger?.focus();}}}/>
<nav class="section-navigation" aria-label={`${label}: Bereiche`}>
  <div class="section-bar">
    <div class="section-links">{#each visible as item}<a href={`/${item.slug}`} aria-current={active===item.slug?'page':undefined} class:active={active===item.slug}>{item.label}</a>{/each}</div>
    <div class="section-mobile"><label class="sr-only" for="section-location">Bereich in {label}</label><select use:searchableSelect={active} id="section-location" value={active} onchange={(event)=>goto('/'+event.currentTarget.value)}>{#each items as item}<option value={item.slug}>{item.label}</option>{/each}</select></div>
    {#if items.length>visible.length}<button class="section-trigger" bind:this={trigger} aria-expanded={expanded} aria-controls="section-directory" onclick={()=>expanded=!expanded}><Icon name="grid" size={16}/>Alle Bereiche<Icon name="chevron" size={14}/></button>{/if}
  </div>
  {#if expanded}<div id="section-directory" class="section-directory" role="group" tabindex="-1" aria-label={`Alle Bereiche in ${label}`}>
    <div class="directory-heading"><strong>{label}</strong><div class="field"><label class="sr-only" for="section-search">Bereich suchen</label><input id="section-search" type="search" placeholder="Bereich suchen …" bind:value={search}/></div></div>
    <div class="directory-links">{#each filtered as item}<a href={`/${item.slug}`} aria-current={active===item.slug?'page':undefined} class:active={active===item.slug}>{item.label}<Icon name={active===item.slug?'check':'arrow'} size={15}/></a>{/each}</div>
    {#if !filtered.length}<p class="small muted">Kein Bereich gefunden. Versuchen Sie einen anderen Suchbegriff.</p>{/if}
  </div>{/if}
</nav>
<style>
.section-navigation{margin:0 0 27px;min-width:0}.section-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;min-width:0}.section-links{display:inline-flex;align-items:stretch;gap:3px;min-width:0;padding:4px;border:1px solid var(--line);border-radius:10px;background:var(--wash)}.section-links a{display:flex;align-items:center;justify-content:center;min-height:35px;padding:8px 14px;border-radius:7px;color:var(--muted);font-size:12px;font-weight:500;line-height:1.5;white-space:nowrap}.section-links a.active{background:var(--paper);color:var(--forest);box-shadow:var(--surface-shadow);font-weight:600}.section-links a:hover{color:var(--ink)}.section-trigger{display:flex;align-items:center;gap:8px;flex:none;min-height:42px;padding:9px 12px;border:1px solid var(--line);border-radius:9px;background:var(--paper);color:var(--muted);font-size:12px;font-weight:500}.section-trigger:hover{color:var(--ink);background:var(--wash)}.section-trigger[aria-expanded=true]{color:var(--forest);background:var(--accent-wash)}.section-trigger[aria-expanded=true] :global(svg:last-child){transform:rotate(180deg)}.section-directory{margin-top:12px;padding:22px;border:1px solid var(--line);border-radius:12px;background:var(--paper)}.directory-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:17px}.directory-heading strong{font-size:15px;font-weight:600}.directory-heading .field{max-width:290px;flex:1}.directory-links{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 16px}.directory-links a{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:42px;padding:10px 12px;border-radius:8px;font-size:13px;overflow-wrap:anywhere}.directory-links a :global(svg){flex:none;color:var(--muted)}.directory-links a:hover{background:var(--wash)}.directory-links a.active{color:var(--forest);background:var(--accent-wash);font-weight:600}.section-mobile{display:none}@media(max-width:1100px){.section-links a{padding:8px 10px}.directory-links{grid-template-columns:repeat(2,minmax(0,1fr))}.section-trigger{padding:9px}}@media(max-width:760px){.section-links,.section-trigger,.section-directory{display:none}.section-mobile{display:block;width:100%}.section-mobile select{width:100%;min-height:48px;padding:11px 13px;border:1px solid var(--line);border-radius:9px;background:var(--paper);color:var(--ink);font:inherit;font-size:14px}.section-navigation{margin-bottom:23px}}
</style>
