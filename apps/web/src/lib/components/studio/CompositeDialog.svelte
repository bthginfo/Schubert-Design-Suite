<script lang="ts">
  import {searchableSelect} from '#lib/client/searchable-select.ts';
  import{onMount}from'svelte';
  import{invalidateAll}from'$app/navigation';
  import{command}from'#lib/client/api.ts';
  import{uploadOriginal}from'#lib/client/uploads.ts';
  let{revisionId,jobs=[],documents=[],onclose}:{revisionId:string;jobs?:any[];documents?:any[];onclose:()=>void}=$props();
  let dialog:HTMLDialogElement,sourceId=$state(''),candidateId=$state(''),rightsId=$state(''),statement=$state(''),sameCamera=$state(false),usage=$state(false),busy=$state(false),error=$state(''),notice=$state('');
  const originals=$derived(jobs.filter(j=>j.revision_id===revisionId&&j.status==='completed'&&j.profile!=='concept'&&j.result?.maskDocumentId&&(j.result?.manifestDocumentId||j.result?.renderManifestDocumentId)));
  const candidates=$derived(documents.filter(d=>d.mime_type==='image/png'&&d.entity_type==='design_revision'&&d.entity_id===revisionId));
  onMount(()=>{dialog.showModal();return()=>dialog.close();});
  async function upload(event:Event){const file=(event.currentTarget as HTMLInputElement).files?.[0];if(!file)return;busy=true;error='';try{await uploadOriginal(file,'design_revision',revisionId);notice='Kandidat versioniert abgelegt. Die Auswahl erscheint nach erfolgreicher Dateiprüfung; Quarantäne bleibt bis dahin sichtbar in der Dokumentenakte.';await invalidateAll();}catch(problem){error=(problem as Error).message;}finally{busy=false;}}
  async function submit(event:SubmitEvent){event.preventDefault();busy=true;error='';try{await command('planning.composite.request',undefined,{source_job_id:sourceId,candidate_document_version_id:candidateId,rights_evidence_version_id:rightsId,statement,same_camera_acknowledged:sameCamera,customer_concept_use_acknowledged:usage});await invalidateAll();onclose();}catch(problem){error=(problem as Error).message;}finally{busy=false;}}
</script>

<dialog bind:this={dialog} oncancel={onclose} aria-labelledby="composite-title">
  <header><span>BESTAND ERHALTEN · KONZEPT PRÜFEN</span><h2 id="composite-title">Das Original bleibt im Bild.</h2><p>Gespeichertes Renderbild und Schutzmaske sichern jeden Pixel der Bestandsinschrift. Außerhalb der Maske wird der zugeordnete Bildkandidat verwendet.</p></header>
  <form onsubmit={submit}>
    {#if error}<p class="alert danger" role="alert">{error}</p>{/if}{#if notice}<p class="alert" role="status">{notice}</p>{/if}
    <label>Abgeschlossenes Originalrender dieser Revision<select use:searchableSelect={sourceId} bind:value={sourceId} required><option value="">Original mit archivierter Bestandsmaske auswählen</option>{#each originals as job}<option value={job.job_run_id??job.id}>{job.profile==='final'?'Finale Ansicht':'Kundenansicht'} · {job.result.width} × {job.result.height} Pixel</option>{/each}</select></label>
    {#if !originals.length}<p class="hint">Zuerst die vorhandene Inschrift aus ihren lizenzierten Originalen korrekt platzieren, sperren und ein vollständiges Render mit Schutzmaske erzeugen. Ein Hersteller-Shopbild allein liefert keine exakten Originalzeichen.</p>{/if}
    <label>Geprüfter PNG-Bildkandidat derselben Revision<select use:searchableSelect={candidateId} bind:value={candidateId} required><option value="">Versionierten Kandidaten auswählen</option>{#each candidates as document}<option value={document.version_id??document.id}>{document.name}</option>{/each}</select></label>
    <label class="upload">Kandidaten dieser Revision zuordnen<input type="file" accept="image/png" onchange={upload} disabled={busy}/></label><a href="/documents" target="_blank" rel="noreferrer">Dateiprüfung in der Dokumentenakte öffnen</a>
    <label>Nutzungsnachweis für den Kandidaten<select use:searchableSelect={rightsId} bind:value={rightsId} required><option value="">Konkrete verfügbare Nachweisversion auswählen</option>{#each documents as document}<option value={document.version_id??document.id}>{document.name}</option>{/each}</select></label>
    <label>Persönliche Prüfung und dokumentierter Nutzungsumfang<textarea bind:value={statement} minlength="20" maxlength="5000" required rows="4" placeholder="Quelle, Berechtigung zur Kundenvisualisierung, geprüfter Bildausschnitt und Umfang der Bearbeitung"></textarea></label>
    <label class="check"><input type="checkbox" bind:checked={sameCamera} required/> Kandidat und Original verwenden denselben unveränderten Kameraausschnitt und dieselbe native Pixelgröße.</label>
    <label class="check"><input type="checkbox" bind:checked={usage} required/> Die Verwendung des Kandidaten für dieses Kundenkonzept ist durch den ausgewählten Nachweis gedeckt.</label>
    <p class="hint">Die Ausgabe wird als Konzeptbild mit geschützten Originalpixeln archiviert. Technische Freigaben, wörtliche Inschrift und Fertigungszeichnung behalten ihren eigenen Prüfstand.</p>
    <footer><button type="button" class="btn" onclick={onclose}>Zurück zum Plan</button><button class="btn primary" type="submit" disabled={busy||!originals.length}>{busy?'Wird gespeichert …':'Geschütztes Konzeptbild anfordern'}</button></footer>
  </form>
</dialog>

<style>
dialog{width:min(630px,94vw);max-height:92dvh;padding:0;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink)}dialog::backdrop{background:#15231fcc;backdrop-filter:blur(3px)}header{padding:28px 30px 20px;border-bottom:1px solid var(--line);background:var(--paper)}header>span{font-size:9px;letter-spacing:.12em;color:var(--muted)}h2{font-size:27px;font-weight:500;letter-spacing:-.8px;margin:12px 0}p{font-size:12px;line-height:1.8;color:var(--muted);margin:12px 0}form{padding:25px 30px}label{display:block;font-size:12px;line-height:1.6;margin-bottom:18px;color:var(--muted)}input,select,textarea{box-sizing:border-box;width:100%;min-height:42px;padding:10px;margin-top:7px;font:inherit;font-size:13px;background:var(--paper);border:1px solid var(--line);border-radius:4px;color:var(--ink)}.check{display:flex;align-items:start;gap:10px}.check input{width:16px;min-height:16px;margin-top:3px;accent-color:var(--forest)}.hint{font-size:11px;border-left:2px solid var(--line);padding-left:12px}.alert{font-size:12px;padding:12px;border:1px solid var(--line);background:var(--wash);white-space:pre-wrap}.alert.danger{border-color:var(--line);background:var(--danger-wash);color:var(--danger)}a{display:block;margin:-6px 0 20px;font-size:11px;color:var(--forest)}footer{display:flex;gap:10px;justify-content:space-between;margin-top:25px;padding-top:20px;border-top:1px solid var(--line)}.btn{white-space:normal;min-height:42px;font-size:11px}.btn.primary{background:var(--forest);color:var(--on-accent,#fff)}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid var(--forest);outline-offset:3px}@media(max-width:600px){header,form{padding:22px}h2{font-size:24px}input,select,textarea{font-size:16px}footer{flex-direction:column}}
label{font-size:13px}.hint,a,.btn{font-size:12px}@media(max-width:600px){.btn{min-height:48px}}
</style>
