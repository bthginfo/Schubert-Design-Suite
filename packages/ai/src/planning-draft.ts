import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {designOperationSchema,type DesignOperation,type Measure} from '@schubert/contracts';
import {targetMeasure,rectangleContour,rectangularRoomAxisPoints} from '@schubert/geometry';
import {requireRule} from '@schubert/domain';
import {memorialAssemblySchema,memorialAssemblyFormat,memorialAssemblyOperations} from './memorial-draft.js';

const dimension=z.string().regex(/^\d+(\.\d{1,2})?$/).refine(value=>Number(value)>0&&Number(value)<=100000);
export const planningDraftSchema=z.discriminatedUnion('kind',[
 z.strictObject({kind:z.literal('rectangular_room'),label:z.string().trim().min(1).max(100),clearWidthMm:dimension,clearDepthMm:dimension,heightMm:dimension,wallThicknessMm:dimension}),
 z.strictObject({kind:z.literal('memorial_slab'),label:z.string().trim().min(1).max(100),widthMm:dimension,heightMm:dimension,thicknessMm:dimension}),
 memorialAssemblySchema
]);
const dimensionProperty={type:'string',pattern:'^[0-9]+(\\.[0-9]{1,2})?$'};
function draftFormat(kind:string,dimensions:string[]){return{type:'object',properties:{kind:{type:'string',enum:[kind]},label:{type:'string'},...Object.fromEntries(dimensions.map(name=>[name,dimensionProperty]))},required:['kind','label',...dimensions],additionalProperties:false};}
export const initialMemorialDraftFormat={anyOf:[{type:'null'},memorialAssemblyFormat]};
export const planningDraftFormat={anyOf:[{type:'null'},draftFormat('rectangular_room',['clearWidthMm','clearDepthMm','heightMm','wallThicknessMm']),draftFormat('memorial_slab',['widthMm','heightMm','thicknessMm']),memorialAssemblyFormat]};

export function bindPlanningDraft(context:any,draft:unknown){
 // Only the authoritative server context supplies the target and base revision.
 const operations=planningDraftOperations(context,draft);
 requireRule(typeof context.variantId==='string'&&typeof context.revisionId==='string'&&Number.isInteger(context.baseVersion),'AI_DRAFT_CONTEXT','Einen aktuellen gespeicherten Planstand auswählen.');
 return{targetId:context.variantId,baseVersion:context.baseVersion,commands:[{name:'planning.design.change',inputJson:JSON.stringify({base_revision_id:context.revisionId,operations})}]};
}
/** Compact model output is expanded by the geometry adapter; the AI cannot attest dimensions. */
export function planningDraftOperations(context:any,input:unknown):DesignOperation[]{
 const draft=planningDraftSchema.parse(input),snapshot=context.snapshot;
 requireRule(snapshot?.frames?.[0]?.id&&snapshot.elements?.length===0,'AI_DRAFT_SCOPE','Einen ersten Entwurf nur in einer leeren Variante anlegen. Bestehende Elemente gezielt bearbeiten.');
 requireRule(snapshot.kind===(draft.kind==='rectangular_room'?'room_plan':'memorial'),'AI_DRAFT_KIND','Der Entwurf passt nicht zu diesem Planungsstudio.');
 if(draft.kind==='memorial_assembly')return memorialAssemblyOperations(snapshot,draft);
 const id=randomUUID(),base={id,label:draft.label,parentId:snapshot.frames[0].id,phase:'planned',locked:false,sourceEvidenceVersionIds:[]},measurements:Record<string,Measure>={};
 const measure=(name:string,value:string)=>{const key=id+':'+name;measurements[key]={...targetMeasure(value),origin:'ai'};return key;};
 const operations:any[]=[];
 if(draft.kind==='rectangular_room'){
  requireRule(Number(draft.wallThicknessMm)<=1000&&Number(draft.heightMm)<=10000,'AI_DRAFT_SIZE','Raumhöhe oder Wandstärke prüfen.');
  const points=rectangularRoomAxisPoints(draft.clearWidthMm,draft.clearDepthMm,draft.wallThicknessMm,{xMm:'0',yMm:'0',zMm:'0'},'clear');
  const height=measure('height',draft.heightMm),core=measure('core',draft.wallThicknessMm),level=measure('level','0');
  points.forEach((point,index)=>operations.push({type:'add_element',element:{...base,id:id+':node:'+index,label:draft.label+' · Bezug '+(index+1),kind:'node',point}}));
  for(let i=0;i<4;i++)operations.push({type:'add_element',element:{...base,id:id+':wall:'+i,label:draft.label+' · Wand '+(i+1),kind:'wall',startNodeId:id+':node:'+i,endNodeId:id+':node:'+((i+1)%4),heightMeasureId:height,coreThicknessMeasureId:core,layers:[],joinStyle:'miter'},measurements});
  operations.push({type:'add_element',element:{...base,kind:'room',roomId:'unassigned:room:'+id,floorId:'unassigned:floor:'+id,boundary:Array.from({length:4},(_,i)=>({wallId:id+':wall:'+i,side:'left'})),floorLayers:[],finishedFloorLevelMeasureId:level},measurements});
 }else{
  requireRule(Number(draft.widthMm)<=10000&&Number(draft.heightMm)<=10000&&Number(draft.thicknessMm)<=1000,'AI_DRAFT_SIZE','Grabmalmaße prüfen.');
  operations.push({type:'add_element',element:{...base,kind:'stone_piece',transform:{position:{xMm:'0',yMm:'0',zMm:'0'},rotationDeg:{x:'90',y:'0',z:'0'}},purpose:'memorial',finishedContour:rectangleContour(draft.widthMm,draft.heightMm),thicknessMeasureId:measure('thickness',draft.thicknessMm),materialSpecVersionId:'unassigned:material',stockItemId:null,grainDirectionDeg:null,edgeTreatments:[],machiningFeatureIds:[]},measurements});
  for(const [key,value] of [['width',draft.widthMm],['height',draft.heightMm]])operations.push({type:'add_element',element:{...base,id:id+':dimension:'+key,label:draft.label+' · '+(key==='width'?'Breite':'Höhe'),kind:'dimension',refs:[{elementId:id,feature:key}],measureId:measure(key,value),mode:'driving',offsetMm:'30'},measurements});
 }
 return operations.map(op=>designOperationSchema.parse(op));
}

