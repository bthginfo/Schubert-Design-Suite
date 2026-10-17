import type { DesignSnapshot } from '@schubert/contracts';
import { D, decimalString, distance } from './precision.js';
import { contourAreaMm2, contourGrossAreaMm2, contourPerimeterMm,contourParts,contourEdges,withThroughCutouts } from './contours.js';
import { measureValue } from './model.js';
import { worldPoint } from './transforms.js';
import { roomContour, validateDesign } from './validation.js';
import{surfaceAreaMm2,surfaceEdgeLengthMm,surfaceSlope}from'./slope.js';
import{hostMachining,machiningDepth,machiningVolumeMm3,machiningNames,miterCut}from'./machining.js';
import{wallCoreMesh,wallLayerMeshes,wallMeshVolumeMm3}from'./walls.js';

export type BomLine = {
  id: string; elementId: string; label: string; category: string; quantity: string; unit: 'Stk' | 'm²' | 'm' | 'm³';
  materialSpecVersionId: string | null; productVariantVersionId: string | null;
  grossAreaM2: string | null; netAreaM2: string | null; edgeLengthM: string | null; thicknessMm: string | null; volumeM3: string | null;
  notes: string[]; inscription?: { exactText: string; fontVariantVersionId: string; supplyForm: string; requestedHeightMm: string | null;
    requestedMaxWidthMm: string | null; materialArticleReference: string | null; finishSpecVersionId: string | null;
    characters: Array<{ text: string; count: string; supplierProductVariantVersionId: string | null }> };
};
export type BomSnapshot = { revisionId: string; geometryEngineVersion: string; lines: BomLine[];
  totals: { pieces: string; stoneNetAreaM2: string; treatedEdgeLengthM: string; stoneVolumeM3: string; unresolvedVolumeCount: number };
  validation: ReturnType<typeof validateDesign> };
