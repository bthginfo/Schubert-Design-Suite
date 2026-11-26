import type{DesignSnapshot,DesignElement}from'@schubert/contracts';
export type StudioIssue={message:string;elementId:string|null;measureId:string|null;fieldLabel:string|null};
const fields:Record<string,string>={roughWidthMeasureId:'Rohmaß X',roughHeightMeasureId:'Rohmaß Y',roughThicknessMeasureId:'Rohstärke',measureId:'Maß',heightMeasureId:'Höhe',widthMeasureId:'Breite',thicknessMeasureId:'Materialstärke',coreThicknessMeasureId:'Wandkern',offsetAlongWallMeasureId:'Abstand zum Wandanfang',sillHeightMeasureId:'Brüstungshöhe',finishedFloorLevelMeasureId:'Fertigfußbodenhöhe',requestedHeightMeasureId:'Gewünschte Zeichenhöhe',requestedLowercaseHeightMeasureId:'Gewünschte Kleinbuchstabenhöhe',requestedMaxWidthMeasureId:'Maximale Schriftbreite',lineGapMeasureId:'Zeilenabstand',jointWidthMeasureId:'Fugenbreite',depthMeasureId:'Bearbeitungstiefe',recessDepthMeasureId:'Nischentiefe',minimumWebMeasureId:'Mindeststeg',diameterMeasureId:'Durchmesser',riseMeasureId:'Höhenunterschied',runMeasureId:'Gefällelänge',lengthMeasureId:'Bezugs- / Kontrolllänge'};
const constraintNames:Record<string,string>={coincident:'Deckungsgleich',horizontal:'Waagerecht',vertical:'Senkrecht',parallel:'Parallel',perpendicular:'Rechtwinklig',distance:'Abstand',centered:'Zentrierung',fixed:'Fixierung',minimum_clearance:'Mindestabstand',rests_on:'Steht auf'};
/** UI labels and direct repair targets come from the actual immutable snapshot. */
export function describeStudioIssue(snapshot:DesignSnapshot|null,raw:string):StudioIssue{
 let message=raw,elementId:string|null=null,measureId:string|null=null,fieldLabel:string|null=null;if(!snapshot)return{message,elementId,measureId,fieldLabel};
 const namedOwner=snapshot.elements.find(e=>raw.includes(`„${e.label}“`));
 const measures:Array<{id:string;element:DesignElement;label:string}>=[];
 function visit(value:any,owner:DesignElement){if(!value||typeof value!=='object')return;for(const[key,item]of Object.entries(value)){if((key.endsWith('MeasureId')||key==='measureId')&&typeof item==='string'){const host=owner.kind==='dimension'?snapshot!.elements.find(e=>e.id===owner.refs[0]?.elementId&&e.kind==='stone_piece'):null;measures.push({id:item,element:host??owner,label:owner.kind==='dimension'?owner.label:fields[key]??'Maß'});}else if(typeof item==='object')visit(item,owner);}}
 for(const element of snapshot.elements)visit(element,element);
 for(const binding of measures.sort((a,b)=>Number(b.element.id===namedOwner?.id)-Number(a.element.id===namedOwner?.id)||b.id.length-a.id.length))if(message.includes(binding.id)){measureId??=binding.id;elementId??=binding.element.id;fieldLabel??=binding.label;message=message.split(binding.id).join(`„${binding.element.label} · ${binding.label}“`);}
 for(const constraint of snapshot.constraints)if(message.includes(constraint.id)){const names=constraint.refs.map(r=>snapshot.elements.find(e=>e.id===r.elementId)?.label).filter(Boolean);const name=constraint.id.startsWith('stack:')||constraint.kind==='rests_on'&&constraint.refs[0]?.feature==='bottom_center'?'Stein mittig auf Sockel':constraintNames[constraint.kind]??'Geometrische Bindung';message=message.split(constraint.id).join(`${name} (${names.join(', ')})`);elementId??=constraint.refs[0]?.elementId??null;measureId??=constraint.measureId;fieldLabel??=name;}
 for(const element of [...snapshot.elements].sort((a,b)=>b.id.length-a.id.length)){if(message.includes(element.id)){elementId??=element.id;message=message.split(element.id).join(`„${element.label}“`);}else if(message.includes(`„${element.label}“`))elementId??=element.id;}
 for(const frame of snapshot.frames)message=message.split(frame.id).join(`„${frame.datumLabel}“`);
 if(measureId){const dimension=snapshot.elements.find(e=>e.kind==='dimension'&&e.measureId===measureId);if(dimension?.kind==='dimension'){const host=snapshot.elements.find(e=>e.id===dimension.refs[0]?.elementId);if(host?.kind==='stone_piece')elementId=host.id;}}
 if(namedOwner&&fieldLabel)message=message.split(`„${namedOwner.label} · ${fieldLabel}“`).join(fieldLabel);
 return{message,elementId,measureId,fieldLabel};
}

