import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {designOperationSchema,type DesignOperation,type Measure} from '@schubert/contracts';
import {targetMeasure,rectangleContour,mm,D} from '@schubert/geometry';
import {requireRule} from '@schubert/domain';

const dimension=z.string().regex(/^\d+(\.\d{1,2})?$/).refine(value=>Number(value)>0&&Number(value)<=100000);
export const planningDraftSchema=z.discriminatedUnion('kind',[
 z.strictObject({kind:z.literal('rectangular_room'),label:z.string().trim().min(1).max(100),clearWidthMm:dimension,clearDepthMm:dimension,heightMm:dimension,wallThicknessMm:dimension}),
 z.strictObject({kind:z.literal('memorial_slab'),label:z.string().trim().min(1).max(100),widthMm:dimension,heightMm:dimension,thicknessMm:dimension})
]);
/** Compact model output is expanded by the geometry adapter; the AI cannot attest dimensions. */
export function planningDraftOperations(context:any,input:unknown):DesignOperation[]{
 const draft=planningDraftSchema.parse(input),snapshot=context.snapshot;
 requireRule(snapshot?.frames?.[0]?.id&&snapshot.elements?.length===0,'AI_DRAFT_SCOPE','Einen ersten Entwurf nur in einer leeren Variante anlegen. Bestehende Elemente gezielt bearbeiten.');
 requireRule(snapshot.kind===(draft.kind==='rectangular_room'?'room_plan':'memorial'),'AI_DRAFT_KIND','Der Entwurf passt nicht zu diesem Planungsstudio.');
 const id=randomUUID(),base={id,label:draft.label,parentId:snapshot.frames[0].id,phase:'planned',locked:false,sourceEvidenceVersionIds:[]},measurements:Record<string,Measure>={};
 const measure=(name:string,value:string)=>{const key=id+':'+name;measurements[key]={...targetMeasure(value),origin:'ai'};return key;};
 const operations:any[]=[];
 if(draft.kind==='rectangular_room'){
  requireRule(Number(draft.wallThicknessMm)<=1000&&Number(draft.heightMm)<=10000,'AI_DRAFT_SIZE','Raumhöhe oder Wandstärke prüfen.');
  const t=new D(draft.wallThicknessMm),x0=t.div(-2),y0=x0,x1=new D(draft.clearWidthMm).plus(t.div(2)),y1=new D(draft.clearDepthMm).plus(t.div(2));
  const height=measure('height',draft.heightMm),core=measure('core',draft.wallThicknessMm),level=measure('level','0');
  [[x0,y0],[x1,y0],[x1,y1],[x0,y1]].forEach(([x,y],index)=>operations.push({type:'add_element',element:{...base,id:id+':node:'+index,label:draft.label+' · Bezug '+(index+1),kind:'node',point:{xMm:mm(x),yMm:mm(y),zMm:'0'}}}));
  for(let i=0;i<4;i++)operations.push({type:'add_element',element:{...base,id:id+':wall:'+i,label:draft.label+' · Wand '+(i+1),kind:'wall',startNodeId:id+':node:'+i,endNodeId:id+':node:'+((i+1)%4),heightMeasureId:height,coreThicknessMeasureId:core,layers:[],joinStyle:'miter'},measurements});
  operations.push({type:'add_element',element:{...base,kind:'room',roomId:'unassigned:room:'+id,floorId:'unassigned:floor:'+id,boundary:Array.from({length:4},(_,i)=>({wallId:id+':wall:'+i,side:'left'})),floorLayers:[],finishedFloorLevelMeasureId:level},measurements});
 }else{
  requireRule(Number(draft.widthMm)<=10000&&Number(draft.heightMm)<=10000&&Number(draft.thicknessMm)<=1000,'AI_DRAFT_SIZE','Grabmalmaße prüfen.');
  operations.push({type:'add_element',element:{...base,kind:'stone_piece',transform:{position:{xMm:'0',yMm:'0',zMm:'0'},rotationDeg:{x:'90',y:'0',z:'0'}},purpose:'memorial',finishedContour:rectangleContour(draft.widthMm,draft.heightMm),thicknessMeasureId:measure('thickness',draft.thicknessMm),materialSpecVersionId:'unassigned:material',stockItemId:null,grainDirectionDeg:null,edgeTreatments:[],machiningFeatureIds:[]},measurements});
  for(const [key,value] of [['width',draft.widthMm],['height',draft.heightMm]])operations.push({type:'add_element',element:{...base,id:id+':dimension:'+key,label:draft.label+' · '+(key==='width'?'Breite':'Höhe'),kind:'dimension',refs:[{elementId:id,feature:key}],measureId:measure(key,value),mode:'driving',offsetMm:'30'},measurements});
 }
 return operations.map(op=>designOperationSchema.parse(op));
}

export const planningDraftInstructions='Für einen ersten Entwurf in einer LEEREN Variante darf planning.design.change statt operations das Feld draft enthalten. room_plan: {kind:"rectangular_room",label,clearWidthMm,clearDepthMm,heightMm,wallThicknessMm}; memorial: {kind:"memorial_slab",label,widthMm,heightMm,thicknessMm}. Alle Maße sind positive Dezimalstrings in mm. clearWidthMm/clearDepthMm sind lichte Innenmaße ohne Wandstärke. Frage nach, wenn Maße fehlen, ein Skizzenmaß unlesbar ist oder Außenmaß/Achsmaß unklar bleibt. Keine Standardmaße erfinden. base_revision_id bleibt erforderlich. Der Server erstellt daraus editierbare, ungeprüfte Elemente; erst die ausdrückliche Bestätigung wendet sie an. Für vorhandene Elemente operations verwenden: set_element_position {elementId,position:{xMm,yMm,zMm}}, rotate_element {elementId,rotationDeg:{x,y,z}}, set_inscription_text {elementId,exactText}, set_design_target {measureId,valueMm,confirm:false}. Keine IDs erfinden. Beschreibe im Antworttext kurz, was die Vorschau ändern wird.';
