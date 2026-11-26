<script lang="ts">
  import {planningProgress,planningStepLabel,type PlanningStep,type DesignSnapshot} from '@schubert/contracts';
  import Icon from '../Icon.svelte';
  import {studioAssistantReply} from '#lib/client/studio-assistant.ts';
  let {snapshot,step,onstep,onadd,oninspect,onai,readonly=false,presetId=null}: {
    snapshot:DesignSnapshot;step:PlanningStep;presetId?:string|null;onstep:(step:PlanningStep)=>void;
    onadd:(kind:string)=>void;oninspect:(tab:string)=>void;onai:(prompt:string)=>void;readonly?:boolean;
  }=$props();
  const steps:PlanningStep[]=['geometry','design','review','output'];
  const memorial=$derived(snapshot.kind==='memorial');
  const progress=$derived(planningProgress(snapshot,presetId));
  const hasBase=$derived(progress.hasBase),hasInscription=$derived(progress.hasInscription);
  function nextDesign(){onstep('design');if(!readonly&&memorial&&!hasInscription)onadd('inscription');else if(!readonly&&!memorial&&!progress.hasDesign)onadd('stone_piece');}
  const hints=$derived({
    geometry:progress.preset.id==='memorial_existing'?'Bekannte Bestandsmaße und Unterlagen erfassen. Neue Beschriftung getrennt vom Bestand planen.':!memorial&&progress.preset.firstElement==='stone_piece'?'Länge, Tiefe, Materialstärke und Einbaubezüge des Bauteils erfassen.':memorial?'Form, Außenmaße und Material des Steins festlegen.':'Innenmaße und Öffnungen erfassen. Die Zeichnung kennzeichnet Maße zwischen Wandachsen mit „Achse“.',
    design:memorial?'Wörtlichen Text gestalten. Einfassung und Zubehör ergänzen.':'Natursteinbauteile, Oberflächen, Kanten und Ausschnitte planen.',
    review:memorial?'Maße, Inschrift und offene Nachweise am aktuellen Stand prüfen.':'Maße, Anschlüsse und offene Nachweise am aktuellen Stand prüfen.',
    output:'Planungs-PDF, Stückliste oder eine Kundenvisualisierung vorbereiten.'
  });
  function ask(){
    // Short, step-bound questions. The assistant only proposes; changes are applied in the studio.
    const prompts={geometry:progress.preset.id==='memorial_existing'?'Welche Bestandsmaße oder Unterlagen fehlen noch? Vorhandene Schrift bleibt unverändert.':!memorial&&progress.preset.firstElement==='stone_piece'?'Welche Angaben zu Länge, Tiefe, Stärke oder Einbau fehlen noch?':memorial?'Welche Angaben zu Steinform und Maßen fehlen noch?':'Welche Raummaße, Wandstärken oder Öffnungen fehlen noch?',design:memorial?'Schlage eine Gestaltung für die Inschrift vor. Namen, Daten und Zeilen bleiben exakt.':'Welche Angaben zu Material, Kanten oder Ausschnitten fehlen noch?',review:'Erkläre die offenen Punkte der Prüfliste nach Dringlichkeit. Nichts ändern.',output:'Was sollte die Kundenpräsentation enthalten? Nichts ändern.'};
    studioAssistantReply.set(null);
    onai(prompts[step]);
  }
  /** Compact step word, always a part of the full label (e.g. „Maße“ of „Stein & Maße“). */
  function shortLabel(item:PlanningStep,label:string){const parts=label.split(' & ');return parts.length<2?label:item==='geometry'?parts[1]:parts[0];}
  const reply=$derived($studioAssistantReply?.variantId===snapshot.variantId&&$studioAssistantReply.step===step?$studioAssistantReply:null);
</script>

