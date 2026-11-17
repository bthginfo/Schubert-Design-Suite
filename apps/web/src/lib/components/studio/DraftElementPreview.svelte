<script lang="ts">
  import {onMount} from 'svelte';
  import type { DesignSnapshot, InscriptionElement } from '@schubert/contracts';
  import { contourBounds, lengthLabel, memorialContour, parseMillimetres, sampleRing, targetMeasure, type MemorialShape } from '@schubert/geometry';
  import { usePlanningUnits } from '#lib/client/planning-units.svelte.ts';
  import {inscriptionCenter, letteringLayout, loadPlanningFont} from './lettering-layout.ts';
  import Icon from '../Icon.svelte';

  let {
    kind, width, height, depth, thickness, shape, radius, archRise, text, fontKey, color, hostId, snapshot, gap, maxWidth, u, v,
  }: {
    kind: string; width: string; height: string; depth: string; thickness: string;
    shape: MemorialShape; radius: string; archRise: string; text: string; fontKey: NonNullable<InscriptionElement['previewFontKey']>; color: string;
    hostId: string; snapshot: DesignSnapshot;
    gap: string; maxWidth: string; u: string; v: string;
  } = $props();
  const units = usePlanningUnits();
  const format = (value: string | number) => lengthLabel(String(value), units.unit);
  const drawing = $derived.by(() => {
    try {
      const host = snapshot.elements.find(item => item.id === hostId);
      const contour = kind === 'inscription'
        ? host?.kind === 'stone_piece' ? host.finishedContour : host?.kind === 'surface' ? host.contour : null
        : null;
      const existing = contour ? contourBounds(contour) : null;
      const w = Number(existing?.width ?? parseMillimetres(width));
      const h = Number(existing?.height ?? parseMillimetres(kind === 'room' ? depth : height));
      if (!(w > 0 && h > 0)) return null;
      const outline = contour ?? memorialContour(kind === 'room' ? 'rectangle' : shape, String(w), String(h), {
        ...(radius ? { radiusMm: parseMillimetres(radius) ?? '' } : {}),
        ...(archRise ? { archRiseMm: parseMillimetres(archRise) ?? '' } : {}),
      });
      const points = sampleRing(outline.outer);
      const minX = Math.min(...points.map(point => Number(point.xMm)));
      const minY = Math.min(...points.map(point => Number(point.yMm)));
      const path = points.map((point, index) =>
        (index ? 'L' : 'M') + (Number(point.xMm) - minX) + ' ' + (h - Number(point.yMm) + minY)).join(' ') + ' Z';
      const margin = Math.max(w, h) * .2;
      return { w, h, minX, minY, path, margin, box: [-margin, -margin, w + margin * 2, h + margin * 2].join(' ') };
    } catch { return null; }
  });
  let mounted=$state(false),fontReady=$state(false),fontFailed=$state(false);
  onMount(()=>{mounted=true;return()=>{mounted=false;};});
  $effect(()=>{
    const key=fontKey;if(!mounted||kind!=='inscription')return;
    let active=true;fontReady=false;fontFailed=false;
    void loadPlanningFont(key).then(()=>{if(active)fontReady=true;}).catch(()=>{if(active)fontFailed=true;});
    return()=>{active=false;};
  });
  // Use the same layout and initial positioning as the saved plan.
  const inscription=$derived.by(()=>{
    if(kind!=='inscription'||!drawing)return null;
    try{
      const draftSnapshot:DesignSnapshot={...snapshot,measurements:{...snapshot.measurements,
        'draft:height':targetMeasure(parseMillimetres(height)),
        'draft:gap':targetMeasure(parseMillimetres(gap)),
        'draft:width':targetMeasure(parseMillimetres(maxWidth)),
      }};
      const element:InscriptionElement={id:'draft:inscription',label:'Vorschau',parentId:snapshot.frames[0].id,
        kind:'inscription',phase:'planned',locked:false,sourceEvidenceVersionIds:[],surfaceElementId:hostId,
        originUV:{uMm:parseMillimetres(u)??'0',vMm:parseMillimetres(v)??'0'},rotationDeg:'0',exactText:text,
        fontVariantVersionId:'unassigned:font',previewFontKey:fontKey,previewColor:color,referenceAssetVersionIds:[],
        renderingBasis:'shop_image_reference',requestedHeightMeasureId:'draft:height',requestedLowercaseHeightMeasureId:null,
        requestedMaxWidthMeasureId:'draft:width',lineGapMeasureId:'draft:gap',supplyForm:'engraved',
        materialSpecVersionId:null,materialArticleReference:null,finishSpecVersionId:null,alignment:'center',glyphPlacements:[]};
      if(u==='0'&&v==='0')element.originUV=inscriptionCenter(draftSnapshot,element);
      const context=fontReady?document.createElement('canvas').getContext('2d'):null;
      const layout=letteringLayout(draftSnapshot,element,context?(value,size)=>{
        context.font=`400 ${size}px "${letteringLayout(draftSnapshot,element).font.family}"`;
        return context.measureText(value).width;
      }:undefined);
      return {layout,x:Number(element.originUV.uMm)-drawing.minX,y:drawing.h-Number(element.originUV.vMm)+drawing.minY};
    }catch{return null;}
  });
