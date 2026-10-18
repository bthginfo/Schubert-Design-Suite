<script lang="ts">
 import {onMount,tick,untrack} from 'svelte';
 import {goto,refreshAll} from '$app/navigation';
 import {page} from '$app/state';
 import {command} from '#lib/client/api.ts';
 import {tourSteps,tourPosition,TOUR_VERSION,type TourRect} from '#lib/client/onboarding-tour.ts';
 import type {AppData,Row} from '#lib/client/types.ts';
 import {defaultAppearance,type Appearance} from '@schubert/contracts';
 import Icon from './Icon.svelte';
 import AppearancePicker from './AppearancePicker.svelte';
 let {data}:{data:AppData}=$props();
 const steps=$derived(tourSteps(data.context?.permissions??[]));
 const initialIndex=()=>data.summary.onboarding?.guide_version===TOUR_VERSION?Math.min(data.summary.onboarding.step??0,steps.length-1):0;
 let index=$state(untrack(initialIndex)),saved:Row|null=$state(untrack(()=>data.summary.onboarding??null));
 let accent=$state<Appearance['accent']>(untrack(()=>data.summary.appearance?.accent??defaultAppearance.accent)),mode=$state<Appearance['mode']>(untrack(()=>data.summary.appearance?.mode??defaultAppearance.mode));
 let busy=$state(false),error=$state(''),closed=$state(false),mounted=$state(false),retryRoute=$state(false);
 let dialog:HTMLDialogElement;let card:HTMLElement;let heading:HTMLHeadingElement;let errorNode=$state<HTMLParagraphElement>();
 let rect=$state<TourRect|null>(null),position=$state({left:16,top:16}),viewport=$state({width:1440,height:900});
 const step=$derived(steps[index]);
 const onRoute=$derived(!step.href||page.url.pathname+page.url.search===step.href);
 const shade=$derived(`M0 0H${viewport.width}V${viewport.height}H0Z`+(rect?`M${rect.x} ${rect.y}v${rect.height}h${rect.width}v-${rect.height}Z`:''));
 let schedule=()=>{};let lastTarget:Element|null=null;
 async function locate(){retryRoute=false;if(step.href&&page.url.pathname+page.url.search!==step.href)await goto(step.href,{reset:false});await tick();lastTarget=null;schedule();heading?.focus({preventScroll:true});}
 async function move(next:number){if(busy)return;busy=true;error='';try{saved=await command('account.onboarding.update',undefined,{status:'in_progress',step:next,guideVersion:TOUR_VERSION},saved?.version);index=next;try{await locate();}catch{retryRoute=true;throw Error('Die nächste Seite konnte nicht geöffnet werden. Ihr Tourfortschritt ist gespeichert. Bitte versuchen Sie es erneut.');}}catch(cause){error=cause instanceof Error?cause.message:'Der nächste Schritt konnte nicht gespeichert werden. Bitte erneut versuchen.';}finally{busy=false;await focusError();}}
 async function finish(status:'deferred'|'completed'){if(busy)return;busy=true;error='';try{saved=await command('account.onboarding.update',undefined,{status,step:index,guideVersion:TOUR_VERSION,...(status==='completed'?{appearance:{accent,mode},appearanceVersion:data.summary.appearance?.version??0}:{})},saved?.version);dialog.close();closed=true;await refreshAll();}catch(cause){error=cause instanceof Error?cause.message:'Ihr Fortschritt konnte nicht gespeichert werden. Bitte erneut versuchen.';}finally{busy=false;await focusError();}}
 async function focusError(){if(error){await tick();errorNode?.focus();errorNode?.scrollIntoView({block:'nearest'});schedule();}}
 async function reopen(){saved=data.summary.onboarding??null;index=initialIndex();error='';closed=false;document.body.style.overflow='hidden';await tick();if(!dialog.open)dialog.showModal();if(index>0)try{await locate();}catch{retryRoute=true;error='Die Seite konnte nicht geöffnet werden. Bitte erneut versuchen.';}heading?.focus({preventScroll:true});schedule();}
 $effect(()=>{if(mounted){index;page.url.pathname;page.url.search;closed;schedule();}});
 onMount(()=>{
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;const overflow=document.body.style.overflow;
  let frame=0;const update=()=>{frame=0;if(closed)return;const width=window.visualViewport?.width??innerWidth,height=window.visualViewport?.height??innerHeight;viewport={width,height};
   const node=onRoute&&step.target?Array.from(document.querySelectorAll<HTMLElement>(step.target)).find(n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'):null;
   if(node&&node!==lastTarget){lastTarget=node;node.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'});const box=node.getBoundingClientRect();window.scrollBy({top:box.top-24,behavior:'instant'});}
   const box=node?.getBoundingClientRect();rect=box?{x:Math.max(8,box.left-8),y:Math.max(8,box.top-8),width:Math.max(0,Math.min(width-8,box.right+8)-Math.max(8,box.left-8)),height:Math.max(0,Math.min(height-8,box.bottom+8)-Math.max(8,box.top-8))}:null;
   if(rect&&(!rect.width||!rect.height))rect=null;
   position=tourPosition(step.id==='appearance'?null:rect,{width:card.offsetWidth,height:card.offsetHeight},viewport);
  };
  schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const resize=new ResizeObserver(schedule);resize.observe(card);
  const observer=new MutationObserver(schedule);const main=document.getElementById('main-content');if(main)observer.observe(main,{childList:true,subtree:true});
  window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);window.visualViewport?.addEventListener('resize',schedule);window.addEventListener('schubert:tour:start',reopen);
  const onclose=()=>{document.body.style.overflow=overflow;};dialog.addEventListener('close',onclose);document.body.style.overflow='hidden';mounted=true;dialog.showModal();heading.focus({preventScroll:true});schedule();
  if(index>0)void locate().catch(()=>{retryRoute=true;error='Die gespeicherte Station konnte nicht geöffnet werden. Bitte versuchen Sie es erneut.';});
  return()=>{cancelAnimationFrame(frame);resize.disconnect();observer.disconnect();window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);window.visualViewport?.removeEventListener('resize',schedule);window.removeEventListener('schubert:tour:start',reopen);dialog.removeEventListener('close',onclose);dialog.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus({preventScroll:true});};
 });
