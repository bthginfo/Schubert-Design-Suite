import type{DesignSnapshot,DesignElement,DesignOperation,Point3}from'@schubert/contracts';
import{mm}from'./precision.js';
import{applyMatrix,inverseRigidMatrix,worldMatrix}from'./transforms.js';
import{contourBounds}from'./contours.js';

/**
 * „Steht auf“ (rests_on): the bottom face of one stone piece lies on the top
 * face of another. refs[0] is the standing piece (`bottom` or `bottom_center`),
 * refs[1] the carrying piece (`top` or `top_center`). The `_center` features
 * additionally require both horizontal centres to coincide („mittig“).
 * Checked on real geometry; nothing is moved silently.
 */
export type WorldBox={minX:number;maxX:number;minY:number;maxY:number;minZ:number;maxZ:number};
type Constraint=DesignSnapshot['constraints'][number];
export const RESTS_ON_TOLERANCE_MM=0.01;
const standing=['bottom','bottom_center'],carrying=['top','top_center'];
const near=(a:number,b:number)=>Math.abs(a-b)<=RESTS_ON_TOLERANCE_MM+1e-9;
const label=(value:number)=>value.toLocaleString('de-DE',{maximumFractionDigits:2});

/**
 * Axis-aligned world box of a stone piece including its material thickness
 * (the domain extrudes thickness along local −z). Exact for rotations in 90°
 * steps (upright memorial stones); otherwise a conservative envelope.
 */
