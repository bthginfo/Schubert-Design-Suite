<script lang="ts">
 import type{DesignSnapshot,DesignElement,DesignOperation}from'@schubert/contracts';
 import{applyOperations}from'@schubert/geometry';
 import BoundaryFields from'./BoundaryFields.svelte';
 type Room=Extract<DesignElement,{kind:'room'}>;
 let{snapshot,room,disabled=false,onchange}:{snapshot:DesignSnapshot;room:Room;disabled?:boolean;onchange:(operations:DesignOperation[])=>void}=$props();
 let draft:Room['boundary']=$state([]),source=$state(''),error=$state('');
 $effect(()=>{const key=room.id+JSON.stringify(room.boundary);if(source!==key){source=key;draft=room.boundary.map(b=>({...b}));error='';}});
 function apply(){error='';try{if(draft.length<3||draft.some(row=>!row.wallId)||new Set(draft.map(row=>row.wallId)).size!==draft.length)throw Error('Mindestens drei unterschiedliche vorhandene Wände für den vollständigen Umlauf auswählen.');const operation:DesignOperation={type:'set_room_spec',elementId:room.id,boundary:draft.map(b=>({...b}))};applyOperations(snapshot,[operation]);onchange([operation]);}catch(problem){error=(problem as Error).message;}}
 function reset(){draft=room.boundary.map(b=>({...b}));error='';}
</script>
<section class="room-boundary"><h3>Raumgrenze & gemeinsame Wände</h3><BoundaryFields {snapshot} bind:boundary={draft} {disabled}/><div class="actions"><button class="btn small" type="button" onclick={apply} {disabled}>Wandgrenze übernehmen</button><button class="btn small" type="button" onclick={reset} {disabled}>Änderungen verwerfen</button></div>{#if error}<p role="alert">{error}</p>{/if}</section>
<style>.room-boundary{margin-top:20px;padding-top:18px;border-top:1px solid var(--line)}.room-boundary h3{font-size:14px;font-weight:600}.actions{display:flex;flex-wrap:wrap;gap:8px}.room-boundary>p{font-size:12px;line-height:1.7;background:var(--wash);padding:12px;border:1px solid var(--line);color:var(--muted);white-space:pre-wrap}@media(max-width:720px){.actions button{min-height:48px}}</style>