export function calculateBOM(snapshot: DesignSnapshot): BomSnapshot {
  const lines: BomLine[] = [];
  const base = (id: string, label: string, category: string): BomLine => ({ id: `bom:${id}`, elementId: id, label, category, quantity: '1', unit: 'Stk',
    materialSpecVersionId: null, productVariantVersionId: null, grossAreaM2: null, netAreaM2: null, edgeLengthM: null, thicknessMm: null, volumeM3: null, notes: [] });
  for (const element of snapshot.elements.filter(e => e.phase !== 'demolition')) {
    if (element.kind === 'stone_piece') {
      const gross = new D(surfaceAreaMm2(snapshot,element.id,element.finishedContour,true));
      const thickness=measureValue(snapshot,element.thicknessMeasureId),features=hostMachining(snapshot,element.id),cutouts=features.filter(f=>f.machiningType==='cutout'||f.machiningType!=='miter'&&thickness!==null&&machiningDepth(snapshot,f)!==null&&new D(machiningDepth(snapshot,f)!).gte(thickness));
      const net = new D(surfaceAreaMm2(snapshot,element.id,element.finishedContour)).minus(cutouts.reduce((sum, c) => c.kind === 'machining' ? sum.plus(surfaceAreaMm2(snapshot,element.id,c.contour)) : sum, new D(0)));
      const physicalParts=contourParts(withThroughCutouts(element.finishedContour,cutouts.map(c=>c.contour))).length,volume=machiningVolumeMm3(snapshot,element);
      const treated = element.edgeTreatments.reduce((sum, treatment) => {
        const edge = contourEdges(element.finishedContour)[treatment.edgeIndex];
        return edge ? sum.plus(surfaceEdgeLengthMm(snapshot,element.id,edge)) : sum;
      }, new D(0));
      lines.push({ ...base(element.id, element.label, 'Natursteinbauteil'), quantity:String(physicalParts),materialSpecVersionId: element.materialSpecVersionId,
        grossAreaM2: decimalString(gross.div(1000000)), netAreaM2: decimalString(net.div(1000000)),
        edgeLengthM: decimalString(treated.div(1000)), thicknessMm: thickness,
        volumeM3: volume===null?null:decimalString(new D(volume).div(1000000000)),
        notes: [...([element.roughWidthMeasureId,element.roughHeightMeasureId,element.roughThicknessMeasureId].some(Boolean)?[`Rohmaß: ${measureValue(snapshot,element.roughWidthMeasureId??null)??'offen'} × ${measureValue(snapshot,element.roughHeightMeasureId??null)??'offen'} × ${measureValue(snapshot,element.roughThicknessMeasureId??null)??'offen'} mm im lokalen Bauteilbezug; keine automatische Verschnitt-/Nestingregel.`]:[]),...(element.finishSpecVersionId?[`Oberflächenstand: ${element.finishSpecVersionId}`]:[]),'Netto = Fertigkontur abzüglich ausdrücklich modellierter Durchausschnitte. Kein pauschaler Verschnitt oder Gewicht angenommen.',
          `Umfang inkl. Ausschnitte: ${decimalString(new D(contourPerimeterMm(element.finishedContour)).div(1000))} m`,
          ...(surfaceSlope(snapshot,element.id)?['Gefälle: Außenkontur in horizontaler Projektion; wahre Fläche, Kantenlänge und Normalstärke aus der dokumentierten Ebene.']:[]),
          ...(features.length?['Volumen berücksichtigt ausdrücklich modellierte Durchbohrungen, Sacklöcher, Nuten und Gehrungskeile. Unbekannte Tiefen lassen das Volumen offen.']:[]),...(physicalParts>1?[`${physicalParts} getrennte Materialbestandteile; Flächen und Volumen dieser Zeile sind die Summe aller Teile.`]:[]),...(element.finishedContour.importProvenance?[`Konturimport ${element.finishedContour.importProvenance.format.toUpperCase()}; Fehlergrenze ${element.finishedContour.importProvenance.curveErrorBoundMm} mm; Quelle ${element.finishedContour.importProvenance.sourceContentHash}`]:[]),...(element.stockItemId ? [`Platte/Charge: ${element.stockItemId}`] : ['Konkrete Rohplatte/Charge offen.']),
          ...(element.grainDirectionDeg ? [`Maserungsrichtung: ${element.grainDirectionDeg}°`] : [])] });
    }
    if (element.kind === 'catalog_object') lines.push({ ...base(element.id, element.label, 'Katalogartikel'), productVariantVersionId: element.productVariantVersionId,
      notes: [element.accuracy === 'verified_original' ? 'Geprüftes Originalmodell' : 'Darstellung vereinfacht; technische Variante separat prüfen.'] });
    if (element.kind === 'inscription') {
      const counts = new Map<string, number>();
      for (const text of Array.from(element.exactText).filter(c => !/\s/.test(c))) counts.set(text, (counts.get(text) ?? 0) + 1);
      lines.push({ ...base(element.id, element.label, 'Inschrift'), quantity: element.supplyForm === 'individual_letters' ? String([...counts.values()].reduce((a,b) => a+b,0)) : '1',
        materialSpecVersionId: element.materialSpecVersionId,
        inscription: { exactText: element.exactText, fontVariantVersionId: element.fontVariantVersionId, supplyForm: element.supplyForm,
          requestedHeightMm: measureValue(snapshot, element.requestedHeightMeasureId), requestedMaxWidthMm: measureValue(snapshot, element.requestedMaxWidthMeasureId),
          materialArticleReference: element.materialArticleReference, finishSpecVersionId: element.finishSpecVersionId,
          characters: [...counts].map(([text,count]) => ({ text, count: String(count), supplierProductVariantVersionId: element.glyphPlacements.find(g => g.codepointText === text)?.supplierProductVariantVersionId ?? null })) },
        notes: element.renderingBasis === 'shop_image_reference' ? ['Herstellerbildreferenz. Zeichenbreiten und Bohrpunkte unbekannt; Lieferantensatz bestätigen lassen.'] : ['Originalglyphen nach Revisionsmanifest.'] });
    }
    if (element.kind === 'room') {
      const contour = roomContour(snapshot, element.id);
      if (!contour) continue;
      const area = decimalString(new D(contourAreaMm2(contour)).div(1000000));
      lines.push({ ...base(element.id, element.label, 'Raumfläche'), quantity: area, unit: 'm²', grossAreaM2: area, netAreaM2: area, edgeLengthM: decimalString(new D(contourPerimeterMm(contour)).div(1000)), notes: ['Raumgrenze aus gemeinsam referenzierten Wandachsen; lichte Maße separat bestätigen.'] });
      for (const layer of element.floorLayers) {
        const thickness = measureValue(snapshot, layer.thicknessMeasureId);
        lines.push({ ...base(`${element.id}:${layer.id}`, `${element.label} · Bodenschicht`, 'Schichtaufbau'), elementId: element.id,
          quantity: area, unit: 'm²', materialSpecVersionId: layer.materialSpecVersionId, productVariantVersionId: layer.productVariantVersionId,
          netAreaM2: area, grossAreaM2: area, thicknessMm: thickness, volumeM3: thickness === null ? null : decimalString(new D(area).times(thickness).div(1000)) });
      }
    }
    if (element.kind === 'wall') {
      const start = snapshot.elements.find(e => e.id === element.startNodeId), end = snapshot.elements.find(e => e.id === element.endNodeId);
      if (start?.kind !== 'node' || end?.kind !== 'node') continue;
      const length = distance(worldPoint(snapshot, start.id), worldPoint(snapshot, end.id)), height = measureValue(snapshot, element.heightMeasureId);
      const gross = height === null ? null : new D(length).times(height);
      const openingArea = snapshot.elements.filter(e => e.kind === 'opening' && e.wallId === element.id && e.openingType !== 'recess' && e.phase !== 'demolition').reduce((sum, opening) => {
        if (opening.kind !== 'opening') return sum;
        const w = measureValue(snapshot, opening.widthMeasureId), h = measureValue(snapshot, opening.heightMeasureId);
        return w !== null && h !== null ? sum.plus(new D(w).times(h)) : sum;
      }, new D(0));
      const coreMesh=wallCoreMesh(snapshot,element.id);lines.push({ ...base(element.id, element.label, 'Wand'), quantity: decimalString(new D(length).div(1000)), unit: 'm',
        grossAreaM2: gross === null ? null : decimalString(gross.div(1000000)), netAreaM2: gross === null ? null : decimalString(gross.minus(openingArea).div(1000000)),
        thicknessMm: measureValue(snapshot, element.coreThicknessMeasureId),volumeM3:coreMesh&&!coreMesh.unresolvedOpeningIds.length?decimalString(new D(wallMeshVolumeMm3(coreMesh)).div(1e9)):null, notes: ['Projektionsfläche je Wandseite; expliziter Abzug von Türen, Fenstern und Durchgängen. Keine erfundene Abrechnungsnorm.',element.joinStyle==='miter'?'Kernvolumen aus der ausdrücklich gewählten geschlossenen Anschlussgeometrie; Nischen nur mit tatsächlicher Tiefe abgezogen.':'Historischer Überlappungsanschluss am Knoten; kein automatischer Wechsel der Körpergeometrie.'] });
      const meshes=wallLayerMeshes(snapshot,element.id);for(const layer of element.layers){const mesh=meshes.find(m=>m.layerId===layer.id)?.mesh,volume=mesh&&!mesh.unresolvedOpeningIds.length?new D(wallMeshVolumeMm3(mesh)):null,t=measureValue(snapshot,layer.thicknessMeasureId),area=volume&&t&&new D(t).gt(0)?volume.div(t).div(1e6):null;lines.push({...base(`${element.id}:${layer.id}`,`${element.label} · Schicht`,'Schichtaufbau'),elementId:element.id,materialSpecVersionId:layer.materialSpecVersionId,productVariantVersionId:layer.productVariantVersionId,quantity:area?decimalString(area):'1',unit:area?'m²':'Stk',netAreaM2:area?decimalString(area):null,thicknessMm:t,volumeM3:volume?decimalString(volume.div(1e9)):null,notes:[`Wandseite ${layer.side}; Reihenfolge vom Kern nach außen.`,...(volume?['Tatsächliches Schichtvolumen einschließlich Anschluss und Öffnungen.']:['Stärke oder Lage im Schichtaufbau noch offen; die Position bezeichnet einen ungeklärten Schichtdatensatz, keine festgelegte Materialmenge.'])]});}
    }
    if (element.kind === 'surface') {
      const area = decimalString(new D(surfaceAreaMm2(snapshot,element.id,element.contour)).div(1000000));
      lines.push({ ...base(element.id, element.label, 'Belagsfläche'), quantity: area, unit: 'm²', grossAreaM2: decimalString(new D(surfaceAreaMm2(snapshot,element.id,element.contour,true)).div(1000000)), netAreaM2: area,
        notes: ['Kein Verschnitt-, Verpackungs- oder Fugenfaktor ohne ausdrücklich bestätigte Regel.'] });
      for (const layer of element.layers) { const thickness = measureValue(snapshot, layer.thicknessMeasureId); lines.push({ ...base(`${element.id}:${layer.id}`, `${element.label} · Schicht`, 'Schichtaufbau'), elementId: element.id, quantity: area, unit: 'm²', materialSpecVersionId: layer.materialSpecVersionId,
        productVariantVersionId: layer.productVariantVersionId, netAreaM2: area, thicknessMm: thickness, volumeM3: thickness === null ? null : decimalString(new D(area).times(thickness).div(1000)) }); }
    }
    if (element.kind === 'machining') lines.push({ ...base(element.id, element.label, 'Bearbeitung'), notes: [`${machiningNames[element.machiningType]} · ${element.face==='back'?'Rückseite':'Vorderseite'} · Tiefe ${machiningDepth(snapshot,element)??'offen'} mm · Konturfläche ${decimalString(new D(surfaceAreaMm2(snapshot,element.hostElementId,element.contour)).div(1000000))} m²`,...(element.miter?[`Kante ${element.miter.edgeIndex+1} · Gehrungswinkel zur Fläche ${element.miter.angleDeg}°; abgeleitete Kontur auf 0,01 mm quantisiert.`]:[]), ...(element.confirmedFasteningAssetVersionId ? [`Befestigungsdaten: ${element.confirmedFasteningAssetVersionId}`] : [])] });
    if(element.kind==='connection')lines.push({...base(element.id,element.label,'Anschlusspunkt'),notes:[`Art: ${{water:'Wasser',waste:'Abwasser',electric:'Elektro',fastening:'Befestigung',joint:'Fuge / Anschluss',other:'Anderer Anschluss'}[element.connectionType]} · Durchmesser ${measureValue(snapshot,element.diameterMeasureId)??'offen'} mm`,...(element.hostElementId?['Bezug: '+(snapshot.elements.find(e=>e.id===element.hostElementId)?.label??'fehlendes Element')]:[]),'Ein modellierter Prüf-/Anschlusspunkt; keine automatische Material-, Befestiger- oder Leitungsmenge.']});
    if(element.kind==='clearance')lines.push({...base(element.id,element.label,'Freiraumkontrolle'),notes:[`Freiraumkontur ${decimalString(new D(contourAreaMm2(element.contour)).div(1000000))} m² · Höhe ${measureValue(snapshot,element.heightMeasureId)??'offen'} mm`,'Der Prüfbereich ist keine abzurechnende Belagsfläche oder Materialmenge.']});
    if(element.kind==='slope'){const rise=measureValue(snapshot,element.riseMeasureId),run=measureValue(snapshot,element.runMeasureId);lines.push({...base(element.id,element.label,'Gefällevorgabe'),notes:[`Höhenunterschied ${rise??'offen'} mm · horizontale Länge ${run??'offen'} mm${rise!==null&&run!==null&&new D(run).gt(0)?' · '+decimalString(new D(rise).div(run).times(100))+' %':''}`,'Bezug: '+(snapshot.elements.find(e=>e.id===element.hostElementId)?.label??'fehlendes Element'),'Aus der ausdrücklich modellierten Ebene abgeleitet; keine automatische Gefälle- oder Abrechnungsnorm.']});}
    if (element.kind === 'grave_border') lines.push({ ...base(element.id, element.label, 'Grabeinfassung'), quantity: decimalString(new D(contourPerimeterMm(element.contour, false)).div(1000)), unit: 'm', materialSpecVersionId: element.materialSpecVersionId, notes: [`Breite: ${measureValue(snapshot, element.widthMeasureId) ?? 'offen'} mm · Höhe: ${measureValue(snapshot, element.heightMeasureId) ?? 'offen'} mm`] });
  }
  for(const line of lines){const element=snapshot.elements.find(e=>e.id===line.elementId);if(!element)continue;if(element.sourceEvidenceVersionIds.length)line.notes.push('Technische Quellen: '+element.sourceEvidenceVersionIds.join(', '));if(element.kind==='surface'){if(element.substrateVersionId)line.notes.push('Untergrund: '+element.substrateVersionId);if(element.ruleVersionId)line.notes.push('Ausführungsregel: '+element.ruleVersionId);if(element.movementJointElementIds.length)line.notes.push('Bewegungsfugen: '+element.movementJointElementIds.map(id=>snapshot.elements.find(e=>e.id===id)?.label??id).join(', ')+'; Lage und Ausführung gemäß zugeordneten Fachunterlagen.');}if((element.kind==='slope'||element.kind==='clearance')&&element.ruleVersionId)line.notes.push('Ausführungsregel: '+element.ruleVersionId);if(element.kind==='connection'&&element.specificationVersionId)line.notes.push('Ausführungsregel: '+element.specificationVersionId);}
  const stones = lines.filter(l => l.category === 'Natursteinbauteil');
  return { revisionId: snapshot.revisionId, geometryEngineVersion: snapshot.geometryEngineVersion, lines,
    totals: { pieces: stones.reduce((n,l)=>n.plus(l.quantity),new D(0)).toFixed(), stoneNetAreaM2: decimalString(stones.reduce((s,l) => s.plus(l.netAreaM2 ?? 0), new D(0))),
      treatedEdgeLengthM: decimalString(stones.reduce((s,l) => s.plus(l.edgeLengthM ?? 0), new D(0))), stoneVolumeM3: decimalString(stones.reduce((s,l) => s.plus(l.volumeM3 ?? 0), new D(0))),
      unresolvedVolumeCount: stones.filter(l => l.volumeM3 === null).length }, validation: validateDesign(snapshot) };
}