</script>
<dialog bind:this={dialog} class="onboarding tour-layer" aria-labelledby="tour-title" aria-describedby="tour-description" oncancel={(event)=>{event.preventDefault();void finish('deferred');}}>
 <svg class="tour-shade" width="100%" height="100%" aria-hidden="true"><path d={shade} fill-rule="evenodd"/></svg>
 {#if rect}<div class="tour-highlight" style:left={rect.x+'px'} style:top={rect.y+'px'} style:width={rect.width+'px'} style:height={rect.height+'px'} aria-hidden="true"></div>{/if}
 <section bind:this={card} class="tour-card" class:appearance={step.id==='appearance'} style:left={position.left+'px'} style:top={position.top+'px'} aria-busy={busy}>
  <header><span class="tour-count">Schritt {index+1} von {steps.length}</span><button class="text-link" disabled={busy} onclick={()=>finish('deferred')}>Für später schließen</button></header>
  <div class="tour-content"><h2 bind:this={heading} id="tour-title" tabindex="-1">{step.title}</h2><p id="tour-description">{step.body}</p>
   {#if step.id==='appearance'}<AppearancePicker bind:accent bind:mode disabled={busy}/>{/if}
   <p class="tour-hint">{step.hint}</p>
   {#if !onRoute||retryRoute}<p class="tour-hint">Sie sind auf einer anderen Seite. Öffnen Sie die Station, um die Hervorhebung zu sehen.</p><button class="btn" disabled={busy} onclick={async()=>{busy=true;error='';try{await locate();}catch{error='Die Seite konnte nicht geöffnet werden. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.';}finally{busy=false;await focusError();}}}>Station öffnen</button>{/if}
   {#if error}<p bind:this={errorNode} class="field-error tour-error" role="alert" tabindex="-1">{error}</p><button class="text-link" onclick={()=>{closed=true;dialog.close();}}>Ohne Speichern schließen</button>{/if}
  </div>
  <footer>{#if index>0}<button class="btn" disabled={busy} onclick={()=>move(index-1)}>Zurück</button>{/if}<button class="btn primary" disabled={busy||(!onRoute&&index>0)} onclick={()=>index===steps.length-1?finish('completed'):move(index+1)}>{busy?'Wird gespeichert …':index===0?'Tour starten':index===steps.length-1?'Einführung abschließen':'Weiter'}<Icon name={index===steps.length-1?'check':'arrow'} size={16}/></button></footer>
  {#if index>0&&index<steps.length-1&&onRoute}<button class="tour-explore text-link" disabled={busy} onclick={()=>finish('deferred')}>Hier selbst ausprobieren<Icon name="arrow" size={15}/></button>{/if}
 </section>
</dialog>
<style>
 .tour-layer{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:transparent;color:var(--ink);overflow:hidden}.tour-layer::backdrop{background:transparent}.tour-shade{position:absolute;inset:0;pointer-events:none;fill:rgb(7 15 11 / .64)}.tour-highlight{position:absolute;border:2px solid var(--forest);border-radius:12px;pointer-events:none}.tour-card{position:absolute;width:420px;max-width:calc(100vw - 32px);max-height:calc(100dvh - 32px);overflow-y:auto;background:var(--paper);border-radius:14px;box-shadow:0 18px 54px rgb(0 0 0 / .25);padding:24px}.tour-card.appearance{width:700px}.tour-card header{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:22px}.tour-count{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}.tour-card header button{font-size:12px;min-height:32px}.tour-content h2{font-size:24px;line-height:1.25;letter-spacing:-.025em;font-weight:600;text-wrap:balance;outline-offset:6px}.tour-content>p{font-size:14px;line-height:1.7;margin-top:14px}.tour-content .tour-hint{color:var(--muted);font-size:13px;margin-top:18px}.tour-card footer{display:flex;justify-content:flex-end;gap:10px;margin-top:24px}.tour-card footer .btn{min-height:44px}.tour-explore{display:flex;gap:8px;align-items:center;margin:18px 0 0 auto;min-height:32px;font-size:13px}.tour-error{padding:12px;background:var(--danger-wash);border-radius:6px}
 @media(max-width:650px){.tour-card{padding:20px}.tour-card header{margin-bottom:18px;gap:8px}.tour-content h2{font-size:22px}.tour-card header button,.tour-explore{min-height:44px}.tour-card footer .btn{min-height:48px}.tour-card.appearance{max-height:calc(100dvh - 32px)}.tour-card footer{position:sticky;bottom:-20px;background:var(--paper);padding:14px 0 20px;margin-bottom:-20px;margin-top:14px}.tour-card.appearance footer .primary{flex:1}.tour-explore{margin-top:26px}}
 @media(prefers-reduced-motion:no-preference){.tour-card{animation:tour-arrive .18s cubic-bezier(.16,1,.3,1)}@keyframes tour-arrive{from{transform:translateY(5px)}to{transform:translateY(0)}}}
</style>
