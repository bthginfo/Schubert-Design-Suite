import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {designOperationSchema,type DesignSnapshot,type DesignOperation,type Measure} from '@schubert/contracts';
import {targetMeasure,rectangleContour,memorialContour,memorialShapes,mm} from '@schubert/geometry';
import {requireRule} from '@schubert/domain';

const dimension=z.string().regex(/^\d+(\.\d{1,2})?$/).refine(value=>Number(value)>0&&Number(value)<=10000);
export const memorialAssemblySchema=z.strictObject({
 kind:z.literal('memorial_assembly'),label:z.string().trim().min(1).max(100),shape:z.enum(memorialShapes.map(shape=>shape.id)),
 widthMm:dimension,heightMm:dimension,thicknessMm:dimension,
 base:z.strictObject({widthMm:dimension,heightMm:dimension,depthMm:dimension}).nullable(),
 inscription:z.string().max(3000),materialWish:z.string().max(300).nullable()
});
const size={type:'string',pattern:'^[0-9]+(\\.[0-9]{1,2})?$'};
export const memorialAssemblyFormat={
 type:'object',properties:{
  kind:{type:'string',enum:['memorial_assembly']},label:{type:'string'},shape:{type:'string',enum:memorialShapes.map(shape=>shape.id)},
  widthMm:size,heightMm:size,thicknessMm:size,
  base:{anyOf:[{type:'null'},{type:'object',properties:{widthMm:size,heightMm:size,depthMm:size},required:['widthMm','heightMm','depthMm'],additionalProperties:false}]},
  inscription:{type:'string'},materialWish:{type:['string','null']}
 },required:['kind','label','shape','widthMm','heightMm','thicknessMm','base','inscription','materialWish'],additionalProperties:false
};

/** The model supplies domain values; only the server builds IDs, contours and measurements. */
export function memorialAssemblyOperations(snapshot:DesignSnapshot,draft:z.infer<typeof memorialAssemblySchema>):DesignOperation[]{
 requireRule(Number(draft.thicknessMm)<=1000,'AI_DRAFT_SIZE','Die Materialstärke des Grabsteins prüfen.');
 const operations:any[]=[],measurements:Record<string,Measure>={},root=snapshot.frames[0].id;
 const measure=(id:string,name:string,value:string)=>{const key=id+':'+name;measurements[key]={...targetMeasure(value),origin:'ai'};return key;};
 const base=(id:string,label:string)=>({id,label,parentId:root,phase:'planned',locked:false,sourceEvidenceVersionIds:[]});
 const stone=(id:string,label:string,width:string,height:string,depth:string,position:{xMm:string;yMm:string;zMm:string},contour=rectangleContour(width,height))=>{
  operations.push({type:'add_element',element:{...base(id,label),kind:'stone_piece',purpose:'memorial',transform:{position,rotationDeg:{x:'90',y:'0',z:'0'}},finishedContour:contour,thicknessMeasureId:measure(id,'thickness',depth),materialSpecVersionId:'unassigned:material',stockItemId:null,grainDirectionDeg:null,edgeTreatments:[],machiningFeatureIds:[]},measurements});
  for(const [name,value]of [['width',width],['height',height]])operations.push({type:'add_element',element:{...base(id+':dimension:'+name,label+' · '+(name==='width'?'Breite':'Höhe')),kind:'dimension',refs:[{elementId:id,feature:name}],measureId:measure(id,name,value),mode:'driving',offsetMm:'30'},measurements});
 };
 if(draft.base)stone(randomUUID(),draft.label+' · Sockel',draft.base.widthMm,draft.base.heightMm,draft.base.depthMm,{xMm:'0',yMm:'0',zMm:'0'});
 const stoneId=randomUUID();
 stone(stoneId,draft.label,draft.widthMm,draft.heightMm,draft.thicknessMm,{
  xMm:draft.base?mm((Number(draft.base.widthMm)-Number(draft.widthMm))/2):'0',
  yMm:draft.base?mm((Number(draft.thicknessMm)-Number(draft.base.depthMm))/2):'0',zMm:draft.base?.heightMm??'0'
 },memorialContour(draft.shape,draft.widthMm,draft.heightMm));
 if(draft.inscription.trim()){
  const id=randomUUID();
  operations.push({type:'add_element',element:{...base(id,draft.label+' · Inschrift'),kind:'inscription',surfaceElementId:stoneId,originUV:{uMm:mm(Number(draft.widthMm)/2),vMm:mm(Number(draft.heightMm)*.55)},rotationDeg:'0',exactText:draft.inscription,fontVariantVersionId:'unassigned:font',referenceAssetVersionIds:[],renderingBasis:'shop_image_reference',requestedHeightMeasureId:measure(id,'letter-height',mm(Math.min(40,Number(draft.widthMm)/15))),requestedLowercaseHeightMeasureId:null,requestedMaxWidthMeasureId:measure(id,'max-width',mm(Number(draft.widthMm)*.8)),lineGapMeasureId:measure(id,'line-gap','12'),supplyForm:'individual_letters',materialSpecVersionId:null,materialArticleReference:null,finishSpecVersionId:null,alignment:'center',glyphPlacements:[],previewFontKey:'notoserif',previewColor:'#c6a56d'},measurements});
 }
 if(draft.materialWish?.trim()){
  const id=randomUUID();operations.push({type:'add_element',element:{...base(id,'Ungeprüfter Materialwunsch'),kind:'technical_note',point:{xMm:'0',yMm:'0',zMm:'-90'},category:'information',ruleVersionId:null,text:'Materialwunsch (ungeprüft): '+draft.materialWish}});
 }
 return operations.map(operation=>designOperationSchema.parse(operation));
}
