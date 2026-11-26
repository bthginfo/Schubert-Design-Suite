<script lang="ts">
  import {onMount} from 'svelte';
  import {refreshAll} from '$app/navigation';
  import {command,request,permitted,RequestError} from '#lib/client/api.ts';
  import type {AppData,Row} from '#lib/client/types.ts';
  import Icon from './Icon.svelte';
  import Status from './Status.svelte';
  import ArchiveSettings from './ArchiveSettings.svelte';
  import AiUsage from './AiUsage.svelte';

  let {data}:{data:AppData}=$props();
  let smtp:Row=$state({host:'',port:'',user:'',from:'',replyTo:''});
  // Claude provides text, vision, tool use and planning. The optional media connection only serves images and speech.
  const claudeModels=[
    {id:'claude-opus-5-5',label:'Claude Opus 5.5 · empfohlen',prices:{input:'4',output:'20'}},
    {id:'claude-sonnet-5-5',label:'Claude Sonnet 5.5 · schneller, günstiger',prices:{input:'2',output:'10'}},
    {id:'claude-haiku-5-5',label:'Claude Haiku 5.5 · sehr günstig, einfache Aufgaben',prices:{input:'0.1',output:'0.5'}},
    {id:'claude-fable-5-2',label:'Claude Fable 5.2 · höchste Fähigkeit, teuer',prices:{input:'8',output:'40'}},
  ];
  const efforts=[{id:'low',label:'Niedrig · schnell'},{id:'medium',label:'Mittel'},{id:'high',label:'Hoch · gründlich'},{id:'xhigh',label:'Sehr hoch'},{id:'max',label:'Maximal'}];
  let claude:Row=$state({textModel:'claude-opus-5-5',designModel:'claude-opus-5-5',effort:'low',planningEffort:'medium',designEffort:'high',inputCostPerMillion:'',outputCostPerMillion:'',designInputCostPerMillion:'',designOutputCostPerMillion:'',maxRequestCost:'1.00',designMaxRequestCost:'2.00',monthlyBudget:'50',workspaceId:''});
  let media:Row=$state({transcriptionModel:'gpt-4o-mini-transcribe-2025-12-15',imageModel:'gpt-image-2.5-flare',imageFallbackModel:'gpt-image-2',imageTextCostPerMillion:'5',imageInputCostPerMillion:'8',imageOutputCostPerMillion:'30',imageMaxRequestCost:'0.5',transcriptionInputCostPerMillion:'1.25',transcriptionOutputCostPerMillion:'5',transcriptionMaxRequestCost:'0.031'});
  let mediaKey=$state('');
  const known=(model:string)=>claudeModels.find(item=>item.id===model);
  const customText=$derived(!known(claude.textModel)),customDesign=$derived(!known(claude.designModel));
  let smtpSecret=$state('');let apiKey=$state('');let ownPassword=$state('');
  let recipient=$state('');let busy=$state('');let error=$state('');let notice=$state('');
  let fieldErrors:Record<string,string>=$state({});
  const allowed=$derived(permitted(data,'admin.integrations'));
  const config=$derived((data.related?.integration_settings as unknown as Row)||{});
  onMount(()=>{
    for(const key of Object.keys(smtp))smtp[key]=config.smtp?.[key]??'';
    for(const key of Object.keys(claude))claude[key]=config.anthropic?.[key]??claude[key];
    for(const key of Object.keys(media))media[key]=config.openai?.[key]??media[key];
    recipient=data.user?.email||'';
  });
  type Kind='smtp'|'anthropic'|'openai';
  const saved:Record<Kind,string>={smtp:'Die E-Mail-Einstellungen wurden gespeichert. Senden Sie jetzt eine Testmail an Ihre eigene Adresse.',anthropic:'Claude ist verbunden. Starten Sie unter „KI-Verbrauch“ eine kleine Verbindungsprüfung.',openai:'Der Bild- und Sprachdienst wurde gespeichert.'};
  function payloadFor(kind:Kind){
    if(kind==='smtp')return {host:smtp.host.trim(),port:Number(smtp.port),user:smtp.user,from:smtp.from.trim(),replyTo:smtp.replyTo.trim()||undefined,...(smtpSecret?{password:smtpSecret}:{})};
    if(kind==='openai')return {...media,transcriptionModel:media.transcriptionModel||undefined,imageModel:media.imageModel||undefined,...(mediaKey?{apiKey:mediaKey.trim()}:{})};
    // Published rates of known models are applied on the server; only own model ids send explicit rates.
    const rates=(model:string,input:string,output:string)=>known(model)?{}:{[input]:claude[input]||undefined,[output]:claude[output]||undefined};
    return {textModel:claude.textModel.trim(),designModel:claude.designModel.trim(),effort:claude.effort,planningEffort:claude.planningEffort,designEffort:claude.designEffort,maxRequestCost:claude.maxRequestCost,designMaxRequestCost:claude.designMaxRequestCost,monthlyBudget:claude.monthlyBudget,workspaceId:claude.workspaceId.trim(),
      ...rates(claude.textModel,'inputCostPerMillion','outputCostPerMillion'),...rates(claude.designModel,'designInputCostPerMillion','designOutputCostPerMillion'),...(apiKey?{apiKey:apiKey.trim()}:{})};
  }
  async function save(kind:Kind,event:SubmitEvent){
    event.preventDefault();if(busy||!allowed)return;
    busy=kind;error='';notice='';fieldErrors={};
    try{
      await request('/api/v1/reauth',{password:ownPassword});
      await command(`integrations.${kind}.update`,undefined,payloadFor(kind));
      smtpSecret='';apiKey='';mediaKey='';ownPassword='';
      notice=saved[kind];
      await refreshAll().catch(()=>{});
    }catch(e){error=e instanceof Error?e.message:'Die Einstellungen konnten nicht gespeichert werden. Ihre Eingaben bleiben erhalten.';if(e instanceof RequestError)fieldErrors=e.fields;}
    finally{busy='';}
  }
  async function test(event:SubmitEvent){
    event.preventDefault();if(busy||!allowed)return;busy='test';error='';notice='';
    try{await request('/api/v1/reauth',{password:ownPassword});await command('integrations.smtp.test',undefined,{recipient});ownPassword='';notice=`Die Testmail an ${recipient} wurde zum Versand eingereiht. Den tatsächlichen Versandstatus finden Sie unter Verarbeitung & Fehler.`;}
    catch(e){error=e instanceof Error?e.message:'Die Testmail konnte nicht versendet werden. Prüfen Sie die Zugangsdaten und die erlaubte Absenderadresse.';}
    finally{busy='';}
  }
