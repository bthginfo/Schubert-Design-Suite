<script lang="ts">
  import {valueLabels} from '#lib/client/api.ts';
  import {countries,normalizeCountry} from '@schubert/contracts';
  import type {Field} from '#lib/client/types.ts';
  import {fieldHelp} from '#lib/client/field-help.ts';
  import WorkPattern from './WorkPattern.svelte';import MappingEditor from './MappingEditor.svelte';import CuttingOutputs from './CuttingOutputs.svelte';import DatevMapping from './DatevMapping.svelte';
  import TaxSplits from './TaxSplits.svelte';
  import ReferencePicker from './ReferencePicker.svelte';
  let {field,value=$bindable(),lookups={},error='',prefix='field',mappingKind='customers',referenceParentId,referenceAsOf,referenceKind}:{field:Field;value?:any;lookups?:Record<string,{id:string;name:string}[]>;error?:string;prefix?:string;mappingKind?:string;referenceParentId?:string;referenceAsOf?:string;referenceKind?:string}=$props();
  const id=$derived(`${prefix}-${field.key}`);
  const help=$derived(fieldHelp(field));
  const descriptions=$derived([help?`${id}-help`:'',error?`${id}-error`:''].filter(Boolean).join(' ')||undefined);
  const emptyReference=$derived(({ 'report-rules':'Noch keine freigegebene Bewertungsregel auswählbar. Lassen Sie die fachliche Grundlage im Bereich Regeln & Freigaben prüfen.', 'design-revisions':'Noch kein technisch freigegebener Planstand auswählbar. Prüfen und bestätigen Sie die passende Revision im Planungsstudio.', 'document-versions':'Noch keine geprüfte Originalversion auswählbar. Laden Sie den Nachweis privat hoch und warten Sie seine Sicherheitsprüfung ab.', 'bank-accounts':'Noch keine bestätigte eigene Bankverbindung auswählbar. Die Geschäftsführung prüft und bestätigt das Konto in den Betriebseinstellungen.'} as Record<string,string>)[field.reference||'']||'Noch kein Eintrag auswählbar. Legen Sie die zugehörigen Stammdaten zuerst an.');
</script>
<div class:full={field.type==='textarea'} class="field">
  {#if field.key==='tax_splits'}<TaxSplits {id} bind:value/>{:else if field.key==='outputs'}<CuttingOutputs bind:value {lookups}/>{:else if field.key==='datev_mapping'}<DatevMapping {id} bind:value/>{:else if field.key==='mapping'}<span class="field-label">Spalten aus der Quelldatei zuordnen</span><MappingEditor bind:value kind={mappingKind}/>{:else if field.key==='work_pattern'}
    <WorkPattern {id} bind:value required={field.required}/>
  {:else if field.type==='checkbox'}
    <label class="check-field" for={id}><input id={id} type="checkbox" bind:checked={value} aria-invalid={!!error}/><span>{field.label}{field.required?' *':''}</span></label>
  {:else}
    <label for={id}>{field.label}{field.required?' *':''}{field.internal?' · intern':''}</label>
    {#if field.key==='country'}
      <select {id} value={normalizeCountry(String(value||''))||value||''} onchange={(event)=>value=event.currentTarget.value} required={field.required} aria-invalid={!!error} aria-describedby={descriptions} autocomplete="country">
        <option value="">Bitte auswählen</option>
        {#if value&&!normalizeCountry(String(value))}<option value={value}>Bisherige Angabe prüfen: {value}</option>{/if}
        {#each countries as country}<option value={country.value}>{country.label}</option>{/each}
      </select>
    {:else if field.key==='user_id'&&lookups.users}
      <ReferencePicker {id} bind:value reference="users" initial={lookups.users} required={field.required} invalid={!!error} describedBy={descriptions}/>
    {:else if field.type==='textarea'}
      <textarea {id} bind:value minlength={field.key==='statement'?10:undefined} required={field.required} aria-invalid={!!error} aria-describedby={descriptions}></textarea>
    {:else if field.type==='reference'}
      {#key (field.reference||field.key)+':' +(referenceParentId||'')+':' +(referenceAsOf||'')+':'+(referenceKind||'')}<ReferencePicker {id} bind:value reference={field.reference||field.key.replace(/_id$/,'')} initial={lookups[field.reference||field.key.replace(/_id$/,'')]||[]} required={field.required} invalid={!!error} describedBy={descriptions} parentId={referenceParentId} asOf={referenceAsOf} kind={referenceKind} emptyText={emptyReference}/>{/key}
    {:else if field.type==='select'}
      <select {id} bind:value required={field.required} aria-invalid={!!error} aria-describedby={descriptions}>
        <option value="">Bitte auswählen</option>
        {#each field.options||[] as option}<option value={option.value}>{field.key==='priority'?valueLabels[option.value]||option.label:option.label!==option.value?option.label:valueLabels[option.value]||option.label}</option>{/each}
      </select>
    {:else if field.type==='money'||field.type==='number'}
      <input {id} type="text" inputmode="decimal" bind:value required={field.required} aria-invalid={!!error} aria-describedby={descriptions}/>
    {:else}
      <input {id} type={field.type} bind:value minlength={field.key==='person_name'?2:undefined} required={field.required} aria-invalid={!!error} aria-describedby={descriptions}/>
    {/if}
  {/if}
  {#if help&&field.key!=='work_pattern'}<span class="field-help" id={`${id}-help`}>{help}</span>{/if}
  {#if error}<span class="field-error" id={`${id}-error`}>{error}</span>{/if}
</div>
