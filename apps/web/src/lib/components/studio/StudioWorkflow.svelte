<script lang="ts">
  import {planningProgress,planningStepLabel,type PlanningStep,type DesignSnapshot} from '@schubert/contracts';
  import Icon from '../Icon.svelte';
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
    const prompts={geometry:progress.preset.id==='memorial_existing'?'Hilf mir, den vorhandenen Stein mit belegten Bestandsmaßen und Unterlagen zu erfassen. Bestehende Schrift unverändert lassen; neue Beschriftung getrennt planen. Welche Angabe fehlt jetzt?':!memorial&&progress.preset.firstElement==='stone_piece'?'Hilf mir bei '+progress.preset.label+'. Kläre Länge, Tiefe, Materialstärke und Einbaubezüge am Bauteil. Kein vollständiges Raumaufmaß voraussetzen. Welche Angabe fehlt jetzt?':memorial?'Hilf mir bei Steinform und Maßen. Welche Angaben fehlen im aktuellen Plan für diesen Schritt?':'Hilf mir bei Raumgeometrie und Aufmaß. Prüfe den Maßbezug und frage gezielt nach fehlenden Innenmaßen, Wandstärken und Öffnungen.',design:memorial?'Hilf mir bei der ausgewählten Inschrift oder Gestaltung. Behalte vorhandene Namen, Daten und Zeilenumbrüche exakt bei. Frage zuerst nach meiner gewünschten Änderung.':'Hilf mir bei den ausgewählten Bauteilen und Materialien. Welche Angaben zu Nutzung, Materialstärke, Kanten oder Ausschnitten sind noch offen?',review:'Erkläre die offenen Punkte der aktuellen Prüfliste, nach Dringlichkeit und mit Bauteilbezug. Nenne den jeweils nächsten sinnvollen Schritt. Verändere den Plan nicht.',output:'Hilf mir, diesen Plan für das Kundengespräch vorzubereiten. Welche Inhalte und offenen Fragen sollte die Präsentation enthalten? Verändere den Plan nicht.'};
    onai(prompts[step]);
  }
</script>

