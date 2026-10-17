import type{DesignSnapshot,DesignElement}from'@schubert/contracts';
import{mm}from'./precision.js';import{measureValue}from'./model.js';
/** Material ordering and datum semantics shared by browser and server. */
export function layerSlices(snapshot:DesignSnapshot,element:DesignElement){
 const result:Array<{layerId:string;materialSpecVersionId:string;bottomMm:string;topMm:string}>=[],unresolvedIds:string[]=[];
 if(element.kind==='room'){const level=measureValue(snapshot,element.finishedFloorLevelMeasureId);if(level===null)return{layers:result,unresolvedIds:[element.id]};let at=Number(level),known=true;for(const layer of element.floorLayers){const t=measureValue(snapshot,layer.thicknessMeasureId);if(t===null){unresolvedIds.push(layer.id);known=false;}if(!known)continue;result.push({layerId:layer.id,materialSpecVersionId:layer.materialSpecVersionId,bottomMm:mm(at-Number(t)),topMm:mm(at)});at-=Number(t);}}
 if(element.kind==='surface')for(const side of['top','bottom']as const){let at=0,known=true;for(const layer of element.layers.filter(l=>l.side===side)){const t=measureValue(snapshot,layer.thicknessMeasureId);if(t===null){known=false;unresolvedIds.push(layer.id);}if(!known)continue;const next=at+(side==='top'?1:-1)*Number(t);result.push({layerId:layer.id,materialSpecVersionId:layer.materialSpecVersionId,bottomMm:mm(Math.min(at,next)),topMm:mm(Math.max(at,next))});at=next;}}
 return{layers:result,unresolvedIds};
}
