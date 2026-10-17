import type{DesignSnapshot,DesignElement,DesignOperation,Point3}from'@schubert/contracts';
import{D,mm}from'./precision.js';
import{worldMatrix,worldPoint}from'./transforms.js';

/** One world-space translation; shared wall nodes and selected host children move exactly once. */
export function selectionMoveOperations(snapshot:DesignSnapshot,selectedIds:string[],delta:Point3):DesignOperation[]{
 const selected=new Set(selectedIds),byId=new Map(snapshot.elements.map(e=>[e.id,e])),nodes=new Set<string>(),dependentWalls=new Set<string>();
 function selectedParent(id:string|null,trail=new Set<string>()):boolean{if(!id||trail.has(id))return false;if(selected.has(id))return true;trail.add(id);const e=byId.get(id);if(!e)return false;return selectedParent(e.parentId,trail)||e.kind==='inscription'&&selectedParent(e.surfaceElementId,trail)||(e.kind==='machining'||e.kind==='slope')&&selectedParent(e.hostElementId,trail);}
 const roots=snapshot.elements.filter(e=>selected.has(e.id)&&!selectedParent(e.parentId)&&!(e.kind==='inscription'&&selectedParent(e.surfaceElementId))&&!((e.kind==='machining'||e.kind==='slope')&&selectedParent(e.hostElementId)));
 for(const e of roots)if(e.kind==='node')nodes.add(e.id);
 for(const e of roots)if(e.kind==='wall'||e.kind==='room'){
  if(e.kind==='room'&&!new D(delta.zMm).isZero())throw Error('Den Höhenbezug eines Raums über sein ausdrückliches Bodenhöhenmaß bearbeiten. Die gemeinsame Raumverschiebung gilt für X und Y.');
  for(const wall of e.kind==='wall'?[e]:e.boundary.map(b=>byId.get(b.wallId)).filter((w):w is Extract<DesignElement,{kind:'wall'}>=>w?.kind==='wall')){dependentWalls.add(wall.id);nodes.add(wall.startNodeId);nodes.add(wall.endNodeId);}
 }
 for(const id of nodes)for(const wall of snapshot.elements)if(wall.kind==='wall'&&(wall.startNodeId===id||wall.endNodeId===id))dependentWalls.add(wall.id);
 for(const wall of snapshot.elements)if(wall.kind==='wall'&&(selectedParent(wall.parentId)||selectedParent(byId.get(wall.startNodeId)?.parentId??null)||selectedParent(byId.get(wall.endNodeId)?.parentId??null)))dependentWalls.add(wall.id);
 const world=[Number(delta.xMm),Number(delta.yMm),Number(delta.zMm)],ops:DesignOperation[]=[],done=new Set<string>();
 function local(e:DesignElement):Point3{const parent=e.kind==='inscription'?e.surfaceElementId:e.kind==='machining'||e.kind==='slope'?e.hostElementId:e.parentId,m=worldMatrix(snapshot,parent),p=[0,1,2].map(col=>mm(m[col]*world[0]+m[4+col]*world[1]+m[8+col]*world[2]));return e.kind==='inscription'?{xMm:p[0],yMm:'0',zMm:p[1]}:{xMm:p[0],yMm:p[1],zMm:p[2]};}
 const toMove=[...roots.filter(e=>e.kind!=='wall'&&e.kind!=='room'),...[...nodes].map(id=>byId.get(id)).filter((e):e is DesignElement=>!!e)];
 for(const e of toMove){if(done.has(e.id)||selectedParent(e.parentId)||e.kind==='opening'&&dependentWalls.has(e.wallId))continue;done.add(e.id);
  if(e.kind==='opening'){
   const wall=byId.get(e.wallId);if(wall?.kind!=='wall')throw Error('Die Öffnung braucht eine vorhandene Bezugswand.');const a=worldPoint(snapshot,wall.startNodeId),b=worldPoint(snapshot,wall.endNodeId),dx=Number(b.xMm)-Number(a.xMm),dy=Number(b.yMm)-Number(a.yMm),length=Math.hypot(dx,dy);if(!length)throw Error('Die Öffnungswand braucht eine bekannte Achse.');const along=mm((world[0]*dx+world[1]*dy)/length);if(along!=='0')ops.push({type:'move_element',elementId:e.id,delta:{xMm:along,yMm:'0',zMm:'0'}});if(world[2]!==0){const sill=snapshot.measurements[e.sillHeightMeasureId];if(sill?.semantic!=='design_target'||sill.valueMm===null)throw Error('Die Öffnungshöhe über ein eigenes bekanntes Wunschmaß bearbeiten; Aufmaß wird nicht indirekt ersetzt.');ops.push({type:'set_design_target',measureId:e.sillHeightMeasureId,valueMm:mm(new D(sill.valueMm).plus(delta.zMm))});}
  }else{const d=local(e);if(d.xMm!=='0'||d.yMm!=='0'||d.zMm!=='0')ops.push({type:'move_element',elementId:e.id,delta:d});}
 }
 return ops;
}
