<script lang="ts">
  import type {Row} from '#lib/client/types.ts';
  import {display} from '#lib/client/api.ts';
  import Icon from './Icon.svelte';
  let {record,acceptance=false}:{record:Row;acceptance?:boolean}=$props();
  const declaration=$derived(record.confirmed_snapshot?.declaration||record.confirmation||record);
  const download=$derived(record.evidence_download_url||record.evidenceDownloadUrl||declaration.evidence_download_url);
</script>
{#if record.status==='confirmed'||declaration.statement}<section class="panel"><header class="panel-header"><h2>{acceptance?'Dokumentierte Abnahmeerklärung':'Dokumentierte Empfangserklärung'}</h2><Icon name="check" size={17}/></header><div class="panel-body">
  {#if declaration.statement}<dl class="definition-list"><div><dt>Erklärende Person</dt><dd>{declaration.person_name||'Nicht hinterlegt'}</dd></div><div><dt>Dokumentiert am</dt><dd>{display(record.confirmed_at||declaration.confirmed_at,'updated_at')}</dd></div><div class="full"><dt>Konkrete Erklärung</dt><dd>{declaration.statement}</dd></div>{#if acceptance&&record.reservations}<div class="full"><dt>Dokumentierte Vorbehalte / Mängel</dt><dd>{record.reservations}</dd></div>{/if}{#if acceptance}<div class="full"><dt>Frist laut bestätigter Vertragstypregel</dt><dd>{record.warranty_until?display(record.warranty_until,'date'):'Keine bestätigte Frist hinterlegt'}</dd></div>{/if}</dl>
  {#if download&&String(download).startsWith('/api/v1/')}<a class="btn mt" href={download} data-sveltekit-reload download><Icon name="download" size={16}/>Festgehaltenen Nachweis herunterladen</a>{:else if declaration.evidence_document_version_id||record.evidence_document_version_id}<p class="field-help mt">Die ausgewählte Nachweisversion ist fest mit dieser Erklärung verknüpft.</p>{/if}
  {:else}<p class="small">Für diesen älteren bestätigten Stand ist keine konkrete Erklärung in den verfügbaren Daten hinterlegt.</p>{/if}
</div></section>{/if}
