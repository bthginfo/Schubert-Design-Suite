<script lang="ts">
  import {untrack} from 'svelte';
  import type {HTMLInputAttributes} from 'svelte/elements';
  import {parseLength, lengthInput} from '@schubert/geometry';
  import {usePlanningUnits} from '#lib/client/planning-units.svelte.ts';

  type Props = Omit<HTMLInputAttributes, 'value' | 'type' | 'oninput' | 'onchange'> & {
    value?: string;
    oninput?: (event: Event & {currentTarget: HTMLInputElement}) => void;
    onchange?: (event: Event & {currentTarget: HTMLInputElement}) => void;
  };
  let {value = $bindable(''), oninput, onchange, ...attributes}: Props = $props();
  const units = usePlanningUnits();
  const errorId = $props.id();
  let input: HTMLInputElement;
  let draft = $state(''), error = $state(''), focused = $state(false);
  let committed = '', lastUnit = units.unit;
  $effect(() => {
    const next = value, unit = units.unit;
    untrack(() => {
      if (!focused || unit !== lastUnit || next !== committed) {
        draft = lengthInput(next, unit);error = '';committed = next;
      }
      lastUnit = unit;
      input?.setCustomValidity(error);
    });
  });
  function read() {
    draft = input.value;
    const parsed = draft.trim() ? parseLength(draft, units.unit) : '';
    error = parsed === null ? `Ein eindeutiges Maß eingeben, z. B. 2,5 ${units.unit}. mm, cm oder m sind auch direkt eingebbar.` : '';
    input.setCustomValidity(error);
    if (parsed === null) return false;
    committed = parsed;value = parsed;return true;
  }
  function notify(event: Event & {currentTarget: HTMLInputElement}, callback: Props['onchange']) {
    input.value = value;
    try {callback?.(event);} finally {input.value = draft;}
  }
  function change(event: Event & {currentTarget: HTMLInputElement}) {
    if (!read()) return;
    // Existing geometry handlers receive canonical mm; only this control owns presentation.
    notify(event, onchange);input.value = draft = lengthInput(value, units.unit);
  }
</script>

<input {...attributes} title={attributes.title??`Dezimalzahl ohne Tausendertrennzeichen, z. B. 2,5 ${units.unit}. mm, cm oder m können Sie direkt ergänzen.`} data-length-input type="text" inputmode="decimal" bind:this={input} bind:value={draft}
  aria-invalid={!!error || attributes['aria-invalid'] === true || attributes['aria-invalid'] === 'true'}
  aria-describedby={[attributes['aria-describedby'], error ? errorId : ''].filter(Boolean).join(' ') || undefined}
  onfocus={() => focused = true} oninput={(event) => {if(read()) notify(event,oninput);}} onchange={change}
  onblur={() => {focused = false;if (!error) draft = lengthInput(value, units.unit);}}/>
<!-- The description is explicitly referenced; it must not become part of an enclosing label. -->
{#if error}<span id={errorId} class="length-error" aria-hidden="true">{error}</span>{/if}

<style>
  input{box-sizing:border-box;min-width:0;width:100%;max-width:100%;min-height:44px;border:1px solid var(--line);border-radius:9px;padding:9px 11px;background:var(--paper);color:var(--ink);font:inherit;font-size:14px;font-variant-numeric:tabular-nums}
  input:focus{outline:2px solid var(--forest);outline-offset:2px}input:disabled{color:var(--muted);background:var(--wash)}
  input[aria-invalid=true]{border-color:var(--danger)}.length-error{display:block;margin-top:6px;font-size:12px;line-height:1.5;color:var(--danger)}
  @media(max-width:760px){input{min-height:48px;font-size:16px}}
</style>
