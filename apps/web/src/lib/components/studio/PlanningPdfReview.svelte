<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { PlanningPdfReview } from '@schubert/documents';
  import { focusTrap } from '#lib/client/focus-trap.ts';
  import Icon from '../Icon.svelte';

  let { variantId, revisionId, onclose }:
    { variantId: string; revisionId: string; onclose: () => void } = $props();
  let review = $state<PlanningPdfReview | null>(null), error = $state(''), loading = $state(true);
  let viewId = $state<PlanningPdfReview['views'][number]['id'] | undefined>();
  let selectedId = $state(''), zoom = $state(false);
  let canvas = $state<HTMLDivElement>();
  let controller: AbortController | undefined;
  const file = $derived('/api/v1/designs/' + variantId + '/export?revision_id=' + encodeURIComponent(revisionId));
  const current = $derived(review?.views.find(item => item.id === viewId) ?? review?.views[0]);
  const selected = $derived(current?.labels.find(label => label.id === selectedId));
  const findings = $derived((review?.views ?? []).flatMap(view =>
    view.labels.filter(label => label.state !== 'clear').map(label => ({ view, label }))));
  const unresolved = $derived(findings.filter(item => item.label.state === 'review').length);
  const viewport = $derived.by(() => {
    if (!current) return '0 0 1 1';
    if (!selected) return `0 115 ${current.width} ${current.height - 220}`;
    const width = Math.min(current.width, Math.max(270, selected.box.width + 180));
    const height = width * .62;
    const x = Math.max(0, Math.min(current.width - width, selected.box.x + (selected.box.width - width) / 2));
    const y = Math.max(0, Math.min(current.height - height, current.height - selected.box.y - (selected.box.height + height) / 2));
    return `${x} ${y} ${width} ${height}`;
  });

  async function load() {
    controller?.abort();
    const active = new AbortController();
    controller = active;
    loading = true;
    error = '';
    try {
      const response = await fetch(file + '&kind=pdf-check', { signal: active.signal });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw Error(body?.error?.message || 'Die Ausgabeprüfung konnte nicht geladen werden.');
      if (!active.signal.aborted) review = body.result;
    } catch (cause) {
      if (!active.signal.aborted) error = cause instanceof Error ? cause.message : 'Die Ausgabeprüfung konnte nicht geladen werden.';
    } finally {
      if (!active.signal.aborted) loading = false;
    }
  }

  function chooseView(view: NonNullable<typeof current>) {
    viewId = view.id;
    selectedId = '';
    zoom = false;
    canvas?.scrollTo(0, 0);
  }

  async function locate(item: typeof findings[number]) {
    chooseView(item.view);
    selectedId = item.label.id;
    await tick();
    canvas?.focus({ preventScroll: true });
  }

  onMount(() => {
    void load();
    return () => controller?.abort();
  });
</script>

