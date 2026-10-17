import { designSnapshotSchema, designOperationSchema, type DesignSnapshot, type DesignOperation, type DesignElement, type Point3, type Measure } from '@schubert/contracts';
import { D, GEOMETRY_ENGINE_VERSION, mm, targetMeasure } from './precision.js';
import { IDENTITY_TRANSFORM, worldPoint,worldMatrix,multiplyMatrix,inverseRigidMatrix,applyMatrix,matrixToTransform } from './transforms.js';
import { validateDesign } from './validation.js';
import { contourBounds,contourEdges } from './contours.js';
import{miterCut}from'./machining.js';
import{selectionMoveOperations}from'./selection.js';

export function createDesign(kind: DesignSnapshot['kind'], ids: Partial<Pick<DesignSnapshot, 'planningProjectId' | 'variantId' | 'revisionId'>> & { rootFrameId?: string } = {}): DesignSnapshot {
  return { schemaVersion: 1, geometryEngineVersion: GEOMETRY_ENGINE_VERSION, planningProjectId: ids.planningProjectId ?? 'new-project',
    variantId: ids.variantId ?? 'new-variant', revisionId: ids.revisionId ?? 'new-revision', parentRevisionId: null,
    kind, unit: 'mm', precisionMm: '0.01', coordinateSystem: 'right_handed_z_up',
    frames: [{ id: ids.rootFrameId ?? 'root', parentFrameId: null, sourceObjectId: null, transform: structuredClone(IDENTITY_TRANSFORM), datumLabel: 'Planursprung · Höhenbezug noch zu bestätigen' }],
    elements: [], measurements: {}, constraints: [], assetManifest: [] };
}
export function resolveMeasure(snapshot: DesignSnapshot, id: string | null): Measure | null { return id ? snapshot.measurements[id] ?? null : null; }
export function measureValue(snapshot: DesignSnapshot, id: string | null): string | null { return resolveMeasure(snapshot, id)?.valueMm ?? null; }
export function measurementIds(element: DesignElement): string[] {
  const collect = (object: unknown): string[] => {
    if (!object || typeof object !== 'object') return [];
    if (Array.isArray(object)) return object.flatMap(collect);
    return Object.entries(object).flatMap(([key, value]) => key.endsWith('MeasureId')||key==='measureId' ? (typeof value === 'string' ? [value] : []) : collect(value));
  };
  return [...new Set(collect(element))];
}
export function referencedElementIds(element: DesignElement): string[] {
  const ids: string[] = element.parentId ? [element.parentId] : [];
  switch (element.kind) {
    case 'wall': ids.push(element.startNodeId, element.endNodeId); break;
    case 'opening': ids.push(element.wallId); break;
    case 'room': ids.push(...element.boundary.map(b => b.wallId)); break;
    case 'inscription': ids.push(element.surfaceElementId); break;
    case 'stone_piece': ids.push(...element.machiningFeatureIds); break;
    case 'catalog_object': ids.push(...element.connectionElementIds, ...element.clearanceElementIds); break;
    case 'machining': case 'slope': ids.push(element.hostElementId); break;
    case 'connection': case 'clearance': if (element.hostElementId) ids.push(element.hostElementId); break;
    case 'surface': ids.push(...element.movementJointElementIds); break;
    case 'dimension': ids.push(...element.refs.map(r => r.elementId)); break;
  }
  return [...new Set(ids)];
}
/** Host lists are derived indexes, not reverse ownership dependencies. */
function syncHostBackReferences(snapshot:DesignSnapshot){
 const machining=new Map<string,string[]>(),connections=new Map<string,string[]>(),clearances=new Map<string,string[]>();for(const e of snapshot.elements){const target=e.kind==='machining'?machining:e.kind==='connection'?connections:e.kind==='clearance'?clearances:null;if(target&&'hostElementId'in e&&e.hostElementId)target.set(e.hostElementId,[...(target.get(e.hostElementId)??[]),e.id]);}
 for(const e of snapshot.elements){if(e.kind==='stone_piece')e.machiningFeatureIds=machining.get(e.id)??[];if(e.kind==='catalog_object'){e.connectionElementIds=connections.get(e.id)??[];e.clearanceElementIds=clearances.get(e.id)??[];}}
}
function cascadingReferenceIds(element:DesignElement){const indexes=new Set(element.kind==='stone_piece'?element.machiningFeatureIds:element.kind==='catalog_object'?[...element.connectionElementIds,...element.clearanceElementIds]:element.kind==='surface'?element.movementJointElementIds:[]);return referencedElementIds(element).filter(id=>!indexes.has(id));}
function mergeMeasurements(snapshot: DesignSnapshot, additions: Record<string, Measure> | undefined): void {
  for (const [id, measure] of Object.entries(additions ?? {})) {
    if (snapshot.measurements[id] && JSON.stringify(snapshot.measurements[id]) !== JSON.stringify(measure)) throw new Error(`Maß ${id} existiert bereits mit anderem Wert. Eine eigene Maßoperation ist erforderlich.`);
    snapshot.measurements[id] = measure;
  }
}
function lockedAncestor(snapshot:DesignSnapshot,element:DesignElement):boolean{
  const seen=new Set<string>();let parent=element.parentId;
  while(parent&&!seen.has(parent)){seen.add(parent);const p=snapshot.elements.find(e=>e.id===parent);if(p?.locked)return true;parent=p?.parentId??null;}return false;
}
/** A locked derived object also protects the nodes/hosts it depends on. This
 * runs in the kernel, including for direct API commands, rather than relying
 * on disabled inspector controls. */
