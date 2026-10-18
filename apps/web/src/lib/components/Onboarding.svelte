<script lang="ts">
 import {onMount,tick} from 'svelte';
 import {goto,refreshAll} from '$app/navigation';
 import {command} from '#lib/client/api.ts';
 import {onboardingSteps} from '#lib/client/help-content.ts';
 import type {AppData,Row} from '#lib/client/types.ts';
 import Icon from './Icon.svelte';
 let {data}:{data:AppData}=$props();
 const steps=$derived(onboardingSteps(data.context?.permissions??[]));
 let index=$state(0),busy=$state(false),error=$state(''),saved:Row|null=$state(null);
 let title:HTMLHeadingElement;
 onMount(()=>{saved=data.summary.onboarding??null;index=Math.min(saved?.step??0,steps.length-1);});
 const step=$derived(steps[index]);
 async function move(next:number){index=next;await tick();title?.focus();}
 async function save(status:string,href?:string){if(busy)return;busy=true;error='';try{saved=await command('account.onboarding.update',undefined,{status,step:index},saved?.version);await refreshAll();if(href)await goto(href);}catch(cause){error=cause instanceof Error?cause.message:'Die Einführung konnte nicht gespeichert werden.';}finally{busy=false;}}
</script>
<section class="panel onboarding" aria-labelledby="onboarding-title">
 <header class="panel-header"><div><h2 id="onboarding-title">Willkommen in Ihrer Design Suite.</h2><p>Eine kurze Einführung · Schritt {index+1} von {steps.length}</p></div><button class="btn small" disabled={busy} onclick={()=>save('deferred')}>Für später schließen</button></header>
 <div class="onboarding-content"><nav aria-label="Schritte der Einführung"><ol>{#each steps as item,i}<li><button class:current={i===index} aria-current={i===index?'step':undefined} disabled={busy} onclick={()=>move(i)}><span>{i+1}</span>{item.title}</button></li>{/each}</ol></nav><div class="onboarding-copy"><h3 bind:this={title} tabindex="-1">{step.title}</h3><p>{step.intro}</p><ol>{#each step.steps as instruction}<li>{instruction}</li>{/each}</ol><button class="text-link" disabled={busy} onclick={()=>save('in_progress',step.href)}>{step.action}<Icon name="arrow" size={15}/></button></div></div>
 <footer class="panel-footer"><a class="text-link" href="/help">Alle Anleitungen & FAQs</a><div class="inline-actions">{#if index>0}<button class="btn" disabled={busy} onclick={()=>move(index-1)}>Zurück</button>{/if}{#if index<steps.length-1}<button class="btn primary" disabled={busy} onclick={()=>move(index+1)}>Weiter<Icon name="arrow" size={15}/></button>{:else}<button class="btn primary" disabled={busy} onclick={()=>save('completed')}>{busy?'Wird gespeichert …':'Einführung abschließen'}</button>{/if}</div></footer>
 {#if error}<p class="field-error panel-body" role="alert">{error}</p>{/if}
</section>
<style>
 .onboarding{margin-bottom:28px}.onboarding .panel-header{flex-wrap:wrap;gap:18px}.onboarding-content{display:grid;grid-template-columns:230px minmax(0,1fr);border-top:1px solid var(--line)}.onboarding-content nav{background:var(--wash);padding:20px}.onboarding-content nav ol{list-style:none;padding:0;margin:0}.onboarding-content nav button{width:100%;padding:12px 8px;display:flex;gap:10px;text-align:left;align-items:center;font-size:13px;border-radius:8px;color:var(--text)}.onboarding-content nav button.current{background:var(--surface,#fff);font-weight:600}.onboarding-content nav span{font-variant-numeric:tabular-nums;color:var(--forest)}.onboarding-copy{padding:28px;max-width:80ch}.onboarding-copy h3{font-size:22px;line-height:1.35;letter-spacing:-.02em}.onboarding-copy>p{margin-top:10px;font-size:14px;line-height:1.7}.onboarding-copy ol{padding-left:22px;margin:20px 0;font-size:14px;line-height:1.75}.onboarding-copy li+li{margin-top:12px}.onboarding .panel-footer{flex-wrap:wrap;gap:16px}
 @media(max-width:760px){.onboarding-content{grid-template-columns:1fr}.onboarding-content nav{display:none}.onboarding-copy{padding:24px 20px}.onboarding .panel-footer>.inline-actions{margin-left:auto}}
</style>
