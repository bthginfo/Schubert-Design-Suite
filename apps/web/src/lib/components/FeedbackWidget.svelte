<script lang="ts">
  import {searchableSelect} from '#lib/client/searchable-select.ts';
  import {onMount,tick} from 'svelte';
  import {page} from '$app/state';
  import {feedbackCategories,feedbackPage,feedbackStepLabel,type FeedbackContext} from '@schubert/contracts';
  import {configureFeedback,recordFeedbackStep,recordFeedbackClick,feedbackSnapshot} from '#lib/client/feedback-context.ts';
  import {command} from '#lib/client/api.ts';
  import type {AppData} from '#lib/client/types.ts';
  import Icon from './Icon.svelte';
  let {data,launcher=true}:{data:AppData;launcher?:boolean}=$props();
  let dialog:HTMLDialogElement;
  let message=$state(''),expected=$state(''),category=$state<keyof typeof feedbackCategories>('bug'),includeContext=$state(true);
  let snapshot=$state<FeedbackContext|null>(null),source=$state({path:'/',label:'Arbeitsbereich'}),busy=$state(false),error=$state(''),receipt=$state('');
  let draftKey='',open=$state(false);
  const enabled=$derived(!!data.summary?.feedback?.enabled&&!!data.user);
  $effect(()=>{configureFeedback(data.user?.id??'',enabled);const path=page.url.pathname+page.url.search;if(enabled)recordFeedbackStep('navigation','Seite öffnen','opened');void path;});
  onMount(()=>{
    const launch=(event:Event)=>{const detail=(event as CustomEvent).detail;void show().then(()=>{if(open&&detail?.category==='usability'&&typeof detail.message==='string'&&!message.trim()){category='usability';message=detail.message.slice(0,10000);draftKey=crypto.randomUUID();}});};window.addEventListener('schubert:feedback:open',launch);
    const shortcut=(e:KeyboardEvent)=>{if(enabled&&e.altKey&&e.shiftKey&&e.code==='KeyF'){e.preventDefault();void show();}};
    document.addEventListener('click',recordFeedbackClick,true);document.addEventListener('keydown',shortcut);
    return()=>{configureFeedback('',false);window.removeEventListener('schubert:feedback:open',launch);document.removeEventListener('click',recordFeedbackClick,true);document.removeEventListener('keydown',shortcut);};
  });
  async function show(){
    if(open||!enabled)return;
    if(!message.trim()||receipt){message='';expected='';receipt='';error='';source=feedbackPage(page.url.pathname+page.url.search);snapshot=feedbackSnapshot(data.summary?.release??'development');draftKey=crypto.randomUUID();}
    open=true;await tick();dialog.showModal();document.getElementById('feedback-message')?.focus();
  }
  function close(){if(busy)return;dialog.close();open=false;}
  async function submit(event:SubmitEvent){event.preventDefault();if(busy)return;busy=true;error='';try{
    const result=await command('feedback.submit',undefined,{category,message:message.trim(),expected:expected.trim(),page:source.path,context:includeContext?snapshot:null},undefined,draftKey);
    receipt=result.number;message='';expected='';await tick();document.getElementById('feedback-done')?.focus();
  }catch(e){error=e instanceof Error?e.message:'Rückmeldung konnte nicht gesendet werden. Bitte erneut versuchen.';await tick();document.getElementById('feedback-send-error')?.focus();}finally{busy=false;}}
  function changed(){draftKey=crypto.randomUUID();}
</script>