export function stoneWorldBox(snapshot:DesignSnapshot,id:string):WorldBox|null{
  const element=snapshot.elements.find(e=>e.id===id);
  if(element?.kind!=='stone_piece')return null;
  try{
    const matrix=worldMatrix(snapshot,id),thickness=Number(snapshot.measurements[element.thicknessMeasureId]?.valueMm??0),b=contourBounds(element.finishedContour);
    const box:WorldBox={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
    for(const x of[b.minX,b.maxX])for(const y of[b.minY,b.maxY])for(const z of[0,-thickness]){
      const world=applyMatrix({xMm:x,yMm:y,zMm:mm(z)},matrix),wx=Number(world.xMm),wy=Number(world.yMm),wz=Number(world.zMm);
      box.minX=Math.min(box.minX,wx);box.maxX=Math.max(box.maxX,wx);box.minY=Math.min(box.minY,wy);box.maxY=Math.max(box.maxY,wy);box.minZ=Math.min(box.minZ,wz);box.maxZ=Math.max(box.maxZ,wz);
    }
    return Number.isFinite(box.minX)?box:null;
  }catch{return null;}
}

/** Local position that moves the element's world box by the given world delta. */
export function shiftedStonePosition(snapshot:DesignSnapshot,element:Extract<DesignElement,{kind:'stone_piece'}>,delta:{x:number;y:number;z:number}):Point3{
  const origin=applyMatrix({xMm:'0',yMm:'0',zMm:'0'},worldMatrix(snapshot,element.id));
  const target={xMm:mm(Number(origin.xMm)+delta.x),yMm:mm(Number(origin.yMm)+delta.y),zMm:mm(Number(origin.zMm)+delta.z)};
  return applyMatrix(target,inverseRigidMatrix(worldMatrix(snapshot,element.parentId)));
}

/** Position for `stoneId` so it stands (centred by default) on top of `baseId`. */
export function restingPosition(snapshot:DesignSnapshot,stoneId:string,baseId:string,centred=true):Point3|null{
  const stone=snapshot.elements.find(e=>e.id===stoneId),stoneBox=stoneWorldBox(snapshot,stoneId),baseBox=stoneWorldBox(snapshot,baseId);
  if(stone?.kind!=='stone_piece'||!stoneBox||!baseBox)return null;
  return shiftedStonePosition(snapshot,stone,{
    x:centred?(baseBox.minX+baseBox.maxX)/2-(stoneBox.minX+stoneBox.maxX)/2:0,
    y:centred?(baseBox.minY+baseBox.maxY)/2-(stoneBox.minY+stoneBox.maxY)/2:0,
    z:baseBox.maxZ-stoneBox.minZ
  });
}

export function isRestsOnConstraint(constraint:Constraint){return constraint.kind==='rests_on'&&constraint.refs.length===2;}
export function restsOnCentred(constraint:Constraint){return constraint.refs[0]?.feature==='bottom_center'&&constraint.refs[1]?.feature==='top_center';}

/** Blocking German message when a rests_on constraint contradicts the geometry, else null. */
export function restsOnIssue(snapshot:DesignSnapshot,constraint:Constraint):string|null{
  const[stoneRef,baseRef]=constraint.refs,name=(id:string)=>snapshot.elements.find(e=>e.id===id)?.label??'Bauteil';
  if(constraint.refs.length!==2||!standing.includes(stoneRef.feature)||!carrying.includes(baseRef.feature)||stoneRef.elementId===baseRef.elementId)
    return'Eine Auflage braucht ein aufstehendes Bauteil (Unterseite) und ein anderes, tragendes Bauteil (Oberseite).';
  const prefix=`Auflage „${name(stoneRef.elementId)}“ auf „${name(baseRef.elementId)}“: `;
  if(constraint.measureId)return prefix+'Eine Auflage hat kein eigenes Abstandsmaß.';
  const stone=stoneWorldBox(snapshot,stoneRef.elementId),base=stoneWorldBox(snapshot,baseRef.elementId);
  if(!stone||!base)return prefix+'Nur Natursteinbauteile mit bekannter Stärke können aufeinander stehen.';
  if(!near(stone.minZ,base.maxZ))return prefix+`Der Stein steht nicht auf dem Sockel. Unterkante ${label(stone.minZ)} mm, Oberkante Sockel ${label(base.maxZ)} mm. Den Stein wieder auf den Sockel stellen oder die Auflage lösen.`;
  const cx=(stone.minX+stone.maxX)/2,cy=(stone.minY+stone.maxY)/2,bx=(base.minX+base.maxX)/2,by=(base.minY+base.maxY)/2;
  if(restsOnCentred(constraint)){
    if(!near(cx,bx)||!near(cy,by))return prefix+`Der Stein steht nicht mittig auf dem Sockel (Versatz seitlich ${label(cx-bx)} mm, in der Tiefe ${label(cy-by)} mm). Den Stein mittig ausrichten oder die Auflage lösen.`;
  }else if(cx<base.minX-1e-9||cx>base.maxX+1e-9||cy<base.minY-1e-9||cy>base.maxY+1e-9)return prefix+'Die Mitte des Steins liegt außerhalb der Sockeloberseite. Der Stein hätte keine tragende Auflage.';
  return null;
}

/** Id prefix of the studio/AI option „Stein mittig auf Sockel stellen“. */
export const STACK_PREFIX='stack:';
export type RestingLink={constraintId:string;stoneId:string;baseId:string;centred:boolean};
/** A domain „steht auf“ relation, or the former studio-only vertical centre binding of older revisions. */
export function isRestingLink(constraint:Constraint){return isRestsOnConstraint(constraint)||constraint.id.startsWith(STACK_PREFIX)&&constraint.kind==='vertical'&&constraint.refs.length===2;}
export function restingLinks(snapshot:DesignSnapshot):RestingLink[]{
  return snapshot.constraints.filter(isRestingLink).map(c=>({constraintId:c.id,stoneId:c.refs[0].elementId,baseId:c.refs[1].elementId,centred:c.kind!=='rests_on'||restsOnCentred(c)}))
    .filter(link=>snapshot.elements.some(e=>e.id===link.stoneId)&&snapshot.elements.some(e=>e.id===link.baseId));
}
const samePosition=(a:Point3,b:Point3)=>Math.abs(Number(a.xMm)-Number(b.xMm))<.005&&Math.abs(Number(a.yMm)-Number(b.yMm))<.005&&Math.abs(Number(a.zMm)-Number(b.zMm))<.005;
/** Explicit move that puts `stoneId` onto `baseId`; empty when it already rests there. */
export function seatOperations(snapshot:DesignSnapshot,stoneId:string,baseId:string,centred=true):DesignOperation[]{
  const stone=snapshot.elements.find(e=>e.id===stoneId),position=restingPosition(snapshot,stoneId,baseId,centred);
  if(stone?.kind!=='stone_piece'||!position||samePosition(stone.transform.position,position))return[];
  return[{type:'set_element_position',elementId:stoneId,position}];
}
function explicitlyPlaced(operations:DesignOperation[],id:string){
  return operations.some(op=>(op.type==='move_element'||op.type==='set_element_position'||op.type==='rotate_element'||op.type==='reparent_element')&&op.elementId===id
    ||op.type==='move_selection'&&op.elementIds.includes(id)
    ||op.type==='add_element'&&op.element.id===id);
}
/**
 * Follow-up moves that keep linked stones resting on their base after a batch
 * (`after` is the batch result before validation). Stones positioned explicitly
 * in this batch are left alone; the domain relation then reports any
 * contradiction. Callers add the moves visibly to the same batch.
 */
export function restingFollowUps(after:DesignSnapshot,operations:DesignOperation[]):DesignOperation[]{
  const ops:DesignOperation[]=[];let current=after;
  // Lower links first so stacked bases (Sockel on Fundament) settle bottom-up.
  const links=restingLinks(after).sort((a,b)=>(stoneWorldBox(after,a.baseId)?.minZ??0)-(stoneWorldBox(after,b.baseId)?.minZ??0));
  for(const link of links){
    if(explicitlyPlaced(operations,link.stoneId))continue;
    const seat=seatOperations(current,link.stoneId,link.baseId,link.centred);
    if(!seat.length)continue;
    const op=seat[0] as Extract<DesignOperation,{type:'set_element_position'}>;
    current={...current,elements:current.elements.map(e=>e.id===op.elementId&&'transform'in e?{...e,transform:{...e.transform,position:op.position}}:e)} as DesignSnapshot;
    ops.push(op);
  }
  return ops;
}
/** The constraint operation for „Stein mittig auf Sockel stellen“. */
export function restingConstraint(stoneId:string,baseId:string,id:string):Extract<DesignOperation,{type:'add_constraint'}>{
  return{type:'add_constraint',constraint:{id,kind:'rests_on',refs:[{elementId:stoneId,feature:'bottom_center'},{elementId:baseId,feature:'top_center'}],measureId:null,ruleVersionId:null}};
}
