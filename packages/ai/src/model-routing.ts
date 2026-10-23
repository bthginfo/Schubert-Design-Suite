import prompts from './prompts.json' with {type:'json'};
import {dec} from '@schubert/domain';
import {planningStepSchema,planningStepInstructions} from '@schubert/contracts';
export type AIMode='standard'|'design_review';
export function routeModel(config:Record<string,any>,mode:AIMode,context:Record<string,any>){const design=['planning','studio','memorial','room_plan'].includes(String(context.entityType));if(mode==='design_review'&&!design)throw new Error('Vertiefte Designprüfung ist nur für einen konkreten Planungsstand möglich.');const review=mode==='design_review';const model=review?(config.designModel??process.env.OPENAI_DESIGN_MODEL??'gpt-6.1-sol'):(config.textModel??process.env.OPENAI_TEXT_MODEL??'gpt-6-luna'),input=review?(config.designInputCostPerMillion??'2'):(config.inputCostPerMillion??'0.10');const cachePricing=/^gpt-(?:6(?:[.-]|$)|5\.6(?:[.-]|$))/.test(model)?{cachedInputCostPerMillion:dec(input).mul('0.1').toString(),cacheWriteCostPerMillion:dec(input).mul('1.25').toString()}:{};return {...cachePricing,model:review?(config.designModel??process.env.OPENAI_DESIGN_MODEL??'gpt-6.1-sol'):(config.textModel??process.env.OPENAI_TEXT_MODEL??'gpt-6-luna'),inputCostPerMillion:review?(config.designInputCostPerMillion??'2'):(config.inputCostPerMillion??'0.10'),outputCostPerMillion:review?(config.designOutputCostPerMillion??'10'):(config.outputCostPerMillion??'0.50'),maxRequestCost:review?(config.designMaxRequestCost??'0.25'):(config.maxRequestCost??'0.10'),monthlyBudget:config.monthlyBudget??process.env.OPENAI_MONTHLY_BUDGET_USD??'5',maxOutputTokens:review?2500:1500,promptVersion:prompts.version,instructions:prompts.base+'\n'+(design?(context.designKind==='room_plan'?prompts.room:prompts.memorial):context.sourceKind?prompts.document:prompts.office)+'\n'+workflowInstructions(context),review};}
function workflowInstructions(context:Record<string,any>){
 const step=planningStepSchema.safeParse(context.workflow?.step);
 if(context.entityType==='planning'&&step.success)return 'Aktueller Arbeitsschritt: '+context.workflow.label+'. '+planningStepInstructions(context.designKind,step.data)+' Verbindliche Bearbeitungsgrenzen: '+JSON.stringify(context.workflow.guardrails??{})+'. preserveMeasurements: vorhandene Maßwerte und Maßbezüge unverändert lassen; keine Raum-/Wandknoten verschieben. preserveWording: vorhandene Inschriftzeichen exakt beibehalten. selectionOnly: nur ausgewählte Elemente und deren eigene Maßwerte direkt bearbeiten. Wenn die gewünschte Aufgabe damit nicht möglich ist, konkret rückfragen und keine Commands erzeugen.';
 return context.workflow?.purpose??'';
}
const elementKeys=['previewFontKey','previewColor','finishSpecVersionId','roughWidthMeasureId','roughHeightMeasureId','roughThicknessMeasureId','edgeTreatments','machiningFeatureIds','sourceEvidenceVersionIds','recessDepthMeasureId','recessSide','id','kind','label','parentId','phase','locked','transform','point','startNodeId','endNodeId','heightMeasureId','coreThicknessMeasureId','layers','wallId','openingType','offsetAlongWallMeasureId','widthMeasureId','sillHeightMeasureId','openingDirection','boundary','floorId','floorLayers','finishedFloorLevelMeasureId','purpose','thicknessMeasureId','materialSpecVersionId','stockItemId','grainDirectionDeg','productVariantVersionId','assetVersionId','accuracy','surfaceElementId','originUV','rotationDeg','exactText','fontVariantVersionId','fontVariantId','materialArticleReference','renderingBasis','requestedHeightMeasureId','requestedLowercaseHeightMeasureId','requestedMaxWidthMeasureId','lineGapMeasureId','supplyForm','alignment','hostElementId','machiningType','depthMeasureId','minimumWebMeasureId','connectionType','diameterMeasureId','ruleVersionId','start','end','riseMeasureId','runMeasureId','text','category','measureId','mode','refs'];
function compactContour(c:any){if(!c)return undefined;const count=(c.outer?.length??0)+(c.holes??[]).reduce((n:number,h:any[])=>n+h.length,0)+(c.islands??[]).reduce((n:number,p:any)=>n+(p.outer?.length??0)+(p.holes??[]).reduce((s:number,h:any[])=>s+h.length,0),0);return count<=64?c:{edgeCount:count,complexContourOmitted:true,sourceContentHash:c.importProvenance?.sourceContentHash,curveErrorBoundMm:c.importProvenance?.curveErrorBoundMm};}
export function compactContext(input:Record<string,any>,maximumElements=40){
 const limit=Math.max(1,Math.min(40,maximumElements));
 const context=structuredClone(input);
 if(!context.snapshot)return context;
 const s=context.snapshot,all:any[]=s.elements??[],byId=new Map<string,any>(all.map(e=>[e.id,e]));
 const ordered:any[]=[],seen=new Set<string>();
 const add=(id:string)=>{const element=byId.get(id);if(element&&!seen.has(id)&&ordered.length<limit){seen.add(id);ordered.push(element);}};
 for(const id of context.selectedElementIds??[])add(id);
 // Preserve the selection's host, wall nodes, group and driving dimensions before
 // filling the remaining budget. An inscription alone is not usable context.
 for(let index=0;index<ordered.length;index++){
  const element=ordered[index];
  for(const key of ['parentId','surfaceElementId','hostElementId','wallId','startNodeId','endNodeId'])if(element[key])add(element[key]);
  for(const ref of [...(element.boundary??[]),...(element.refs??[])])add(ref.wallId??ref.elementId);
  for(const dimension of all)if(dimension.kind==='dimension'&&dimension.refs?.some((ref:any)=>ref.elementId===element.id))add(dimension.id);
 }
 for(const element of all)add(element.id);
 const elements=ordered.map(e=>{const fields=Object.fromEntries(elementKeys.filter(key=>e[key]!==undefined).map(key=>[key,e[key]]));for(const key of ['finishedContour','footprint','contour'])if(e[key])fields[key]=compactContour(e[key]);return fields;});
 const constraints=(s.constraints??[]).filter((constraint:any)=>constraint.refs?.every((ref:any)=>seen.has(ref.elementId))).slice(0,100);
 const referenced=new Set<string>();
 function visit(value:any){if(!value||typeof value!=='object')return;for(const[key,item]of Object.entries(value)){if((key==='measureId'||key.endsWith('MeasureId'))&&typeof item==='string')referenced.add(item);else if(item&&typeof item==='object')visit(item);}}
 visit(elements);visit(constraints);
 for(const id of referenced)for(const sourceId of s.measurements?.[id]?.sourceMeasureIds??[])referenced.add(sourceId);
 context.snapshot={revisionId:s.revisionId,kernelVersion:s.kernelVersion,schemaVersion:s.schemaVersion,geometryEngineVersion:s.geometryEngineVersion,kind:s.kind,units:'mm',frames:s.frames,measurements:Object.fromEntries(Object.entries(s.measurements??{}).filter(([id])=>referenced.has(id))),elements,constraints,omittedElementCount:Math.max(0,all.length-elements.length),omittedConstraintCount:Math.max(0,(s.constraints?.length??0)-constraints.length)};
 return context;
}

