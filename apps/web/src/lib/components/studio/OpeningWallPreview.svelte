<script lang="ts">
  import type {DesignSnapshot, Point2} from '@schubert/contracts';
  import {lengthLabel, parseMillimetres, projectDesign, worldPoint} from '@schubert/geometry';
  import {usePlanningUnits} from '#lib/client/planning-units.svelte.ts';

  let {snapshot, wallId, offsetMm = '', widthMm = ''}: {
    snapshot: DesignSnapshot;
    wallId: string;
    offsetMm?: string;
    widthMm?: string;
  } = $props();
  const units = usePlanningUnits();
  const previewId = $props.id();
  const markerId = `${previewId}-direction`;
  const drawing = $derived.by(() => {
    const wall = snapshot.elements.find(element => element.id === wallId && element.kind === 'wall');
    if (!wall || wall.kind !== 'wall') return null;
    const start = worldPoint(snapshot, wall.startNodeId), end = worldPoint(snapshot, wall.endNodeId);
    const dx = Number(end.xMm) - Number(start.xMm), dy = Number(end.yMm) - Number(start.yMm);
    const length = Math.hypot(dx, dy);
    if (!Number.isFinite(length) || length === 0) return null;
    const shapes = projectDesign(snapshot, 'top').shapes.filter(shape => ['room', 'wall', 'opening'].includes(shape.kind));
    const points = [...shapes.flatMap(shape => shape.points), start, end];
    const xs = points.map(point => Number(point.xMm)), ys = points.map(point => Number(point.yMm));
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const scale = Math.min(400 / Math.max(1, maxX - minX), 144 / Math.max(1, maxY - minY));
    const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
    const project = (point: Point2) => ({x: 240 + (Number(point.xMm) - centerX) * scale, y: 100 - (Number(point.yMm) - centerY) * scale});
    const along = (distance: number) => project({xMm: String(Number(start.xMm) + dx * distance / length), yMm: String(Number(start.yMm) + dy * distance / length)});
    const offsetValue = parseMillimetres(offsetMm), widthValue = parseMillimetres(widthMm);
    const offset = offsetValue === null ? null : Number(offsetValue), width = widthValue === null ? null : Number(widthValue);
    const fits = offset !== null && offset >= 0 && offset <= length && (width === null || width > 0 && offset + width <= length);
    return {wall, shapes, length, project, along, start: project(start), end: project(end), offset, width, fits};
  });

  function path(points: Point2[], closed: boolean) {
    if (!drawing) return '';
    return points.map((point, index) => {
      const projected = drawing!.project(point);
      return `${index ? 'L' : 'M'}${projected.x},${projected.y}`;
    }).join(' ') + (closed ? ' Z' : '');
  }
</script>

{#if drawing}
  {@const arrowStart = drawing.along(drawing.length * .32)}
  {@const arrowEnd = drawing.along(drawing.length * .68)}
  <figure class="wall-preview">
    <figcaption><strong>{drawing.wall.label}</strong><span>Wandanfang A → Wandende B</span></figcaption>
    <svg viewBox="0 0 480 200" role="img" aria-label={`Grundriss mit ${drawing.wall.label}. Der Abstand beginnt bei A und läuft in Richtung B.`}>
      <defs><marker id={markerId} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="var(--forest)"/></marker></defs>
      {#each drawing.shapes as shape}
        <path d={`${path(shape.points, shape.closed)} ${shape.holes.map(hole => path(hole, true)).join(' ')}`}
          fill={shape.erase ? 'var(--paper)' : shape.closed && !shape.secondary ? shape.elementId === wallId ? 'var(--forest-soft, #e0e9e1)' : 'var(--wash)' : 'none'}
          fill-rule="evenodd" stroke={shape.erase ? 'var(--paper)' : shape.elementId === wallId ? 'var(--forest)' : 'var(--line)'}
          stroke-width={shape.elementId === wallId ? 2 : 1.5}/>
      {/each}
      <line x1={drawing.start.x} y1={drawing.start.y} x2={drawing.end.x} y2={drawing.end.y} stroke="var(--forest)" stroke-width="2.5"/>
      {#if drawing.fits && drawing.offset !== null}
        {@const openingStart = drawing.along(drawing.offset)}
        {#if drawing.width !== null && drawing.width > 0}
          {@const openingEnd = drawing.along(drawing.offset + drawing.width)}
          <line x1={openingStart.x} y1={openingStart.y} x2={openingEnd.x} y2={openingEnd.y} stroke="var(--accent, #4082bf)" stroke-width="8" stroke-linecap="round"/>
        {/if}
        <circle cx={openingStart.x} cy={openingStart.y} r="4" fill="var(--accent, #4082bf)" stroke="var(--paper)" stroke-width="1.5"/>
      {/if}
      <line x1={arrowStart.x} y1={arrowStart.y} x2={arrowEnd.x} y2={arrowEnd.y} stroke="var(--forest)" stroke-width="2.5" marker-end={`url(#${markerId})`}/>
      {#each [{point: drawing.start, label: 'A'}, {point: drawing.end, label: 'B'}] as endpoint}
        <circle cx={endpoint.point.x} cy={endpoint.point.y} r="14" fill="var(--paper)" stroke="var(--forest)" stroke-width="2"/>
        <text x={endpoint.point.x} y={endpoint.point.y + 6} text-anchor="middle" fill="var(--forest)" font-size="18" font-weight="700">{endpoint.label}</text>
      {/each}
    </svg>
    <p>Wandlänge A–B: {lengthLabel(drawing.length, units.unit)} {units.unit} · Wandachse</p>
    {#if drawing.offset !== null}
      <p class:outside={!drawing.fits}>{drawing.fits ? `Öffnungsbeginn: ${lengthLabel(drawing.offset, units.unit)} ${units.unit} ab A.` : 'Die eingegebene Öffnung liegt nicht vollständig zwischen A und B. Prüfen Sie Abstand und Breite.'}</p>
    {/if}
  </figure>
{:else if wallId}
  <p class="preview-unavailable">Für diese Wand ist keine eindeutige Richtung darstellbar. Prüfen Sie die vorhandenen Wandknoten.</p>
{/if}

<style>
  .wall-preview{margin:10px 0 18px;max-width:100%;overflow:hidden;border:1px solid var(--line);border-radius:12px;background:var(--paper)}
  figcaption{display:flex;justify-content:space-between;flex-wrap:wrap;gap:5px 12px;padding:12px 14px 0;font-size:12px;line-height:1.5}
  figcaption strong{overflow-wrap:anywhere}figcaption span{color:var(--muted)}
  svg{display:block;width:100%;height:auto;max-height:210px}
  p{margin:0;padding:0 14px 9px;font-size:12px;line-height:1.55;color:var(--muted)}
  .outside,.preview-unavailable{color:var(--danger)}.preview-unavailable{padding:0}
</style>
