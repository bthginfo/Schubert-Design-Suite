<script lang="ts">
  import Icon from '../Icon.svelte';
  let {
    label, count, locked, editable, onedit, onfit, onduplicate, onclear, canFit,
  }: {
    label: string; count: number; locked: boolean; editable: boolean; canFit: boolean;
    onedit: () => void; onfit: () => void; onduplicate: () => void; onclear: () => void;
  } = $props();
</script>

<div class="selection-bar" role="group" aria-label="Aktionen für die aktuelle Auswahl">
  <span class="selection-label">{#if locked}<Icon name="lock" size={14}/>{/if}{count > 1 ? count + ' Elemente' : label}</span>
  <button type="button" aria-label="Auswahl bearbeiten" title="Auswahl bearbeiten · Enter" onclick={onedit}><Icon name="settings" size={15}/><span>Bearbeiten</span></button>
  <button type="button" aria-label="Auswahl einpassen" title="Auswahl einpassen · F" disabled={!canFit} onclick={onfit}><Icon name="search" size={15}/><span>Einpassen</span></button>
  <button type="button" aria-label="Auswahl duplizieren" title="Auswahl duplizieren · Strg/⌘ D" disabled={!editable} onclick={onduplicate}><Icon name="copy" size={15}/><span>Duplizieren</span></button>
  <button type="button" aria-label="Auswahl aufheben" title="Auswahl aufheben · Escape" onclick={onclear}><Icon name="close" size={15}/></button>
  <button type="button" id="studio-help-toggle" popovertarget="studio-help-menu" aria-label="So geht's: Bedienhilfe öffnen" title="Bedienhilfe"><Icon name="help" size={16}/></button>
</div>

<style>
  .selection-bar { display: flex; align-items: center; gap: 4px; width: 100%; min-width: 0; padding-top: 5px; color: var(--ink); }
  .selection-label { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 6px 8px; font-size: 12px; font-weight: 550; }
  button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; flex: none; min-height: 40px; min-width: 40px; padding: 7px 10px; border-radius: 10px; color: var(--muted); background: transparent; font: inherit; font-size: 12px; }
  button:hover:not(:disabled) { background: var(--paper); color: var(--forest); }
  @media(max-width:760px) { button { min-height:44px; min-width:44px; padding:7px; } button:not(:first-of-type) span { display:none; } .selection-label { font-size:11px; padding-inline:4px; } }
</style>
