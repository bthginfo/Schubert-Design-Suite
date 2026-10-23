import type { DesignOperation, DesignSnapshot, DesignElement } from '@schubert/contracts';
import {inscriptionPreviewDefaults} from '@schubert/contracts';
import { D, mm } from './precision.js';
import { applyOperations } from './model.js';

/** Local editing history stores semantic inverses; approved snapshots are never replaced. */
export function inverseOperations(before:DesignSnapshot,operations:DesignOperation[]):DesignOperation[]|null{
  // First drafts may contain forward references within one atomic addition batch.
  if(operations.length&&operations.every(op=>op.type==='add_element'||op.type==='add_opening')){
    let current=applyOperations(before,operations);const inverse:DesignOperation[]=[];
    for(const op of [...operations].reverse())if((op.type==='add_element'||op.type==='add_opening')&&current.elements.some(e=>e.id===op.element.id)){
      const remove:DesignOperation={type:'remove_element',elementId:op.element.id,cascade:true};
      const next=applyOperations(current,[remove]);if(before.elements.some(e=>!next.elements.some(n=>n.id===e.id)))return null;
      inverse.push(remove);current=next;
    }
    return inverse;
  }
  let current=before;const batches:DesignOperation[][]=[];
  for(const op of operations){
    const e='elementId'in op?current.elements.find(e=>e.id===op.elementId):undefined;let inverse:DesignOperation[]|null=[];
    switch(op.type){
      case'add_element':case'add_opening':inverse=[{type:'remove_element',elementId:op.element.id,cascade:true}];break;
      case'set_plan_calibration':inverse=e?.kind==='plan_reference'?[{type:'set_plan_calibration',elementId:e.id,calibration:e.calibration,opacity:e.opacity}]:null;break;
      case'duplicate_element':inverse=[{type:'remove_element',elementId:op.newId,cascade:true}];break;
      case'move_element':inverse=[{...op,delta:{xMm:mm(new D(op.delta.xMm).negated()),yMm:mm(new D(op.delta.yMm).negated()),zMm:mm(new D(op.delta.zMm).negated())}}];break;
      case'move_selection':inverse=[{...op,deltaWorld:{xMm:mm(new D(op.deltaWorld.xMm).negated()),yMm:mm(new D(op.deltaWorld.yMm).negated()),zMm:mm(new D(op.deltaWorld.zMm).negated())}}];break;
      case'set_element_position':if(e&&('transform'in e||'point'in e))inverse=[{...op,position:'transform'in e?e.transform.position:e.point}];else inverse=null;break;
      case'rotate_element':if(e&&'transform'in e)inverse=[{...op,rotationDeg:e.transform.rotationDeg}];else if(e?.kind==='inscription')inverse=[{...op,rotationDeg:{x:'0',y:'0',z:e.rotationDeg}}];else inverse=null;break;
      case'set_element_lock':inverse=e?[{...op,locked:e.locked}]:null;break;
      case'rename_element':inverse=e?[{...op,label:e.label}]:null;break;
      case'set_element_phase':inverse=e?[{...op,phase:e.phase}]:null;break;
      case'set_element_sources':inverse=e?[{...op,sourceEvidenceVersionIds:e.sourceEvidenceVersionIds}]:null;break;
      case'reparent_element':inverse=e?[{...op,parentId:e.parentId}]:null;break;
      case'bind_measurement':{const id=e?(e as unknown as Record<string,unknown>)[op.field]:null;inverse=e?[{...op,measureId:typeof id==='string'?id:null}]:null;break;}
      case'set_design_target':{const m=current.measurements[op.measureId];inverse=[{...op,valueMm:m?.valueMm??null,isEstimated:m?.isEstimated??false,confirm:false}];break;}
      case'set_inscription_text':inverse=e?.kind==='inscription'?[{...op,exactText:e.exactText}]:null;break;
      case'set_inscription_layout':if(e?.kind==='inscription'){const{id:_id,label:_label,parentId:_parent,phase:_phase,locked:_locked,sourceEvidenceVersionIds:_sources,kind:_kind,surfaceElementId:_surface,exactText:_text,...layout}=e;inverse=[{type:'set_inscription_layout',elementId:e.id,...layout,...('previewFontKey'in op?{previewFontKey:layout.previewFontKey??inscriptionPreviewDefaults.fontKey}:{}),...('previewColor'in op?{previewColor:layout.previewColor??inscriptionPreviewDefaults.color}:{})}];}else inverse=null;break;
      case'set_stone_spec':inverse=e?.kind==='stone_piece'?[{type:'set_stone_spec',elementId:e.id,finishedContour:e.finishedContour,thicknessMeasureId:e.thicknessMeasureId,materialSpecVersionId:e.materialSpecVersionId,stockItemId:e.stockItemId,grainDirectionDeg:e.grainDirectionDeg,edgeTreatments:e.edgeTreatments,machiningFeatureIds:e.machiningFeatureIds,purpose:e.purpose,finishSpecVersionId:e.finishSpecVersionId??null,roughWidthMeasureId:e.roughWidthMeasureId??null,roughHeightMeasureId:e.roughHeightMeasureId??null,roughThicknessMeasureId:e.roughThicknessMeasureId??null}]:null;break;
      case'set_wall':inverse=e?.kind==='wall'?[{type:'set_wall',elementId:e.id,startNodeId:e.startNodeId,endNodeId:e.endNodeId,heightMeasureId:e.heightMeasureId,coreThicknessMeasureId:e.coreThicknessMeasureId,layers:e.layers,joinStyle:e.joinStyle??'legacy_overlap'}]:null;break;
      case'set_opening':inverse=e?.kind==='opening'?[{type:'set_opening',elementId:e.id,wallId:e.wallId,openingType:e.openingType,hingeSide:e.hingeSide,openingDirection:e.openingDirection,recessDepthMeasureId:e.recessDepthMeasureId??null,recessSide:e.recessSide??'left'}]:null;break;
      case'set_surface_spec':inverse=e?.kind==='surface'?[{type:'set_surface_spec',elementId:e.id,layers:e.layers,substrateVersionId:e.substrateVersionId,layingDirectionDeg:e.layingDirectionDeg,jointWidthMeasureId:e.jointWidthMeasureId,surfaceType:e.surfaceType,movementJointElementIds:e.movementJointElementIds,ruleVersionId:e.ruleVersionId??null}]:null;break;
      case'set_machining_spec':inverse=e?.kind==='machining'?[{type:'set_machining_spec',elementId:e.id,machiningType:e.machiningType,depthMeasureId:e.depthMeasureId,minimumWebMeasureId:e.minimumWebMeasureId,confirmedFasteningAssetVersionId:e.confirmedFasteningAssetVersionId,face:e.face??'front',...(e.miter?{miter:e.miter}:{})}]:null;break;
      case'set_contour':inverse=e?.kind==='stone_piece'?[{type:'set_contour',elementId:e.id,contour:e.finishedContour}]:e&&'contour'in e?[{type:'set_contour',elementId:e.id,contour:e.contour}]:null;break;
      case'set_technical_note':inverse=e?.kind==='technical_note'?[{type:'set_technical_note',elementId:e.id,text:e.text,category:e.category,ruleVersionId:e.ruleVersionId}]:null;break;
      case'set_connection_spec':inverse=e?.kind==='connection'?[{type:'set_connection_spec',elementId:e.id,connectionType:e.connectionType,specificationVersionId:e.specificationVersionId,hostElementId:e.hostElementId}]:null;break;
      case'set_room_spec':inverse=e?.kind==='room'?[{type:'set_room_spec',elementId:e.id,roomId:e.roomId,floorId:e.floorId,floorLayers:e.floorLayers,boundary:e.boundary}]:null;break;
      case'set_grave_border_spec':inverse=e?.kind==='grave_border'?[{type:'set_grave_border_spec',elementId:e.id,materialSpecVersionId:e.materialSpecVersionId}]:null;break;
      case'set_clearance_spec':inverse=e?.kind==='clearance'?[{type:'set_clearance_spec',elementId:e.id,hostElementId:e.hostElementId,ruleVersionId:e.ruleVersionId}]:null;break;
      case'set_slope_spec':inverse=e?.kind==='slope'?[{type:'set_slope_spec',elementId:e.id,hostElementId:e.hostElementId,start:e.start,end:e.end,ruleVersionId:e.ruleVersionId}]:null;break;
      case'replace_product_variant':inverse=e?.kind==='catalog_object'?[{type:'replace_product_variant',elementId:e.id,productVariantVersionId:e.productVariantVersionId,assetVersionId:e.assetVersionId,accuracy:e.accuracy,footprint:e.footprint}]:null;break;
      case'split_wall':{
        if(e?.kind!=='wall'){inverse=null;break;}const next=applyOperations(current,[op]);
        inverse=[{type:'set_wall',elementId:e.id,startNodeId:e.startNodeId,endNodeId:e.endNodeId}];
        for(const room of current.elements)if(room.kind==='room'&&room.boundary.some(b=>b.wallId===e.id))inverse.push({type:'set_room_spec',elementId:room.id,boundary:room.boundary});
        for(const opening of current.elements)if(opening.kind==='opening'&&opening.wallId===e.id){const changed=next.elements.find(item=>item.id===opening.id);if(changed?.kind==='opening'&&changed.wallId!==opening.wallId)inverse.push({type:'set_opening',elementId:opening.id,wallId:opening.wallId},{type:'bind_measurement',elementId:opening.id,field:'offsetAlongWallMeasureId',measureId:opening.offsetAlongWallMeasureId});}
        inverse.push({type:'remove_element',elementId:op.newWallId,cascade:false},{type:'remove_element',elementId:op.newNodeId,cascade:false});break;
      }
      case'remove_element':{
        const next=applyOperations(current,[op]);const removed=current.elements.filter(e=>!next.elements.some(n=>n.id===e.id));
        inverse=removed.map(element=>({type:'add_element',element,measurements:current.measurements}));
        inverse.push(...current.constraints.filter(c=>!next.constraints.some(n=>n.id===c.id)).map(constraint=>({type:'add_constraint' as const,constraint})));for(const surface of current.elements)if(surface.kind==='surface'&&next.elements.some(e=>e.id===surface.id)&&surface.movementJointElementIds.some(id=>removed.some(e=>e.id===id)))inverse.push({type:'set_surface_spec',elementId:surface.id,movementJointElementIds:surface.movementJointElementIds});break;
      }
      case'add_constraint':inverse=[{type:'remove_constraint',constraintId:op.constraint.id}];break;
      case'remove_constraint':{const constraint=current.constraints.find(c=>c.id===op.constraintId);inverse=constraint?[{type:'add_constraint',constraint}]:null;break;}
      default:inverse=null;
    }
    if(inverse===null)return null;batches.push(inverse);current=applyOperations(current,[op]);
  }
  return batches.reverse().flat();
}
