<script lang="ts">
 import type {AppData,Row} from '#lib/client/types.ts';import {display} from '#lib/client/api.ts';
 let {record,data}:{record:Row;data:AppData}=$props();
</script>
<section class="panel"><header class="panel-header"><h2>Anlass & nächster Schritt</h2></header><div class="panel-body"><p class="mb"><strong>{record.urgency??'Kein Termin festgelegt'}</strong> · {display(record.priority??'normal')} · {display(record.assigned_to,'assigned_to',data)}</p><p>{record.source_label??'Zu dieser Aufgabe ist noch kein konkreter Vorgang verknüpft.'}</p>{#if record.source_href}<a class="btn mt" href={record.source_href}>Zugrunde liegenden Vorgang öffnen</a>{:else}<p class="field-help mt">Klären Sie den Originalvorgang mit der zuständigen Person, bevor Sie die Aufgabe als erledigt bestätigen.</p>{/if}</div></section>
