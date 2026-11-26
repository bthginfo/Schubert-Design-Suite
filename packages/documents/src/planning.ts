import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {planningFontBase64}from'./planning-fonts.js';
import { inscriptionPreviewDefaults, type DesignSnapshot, type InscriptionElement } from '@schubert/contracts';
import { placeSheetLabels, type PlacedSheetLabel, type SheetBox, type SheetLabel, type SheetLine } from './planning-dimensions.js';
import { glyphOutline, loadPreviewFont, previewFontLabel, type PreviewFont } from './planning-lettering.js';
import { applyMatrix, calculateBOM, mm, projectDesign, projectDimensions, withoutRepeatedWallAxes, projectPoint, dimensionTextAnchor, layoutDimension, measureValue, surfaceMatrix, validateDesign,contourParts, type DesignView, type ViewShape } from '@schubert/geometry';

export type PlanningPdfMeta = {
  title: string; revision: string; status: string; audience?: 'internal' | 'customer' | 'supplier';
  contentHash?: string; projectReference?: string; orderReference?: string; createdBy?: string; checkedBy?: string;
  materials?: Record<string,{name:string;revision?:number;sourceUrl?:string;checkedOn?:string;sourceCatalog?:string}>;
  generatedAt?: string; fontLabels?: Record<string,string>;
  fontReferences?: Record<string,{sourceUrl?:string; selectionRef?:string; materialArticleRef?:string}>;
  referenceImages?: Array<{fontVersionId:string;bytes:Uint8Array;mime:'image/png'|'image/jpeg';rightsVerified:boolean}>;
};
const ink=rgb(0.125,0.145,0.133),green=rgb(0.192,0.361,0.298),muted=rgb(0.32,0.35,0.33),line=rgb(0.82,0.85,0.82),warm=rgb(0.965,0.961,0.949);
const PT_PER_MM=72/25.4, A4:[number,number]=[595.28,841.89], A3:[number,number]=[1190.55,841.89];
type ReviewOutline = { path: string; erase: boolean; dashed: boolean; opening: boolean; secondary: boolean };
export type PlanningPdfReview = {
  revision: string;
  views: Array<{
    id: DesignView; title: string; width: number; height: number; scale: number;
    outlines: ReviewOutline[]; lines: SheetLine[]; ticks: SheetLine[];
    markers: Array<{ x: number; y: number; index: number }>; labels: PlacedSheetLabel[];
  }>;
};

/** Vector output; raster references never become manufacturing contours. */
export function createPlanningPdf(snapshot: DesignSnapshot, meta: PlanningPdfMeta) {
  return buildPlanningOutput(snapshot, meta, false);
}

export function reviewPlanningPdf(snapshot: DesignSnapshot, meta: PlanningPdfMeta) {
  return buildPlanningOutput(snapshot, meta, true);
}

