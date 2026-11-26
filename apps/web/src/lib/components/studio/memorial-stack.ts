import type {DesignSnapshot,DesignElement,DesignOperation,Point3} from '@schubert/contracts';
import {applyMatrix,inverseRigidMatrix,measureValue,mm,sampleRing,worldMatrix} from '@schubert/geometry';

/**
 * „Stein mittig auf Sockel stellen“ uses the canonical constraint system: a
 * vertical binding between both bounding-box centres (checked by the domain:
 * the centre axes stay aligned). The `stack:` id prefix marks it as the studio
 * option, so the studio keeps the stone resting on its base when the base
 * changes. No hidden solver: every follow-up move is an explicit operation.
 */
export const STACK_PREFIX='stack:';
type StonePiece=Extract<DesignElement,{kind:'stone_piece'}>;
export type WorldBox={minX:number;maxX:number;minY:number;maxY:number;minZ:number;maxZ:number};
export type StackLink={constraintId:string;stoneId:string;baseId:string};

const isMemorialStone=(element:DesignElement|undefined|null):element is StonePiece=>element?.kind==='stone_piece'&&element.purpose==='memorial';

/** Axis-aligned world box of a stone piece including its material thickness. */
export function stoneWorldBox(snapshot:DesignSnapshot,id:string):WorldBox|null{
  const element=snapshot.elements.find(e=>e.id===id);
  if(element?.kind!=='stone_piece')return null;
  try{
    const matrix=worldMatrix(snapshot,id),thickness=Number(measureValue(snapshot,element.thicknessMeasureId)??0);
    const ring=sampleRing(element.finishedContour.outer,.5);
    const box:WorldBox={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
    // The domain extrudes stone thickness along local −z (see projectDesign).
    for(const z of [0,-thickness])for(const point of ring){
      const world=applyMatrix({xMm:point.xMm,yMm:point.yMm,zMm:mm(z)},matrix);
      const x=Number(world.xMm),y=Number(world.yMm),w=Number(world.zMm);
      box.minX=Math.min(box.minX,x);box.maxX=Math.max(box.maxX,x);box.minY=Math.min(box.minY,y);box.maxY=Math.max(box.maxY,y);box.minZ=Math.min(box.minZ,w);box.maxZ=Math.max(box.maxZ,w);
    }
    return Number.isFinite(box.minX)?box:null;
  }catch{return null;}
}

/** Local position that moves the element's world box by the given world delta. */
function shiftedPosition(snapshot:DesignSnapshot,element:StonePiece,delta:{x:number;y:number;z:number}):Point3{
  const origin=applyMatrix({xMm:'0',yMm:'0',zMm:'0'},worldMatrix(snapshot,element.id));
  const target={xMm:mm(Number(origin.xMm)+delta.x),yMm:mm(Number(origin.yMm)+delta.y),zMm:mm(Number(origin.zMm)+delta.z)};
  return applyMatrix(target,inverseRigidMatrix(worldMatrix(snapshot,element.parentId)));
}
const samePosition=(a:Point3,b:Point3)=>Math.abs(Number(a.xMm)-Number(b.xMm))<.005&&Math.abs(Number(a.yMm)-Number(b.yMm))<.005&&Math.abs(Number(a.zMm)-Number(b.zMm))<.005;

/** Position for `stoneId` so it stands centred (X/Y) on top of `baseId`. */
export function restingPosition(snapshot:DesignSnapshot,stoneId:string,baseId:string):Point3|null{
  const stone=snapshot.elements.find(e=>e.id===stoneId),stoneBox=stoneWorldBox(snapshot,stoneId),baseBox=stoneWorldBox(snapshot,baseId);
  if(stone?.kind!=='stone_piece'||!stoneBox||!baseBox)return null;
  return shiftedPosition(snapshot,stone,{
    x:(baseBox.minX+baseBox.maxX)/2-(stoneBox.minX+stoneBox.maxX)/2,
    y:(baseBox.minY+baseBox.maxY)/2-(stoneBox.minY+stoneBox.maxY)/2,
    z:baseBox.maxZ-stoneBox.minZ
  });
}

/** Position for a new base so it sits centred under the stone, on the stone's former ground level. */
export function underneathPosition(snapshot:DesignSnapshot,baseId:string,stoneId:string):Point3|null{
  const base=snapshot.elements.find(e=>e.id===baseId),stoneBox=stoneWorldBox(snapshot,stoneId),baseBox=stoneWorldBox(snapshot,baseId);
  if(base?.kind!=='stone_piece'||!stoneBox||!baseBox)return null;
  return shiftedPosition(snapshot,base,{
    x:(stoneBox.minX+stoneBox.maxX)/2-(baseBox.minX+baseBox.maxX)/2,
    y:(stoneBox.minY+stoneBox.maxY)/2-(baseBox.minY+baseBox.maxY)/2,
    z:stoneBox.minZ-baseBox.minZ
  });
}

export function seatOperations(snapshot:DesignSnapshot,stoneId:string,baseId:string):DesignOperation[]{
  const stone=snapshot.elements.find(e=>e.id===stoneId),position=restingPosition(snapshot,stoneId,baseId);
  if(stone?.kind!=='stone_piece'||!position||samePosition(stone.transform.position,position))return[];
  return[{type:'set_element_position',elementId:stoneId,position}];
}

export function stackConstraint(stoneId:string,baseId:string,id=STACK_PREFIX+crypto.randomUUID()):Extract<DesignOperation,{type:'add_constraint'}>{
  return{type:'add_constraint',constraint:{id,kind:'vertical',refs:[{elementId:stoneId,feature:'center'},{elementId:baseId,feature:'center'}],measureId:null,ruleVersionId:null}};
}

export function isStackConstraint(constraint:DesignSnapshot['constraints'][number]){return constraint.id.startsWith(STACK_PREFIX)&&constraint.kind==='vertical'&&constraint.refs.length===2;}

export function stackLinks(snapshot:DesignSnapshot):StackLink[]{
  return snapshot.constraints.filter(isStackConstraint).map(c=>({constraintId:c.id,stoneId:c.refs[0].elementId,baseId:c.refs[1].elementId}))
    .filter(link=>snapshot.elements.some(e=>e.id===link.stoneId)&&snapshot.elements.some(e=>e.id===link.baseId));
}

function explicitlyPlaced(operations:DesignOperation[],id:string){
  return operations.some(op=>(op.type==='move_element'||op.type==='set_element_position'||op.type==='rotate_element'||op.type==='reparent_element')&&op.elementId===id
    ||op.type==='move_selection'&&op.elementIds.includes(id)
    ||op.type==='add_element'&&op.element.id===id);
}

/**
 * Follow-up moves that keep linked stones resting on their base after a batch.
 * `after` is the batch result before validation. Stones the user positioned in
 * this batch are left alone; the binding then reports any contradiction.
 */
export function stackFollowUps(after:DesignSnapshot,operations:DesignOperation[]):DesignOperation[]{
  const ops:DesignOperation[]=[];let current=after;
  // Lower links first so stacked bases (Sockel on Fundament) settle bottom-up.
  const links=stackLinks(after).sort((a,b)=>(stoneWorldBox(after,a.baseId)?.minZ??0)-(stoneWorldBox(after,b.baseId)?.minZ??0));
  for(const link of links){
    if(explicitlyPlaced(operations,link.stoneId))continue;
    const seat=seatOperations(current,link.stoneId,link.baseId);
    if(!seat.length)continue;
    const op=seat[0] as Extract<DesignOperation,{type:'set_element_position'}>;
    current={...current,elements:current.elements.map(e=>e.id===op.elementId&&'transform'in e?{...e,transform:{...e.transform,position:op.position}}:e)} as DesignSnapshot;
    ops.push(op);
  }
  return ops;
}

/** The stone a base carries, or the base a stone stands on. */
export function stackPartner(snapshot:DesignSnapshot,id:string):{link:StackLink;role:'stone'|'base'}|null{
  const link=stackLinks(snapshot).find(l=>l.stoneId===id||l.baseId===id);
  return link?{link,role:link.stoneId===id?'stone':'base'}:null;
}

const baseName=/sockel|unterbau|fundament|base/i;
/** A base is the lower part of a stack link, or a memorial stone named as one. */
export function isBaseStone(snapshot:DesignSnapshot,element:DesignElement|undefined|null){
  if(!isMemorialStone(element))return false;
  return stackLinks(snapshot).some(l=>l.baseId===element.id)||baseName.test(element.label);
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