</script>

{#if allowed}
<div class="integration-settings stack"><nav class="inline-actions" aria-label="Dienste einrichten"><a class="btn" href="#smtp-setup">E-Mail einrichten<Icon name="mail" size={16}/></a><a class="btn" href="#claude-setup">Claude verbinden<Icon name="spark" size={16}/></a><a class="btn" href="#media-setup">Bilder & Sprache<Icon name="image" size={16}/></a></nav>
  <div class="notice info"><Icon name="lock"/><div>Hier richten Sie E-Mail und KI für Ihren Betrieb ein. Gespeicherte Passwörter und Schlüssel werden nicht wieder angezeigt. Ein leeres Geheimnisfeld behält den vorhandenen Wert.</div></div>
  {#if error}<div class="notice error" role="alert"><Icon name="alert"/><div>{error}</div></div>{/if}
  {#if notice}<div class="notice info" role="status"><Icon name="check"/><div>{notice}</div></div>{/if}
  <section id="smtp-setup" class="panel">
    <header class="panel-header"><div><h2>E-Mail-Versand einrichten</h2><p>Die Angaben erhalten Sie von Ihrem E-Mail-Anbieter oder Ihrer IT.</p></div><Status value={config.smtp?.configured?'available':'needs_review'}/></header>
    <form class="panel-body" onsubmit={event=>save('smtp',event)}>
      <div class="field-grid">
        <div class="field"><label for="smtp-host">SMTP-Server *</label><input id="smtp-host" bind:value={smtp.host} required autocomplete="off" placeholder="smtp.ihr-anbieter.de"/><span class="field-help">Den Servernamen genau aus den Versand-Einstellungen Ihres Anbieters übernehmen.</span>{#if fieldErrors.host}<span class="field-error">{fieldErrors.host}</span>{/if}</div>
        <div class="field"><label for="smtp-port">Port *</label><input id="smtp-port" type="number" min="1" max="65535" bind:value={smtp.port} required placeholder="587"/><span class="field-help">Häufig 587 für STARTTLS oder 465 für direktes TLS. Verwenden Sie den Wert Ihres Anbieters.</span></div>
        <div class="field"><label for="smtp-user">Benutzername *</label><input id="smtp-user" bind:value={smtp.user} required autocomplete="off"/><span class="field-help">Meist die vollständige E-Mail-Adresse des Postfachs.</span></div>
        <div class="field"><label for="smtp-password">{config.smtp?.hasPassword?'Neues Postfachpasswort · optional':'Postfachpasswort *'}</label><input id="smtp-password" type="password" bind:value={smtpSecret} required={!config.smtp?.hasPassword} autocomplete="new-password"/><span class="field-help">{config.smtp?.hasPassword?'Ein Passwort ist gespeichert. Leer lassen, um es zu behalten.':'Gegebenenfalls ein App-Passwort des Anbieters verwenden.'}</span></div>
        <div class="field"><label for="smtp-from">Absenderadresse *</label><input id="smtp-from" type="email" bind:value={smtp.from} required placeholder="buero@ihr-betrieb.de"/><span class="field-help">Diese Adresse erscheint auf versandten E-Mails und muss beim Anbieter erlaubt sein.</span></div>
        <div class="field"><label for="smtp-reply">Antwortadresse · optional</label><input id="smtp-reply" type="email" bind:value={smtp.replyTo}/><span class="field-help">Nur ausfüllen, wenn Antworten an ein anderes Postfach gehen sollen.</span></div>
        <div class="field full"><label for="smtp-own-password">Ihr eigenes Suite-Passwort bestätigen *</label><input id="smtp-own-password" type="password" bind:value={ownPassword} autocomplete="current-password" required/><span class="field-help">Bestätigt die Änderung mit Ihrem persönlichen Zugang.</span></div>
      </div>
      <button class="btn primary mt" disabled={!!busy}>{busy==='smtp'?'Wird gespeichert …':'E-Mail-Einstellungen speichern'}</button>
    </form>
    <form class="integration-test" onsubmit={test}><div class="stack" style="flex:1;gap:16px"><div class="field"><label for="smtp-test-recipient">Testmail an Ihre Adresse</label><input id="smtp-test-recipient" type="email" bind:value={recipient} required/><span class="field-help">Versendet genau eine Testmail mit den zuletzt gespeicherten Einstellungen.</span></div><div class="field"><label for="smtp-test-password">Ihr eigenes Suite-Passwort bestätigen *</label><input id="smtp-test-password" type="password" bind:value={ownPassword} autocomplete="current-password" required/></div></div><button class="btn" disabled={!!busy||!config.smtp?.configured}>{busy==='test'?'Wird eingereiht …':'Testmail senden'}<Icon name="mail" size={16}/></button></form>
  </section>
  <section id="claude-setup" class="panel">
    <header class="panel-header"><div><h2>Claude verbinden</h2><p>Assistent, Planungsstudio, Unterlagen und Bürohilfe arbeiten mit Claude von Anthropic.</p></div><Status value={config.anthropic?.configured?'available':'needs_review'}/></header>
    <div class="panel-body integration-instructions"><ol>
      <li><strong>Plan-Credits verknüpfen.</strong> Max-, Ultra- und Team-Pläne enthalten monatliche API-Credits. Auf <a class="text-link" href="https://claude.ai/settings/billing" target="_blank" rel="noreferrer">claude.ai → Einstellungen → Abrechnung</a> den Plan einmalig mit der Claude-Console-Organisation verknüpfen, die die Suite nutzt. Die Verknüpfung lässt sich später nur über den Support ändern. <a class="text-link" href="https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers" target="_blank" rel="noreferrer">Regeln von Anthropic</a></li>
      <li><strong>API-Schlüssel erstellen.</strong> In der <a class="text-link" href="https://platform.claude.com/settings/keys" target="_blank" rel="noreferrer">Claude Console unter API Keys</a> in genau dieser Organisation einen Schlüssel für die Schubert Suite anlegen und unten einfügen.</li>
      <li><strong>Speichern und prüfen.</strong> Danach unter „KI-Verbrauch“ die kleine Verbindungsprüfung starten. Credits erscheinen monatlich, verfallen am Monatsende und gelten nicht für Claude Code.</li>
    </ol></div>
    <form class="panel-body integration-ai-form" onsubmit={event=>save('anthropic',event)}>
      <div class="field-grid">
        <div class="field full"><label for="claude-api-key">{config.anthropic?.hasApiKey?'Neuer Claude-API-Schlüssel · optional':'Claude-API-Schlüssel *'}</label><input id="claude-api-key" type="password" bind:value={apiKey} required={!config.anthropic?.hasApiKey} autocomplete="new-password" spellcheck="false" placeholder="sk-ant-…"/><span class="field-help">{config.anthropic?.hasApiKey?(config.anthropic?.keySource==='environment'?'Ein geschützter Serverschlüssel ist verfügbar. Leer lassen, um ihn zu verwenden.':'Ein Schlüssel ist verschlüsselt gespeichert. Leer lassen, um ihn zu behalten.'):'Der Schlüssel wird nur verschlüsselt auf dem Server gespeichert und nicht wieder angezeigt.'}</span>{#if fieldErrors.apiKey}<span class="field-error">{fieldErrors.apiKey}</span>{/if}</div>
        <div class="field full"><label for="claude-workspace">Workspace-ID · nur bei organisationsweitem Schlüssel</label><input id="claude-workspace" bind:value={claude.workspaceId} spellcheck="false" autocomplete="off" placeholder="wrkspc_…"/><span class="field-help">Leer lassen, wenn der Schlüssel in einem Workspace erstellt wurde. Die ID steht in der Claude Console unter Settings → Workspaces.</span>{#if fieldErrors.workspaceId}<span class="field-error">{fieldErrors.workspaceId}</span>{/if}</div>
        <div class="field"><label for="claude-text-model">Modell für Assistent & Planung *</label><select id="claude-text-model" bind:value={claude.textModel}>{#each claudeModels as model}<option value={model.id}>{model.label}</option>{/each}{#if customText}<option value={claude.textModel}>Eigene Kennung · {claude.textModel}</option>{/if}</select><span class="field-help">Opus 5.5 liefert die beste Planungsqualität. Der Aufwand wird je Aufgabe angepasst.</span></div>
        <div class="field"><label for="claude-effort">Aufwand im Büro & Chat</label><select id="claude-effort" bind:value={claude.effort}>{#each efforts as level}<option value={level.id}>{level.label}</option>{/each}</select><span class="field-help">Niedrig antwortet am schnellsten und günstigsten.</span></div>
        <div class="field"><label for="claude-planning-effort">Aufwand in den Planungsstudios</label><select id="claude-planning-effort" bind:value={claude.planningEffort}>{#each efforts as level}<option value={level.id}>{level.label}</option>{/each}</select><span class="field-help">Mittel ist für Maße, Inschriften und Planänderungen ausgewogen.</span></div>
        <div class="field"><label for="claude-request-cost">Kostenlimit je Anfrage · USD *</label><input id="claude-request-cost" inputmode="decimal" bind:value={claude.maxRequestCost} required/><span class="field-help">Vorsichtige Reservierung vor dem Aufruf. Abgerechnet wird der tatsächliche Verbrauch.</span></div>
        <div class="field"><label for="claude-monthly-budget">Monatsbudget der Suite · USD *</label><input id="claude-monthly-budget" inputmode="decimal" bind:value={claude.monthlyBudget} required/><span class="field-help">Gilt für alle KI-Aufrufe der Suite. Plan-Credits und Abrechnung der Console bleiben maßgeblich.</span></div>
        <details class="integration-advanced"><summary>Vertiefte Prüfung, eigene Modelle & Preise</summary><div class="field-grid mt">
          <div class="field full integration-model-policy"><h3>Vertiefte Designprüfung · nur auf Wunsch</h3><p class="small">Im Planungsstudio kann eine Person ausdrücklich „Vertieft prüfen“ wählen. Dann arbeitet Claude mit höherem Aufwand. Es gibt keinen automatischen Wechsel.</p></div>
          <div class="field"><label for="claude-design-model">Modell für vertiefte Prüfung *</label><select id="claude-design-model" bind:value={claude.designModel}>{#each claudeModels as model}<option value={model.id}>{model.label}</option>{/each}{#if customDesign}<option value={claude.designModel}>Eigene Kennung · {claude.designModel}</option>{/if}</select></div>
          <div class="field"><label for="claude-design-effort">Aufwand der vertieften Prüfung</label><select id="claude-design-effort" bind:value={claude.designEffort}>{#each efforts as level}<option value={level.id}>{level.label}</option>{/each}</select></div>
          <div class="field"><label for="claude-design-limit">Kostenlimit je vertiefter Prüfung · USD *</label><input id="claude-design-limit" inputmode="decimal" bind:value={claude.designMaxRequestCost} required/></div>
          <div class="field"><label for="claude-custom-model">Eigene Modellkennung · optional</label><input id="claude-custom-model" spellcheck="false" placeholder="claude-…" onchange={event=>{const value=(event.currentTarget as HTMLInputElement).value.trim();if(value)claude.textModel=value;}}/><span class="field-help">Nur für Modelle, die Ihre Organisation zusätzlich freigeschaltet hat. Dann Preise unten angeben.</span></div>
          {#if customText}
            <div class="field"><label for="claude-input-cost">Eingabepreis je 1 Mio. Tokens · USD *</label><input id="claude-input-cost" inputmode="decimal" bind:value={claude.inputCostPerMillion} required/></div>
            <div class="field"><label for="claude-output-cost">Ausgabepreis je 1 Mio. Tokens · USD *</label><input id="claude-output-cost" inputmode="decimal" bind:value={claude.outputCostPerMillion} required/></div>
          {/if}
          {#if customDesign}
            <div class="field"><label for="claude-design-input">Prüfung: Eingabepreis · USD *</label><input id="claude-design-input" inputmode="decimal" bind:value={claude.designInputCostPerMillion} required/></div>
            <div class="field"><label for="claude-design-output">Prüfung: Ausgabepreis · USD *</label><input id="claude-design-output" inputmode="decimal" bind:value={claude.designOutputCostPerMillion} required/></div>
          {/if}
          <p class="field-help full" style="grid-column:1/-1">Veröffentlichte Preise je 1 Mio. Tokens (Eingabe / Ausgabe): {claudeModels.map(model=>model.label.split(' · ')[0]+' '+model.prices.input+' / '+model.prices.output+' USD').join(' · ')}. Zwischengespeicherte Anweisungen werden deutlich günstiger abgerechnet.</p>
        </div></details>
        <div class="field full"><label for="claude-own-password">Ihr eigenes Suite-Passwort bestätigen *</label><input id="claude-own-password" type="password" bind:value={ownPassword} autocomplete="current-password" required/></div>
      </div>
      <button class="btn primary mt" disabled={!!busy}>{busy==='anthropic'?'Wird gespeichert …':'Claude-Einstellungen speichern'}</button>
    </form>
  </section>
  <section id="media-setup" class="panel">
    <header class="panel-header"><div><h2>Konzeptbilder & Spracheingabe · optional</h2><p>Claude erzeugt keine Bilder und keine Sprachaufnahmen. Dafür kann ein OpenAI-Projekt ergänzt werden.</p></div><Status value={config.openai?.configured?'available':'needs_review'}/></header>
    <form class="panel-body integration-ai-form" onsubmit={event=>save('openai',event)}>
      <div class="field-grid">
        <div class="field full"><label for="media-api-key">{config.openai?.hasApiKey?'Neuer OpenAI-Projektschlüssel · optional':'OpenAI-Projektschlüssel *'}</label><input id="media-api-key" type="password" bind:value={mediaKey} required={!config.openai?.hasApiKey} autocomplete="new-password" spellcheck="false"/><span class="field-help">Nur für fotorealistische Konzeptbilder und das Diktat. Ohne Schlüssel bleiben beide Funktionen sichtbar deaktiviert; alles andere läuft über Claude.</span></div>
        <div class="field"><label for="openai-image-model">Bildmodell</label><input id="openai-image-model" bind:value={media.imageModel} spellcheck="false"/><span class="field-help">Die Auswahl allein startet keine Bilderzeugung.</span></div>
        <div class="field"><label for="openai-transcription-model">Modell für Spracheingabe</label><input id="openai-transcription-model" bind:value={media.transcriptionModel} spellcheck="false"/></div>
        <details class="integration-advanced"><summary>Preise & Limits für Bilder und Sprache</summary><div class="field-grid mt">
          <div class="field"><label for="openai-image-fallback">Alternatives Bildmodell</label><input id="openai-image-fallback" bind:value={media.imageFallbackModel} spellcheck="false"/><span class="field-help">Nur wenn das bevorzugte Bildmodell nicht verfügbar ist.</span></div>
          <div class="field"><label for="openai-image-limit">Höchste Reservierung je Konzeptbild · USD *</label><input id="openai-image-limit" inputmode="decimal" bind:value={media.imageMaxRequestCost} required/></div>
          <div class="field"><label for="openai-image-text-price">Bild: Texteingabe · USD je 1 Mio. Tokens *</label><input id="openai-image-text-price" inputmode="decimal" bind:value={media.imageTextCostPerMillion} required/></div>
          <div class="field"><label for="openai-image-input-price">Bild: Bildeingabe · USD je 1 Mio. Tokens *</label><input id="openai-image-input-price" inputmode="decimal" bind:value={media.imageInputCostPerMillion} required/></div>
          <div class="field"><label for="openai-image-output-price">Bild: Bildausgabe · USD je 1 Mio. Tokens *</label><input id="openai-image-output-price" inputmode="decimal" bind:value={media.imageOutputCostPerMillion} required/></div>
          <div class="field"><label for="openai-audio-limit">Höchste Reservierung je Aufnahme · USD *</label><input id="openai-audio-limit" inputmode="decimal" bind:value={media.transcriptionMaxRequestCost} required/></div>
          <div class="field"><label for="openai-audio-input-price">Sprache: Eingabe · USD je 1 Mio. Tokens *</label><input id="openai-audio-input-price" inputmode="decimal" bind:value={media.transcriptionInputCostPerMillion} required/></div>
          <div class="field"><label for="openai-audio-output-price">Sprache: Ausgabe · USD je 1 Mio. Tokens *</label><input id="openai-audio-output-price" inputmode="decimal" bind:value={media.transcriptionOutputCostPerMillion} required/></div>
        </div></details>
        <div class="field full"><label for="media-own-password">Ihr eigenes Suite-Passwort bestätigen *</label><input id="media-own-password" type="password" bind:value={ownPassword} autocomplete="current-password" required/></div>
      </div>
      <button class="btn mt" disabled={!!busy}>{busy==='openai'?'Wird gespeichert …':'Bild- und Sprachdienst speichern'}</button>
    </form>
  </section>
  <AiUsage {data} configured={!!config.anthropic?.configured}/>
</div>
{/if}

<style>
  .integration-settings{margin-top:28px}.integration-test{display:flex;align-items:center;gap:24px;padding:24px 28px;border-top:1px solid var(--line);background:var(--paper)}.integration-test .field{flex:1}.integration-instructions{padding-bottom:0}.integration-instructions ol{margin:0;padding-left:21px;max-width:78ch}.integration-instructions li{font-size:14px;line-height:1.8;padding-left:6px;margin-bottom:15px}.integration-instructions strong{font-weight:600}.integration-instructions .text-link{font-size:inherit}.integration-ai-form{padding-top:20px}@media(max-width:760px){.integration-test{padding:22px 20px;align-items:stretch;flex-direction:column;gap:16px}.integration-instructions li{font-size:14px}.integration-test .btn{width:100%}}
.integration-advanced{grid-column:1/-1;border:1px solid var(--line);padding:17px 20px;border-radius:5px}.integration-advanced>summary{color:var(--forest);font-size:13px;cursor:pointer;min-height:35px;padding-top:7px}.integration-model-policy h3{font-size:16px;font-weight:550;margin-bottom:9px}.integration-model-policy p{line-height:1.7}@media(max-width:760px){.integration-advanced{padding:16px}.integration-advanced>summary{font-size:14px;min-height:44px}}</style>
<ArchiveSettings {data}/>
