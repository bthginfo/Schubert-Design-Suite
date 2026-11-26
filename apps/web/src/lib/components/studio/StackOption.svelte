<script lang="ts">
  import type {DesignSnapshot,DesignOperation} from '@schubert/contracts';
  import {isBaseStone,seatOperations,stackCandidates,stackConstraint,stackPartner} from './memorial-stack.ts';
  let {snapshot,elementId,disabled=false,onchange}:{snapshot:DesignSnapshot;elementId:string;disabled?:boolean;onchange:(ops:DesignOperation[])=>void}=$props();
  const controlId=$props.id();
  const element=$derived(snapshot.elements.find(e=>e.id===elementId));
  const linked=$derived(stackPartner(snapshot,elementId));
  const label=(id:string)=>snapshot.elements.find(e=>e.id===id)?.label??'Bauteil';
  // A Sockel offers the stones that may stand on it; any other stone offers its possible Sockel.
  const role=$derived<'stone'|'base'>(isBaseStone(snapshot,element)?'stone':'base');
  const options=$derived(linked?[]:stackCandidates(snapshot,role,elementId));
  let chosen=$state('');
  $effect(()=>{if(!options.some(o=>o.id===chosen))chosen=(role==='base'?options.find(o=>isBaseStone(snapshot,o)):undefined)?.id??options[0]?.id??'';});
  function toggle(event:Event){
    const checked=(event.currentTarget as HTMLInputElement).checked;
    if(linked&&!checked){onchange([{type:'remove_constraint',constraintId:linked.link.constraintId}]);return;}
    if(!linked&&checked&&chosen){
      const[stone,base]=role==='base'?[elementId,chosen]:[chosen,elementId];
      onchange([...seatOperations(snapshot,stone,base),stackConstraint(stone,base)]);
    }
  }
</script>

{#if linked||options.length}
  <div class="stack-option">
    <label class="stack-check" for={controlId}>
      <input id={controlId} type="checkbox" checked={!!linked} {disabled} onchange={toggle}/>
      <span>Stein mittig auf Sockel stellen<small>{#if linked}{linked.role==='stone'?`Steht mittig auf „${label(linked.link.baseId)}“.`:`„${label(linked.link.stoneId)}“ steht mittig auf diesem Sockel.`} Ändert sich der Sockel, bleibt der Stein darauf stehen.{:else}{role==='base'?'Diesen Stein mittig auf den gewählten Sockel setzen.':'Den gewählten Stein mittig auf diesen Sockel setzen.'}{/if}</small></span>
    </label>
    {#if !linked&&options.length>1}<label class="stack-partner">{role==='base'?'Sockel':'Stein'}<select bind:value={chosen} {disabled}>{#each options as option}<option value={option.id}>{option.label}</option>{/each}</select></label>{/if}
  </div>
{/if}

<style>
  .stack-option{margin:4px 0 18px;padding:11px 12px;border:1px solid var(--line-soft,var(--line));border-radius:10px;background:var(--wash)}
  .stack-check{display:flex;align-items:flex-start;gap:9px;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer;line-height:1.45}
  .stack-check input{flex:none;width:20px;height:20px;margin:0;accent-color:var(--forest)}
  .stack-check span{display:grid;gap:3px}
  .stack-check small{font-size:12px;font-weight:400;line-height:1.55;color:var(--muted)}
  .stack-partner{display:block;margin-top:10px;font-size:12px;font-weight:500;color:var(--ink)}
  .stack-partner select{display:block;box-sizing:border-box;width:100%;min-height:40px;margin-top:6px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink);font:inherit;font-size:14px}
  @media(pointer:coarse){.stack-check{min-height:44px;align-items:center}.stack-partner select{min-height:48px;font-size:16px}}
</style>
