<script lang="ts">
 import {untrack,tick} from 'svelte';
 import {refreshAll,beforeNavigate} from '$app/navigation';
 import {defaultAppearance,type Appearance} from '@schubert/contracts';
 import {command} from '#lib/client/api.ts';
 import type {AppData} from '#lib/client/types.ts';
 import AppearancePicker from './AppearancePicker.svelte';
 let {data}:{data:AppData}=$props();
 let accent=$state<Appearance['accent']>(untrack(()=>data.summary.appearance?.accent??defaultAppearance.accent)),mode=$state<Appearance['mode']>(untrack(()=>data.summary.appearance?.mode??defaultAppearance.mode));
 let version=$state(untrack(()=>data.summary.appearance?.version??0)),busy=$state(false),error=$state(''),notice=$state('');
 const dirty=$derived(accent!==(data.summary.appearance?.accent??defaultAppearance.accent)||mode!==(data.summary.appearance?.mode??defaultAppearance.mode));
 $effect(()=>{version=data.summary.appearance?.version??0;accent=data.summary.appearance?.accent??defaultAppearance.accent;mode=data.summary.appearance?.mode??defaultAppearance.mode;});
 beforeNavigate(event=>{if(dirty&&!busy&&!window.confirm('Ihre Darstellung wurde noch nicht gespeichert. Möchten Sie die Auswahl verwerfen?'))event.cancel();});
 async function save(event:SubmitEvent){event.preventDefault();if(busy)return;busy=true;error='';notice='';try{await command('account.appearance.update',undefined,{accent,mode},version);await refreshAll();notice='Ihre Darstellung wurde gespeichert. Sie gilt nur für Ihren Zugang.';}catch(cause){error=cause instanceof Error?cause.message:'Darstellung konnte nicht gespeichert werden. Bitte erneut versuchen.';}finally{busy=false;await tick();document.getElementById('appearance-notice')?.focus();}}
 function reset(){accent=defaultAppearance.accent;mode=defaultAppearance.mode;notice='';}
</script>
<section class="panel appearance-settings" id="appearance" aria-labelledby="appearance-heading" data-feedback-private>
 <header class="panel-header"><div><h2 id="appearance-heading">Ihre Darstellung</h2><p>Ihre Farben. Ihr Arbeitsbereich. Auf allen Geräten mit Ihrem Zugang.</p></div></header>
 <form onsubmit={save}><div class="panel-body"><p class="appearance-description">Wählen Sie eine Akzentfarbe und das Erscheinungsbild. Die Vorschau zeigt Ihre Auswahl vor dem Speichern. Pläne, Steinmaterialien und PDFs behalten ihre fachlichen Farben.</p><AppearancePicker bind:accent bind:mode disabled={busy}/></div>
 <footer class="panel-footer"><button class="text-link" type="button" disabled={busy||(accent==='forest'&&mode==='light')} onclick={reset}>Schubert-Standard auswählen</button><button class="btn primary" disabled={busy||!dirty}>{busy?'Wird gespeichert …':'Darstellung speichern'}</button></footer>
 {#if error||notice}<div class="appearance-notice"><p id="appearance-notice" class:field-error={!!error} role={error?'alert':'status'} tabindex="-1">{error||notice}</p>{#if error}<button class="text-link mt" type="button" disabled={busy} onclick={()=>refreshAll()}>Gespeicherte Auswahl neu laden</button>{/if}</div>{/if}</form>
</section>
<style>.appearance-settings{margin-bottom:28px;scroll-margin-top:24px}.appearance-settings .panel-body{max-width:830px}.appearance-description{font-size:14px;line-height:1.7;max-width:70ch}.appearance-settings .panel-footer{gap:16px;flex-wrap:wrap}.appearance-notice{padding:0 24px 24px;font-size:14px}.appearance-notice p:not(.field-error){color:var(--success)}@media(max-width:650px){.appearance-settings .panel-footer .btn{width:100%;min-height:48px}.appearance-notice{padding:0 20px 20px}}</style>