export const planningDraftInstructions='Für einen ersten Entwurf in einer LEEREN Variante verwende planningDraft auf der obersten Antwortebene und lasse commands IMMER leer. Ein vollständiges Grabmal, auch aus einer Skizze mit Sockel und Inschrift, verwendet {kind:"memorial_assembly",label,shape,widthMm,heightMm,thicknessMm,base:{widthMm,heightMm,depthMm}|null,inscription:"genauer Wortlaut mit \\n zwischen Zeilen",materialWish:string|null}. widthMm/heightMm/thicknessMm sind die Maße des aufrechten Steins OHNE Sockel. Der Server baut die gewählte Steinform, stellt sie mittig auf den optionalen Sockel und ergänzt die Inschrift als bearbeitbare Vorschau. Ohne Sockelwunsch base=null; ohne Inschrift inscription=""; ohne Materialwunsch materialWish=null. Keine technische Schrift- oder Materialbestätigung behaupten. Für einen rechteckigen Raum: {kind:"rectangular_room",label,clearWidthMm,clearDepthMm,heightMm,wallThicknessMm}. Alle Maße sind positive Dezimalstrings in mm. clearWidthMm/clearDepthMm sind lichte Innenmaße ohne Wandstärke. Frage nach, wenn Maße fehlen, ein Skizzenmaß unlesbar ist oder Außenmaß/Achsmaß unklar bleibt. Keine Standardmaße erfinden. Bei Rückfragen planningDraft=null. Der Server bindet Ziel und Revision selbst und erstellt editierbare, ungeprüfte Elemente; erst die ausdrückliche Bestätigung wendet sie an. Für vorhandene Varianten planningDraft=null und planning.design.change mit den beschriebenen Bearbeitungsoperationen verwenden. Vorhandene IDs übernehmen; für neue Elemente lokale new:-Kennungen verwenden. Beschreibe im Antworttext kurz, was die Vorschau ändern wird.';