export function estimatedTextCost(profile:{inputCostPerMillion:string;cacheWriteCostPerMillion?:string;outputCostPerMillion:string;maxOutputTokens:number;instructions:string},input:unknown,imageCount=0){
 const inputTokenCeiling=new TextEncoder().encode(JSON.stringify(input)+profile.instructions).length+8192+imageCount*16384;
 const cost=(inputTokenCeiling*Math.max(Number(profile.inputCostPerMillion),Number(profile.cacheWriteCostPerMillion??profile.inputCostPerMillion))+profile.maxOutputTokens*Number(profile.outputCostPerMillion))/1000000;
 if(!Number.isFinite(cost)||cost<=0)throw new Error('Invalid model price profile');return{inputTokenCeiling,cost:Math.ceil(cost*1000000)/1000000};
}

/** Never split JSON, Unicode names, or a contour mid-value for an image prompt. */
export function planningVisualizationContext(input:Record<string,any>,byteLimit=14000){
 for(const count of [40,20,10,5,1]){
  const json=JSON.stringify(compactContext(input,count));
  if(new TextEncoder().encode(json).length<=byteLimit)return json;
 }
 throw new Error('Der Planungskontext ist für dieses Bildprofil zu umfangreich. Bitte eine kleinere Variante für die Visualisierung vorbereiten.');
}
