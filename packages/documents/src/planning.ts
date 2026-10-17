import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {planningFontBase64}from'./planning-fonts.js';
import type { DesignSnapshot } from '@schubert/contracts';
import { calculateBOM, projectDesign, measureValue, validateDesign,contourParts, type DesignView, type ViewShape } from '@schubert/geometry';

export type PlanningPdfMeta = {
  title: string; revision: string; status: string; audience?: 'internal' | 'customer' | 'supplier';
  contentHash?: string; projectReference?: string; orderReference?: string; createdBy?: string; checkedBy?: string;
  generatedAt?: string; fontLabels?: Record<string,string>;
  fontReferences?: Record<string,{sourceUrl?:string; selectionRef?:string; materialArticleRef?:string}>;
  referenceImages?: Array<{fontVersionId:string;bytes:Uint8Array;mime:'image/png'|'image/jpeg';rightsVerified:boolean}>;
};
const ink=rgb(0.125,0.145,0.133),green=rgb(0.192,0.361,0.298),muted=rgb(0.32,0.35,0.33),line=rgb(0.82,0.85,0.82),warm=rgb(0.965,0.961,0.949);
const PT_PER_MM=72/25.4, A4:[number,number]=[595.28,841.89], A3:[number,number]=[1190.55,841.89];
/** Vector technical output; raster font references never become invented cutting or drilling contours. */
export async function createPlanningPdf(snapshot:DesignSnapshot,meta:PlanningPdfMeta):Promise<Uint8Array>{
  const statusLabels:Record<string,string>={draft:'Entwurf',approved:'Freigegeben',released:'Zur Fertigung freigegeben',archived:'Archiviert',under_review:'In Prüfung'},status=statusLabels[meta.status]??meta.status;
  const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
  pdf.setTitle(meta.title);pdf.setAuthor(meta.createdBy??'SCHUBERT');pdf.setSubject(`Planrevision ${meta.revision} · ${status}`);
  pdf.setProducer('SCHUBERT technische Planung · pdf-lib');pdf.setCreator(snapshot.geometryEngineVersion);
  const date=new Date(meta.generatedAt??'2000-01-01T00:00:00.000Z');pdf.setCreationDate(date);pdf.setModificationDate(date);
  const fonts:PDFFont[]=[];
  for(const font of planningFontBase64)fonts.push(await pdf.embedFont(Buffer.from(font,'base64'),{subset:true}));
  if(!fonts.length)fonts.push(await pdf.embedFont(StandardFonts.Helvetica));
  const sets=fonts.map(f=>new Set(f.getCharacterSet()));
  const fontFor=(c:string)=>Math.max(0,sets.findIndex(s=>s.has(c.codePointAt(0)!)));
  const printable=(text:string)=>Array.from(text).map(c=>c==='\n'?c:sets.some(s=>s.has(c.codePointAt(0)!))?c:`[U+${c.codePointAt(0)!.toString(16).toUpperCase()}]`).join('');
  const width=(text:string,size:number)=>Array.from(printable(text)).reduce((s,c)=>s+fonts[fontFor(c)].widthOfTextAtSize(c,size),0);
  const draw=(page:PDFPage,text:string,x:number,y:number,size=10,color=ink)=>{
    let at=x;let chunk='',fontIndex=-1;
    const flush=()=>{if(chunk){page.drawText(chunk,{x:at,y,size,font:fonts[fontIndex],color});at+=fonts[fontIndex].widthOfTextAtSize(chunk,size);chunk='';}};
    for(const c of Array.from(printable(text.replace(/\n/g,' ')))){const index=fontFor(c);if(index!==fontIndex){flush();fontIndex=index;}chunk+=c;}flush();
  };
  const wrap=(text:string,size:number,maxWidth:number):string[]=>{
    const rows:string[]=[];
    for(const paragraph of text.split('\n')){
      let row='';for(const word of paragraph.split(/\s+/)){if(row&&width(`${row} ${word}`,size)>maxWidth){rows.push(row);row='';}
        if(width(word,size)>maxWidth){for(const c of Array.from(word)){if(width(row+c,size)>maxWidth){rows.push(row);row='';}row+=c;}}else row+=(row?' ':'')+word;}
      rows.push(row);
    }return rows;
  };
  const label=(page:PDFPage,text:string,x:number,y:number,size:number,maxWidth:number,color=ink)=>{const rows=wrap(text,size,maxWidth);rows.forEach((r,i)=>draw(page,r,x,y-i*size*1.45,size,color));return rows.length*size*1.45;};
  const pages:Array<{page:PDFPage;scale:string;title:string}>=[];
  function newPage(title:string,size:[number,number]=A4,scale='—'){
    const page=pdf.addPage(size);pages.push({page,scale,title});const w=size[0],h=size[1];
    draw(page,'SCHUBERT',36,h-42,15,green);draw(page,'PLANUNGSSTUDIO',36,h-58,8,muted);
    draw(page,title,180,h-42,15);draw(page,meta.title,180,h-59,10,muted);
    page.drawLine({start:{x:36,y:h-75},end:{x:w-36,y:h-75},thickness:0.7,color:line});
    draw(page,`${status} · ${{internal:'Intern',customer:'Kunde',supplier:'Lieferant'}[meta.audience??'internal']} · Revision ${meta.revision}`,36,h-94,9,muted);
    return page;
  }
  function stroke(page:PDFPage,shape:ViewShape,scale:number,origin:{x:number;y:number},bounds:{minX:number;minY:number}){
    if(shape.points.length<2)return;
    const point=(p:{xMm:string;yMm:string})=>({x:origin.x+(Number(p.xMm)-bounds.minX)*PT_PER_MM/scale,y:origin.y+(Number(p.yMm)-bounds.minY)*PT_PER_MM/scale});
    for(const ring of [shape.points,...shape.holes])for(let i=0;i<ring.length-(shape.closed?0:1);i++){
      const a=point(ring[i]),b=point(ring[(i+1)%ring.length]);
      page.drawLine({start:a,end:b,thickness:shape.secondary?0.35:shape.kind==='opening'?1.3:0.65,color:shape.kind==='opening'?green:ink,
        ...(shape.secondary||shape.estimated||shape.kind==='clearance'?{dashArray:[4,3]}:{})});
    }
  }
  const names:Record<DesignView,string>={front:'Vorderansicht',side:'Seitenansicht',top:'Grundriss / Draufsicht'};
  for(const view of (snapshot.kind==='memorial'?['front','side','top']:['top','front','side']) as DesignView[]){
    const projected=projectDesign(snapshot,view),b=projected.bounds;
    const scale=[1,2,5,10,20,25,50,100,200,500,1000].find(s=>b.width*PT_PER_MM/s<950&&b.height*PT_PER_MM/s<540)??Math.ceil(Math.max(b.width/300,b.height/180)/10)*10;
    const page=newPage(names[view],A3,`1:${scale}`),drawWidth=b.width*PT_PER_MM/scale,drawHeight=b.height*PT_PER_MM/scale;
    const origin={x:Math.max(90,(A3[0]-drawWidth)/2),y:Math.max(155,(A3[1]-drawHeight)/2-15)};
    projected.shapes.forEach(s=>stroke(page,s,scale,origin,b));
    projected.texts.forEach((entry,index)=>{const x=origin.x+(Number(entry.point.xMm)-b.minX)*PT_PER_MM/scale,y=origin.y+(Number(entry.point.yMm)-b.minY)*PT_PER_MM/scale;page.drawCircle({x,y,size:6,borderColor:green,borderWidth:.6,color:rgb(1,1,1)});draw(page,String(index+1),x-2,y-3,8,green);});
    const x0=origin.x,x1=x0+drawWidth,y0=origin.y,y1=y0+drawHeight,offset=25;
    page.drawLine({start:{x:x0,y:y0-offset},end:{x:x1,y:y0-offset},thickness:.5,color:muted});
    for(const x of [x0,x1]){page.drawLine({start:{x,y:y0-5},end:{x,y:y0-offset-5},thickness:.4,color:muted});page.drawLine({start:{x:x-3,y:y0-offset-3},end:{x:x+3,y:y0-offset+3},thickness:.7,color:ink});}
    draw(page,`${b.width.toLocaleString('de-DE',{maximumFractionDigits:2})} mm · geometrisches Außenmaß`,x0+Math.max(0,(drawWidth-220)/2),y0-offset-15,9);
    page.drawLine({start:{x:x0-offset,y:y0},end:{x:x0-offset,y:y1},thickness:.5,color:muted});
    for(const y of [y0,y1])page.drawLine({start:{x:x0-offset-3,y:y-3},end:{x:x0-offset+3,y:y+3},thickness:.7,color:ink});
    draw(page,`${b.height.toLocaleString('de-DE',{maximumFractionDigits:2})} mm`,Math.max(37,x0-offset-55),y1+10,9);
    const barMm=scale*40/PT_PER_MM,barX=45,barY=105;
    page.drawLine({start:{x:barX,y:barY},end:{x:barX+40,y:barY},thickness:2,color:ink});
    for(const x of [barX,barX+40])page.drawLine({start:{x,y:barY-4},end:{x,y:barY+4},thickness:1,color:ink});
    draw(page,`${barMm.toLocaleString('de-DE',{maximumFractionDigits:2})} mm · Maßstab 1:${scale}`,barX,barY-18,9);
    label(page,'Maßhaltige Bauteilgeometrie. Schrift wird hier nicht durch ähnliche Zeichensätze ersetzt. Wörtlicher Text und Herstellerreferenz stehen im Inschriftenplan. Speicherpräzision 0,01 mm ist keine Fertigungstoleranz.',310,110,10,800);
    label(page,`Höhenbezug: ${snapshot.frames.map(f=>f.datumLabel).join(' · ')}`,45,70,9,A3[0]-90,muted);
  }
  let page=newPage('Stück- und Bearbeitungsliste'),y=A4[1]-125;
  const bom=calculateBOM(snapshot);
  const tableHead=()=>{page.drawRectangle({x:36,y:y-24,width:A4[0]-72,height:24,color:warm});draw(page,'BAUTEIL / AUSFÜHRUNG',44,y-16,9,green);draw(page,'MENGE',389,y-16,9,green);draw(page,'EINHEIT',460,y-16,9,green);y-=42;};
  tableHead();
  for(const item of bom.lines){
    const detail=[item.category,...(item.materialSpecVersionId?[`Materialstand: ${item.materialSpecVersionId.startsWith('unassigned:')?'noch nicht zugeordnet':item.materialSpecVersionId}`]:[]),...(item.thicknessMm!==null?[`Stärke ${item.thicknessMm} mm`]:[]),...(item.netAreaM2!==null?[`Netto ${item.netAreaM2} m²`]:[]),...(item.volumeM3!==null?[`Volumen ${item.volumeM3} m³`]:[]),...(item.edgeLengthM!==null?[`Bearbeitete Kante ${item.edgeLengthM} m`]:[]),...(['Bearbeitung','Anschlusspunkt','Freiraumkontrolle','Gef\u00e4llevorgabe'].includes(item.category)?item.notes:item.notes.filter(note=>/^(Rohma\u00df:|Oberfl\u00e4chenstand:|Untergrund:|Ausf\u00fchrungsregel:|Bewegungsfugen:|Technische Quellen:)/.test(note)))].join(' · ');
    const rows=wrap(detail,9,325),labels=wrap(item.label,11,325),height=16+labels.length*15+rows.length*13;
    if(y-height<75){page=newPage('Stück- und Bearbeitungsliste · Fortsetzung');y=A4[1]-125;tableHead();}
    labels.forEach((row,i)=>draw(page,row,44,y-i*15,11));draw(page,item.quantity,389,y,10);draw(page,item.unit,460,y,10);
    rows.forEach((row,i)=>draw(page,row,44,y-labels.length*15-3-i*13,9,muted));
    y-=height;page.drawLine({start:{x:36,y:y+7},end:{x:A4[0]-36,y:y+7},thickness:.4,color:line});
  }
  if(y<135){page=newPage('Mengengrundlage');y=A4[1]-125;}
  label(page,'Mengen entstehen aus dieser Revision. Kein pauschaler Verschnitt, keine erfundenen Einkaufsdaten, keine Gewichtsannahme ohne belegte Materialdichte. Modellierte Ausschnitte werden explizit abgezogen. Flächenregeln für die Abrechnung separat fachlich bestätigen.',36,y-10,10,A4[0]-72);
  for(const inscription of snapshot.elements.filter(e=>e.kind==='inscription')){
    if(inscription.kind!=='inscription')continue;
    page=newPage(`Inschriftenplan · ${inscription.label}`);y=A4[1]-130;
    draw(page,'WÖRTLICHE PRÜFANSICHT',36,y,10,green);y-=32;
    for(const row of wrap(inscription.exactText,16,A4[0]-90)){
      if(y<100){page=newPage(`Inschrift · ${inscription.label} · Fortsetzung`);y=A4[1]-125;}
      draw(page,row,45,y,16);y-=26;
    }
    y-=20;
    const ref=meta.fontReferences?.[inscription.fontVariantVersionId];
    const specifications=[`Herstellerschrift: ${meta.fontLabels?.[inscription.fontVariantVersionId]??inscription.fontVariantVersionId}`,
      `Lieferform: ${{individual_letters:'Einzelbuchstaben',wording:'Schriftzug',engraved:'graviert',other:'andere'}[inscription.supplyForm]}`,
      `Gewünschte Zeichenhöhe: ${measureValue(snapshot,inscription.requestedHeightMeasureId)??'offen'} mm`,
      `Kleinbuchstabenhöhe: ${measureValue(snapshot,inscription.requestedLowercaseHeightMeasureId)??'nicht festgelegt'} mm`,
      `Verbindliche maximale Schriftbreite: ${measureValue(snapshot,inscription.requestedMaxWidthMeasureId)??'offen'} mm`,
      `Zeilenabstand: ${measureValue(snapshot,inscription.lineGapMeasureId)??'offen'} mm`,
      `Ursprung auf der Beschriftungsfläche (unten links): u ${inscription.originUV.uMm} / v ${inscription.originUV.vMm} mm`,
      `Drehung ${inscription.rotationDeg}° · Ausrichtung ${inscription.alignment}`,
      `Materialartikelreferenz: ${inscription.materialArticleReference??ref?.materialArticleRef??'offen'} · Auswahl ${ref?.selectionRef??'siehe eingefrorene Schriftversion'}`,
      inscription.renderingBasis==='shop_image_reference'?'GENAUIGKEIT: Herstellerbildreferenz. Keine bestätigten Einzelzeichenkonturen, Satzbreiten oder Bohrpunkte. Der Lieferant erstellt/bestätigt den Satz.':'Originalkonturen/-modelle gemäß eingefrorenem Revisionsmanifest.',
      ...(ref?.sourceUrl?[`Herstellerquelle: ${ref.sourceUrl}`]:[])];
    for(const spec of specifications){const h=wrap(spec,10,A4[0]-72).length*15+9;if(y-h<75){page=newPage(`Inschriftspezifikation · ${inscription.label}`);y=A4[1]-125;}y-=label(page,spec,36,y,10,A4[0]-72)+9;}
    const inscriptionBom=bom.lines.find(l=>l.elementId===inscription.id)?.inscription;
    if(inscription.supplyForm==='individual_letters'&&inscriptionBom){
      const content=inscriptionBom.characters.map(c=>`${c.text}: ${c.count} ×${c.supplierProductVariantVersionId?' · Artikelstand '+c.supplierProductVariantVersionId:''}`).join('   ·   ');
      const h=wrap(content,10,A4[0]-72).length*15+45;if(y-h<75){page=newPage(`Zeichenstückliste · ${inscription.label}`);y=A4[1]-125;}
      draw(page,'Zeichenstückliste aus dem unveränderten Wortlaut',36,y,10,green);y-=24;y-=label(page,content,36,y,10,A4[0]-72)+12;
      y-=label(page,'Fehlende Einzelartikel / Glyphen bestätigt der Hersteller. Diese Zählung behauptet keine Kontur-, Satzbreiten- oder Befestigungsgenauigkeit.',36,y,9,A4[0]-72,muted)+12;
    }
    const image=meta.referenceImages?.find(i=>i.fontVersionId===inscription.fontVariantVersionId&&i.rightsVerified);
    if(image){const embedded=image.mime==='image/png'?await pdf.embedPng(image.bytes):await pdf.embedJpg(image.bytes);const dimensions=embedded.scaleToFit(A4[0]-90,100);
      if(y-dimensions.height<90){page=newPage(`Herstellerbildreferenz · ${inscription.label}`);y=A4[1]-125;}draw(page,'Originalreferenz · keine maßhaltige Fertigungskontur',36,y,9,muted);y-=20+dimensions.height;page.drawImage(embedded,{x:45,y,width:dimensions.width,height:dimensions.height});}
  }
  for(const reference of snapshot.elements)if(reference.kind==='plan_reference'){
    page=newPage(`Quellenbezug · ${reference.label}`);y=A4[1]-130;
    const details=[`Originalversion: ${reference.sourceDocumentVersionId}`,`Original-SHA-256: ${reference.sourceHash}`,`Seite ${reference.pageIndex+1} · Quelle ${reference.sourceKind} · ${reference.widthPx} × ${reference.heightPx} Rasterpixel`,`Vorschauversion: ${reference.previewDocumentVersionId??'nicht erzeugt'}`,`Vorschau-SHA-256: ${reference.previewHash??'offen'}`,'QUELLENREFERENZ / IMPORTVORSCHLAG: Diese Kalibrierung bestätigt kein Aufmaß. Perspektivische Fotos sind ohne belegte Projektion kein maßhaltiger Grundriss.',`Kontrolltoleranz: ${reference.calibration.toleranceMm} mm; keine Fertigungstoleranz.`,...reference.calibration.segments.map(s=>`${s.axis.toUpperCase()}: (${s.a.xPx}, ${s.a.yPx}) bis (${s.b.xPx}, ${s.b.yPx}) px · abgelesen ${measureValue(snapshot,s.lengthMeasureId)??'offen'} mm · ungeprüft`)];
    for(const detail of details){const h=wrap(detail,10,A4[0]-72).length*15+10;if(y-h<75){page=newPage(`Quellenbezug · ${reference.label} · Fortsetzung`);y=A4[1]-125;}y-=label(page,detail,36,y,10,A4[0]-72)+10;}
  }
  for(const element of snapshot.elements){const contour=element.kind==='stone_piece'?element.finishedContour:element.kind==='catalog_object'?element.footprint:'contour'in element?element.contour:null,source=contour?.importProvenance;if(!contour||!source)continue;page=newPage(`Konturquelle · ${element.label}`);y=A4[1]-130;const details=[`${source.format.toUpperCase()} · ${contourParts(contour).length} getrennte Bestandteile · ${contourParts(contour).reduce((n,p)=>n+p.holes.length,0)} Innenkonturen`,`Originalversion: ${source.sourceDocumentVersionId??'nur lokaler Entwurf'}`,`Original-SHA-256: ${source.sourceContentHash}`,`Parser: ${source.parserVersion} · ausdrücklich bestätigte Quelleinheit ${source.sourceUnit}; Zielkoordinaten in mm`,...(source.sourcePlaneZMm?[`Originale Z-Ebene: ${source.sourcePlaneZMm} mm; lokale XY-Kontur ohne Bestätigung einer Einbauhöhe.`]:[]),`${source.approximated?'Kontrollierte Kurvennäherung':'Analytische Geraden/Kreisbögen'} · maximal ${source.curveErrorBoundMm} mm Importfehler einschließlich 0,01-mm-Koordinatenquantisierung. Keine Fertigungstoleranz.`,...(source.review?[`Fachprüfung ${source.review.confirmedAt}; akzeptierter Fehler ${source.review.acceptedErrorMm} mm.`,`Versioniertes Prüfprotokoll: ${source.review.evidenceVersionId}`,source.review.statement]:['FACHLICH UNGEPRÜFTER IMPORTVORSCHLAG. Vor Verwendung zur Fertigung Quelle, Konturrollen, Fehlergrenze und Eignung mit eigenem versioniertem Prüfprotokoll bestätigen.']),'Nutzungsrechte, Materialeignung und Freigabe dieser Gesamtplanrevision werden separat nachgewiesen.'];for(const detail of details){const h=wrap(detail,10,A4[0]-72).length*15+10;if(y-h<75){page=newPage(`Konturquelle · ${element.label} · Fortsetzung`);y=A4[1]-125;}y-=label(page,detail,36,y,10,A4[0]-72)+10;}}
  const checks=validateDesign(snapshot,{forRelease:true});
  page=newPage('Prüfstand und offene Angaben');y=A4[1]-130;
  const notices=[...checks.blocking,...checks.warnings];
  if(!notices.length)notices.push('Geometrieprüfung bestanden. Fachliche Freigaben, Genehmigung und passendes Fertigungspaket werden separat nachgewiesen.');
  notices.push('Geometrieprüfung ersetzt keine Prüfung von Standsicherheit, Verankerung, Abdichtung, Materialeignung, Lasten oder Friedhofsvorgaben.');
  if((meta.audience??'internal')!=='internal')notices.push('Diese Fassung enthält keine internen Preise, Kalkulationen oder Personalangaben.');
  for(const notice of [...new Set(notices)]){const rows=wrap(notice,10,A4[0]-89);if(y-rows.length*15<78){page=newPage('Prüfstand · Fortsetzung');y=A4[1]-125;}draw(page,'•',37,y,11,green);y-=label(page,notice,52,y,10,A4[0]-89)+12;}
  const unsupported=[...new Set(snapshot.elements.filter(e=>e.kind==='inscription').flatMap(e=>e.kind==='inscription'?Array.from(e.exactText).filter(c=>c!=='\n'&&!sets.some(s=>s.has(c.codePointAt(0)!))):[]))];
  if(unsupported.length){if(y<160){page=newPage('Zeichensatzprüfung');y=A4[1]-125;}label(page,`Nicht im eingebetteten Leseschriftbestand: ${unsupported.map(c=>'U+'+c.codePointAt(0)!.toString(16).toUpperCase()).join(', ')}. In der Prüfansicht stehen dafür ausdrücklich Codepoints; diese Ausgabe ist bis zur Bereitstellung geeigneter lizenzierter Schriftdateien nicht als wörtliche Freigabe verwendbar.`,36,y,10,A4[0]-72);}
  pages.forEach(({page,scale},index)=>{const {width:w}=page.getSize();page.drawLine({start:{x:36,y:48},end:{x:w-36,y:48},thickness:.6,color:line});draw(page,`Revision ${meta.revision} · ${status} · mm · Maßstab ${scale}`,36,32,8,muted);draw(page,`${index+1} / ${pages.length}`,w-70,32,8,muted);if(meta.contentHash)draw(page,`Modellhash ${meta.contentHash}`,36,18,6,muted);});
  return pdf.save();
}
