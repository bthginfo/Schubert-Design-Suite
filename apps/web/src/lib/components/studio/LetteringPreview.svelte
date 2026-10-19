<script lang="ts">
 import{onMount}from'svelte';
 import type{DesignSnapshot,InscriptionElement}from'@schubert/contracts';
 import type{DesignView}from'@schubert/geometry';
 import{letteringLayout,letteringProjection,loadPlanningFont}from'./lettering-layout.ts';
 import'./planning-fonts.css';
 let{snapshot,element,view,selected=false,pixelScale=1,onselect,onpointerdown}:{snapshot:DesignSnapshot;element:InscriptionElement;view:DesignView;selected?:boolean;pixelScale?:number;onselect:(event:MouseEvent|KeyboardEvent)=>void;onpointerdown:(event:PointerEvent)=>void}=$props();
 let ready=$state(false),mounted=$state(false),failed=$state(false);onMount(()=>{mounted=true;return()=>{mounted=false;};});
 $effect(()=>{const key=element.previewFontKey;if(!mounted)return;let active=true;ready=false;failed=false;void loadPlanningFont(key).then(()=>{if(active)ready=true;}).catch(()=>{if(active)failed=true;});return()=>{active=false;};});
 const projection=$derived(letteringProjection(snapshot,element,view));
 const layout=$derived.by(()=>{const context=ready?document.createElement('canvas').getContext('2d'):null;return letteringLayout(snapshot,element,context?(text,size)=>{context.font=`400 ${size}px "${letteringLayout(snapshot,element).font.family}"`;return context.measureText(text).width;}:undefined);});
</script>
{#if projection}<g transform={projection} class="lettering-preview" class:selected role="button" tabindex="0" aria-label={`Inschrift verschieben: ${element.exactText}`} aria-pressed={selected} onclick={onselect} {onpointerdown} onkeydown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onselect(event);}}}>
 <title>{element.exactText} · Entwurfsschrift {layout.font.label}{layout.heightEstimated?' · Zeichenhöhe noch offen':''}{failed?' · Schriftdatei nicht verfügbar':''}</title>
 <rect class="lettering-hit" x={layout.left-8*pixelScale} y={-layout.top-6*pixelScale} width={layout.width+16*pixelScale} height={layout.height+12*pixelScale} fill="transparent" stroke={selected?'#245aa0':'none'} stroke-width={pixelScale} stroke-dasharray={`${pixelScale*5} ${pixelScale*3}`}/>
 <g transform={`scale(${layout.scale} 1)`} pointer-events="none">{#each layout.rows as row}<text x="0" y={-row.baseline} text-anchor={layout.anchor} font-family={`"${layout.font.family}",serif`} font-size={layout.fontSize} font-weight="400" fill={layout.color} stroke="#1a1b1a" stroke-width={pixelScale*.3} paint-order="stroke">{row.text}</text>{/each}</g>
 </g>{/if}
<style>.lettering-preview{cursor:grab;outline:none}.lettering-preview:focus-visible .lettering-hit{stroke:#245aa0;stroke-dasharray:none}.lettering-preview:active{cursor:grabbing}</style>
