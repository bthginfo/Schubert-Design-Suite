<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "./Icon.svelte";
  /** Short server-confirmed save receipt that outlives the closed editor dialog. */
  let { message }: { message: string } = $props();
  let shown = $state("");
  // The live region exists before its text changes, so assistive technology announces it.
  onMount(() => { const frame = requestAnimationFrame(() => (shown = message)); return () => cancelAnimationFrame(frame); });
</script>

<div class="toast saved-toast" class:pending={!shown} role="status" aria-live="polite">{#if shown}<Icon name="check" size={16} /><span>{shown}</span>{/if}</div>

<style>
  .saved-toast { align-items: center; transition: opacity .15s ease; }
  .saved-toast.pending { opacity: 0; pointer-events: none; }
</style>