{#if enabled&&launcher}<button class="feedback-fab" data-feedback-private aria-haspopup="dialog" aria-keyshortcuts="Alt+Shift+F" onclick={show} title="Feedback geben · Alt + Umschalt + F"><Icon name="pen" size={17}/>Feedback</button>{/if}
<dialog bind:this={dialog} class="feedback-dialog" data-feedback-private aria-labelledby="feedback-title" oncancel={e=>{e.preventDefault();close();}} onclose={()=>open=false}>
  <header><div><h2 id="feedback-title">{receipt?'Vielen Dank für Ihre Rückmeldung.':'Was können wir verbessern?'}</h2><p>{receipt?'Ihr Hinweis hilft uns, die Suite im Alltag besser zu machen.':'Ein Fehler, eine unklare Stelle oder eine Idee – wir hören zu.'}</p></div><button class="icon-button" aria-label="Feedback schließen" onclick={close} disabled={busy}><Icon name="close"/></button></header>
  {#if receipt}<div class="feedback-success" role="status"><Icon name="check" size={28}/><strong>{receipt} wurde gespeichert.</strong><p>Der Superadmin kann Ihren Kommentar und den mitgesendeten Kontext jetzt prüfen.</p></div><footer><button id="feedback-done" class="btn primary" onclick={close}>Fertig</button></footer>
  {:else}<form onsubmit={submit}>
    <div class="feedback-body">
      <p class="feedback-source"><Icon name="file" size={16}/><span>Ihre Rückmeldung zu <strong>{source.label}</strong></span></p>
      <div class="field"><label for="feedback-category">Worum geht es?</label><select use:searchableSelect={category} id="feedback-category" bind:value={category} onchange={changed} disabled={busy}>{#each Object.entries(feedbackCategories) as [value,label]}<option {value}>{label}</option>{/each}</select></div>
      <div class="field"><label for="feedback-message">Ihr Kommentar <span aria-hidden="true">*</span></label><textarea id="feedback-message" bind:value={message} oninput={changed} required minlength="5" maxlength="5000" rows="5" disabled={busy} placeholder="Zum Beispiel: Im Grundriss kann ich die Tür nicht verschieben. Ich habe …" aria-describedby="feedback-comment-help"></textarea><span class="field-help" id="feedback-comment-help">Was haben Sie versucht und was ist passiert? Bitte keine Passwörter oder vertraulichen Kundendaten eintragen.</span></div>
      <details><summary>Gewünschtes Verhalten ergänzen <span class="muted">· optional</span></summary><div class="field"><label for="feedback-expected">Was hätten Sie erwartet?</label><textarea id="feedback-expected" bind:value={expected} oninput={changed} maxlength="2000" rows="3" disabled={busy}></textarea></div></details>
      <div class="feedback-diagnostics"><label class="check-field"><input type="checkbox" bind:checked={includeContext} onchange={changed} disabled={busy}/><span>Letzte Bedienschritte zur Fehlersuche mitsenden</span></label><p class="field-help">Bis zu 40 Schritte der letzten 15 Minuten vor dem Öffnen, Seitennamen und Browsertyp. Keine Feldinhalte, Dateien oder Bildschirmaufnahmen. Die aktuelle Seite und Ihr Name werden immer mitgesendet.</p>
        {#if includeContext&&snapshot}<details><summary>Mitgesendeten Kontext ansehen ({snapshot.steps.length} Schritte)</summary><p class="small">{snapshot.browser} · {snapshot.os} · {snapshot.viewport.width} × {snapshot.viewport.height} px</p><ol class="feedback-steps">{#each snapshot.steps as step}<li><span>{feedbackStepLabel(step)}</span><small>{step.age_seconds} s zuvor · {feedbackPage(step.page).label}</small></li>{/each}</ol>{#if !snapshot.steps.length}<p class="small">Noch keine vorherigen Schritte erfasst.</p>{/if}<p class="field-help">Seite: {source.path}. App-Version: {snapshot.client_release.slice(0,12)}. Erfasste Fehler enthalten nur Fehlercode und technische Vorgangsnummer.</p></details>{/if}
      </div>
    </div>
    <footer>{#if error}<div id="feedback-send-error" tabindex="-1" class="notice error" role="alert">{error}</div>{/if}<button class="btn" type="button" onclick={close} disabled={busy}>Für später schließen</button><button class="btn primary" disabled={busy||message.trim().length<5}>{busy?'Wird gesendet …':'Feedback senden'}<Icon name="arrow" size={16}/></button></footer>
  </form>{/if}
</dialog>

<style>
  .feedback-dialog footer .notice{flex-basis:100%;margin:0}
  .feedback-dialog[open]{display:flex;flex-direction:column;overflow:hidden}.feedback-dialog header,.feedback-dialog footer{flex-shrink:0}.feedback-dialog form{display:flex;flex-direction:column;min-height:0}.feedback-dialog .feedback-body{min-height:0;overflow-y:auto;overscroll-behavior:contain}.feedback-dialog .feedback-success{overflow-y:auto}
  .feedback-fab{position:fixed;right:28px;bottom:80px;z-index:110;min-height:46px;display:flex;align-items:center;gap:9px;padding:0 18px;border:1px solid var(--forest);border-radius:24px;background:var(--canvas);color:var(--forest);font-weight:600;font-size:13px;cursor:pointer}.feedback-fab:hover{background:var(--wash)}
  .feedback-dialog{border:0;border-radius:14px;padding:0;background:var(--canvas);color:var(--ink);width:min(600px,calc(100vw - 32px));max-height:calc(100dvh - 40px);box-shadow:0 20px 70px #13241b33;overflow:auto}.feedback-dialog::backdrop{background:#17291e66}.feedback-dialog header{padding:28px 28px 20px;display:flex;align-items:flex-start;gap:16px;border-bottom:1px solid var(--line)}header>div{flex:1}h2{margin:0;font-size:24px;line-height:1.25;letter-spacing:-.025em}header p{font-size:13px;color:var(--muted);margin:10px 0 0;line-height:1.6}.feedback-body{display:grid;gap:20px;padding:24px 28px}.feedback-source{display:flex;gap:8px;align-items:center;font-size:13px;margin:0}.feedback-dialog textarea{resize:vertical;min-height:100px}.feedback-dialog details summary{font-size:13px;cursor:pointer;padding:8px 0;line-height:1.5}.feedback-dialog details .field{margin-top:12px}.feedback-diagnostics{border-top:1px solid var(--line);padding-top:20px}.feedback-diagnostics>p{margin:9px 0}.feedback-steps{margin:12px 0;padding-left:22px;font-size:12px}.feedback-steps li{padding:5px 0}.feedback-steps small{display:block;color:var(--muted);margin-top:3px}.feedback-dialog footer{padding:18px 28px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}.feedback-success{padding:36px 28px;display:grid;gap:15px}.feedback-success strong{font-size:18px}.feedback-success p{font-size:14px;line-height:1.65;max-width:48ch;margin:0}
  @media(max-width:760px){.feedback-fab{right:16px;bottom:calc(78px + env(safe-area-inset-bottom));min-height:48px}.feedback-dialog{width:calc(100vw - 24px);max-height:calc(100dvh - 24px);margin:auto}.feedback-dialog header{padding:22px 20px 18px}h2{font-size:22px}.feedback-body{padding:20px}.feedback-dialog footer{padding:16px 20px}.feedback-dialog footer .btn{flex:1;min-height:46px}.feedback-success{padding:28px 20px}}
</style>
