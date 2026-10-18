<script lang="ts">
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
    <div class="section-mobile"><label class="sr-only" for="section-location">Bereich in {label}</label><select id="section-location" value={active} onchange={(event)=>goto('/'+event.currentTarget.value)}>{#each items as item}<option value={item.slug}>{item.label}</option>{/each}</select></div>
    {#if items.length>visible.length}<button class="section-trigger" bind:this={trigger} aria-expanded={expanded} aria-controls="section-directory" onclick={()=>expanded=!expanded}><Icon name="grid" size={16}/>Alle Bereiche<Icon name="chevron" size={14}/></button>{/if}
  </div>
  {#if expanded}<div id="section-directory" class="section-directory" role="group" tabindex="-1" aria-label={`Alle Bereiche in ${label}`}>
    <div class="directory-heading"><strong>{label}</strong><div class="field"><label class="sr-only" for="section-search">Bereich suchen</label><input id="section-search" type="search" placeholder="Bereich suchen …" bind:value={search}/></div></div>
    <div class="directory-links">{#each filtered as item}<a href={`/${item.slug}`} aria-current={active===item.slug?'page':undefined} class:active={active===item.slug}>{item.label}<Icon name={active===item.slug?'check':'arrow'} size={15}/></a>{/each}</div>
    {#if !filtered.length}<p class="small muted">Kein Bereich gefunden. Versuchen Sie einen anderen Suchbegriff.</p>{/if}
  </div>{/if}
</nav>
<style>
  .section-navigation{margin:-4px 0 28px;min-width:0}.section-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line);padding-bottom:10px}.section-links{display:flex;align-items:center;gap:4px;min-width:0}.section-links a{padding:10px 14px;min-height:44px;display:flex;align-items:center;border-radius:8px;font-size:13px;color:var(--muted);line-height:1.4}.section-links a.active{background:var(--paper);color:var(--ink);box-shadow:0 2px 5px #0000000a;font-weight:600}.section-links a:hover,.section-trigger:hover{background:var(--wash);color:var(--ink)}.section-trigger{display:flex;align-items:center;gap:8px;min-height:44px;padding:10px 12px;border:0;border-radius:8px;background:transparent;font-size:13px;flex:none;color:var(--muted)}.section-trigger[aria-expanded=true]{color:var(--forest);background:var(--wash)}.section-trigger[aria-expanded=true] :global(svg:last-child){transform:rotate(180deg)}.section-directory{padding:22px 0;border-bottom:1px solid var(--line)}.directory-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:16px}.directory-heading strong{font-size:15px;font-weight:600}.directory-heading .field{max-width:290px;flex:1}.directory-links{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 24px}.directory-links a{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:44px;padding:10px 12px;border-radius:8px;font-size:13px;overflow-wrap:anywhere}.directory-links a :global(svg){flex:none;color:var(--muted)}.directory-links a:hover{background:var(--wash)}.directory-links a.active{background:var(--wash);color:var(--forest);font-weight:600}.section-mobile{display:none}@media(max-width:1000px){.section-links a{padding:10px}.directory-links{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.section-links,.section-trigger,.section-directory{display:none}.section-mobile{display:block;width:100%}.section-mobile select{width:100%;min-height:48px;font-size:14px}.section-navigation{margin-bottom:22px}.section-bar{padding-bottom:16px}}
</style>
