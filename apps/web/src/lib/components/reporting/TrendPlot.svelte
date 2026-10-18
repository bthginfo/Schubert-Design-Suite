<script lang="ts">
  import {scrollRegion} from '#lib/client/scroll-region.ts';
  let {points,label,format}:{points:{label:string;value:number|null;href:string}[];label:string;format:(value:number)=>string}=$props();
  let selected=$state<number|null>(null);
  const actual=$derived(points.flatMap(point=>point.value===null?[]:[point.value]));
  const high=$derived(Math.max(0,...actual)),low=$derived(Math.min(0,...actual));
  const magnitude=$derived(Math.pow(10,Math.floor(Math.log10(Math.max(1,high-low)))));
  const step=$derived(Math.max(magnitude/5,Math.ceil((high-low||1)/4/(magnitude/5))*(magnitude/5)));
  const top=$derived(Math.max(step,Math.ceil(high/step)*step)),bottom=$derived(Math.floor(low/step)*step);
  const ticks=$derived(Array.from({length:Math.round((top-bottom)/step)+1},(_,index)=>bottom+step*index));
  const width=920,left=88,right=22,upper=20,lower=248,height=300;
  const slot=$derived((width-left-right)/Math.max(1,points.length));
  function y(value:number){return lower-(value-bottom)/(top-bottom)*(lower-upper);}
  const active=$derived(selected===null?null:points[selected]);
  const missing=$derived(points.filter(point=>point.value===null).length);
</script>
<div class="plot-desktop"><div class="plot-readout" aria-live="polite"><span>{active?active.label:label}</span><strong>{active?(active.value===null?'Noch nicht bestätigt':format(active.value)):'Monat auswählen'}</strong></div>
<div class="plot-scroll" use:scrollRegion={label}>
  <svg class="trend-plot" viewBox={`0 0 ${width} ${height}`} aria-label={`${label}. Monatsbalken führen zu den zugehörigen Belegen.`}>
    {#each ticks as value}<g aria-hidden="true"><line x1={left} x2={width-right} y1={y(value)} y2={y(value)} class:zero={value===0}/><text x={left-14} y={y(value)+4} text-anchor="end" class="axis-number">{new Intl.NumberFormat('de-DE',{notation:'compact',maximumFractionDigits:1}).format(value)}</text></g>{/each}
    {#each points as point,index}{@const x=left+slot*index}{@const barWidth=Math.min(44,slot*.6)}
      <a href={point.href} aria-label={`${point.label}: ${point.value===null?'Noch nicht bestätigt':format(point.value)}. Belege öffnen.`} onpointerenter={()=>selected=index} onfocus={()=>selected=index}>
        <rect class="plot-target" x={x+2} y={upper} width={slot-4} height={height-upper} rx="7"/>
        {#if point.value!==null}<rect class="plot-bar" class:negative={point.value<0} x={x+(slot-barWidth)/2} y={Math.min(y(point.value),y(0))} width={barWidth} height={Math.max(2,Math.abs(y(point.value)-y(0)))} rx="5"/>{:else}<circle cx={x+slot/2} cy={y(0)} r="4" class="plot-gap"/>{/if}
        <text x={x+slot/2} y={height-20} text-anchor="middle" class="axis-month">{point.label}</text>
      </a>
    {/each}
  </svg>
</div>
</div>
<div class="plot-mobile" role="group" aria-label={label}>
 <p class="mobile-plot-label">{label}</p>
 {#each points as point}
  <a class="mobile-plot-row" href={point.href} aria-label={`${point.label}: ${point.value===null?'Noch nicht bestätigt':format(point.value)}. Belege öffnen.`}>
   <span class="mobile-plot-meta"><span>{point.label}</span><strong>{point.value===null?'Noch nicht bestätigt':format(point.value)}</strong></span>
   <span class="mobile-plot-track" aria-hidden="true"><i class="mobile-zero" style:left={`${-bottom/(top-bottom)*100}%`}></i>{#if point.value!==null}<i class="mobile-plot-bar" class:negative={point.value<0} style:left={`${(Math.min(0,point.value)-bottom)/(top-bottom)*100}%`} style:width={`${Math.abs(point.value)/(top-bottom)*100}%`}></i>{:else}<i class="mobile-plot-gap" style:left={`${-bottom/(top-bottom)*100}%`}></i>{/if}</span>
  </a>
 {/each}
</div>
<p class="plot-caption">{missing?`${missing} ${missing===1?'Monat ohne bestätigten Wert':'Monate ohne bestätigte Werte'} · offene Kreise kennzeichnen Datenlücken. `:''}Balken beginnen bei null. Wählen Sie einen Monat, um seine Belege zu öffnen.</p>
<style>
 .plot-mobile{display:none}@media(max-width:760px){.plot-desktop{display:none}.plot-mobile{display:block}.mobile-plot-label{font-size:13px;margin-bottom:14px;color:var(--muted)}.mobile-plot-row{display:block;padding:10px 0 11px;min-height:53px;border-bottom:1px solid var(--line)}.mobile-plot-row:last-child{border-bottom:0}.mobile-plot-meta{display:flex;justify-content:space-between;gap:12px;font-size:14px;line-height:1.5;font-variant-numeric:tabular-nums}.mobile-plot-meta>span{color:var(--muted)}.mobile-plot-meta strong{font-weight:500;text-align:right}.mobile-plot-track{display:block;position:relative;height:8px;margin-top:7px}.mobile-zero{position:absolute;height:10px;top:-1px;border-left:1px solid var(--muted)}.mobile-plot-bar{position:absolute;height:8px;background:var(--forest);border-radius:3px}.mobile-plot-bar.negative{background:var(--warning)}.mobile-plot-gap{position:absolute;width:7px;height:7px;border:1px solid var(--muted);border-radius:50%;transform:translateX(-50%);background:var(--paper)}.mobile-plot-row:hover{background:var(--wash)}}
  .plot-readout{display:flex;align-items:baseline;justify-content:space-between;gap:20px;padding:8px 0 20px;min-height:52px}.plot-readout span{font-size:13px;color:var(--muted)}.plot-readout strong{font-size:19px;letter-spacing:-.02em;font-weight:550;font-variant-numeric:tabular-nums;color:var(--ink)}.plot-scroll{overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin}.trend-plot{display:block;width:100%;min-width:590px;overflow:visible}.trend-plot line{stroke:var(--line);stroke-dasharray:3 5;stroke-width:1}.trend-plot line.zero{stroke:var(--muted);stroke-dasharray:none;opacity:.55}.trend-plot text{font-family:inherit;fill:var(--muted)}.axis-number{font-size:12px;font-variant-numeric:tabular-nums}.axis-month{font-size:12px}.plot-target{fill:transparent}.plot-bar{fill:var(--forest)}.plot-bar.negative{fill:var(--warning)}.plot-gap{stroke:var(--muted);fill:var(--paper);stroke-width:1.5}.trend-plot a:hover .plot-target,.trend-plot a:focus-visible .plot-target{fill:var(--wash)}.trend-plot a:focus-visible{outline:none}.trend-plot a:focus-visible .plot-target{stroke:var(--forest);stroke-width:2}.plot-caption{font-size:12px;line-height:1.7;color:var(--muted);margin-top:12px;max-width:80ch}@media(max-width:760px){.plot-readout{align-items:flex-start;flex-direction:column;gap:7px}.plot-readout strong{font-size:18px}.plot-caption{font-size:13px}}
</style>
