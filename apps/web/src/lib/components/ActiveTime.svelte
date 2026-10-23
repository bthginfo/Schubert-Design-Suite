<script lang="ts">
 import {onMount} from 'svelte';
 import {getLocalTime,type LocalTimeState} from '#lib/client/offline-time.ts';
 import type {AppData} from '#lib/client/types.ts';
 import Icon from './Icon.svelte';
 let {data}:{data:AppData}=$props();
 let local:LocalTimeState|null=$state(null),pending=$state(false);
 const current=$derived.by(()=>{
  const server=data.summary?.activeTimeSession;
  if(local?.session_id&&(pending||!server||local.session_id===server.id&&Number(local.version)>=Number(server.version)||Date.parse(local.started_at??'')>Date.parse(server.started_at)))return ['work','break'].includes(local.status)?{status:local.status,started_at:local.started_at}:null;
  return server?.active?server:null;
 });
 onMount(()=>{
  if(!data.user||!data.context?.employeeId)return;
  let alive=true;const userId=data.user.id;
  async function refresh(){try{const state=await getLocalTime(userId);if(alive){local=state.state;pending=state.commands.some(c=>c.time_session_id===state.state.session_id&&!['confirmed','resolved'].includes(c.sync_status));}}catch{/* Server state remains visible if device storage is unavailable. */}}
  void refresh();const channel=new BroadcastChannel(`schubert-time:${userId}`);channel.onmessage=refresh;window.addEventListener('focus',refresh);
  return()=>{alive=false;channel.close();window.removeEventListener('focus',refresh);};
 });
</script>
{#if current}<a class="active-time" href="/time" aria-label={`${current.status==='paused'||current.status==='break'?'Pause läuft':'Arbeitszeit läuft'} · ${pending?'noch nicht übertragen':'Serverstand bestätigt'} · Zeiterfassung öffnen`}><Icon name="clock" size={16}/><span>{current.status==='paused'||current.status==='break'?'Pause läuft':'Zeit läuft'}<small>{pending?'Auf Gerät · Übertragung offen':'Bestätigt'}</small></span></a>{/if}
<style>.active-time{display:flex;align-items:center;gap:8px;padding:6px 11px;border:1px solid var(--line);border-radius:10px;font-size:12px;color:var(--forest);white-space:nowrap;min-height:44px;background:var(--wash)}.active-time small{display:block;color:var(--muted);font-size:10px;margin-top:2px}@media(max-width:760px){.active-time{padding:5px 8px;font-size:11px}.active-time small{font-size:9px}}</style>
