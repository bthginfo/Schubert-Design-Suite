<script lang="ts">
  import { Canvas } from '@threlte/core';
  import type { DesignSnapshot } from '@schubert/contracts';
  import Scene from './ThreeScene.svelte';
  import Icon from '../Icon.svelte';
  import{machiningDepth,measureValue}from'@schubert/geometry';
  import type{CameraAction,CameraCommand}from'./camera-navigation.ts';
  let { snapshot, showWalls=true, resetKey = 0,materials=[],assets=[],glyphs=[],navigationCommand=null,onzoomchange=()=>{} }:{ snapshot:DesignSnapshot;showWalls?:boolean;resetKey?:number;materials?:any[];assets?:any[];glyphs?:any[];navigationCommand?:CameraCommand|null;onzoomchange?:(zoom:number)=>void }=$props();
  let cameraCommand:CameraCommand|null=$state(null),commandNumber=0;
  $effect(()=>{cameraCommand=navigationCommand;});
  function navigate(action:CameraAction){cameraCommand={id:++commandNumber,action};}
  const unresolved=$derived(snapshot.elements.filter(e=>e.phase!=='demolition'&&(
    e.kind==='machining'&&machiningDepth(snapshot,e)===null||
    e.kind==='opening'&&[e.offsetAlongWallMeasureId,e.widthMeasureId,e.heightMeasureId,e.sillHeightMeasureId,...(e.openingType==='recess'?[e.recessDepthMeasureId??null]:[])].some(id=>measureValue(snapshot,id)===null)||
    (e.kind==='wall'||e.kind==='surface')&&e.layers.some(l=>measureValue(snapshot,l.thicknessMeasureId)===null)||
    e.kind==='room'&&(measureValue(snapshot,e.finishedFloorLevelMeasureId)===null||e.floorLayers.some(l=>measureValue(snapshot,l.thicknessMeasureId)===null))
  )).map(e=>e.label));
</script>
<div class="three-stage" aria-label="Interaktive dreidimensionale Planvorschau">
  <div class="three-canvas"><svelte:boundary>
    <Canvas renderMode="on-demand" shadows={false} dpr={Math.min(globalThis.devicePixelRatio||1,2)}><Scene {materials} {snapshot} {showWalls} {resetKey} {assets} {glyphs} {cameraCommand} {onzoomchange}/></Canvas>
    {#snippet failed(_error,reset)}<div class="three-error"><strong>3D ist auf diesem Gerät nicht verfügbar.</strong><p>Die maßhaltigen 2D-Ansichten und alle Eingabefelder bleiben nutzbar.</p><button class="btn" onclick={reset}>Erneut versuchen</button></div>{/snippet}
  </svelte:boundary></div>
  <div class="three-footer">
  <details class="camera-disclosure"><summary>Kamera bewegen <span>Drehen, verschieben & Blickrichtung</span></summary><div class="camera-tools" aria-label="3D-Kamera ohne Ziehen bedienen">
    <div><span>Drehen</span><button aria-label="Kamera nach links drehen" onclick={()=>navigate('left')}><Icon name="rotate-ccw" size={17}/></button><button aria-label="Kamera nach rechts drehen" onclick={()=>navigate('right')}><Icon name="refresh" size={17}/></button><button aria-label="Kamera nach oben drehen" onclick={()=>navigate('up')}><Icon name="arrow-up" size={17}/></button><button aria-label="Kamera nach unten drehen" onclick={()=>navigate('down')}><Icon name="arrow-down" size={17}/></button></div>
    <div><span>Verschieben</span><button aria-label="Kamera nach links verschieben" onclick={()=>navigate('pan_left')}><Icon name="back" size={17}/></button><button aria-label="Kamera nach rechts verschieben" onclick={()=>navigate('pan_right')}><Icon name="arrow" size={17}/></button><button aria-label="Kamera nach oben verschieben" onclick={()=>navigate('pan_up')}><Icon name="arrow-up" size={17}/></button><button aria-label="Kamera nach unten verschieben" onclick={()=>navigate('pan_down')}><Icon name="arrow-down" size={17}/></button></div>
    <div><span>Blickrichtung</span><button onclick={()=>navigate('front')}>Vorn</button><button onclick={()=>navigate('side')}>Seitlich</button><button onclick={()=>navigate('top')}>Oben</button></div>
  </div></details>
  <p class="three-caption">Ziehen: drehen · Mausrad: zoomen. Neutrale Materialfarben; Produkte ohne freigegebenes Modell als Hülle.</p>
  {#if unresolved.length}<p class="three-unresolved" role="status">Geometrieangaben offen: {unresolved.join(', ')}. Unbekannte Tiefen, Öffnungen und nachfolgende Schichtlagen werden nicht ergänzt.</p>{/if}
  </div>
</div>
<style>
  .three-stage{display:flex;flex-direction:column;flex:1;min-height:0;width:100%;height:100%;background:#f4f4ef}
  .three-canvas{position:relative;flex:1;min-height:220px;overflow:hidden}
  .three-footer{flex:none;background:var(--paper);border-top:1px solid var(--line)}
  .camera-disclosure>summary{min-height:44px;box-sizing:border-box;padding:12px 16px;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer}
  .camera-disclosure>summary span{font-size:12px;font-weight:400;color:var(--muted);margin-left:8px}
  .camera-tools{display:flex;flex-wrap:wrap;gap:8px;padding:0 12px 10px}
  .camera-tools>div{display:flex;align-items:center;flex-wrap:wrap;gap:3px}
  .camera-tools span{font-size:12px;min-width:82px;color:var(--muted)}
  .camera-tools button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:var(--paper);color:var(--ink);cursor:pointer;font-size:13px}
  .camera-tools button:hover{background:var(--wash)}.camera-tools button:focus-visible,.camera-disclosure>summary:focus-visible{outline:2px solid var(--forest);outline-offset:2px}
  .three-caption{font-size:12px;line-height:1.5;color:var(--muted);margin:0;padding:0 16px 12px}
  .three-unresolved{font-size:12px;line-height:1.6;margin:0;padding:10px 16px;background:var(--warning-wash);color:var(--warning)}
  .three-error{position:absolute;inset:0;display:grid;place-content:center;text-align:center;padding:32px}.three-error p{max-width:380px;line-height:1.7}
  @media(max-width:720px){.camera-disclosure>summary span{display:none}.camera-tools{display:grid}.three-caption{font-size:12px}}

/* UI chrome follows the personal theme; the physical 3D scene stays unchanged. */
.three-footer{background:var(--paper);color:var(--ink)}
.camera-disclosure summary,.camera-tools button{color:var(--forest)}
.camera-disclosure summary span,.camera-tools span,.three-caption{color:var(--muted)}
.camera-tools button{background:var(--paper);border-color:var(--line)}
.camera-tools button:hover{background:var(--wash)}
</style>