<div class="modal-backdrop" role="presentation">
  <div class="modal pdf-review" role="dialog" aria-modal="true" aria-labelledby="pdf-review-title"
    tabindex="-1" use:focusTrap onkeydown={(event) => { if (event.key === 'Escape') onclose(); }}>
    <header class="modal-header">
      <div><h2 id="pdf-review-title">Planungs-PDF prüfen</h2>
        <p>{review ? 'Maßansichten der gespeicherten Revision ' + review.revision : 'Vorschau der Maßansichten'}</p>
      </div>
      <button class="icon-button" aria-label="Vorschau schließen" onclick={onclose}><Icon name="close" size={19}/></button>
    </header>
    <div class="modal-body review-body" aria-busy={loading}>
      {#if loading}<p role="status" class="muted">Maßansichten werden vorbereitet …</p>
      {:else if error}<div role="alert" class="notice error"><div>{error}</div>
        <button class="btn small" onclick={load}>Erneut versuchen</button>
      </div>
      {:else if review && current}
        <div class="review-controls">
          <div class="segmented review-views" role="group" aria-label="Maßansicht">
            {#each review.views as view (view.id)}
              <button type="button" class="btn small" aria-pressed={current.id === view.id}
                onclick={() => chooseView(view)}>{view.id === 'top' ? 'Draufsicht' : view.id === 'front' ? 'Vorderansicht' : 'Seitenansicht'}</button>
            {/each}
          </div>
          <button class="btn small zoom-control" aria-pressed={zoom || !!selected}
            onclick={() => { if (selectedId) selectedId = ''; else zoom = !zoom; }}>
            <Icon name="search" size={15}/>{selected || zoom ? 'Ganze Ansicht' : 'Vergrößern'}
          </button>
        </div>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users can pan the enlarged drawing inside this scroll region.) -->
        <div class="review-canvas" role="region" aria-label={'Maßansicht ' + current.title} tabindex="0" bind:this={canvas}>
          <svg viewBox={viewport} class:zoom role="img" aria-label={current.title}>
            <g transform={`translate(0 ${current.height}) scale(1 -1)`}>
              {#each current.outlines as outline}
                <path d={outline.path} fill={outline.erase ? 'white' : 'none'}
                  stroke={outline.erase ? 'white' : outline.opening ? '#315c4c' : '#202522'}
                  stroke-width={outline.secondary ? .35 : outline.opening ? 1.3 : .65}
                  stroke-dasharray={outline.dashed ? '4 3' : undefined}/>
              {/each}
              {#each current.lines as line}
                <line x1={line.start.x} y1={line.start.y} x2={line.end.x} y2={line.end.y} stroke="#657168" stroke-width=".5"/>
              {/each}
              {#each current.ticks as line}
                <line x1={line.start.x} y1={line.start.y} x2={line.end.x} y2={line.end.y} stroke="#315c4c" stroke-width=".7"/>
              {/each}
              {#each current.markers as point}
                <circle cx={point.x} cy={point.y} r="6" fill="white" stroke="#315c4c" stroke-width=".6"/>
              {/each}
              {#each current.labels as label (label.id)}
                {#if label.leader}<line x1={label.leader.start.x} y1={label.leader.start.y}
                  x2={label.leader.end.x} y2={label.leader.end.y} stroke="#657168" stroke-width=".5" stroke-dasharray="2 2"/>{/if}
              {/each}
              {#each current.labels as label (label.id)}
                <rect x={label.box.x} y={label.box.y} width={label.box.width} height={label.box.height}
                  fill={label.id === selectedId ? '#fff0bc' : '#ffffff'}
                  stroke={label.state === 'review' || label.id === selectedId ? '#a55614' : undefined} stroke-width="1.3"/>
              {/each}
            </g>
            {#each current.markers as point}
              <text x={point.x} y={current.height - point.y + 3} text-anchor="middle" font-size="8" fill="#315c4c">{point.index}</text>
            {/each}
            {#each current.labels as label (label.id)}
              <text x={label.x} y={current.height - label.y} font-size={label.size} textLength={label.width}
                lengthAdjust="spacingAndGlyphs" fill="#244e3d">{label.text}</text>
            {/each}
          </svg>
        </div>
        {#if findings.length}
          <section class="findings" aria-label="Maßtexte und Überlagerungen">
            <p class:field-error={unresolved > 0}>{unresolved ? unresolved + ' Maßtexte vor der Ausgabe prüfen.' : 'Überlagerungen automatisch aufgelöst.'}</p>
            <ul>
              {#each findings as item (item.label.id)}
                <li><button type="button" class="review-finding" aria-pressed={selectedId === item.label.id}
                  onclick={() => locate(item)}>
                  <span><strong>{item.label.text}</strong><small>{item.view.title} · {item.label.description}</small></span>
                  <span>{item.label.state === 'review' ? 'Prüfen' : 'Verschoben'} <Icon name="chevron" size={15}/></span>
                </button></li>
              {/each}
            </ul>
          </section>
        {:else}
          <p class="muted">Die Maßtexte liegen in den geprüften Ansichten frei.</p>
        {/if}
      {/if}
    </div>
    <footer class="modal-footer">
      <button type="button" class="btn" onclick={onclose}>Schließen</button>
      {#if review}<a class="btn primary" data-sveltekit-reload href={file + '&kind=pdf'}><Icon name="download" size={17}/>PDF herunterladen</a>{/if}
    </footer>
  </div>
</div>

<style>
  .pdf-review { width: min(65rem, calc(100vw - 1.5rem)); max-height: calc(100dvh - 1rem); }
  .review-body { min-width: 0; }
  .review-controls, .review-views { display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; }
  .review-controls { justify-content: space-between; margin-bottom: .7rem; }
  .review-views button[aria-pressed="true"] { background: var(--wash); border-color: var(--forest); color: var(--forest); }
  .review-controls button, .modal-footer :is(a,button) { min-height: 44px; }
  .review-canvas { max-height: 49dvh; overflow: auto; border: 1px solid var(--line); border-radius: 12px; background: #fff; }
  svg { width: 100%; display: block; font-family: system-ui, sans-serif; }
  svg.zoom { width: 185%; }
  .review-canvas + p, .findings { margin-top: .85rem; }
  .findings ul { padding: 0; list-style: none; }
  .review-finding {
    width: 100%; min-height: 50px; text-align: left; display: flex; justify-content: space-between;
    align-items: center; gap: .75rem; border: 0; border-bottom: 1px solid var(--line-soft);
    background: transparent; color: var(--ink); padding: .5rem .55rem; cursor: pointer;
  }
  .review-finding:hover, .review-finding[aria-pressed="true"] { background: var(--wash); }
  .review-finding small { display: block; color: var(--muted); overflow-wrap: anywhere; }
  .review-finding > span:last-child { display: flex; align-items: center; flex-shrink: 0; gap: .35rem; font-size: .85rem; }
  @media(max-width: 500px) {
    .pdf-review { width: 100%; max-height: 94dvh; }
    .review-views .btn { padding-inline: .5rem; }
  }
</style>
