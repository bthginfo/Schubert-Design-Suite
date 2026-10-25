<script lang="ts">
  import { onMount, onDestroy, tick, type Snippet } from 'svelte';
  import Icon from '../Icon.svelte';

  let { id, side, title, overlay, closeLabel, returnFocusId, onclose, children }: {
    id: string;
    side: 'left' | 'right';
    title: string;
    overlay: boolean;
    closeLabel: string;
    returnFocusId: string;
    onclose: () => void;
    children: Snippet;
  } = $props();
  let dialog: HTMLDialogElement | undefined = $state();
  let panel: HTMLElement | undefined = $state();
  let opener: HTMLElement | null = null;
  let wasOverlay = false;
  let disposing = false;

  onMount(() => {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    wasOverlay = overlay;
  });
  $effect(() => {
    if (!overlay || !dialog) return;
    const current = dialog;
    void tick().then(() => {
      if (!current.isConnected || current.open) return;
      current.showModal();
      current.querySelector<HTMLButtonElement>('.panel-close')?.focus({ preventScroll: true });
    });
  });
  onDestroy(() => {
    disposing = true;
    if (typeof document === 'undefined') return;
    const active = document.activeElement;
    const shouldRestore = active === document.body || active === document.documentElement || !!panel?.contains(active) || !!dialog?.contains(active);
    if (dialog?.open) dialog.close();
    if (!shouldRestore) return;
    void tick().then(() => {
      if (document.querySelector('dialog[open]')) return;
      const current = document.activeElement;
      if (current instanceof Element && current !== document.body && current !== document.documentElement && current.isConnected) return;
      const target = wasOverlay && opener?.isConnected && opener.getClientRects().length ? opener : document.getElementById(returnFocusId);
      target?.focus({ preventScroll: true });
    });
  });
</script>

{#snippet content()}
  <header class="panel-heading">
    <h2>{title}</h2>
    <button type="button" class="panel-close" aria-label={closeLabel} onclick={onclose}><Icon name="close" size={17}/></button>
  </header>
  <div class="panel-content">{@render children()}</div>
{/snippet}

{#if overlay}
  <dialog {id} class="workbench-drawer" class:left={side === 'left'} aria-label={title} bind:this={dialog}
    oncancel={(event) => { event.preventDefault(); onclose(); }}
    onclose={() => { if (!disposing) onclose(); }}>
    {@render content()}
  </dialog>
{:else}
  <aside {id} class="workbench-panel" data-workbench-side={side} aria-label={title} bind:this={panel}>
    {@render content()}
  </aside>
{/if}

<style>
  .workbench-panel,.workbench-drawer{box-sizing:border-box;display:flex;flex-direction:column;min-width:0;min-height:0;background:var(--paper);color:var(--ink)}
  .workbench-panel{height:100%;overflow:hidden}
  .workbench-panel[data-workbench-side=left]{border-right:1px solid var(--line)}
  .workbench-panel[data-workbench-side=right]{border-left:1px solid var(--line)}
  .panel-heading{display:flex;flex:none;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;min-height:44px;border-bottom:1px solid var(--line-soft,var(--line));background:var(--input-surface,var(--paper))}
  .panel-heading h2{min-width:0;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:1.5;font-weight:600;letter-spacing:-.015em}
  .panel-close{display:grid;place-items:center;flex:none;width:34px;height:34px;min-width:34px;padding:0;border:0;border-radius:7px;background:transparent;color:var(--muted);cursor:pointer}
  .panel-close:hover{background:var(--wash);color:var(--ink)}
  .panel-close:focus-visible{outline:2px solid var(--forest);outline-offset:2px}
  .panel-content{display:flex;flex:1;flex-direction:column;min-height:0;min-width:0;overflow:hidden}
  .workbench-drawer{position:fixed;inset:12px;margin:0 0 0 auto;width:min(420px,calc(100% - 24px));height:calc(100dvh - 24px);max-height:calc(100dvh - 24px);max-width:calc(100% - 24px);padding:0;border:0;border-radius:14px;box-shadow:var(--overlay-shadow,0 18px 55px #08111f40);overscroll-behavior:contain}
  .workbench-drawer.left{margin:0 auto 0 0}
  .workbench-drawer:not([open]){display:none}
  .workbench-drawer::backdrop{background:#08111f80}
  .workbench-drawer .panel-heading{padding:8px 14px}
  .workbench-drawer .panel-heading h2{font-size:15px}
  .workbench-drawer .panel-close{width:48px;height:48px;min-width:48px}
</style>
