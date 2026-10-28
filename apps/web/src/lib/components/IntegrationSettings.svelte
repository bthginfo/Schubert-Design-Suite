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
  let ai:Row=$state({textModel:'gpt-6-luna',transcriptionModel:'gpt-4o-mini-transcribe-2025-12-15',imageModel:'gpt-image-2.5-flare',imageFallbackModel:'gpt-image-2',imageTextCostPerMillion:'5',imageInputCostPerMillion:'8',imageOutputCostPerMillion:'30',imageMaxRequestCost:'0.5',transcriptionInputCostPerMillion:'1.25',transcriptionOutputCostPerMillion:'5',transcriptionMaxRequestCost:'0.031',inputCostPerMillion:'0.10',outputCostPerMillion:'0.50',maxRequestCost:'0.10',monthlyBudget:'5',designModel:'gpt-6.1-sol',designInputCostPerMillion:'2',designOutputCostPerMillion:'10',designMaxRequestCost:'0.25'});let modelPolicyConfirmed=$state(false);
  let smtpSecret=$state('');let apiKey=$state('');let ownPassword=$state('');
  let recipient=$state('');let busy=$state('');let error=$state('');let notice=$state('');
  let fieldErrors:Record<string,string>=$state({});
  const allowed=$derived(permitted(data,'admin.integrations'));
  const config=$derived((data.related?.integration_settings as unknown as Row)||{});
  onMount(()=>{
    ai.maxRequestCost=data.summary?.assistantModelProfile?.standard?.maxRequestCost??ai.maxRequestCost;
    for(const key of Object.keys(smtp))smtp[key]=config.smtp?.[key]??'';
    for(const key of Object.keys(ai))ai[key]=config.openai?.[key]??ai[key];
    recipient=data.user?.email||'';
  });
  async function save(kind:'smtp'|'openai',event:SubmitEvent){
    event.preventDefault();if(busy||!allowed)return;
    busy=kind;error='';notice='';fieldErrors={};
    try{
      await request('/api/v1/reauth',{password:ownPassword});
      if(kind==='openai'&&!modelPolicyConfirmed)throw new Error('Bestätigen Sie bitte die bewusste Auswahl für vertiefte Designprüfungen.');
      const payload=kind==='smtp'
        ?{host:smtp.host.trim(),port:Number(smtp.port),user:smtp.user,from:smtp.from.trim(),replyTo:smtp.replyTo.trim()||undefined,...(smtpSecret?{password:smtpSecret}:{})}
        :{...ai,transcriptionModel:ai.transcriptionModel||undefined,imageModel:ai.imageModel||undefined,...(apiKey?{apiKey:apiKey.trim()}:{})};
      await command(`integrations.${kind}.update`,undefined,payload);
      smtpSecret='';apiKey='';ownPassword='';
      notice=kind==='smtp'?'Die E-Mail-Einstellungen wurden gespeichert. Senden Sie jetzt eine Testmail an Ihre eigene Adresse.':'Die OpenAI-Einstellungen und Kostenlimits wurden gespeichert.';
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
<div class="integration-settings stack"><nav class="inline-actions" aria-label="Dienste einrichten"><a class="btn" href="#smtp-setup">E-Mail einrichten<Icon name="mail" size={16}/></a><a class="btn" href="#openai-setup">OpenAI verbinden<Icon name="spark" size={16}/></a></nav>
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
  <section id="openai-setup" class="panel">
    <header class="panel-header"><div><h2>OpenAI verbinden</h2><p>Eigenes API-Projekt, nachvollziehbare Modelle und bewusst gesetzte Kostenlimits.</p></div><Status value={config.openai?.configured?'available':'needs_review'}/></header>
    <div class="panel-body integration-instructions"><ol><li><strong>Projekt und Abrechnung vorbereiten.</strong> Öffnen Sie die <a class="text-link" href="https://platform.openai.com/" target="_blank" rel="noreferrer">OpenAI-Plattform</a>, wählen Sie Ihr Projekt und prüfen Sie dessen Abrechnung. Ein ChatGPT-Abonnement und die API-Abrechnung werden separat geführt.</li><li><strong>Projektschlüssel erstellen.</strong> Öffnen Sie im gewählten Projekt „API Keys“. Kopieren Sie den neu erstellten Schlüssel direkt in das Feld unten. <a class="text-link" href="https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform" target="_blank" rel="noreferrer">Anleitung von OpenAI</a></li><li><strong>Modell und Budget festlegen.</strong> Übernehmen Sie die genaue Modellkennung und die passenden Tokenpreise aus der <a class="text-link" href="https://platform.openai.com/pricing" target="_blank" rel="noreferrer">aktuellen OpenAI-Preisliste</a>. Zusätzliche Anbieterlimits prüfen Sie in Ihrem OpenAI-Projekt.</li></ol></div>
    <form class="panel-body integration-ai-form" onsubmit={event=>save('openai',event)}>
      <div class="field-grid">
        <div class="field full"><label for="openai-api-key">{config.openai?.hasApiKey?'Neuer API-Schlüssel · optional':'Projekt-API-Schlüssel *'}</label><input id="openai-api-key" type="password" bind:value={apiKey} required={!config.openai?.hasApiKey} autocomplete="new-password" spellcheck="false"/><span class="field-help">{config.openai?.hasApiKey?(config.openai?.keySource==='environment'?'Ein geschützter Serverschlüssel ist verfügbar. Leer lassen, um ihn beim Speichern zu übernehmen.':'Ein Schlüssel ist gespeichert. Leer lassen, um ihn zu behalten.'):'Der Schlüssel wird nur zum geschützten Server übertragen. Er wird nach dem Speichern nicht erneut angezeigt.'}</span></div>
        <div class="field"><label for="openai-text-model">Modell für den Assistenten *</label><input id="openai-text-model" bind:value={ai.textModel} required spellcheck="false"/><span class="field-help">Genaue Modellkennung eines Modells, das in Ihrem API-Projekt freigeschaltet ist.</span></div>
        <div class="field"><label for="openai-input-cost">Eingabepreis pro 1 Mio. Tokens *</label><input id="openai-input-cost" inputmode="decimal" bind:value={ai.inputCostPerMillion} required/><span class="field-help">USD laut Preisliste für das gewählte Textmodell. Dient der Kostenprüfung vor einer Anfrage.</span></div>
        <div class="field"><label for="openai-output-cost">Ausgabepreis pro 1 Mio. Tokens *</label><input id="openai-output-cost" inputmode="decimal" bind:value={ai.outputCostPerMillion} required/><span class="field-help">USD laut Preisliste. Eingabe- und Ausgabepreise können unterschiedlich sein.</span></div>
        <div class="field"><label for="openai-request-cost">Kostenlimit je Anfrage *</label><input id="openai-request-cost" inputmode="decimal" bind:value={ai.maxRequestCost} required/><span class="field-help">Höchster zulässiger kalkulierter Betrag in USD für eine einzelne Anfrage.</span></div>
        <div class="field"><label for="openai-monthly-budget">Monatsbudget der Suite *</label><input id="openai-monthly-budget" inputmode="decimal" bind:value={ai.monthlyBudget} required/><span class="field-help">Budget in USD für KI-Aufrufe dieser Suite. Die Abrechnung des Anbieters bleibt maßgeblich.</span></div>
        <details class="integration-advanced"><summary>Erweiterte Modelle & Kostenlimits</summary><div class="field-grid mt">
        <div class="field full integration-model-policy"><h3>Vertiefte Designprüfung · nur auf Wunsch</h3><p class="small">Der Standardassistent arbeitet mit dem günstigeren Textmodell. Für komplexe Planungen kann die Person im Studio ausdrücklich „Vertieft prüfen“ wählen. Es gibt keinen automatischen Wechsel zum teureren Modell.</p></div>
        <div class="field"><label for="openai-design-model">Modell für vertiefte Designprüfung *</label><input id="openai-design-model" bind:value={ai.designModel} required spellcheck="false"/><span class="field-help">Standardmäßig gpt-6.1-sol. Nur für eine ausdrücklich gewählte vertiefte Prüfung.</span></div>
        <div class="field"><label for="openai-design-input">Design-Eingabepreis pro 1 Mio. Tokens *</label><input id="openai-design-input" inputmode="decimal" bind:value={ai.designInputCostPerMillion} required/><span class="field-help">USD für das gewählte Designmodell.</span></div>
        <div class="field"><label for="openai-design-output">Design-Ausgabepreis pro 1 Mio. Tokens *</label><input id="openai-design-output" inputmode="decimal" bind:value={ai.designOutputCostPerMillion} required/><span class="field-help">USD für das gewählte Designmodell.</span></div>
        <div class="field"><label for="openai-design-limit">Kostenlimit je vertiefter Prüfung *</label><input id="openai-design-limit" inputmode="decimal" bind:value={ai.designMaxRequestCost} required/><span class="field-help">Höchster kalkulierter Betrag in USD je ausdrücklich ausgelöster Designprüfung.</span></div>
        <div class="field full integration-model-policy"><h3>Konzeptbilder · nur nach ausdrücklichem Auftrag</h3><p class="small">Das Bildmodell erzeugt KI-Konzeptbilder. Dies bestätigt weder technische Maße noch Fertigungstauglichkeit. Vor jedem Auftrag gelten die gespeicherten Kostenlimits.</p></div>
        <div class="field"><label for="openai-image-model">Bildmodell · optional</label><input id="openai-image-model" bind:value={ai.imageModel} spellcheck="false"/><span class="field-help">Die Auswahl allein startet keine Bilderzeugung.</span></div>
        <div class="field"><label for="openai-image-fallback">Alternatives freigegebenes Bildmodell</label><input id="openai-image-fallback" bind:value={ai.imageFallbackModel} spellcheck="false"/><span class="field-help">Nur verwenden, falls das bevorzugte Bildmodell im Anbieterprojekt nicht verfügbar ist. Standard: gpt-image-2.</span></div>
        <div class="field"><label for="openai-image-text-price">Bildauftrag: Texteingabe · USD je 1 Mio. Tokens *</label><input id="openai-image-text-price" inputmode="decimal" bind:value={ai.imageTextCostPerMillion} required/></div>
        <div class="field"><label for="openai-image-input-price">Bildauftrag: Bildeingabe · USD je 1 Mio. Tokens *</label><input id="openai-image-input-price" inputmode="decimal" bind:value={ai.imageInputCostPerMillion} required/></div>
        <div class="field"><label for="openai-image-output-price">Bildauftrag: Bildausgabe · USD je 1 Mio. Tokens *</label><input id="openai-image-output-price" inputmode="decimal" bind:value={ai.imageOutputCostPerMillion} required/></div>
        <div class="field"><label for="openai-image-limit">Höchste Reservierung je Konzeptbild · USD *</label><input id="openai-image-limit" inputmode="decimal" bind:value={ai.imageMaxRequestCost} required/><span class="field-help">Vorsichtige Obergrenze vor einem Auftrag. Die bestätigten tatsächlichen Kosten können deutlich darunter liegen.</span></div>
        <div class="field full integration-model-policy"><h3>Spracheingabe</h3><p class="small">Eine Aufnahme wird höchstens zwei Minuten lang und auf 2,8 MB begrenzt. Der erkannte Text bleibt vor dem Senden bearbeitbar.</p></div>
        <div class="field"><label for="openai-transcription-model">Modell für Spracheingabe · optional</label><input id="openai-transcription-model" bind:value={ai.transcriptionModel} spellcheck="false"/><span class="field-help">Ein Transkriptionsmodell für die Spracheingabe, falls verwendet.</span></div>
        <div class="field"><label for="openai-audio-input-price">Sprache: Eingabe · USD je 1 Mio. Tokens *</label><input id="openai-audio-input-price" inputmode="decimal" bind:value={ai.transcriptionInputCostPerMillion} required/></div>
        <div class="field"><label for="openai-audio-output-price">Sprache: Ausgabe · USD je 1 Mio. Tokens *</label><input id="openai-audio-output-price" inputmode="decimal" bind:value={ai.transcriptionOutputCostPerMillion} required/></div>
        <div class="field"><label for="openai-audio-limit">Höchste Reservierung je Aufnahme · USD *</label><input id="openai-audio-limit" inputmode="decimal" bind:value={ai.transcriptionMaxRequestCost} required/><span class="field-help">Standardmäßig 0,031 USD für eine Aufnahme bis zwei Minuten. Anbieterrechnung und tatsächlicher Verbrauch bleiben nachvollziehbar.</span></div>
        </div></details>
        <label class="check-field full" style="grid-column:1/-1"><input type="checkbox" bind:checked={modelPolicyConfirmed} required/><span>Vertiefte Prüfungen werden nur nach bewusster Auswahl ausgelöst. Die Suite darf nicht automatisch zum teureren Modell wechseln.</span></label>
        <div class="field full"><label for="openai-own-password">Ihr eigenes Suite-Passwort bestätigen *</label><input id="openai-own-password" type="password" bind:value={ownPassword} autocomplete="current-password" required/></div>
      </div>
      <button class="btn primary mt" disabled={!!busy}>{busy==='openai'?'Wird gespeichert …':'OpenAI-Einstellungen speichern'}</button>
    </form>
  </section>
  <AiUsage {data} configured={!!config.openai?.configured}/>
</div>
{/if}

<style>
  .integration-settings{margin-top:28px}.integration-test{display:flex;align-items:center;gap:24px;padding:24px 28px;border-top:1px solid var(--line);background:var(--paper)}.integration-test .field{flex:1}.integration-instructions{padding-bottom:0}.integration-instructions ol{margin:0;padding-left:21px;max-width:78ch}.integration-instructions li{font-size:14px;line-height:1.8;padding-left:6px;margin-bottom:15px}.integration-instructions strong{font-weight:600}.integration-instructions .text-link{font-size:inherit}.integration-ai-form{padding-top:20px}@media(max-width:760px){.integration-test{padding:22px 20px;align-items:stretch;flex-direction:column;gap:16px}.integration-instructions li{font-size:14px}.integration-test .btn{width:100%}}
.integration-advanced{grid-column:1/-1;border:1px solid var(--line);padding:17px 20px;border-radius:5px}.integration-advanced>summary{color:var(--forest);font-size:13px;cursor:pointer;min-height:35px;padding-top:7px}.integration-model-policy h3{font-size:16px;font-weight:550;margin-bottom:9px}.integration-model-policy p{line-height:1.7}@media(max-width:760px){.integration-advanced{padding:16px}.integration-advanced>summary{font-size:14px;min-height:44px}}</style>
<ArchiveSettings {data}/>
