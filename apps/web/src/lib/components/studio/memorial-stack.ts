import type {DesignSnapshot,DesignElement,Point3} from '@schubert/contracts';
import {STACK_PREFIX,isRestingLink,restingConstraint,restingFollowUps,restingLinks,restingPosition,seatOperations as domainSeatOperations,shiftedStonePosition,stoneWorldBox,type RestingLink,type WorldBox} from '@schubert/geometry';

/**
 * „Stein mittig auf Sockel stellen“ uses the canonical domain constraint
 * `rests_on` (bottom of the stone on the top of the base, both centres
 * aligned). The domain validates it on every design change, also on the
 * server. The studio keeps the stone resting on its base when the base
 * changes; every follow-up move is an explicit operation, no hidden solver.
 * Older revisions may still carry the former vertical centre binding with the
 * `stack:` id prefix; it stays recognised as a link.
 */
export {STACK_PREFIX};
type StonePiece=Extract<DesignElement,{kind:'stone_piece'}>;
export type {WorldBox};
export {restingPosition,stoneWorldBox};
export type StackLink=RestingLink;

const isMemorialStone=(element:DesignElement|undefined|null):element is StonePiece=>element?.kind==='stone_piece'&&(element.purpose==='memorial'||element.purpose==='base');

/** Position for a new base so it sits centred under the stone, on the stone's former ground level. */
export function underneathPosition(snapshot:DesignSnapshot,baseId:string,stoneId:string):Point3|null{
  const base=snapshot.elements.find(e=>e.id===baseId),stoneBox=stoneWorldBox(snapshot,stoneId),baseBox=stoneWorldBox(snapshot,baseId);
  if(base?.kind!=='stone_piece'||!stoneBox||!baseBox)return null;
  return shiftedStonePosition(snapshot,base,{
    x:(stoneBox.minX+stoneBox.maxX)/2-(baseBox.minX+baseBox.maxX)/2,
    y:(stoneBox.minY+stoneBox.maxY)/2-(baseBox.minY+baseBox.maxY)/2,
    z:stoneBox.minZ-baseBox.minZ
  });
}

export const seatOperations=domainSeatOperations;
export function stackConstraint(stoneId:string,baseId:string,id=STACK_PREFIX+crypto.randomUUID()){return restingConstraint(stoneId,baseId,id);}
export const isStackConstraint=isRestingLink;
export const stackLinks:(snapshot:DesignSnapshot)=>StackLink[]=restingLinks;
export const stackFollowUps=restingFollowUps;

/** The stone a base carries, or the base a stone stands on. */
export function stackPartner(snapshot:DesignSnapshot,id:string):{link:StackLink;role:'stone'|'base'}|null{
  const link=stackLinks(snapshot).find(l=>l.stoneId===id||l.baseId===id);
  return link?{link,role:link.stoneId===id?'stone':'base'}:null;
}

const baseName=/sockel|unterbau|fundament|base/i;
/** A base is the lower part of a stack link, or a memorial stone named as one. */
export function isBaseStone(snapshot:DesignSnapshot,element:DesignElement|undefined|null){
  if(!isMemorialStone(element))return false;
  return element.purpose==='base'||stackLinks(snapshot).some(l=>l.baseId===element.id)||baseName.test(element.label);
}

/** Candidates for the „Stein mittig auf Sockel stellen“ option. */
export function stackCandidates(snapshot:DesignSnapshot,role:'stone'|'base',excludeId=''):StonePiece[]{
  if(snapshot.kind!=='memorial')return[];
  const links=stackLinks(snapshot);
  return snapshot.elements.filter(isMemorialStone).filter(e=>e.id!==excludeId&&e.phase!=='demolition'&&(role==='base'
    // A base may carry one stone; the stone itself must not already stand on something.
    ?!links.some(l=>l.baseId===e.id)&&!links.some(l=>l.stoneId===excludeId)&&!links.some(l=>l.stoneId===e.id&&l.baseId===excludeId)
    :!links.some(l=>l.stoneId===e.id)&&!isBaseStone(snapshot,e)));
}
