<script lang="ts">
  import { Canvas } from '@threlte/core';
  import type { DesignSnapshot } from '@schubert/contracts';
  import Scene from './ThreeScene.svelte';
  import{machiningDepth,measureValue}from'@schubert/geometry';
  import type{CameraAction,CameraCommand}from'./camera-navigation.ts';
  let { snapshot, resetKey = 0,assets=[],glyphs=[],navigationCommand=null,onzoomchange=()=>{} }:{ snapshot:DesignSnapshot;resetKey?:number;assets?:any[];glyphs?:any[];navigationCommand?:CameraCommand|null;onzoomchange?:(zoom:number)=>void }=$props();
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
  <svelte:boundary>
    <Canvas renderMode="on-demand" shadows={false} dpr={Math.min(globalThis.devicePixelRatio||1,2)}><Scene {snapshot} {resetKey} {assets} {glyphs} {cameraCommand} {onzoomchange}/></Canvas>
    {#snippet failed(_error,reset)}<div class="three-error"><strong>3D ist auf diesem Gerät nicht verfügbar.</strong><p>Die maßhaltigen 2D-Ansichten und alle Eingabefelder bleiben nutzbar.</p><button class="btn" onclick={reset}>Erneut versuchen</button></div>{/snippet}
  </svelte:boundary>
  <div class="camera-tools" aria-label="3D-Kamera ohne Ziehen bedienen">
    <div><span>Drehen</span><button aria-label="Kamera nach links drehen" onclick={()=>navigate('left')}>↶</button><button aria-label="Kamera nach rechts drehen" onclick={()=>navigate('right')}>↷</button><button aria-label="Kamera nach oben drehen" onclick={()=>navigate('up')}>↑</button><button aria-label="Kamera nach unten drehen" onclick={()=>navigate('down')}>↓</button></div>
    <div><span>Verschieben</span><button aria-label="Kamera nach links verschieben" onclick={()=>navigate('pan_left')}>←</button><button aria-label="Kamera nach rechts verschieben" onclick={()=>navigate('pan_right')}>→</button><button aria-label="Kamera nach oben verschieben" onclick={()=>navigate('pan_up')}>↑</button><button aria-label="Kamera nach unten verschieben" onclick={()=>navigate('pan_down')}>↓</button></div>
    <div><span>Blickrichtung</span><button onclick={()=>navigate('front')}>Vorn</button><button onclick={()=>navigate('side')}>Seitlich</button><button onclick={()=>navigate('top')}>Oben</button></div>
  </div>
  <p class="three-caption">Kamera über die Knöpfe oder durch Ziehen bedienen. Mausrad: zoomen · rechte Maustaste: verschieben. Farben neutral; Produkte ohne freigegebenes Modell erscheinen als Hüllfläche.</p>
  {#if unresolved.length}<p class="three-unresolved" role="status">Geometrieangaben offen: {unresolved.join(', ')}. Unbekannte Tiefen, Öffnungen und nachfolgende Schichtlagen werden nicht ergänzt.</p>{/if}
</div>
<style>.three-stage{position:relative;width:100%;height:100%;min-height:480px;background:#f4f4ef}.three-caption{position:absolute;bottom:10px;left:16px;right:16px;font-size:12px;line-height:1.5;color:#515a54;background:#ffffffeb;padding:9px 12px;border:1px solid #d9deda;pointer-events:none}.camera-tools{position:absolute;bottom:95px;left:12px;display:grid;gap:6px;max-width:calc(100% - 24px)}.camera-tools>div{display:flex;align-items:center;flex-wrap:wrap;gap:3px;padding:3px 6px;background:#fffffff2;border:1px solid #d9deda;border-radius:5px}.camera-tools span{font-size:12px;min-width:82px}.camera-tools button{min-height:38px;min-width:38px;padding:6px 10px;border:0;border-radius:3px;background:transparent;color:#244e3d;cursor:pointer;font-size:14px}.camera-tools button:hover{background:#e7eee7}.camera-tools button:focus-visible{outline:2px solid #315c4c;outline-offset:1px}.three-unresolved{position:absolute;top:12px;left:16px;right:16px;font-size:12px;line-height:1.6;padding:12px;background:#fff6de;border:1px solid #dcca95}.three-error{position:absolute;inset:0;display:grid;place-content:center;text-align:center;padding:32px}.three-error p{max-width:380px;line-height:1.7}@media(max-width:720px){.camera-tools button{min-width:48px;min-height:48px}.camera-tools span{min-width:75px}.camera-tools{bottom:120px}.three-caption{font-size:12px}}</style>