function buildPlanningOutput(snapshot: DesignSnapshot, meta: PlanningPdfMeta, inspect: true): Promise<PlanningPdfReview>;
function buildPlanningOutput(snapshot: DesignSnapshot, meta: PlanningPdfMeta, inspect: false): Promise<Uint8Array>;
async function buildPlanningOutput(snapshot: DesignSnapshot, meta: PlanningPdfMeta, inspect: boolean) {
  const review: PlanningPdfReview = {revision: meta.revision, views: []};
  let labelsForReview = 0;
  const statusLabels:Record<string,string>={draft:'Entwurf',approved:'Freigegeben',released:'Zur Fertigung freigegeben',archived:'Archiviert',under_review:'In Prüfung'};
  // The customer variant („Kundenansicht“) is a presentation for agreement: no internal
  // check list, no parts list, no supplier or source provenance.
  const audience=meta.audience??'internal',customer=audience==='customer';
  const status=customer?'Entwurf zur Abstimmung':statusLabels[meta.status]??meta.status;
  const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
  pdf.setTitle(customer?`Entwurf zur Abstimmung · ${meta.title}`:meta.title);pdf.setAuthor(meta.createdBy??'SCHUBERT');pdf.setSubject(`Planrevision ${meta.revision} · ${status}`);
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
  const bom=calculateBOM(snapshot);
  // Material names for the title block, from the frozen material versions of this revision.
  const materialIds=[...new Set(bom.lines.map(line=>line.materialSpecVersionId).filter((id):id is string=>!!id))];
  const materialNames=[...new Set(materialIds.map(id=>meta.materials?.[id]?.name).filter((name):name is string=>!!name))];
  const materialName=(id:string|null|undefined)=>id?meta.materials?.[id]?.name??null:null;
  const parts=snapshot.elements.filter(e=>e.phase!=='demolition'&&(e.kind==='stone_piece'||e.kind==='grave_border')).map(e=>({label:e.label,name:'materialSpecVersionId'in e?materialName(e.materialSpecVersionId):null}));
  // One material for everything reads as its name; differing parts are named („Stele: …, Sockel: noch offen“).
  const materialText=parts.length&&parts.length<=4&&new Set(parts.map(part=>part.name)).size>1?parts.map(part=>`${part.label}: ${part.name??'noch offen'}`).join(' · ')
    :materialNames.length?materialNames.join(' · ')+(materialIds.some(id=>!meta.materials?.[id])?' · weitere noch offen':''):materialIds.length?'noch nicht festgelegt':'—';
  // Inscriptions in their chosen preview font (only the licensed original file, see planning-lettering).
  const inscriptions=snapshot.elements.filter((e):e is InscriptionElement=>e.kind==='inscription');
  const visibleInscriptions=inscriptions.filter(e=>e.phase!=='demolition');
  const previewFonts=new Map<string,PreviewFont|null>();
  for(const e of inscriptions){const key=e.previewFontKey??inscriptionPreviewDefaults.fontKey;if(!previewFonts.has(key))previewFonts.set(key,await loadPreviewFont(key));}
  const fontKey=(e:InscriptionElement)=>e.previewFontKey??inscriptionPreviewDefaults.fontKey;
  const fontText=[...new Set(visibleInscriptions.map(e=>previewFonts.get(fontKey(e))?.label??previewFontLabel(fontKey(e))))].join(' · ')||'—';
  const hexColor=(hex:string)=>{const v=/^#([0-9a-f]{6})$/i.exec(hex)?.[1]??'c6a56d';return rgb(parseInt(v.slice(0,2),16)/255,parseInt(v.slice(2,4),16)/255,parseInt(v.slice(4,6),16)/255);};
  /** Studio lettering layout in millimetres: cap height, line advance and max-width compression. */
  function lettering(e:InscriptionElement){
    const preview=previewFonts.get(fontKey(e))??null,metrics=preview??{capRatio:.727,ascender:.969,descender:.242};
    const height=Number(measureValue(snapshot,e.requestedHeightMeasureId)??40),gap=Number(measureValue(snapshot,e.lineGapMeasureId)??height*.35),maxWidth=Number(measureValue(snapshot,e.requestedMaxWidthMeasureId)??0);
    const fontSize=Math.max(.01,height)/metrics.capRatio,advance=Math.max(height,fontSize*(metrics.capRatio+metrics.descender))+Math.max(0,gap);
    const lines=e.exactText.split(/\r?\n/),natural=lines.map(line=>preview?glyphOutline(preview,line,fontSize).width:width(line,fontSize));
    const scale=maxWidth>0?Math.min(1,maxWidth/Math.max(1,...natural)):1;
    return{preview,metrics,fontSize,scale,rows:lines.map((text,index)=>({text,baseline:(lines.length-1-index)*advance,width:natural[index]*scale}))};
  }
  /** Schriftfeld on every drawing sheet: project, material, lettering, revision. */
  function titleBlock(page:PDFPage,scale:string){
    const {width:w}=page.getSize(),x=w-336,top=134;
    const rows=([['Projekt',meta.title],['Material',materialText],...(visibleInscriptions.length?[['Schrift',fontText]]:[]),['Stand',`Revision ${meta.revision} · ${status}`],['Maßstab',`${scale} · Maße in mm`]] as Array<[string,string]>)
      .map(([name,value])=>{const lines=wrap(value,8.5,222),shown=lines.slice(0,name==='Material'?2:1);if(lines.length>shown.length)shown[shown.length-1]+=' …';return{name,lines:shown};});
    const height=rows.reduce((sum,row)=>sum+row.lines.length*10+3,0)+4;page.drawRectangle({x,y:top-height,width:300,height,borderColor:line,borderWidth:.7,color:rgb(1,1,1)});
    let y=top-10;rows.forEach((row,index)=>{if(index)page.drawLine({start:{x,y:y+9},end:{x:x+300,y:y+9},thickness:.4,color:line});draw(page,row.name.toUpperCase(),x+8,y,6.5,green);row.lines.forEach((text,i)=>draw(page,text,x+70,y-i*10,8.5));y-=row.lines.length*10+3;});
  }
  const pages:Array<{page:PDFPage;scale:string;title:string}>=[];
  function newPage(title:string,size:[number,number]=A4,scale='—'){
    const page=pdf.addPage(size);pages.push({page,scale,title});const w=size[0],h=size[1];
    draw(page,'SCHUBERT',36,h-42,15,green);draw(page,'PLANUNGSSTUDIO',36,h-58,8,muted);
    draw(page,title,180,h-42,15);const shortTitle=wrap(meta.title,10,w-216)[0]??'';draw(page,shortTitle+(shortTitle.length<meta.title.length?' …':''),180,h-59,10,muted);
    page.drawLine({start:{x:36,y:h-75},end:{x:w-36,y:h-75},thickness:0.7,color:line});
    draw(page,customer?`${status} · Revision ${meta.revision}`:`${status} · ${{internal:'Intern',customer:'Kunde',supplier:'Lieferant'}[audience]} · Revision ${meta.revision}`,36,h-94,9,muted);
    return page;
  }
  function stroke(
    page: PDFPage, shape: ViewShape, point: (x: number, y: number) => { x: number; y: number },
    outlines: ReviewOutline[], obstacles: SheetLine[],
  ) {
    if (shape.points.length < 2) return;
    const parts = (shape.erase ? [shape.points] : [shape.points, ...shape.holes])
      .map(ring => ring.map(p => point(Number(p.xMm), Number(p.yMm))));
    const dashed = Boolean(shape.secondary || shape.estimated || shape.kind === 'clearance');
    const opening = shape.kind === 'opening';
    const path = (ring: { x: number; y: number }[], invert = false) =>
      ring.map((p, i) => (i ? 'L' : 'M') + p.x + ' ' + (invert ? -p.y : p.y)).join(' ') + (shape.closed || shape.erase ? ' Z' : '');
    if (inspect) outlines.push({
      path: parts.map(part => path(part)).join(' '), erase: Boolean(shape.erase),
      dashed, opening, secondary: Boolean(shape.secondary),
    });
    if (shape.erase) {
      page.drawSvgPath(path(parts[0], true), { color: rgb(1,1,1), borderColor: rgb(1,1,1), borderWidth: 1.4 });
      return;
    }
    for (const part of parts) {
      for (let i = 0; i < part.length - (shape.closed ? 0 : 1); i++) {
        const segment = { start: part[i], end: part[(i+1) % part.length] };
        obstacles.push(segment);
        page.drawLine({ ...segment, thickness: shape.secondary ? .35 : opening ? 1.3 : .65,
          color: opening ? green : ink, ...(dashed ? { dashArray: [4,3] } : {}) });
      }
    }
  }
  const names:Record<DesignView,string>={front:'Vorderansicht',side:'Seitenansicht',top:'Grundriss / Draufsicht'};
  for(const view of (snapshot.kind==='memorial'?['front','side','top']:['top','front','side']) as DesignView[]){
    const projected=projectDesign(snapshot,view),b=projected.bounds;
    const scale=[1,2,5,10,20,25,50,100,200,500,1000].find(s=>b.width*PT_PER_MM/s<950&&b.height*PT_PER_MM/s<480)??Math.ceil(Math.max(b.width/300,b.height/160)/10)*10;
    const page=newPage(names[view],A3,`1:${scale}`),drawWidth=b.width*PT_PER_MM/scale,drawHeight=b.height*PT_PER_MM/scale;
    const origin={x:Math.max(90,(A3[0]-drawWidth)/2),y:Math.max(200,(A3[1]-drawHeight)/2-15)};
    const factor = PT_PER_MM / scale;
    const p = (x: number, y: number) => ({ x: origin.x + (x-b.minX)*factor, y: origin.y + (y-b.minY)*factor });
    const outlines: ReviewOutline[] = [];
    const obstacles: SheetLine[] = [], guides: SheetLine[] = [], ticks: SheetLine[] = [];
    const dimensionLabels: SheetLabel[] = [];
    projected.shapes.forEach(shape => stroke(page, shape, p, outlines, obstacles));
    // Inscriptions appear in the chosen preview font wherever the view shows their surface
    // true to scale and unmirrored (front view of an upright stone, top view of a slab).
    const letteringBoxes: SheetBox[] = [], drawnInscriptions = new Set<string>();
    for (const e of visibleInscriptions) {
      const layout = lettering(e), m = surfaceMatrix(snapshot, e.surfaceElementId), angle = Number(e.rotationDeg) * Math.PI / 180;
      const u0 = Number(e.originUV.uMm), v0 = Number(e.originUV.vMm), c = Math.cos(angle), s = Math.sin(angle);
      const at = (x: number, y: number) => { const q = projectPoint(applyMatrix({xMm: mm(u0 + x*c - y*s), yMm: mm(v0 + x*s + y*c), zMm: '0'}, m), view); return p(Number(q.xMm), Number(q.yMm)); };
      let o: {x:number;y:number}, ax: {x:number;y:number}, ay: {x:number;y:number};
      try { o = at(0,0); const ex = at(1000,0), ey = at(0,1000); ax = {x:(ex.x-o.x)/1000, y:(ex.y-o.y)/1000}; ay = {x:(ey.x-o.x)/1000, y:(ey.y-o.y)/1000}; } catch { continue; }
      if (Math.abs(Math.hypot(ax.x,ax.y) - factor) > factor*.01 || Math.abs(Math.hypot(ay.x,ay.y) - factor) > factor*.01 || ax.x*ay.y - ax.y*ay.x <= 0) continue;
      const rotation = Math.atan2(ax.y, ax.x) * 180 / Math.PI, color = hexColor(e.previewColor ?? inscriptionPreviewDefaults.color);
      for (const row of layout.rows) {
        if (!row.text.trim()) continue;
        const startU = e.alignment === 'center' ? -row.width/2 : e.alignment === 'right' ? -row.width : 0, origin = at(startU, row.baseline);
        if (layout.preview) page.drawSvgPath(glyphOutline(layout.preview, row.text, layout.fontSize, layout.scale).d, {x: origin.x, y: origin.y, scale: factor, rotate: degrees(rotation), color});
        else if (Math.abs(rotation) < .5) draw(page, row.text, origin.x, origin.y, layout.fontSize * factor, color);
        else continue;
        const corners = [[startU, row.baseline - layout.fontSize*layout.metrics.descender], [startU + row.width, row.baseline - layout.fontSize*layout.metrics.descender],
          [startU, row.baseline + layout.fontSize*layout.metrics.ascender], [startU + row.width, row.baseline + layout.fontSize*layout.metrics.ascender]].map(([x,y]) => at(x,y));
        const xs = corners.map(q => q.x), ys = corners.map(q => q.y);
        letteringBoxes.push({x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys)});
      }
      drawnInscriptions.add(e.id);
    }
    // Parallel dimension lines get their own lane, so neighbouring measures (e.g. a
    // 600 stele on a 700 Sockel) never print their texts on top of one another.
    const laneGap = 16;
    const laid = withoutRepeatedWallAxes(projectDimensions(snapshot, view)).map((dimension, index) => {
      const d = layoutDimension(dimension, 14/factor), a = p(d.a.x,d.a.y), end = p(d.b.x,d.b.y), at = p(d.label.x,d.label.y);
      return {dimension, index, a, end, at, n: dimension.outward, s: a.x*dimension.outward.x + a.y*dimension.outward.y};
    }).filter(item => Math.hypot(item.end.x-item.a.x, item.end.y-item.a.y) >= 45).sort((x, y) => x.s - y.s);
    const lanes: Array<{n: {x:number;y:number}; s: number; lo: number; hi: number}> = [];
    const sameNormal = (a: {x:number;y:number}, b: {x:number;y:number}) => Math.abs(a.x-b.x) < 1e-6 && Math.abs(a.y-b.y) < 1e-6;
    for (const item of laid) {
      const t = {x: -item.n.y, y: item.n.x}, span = [item.a.x*t.x + item.a.y*t.y, item.end.x*t.x + item.end.y*t.y].sort((x, y) => x - y);
      let lane = item.s;
      for (let guard = 0; guard < 50; guard++) {
        const blocking = lanes.find(l => sameNormal(l.n, item.n) && l.lo < span[1] + 24 && l.hi > span[0] - 24 && Math.abs(l.s - lane) < laneGap);
        if (!blocking) break;
        lane = blocking.s + laneGap;
      }
      const shift = lane - item.s;
      for (const q of [item.a, item.end, item.at]) { q.x += item.n.x*shift; q.y += item.n.y*shift; }
      lanes.push({n: item.n, s: lane, lo: span[0], hi: span[1]});
      const {dimension, index, a, end, at} = item;
      guides.push({start:p(Number(dimension.a.xMm),Number(dimension.a.yMm)),end:a},
        {start:a,end}, {start:end,end:p(Number(dimension.b.xMm),Number(dimension.b.yMm))});
      for (const q of [a,end]) ticks.push({start:{x:q.x-2,y:q.y-2},end:{x:q.x+2,y:q.y+2}});
      const text = Number(dimension.valueMm).toLocaleString('de-DE',{maximumFractionDigits:2}) +
        (dimension.label.endsWith('Wandachse') ? ' · Achse' : dimension.label.endsWith('Lichtes Innenmaß') ? ' · innen' : '');
      const w = width(text,8), anchor = dimensionTextAnchor(dimension);
      const x = anchor === 'start' ? at.x+4 : anchor === 'end' ? at.x-w-4 : at.x-w/2;
      dimensionLabels.push({id:view+'-'+index,description:dimension.label,text,x,y:at.y+4,width:w,size:8,anchor:at});
    }
    const x0 = origin.x, x1 = x0+drawWidth, y0 = origin.y, y1 = y0+drawHeight;
    // The overall measure stays outside every element measure on the same side.
    const beyond = (n: {x:number;y:number}, edge: number) => Math.max(45, ...lanes.filter(l => sameNormal(l.n, n)).map(l => l.s - edge + 18));
    const bottom = beyond({x:0,y:-1}, -y0), left = beyond({x:-1,y:0}, -x0);
    guides.push({start:{x:x0,y:y0-bottom},end:{x:x1,y:y0-bottom}},
      {start:{x:x0-left,y:y0},end:{x:x0-left,y:y1}});
    for (const x of [x0,x1]) {
      guides.push({start:{x,y:y0-5},end:{x,y:y0-bottom-5}});
      ticks.push({start:{x:x-3,y:y0-bottom-3},end:{x:x+3,y:y0-bottom+3}});
    }
    for (const y of [y0,y1]) ticks.push({start:{x:x0-left-3,y:y-3},end:{x:x0-left+3,y:y+3}});
    const externalWidth = `${b.width.toLocaleString('de-DE',{maximumFractionDigits:2})} mm · ${customer ? 'Gesamtbreite' : 'geometrisches Außenmaß'}`;
    const externalHeight = `${b.height.toLocaleString('de-DE',{maximumFractionDigits:2})} mm`;
    const widthLabel = width(externalWidth,9), heightLabel = width(externalHeight,9);
    dimensionLabels.push(
      {id:view+'-outside-width',description:'Geometrisches Außenmaß, Breite',text:externalWidth,
        x:Math.max(37,(x0+x1-widthLabel)/2),y:y0-bottom-15,width:widthLabel,size:9,anchor:{x:(x0+x1)/2,y:y0-bottom}},
      {id:view+'-outside-height',description:'Geometrisches Außenmaß, Höhe',text:externalHeight,
        x:Math.max(37,x0-left-55),y:y1+10,width:heightLabel,size:9,anchor:{x:x0-left,y:y1}},
    );
    const markers = projected.texts.map((entry,index)=>({...p(Number(entry.point.xMm),Number(entry.point.yMm)),index:index+1,elementId:entry.elementId}))
      .filter(marker=>!drawnInscriptions.has(marker.elementId)).map(({elementId,...marker})=>marker);
    const labels = placeSheetLabels(dimensionLabels, [...obstacles,...guides,...ticks],
      [...markers.map(({x,y})=>({x:x-7,y:y-7,width:14,height:14})),...letteringBoxes],
      {x:36,y:127,width:A3[0]-72,height:A3[1]-238});
    labelsForReview += labels.filter(item => item.state === 'review').length;
    for (const segment of guides) page.drawLine({...segment,thickness:.45,color:muted});
    for (const segment of ticks) page.drawLine({...segment,thickness:.7,color:green});
    for (const marker of markers) {
      page.drawCircle({x:marker.x,y:marker.y,size:6,borderColor:green,borderWidth:.6,color:rgb(1,1,1)});
      draw(page,String(marker.index),marker.x-2,marker.y-3,8,green);
    }
    for (const annotation of labels) if(annotation.leader)page.drawLine({...annotation.leader,thickness:.35,dashArray:[2,2],color:muted});
    for (const annotation of labels) {
      page.drawRectangle({...annotation.box,color:rgb(1,1,1)});
      draw(page,annotation.text,annotation.x,annotation.y,annotation.size,annotation.size===9?ink:green);
    }
    if (inspect) review.views.push({id:view,title:names[view],width:A3[0],height:A3[1],scale,outlines,lines:guides,ticks,markers,labels});
    const barMm=scale*40/PT_PER_MM,barX=45,barY=105;
    page.drawLine({start:{x:barX,y:barY},end:{x:barX+40,y:barY},thickness:2,color:ink});
    for(const x of [barX,barX+40])page.drawLine({start:{x,y:barY-4},end:{x,y:barY+4},thickness:1,color:ink});
    draw(page,`${barMm.toLocaleString('de-DE',{maximumFractionDigits:2})} mm · Maßstab 1:${scale}`,barX,barY-18,9);
    const note = customer
      ? 'Maße in mm. Entwurf zur Abstimmung von Form, Maßen, Material und Inschrift. Maße, Material und Schrift werden vor der Fertigung vor Ort und fachlich geprüft; dieser Entwurf ist keine Fertigungsfreigabe.'
      : snapshot.kind==='memorial'?'Maße in mm. Planmaße sind kein bestätigtes Aufmaß. Schrift wird nicht durch ähnliche Zeichensätze ersetzt. Wortlaut und Herstellerreferenz stehen im Inschriftenplan. Speicherpräzision 0,01 mm ist keine Fertigungstoleranz.':'Maße in mm. „Achse“ bezeichnet die Wandachse; „innen“ das modellierte lichte Innenmaß. Planmaße sind kein bestätigtes Aufmaß. Wandaufbau und Einbaumaße vor Ort prüfen. Speicherpräzision 0,01 mm ist keine Fertigungstoleranz.';
    label(page,note,310,116,9,A3[0]-310-356);
    titleBlock(page,`1:${scale}`);
    label(page,`Höhenbezug: ${snapshot.frames.map(f=>f.datumLabel).join(' · ')}`,45,70,9,A3[0]-90-336,muted);
  }
  if(inspect) return review;
  let page:PDFPage=pages[pages.length-1].page,y=A4[1]-125;
  if(!customer){
  page=newPage('Stück- und Bearbeitungsliste');
  const decimalLabel=(value:string)=>value.replace('.',',');
  const tableHead=()=>{page.drawRectangle({x:36,y:y-24,width:A4[0]-72,height:24,color:warm});draw(page,'BAUTEIL / AUSFÜHRUNG',44,y-16,9,green);draw(page,'MENGE',389,y-16,9,green);draw(page,'EINHEIT',460,y-16,9,green);y-=42;};
  tableHead();
  for(const item of bom.lines){
    const axisArea=snapshot.elements.some(element=>element.id===item.elementId&&element.kind==='room');
    const material=item.materialSpecVersionId?meta.materials?.[item.materialSpecVersionId]:undefined;
    const detail=[item.category,...(axisArea?['Flächenbezug: Wandachsen, kein lichtes Innenmaß']:[]),...(item.materialSpecVersionId?[`Materialstand: ${material?`${material.name}${material.revision?' · Version '+material.revision:''}`:'noch nicht zugeordnet / Bezeichnung nicht verfügbar'}`]:[]),...(material?.sourceCatalog?[`Katalog: ${material.sourceCatalog}`]:[]),...(material?.sourceUrl?[`Herstellerquelle: ${material.sourceUrl}`]:[]),...(material?.checkedOn?[`Quellenprüfung: ${material.checkedOn}`]:[]),...(item.thicknessMm!==null?[`Stärke ${decimalLabel(item.thicknessMm)} mm`]:[]),...(item.netAreaM2!==null?[`${axisArea?'Achsfläche':'Netto'} ${decimalLabel(item.netAreaM2)} m²`]:[]),...(item.volumeM3!==null?[`Volumen ${decimalLabel(item.volumeM3)} m³`]:[]),...(item.edgeLengthM!==null?[`${axisArea?'Umfang zwischen Wandachsen':'Bearbeitete Kante'} ${decimalLabel(item.edgeLengthM)} m`]:[]),...(['Bearbeitung','Anschlusspunkt','Freiraumkontrolle','Gef\u00e4llevorgabe'].includes(item.category)?item.notes:item.notes.filter(note=>/^(Rohma\u00df:|Oberfl\u00e4chenstand:|Untergrund:|Ausf\u00fchrungsregel:|Bewegungsfugen:|Technische Quellen:)/.test(note)))].join(' · ');
    const rows=wrap(detail,9,325),labels=wrap(item.label,11,325),height=16+labels.length*15+rows.length*13;
    if(y-height<75){page=newPage('Stück- und Bearbeitungsliste · Fortsetzung');y=A4[1]-125;tableHead();}
    labels.forEach((row,i)=>draw(page,row,44,y-i*15,11));draw(page,decimalLabel(item.quantity),389,y,10);draw(page,item.unit,460,y,10);
    rows.forEach((row,i)=>draw(page,row,44,y-labels.length*15-3-i*13,9,muted));
    y-=height;page.drawLine({start:{x:36,y:y+16},end:{x:A4[0]-36,y:y+16},thickness:.4,color:line});
  }
  if(y<135){page=newPage('Mengengrundlage');y=A4[1]-125;}
  label(page,'Mengen entstehen aus dieser Revision. Kein pauschaler Verschnitt, keine erfundenen Einkaufsdaten, keine Gewichtsannahme ohne belegte Materialdichte. Modellierte Ausschnitte werden explizit abgezogen. Flächenregeln für die Abrechnung separat fachlich bestätigen.',36,y-10,10,A4[0]-72);
  }
  for(const inscription of inscriptions){
    page=newPage(customer?`Inschrift · ${inscription.label}`:`Inschriftenplan · ${inscription.label}`);y=A4[1]-130;
    const layout=lettering(inscription),key=fontKey(inscription),fontName=layout.preview?.label??previewFontLabel(key);
    // Design in the chosen preview font, drawn from the licensed original outlines.
    draw(page,customer?'GESTALTUNG IN DER GEWÄHLTEN SCHRIFT':'GESTALTUNG IN DER VORSCHAUSCHRIFT',36,y,10,green);y-=17;
    y-=label(page,layout.preview?`${fontName} · Darstellung in der gewählten Schrift${customer?'; die Herstellerschrift wird vor der Fertigung bestätigt.':'; keine Herstellerkontur.'}`:`${fontName}: Die Schriftdatei ist auf dem Server nicht verfügbar. Der Wortlaut steht unten in Leseschrift; es wird keine ähnliche Schrift ersetzt.`,36,y,9,A4[0]-72,muted)+14;
    if(layout.preview){
      const maxWidth=A4[0]-110,widths=layout.rows.map(row=>glyphOutline(layout.preview!,row.text,1).width);
      const size=Math.max(8,Math.min(30,maxWidth/Math.max(.001,...widths)));
      for(const [index,row] of layout.rows.entries()){
        if(y-size*1.4<100){page=newPage(`Inschrift · ${inscription.label} · Fortsetzung`);y=A4[1]-125;}
        y-=size*layout.preview.ascender;
        const rowWidth=widths[index]*size,x=inscription.alignment==='center'?(A4[0]-rowWidth)/2:inscription.alignment==='right'?A4[0]-55-rowWidth:55;
        if(row.text.trim())page.drawSvgPath(glyphOutline(layout.preview,row.text,size).d,{x,y,color:ink});
        y-=size*(layout.preview.descender+.25);
      }
      y-=16;
    }
    draw(page,customer?'WORTLAUT ZUR BESTÄTIGUNG':'WÖRTLICHE PRÜFANSICHT',36,y,10,green);y-=28;
    for(const row of wrap(inscription.exactText,customer?14:16,A4[0]-90)){
      if(y<100){page=newPage(`Inschrift · ${inscription.label} · Fortsetzung`);y=A4[1]-125;}
      draw(page,row,45,y,customer?14:16);y-=customer?22:26;
    }
    if(customer){
      y-=14;
      const length=(id:string|null)=>{const value=measureValue(snapshot,id);return value===null?'offen':String(value).replace('.',',')+' mm';};
      const notes=[`Schrift: ${fontName} (Vorschauschrift)`,`Zeichenhöhe: ${length(inscription.requestedHeightMeasureId)} · Zeilenabstand: ${length(inscription.lineGapMeasureId)}`,
        `Ausrichtung: ${{left:'linksbündig',center:'zentriert',right:'rechtsbündig'}[inscription.alignment]} · Ausführung: ${{individual_letters:'Einzelbuchstaben',wording:'Schriftzug',engraved:'graviert',other:'nach Absprache'}[inscription.supplyForm]}`,
        'Bitte prüfen Sie Schreibweise, Daten und Zeichen. Nach Ihrer Bestätigung wird die Inschrift mit der Herstellerschrift abgestimmt.'];
      for(const note of notes){const h=wrap(note,10,A4[0]-72).length*15+8;if(y-h<75){page=newPage(`Inschrift · ${inscription.label} · Fortsetzung`);y=A4[1]-125;}y-=label(page,note,36,y,10,A4[0]-72)+8;}
      continue;
    }
    y-=20;
    const ref=meta.fontReferences?.[inscription.fontVariantVersionId];
    const length=(id:string|null,empty='offen')=>{const value=measureValue(snapshot,id);return value===null?empty:String(value).replace('.',',')+' mm';};
    const specifications=[`Vorschauschrift: ${fontName}${layout.preview?'':' (Schriftdatei auf dem Server nicht verfügbar)'}`,`Herstellerschrift: ${meta.fontLabels?.[inscription.fontVariantVersionId]??'noch nicht zugeordnet – nur Entwurf'}`,
      `Lieferform: ${{individual_letters:'Einzelbuchstaben',wording:'Schriftzug',engraved:'graviert',other:'andere'}[inscription.supplyForm]}`,
      `Gewünschte Zeichenhöhe: ${length(inscription.requestedHeightMeasureId)}`,
      `Kleinbuchstabenhöhe: ${length(inscription.requestedLowercaseHeightMeasureId,'nicht festgelegt')}`,
      `Verbindliche maximale Schriftbreite: ${length(inscription.requestedMaxWidthMeasureId)}`,
      `Zeilenabstand: ${length(inscription.lineGapMeasureId)}`,
      `Ursprung auf der Beschriftungsfläche (unten links): u ${inscription.originUV.uMm} / v ${inscription.originUV.vMm} mm`,
      `Drehung ${inscription.rotationDeg}° · Ausrichtung ${{left:'linksbündig',center:'zentriert',right:'rechtsbündig'}[inscription.alignment]}`,
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
  if(!customer){
  for(const reference of snapshot.elements)if(reference.kind==='plan_reference'){
    page=newPage(`Quellenbezug · ${reference.label}`);y=A4[1]-130;
    const details=[`Originalversion: ${reference.sourceDocumentVersionId}`,`Original-SHA-256: ${reference.sourceHash}`,`Seite ${reference.pageIndex+1} · Quelle ${reference.sourceKind} · ${reference.widthPx} × ${reference.heightPx} Rasterpixel`,`Vorschauversion: ${reference.previewDocumentVersionId??'nicht erzeugt'}`,`Vorschau-SHA-256: ${reference.previewHash??'offen'}`,'QUELLENREFERENZ / IMPORTVORSCHLAG: Diese Kalibrierung bestätigt kein Aufmaß. Perspektivische Fotos sind ohne belegte Projektion kein maßhaltiger Grundriss.',`Kontrolltoleranz: ${reference.calibration.toleranceMm} mm; keine Fertigungstoleranz.`,...reference.calibration.segments.map(s=>`${s.axis.toUpperCase()}: (${s.a.xPx}, ${s.a.yPx}) bis (${s.b.xPx}, ${s.b.yPx}) px · abgelesen ${measureValue(snapshot,s.lengthMeasureId)??'offen'} mm · ungeprüft`)];
    for(const detail of details){const h=wrap(detail,10,A4[0]-72).length*15+10;if(y-h<75){page=newPage(`Quellenbezug · ${reference.label} · Fortsetzung`);y=A4[1]-125;}y-=label(page,detail,36,y,10,A4[0]-72)+10;}
  }
  for(const element of snapshot.elements){const contour=element.kind==='stone_piece'?element.finishedContour:element.kind==='catalog_object'?element.footprint:'contour'in element?element.contour:null,source=contour?.importProvenance;if(!contour||!source)continue;page=newPage(`Konturquelle · ${element.label}`);y=A4[1]-130;const details=[`${source.format.toUpperCase()} · ${contourParts(contour).length} getrennte Bestandteile · ${contourParts(contour).reduce((n,p)=>n+p.holes.length,0)} Innenkonturen`,`Originalversion: ${source.sourceDocumentVersionId??'nur lokaler Entwurf'}`,`Original-SHA-256: ${source.sourceContentHash}`,`Parser: ${source.parserVersion} · ausdrücklich bestätigte Quelleinheit ${source.sourceUnit}; Zielkoordinaten in mm`,...(source.sourcePlaneZMm?[`Originale Z-Ebene: ${source.sourcePlaneZMm} mm; lokale XY-Kontur ohne Bestätigung einer Einbauhöhe.`]:[]),`${source.approximated?'Kontrollierte Kurvennäherung':'Analytische Geraden/Kreisbögen'} · maximal ${source.curveErrorBoundMm} mm Importfehler einschließlich 0,01-mm-Koordinatenquantisierung. Keine Fertigungstoleranz.`,...(source.review?[`Fachprüfung ${source.review.confirmedAt}; akzeptierter Fehler ${source.review.acceptedErrorMm} mm.`,`Versioniertes Prüfprotokoll: ${source.review.evidenceVersionId}`,source.review.statement]:['FACHLICH UNGEPRÜFTER IMPORTVORSCHLAG. Vor Verwendung zur Fertigung Quelle, Konturrollen, Fehlergrenze und Eignung mit eigenem versioniertem Prüfprotokoll bestätigen.']),'Nutzungsrechte, Materialeignung und Freigabe dieser Gesamtplanrevision werden separat nachgewiesen.'];for(const detail of details){const h=wrap(detail,10,A4[0]-72).length*15+10;if(y-h<75){page=newPage(`Konturquelle · ${element.label} · Fortsetzung`);y=A4[1]-125;}y-=label(page,detail,36,y,10,A4[0]-72)+10;}}
  const checks=validateDesign(snapshot,{forRelease:true});
  page=newPage('Prüfstand und offene Angaben');y=A4[1]-130;
  const notices=[...checks.blocking,...checks.warnings];
  if(labelsForReview)notices.push('Ausgabelayout: '+labelsForReview+' Maßtexte in der Vorschau auf Überlagerungen prüfen.');
  if(!notices.length)notices.push('Geometrieprüfung bestanden. Fachliche Freigaben, Genehmigung und passendes Fertigungspaket werden separat nachgewiesen.');
  notices.push(snapshot.kind==='memorial'?'Geometrieprüfung ersetzt keine Prüfung von Standsicherheit, Verankerung, Materialeignung, Lasten oder Friedhofsvorgaben.':'Geometrieprüfung ersetzt keine Prüfung von Untergrund, Abdichtung, Materialeignung, Lasten oder Einbausituation.');
  if((meta.audience??'internal')!=='internal')notices.push('Diese Fassung enthält keine internen Preise, Kalkulationen oder Personalangaben.');
  for(const notice of [...new Set(notices)]){const rows=wrap(notice,10,A4[0]-89);if(y-rows.length*15<78){page=newPage('Prüfstand · Fortsetzung');y=A4[1]-125;}draw(page,'•',37,y,11,green);y-=label(page,notice,52,y,10,A4[0]-89)+12;}
  const unsupported=[...new Set(snapshot.elements.filter(e=>e.kind==='inscription').flatMap(e=>e.kind==='inscription'?Array.from(e.exactText).filter(c=>c!=='\n'&&!sets.some(s=>s.has(c.codePointAt(0)!))):[]))];
  if(unsupported.length){if(y<160){page=newPage('Zeichensatzprüfung');y=A4[1]-125;}label(page,`Nicht im eingebetteten Leseschriftbestand: ${unsupported.map(c=>'U+'+c.codePointAt(0)!.toString(16).toUpperCase()).join(', ')}. In der Prüfansicht stehen dafür ausdrücklich Codepoints; diese Ausgabe ist bis zur Bereitstellung geeigneter lizenzierter Schriftdateien nicht als wörtliche Freigabe verwendbar.`,36,y,10,A4[0]-72);}
  }else{
    const unsupported=[...new Set(visibleInscriptions.flatMap(e=>Array.from(e.exactText).filter(c=>c!=='\n'&&!sets.some(s=>s.has(c.codePointAt(0)!)))))];
    if(unsupported.length){if(y<160){page=newPage('Zeichenprüfung');y=A4[1]-125;}label(page,`Einige Zeichen der Inschrift (${unsupported.map(c=>'U+'+c.codePointAt(0)!.toString(16).toUpperCase()).join(', ')}) sind in dieser Ausgabe als Codepunkte dargestellt. Bitte die Schreibweise gemeinsam mit uns prüfen.`,36,y-10,10,A4[0]-72);}
  }
  pages.forEach(({page,scale},index)=>{const {width:w}=page.getSize();page.drawLine({start:{x:36,y:48},end:{x:w-36,y:48},thickness:.6,color:line});draw(page,customer&&scale==='—'?`Revision ${meta.revision} · ${status}`:`Revision ${meta.revision} · ${status} · mm · Maßstab ${scale}`,36,32,8,muted);draw(page,`${index+1} / ${pages.length}`,w-70,32,8,muted);if(meta.contentHash&&!customer)draw(page,`Modellhash ${meta.contentHash}`,36,18,6,muted);});
  return pdf.save();
}
