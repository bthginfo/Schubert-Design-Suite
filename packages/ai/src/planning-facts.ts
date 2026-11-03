import {calculateBOM,validateDesign} from '@schubert/geometry';
import type {DesignSnapshot} from '@schubert/contracts';

/** Compact facts from the canonical revision; never a survey or release attestation. */
export function inspectPlanningSnapshot(snapshot:DesignSnapshot,selected:readonly string[]=[]){
  const validation=validateDesign(snapshot),release=validateDesign(snapshot,{forRelease:true});
  const selectedIds=new Set(selected),bom=calculateBOM(snapshot);
  const eligible=selectedIds.size?bom.lines.filter(line=>selectedIds.has(line.elementId)):bom.lines;
  const lines=eligible.slice(0,6).map(line=>({elementId:line.elementId,label:line.label.slice(0,100),quantity:line.quantity,unit:line.unit,netAreaM2:line.netAreaM2,thicknessMm:line.thicknessMm,volumeM3:line.volumeM3,materialVersionId:line.materialSpecVersionId,productVersionId:line.productVariantVersionId}));
  const unresolved=Object.entries(snapshot.measurements).filter(([,m])=>m.valueMm===null||m.reviewStatus!=='confirmed');
  const measures=unresolved.slice(0,6).map(([id,m])=>({id,valueMm:m.valueMm,semantic:m.semantic,origin:m.origin,reviewStatus:m.reviewStatus}));
  return {source:'current_revision',revisionId:snapshot.revisionId,units:'mm',scope:selectedIds.size?'selected_elements':'whole_plan',elementCount:snapshot.elements.length,
    lines,omittedLineCount:Math.max(0,eligible.length-lines.length),totals:selectedIds.size?null:bom.totals,
    validation:{scope:'whole_plan',blocking:validation.blocking.slice(0,4),warnings:validation.warnings.slice(0,4),blockingCount:validation.blocking.length,warningCount:validation.warnings.length},
    release:{scope:'whole_plan',blocking:release.blocking.slice(0,4),omittedBlockingCount:Math.max(0,release.blocking.length-4),grantsManufacturingApproval:false},
    unresolvedMeasurementsScope:'whole_plan',unresolvedMeasurements:measures,unresolvedMeasurementCount:unresolved.length,omittedMeasurementCount:Math.max(0,unresolved.length-measures.length),
    meaning:'Berechnet aus dem gespeicherten Entwurf. Ungeprüfte Maße und Materialbezüge bleiben ungeprüft. Dies ist keine Mess-, Norm- oder Fertigungsfreigabe.'};
}

/** Cheap stage facts; an editable concept does not require manufacturing evidence. */
export function planningWorkflowFacts(context:Record<string,any>){
  const snapshot=context.snapshot as DesignSnapshot|undefined;
  if(context.entityType!=='planning'||!snapshot)return null;
  const active=snapshot.elements.filter(e=>e.phase!=='demolition');
  const base=active.some(e=>['stone_piece','room','wall','catalog_object'].includes(e.kind));
  const invalid=context.validation?.blocking?.length??0;
  return {revisionId:context.revisionId??snapshot.revisionId,focus:context.workflow?.step??'geometry',
    state:!base?'empty':invalid?'needs_correction':'editable_concept',
    hasBase:base,hasInscription:active.some(e=>e.kind==='inscription'),
    sourcePages:Array.isArray(context.sources)?context.sources.length:0,
    purpose:'Für die angeforderte Aktion nur wirklich fehlende Maße, Wortlaut oder Quellen erfragen. Unbestätigte Aufmaß-, Material- und Fertigungsnachweise verhindern keine ausdrücklich gewünschte editierbare Konzeptplanung. Verbindliche Ausgabe und Fertigung bleiben getrennt geprüft.'};
}