/** Which work an open point blocks: a draft error blocks everything (also presenting), a release issue blocks production. */
export type StudioIssueGate='presentation'|'production'|'note';
export type StudioIssueItem={raw:string;text:string;gate:StudioIssueGate;elementId:string|null;measureId:string|null;fieldLabel:string|null;confirmable:boolean};
export type StudioIssueGroup={key:string;label:string;elementId:string|null;gate:StudioIssueGate;items:StudioIssueItem[]};
type Validation={blocking:string[];warnings:string[]};
const gateRank:Record<StudioIssueGate,number>={presentation:0,production:1,note:2};
export const gateLabels:Record<StudioIssueGate,string>={presentation:'blockiert Präsentation',production:'blockiert Fertigung',note:'Hinweis'};
const unconfirmed=/^„(.+)“: (.+?) \((-?[\d.,]+) mm\) ist (als Planmaß eingetragen, aber )?noch nicht fachlich bestätigt\.$/,unknown=/^„(.+)“: (.+?) ist noch unbekannt\.$/,estimated=/^„(.+)“: (.+?) ist geschätzt\.$/;
const generic=new Set(['Dieses Maß','Maß','Stärke']);
const sockel=/sockel|unterbau|fundament/i;

function measureFields(element:DesignElement):Array<{key:string;id:string}>{
  return Object.entries(element).filter(([key,value])=>(key.endsWith('MeasureId')||key==='measureId')&&typeof value==='string').map(([key,id])=>({key,id:id as string}));
}

/**
 * Groups the check list by part, names each measure („Breite Stele 600 mm“) and marks
 * whether it blocks a customer presentation or production. Pure; based on the same
 * validation strings the domain produces.
 */
export function groupStudioIssues(snapshot:DesignSnapshot|null,draft:Validation,release:Validation):StudioIssueGroup[]{
  const groups=new Map<string,StudioIssueGroup>(),used=new Set<string>();
  const draftBlocking=new Set(draft.blocking),releaseBlocking=new Set(release.blocking);
  const all=[...new Set([...draft.blocking,...release.blocking,...release.warnings])];
  for(const raw of all){
    const gate:StudioIssueGate=draftBlocking.has(raw)?'presentation':releaseBlocking.has(raw)?'production':'note';
    let item:StudioIssueItem|null=null,owner:DesignElement|null=null;
    const match=raw.match(unconfirmed)??raw.match(unknown)??raw.match(estimated);
    const named=snapshot&&match?snapshot.elements.find(e=>e.label===match[1])??null:null;
    if(snapshot&&match&&named){
      const kind=raw.match(unconfirmed)?'unconfirmed':raw.match(unknown)?'unknown':'estimated';
      const host=named.kind==='dimension'?snapshot.elements.find(e=>e.id===named.refs[0]?.elementId)??named:named;
      // Bind the message to the concrete measure: the dimension's own measure, else the matching field of the part.
      const candidates=named.kind==='dimension'?[{key:'measureId',id:named.measureId}]:measureFields(named);
      const fit=candidates.find(({id})=>{const m=snapshot.measurements[id];if(!m||used.has(id))return false;
        if(kind==='unknown')return m.valueMm===null;if(kind==='estimated')return m.isEstimated;
        return m.valueMm!==null&&m.reviewStatus!=='confirmed'&&Number(m.valueMm)===Number(match[3].replace(',','.'));});
      if(fit)used.add(fit.id);
      const measure=fit?snapshot.measurements[fit.id]:null;
      const baseDepth=fit?.key==='thicknessMeasureId'&&host.kind==='stone_piece'&&sockel.test(host.label);
      const name=baseDepth?'Tiefe':fit&&fit.key==='thicknessMeasureId'?'Materialstärke':generic.has(match[2])&&fit?fields[fit.key]??match[2]:match[2];
      const value=kind==='unconfirmed'?` ${match[3]} mm`:'';
      const state=kind==='unknown'?'Maß noch unbekannt':kind==='estimated'?'Maß nur geschätzt':measure?.semantic==='design_target'?'Wunschmaß noch nicht fachlich bestätigt':'noch nicht fachlich bestätigt';
      owner=host;
      item={raw,text:`${name} ${host.label}${value} – ${state}`,gate,elementId:host.id,measureId:fit?.id??null,fieldLabel:name,
        confirmable:kind==='unconfirmed'&&!!measure&&measure.semantic==='design_target'&&measure.valueMm!==null&&!measure.isEstimated};
    }
    if(!item){
      const issue=describeStudioIssue(snapshot,raw);
      owner=issue.elementId?snapshot?.elements.find(e=>e.id===issue.elementId)??null:null;
      if(owner?.kind==='dimension')owner=snapshot?.elements.find(e=>e.id===(owner as Extract<DesignElement,{kind:'dimension'}>).refs[0]?.elementId)??owner;
      let text=issue.message;
      if(owner&&text.startsWith(`„${owner.label}“: `)){text=text.slice(owner.label.length+4);text=text.charAt(0).toLocaleUpperCase('de')+text.slice(1);}
      item={raw,text,gate,elementId:issue.elementId,measureId:issue.measureId,fieldLabel:issue.fieldLabel,confirmable:false};
    }
    const key=owner?.id??'plan';
    const group=groups.get(key)??{key,label:owner?.label??'Gesamter Plan',elementId:owner?.id??null,gate,items:[]};
    group.items.push(item);if(gateRank[gate]<gateRank[group.gate])group.gate=gate;groups.set(key,group);
  }
  return [...groups.values()].map((group,index)=>({group,index})).sort((a,b)=>gateRank[a.group.gate]-gateRank[b.group.gate]||a.index-b.index).map(entry=>entry.group);
}

/** Existing server-confirmed command: one confirm_design_target per listed Wunschmaß. */
export function confirmableMeasureIds(groups:StudioIssueGroup[]){return [...new Set(groups.flatMap(group=>group.items.filter(item=>item.confirmable&&item.measureId).map(item=>item.measureId!)))];}
