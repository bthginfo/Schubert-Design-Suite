import { designSnapshotSchema, type DesignSnapshot, type DesignElement, type Point2, type Point3, type Contour } from '@schubert/contracts';
import { D, GEOMETRY_ENGINE_VERSION, distance, mm } from './precision.js';
import { worldPoint, worldMatrix, surfaceMatrix, applyMatrix } from './transforms.js';
import { contourAreaMm2,contourBounds,contourParts,contourEdges,contourRings, edgeIntersections,edgeDistanceMm,edgeSetDistanceMm,edgeSetsIntersect, pointInContour, polygonContour, sampleRing, validateContour } from './contours.js';
import { measurementIds, referencedElementIds, measureValue } from './model.js';
import {validateConstraints} from './constraints.js';
import{machiningDepth,miterCut}from'./machining.js';
import{wallJoinIssues,wallJoinConsistencyIssues}from'./walls.js';
import{doorSwingContour}from'./openings.js';

export type DesignValidation = { blocking: string[]; warnings: string[] };
export function roomContour(snapshot: DesignSnapshot, roomId: string): Contour | null {
  const room = snapshot.elements.find(e => e.id === roomId);
  if (room?.kind !== 'room' || room.boundary.length < 3) return null;
  const points: Point2[] = [];
  for (const boundary of room.boundary) {
    const wall = snapshot.elements.find(e => e.id === boundary.wallId);
    if (wall?.kind !== 'wall') return null;
    const id = boundary.side === 'left' ? wall.startNodeId : wall.endNodeId;
    const node = snapshot.elements.find(e => e.id === id);
    if (node?.kind !== 'node') return null;
    const p = worldPoint(snapshot, id); points.push({ xMm: p.xMm, yMm: p.yMm });
  }
  return polygonContour(points);
}
function worldFootprint(snapshot: DesignSnapshot, element: DesignElement): Contour | null {
  const contour = element.kind === 'catalog_object' ? element.footprint : 'contour' in element ? element.contour : element.kind === 'stone_piece' ? element.finishedContour : null;
  if (!contour || !('transform' in element)) return null;
  const matrix=element.kind==='stone_piece'?surfaceMatrix(snapshot,element.id):worldMatrix(snapshot,element.id),horizontal=Math.abs(matrix[8])<1e-8&&Math.abs(matrix[9])<1e-8,det=matrix[0]*matrix[5]-matrix[1]*matrix[4];
  const ring=(edges:Contour['outer']):Contour['outer']=>horizontal?edges.map(edge=>{const transform=(p:Point2)=>{const q=applyMatrix({...p,zMm:'0'},matrix);return{xMm:q.xMm,yMm:q.yMm};};return edge.kind==='line'?{kind:'line',from:transform(edge.from),to:transform(edge.to)}:{kind:'circular_arc',from:transform(edge.from),to:transform(edge.to),center:transform(edge.center),clockwise:det<0?!edge.clockwise:edge.clockwise};}):polygonContour(sampleRing(edges).map(p=>{const world=applyMatrix({...p,zMm:'0'},matrix);return{xMm:world.xMm,yMm:world.yMm};})).outer;
  const parts=contourParts(contour).map(p=>({outer:ring(p.outer),holes:p.holes.map(ring)}));return{...parts[0],...(parts.length>1?{islands:parts.slice(1)}:{})};
}
export function validateDesign(input: DesignSnapshot, options: { forRelease?: boolean } = {}): DesignValidation {
  const result: DesignValidation = { blocking: [], warnings: [] }, { blocking, warnings } = result;
  const parsed = designSnapshotSchema.safeParse(input);
  if (!parsed.success) return { blocking: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`), warnings: [] };
  const snapshot = parsed.data;
  const issue = (message: string) => (options.forRelease ? blocking : warnings).push(message);
  const elements = new Map(snapshot.elements.map(e => [e.id, e])), frames = new Map(snapshot.frames.map(f => [f.id, f])), measurements = snapshot.measurements;
  if (elements.size !== snapshot.elements.length) blocking.push('Element-IDs sind nicht eindeutig.');
  if (frames.size !== snapshot.frames.length) blocking.push('Frame-IDs sind nicht eindeutig.');
  if (snapshot.frames.filter(f => f.parentFrameId === null).length !== 1) blocking.push('Genau ein eingefrorener Root-Frame ist erforderlich.');
  for (const id of elements.keys()) if (frames.has(id)) blocking.push(`ID ${id} ist zugleich Element und Frame.`);
  for (const frame of snapshot.frames) {
    if (frame.parentFrameId && !frames.has(frame.parentFrameId)) blocking.push(`Frame „${frame.datumLabel}“ hat einen unbekannten Parent.`);
    try { worldMatrix(snapshot, frame.id); } catch (e) { blocking.push((e as Error).message); }
  }
  const visiting = new Set<string>(), visited = new Set<string>();
  function inspectMeasure(id: string) {
    if (visiting.has(id)) { blocking.push(`Zyklische Maßableitung bei ${id}.`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    const m = measurements[id];
    if (!m) { blocking.push(`Maß ${id} fehlt in der kanonischen Maß-Map.`); visiting.delete(id); return; }
    if (m.valueMm !== null) { try { mm(m.valueMm); } catch { blocking.push(`Maß ${id} überschreitet den sicheren Wertebereich.`); } }
    if (m.valueMm === null && m.reviewStatus === 'confirmed') blocking.push(`Unbekanntes Maß ${id} kann nicht bestätigt sein.`);
    if (m.isEstimated && m.reviewStatus === 'confirmed' && m.semantic === 'as_built') blocking.push(`Geschätztes Maß ${id} ist kein bestätigtes Aufmaß.`);
    if (m.tolerancePlusMm !== null && new D(m.tolerancePlusMm).lt(0) || m.toleranceMinusMm !== null && new D(m.toleranceMinusMm).lt(0)) blocking.push(`Toleranz von ${id} darf nicht negativ sein.`);
    if (m.reviewStatus === 'confirmed' && (!m.confirmedBy || !m.confirmedAt)) blocking.push(`Maß ${id}: Prüfer und Bestätigungszeitpunkt fehlen.`);
    if (m.semantic === 'as_built' && m.reviewStatus === 'confirmed') {
      if (m.origin === 'ai' || m.isEstimated || !m.evidenceVersionId || !m.measurementMethod || !m.measuredBy || !m.measuredAt || m.tolerancePlusMm === null || m.toleranceMinusMm === null) blocking.push(`Aufmaß ${id}: vollständige interne Messevidenz, Methode, Messender, Datum und Toleranz erforderlich.`);
    }
    if (m.semantic === 'derived') {
      if (!m.sourceMeasureIds.length || !m.derivedByKernelVersion) blocking.push(`Abgeleitetes Maß ${id} braucht Quellmaße und Kernelversion.`);
      if (m.reviewStatus === 'confirmed' && m.sourceMeasureIds.some(source => !measurements[source] || measurements[source].reviewStatus !== 'confirmed' || measurements[source].isEstimated || measurements[source].valueMm === null)) blocking.push(`Abgeleitetes Maß ${id} darf ungeklärte Quellen nicht als bestätigt ausgeben.`);
      if (m.derivedByKernelVersion && m.derivedByKernelVersion !== snapshot.geometryEngineVersion) issue(`Abgeleitetes Maß ${id}: abweichende Kernelversion ${m.derivedByKernelVersion}.`);
    } else if (m.sourceMeasureIds.length || m.derivedByKernelVersion) blocking.push(`Nicht abgeleitetes Maß ${id} darf keine Ableitungsmetadaten tragen.`);
    for (const source of m.sourceMeasureIds) inspectMeasure(source);
    visiting.delete(id); visited.add(id);
  }
  Object.keys(measurements).forEach(inspectMeasure);
  const positive = (element: DesignElement, id: string | null, allowZero = false, allowNegative = false) => {
    if (!id) return;
    const measure = measurements[id];
    if (!measure) return;
    const measureName=({width:'Breite',height:'Höhen- / Längenmaß',depth:'Tiefe',thickness:'Stärke',length:'Länge',offset:'Abstand',radius:'Radius'} as Record<string,string>)[id.split(':').at(-1)??'']||'Dieses Maß';
    if (measure.valueMm === null) issue(`„${element.label}“: ${measureName} ist noch unbekannt.`);
    else if (!allowNegative&&(allowZero ? new D(measure.valueMm).lt(0) : new D(measure.valueMm).lte(0))) blocking.push(`„${element.label}“: ${measureName} muss ${allowZero ? 'mindestens null' : 'positiv'} sein.`);
    if (measure.isEstimated) issue(`„${element.label}“: ${measureName} ist geschätzt.`);
    if (measure.valueMm !== null && measure.reviewStatus !== 'confirmed') issue(`„${element.label}“: ${measureName} (${measure.valueMm.replace('.',',')} mm) ist ${measure.semantic === 'design_target' ? 'als Planmaß eingetragen, aber noch nicht fachlich bestätigt' : 'noch nicht fachlich bestätigt'}.`);
  };
  for (const element of snapshot.elements) {
    for (const id of measurementIds(element)) if (!measurements[id]) blocking.push(`„${element.label}“: Maß ${id} fehlt.`);
    for (const id of referencedElementIds(element)) if (!elements.has(id) && !frames.has(id)) blocking.push(`„${element.label}“: Bezugselement ${id} fehlt.`);
    try { worldMatrix(snapshot, element.id); } catch (e) { blocking.push((e as Error).message); }
    const contour = element.kind === 'stone_piece' ? element.finishedContour : element.kind === 'catalog_object' ? element.footprint : 'contour' in element ? element.contour : null;
    if(contour?.importProvenance){const source=contour.importProvenance;if(!source.review)issue(`„${element.label}“: Importkontur mit Fehlergrenze ${source.curveErrorBoundMm} mm ist noch nicht fachlich bestätigt.`);else if(new D(source.review.acceptedErrorMm).lt(source.curveErrorBoundMm))blocking.push(`„${element.label}“: akzeptierte Konturtoleranz ist kleiner als der tatsächliche Importfehler.`);warnings.push(`„${element.label}“: ${source.format.toUpperCase()}-Original ${source.approximated?'mit kontrollierter Kurvennäherung':'mit quantisierten Geraden/Kreisbögen'}; maximal ${source.curveErrorBoundMm} mm Importfehler, keine automatische Herstellerfreigabe.`);}
    if (contour) validateContour(contour).forEach(message => blocking.push(`„${element.label}“: ${message}`));
    if ('materialSpecVersionId' in element && (!element.materialSpecVersionId || element.materialSpecVersionId.startsWith('unassigned'))) issue(`„${element.label}“: konkrete Materialversion fehlt.`);
    if ('layers' in element) for (const layer of element.layers) {
      positive(element, layer.thicknessMeasureId);
      if(element.kind==='surface'&&!['top','bottom'].includes(layer.side))blocking.push(`„${element.label}“: Flächenschichten müssen oberhalb oder unterhalb ihrer Bezugsebene liegen.`);
    }
    if(element.kind==='surface'){if(!element.substrateVersionId)issue(`„${element.label}“: bestätigter Untergrundmaterialstand fehlt.`);if(!element.ruleVersionId)issue(`„${element.label}“: fachliche Aufbau-/Flächenregel noch offen.`);for(const id of element.movementJointElementIds){const joint=elements.get(id);if(joint?.kind!=='connection'||joint.connectionType!=='joint')blocking.push(`„${element.label}“: Bewegungsfugenbezug muss ein konkreter Fugen-/Anschlussdatensatz sein.`);}}
    if (element.kind === 'wall') {
      positive(element, element.heightMeasureId); positive(element, element.coreThicknessMeasureId);
      const start = elements.get(element.startNodeId), end = elements.get(element.endNodeId);
      if (start?.kind !== 'node' || end?.kind !== 'node') blocking.push(`„${element.label}“: Wandachse muss auf zwei Knoten zeigen.`);
      else {
        const a = worldPoint(snapshot, start.id), b = worldPoint(snapshot, end.id);
        if (new D(distance(a, b)).lt('0.01')) blocking.push(`„${element.label}“: Wandachse hat keine Länge.`);
        if (!new D(a.zMm).eq(b.zMm)) blocking.push(`„${element.label}“: Wandachse braucht ein gemeinsames Höhenniveau.`);
        wallJoinIssues(snapshot,element.id).forEach(message=>blocking.push(`„${element.label}“: ${message}`));
      }
    }
    if (element.kind === 'opening') {
      if(element.openingType==='door'&&['inward','outward'].includes(element.openingDirection)&&!element.hingeSide)issue(`„${element.label}“: Bandseite für den tatsächlichen Türschwenkbereich fehlt.`);
      positive(element, element.widthMeasureId); positive(element, element.heightMeasureId);
      positive(element, element.offsetAlongWallMeasureId, true); positive(element, element.sillHeightMeasureId, true);
      if(element.openingType==='recess'){if(!element.recessDepthMeasureId)issue(`„${element.label}“: Nischentiefe ab Wandkernoberfläche fehlt.`);else positive(element,element.recessDepthMeasureId);}
      const wall = elements.get(element.wallId);
      if (wall?.kind !== 'wall') blocking.push(`„${element.label}“: verwaiste Öffnung ohne Wand.`);
      else if (elements.get(wall.startNodeId)?.kind === 'node' && elements.get(wall.endNodeId)?.kind === 'node') {
        const length = distance(worldPoint(snapshot, wall.startNodeId), worldPoint(snapshot, wall.endNodeId));
        const offset = measureValue(snapshot, element.offsetAlongWallMeasureId), width = measureValue(snapshot, element.widthMeasureId), height = measureValue(snapshot, element.heightMeasureId), sill = measureValue(snapshot, element.sillHeightMeasureId), wallHeight = measureValue(snapshot, wall.heightMeasureId);
        if (offset !== null && width !== null && new D(offset).plus(width).gt(length)) blocking.push(`„${element.label}“: Öffnung reicht über das Wandende.`);
        if (height !== null && sill !== null && wallHeight !== null && new D(height).plus(sill).gt(wallHeight)) blocking.push(`„${element.label}“: Öffnung reicht über die Wandhöhe.`);
        if(element.openingType==='recess'&&element.recessDepthMeasureId){const depth=measureValue(snapshot,element.recessDepthMeasureId),core=measureValue(snapshot,wall.coreThicknessMeasureId);if(depth!==null&&core!==null&&new D(depth).gte(core))blocking.push(`„${element.label}“: Nische durchtrennt den gesamten Wandkern; als Durchgang planen oder die Tiefe korrigieren.`);}
      }
    }
    if (element.kind === 'room') {
      positive(element,element.finishedFloorLevelMeasureId,true,true);
      if(element.floorLayers.some(layer=>!['top','bottom'].includes(layer.side)))blocking.push(`„${element.label}“: Bodenschichten werden ausdrücklich von der Fertigfußbodenoberfläche nach unten aufgebaut.`);
      if(new Set(element.boundary.map(b=>b.wallId)).size!==element.boundary.length)blocking.push(`„${element.label}“: dieselbe Wand darf in einer Raumgrenze nur einmal vorkommen.`);
      if (element.boundary.length < 3) blocking.push(`„${element.label}“: mindestens drei gerichtete Wandbezüge erforderlich.`);
      const endpoints = element.boundary.map(b => {
        const wall = elements.get(b.wallId); return wall?.kind === 'wall' ? b.side === 'left' ? [wall.startNodeId, wall.endNodeId] : [wall.endNodeId, wall.startNodeId] : null;
      });
      endpoints.forEach((p, i) => { if (!p || p[1] !== endpoints[(i + 1) % endpoints.length]?.[0]) blocking.push(`„${element.label}“: Raumgrenze ist nicht geschlossen.`); });
      const boundary = roomContour(snapshot, element.id);
      if (boundary) validateContour(boundary).forEach(message => blocking.push(`„${element.label}“: ${message}`));
      for (const layer of element.floorLayers) positive(element, layer.thicknessMeasureId);
    }
    if (element.kind === 'stone_piece') {
      positive(element, element.thicknessMeasureId);
      const rawValues=[element.roughWidthMeasureId??null,element.roughHeightMeasureId??null,element.roughThicknessMeasureId??null].map(id=>measureValue(snapshot,id));for(const id of[element.roughWidthMeasureId,element.roughHeightMeasureId,element.roughThicknessMeasureId])if(id)positive(element,id);const bounds=contourBounds(element.finishedContour),required=[bounds.width,bounds.height,measureValue(snapshot,element.thicknessMeasureId)];for(let i=0;i<3;i++)if(rawValues[i]!==null&&required[i]!==null&&new D(rawValues[i]!).lt(required[i]!))blocking.push(`„${element.label}“: Rohmaß ${['X','Y','Stärke'][i]} unterschreitet das Fertigmaß im lokalen Bauteilbezug.`);if(!element.stockItemId&&rawValues.some(value=>value===null))issue(`„${element.label}“: vorgesehenes Rohmaß oder konkrete Rohplatte und Zuschnittbezug sind noch offen.`);
      for (const edge of element.edgeTreatments) if (edge.edgeIndex >= contourEdges(element.finishedContour).length) blocking.push(`„${element.label}“: Kantenbearbeitung verweist auf unbekannte Kante.`);
      for (const id of element.machiningFeatureIds) { const feature = elements.get(id); if (feature?.kind !== 'machining' || feature.hostElementId !== element.id) blocking.push(`„${element.label}“: Bearbeitungsbezug ${id} ist widersprüchlich.`); }
    }
    if (element.kind === 'machining') {
      const host = elements.get(element.hostElementId);
      if (host?.kind !== 'stone_piece') blocking.push(`„${element.label}“: Bearbeitung braucht ein Natursteinbauteil.`);
      else {
        if(element.machiningType==='miter'){try{if(!element.miter)throw Error('Kantenbezug und ausdrücklicher Gehrungswinkel fehlen.');const expected=miterCut(snapshot,host,element.miter.edgeIndex,element.miter.angleDeg,element.face);if(JSON.stringify(expected.contour)!==JSON.stringify(element.contour))throw Error('Gehrungskontur entspricht nicht dem tatsächlichen Kanten-/Winkelbezug.');const required=measureValue(snapshot,element.minimumWebMeasureId);if(required!==null&&new D(expected.remainingWidthMm).lt(required))throw Error('Gehrung unterschreitet den ausdrücklich geforderten verbleibenden Bauteilquerschnitt.');}catch(error){blocking.push(`„${element.label}“: ${(error as Error).message}`);}}
        else if (!contourEdges(element.contour).every(edge => pointInContour(edge.from, host.finishedContour)) || contourEdges(element.contour).some(a => contourEdges(host.finishedContour).some(b => edgeIntersections(a, b).length))) blocking.push(`„${element.label}“: Ausschnitt/Bohrung liegt außerhalb oder auf der Außenkante des Bauteils.`);
        const depth = machiningDepth(snapshot,element), thickness = measureValue(snapshot, host.thicknessMeasureId);
        if(element.machiningType!=='cutout'&&element.machiningType!=='miter'&&(!element.depthMeasureId||depth===null))issue(`„${element.label}“: tatsächliche Bearbeitungstiefe ist noch offen.`);
        if (depth !== null && thickness !== null && element.machiningType !== 'cutout' && new D(depth).gt(thickness)) blocking.push(`„${element.label}“: Bearbeitungstiefe überschreitet die Materialstärke.`);
        const minimumWeb=measureValue(snapshot,element.minimumWebMeasureId),boundaries=contourRings(host.finishedContour);
        const peers=snapshot.elements.filter(e=>e.kind==='machining'&&e.hostElementId===host.id&&e.id!==element.id&&e.phase!=='demolition');
        for(const peer of peers)if(peer.kind==='machining'){
          if(edgeSetsIntersect(contourEdges(peer.contour),contourEdges(element.contour))||contourParts(peer.contour).some(p=>pointInContour(p.outer[0].from,element.contour))||contourParts(element.contour).some(p=>pointInContour(p.outer[0].from,peer.contour)))blocking.push(`„${element.label}“: Bearbeitung überdeckt „${peer.label}“.`);
          boundaries.push(...contourRings(peer.contour));
        }
        if(minimumWeb!==null&&element.machiningType!=='miter'){const boundaryError=D.max(host.finishedContour.importProvenance?.curveErrorBoundMm??0,...peers.flatMap(p=>p.kind==='machining'?[p.contour.importProvenance?.curveErrorBoundMm??0]:[])),gap=D.max(0,new D(edgeSetDistanceMm(contourEdges(element.contour),boundaries.flat())).minus(element.contour.importProvenance?.curveErrorBoundMm??0).minus(boundaryError));if(gap.lt(minimumWeb))blocking.push(`„${element.label}“: Reststeg ${gap.toFixed()} mm unterschreitet das ausdrücklich geforderte Maß ${minimumWeb} mm.`);}
      }
      positive(element, element.depthMeasureId); positive(element, element.minimumWebMeasureId,true);
      if(!element.minimumWebMeasureId)issue(`„${element.label}“: erforderlichen Mindestreststeg ausdrücklich festlegen; ein unbekannter Wert gilt nicht als null.`);
      if (element.machiningType === 'borehole' && !element.confirmedFasteningAssetVersionId) issue(`„${element.label}“: keine bestätigten Befestigungsdaten; keine Bohrschablone freigeben.`);
    }
    if (element.kind === 'catalog_object') {
      if(element.productVariantVersionId.startsWith('unassigned'))issue(`„${element.label}“: freies Hüllmodell ohne bestellbare Produktvariante.`);
      if(element.heightMeasureId)positive(element,element.heightMeasureId);
      if (element.accuracy === 'approximate'&&!(element.footprint.importProvenance?.review&&snapshot.assetManifest.some(a=>a.assetVersionId===element.assetVersionId&&a.geometryVerified&&a.rightsVerified))) issue(`„${element.label}“: Darstellung vereinfacht; Produktgeometrie nicht verifiziert.`);
      if (element.accuracy === 'verified_original') {
        const asset = snapshot.assetManifest.find(a => a.assetVersionId === element.assetVersionId);
        if (!asset?.geometryVerified || !asset.rightsVerified) blocking.push(`„${element.label}“: Originalgenauigkeit benötigt ein geometrisch und rechtlich geprüftes Asset.`);
      }
    }
    if (element.kind === 'inscription') {
      if(snapshot.elements.some(e=>e.kind==='slope'&&e.hostElementId===element.surfaceElementId&&e.phase!=='demolition'))issue('Inschrift auf geneigter Bezugsfläche: eigener vermessener orthogonaler Schriftframe erforderlich.');
      const surface = elements.get(element.surfaceElementId);
      if (!surface || !['stone_piece','surface'].includes(surface.kind)) blocking.push(`„${element.label}“: Beschriftungsfläche fehlt.`);
      if (element.phase === 'existing' && !element.locked) blocking.push(`„${element.label}“: Bestandsinschrift muss gesperrt bleiben.`);
      positive(element, element.requestedHeightMeasureId); positive(element, element.requestedLowercaseHeightMeasureId); positive(element, element.requestedMaxWidthMeasureId); positive(element, element.lineGapMeasureId, true);
      if (!element.exactText.trim()) issue(`„${element.label}“: wörtlicher Inschrifttext fehlt.`);
      if (element.fontVariantVersionId.startsWith('unselected')) issue(`„${element.label}“: konkrete Herstellerschrift auswählen.`);
      if (element.renderingBasis === 'shop_image_reference') warnings.push(`„${element.label}“: Herstellerbildreferenz, keine belegte Einzelzeichenbreite oder Bohrgeometrie. Lieferantensatz anfordern.`);
      else {
        const assets = element.glyphPlacements.map(g => snapshot.assetManifest.find(a => a.assetVersionId === g.glyphAssetVersionId));
        if (!element.glyphPlacements.length || assets.some(a => !a?.geometryVerified || !a.rightsVerified)) blocking.push(`„${element.label}“: verifizierte Glyphen benötigen freigegebene Originalkonturen/-modelle und Nutzungsrechte.`);
        const glyphText = element.glyphPlacements.map(g => g.codepointText).join('').replace(/\s/g, '');
        if (glyphText !== element.exactText.replace(/\s/g, '')) blocking.push(`„${element.label}“: Originalglyphen decken den wörtlichen Text nicht ab.`);
      }
      for (const id of element.referenceAssetVersionIds) if (!snapshot.assetManifest.some(a => a.assetVersionId === id)) blocking.push(`„${element.label}“: Bildreferenz ${id} fehlt im Revisionsmanifest.`);
      if (surface?.kind === 'stone_piece') {
        const limit = measureValue(snapshot, element.requestedMaxWidthMeasureId);
        const bounds = surface.finishedContour.outer.flatMap(e => [e.from, e.to]);
        const width = D.max(...bounds.map(p => new D(p.xMm))).minus(D.min(...bounds.map(p => new D(p.xMm))));
        if (limit !== null && new D(limit).gt(width)) issue(`„${element.label}“: angefragte maximale Schriftbreite überschreitet die Steinbreite.`);
      }
    }
    if (element.kind === 'dimension'){
      if(element.mode==='reference'&&measurements[element.measureId]?.semantic!=='derived')blocking.push(`„${element.label}“: Referenzmaß muss vom Kernel abgeleitet sein.`);
      positive(element,element.measureId);
      const nodes=element.refs.map(r=>elements.get(r.elementId));if(nodes.length===2&&nodes.every(n=>n?.kind==='node')){const value=measureValue(snapshot,element.measureId);if(value!==null&&new D(distance(worldPoint(snapshot,nodes[0]!.id),worldPoint(snapshot,nodes[1]!.id))).minus(value).abs().gt('0.01'))blocking.push(`„${element.label}“: Maß widerspricht den beiden Bezugsknoten.`);}
      for(const ref of element.refs){const host=elements.get(ref.elementId),value=measureValue(snapshot,element.measureId);if(host?.kind==='stone_piece'&&value!==null&&['width','height'].includes(ref.feature)){const bounds=contourBounds(host.finishedContour),actual=ref.feature==='width'?bounds.width:bounds.height;if(new D(actual).minus(value).abs().gt('0.01'))blocking.push(`„${element.label}“: bemaßtes ${ref.feature==='width'?'Breiten':'Höhen'}maß widerspricht der Fertigkontur.`);}}
    }
    if(element.kind==='connection'&&!element.specificationVersionId)issue(`„${element.label}“: fachliche Anschluss-/Ausführungsreferenz noch offen.`);
    if(element.kind==='clearance'&&!element.ruleVersionId)issue(`„${element.label}“: bestätigte Freiraum-/Einbauregel noch offen.`);
    if (element.kind === 'slope') { positive(element, element.riseMeasureId, true,true); positive(element, element.runMeasureId);const rise=measureValue(snapshot,element.riseMeasureId),run=measureValue(snapshot,element.runMeasureId);if(rise!==null&&new D(rise).minus(new D(element.end.zMm).minus(element.start.zMm)).abs().gt('0.01'))blocking.push('Gefälle '+element.label+': Höhenunterschied widerspricht den Bezugspunkten.');if(run!==null&&new D(run).minus(distance(element.start,element.end)).abs().gt('0.01'))blocking.push('Gefälle '+element.label+': Lauflänge widerspricht den Bezugspunkten.');if(snapshot.elements.filter(e=>e.kind==='slope'&&e.hostElementId===element.hostElementId&&e.phase!=='demolition').length>1)blocking.push('Mehrere Gefälleebenen brauchen getrennte Bezugsflächen.');const host=elements.get(element.hostElementId);if(host&&!['stone_piece','surface'].includes(host.kind))blocking.push('Gefälle benötigt eine konkrete Stein- oder Belagsfläche.'); if (!element.ruleVersionId) issue(`„${element.label}“: Gefälle ohne bestätigte Ausführungsregel.`); }
    if (element.kind === 'grave_border') { positive(element, element.widthMeasureId); positive(element, element.heightMeasureId); }
    if(element.kind==='plan_reference'){
      if(new Set(element.calibration.segments.map(s=>s.axis)).size!==element.calibration.segments.length)blocking.push('Quellplan: doppelte Kalibrierachse.');
      for(const segment of element.calibration.segments)for(const p of[segment.a,segment.b])if(new D(p.xPx).lt(0)||new D(p.yPx).lt(0)||new D(p.xPx).gt(element.widthPx)||new D(p.yPx).gt(element.heightPx))blocking.push('Quellplan: Kalibrierpunkt liegt außerhalb der eingefrorenen Rasterseite.');
      if(new D(element.calibration.toleranceMm).lt(0))blocking.push('Quellplan: Kontrolltoleranz darf nicht negativ sein.');
      warnings.push(`„${element.label}“: versionierte Quellenreferenz; Kalibrierung und erkannte Maße bleiben ungeprüfte Importdaten.`);
    }
    if (element.kind === 'technical_note' && element.category === 'approval_required') issue(`„${element.label}“: ${element.text}`);
  }
  const wallKeys = new Map<string, string>();
  for (const e of snapshot.elements) if (e.kind === 'wall') {
    const key = [e.startNodeId, e.endNodeId].sort().join('|');
    if (wallKeys.has(key)) blocking.push(`Gemeinsame Wand doppelt angelegt: „${wallKeys.get(key)}“ und „${e.label}“.`);
    wallKeys.set(key, e.label);
  }
  const occupiedSides=new Map<string,string>();
  for(const room of snapshot.elements)if(room.kind==='room'&&room.phase!=='demolition')for(const boundary of room.boundary){const key=boundary.wallId+':'+boundary.side,other=occupiedSides.get(key);if(other)blocking.push(`„${room.label}“ und „${other}“ nutzen dieselbe Wandseite. Eine gemeinsame Wand begrenzt benachbarte Räume auf gegenüberliegenden Seiten.`);else occupiedSides.set(key,room.label);}
  wallJoinConsistencyIssues(snapshot).forEach(issue);
  blocking.push(...validateConstraints(snapshot,issue));
  // Explicit clearance regions and door movement areas are part of the real model.
  for (const clearance of snapshot.elements.filter(e => e.kind === 'clearance')) {
    if (clearance.kind !== 'clearance') continue;
    const zone = worldFootprint(snapshot, clearance);
    if (!zone) continue;
    for (const candidate of snapshot.elements.filter(e => ['catalog_object','stone_piece'].includes(e.kind) && e.id !== clearance.hostElementId && e.phase !== 'demolition')) {
      const part = worldFootprint(snapshot, candidate);
      if (part && new D(contourAreaMm2(part)).abs().gt('0.01') && (contourEdges(part).some(e => pointInContour(e.from, zone)) || contourEdges(zone).some(e => pointInContour(e.from, part)) || contourEdges(part).some(a => contourEdges(zone).some(b => edgeIntersections(a,b).length)))) blocking.push(`Freizuhaltende Zone „${clearance.label}“ kollidiert mit „${candidate.label}“.`);
    }
  }
  for(const door of snapshot.elements){
    if(door.kind!=='opening'||door.phase==='demolition')continue;const swing=doorSwingContour(snapshot,door);if(!swing)continue;
    const wall=elements.get(door.wallId),sill=measureValue(snapshot,door.sillHeightMeasureId),height=measureValue(snapshot,door.heightMeasureId);if(wall?.kind!=='wall'||sill===null||height===null)continue;
    const base=Number(worldPoint(snapshot,wall.startNodeId).zMm)+Number(sill),top=base+Number(height);
    for(const candidate of snapshot.elements){
      if(!['catalog_object','stone_piece'].includes(candidate.kind)||candidate.phase==='demolition')continue;
      const footprint=worldFootprint(snapshot,candidate);if(!footprint||Number(contourAreaMm2(footprint))<.0001)continue;
      const planOverlap=edgeSetsIntersect(contourEdges(footprint),contourEdges(swing))||contourParts(footprint).some(part=>pointInContour(part.outer[0].from,swing))||swing.outer.some(edge=>pointInContour(edge.from,footprint));if(!planOverlap)continue;
      const t=candidate.kind==='stone_piece'?measureValue(snapshot,candidate.thicknessMeasureId):candidate.kind==='catalog_object'?measureValue(snapshot,candidate.heightMeasureId??null):null;
      if(t===null){issue(`Türschwenkbereich „${door.label}“: Höhenhülle von „${candidate.label}“ ist noch ungeklärt.`);continue;}
      const matrix=candidate.kind==='stone_piece'?surfaceMatrix(snapshot,candidate.id):worldMatrix(snapshot,candidate.id),localZ=candidate.kind==='stone_piece'?-Number(t):Number(t),source=candidate.kind==='stone_piece'?candidate.finishedContour:candidate.kind==='catalog_object'?candidate.footprint:null;if(!source)continue;
      const levels=contourParts(source).flatMap(part=>sampleRing(part.outer).flatMap(point=>[0,localZ].map(z=>Number(applyMatrix({...point,zMm:mm(z)},matrix).zMm)))),low=levels.reduce((a,b)=>Math.min(a,b),Infinity),high=levels.reduce((a,b)=>Math.max(a,b),-Infinity);if(high<=base+.005||low>=top-.005)continue;
      if(planOverlap)blocking.push(`Türschwenkbereich „${door.label}“ kollidiert mit „${candidate.label}“.`);
    }
  }
  if (snapshot.geometryEngineVersion !== GEOMETRY_ENGINE_VERSION) issue(`Plan verwendet ${snapshot.geometryEngineVersion}; technische Migration vor Freigabe prüfen.`);
  if (!snapshot.elements.some(e => ['stone_piece','room','surface','catalog_object'].includes(e.kind))) issue('Plan enthält noch kein Bauteil oder keinen Raum.');
  return { blocking: [...new Set(blocking)], warnings: [...new Set(warnings)] };
}