function guardLockedDependencies(snapshot:DesignSnapshot,changedIds:string[],exceptId?:string){
 const changed=new Set(changedIds),elements=new Map(snapshot.elements.map(e=>[e.id,e]));
 for(const locked of snapshot.elements){if(locked.id===exceptId||!locked.locked&&!lockedAncestor(snapshot,locked))continue;const seen=new Set<string>(),queue=[locked.id];for(let i=0;i<queue.length;i++){const id=queue[i];if(seen.has(id))continue;seen.add(id);if(changed.has(id))throw Error(`„${locked.label}“ ist gesperrt und würde über seinen geometrischen Bezug verändert. Sperre bewusst am betroffenen Element prüfen.`);const element=elements.get(id);if(element){queue.push(...referencedElementIds(element));if(element.kind==='stone_piece'||element.kind==='surface')queue.push(...snapshot.elements.filter(e=>e.kind==='slope'&&e.hostElementId===element.id).map(e=>e.id));if(element.kind==='wall')for(const peer of snapshot.elements)if(peer.kind==='wall'&&peer.id!==element.id&&peer.phase!=='demolition'&&[element.startNodeId,element.endNodeId].some(id=>id===peer.startNodeId||id===peer.endNodeId))queue.push(peer.startNodeId,peer.endNodeId);}}}
}
function guardLockedMeasure(snapshot:DesignSnapshot,measureId:string){
 function depends(id:string,seen=new Set<string>()):boolean{if(id===measureId)return true;if(seen.has(id))return false;seen.add(id);return snapshot.measurements[id]?.sourceMeasureIds.some(source=>depends(source,seen))??false;}
 const owners=snapshot.elements.filter(e=>measurementIds(e).some(id=>depends(id))).flatMap(e=>e.kind==='wall'&&depends(e.coreThicknessMeasureId)?[e.id,e.startNodeId,e.endNodeId]:[e.id]);guardLockedDependencies(snapshot,owners);
}
function descendants(snapshot:DesignSnapshot,id:string):Set<string>{const ids=new Set([id]);let changed=true;while(changed){changed=false;for(const e of snapshot.elements)if(e.parentId&&ids.has(e.parentId)&&!ids.has(e.id)){ids.add(e.id);changed=true;}}return ids;}
function groupChange(snapshot:DesignSnapshot,element:DesignElement,change:()=>void):void{
  if(element.kind!=='group'){change();return;}
  const ids=descendants(snapshot,element.id);if(snapshot.elements.some(e=>ids.has(e.id)&&e.id!==element.id&&e.locked))throw new Error('Diese Gruppe enthält gesperrten Bestand. Gesperrte Elemente werden nicht indirekt verschoben.');
  const before=worldMatrix(snapshot,element.id);change();const delta=multiplyMatrix(worldMatrix(snapshot,element.id),inverseRigidMatrix(before));
  for(const e of snapshot.elements)if(e.kind==='inscription'&&ids.has(e.id)&&!ids.has(e.surfaceElementId)){
    const surface=worldMatrix(snapshot,e.surfaceElementId),oldPoint=applyMatrix({xMm:e.originUV.uMm,yMm:e.originUV.vMm,zMm:'0'},surface),nextPoint=applyMatrix(applyMatrix(oldPoint,delta),inverseRigidMatrix(surface));
    if(new D(nextPoint.zMm).abs().gt('0.01'))throw new Error('Die Gruppentransformation würde Schrift aus ihrer Beschriftungsfläche bewegen.');
    e.originUV={uMm:nextPoint.xMm,vMm:nextPoint.yMm};
  }
}
function reparent(snapshot:DesignSnapshot,element:DesignElement,parentId:string|null):void{
  if(parentId===element.id)throw new Error('Ein Element darf nicht sein eigener Parent sein.');
  if(lockedAncestor(snapshot,{...element,parentId}))throw new Error('Keine Elemente in eine gesperrte Gruppe verschieben.');
  const parent=worldMatrix(snapshot,parentId),inverse=inverseRigidMatrix(parent);
  if('transform'in element)element.transform=matrixToTransform(multiplyMatrix(inverse,worldMatrix(snapshot,element.id)));
  else if(element.kind==='node'||element.kind==='technical_note')element.point=applyMatrix(worldPoint(snapshot,element.id,element.kind==='node'?undefined:element.point),inverse);
  if(element.kind==='wall'||element.kind==='room'){
    const walls=element.kind==='wall'?[element]:element.boundary.map(b=>snapshot.elements.find(e=>e.id===b.wallId)).filter((e):e is Extract<DesignElement,{kind:'wall'}>=>e?.kind==='wall');
    const nodes=new Set(walls.flatMap(w=>[w.startNodeId,w.endNodeId]));for(const id of nodes){const node=snapshot.elements.find(e=>e.id===id);if(node?.kind==='node'){if(node.locked)throw new Error('Gesperrten Wandknoten nicht umgruppieren.');node.point=applyMatrix(worldPoint(snapshot,id),inverse);node.parentId=parentId;}}
    for(const wall of walls)wall.parentId=parentId;
  }element.parentId=parentId;
}
function driveDimension(snapshot:DesignSnapshot,dim:Extract<DesignElement,{kind:'dimension'}>,value:string):void{
  const nodes=dim.refs.map(ref=>snapshot.elements.find(e=>e.id===ref.elementId));
  if(nodes.length===2&&nodes.every(e=>e?.kind==='node')){
    const first=nodes[0] as Extract<DesignElement,{kind:'node'}>,second=nodes[1] as Extract<DesignElement,{kind:'node'}>,a=worldPoint(snapshot,first.id),b=worldPoint(snapshot,second.id),dx=new D(b.xMm).minus(a.xMm),dy=new D(b.yMm).minus(a.yMm),length=dx.pow(2).plus(dy.pow(2)).sqrt();
    if(new D(value).lte(0)||length.isZero())throw new Error('Das treibende Knotenmaß braucht eine positive Länge und eine vorhandene Richtung.');
    if(length.minus(value).abs().lte('0.005'))return;
    if(second.locked||lockedAncestor(snapshot,second))throw new Error('Der zweite Bezugsknoten ist gesperrt. Der feste erste Bezug bleibt unverändert.');
    second.point=applyMatrix({xMm:mm(new D(a.xMm).plus(dx.times(value).div(length))),yMm:mm(new D(a.yMm).plus(dy.times(value).div(length))),zMm:b.zMm},inverseRigidMatrix(worldMatrix(snapshot,second.parentId)));return;
  }
  for(const ref of dim.refs){const driven=snapshot.elements.find(e=>e.id===ref.elementId);if(driven?.locked||driven&&lockedAncestor(snapshot,driven))throw new Error(`„${driven?.label}“ ist gesperrt.`);
    if(driven?.kind!=='stone_piece'||!['width','height'].includes(ref.feature))continue;const bounds=contourBounds(driven.finishedContour),key=ref.feature==='width'?'xMm':'yMm',size=ref.feature==='width'?bounds.width:bounds.height,min=ref.feature==='width'?bounds.minX:bounds.minY;
    if(new D(value).lte(0)||new D(size).lte(0))throw new Error('Treibendes Außenmaß muss positiv sein.');if(new D(size).eq(value))continue;
    if(contourEdges(driven.finishedContour).some(e=>e.kind==='circular_arc'))throw new Error('Bogenkonturen benötigen echte Konturparameter; keine nichtuniforme Bogenskalierung.');
    delete driven.finishedContour.importProvenance;const scale=new D(value).div(size);for(const edge of contourEdges(driven.finishedContour)){edge.from={...edge.from,[key]:mm(new D(edge.from[key]).minus(min).times(scale).plus(min))};edge.to={...edge.to,[key]:mm(new D(edge.to[key]).minus(min).times(scale).plus(min))};}
  }
}
function driveSlope(snapshot:DesignSnapshot,slope:Extract<DesignElement,{kind:'slope'}>,measureId:string,value:string){
  if(slope.locked||lockedAncestor(snapshot,slope))throw new Error('Gesperrtes Gefälle wird nicht indirekt geändert.');
  if(measureId===slope.riseMeasureId)slope.end.zMm=mm(new D(slope.start.zMm).plus(value));
  if(measureId===slope.runMeasureId){const dx=new D(slope.end.xMm).minus(slope.start.xMm),dy=new D(slope.end.yMm).minus(slope.start.yMm),length=dx.pow(2).plus(dy.pow(2)).sqrt();if(length.isZero()||new D(value).lte(0))throw new Error('Gefälle benötigt eine belegte Richtung und positive Lauflänge.');slope.end.xMm=mm(new D(slope.start.xMm).plus(dx.times(value).div(length)));slope.end.yMm=mm(new D(slope.start.yMm).plus(dy.times(value).div(length)));}
}
function duplicateTree(snapshot:DesignSnapshot,element:DesignElement,newId:string,offset:Point3):void{
  if(snapshot.elements.some(e=>e.id===newId)||snapshot.frames.some(f=>f.id===newId))throw new Error('Duplikat-ID ist bereits belegt.');
  const copied=new Set([element.id]);let changed=true;
  while(changed){changed=false;for(const e of snapshot.elements){
    let include=!!e.parentId&&copied.has(e.parentId);
    if(e.kind==='machining'||e.kind==='slope')include||=copied.has(e.hostElementId);
    if(e.kind==='inscription')include||=copied.has(e.surfaceElementId);
    if(e.kind==='opening')include||=copied.has(e.wallId);
    if(e.kind==='connection'||e.kind==='clearance')include||=!!e.hostElementId&&copied.has(e.hostElementId);
    if(copied.has(e.id)&&e.kind==='wall')for(const id of[e.startNodeId,e.endNodeId])if(!copied.has(id)){copied.add(id);changed=true;}
    if(copied.has(e.id)&&e.kind==='room')for(const id of e.boundary.map(b=>b.wallId))if(!copied.has(id)){copied.add(id);changed=true;}
    if(e.kind==='dimension')include||=e.refs.every(r=>copied.has(r.elementId));
    if(include&&!copied.has(e.id)){copied.add(e.id);changed=true;}
  }}
  const originals=snapshot.elements.filter(e=>copied.has(e.id)),mapping=new Map(originals.map((e,i)=>[e.id,e.id===element.id?newId:`${newId}:e:${i}`]));
  const measures=new Map<string,string>();
  for(const source of originals)for(const id of measurementIds(source)){const m=snapshot.measurements[id];if(m?.semantic==='design_target'&&!measures.has(id)){const copyId=`${newId}:m:${measures.size}`;measures.set(id,copyId);snapshot.measurements[copyId]={...structuredClone(m),reviewStatus:'unreviewed',confirmedBy:null,confirmedAt:null};}}
  const elementKeys=new Set(['id','parentId','startNodeId','endNodeId','surfaceElementId','wallId','hostElementId','elementId']);
  const arrayKeys=new Set(['machiningFeatureIds','connectionElementIds','clearanceElementIds','movementJointElementIds']);
  function replace(v:unknown,key=''):unknown{
    if(Array.isArray(v))return v.map(value=>arrayKeys.has(key)&&typeof value==='string'?mapping.get(value)??value:replace(value));
    if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,value])=>[k,replace(value,k)]));
    if(typeof v==='string')return key.endsWith('MeasureId')||key==='measureId'?measures.get(v)??v:elementKeys.has(key)?mapping.get(v)??v:v;return v;
  }
  const clones=originals.map(e=>{const clone=replace(structuredClone(e))as DesignElement;clone.label+=' · Kopie';clone.locked=false;if(clone.kind==='inscription')clone.phase='planned';if(clone.kind==='room')clone.roomId=`unassigned:room:${newId}`;return clone;});
  snapshot.elements.push(...clones);
  for(const constraint of [...snapshot.constraints])if(constraint.kind!=='fixed'&&constraint.refs.every(r=>copied.has(r.elementId)))snapshot.constraints.push({...constraint,id:`${newId}:c:${snapshot.constraints.length}`,refs:constraint.refs.map(r=>({...r,elementId:mapping.get(r.elementId)!})),measureId:constraint.measureId?measures.get(constraint.measureId)??constraint.measureId:null});
  const root=clones.find(e=>e.id===newId)!;
  if(root.kind==='room'){for(const clone of clones)if(clone.kind==='node')move(snapshot,clone,offset);}
  else move(snapshot,root,offset);
  // Host-related objects can have an independent parent; keep their placement relative to the copy.
  for(const clone of clones)if(clone.id!==root.id&&'transform'in clone&&!mapping.has(originals.find(e=>mapping.get(e.id)===clone.id)?.parentId??'')&&['connection','clearance'].includes(clone.kind))move(snapshot,clone,offset);
}
function move(snapshot: DesignSnapshot, element: DesignElement, delta: Point3): void {
  const add = (p: Point3): Point3 => ({ xMm: mm(new D(p.xMm).plus(delta.xMm)), yMm: mm(new D(p.yMm).plus(delta.yMm)), zMm: mm(new D(p.zMm).plus(delta.zMm)) });
  if ('transform' in element) element.transform.position = add(element.transform.position);
  else if (element.kind === 'node' || element.kind === 'technical_note') element.point = add(element.point);
  else if(element.kind==='slope'){element.start=add(element.start);element.end=add(element.end);}
  else if(element.kind==='machining'){
    if(element.machiningType==='miter')throw new Error('Eine Gehrung bleibt an ihrer gewählten Bauteilkante. Kante und Winkel ausdrücklich ändern.');
    if(!new D(delta.zMm).isZero())throw new Error('Bearbeitungen bleiben in der lokalen Bauteilfläche. Tiefe separat ändern.');
    delete element.contour.importProvenance;for(const edge of contourEdges(element.contour)){edge.from={xMm:mm(new D(edge.from.xMm).plus(delta.xMm)),yMm:mm(new D(edge.from.yMm).plus(delta.yMm))};edge.to={xMm:mm(new D(edge.to.xMm).plus(delta.xMm)),yMm:mm(new D(edge.to.yMm).plus(delta.yMm))};if(edge.kind==='circular_arc')edge.center={xMm:mm(new D(edge.center.xMm).plus(delta.xMm)),yMm:mm(new D(edge.center.yMm).plus(delta.yMm))};}
  }
  else if (element.kind === 'inscription') element.originUV = { uMm: mm(new D(element.originUV.uMm).plus(delta.xMm)), vMm: mm(new D(element.originUV.vMm).plus(delta.zMm)) };
  else if (element.kind === 'opening') {
    const measure = snapshot.measurements[element.offsetAlongWallMeasureId];
    if (!measure || measure.valueMm === null || measure.semantic !== 'design_target') throw new Error('Öffnungsposition braucht ein bekanntes Planmaß.');
    measure.valueMm = mm(new D(measure.valueMm).plus(delta.xMm)); measure.reviewStatus = 'unreviewed'; measure.confirmedAt = null; measure.confirmedBy = null;
  } else if (element.kind === 'wall') {
    const source=worldMatrix(snapshot,element.parentId),world=[source[0]*Number(delta.xMm)+source[1]*Number(delta.yMm)+source[2]*Number(delta.zMm),source[4]*Number(delta.xMm)+source[5]*Number(delta.yMm)+source[6]*Number(delta.zMm),source[8]*Number(delta.xMm)+source[9]*Number(delta.yMm)+source[10]*Number(delta.zMm)];
    for (const id of new Set([element.startNodeId, element.endNodeId])) {
      const node = snapshot.elements.find(e => e.id === id);
      if (!node || node.kind !== 'node' || node.locked||lockedAncestor(snapshot,node)) throw new Error('Wandknoten ist gesperrt oder fehlt.');
      const target=worldMatrix(snapshot,node.parentId),local=[0,1,2].map(col=>mm(target[col]*world[0]+target[4+col]*world[1]+target[8+col]*world[2]));node.point={xMm:mm(new D(node.point.xMm).plus(local[0])),yMm:mm(new D(node.point.yMm).plus(local[1])),zMm:mm(new D(node.point.zMm).plus(local[2]))};
    }
  } else throw new Error('Dieses Element wird über seine Bezugsgeometrie verschoben.');
}
export function applyOperations(input: DesignSnapshot, operations: DesignOperation[]): DesignSnapshot {
  const snapshot = structuredClone(designSnapshotSchema.parse(input));
  for (const raw of operations) {
    syncHostBackReferences(snapshot);
    const operation = designOperationSchema.parse(raw);
    const element = 'elementId' in operation ? snapshot.elements.find(e => e.id === operation.elementId) : undefined;
    if ('elementId' in operation && !element) throw new Error(`Element ${operation.elementId} fehlt.`);
    if(element&&lockedAncestor(snapshot,element)&&operation.type!=='duplicate_element')throw new Error(`„${element.label}“ liegt in einer gesperrten Gruppe.`);
    if (element?.locked && !['set_element_lock','duplicate_element','correct_existing_inscription','set_inscription_originals','confirm_contour_import'].includes(operation.type)) throw new Error(`„${element.label}“ ist gesperrt. Bestand zuerst ausdrücklich prüfen.`);
    if (element?.kind === 'inscription' && element.phase === 'existing' && operation.type === 'set_element_lock' && !operation.locked) throw new Error('Eine bestehende Inschrift bleibt geschützt. Verwenden Sie eine dokumentierte Bestandskorrektur.');
    if(element&&!['set_element_lock','duplicate_element','rename_element','reparent_element','confirm_contour_import'].includes(operation.type)){
      const changed=[element.id];if(element.kind==='wall'&&(operation.type==='move_element'||operation.type==='remove_element'||operation.type==='set_element_phase'||operation.type==='set_wall'&&(operation.startNodeId||operation.endNodeId||operation.coreThicknessMeasureId)))changed.push(element.startNodeId,element.endNodeId);if(operation.type==='set_wall'){if(operation.startNodeId)changed.push(operation.startNodeId);if(operation.endNodeId)changed.push(operation.endNodeId);}
      guardLockedDependencies(snapshot,changed,['correct_existing_inscription','set_inscription_originals'].includes(operation.type)?element.id:undefined);
    }
    if((operation.type==='add_element'||operation.type==='add_opening')&&operation.element.kind==='wall')guardLockedDependencies(snapshot,[operation.element.startNodeId,operation.element.endNodeId]);
    if(operation.type==='add_element'&&['machining','slope','connection','clearance'].includes(operation.element.kind)&&'hostElementId'in operation.element&&operation.element.hostElementId)guardLockedDependencies(snapshot,[operation.element.hostElementId]);
    if(['set_slope_spec','set_connection_spec','set_clearance_spec'].includes(operation.type)&&'hostElementId'in operation&&operation.hostElementId)guardLockedDependencies(snapshot,[operation.hostElementId]);
    switch (operation.type) {
      case'move_selection':{
        for(const id of operation.elementIds)if(!snapshot.elements.some(e=>e.id===id))throw Error('Ein Element der Auswahl fehlt.');
        guardLockedDependencies(snapshot,operation.elementIds);
        Object.assign(snapshot,applyOperations(snapshot,selectionMoveOperations(snapshot,operation.elementIds,operation.deltaWorld)));break;
      }
      case 'set_plan_calibration':
        if(element!.kind!=='plan_reference')throw new Error('Keine Quellplanreferenz.');mergeMeasurements(snapshot,operation.measurements);element!.calibration=operation.calibration;element!.opacity=operation.opacity;break;
      case 'add_element': case 'add_opening':
        if (snapshot.elements.some(e => e.id === operation.element.id) || snapshot.frames.some(f => f.id === operation.element.id)) throw new Error('Element-ID ist bereits belegt.');
        if(lockedAncestor(snapshot,operation.element))throw new Error('In einer gesperrten Gruppe werden keine Elemente ergänzt.');
        mergeMeasurements(snapshot, operation.measurements); snapshot.elements.push(operation.element); break;
      case 'remove_element': {
        const removal = new Set([operation.elementId]);
        let added = true;
        while (added) {
          added = false;
          for (const e of snapshot.elements) if (!removal.has(e.id) && cascadingReferenceIds(e).some(id => removal.has(id))) {
            if (!operation.cascade) throw new Error(`„${e.label}“ verweist noch auf dieses Element.`);
            if (e.locked) throw new Error(`Abhängiges Element „${e.label}“ ist gesperrt.`);
            removal.add(e.id); added = true;
          }
        }
        snapshot.elements = snapshot.elements.filter(e => !removal.has(e.id));for(const kept of snapshot.elements)if(kept.kind==='surface')kept.movementJointElementIds=kept.movementJointElementIds.filter(id=>!removal.has(id));
        snapshot.constraints = snapshot.constraints.filter(c => !c.refs.some(r => removal.has(r.elementId))); break;
      }
      case 'move_element': groupChange(snapshot,element!,()=>move(snapshot, element!, operation.delta)); break;
      case 'set_element_position': {
        const current = 'transform' in element! ? element.transform.position : element!.kind === 'node' || element!.kind === 'technical_note' ? element!.point : null;
        if (!current) throw new Error('Position ist aus dem Bezugselement abgeleitet.');
        groupChange(snapshot,element!,()=>move(snapshot, element!, { xMm: mm(new D(operation.position.xMm).minus(current.xMm)), yMm: mm(new D(operation.position.yMm).minus(current.yMm)), zMm: mm(new D(operation.position.zMm).minus(current.zMm)) })); break;
      }
      case 'rotate_element':
        if ('transform' in element!) groupChange(snapshot,element!,()=>{if('transform'in element!)element.transform.rotationDeg=operation.rotationDeg;});
        else if (element!.kind === 'inscription') element!.rotationDeg = operation.rotationDeg.z;
        else throw new Error('Dieses Element wird über seine Knoten ausgerichtet.'); break;
      case 'duplicate_element': {
        duplicateTree(snapshot,element!,operation.newId,operation.offset);break;
      }
      case 'set_element_lock': element!.locked = operation.locked; break;
      case 'rename_element': element!.label = operation.label; break;
      case 'set_element_sources':element!.sourceEvidenceVersionIds=[...new Set(operation.sourceEvidenceVersionIds)];break;
      case 'set_element_phase':if(element!.kind==='inscription')throw Error('Die Bestandszuordnung einer Inschrift bleibt an ihren geschützten Originalstand gebunden. Für eine Ergänzung eine neue geplante Inschrift anlegen.');element!.phase=operation.phase;break;
      case 'reparent_element': reparent(snapshot,element!,operation.parentId); break;
      case 'set_design_target': {
        guardLockedMeasure(snapshot,operation.measureId);
        const previous = snapshot.measurements[operation.measureId];
        if (previous && previous.semantic !== 'design_target') throw new Error('Aufmaß, Katalognennmaß und Referenzmaß werden nicht durch einen Planwunsch überschrieben.');
        snapshot.measurements[operation.measureId] = targetMeasure(operation.valueMm, operation.isEstimated ?? previous?.isEstimated ?? false);
        for (const dim of snapshot.elements) if (dim.kind === 'dimension' && dim.mode === 'driving' && dim.measureId === operation.measureId && operation.valueMm !== null) driveDimension(snapshot,dim,operation.valueMm);
        for(const slope of snapshot.elements)if(slope.kind==='slope'&&[slope.riseMeasureId,slope.runMeasureId].includes(operation.measureId)&&operation.valueMm!==null)driveSlope(snapshot,slope,operation.measureId,operation.valueMm);
        // Confirmation is a separate authenticated server action; a browser flag cannot attest a reviewer.
        if (operation.confirm) throw new Error('Maßbestätigung erfordert einen fachlich autorisierten Bestätigungs-Command.'); break;
      }
      case 'confirm_design_target': {
        const measure = snapshot.measurements[operation.measureId];
        if (!measure || measure.semantic !== 'design_target' || measure.valueMm === null || measure.isEstimated) throw new Error('Nur ein bekanntes, nicht geschätztes Wunschmaß kann festgelegt werden.');
        measure.reviewStatus = 'confirmed'; measure.confirmedBy = operation.confirmedBy; measure.confirmedAt = operation.confirmedAt; break;
      }
      case 'bind_measurement': {
        const optionalFields:Record<string,string[]>={stone_piece:['roughWidthMeasureId','roughHeightMeasureId','roughThicknessMeasureId'],opening:['recessDepthMeasureId'],catalog_object:['heightMeasureId']},nullableFields:Record<string,string[]>={stone_piece:['roughWidthMeasureId','roughHeightMeasureId','roughThicknessMeasureId'],opening:['recessDepthMeasureId'],inscription:['requestedLowercaseHeightMeasureId','requestedMaxWidthMeasureId'],surface:['jointWidthMeasureId'],connection:['diameterMeasureId'],clearance:['heightMeasureId'],machining:['depthMeasureId','minimumWebMeasureId']};
        if(!(operation.field in element!)&&!optionalFields[element!.kind]?.includes(operation.field))throw new Error('Maßfeld passt nicht zum Element.');
        if(element!.kind==='catalog_object'&&!element!.productVariantVersionId.startsWith('unassigned')&&(!operation.measureId||snapshot.measurements[operation.measureId]?.semantic!=='catalog_nominal'))throw new Error('Produktmaße stammen aus der eingefrorenen Katalogvariante.');
        if(operation.measureId===null){if(element!.kind==='catalog_object'&&operation.field==='heightMeasureId')delete element!.heightMeasureId;else if(nullableFields[element!.kind]?.includes(operation.field))Object.assign(element!,{[operation.field]:null});else throw new Error('Dieses erforderliche Maßfeld darf nicht entfernt werden.');break;}
        if(!snapshot.measurements[operation.measureId])throw new Error('Das zugeordnete Maß fehlt.');
        Object.assign(element!,{[operation.field]:operation.measureId});if(element!.kind==='dimension'&&element!.mode==='driving'){const v=measureValue(snapshot,operation.measureId);if(v!==null)driveDimension(snapshot,element!,v);}if(element!.kind==='slope'){const v=measureValue(snapshot,operation.measureId);if(v!==null)driveSlope(snapshot,element!,operation.measureId,v);}break;
      }
      case 'record_survey_measurement':
        if(snapshot.measurements[operation.measureId])throw new Error('Aufmaß und Wunschmaß bleiben unabhängig. Für das Aufmaß eine neue Maß-ID verwenden.');
        snapshot.measurements[operation.measureId] = { ...targetMeasure(operation.valueMm), semantic: 'as_built', origin: 'survey',
          evidenceVersionId: operation.evidenceVersionId, measurementMethod: operation.measurementMethod, measuredBy: operation.measuredBy,
          measuredAt: operation.measuredAt, tolerancePlusMm: operation.tolerancePlusMm, toleranceMinusMm: operation.toleranceMinusMm }; break;
      case 'confirm_survey_measurement': {
        const measure = snapshot.measurements[operation.measureId];
        if (!measure || measure.semantic !== 'as_built' || measure.origin === 'ai' || measure.isEstimated || !measure.evidenceVersionId || !measure.measuredBy || !measure.measurementMethod || !measure.measuredAt || measure.tolerancePlusMm === null || measure.toleranceMinusMm === null) throw new Error('Aufmaßbestätigung benötigt vollständige interne Evidenz, Messmethode und Toleranz.');
        measure.reviewStatus = 'confirmed'; measure.confirmedBy = operation.confirmedBy; measure.confirmedAt = operation.confirmedAt; break;
      }
      case 'replace_product_variant': {
        if (element!.kind !== 'catalog_object') throw new Error('Kein Katalogobjekt.');
        Object.assign(element!, { productVariantVersionId: operation.productVariantVersionId, assetVersionId: operation.assetVersionId, accuracy: operation.accuracy, footprint: operation.footprint }); break;
      }
      case 'set_inscription_text':
        if (element!.kind !== 'inscription') throw new Error('Keine Inschrift.');
        if (element!.phase === 'existing') throw new Error('Bestehende Inschrift benötigt dokumentierte Bestandskorrektur.');
        element!.exactText = operation.exactText; element!.glyphPlacements = []; break;
      case 'correct_existing_inscription':
        if (element!.kind !== 'inscription' || element!.phase !== 'existing') throw new Error('Bestandskorrektur ist nur für eine bestehende Inschrift zulässig.');
        element!.exactText = operation.exactText; element!.glyphPlacements = []; element!.sourceEvidenceVersionIds.push(operation.evidenceVersionId); break;
      case 'set_inscription_originals':
        if(element!.kind!=='inscription')throw new Error('Originalzeichen gehören zu einer Inschrift.');
        element!.glyphPlacements=operation.glyphPlacements;element!.renderingBasis='verified_contours';element!.sourceEvidenceVersionIds.push(operation.evidenceVersionId);break;
      case 'set_inscription_layout': case 'set_stone_spec': case 'set_wall': case 'set_opening': case 'set_surface_spec':case 'set_machining_spec': {
        const expected = { set_inscription_layout: 'inscription', set_stone_spec: 'stone_piece', set_wall: 'wall', set_opening: 'opening', set_surface_spec: 'surface',set_machining_spec:'machining' }[operation.type];
        if (element!.kind !== expected) throw new Error('Operation passt nicht zum Elementtyp.');
        const { type: _type, elementId: _id, ...changes } = operation; Object.assign(element!, changes); break;
      }
      case 'confirm_contour_import': {
        const c=element!.kind==='stone_piece'?element!.finishedContour:element!.kind==='catalog_object'?element!.footprint:'contour'in element!?element!.contour:null;if(!c?.importProvenance)throw new Error('Keine quellengebundene Importkontur.');if(!operation.confirmedBy||!operation.confirmedAt||new D(operation.acceptedErrorMm).lt(c.importProvenance.curveErrorBoundMm))throw new Error('Fachliche Konturprüfung und ausdrückliche Fehlerakzeptanz fehlen.');c.importProvenance.review={evidenceVersionId:operation.evidenceVersionId,confirmedBy:operation.confirmedBy,confirmedAt:operation.confirmedAt,acceptedErrorMm:operation.acceptedErrorMm,statement:operation.statement};break;
      }
      case 'set_contour':
        if(element!.kind==='machining'&&element!.machiningType==='miter')throw new Error('Gehrung über Kantenbezug und Winkel ändern; ihre abgeleitete Kontur ist nicht unabhängig verformbar.');
        if(operation.contour.importProvenance?.sourceDocumentVersionId)element!.sourceEvidenceVersionIds=[...new Set([...element!.sourceEvidenceVersionIds,operation.contour.importProvenance.sourceDocumentVersionId])];
        if(element!.kind==='stone_piece'){if(JSON.stringify(contourEdges(element!.finishedContour))!==JSON.stringify(contourEdges(operation.contour)))element!.edgeTreatments=[];element!.finishedContour=operation.contour;}
        else if(element!.kind==='surface'||element!.kind==='machining'||element!.kind==='clearance'||element!.kind==='grave_border')element!.contour=operation.contour;
        else throw new Error('Katalogobjekte werden nicht verzerrt. Für dieses Element ist keine freie Konturbearbeitung zulässig.');
        if(element!.kind==='stone_piece')for(const dim of snapshot.elements)if(dim.kind==='dimension'&&dim.mode==='driving'&&dim.refs.some(r=>r.elementId===element!.id)){
          const ref=dim.refs.find(r=>r.elementId===element!.id),key=ref?.feature==='width'?'xMm':ref?.feature==='height'?'yMm':null;
          if(key){const bounds=contourBounds(operation.contour);const value=key==='xMm'?bounds.width:bounds.height;const previous=snapshot.measurements[dim.measureId];if(previous?.semantic==='design_target')snapshot.measurements[dim.measureId]=targetMeasure(value);}
        }break;
      case 'set_technical_note':case 'set_connection_spec':case 'set_room_spec':case 'set_grave_border_spec':case 'set_clearance_spec':case 'set_slope_spec':{
        const expected={set_technical_note:'technical_note',set_connection_spec:'connection',set_room_spec:'room',set_grave_border_spec:'grave_border',set_clearance_spec:'clearance',set_slope_spec:'slope'}[operation.type];
        if(element!.kind!==expected)throw new Error('Fachoperation passt nicht zum Elementtyp.');const{type:_type,elementId:_id,...changes}=operation;Object.assign(element!,changes);
        if(element!.kind==='slope'&&operation.type==='set_slope_spec'&&(operation.start||operation.end))for(const[id,value]of[[element!.riseMeasureId,mm(new D(element!.end.zMm).minus(element!.start.zMm))],[element!.runMeasureId,mm(new D(element!.end.xMm).minus(element!.start.xMm).pow(2).plus(new D(element!.end.yMm).minus(element!.start.yMm).pow(2)).sqrt())]])if(snapshot.measurements[id]?.semantic==='design_target')snapshot.measurements[id]=targetMeasure(value,snapshot.measurements[id].isEstimated);
        break;
      }
      case 'split_wall': {
        if (element!.kind !== 'wall') throw new Error('Keine Wand.');
        const start = snapshot.elements.find(e => e.id === element.startNodeId), end = snapshot.elements.find(e => e.id === element.endNodeId);
        if (!start || !end || start.kind !== 'node' || end.kind !== 'node' || start.parentId !== end.parentId) throw new Error('Wandknoten brauchen ein gemeinsames Bezugssystem.');
        const dx = new D(end.point.xMm).minus(start.point.xMm), dy = new D(end.point.yMm).minus(start.point.yMm), length = dx.pow(2).plus(dy.pow(2)).sqrt(), d = new D(operation.distanceMm);
        if (d.lte(0) || d.gte(length)) throw new Error('Teilung muss innerhalb der Wand liegen.');
        if (snapshot.elements.some(e => [operation.newNodeId, operation.newWallId].includes(e.id))) throw new Error('Teilungs-ID bereits belegt.');
        const base = { label: `${element.label} · Teilung`, parentId: start.parentId, phase: element.phase, locked: false, sourceEvidenceVersionIds: [] };
        snapshot.elements.push({ ...base, id: operation.newNodeId, kind: 'node', point: { xMm: mm(new D(start.point.xMm).plus(dx.times(d).div(length))), yMm: mm(new D(start.point.yMm).plus(dy.times(d).div(length))), zMm: start.point.zMm } });
        const second = { ...structuredClone(element), id: operation.newWallId, startNodeId: operation.newNodeId, label: `${element.label} · 2` };
        element.endNodeId = operation.newNodeId; snapshot.elements.push(second);
        for (const opening of snapshot.elements.filter(e => e.kind === 'opening' && e.wallId === element.id)) {
          if (opening.kind !== 'opening') continue;
          const offset = measureValue(snapshot, opening.offsetAlongWallMeasureId), width = measureValue(snapshot, opening.widthMeasureId);
          if (offset === null || width === null) throw new Error('Wandteilung mit unbekannten Öffnungsmaßen nicht möglich.');
          if (new D(offset).lt(d) && new D(offset).plus(width).gt(d)) throw new Error('Teilung schneidet eine Öffnung.');
          if (new D(offset).gte(d)) {
            const source = snapshot.measurements[opening.offsetAlongWallMeasureId], nextId = `${operation.newWallId}:offset:${opening.id}`;
            snapshot.measurements[nextId] = { ...targetMeasure(mm(new D(offset).minus(d))), semantic: 'derived', origin: source.origin,
              sourceMeasureIds: [opening.offsetAlongWallMeasureId], derivedByKernelVersion: GEOMETRY_ENGINE_VERSION };
            opening.offsetAlongWallMeasureId = nextId; opening.wallId = second.id;
          }
        }
        for (const room of snapshot.elements) if (room.kind === 'room') room.boundary = room.boundary.flatMap(b => b.wallId === element.id ? b.side === 'left' ? [b, { wallId: second.id, side: b.side }] : [{ wallId: second.id, side: b.side }, b] : [b]);
        break;
      }
      case 'add_constraint': if (snapshot.constraints.some(c => c.id === operation.constraint.id)) throw new Error('Constraint-ID bereits belegt.');mergeMeasurements(snapshot,operation.measurements);snapshot.constraints.push(operation.constraint);break;
      case 'remove_constraint': snapshot.constraints = snapshot.constraints.filter(c => c.id !== operation.constraintId); break;
      case 'add_asset_reference': {
        const present = snapshot.assetManifest.find(a => a.assetVersionId === operation.entry.assetVersionId);
        if (present && JSON.stringify(present) !== JSON.stringify(operation.entry)) throw new Error('Eine eingefrorene Assetversion darf nicht ausgetauscht werden.');
        if (!present) snapshot.assetManifest.push(operation.entry); break;
      }
      case 'add_frame': if (snapshot.frames.some(f => f.id === operation.frame.id)) throw new Error('Frame-ID bereits belegt.'); snapshot.frames.push(operation.frame); break;
    }
  }
  syncHostBackReferences(snapshot);
  for(const feature of snapshot.elements)if(feature.kind==='machining'&&feature.machiningType==='miter'&&feature.miter){const host=snapshot.elements.find(e=>e.id===feature.hostElementId);if(host?.kind==='stone_piece')feature.contour=miterCut(snapshot,host,feature.miter.edgeIndex,feature.miter.angleDeg,feature.face).contour;}
  const parsed = designSnapshotSchema.parse(snapshot), issues = validateDesign(parsed);
  if (issues.blocking.length) throw new Error(issues.blocking.join('\n'));
  return parsed;
}
/** The server uses these IDs to enforce tenant-local frozen-version references and evidence rights. */
export function externalReferenceIds(snapshot: DesignSnapshot): Record<string, string[]> {
  const refs: Record<string, Set<string>> = {};
  function visit(v: unknown) {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach(visit); return; }
    for (const [key, value] of Object.entries(v)) {
      if ((key.endsWith('VersionId') || ['roomId','floorId','stockItemId','measuredBy','confirmedBy'].includes(key)) && typeof value === 'string') (refs[key] ??= new Set()).add(value);
      else if (key.endsWith('VersionIds') && Array.isArray(value)) value.forEach(id => { if (typeof id === 'string') (refs[key] ??= new Set()).add(id); });
      else visit(value);
    }
  }
  visit(snapshot);
  return Object.fromEntries(Object.entries(refs).map(([key, values]) => [key, [...values]]));
}
