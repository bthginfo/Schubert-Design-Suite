<script lang="ts">
  import type { AssistantClarification } from "@schubert/contracts";
  import { onMount } from "svelte";
  import { searchableSelect } from "#lib/client/searchable-select.ts";
  import { parseLength, lengthInput } from "@schubert/geometry";
  import ReferencePicker from "./ReferencePicker.svelte";
  let {
    field,
    id,
    disabled = false,
    displayUnit = "mm",
    onchange,
    oninvalid,
  }: {
    field: AssistantClarification;
    id: string;
    disabled?: boolean;
    displayUnit?: string;
    onchange: (value: string) => void;
    oninvalid: (invalid: boolean) => void;
  } = $props();
  let raw = $state(""),
    unit = $state("mm"),
    error = $state(""),
    materialValue = $state("");
  onMount(() => {
    unit = ["mm", "cm", "m"].includes(displayUnit) ? displayUnit : "mm";
  });
  function length() {
    const parsed = raw.trim()
      ? parseLength(raw, unit as "mm" | "cm" | "m")
      : "";
    error =
      parsed === null
        ? "Bitte ein eindeutiges Maß eingeben, zum Beispiel 80,5."
        : "";
    oninvalid(!!error);
    onchange(
      parsed === null
        ? ""
        : raw.trim()
          ? lengthInput(parsed, unit as "mm" | "cm" | "m") + " " + unit
          : "",
    );
  }
  function material(value: string, choice?: { id: string; name: string }) {
    materialValue = value;
    onchange(
      value ? (choice?.name ?? value) + " (Materialstand " + value + ")" : "",
    );
  }
</script>

{#if field.kind === "length"}<div class="length-answer">
    <input
      {id}
      type="text"
      inputmode="decimal"
      {disabled}
      bind:value={raw}
      oninput={length}
      aria-invalid={!!error}
      aria-describedby={error ? id + "-error" : undefined}
    /><label for={id + "-unit"} class="sr-only"
      >Einheit für {field.question}</label
    ><select
      id={id + "-unit"}
      class="unit-choice"
      bind:value={unit}
      {disabled}
      onchange={length}
      ><option>mm</option><option>cm</option><option>m</option></select
    >
  </div>
  {#if error}<p id={id + "-error"} class="field-error">{error}</p>{/if}
{:else if field.kind === "choice"}<select
    use:searchableSelect={undefined}
    {id}
    {disabled}
    onchange={(event) => onchange(event.currentTarget.value)}
    ><option value="">Bitte auswählen</option
    >{#each field.options as option}<option value={option}>{option}</option
      >{/each}</select
  >
{:else if field.kind === "material"}<fieldset {disabled}>
    <ReferencePicker
      {id}
      reference="material-versions"
      value={materialValue}
      onchange={material}
    />
  </fieldset>
{/if}

<style>
  fieldset {
    padding: 0;
    margin: 0;
    border: 0;
    min-width: 0;
  }
  .length-answer {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 92px;
    gap: 8px;
  }
  input,
  select {
    box-sizing: border-box;
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 9px;
    background: var(--input-surface);
    color: var(--ink);
    font: inherit;
    font-size: 14px;
  }
  .field-error {
    color: var(--danger);
    font-size: 12px;
    line-height: 1.5;
  }
  .unit-choice {
    padding-right: 32px;
  }
  input:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--forest);
    outline-offset: 2px;
  }
  @media (max-width: 760px) {
    input,
    select {
      min-height: 48px;
      font-size: 16px;
    }
  }
</style>