<div class="planning-flow">
  <nav class="planning-steps" aria-label={memorial?'Arbeitsschritte im Grabmalstudio':'Arbeitsschritte im Raumstudio'}>
    {#each steps as item, index}
      {@const label=planningStepLabel(snapshot.kind,item,presetId)}
      <!-- The accessible name is the full label; the compact word is part of it and stays visible. -->
      <button type="button" class:current={step===item} aria-current={step===item?'step':undefined} title={`${label} · ${hints[item]}`} onclick={()=>onstep(item)}>
        <span class="step-number" aria-hidden="true">{index+1}</span><span class="sr-only">Schritt {index+1}: </span><span class="step-long">{label}</span><span class="step-short" aria-hidden="true">{shortLabel(item,label)}</span>
      </button>
    {/each}
  </nav>
  <div class="step-task">
    <div class="step-actions">
      {#if step==='geometry'}
        {#if hasBase}<button type="button" class="flow-action" onclick={nextDesign}><Icon name="arrow" size={15}/>{memorial?'Inschrift gestalten':'Bauteile gestalten'}</button>{:else}<button type="button" class="flow-action" disabled={readonly} onclick={()=>onadd(progress.preset.firstElement)}><Icon name="plus" size={15}/>Grundmaße erfassen</button>{/if}
      {:else if step==='design'}
        {#if progress.hasDesign}<button type="button" class="flow-action" onclick={()=>onstep('review')}><Icon name="check" size={15}/>Entwurf prüfen</button>{:else}<button type="button" class="flow-action" disabled={readonly} onclick={()=>onadd(hasBase?(memorial?'inscription':'stone_piece'):progress.preset.firstElement)}><Icon name="plus" size={15}/>{!hasBase?'Zuerst Grundmaße erfassen':memorial?'Beschriftung anlegen':'Steinbauteil ergänzen'}</button>{/if}
      {:else if step==='review'}
        <button type="button" class="flow-action" onclick={()=>oninspect('checks')}><Icon name="check" size={15}/>Prüfliste öffnen</button>
      {:else}
        <button type="button" class="flow-action" onclick={()=>oninspect('images')}><Icon name="image" size={15}/>Ausgaben öffnen</button>
      {/if}
      <button type="button" class="flow-ai" aria-label="KI für diesen Schritt" title="KI für diesen Schritt · schlägt nur vor, Sie entscheiden" onclick={ask}><Icon name="spark" size={15}/><span>KI für diesen Schritt</span></button>
    </div>
  </div>
  <div class="ai-reply-row" role="status">{#if reply}<p class="ai-reply" class:proposal={reply.kind==='proposal'}><Icon name={reply.kind==='proposal'?'spark':'help'} size={14}/><span><strong>{reply.kind==='proposal'?`Änderungsvorschlag (${reply.commandCount})`:'Kein Änderungsvorschlag – nur Hinweise'}</strong> {reply.kind==='proposal'?'Im Assistenten prüfen und ausdrücklich übernehmen oder verwerfen.':'Die KI-Antwort enthält keine anwendbare Änderung. Der Plan bleibt unverändert.'}</span><button type="button" aria-label="Hinweis zur KI-Antwort ausblenden" onclick={()=>studioAssistantReply.set(null)}><Icon name="close" size={12}/></button></p>{/if}</div>
</div>

<style>
  /* The step bar adapts to the studio's own width (e.g. with the assistant panel open), not only the viewport. */
  .planning-flow {
    container: planning-flow / inline-size;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    flex: none; padding: 7px 12px; background: var(--workspace-surface); border-bottom: 1px solid var(--line-soft);
  }
  .planning-steps {
    display: flex; align-items: stretch; gap: 3px; min-width: 0; padding: 3px; flex: 0 1 auto;
    border-radius: 12px; background: var(--wash);
    overflow-x: auto; scrollbar-width: none; overscroll-behavior-x: contain;
  }
  .planning-steps::-webkit-scrollbar { display: none; }
  .planning-steps button {
    position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 8px; flex: 0 0 auto; min-height: 38px; padding: 6px 13px;
    border-radius: 9px; color: var(--muted); font-size: .83rem; line-height: 1.35; white-space: nowrap;
  }
  .step-number {
    display: inline-grid; place-items: center; flex: none; width: 20px; height: 20px; border-radius: 50%;
    background: var(--line-soft, var(--line)); color: var(--muted); font-size: .72rem; font-weight: 650; font-variant-numeric: tabular-nums;
  }
  .planning-steps button.current .step-number { background: var(--forest); color: var(--on-accent); }
  .planning-steps button:hover { color: var(--ink); }
  .planning-steps button.current { background: var(--paper); color: var(--forest); font-weight: 650; box-shadow: var(--surface-shadow); }
  .step-short { display: none; }
  .step-task { min-width: 0; flex: 0 1 auto; }
  .step-actions { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .step-actions button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 38px; border-radius: 10px; padding: 6px 10px; font-size: .82rem; white-space: nowrap; }
  .flow-action { color: var(--forest); font-weight: 600; }
  .flow-action:hover, .flow-ai:hover { background: var(--accent-wash); }
  .flow-ai { color: var(--forest); }
  .planning-flow { flex-wrap: wrap; row-gap: 0; }
  .ai-reply-row { flex: 1 0 100%; min-width: 0; }
  .ai-reply-row:empty { display: none; }
  .ai-reply { display: flex; align-items: center; gap: 8px; margin: 6px 0 1px; padding: 4px 4px 4px 11px; border-radius: 10px; background: var(--wash); color: var(--ink); font-size: .78rem; line-height: 1.45; }
  .ai-reply.proposal { background: var(--accent-wash); }
  .ai-reply > span { flex: 1; min-width: 0; }
  .ai-reply strong { font-weight: 650; }
  .ai-reply.proposal strong { color: var(--forest); }
  .ai-reply button { display: grid; place-items: center; flex: none; min-height: 32px; min-width: 32px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--muted); cursor: pointer; }
  .ai-reply button:hover { background: var(--paper); }
  @container planning-flow (max-width: 1040px) {
    .planning-steps button { padding-inline: 9px; }
    .flow-ai span { display: none; }
  }
  @container planning-flow (max-width: 900px) {
    .step-long { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }
    .step-short { display: inline; }
  }
  @container planning-flow (max-width: 620px) {
    .planning-steps button { padding-inline: 7px; gap: 5px; }
    .flow-action { min-width: 38px; }
  }
  @media (max-width: 760px) {
    .planning-flow { flex-direction: column; align-items: stretch; gap: 0; padding: 5px 8px 2px; }
    .planning-steps button { flex: 1 0 auto; min-height: 44px; padding-inline: 4px; gap: 5px; }
    .step-number { width: 18px; height: 18px; font-size: .68rem; }
    .step-actions { justify-content: space-between; flex-wrap: wrap; }
    .step-actions button { min-height: 44px; }
    .flow-ai { min-width: 44px; }
    .flow-ai span { display: inline; }
    .ai-reply button { min-height: 44px; min-width: 44px; }
  }
  @media (max-width: 360px) {
    .flow-ai span { display: none; }
  }
</style>