<div class="planning-flow">
  <nav class="planning-steps" aria-label={memorial?'Arbeitsschritte im Grabmalstudio':'Arbeitsschritte im Raumstudio'}>
    {#each steps as item,index}
      <button type="button" class:current={step===item} aria-current={step===item?'step':undefined} title={hints[item]} onclick={()=>onstep(item)}>
        <span class="step-number">{index+1}</span>{' '}<span class="step-long">{planningStepLabel(snapshot.kind,item,presetId)}</span><span class="step-short">{{geometry:'Maße',design:memorial?'Text':'Material',review:'Prüfen',output:'Zeigen'}[item]}</span>
        {#if index<3}<Icon name="chevron" size={13}/>{/if}
      </button>
    {/each}
  </nav>
  <div class="step-task">
    <p>{hints[step]}</p>
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
      <button type="button" class="flow-ai" aria-label="KI für diesen Schritt" title="KI für diesen Schritt" onclick={ask}><Icon name="spark" size={15}/><span>KI für diesen Schritt</span></button>
    </div>
  </div>
</div>

<style>
  .planning-flow{flex:none;background:var(--paper);border-bottom:1px solid var(--line);padding:0 16px}
  .planning-steps{display:flex;gap:6px;padding:10px 0 7px;min-width:0}
  .planning-steps button{display:flex;align-items:center;justify-content:flex-start;gap:8px;flex:1;min-width:0;min-height:40px;padding:7px 10px;border:1px solid transparent;border-radius:11px;color:var(--muted);font:inherit;font-size:12px;line-height:1.45;text-align:left;transition:background .18s ease,color .18s ease,box-shadow .18s ease}
  .planning-steps button>span:nth-child(2){flex:1}
  .planning-steps button:hover{background:var(--wash);color:var(--ink)}
  .planning-steps button.current{background:var(--accent-wash);color:var(--forest);border-color:color-mix(in srgb,var(--forest) 16%,transparent)}
  .step-number{display:grid;place-items:center;flex:none;width:24px;height:24px;border-radius:8px;background:var(--wash);color:var(--muted);font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}
  .current .step-number{background:var(--forest);color:var(--on-accent)}
  .step-task{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 3px 10px}
  .step-task p{font-size:12px;line-height:1.6;color:var(--muted)}
  .step-actions{display:flex;flex:none;align-items:center;gap:8px}
  .step-actions button{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:36px;border-radius:9px;padding:7px 10px;font:inherit;font-size:12px;line-height:1.5;transition:background .18s ease}
  .flow-action{background:var(--wash);color:var(--ink)}.flow-action:hover{background:var(--accent-wash);color:var(--forest)}
  .flow-ai{color:var(--forest);border:1px solid var(--line)}.flow-ai:hover{background:var(--accent-wash)}
  @media(max-width:1100px){.step-task{flex-wrap:wrap}.step-task p{flex:1;min-width:180px}.planning-steps{gap:3px}.planning-steps button{gap:5px;padding:6px}.planning-steps button :global(svg){display:none}}
  @media(max-width:600px){.planning-flow{padding:0 8px}.planning-steps{padding:6px 0;gap:2px}.planning-steps button{flex-direction:column;justify-content:flex-start;gap:4px;padding:5px 3px;font-size:10px;text-align:center;border-radius:9px;min-height:61px}.step-number{width:22px;height:22px;border-radius:7px}.planning-steps button>span:nth-child(2){flex:none}.step-task{gap:3px;padding:0 2px 5px}.step-task p{display:none}.step-actions{width:100%;gap:6px;justify-content:space-between}.step-actions button{min-height:44px;font-size:11px}.flow-action{flex:1}.flow-ai{min-width:44px}.flow-ai span{display:none}}
  @media(prefers-reduced-motion:reduce){.planning-steps button,.step-actions button{transition:none}}

/* One row carries steps and the action for the current task. */
.planning-flow{display:flex;align-items:center;gap:12px;padding:7px 12px;border-bottom:1px solid var(--line)}.planning-steps{flex:1;min-width:0;margin:0;padding:0;border:0;gap:5px}.planning-steps button{min-height:38px;padding:6px 10px;font-size:12px}.planning-steps button>span:nth-child(2){flex:1}.step-task{padding:0;flex:none}.step-task>p{display:none}.step-actions button{min-height:36px;font-size:11px;padding:7px 9px}.step-number{width:23px;height:23px;font-size:11px}.flow-action{white-space:nowrap}
@media(max-width:1150px){.planning-flow{gap:7px}.planning-steps button{padding:6px;font-size:11px}.step-actions .flow-ai span{display:none}.planning-steps button :global(svg){display:none}}
@media(max-width:760px){.planning-flow{display:block;padding:5px 8px}.planning-steps{gap:3px;margin-bottom:4px}.planning-steps button{min-height:46px;font-size:10px;padding:4px 3px;gap:3px}.step-number{width:20px;height:20px}.step-task{padding:0}.step-actions{width:100%;justify-content:space-between;gap:6px}.step-actions button{min-height:40px;font-size:11px}.flow-action{flex:1}.flow-ai{min-width:44px}.step-actions .flow-ai span{display:inline}}
.step-short{display:none}@media(max-width:760px){.planning-steps{padding-block:6px;gap:4px}.planning-steps button{min-height:40px;flex-direction:row;gap:5px;padding:5px;font-size:12px;align-items:center;justify-content:center}.planning-steps .step-number{width:18px;height:18px;min-width:18px;font-size:10px}.planning-steps .step-long{display:none}.planning-steps .step-short{display:block;font-size:12px;line-height:1.35}.step-task{padding-bottom:6px}.step-actions button{min-height:40px}}
</style>