</script>

<div class="draft-preview" aria-label="Vorschau Ihrer Eingaben">
  <header><Icon name={kind === 'room' ? 'box' : 'pen'} size={16}/><h3>{kind === 'inscription' ? 'Ihre Inschrift' : 'Ihre Maße im Überblick'}</h3></header>
  {#if drawing}
    <svg viewBox={drawing.box} role="img" aria-label={kind === 'room' ? 'Raumform aus den eingegebenen Maßen' : kind === 'inscription' ? 'Inschrift auf der gewählten Fläche' : 'Bauteilform aus den eingegebenen Maßen'}>
      <path d={drawing.path} fill={kind === 'inscription' ? '#37414a' : 'var(--preview-fill)'} stroke="var(--preview-stroke)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
      {#if inscription && text}
        <g transform={`translate(${inscription.x} ${inscription.y}) scale(${inscription.layout.scale} 1)`}>
          {#each inscription.layout.rows as row}<text x="0" y={-row.baseline} font-size={inscription.layout.fontSize} font-family={inscription.layout.font.family} text-anchor={inscription.layout.anchor} fill={color}>{row.text}</text>{/each}
        </g>
      {/if}
    </svg>
    <dl>
      <div><dt>{kind === 'room' || snapshot.kind !== 'memorial' ? 'Länge' : 'Breite'}</dt><dd>{format(drawing.w)}</dd></div>
      <div><dt>{kind === 'room' ? 'Tiefe' : 'Höhe'}</dt><dd>{format(drawing.h)}</dd></div>
      {#if kind !== 'inscription'}<div><dt>{kind === 'room' ? 'Wandstärke' : 'Materialstärke'}</dt><dd>{thickness ? format(thickness) : 'Noch offen'}</dd></div>{/if}
    </dl>
    {#if kind==='inscription'&&fontFailed}<p role="status">Die Entwurfsschrift konnte nicht geladen werden. Die Ersatzschrift ist keine verbindliche Schriftvorschau.</p>{/if}
    <p>{kind === 'inscription' ? 'Typografische Vorschau. Nach dem Einfügen verschieben und gestalten Sie den Text direkt auf dem Stein.' : kind === 'room' ? 'Die Vorschau zeigt das Seitenverhältnis. Innen- und Wandachsmaße werden gemäß Ihrer Auswahl in den Plan übernommen.' : 'Die Form passt sich Ihren Eingaben an. Maße, Material und Kanten bleiben anschließend bearbeitbar.'}</p>
  {:else}
    <div class="preview-empty"><Icon name="pen" size={30}/><p>{kind === 'inscription' ? 'Wählen Sie die Beschriftungsfläche.' : kind === 'room' ? 'Mit Länge und Tiefe erscheint hier Ihre Raumform.' : 'Mit Breite und Höhe erscheint hier Ihre Bauteilform.'}</p></div>
  {/if}
</div>

<style>
  .draft-preview { --preview-fill: color-mix(in srgb,var(--forest) 10%,var(--paper)); --preview-stroke: var(--forest); display: flex; flex-direction: column; min-width: 0; padding: 24px; color: var(--ink); }
  header { display: flex; align-items: center; gap: 9px; color: var(--muted); }
  h3 { margin: 0; font-size: 13px; font-weight: 550; color: var(--ink); }
  svg { width: 100%; height: 260px; margin-block: 18px; overflow: visible; }
  dl { display: grid; gap: 0; margin: 0; font-size: 13px; }
  dl>div { display: flex; justify-content: space-between; gap: 15px; padding: 12px 0; border-bottom: 1px solid var(--line); }
  dt { color: var(--muted); } dd { margin: 0; font-weight: 550; font-variant-numeric: tabular-nums; }
  p { margin-top: 16px; font-size: 12px; line-height: 1.7; color: var(--muted); }
  .preview-empty { display: grid; align-content: center; justify-items: center; min-height: 280px; padding: 18px 4px; text-align: center; color: var(--muted); }
  @media(max-width:700px) { .draft-preview { padding: 16px; } svg { height: 180px; margin-block: 12px; } .preview-empty { min-height: 140px; } }
</style>
