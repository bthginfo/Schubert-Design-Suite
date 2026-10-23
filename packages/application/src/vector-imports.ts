import {assertManufacturerUse} from './document-access.js';
import{z}from'zod';
import type{Contour,DesignSnapshot}from'@schubert/contracts';
import{requireRule}from'@schubert/domain';
import{register,hash,type Runtime}from'./core.js';
import{catalogEvidence}from'./catalog.js';
import{importVectorOutline,OUTLINE_IMPORT_VERSION}from'./vector-outlines.js';

const optionsSchema=z.strictObject({document_version_id:z.uuid(),source_unit:z.enum(['mm','cm','m','in']),unit_confirmed:z.literal(true),tolerance_mm:z.string().regex(/^(?:0\.(?:0[2-9]|[1-9]\d?)|[1-4](?:\.\d{1,2})?|5)$/)});
register('planning.outline.inspect','planning',async r=>{const p=optionsSchema.parse(r.payload),original=await catalogEvidence(r,p.document_version_id,true);await assertManufacturerUse(r.db,original.document,original.version.id,'planning');return importVectorOutline(original.bytes!,{sourceUnit:p.source_unit,unitConfirmed:p.unit_confirmed,toleranceMm:p.tolerance_mm,sourceDocumentVersionId:original.version.id});});

export function elementContour(element:DesignSnapshot['elements'][number]):Contour|null{return element.kind==='stone_piece'?element.finishedContour:element.kind==='catalog_object'?element.footprint:'contour'in element?element.contour:null;}
export function selectImportedPart(contour:Contour,index:number):Contour{const parts=[{outer:contour.outer,holes:contour.holes},...(contour.islands??[])],part=parts[index];requireRule(part,'OUTLINE_PART','Gewählte Teilkontur ist in der Originalversion nicht vorhanden.');return{...structuredClone(part),...(contour.importProvenance?{importProvenance:{...structuredClone(contour.importProvenance),selectedPartIndex:index}}:{})};}
/** An import declaration is not trusted client geometry. Reparse the private
 * immutable original and bind its exact normalized result on every write. */
export async function verifyImportedContours(r:Runtime,snapshot:DesignSnapshot,forRelease=false){
 const originals=new Map<string,ReturnType<typeof importVectorOutline>>();
 for(const element of snapshot.elements){const contour=elementContour(element),source=contour?.importProvenance;if(!source)continue;requireRule(source.sourceDocumentVersionId&&source.parserVersion===OUTLINE_IMPORT_VERSION,'OUTLINE_SOURCE','Importkontur braucht eine unveränderliche zugängliche Originalversion und den passenden Parserstand.');const key=[source.sourceDocumentVersionId,source.sourceUnit,source.curveErrorBoundMm].join(':');let report=originals.get(key);if(!report){const original=await catalogEvidence(r,source.sourceDocumentVersionId,true);await assertManufacturerUse(r.db,original.document,original.version.id,'planning');requireRule(original.version.content_hash===source.sourceContentHash,'OUTLINE_SOURCE_HASH','Originalversion und deklarierter Konturimport stimmen nicht überein.');report=importVectorOutline(original.bytes!,{sourceUnit:source.sourceUnit,unitConfirmed:source.unitConfirmed,toleranceMm:source.curveErrorBoundMm,sourceDocumentVersionId:original.version.id});originals.set(key,report);}
  const expected=source.selectedPartIndex===undefined?structuredClone(report.contour):selectImportedPart(report.contour,source.selectedPartIndex),actual=structuredClone(contour);if(expected.importProvenance)delete expected.importProvenance.review;if(actual.importProvenance)delete actual.importProvenance.review;requireRule(hash(expected)===hash(actual),'OUTLINE_GEOMETRY_MISMATCH','Kontur, Löcher, Fehlergrenze und Quellenangaben entsprechen nicht der geprüften Originalableitung. Manuelle Änderungen als eigenen Entwurfsstand kennzeichnen.');
  if(source.review){requireRule(source.review.evidenceVersionId!==source.sourceDocumentVersionId,'OUTLINE_REVIEW','Ein eigenes Kontur-/Toleranz-Prüfprotokoll ist zusätzlich zur Originaldatei erforderlich.');await catalogEvidence(r,source.review.evidenceVersionId,true);}else requireRule(!forRelease,'OUTLINE_REVIEW','Importkontur vor Fertigungsfreigabe mit eigenem Protokoll und ausdrücklich akzeptierter Fehlergrenze fachlich bestätigen.');
 }
}
