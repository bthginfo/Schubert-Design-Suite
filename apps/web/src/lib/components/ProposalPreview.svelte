<script lang="ts">
  import type {AppData,Row} from '#lib/client/types.ts';import {label,display} from '#lib/client/api.ts';
  let {proposal,data}:{proposal:Row;data:AppData}=$props();
  const names:Record<string,string>={'crm.inquiry.create':'Anfrage als Entwurf anlegen','sales.quote.create':'Angebotsentwurf vorbereiten','communication.email.create':'E-Mail als Entwurf vorbereiten','communication.task.create':'Aufgabe vorbereiten','planning.design.change':'Planung ändern'};
  const operations:Record<string,string>={move_element:'Element verschieben',set_element_position:'Element positionieren',rotate_element:'Element drehen',set_design_target:'Sollmaß ändern',set_inscription_text:'Wortlaut ändern',set_inscription_layout:'Inschrift gestalten'};
  const commands=$derived(proposal.proposedCommands||proposal.commands||[]);
  function input(command:Row){const payload=command.payload||command.input?.payload||command.input||{};return typeof payload==='object'&&payload?payload:{};}
  function fieldName(key:string){return ({recipient:'Empfänger',subject:'Betreff',body:'Text',text:'Wörtlicher Text',x:'Position X',y:'Position Y',z:'Position Z',rotation:'Drehung',valueMm:'Sollmaß · mm',elementId:'Betroffenes Element'} as Record<string,string>)[key]||label(key);}
</script>
<div class="proposal-preview">
  {#each commands as item,index}<section><h4>{index+1}. {names[item.name]||'Vorgeschlagene Entwurfsänderung'}</h4>
    {#if item.input?.expectedVersion||proposal.base_version}<p class="field-help">Gilt für Version {item.input?.expectedVersion||proposal.base_version}</p>{/if}
    <dl>{#each Object.entries(input(item)).filter(([key])=>!['operations','lines','idempotencyKey','expectedVersion'].includes(key)) as [key,value]}<div><dt>{fieldName(key)}</dt><dd>{display(value,key,data)}</dd></div>{/each}</dl>
    {#if input(item).lines?.length}<div class="proposal-lines">{#each input(item).lines as line}<div><strong>{line.description}</strong><p>{display(line.quantity,'quantity')} {display(line.unit)} · {display(line.unit_price,'unit_price')} netto{line.optional?` · Option ${line.selected?'ausgewählt':'nicht ausgewählt'}`:''}</p></div>{/each}</div>{/if}
    {#each input(item).operations||[] as operation}<div class="proposal-operation"><h4>{operations[operation.type||operation.kind]||'Planungsänderung'}</h4><dl>{#each Object.entries(operation).filter(([key])=>!['type','kind'].includes(key)) as [key,value]}<div><dt>{fieldName(key)}</dt><dd>{display(value,key,data)}</dd></div>{/each}</dl></div>{/each}
  </section>{/each}
</div>
<style>.proposal-preview{white-space:normal}.proposal-preview section{margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}h4{font-size:14px;font-weight:600;line-height:1.6;margin-bottom:9px}dl{margin:0;display:grid;gap:13px}dt{font-size:12px;color:var(--muted);margin-bottom:3px}dd{margin:0;font-size:14px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere}.proposal-lines>div,.proposal-operation{padding:13px 0;border-top:1px solid var(--line)}.proposal-lines p{margin-top:4px;font-size:12px}.proposal-lines strong{font-size:13px;font-weight:500}</style>
