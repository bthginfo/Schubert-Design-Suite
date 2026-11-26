import prompts from './prompts.json' with {type:'json'};
import {dec,DomainError} from '@schubert/domain';
import {clarificationInstructions,planningStepSchema,planningStepInstructions} from '@schubert/contracts';
import {availableSkills,skillDiscoveryInstructions} from './skills.js';
import {planningWorkflowFacts} from './planning-facts.js';
export type AIMode='standard'|'design_review';
import {CLAUDE_DEFAULT_MODEL,claudeModelPrices,claudeEfforts,type ClaudeEffort} from './claude.js';
/** Planning studios: geometry, measurements and inscriptions need the most capable model. */
export const DEFAULT_TEXT_MODEL = CLAUDE_DEFAULT_MODEL;
/** Explicit deep review in a studio. */
export const DEFAULT_DESIGN_MODEL = CLAUDE_DEFAULT_MODEL;
/** Office, suite search, drafts and documents/photos: strong tool use and vision at half the price. */
export const DEFAULT_OFFICE_MODEL = 'claude-sonnet-5-5';
/** Short how-to questions and the connection check. */
export const DEFAULT_QUICK_MODEL = 'claude-haiku-5-5';
/** Default reservation ceilings. They bound conservative estimates; actual usage is settled per call. */
export const DEFAULT_MAX_REQUEST_COST='1.00';
export const DEFAULT_DESIGN_MAX_REQUEST_COST='2.00';
export const DEFAULT_MONTHLY_BUDGET='50';
/** Output ceilings include adaptive thinking. They stay below the SDK's non-streaming timeout bound. */
export const OUTPUT_TOKENS={quick:4000,office:8000,planning:12000,review:16000} as const;
export type ModelTier=keyof typeof OUTPUT_TOKENS;
export type AIRequest={message?:string;imageCount?:number};
const effort=(value:unknown,fallback:ClaudeEffort):ClaudeEffort=>claudeEfforts.includes(value as ClaudeEffort)?value as ClaudeEffort:fallback;
const designContext=(context:Record<string,any>)=>['planning','studio','memorial','room_plan'].includes(String(context.entityType));
// A how-to question without an action verb: "Wie lege ich einen Kunden an?", "Wo finde ich offene Rechnungen?"
const quickQuestion=/^(?:wie|wo|wann|warum|wozu|wofür|was (?:bedeutet|heißt|ist|sind|kann|muss)|welche[rsnm]? (?:bereich|seite|funktion|taste|ansicht|schritt)|erklär\w*|kannst du (?:mir )?(?:erklären|zeigen|sagen)|hilfe\b)/i;
const actionVerb=/\b(?:erstell\w*|entwirf\w*|entwerf\w*|bereite\w* .*vor|vorbereite\w*|änder\w*|ersetz\w*|schreib\w*|buch\w*|eintrag\w*|trag\w* .*ein|anlegen|leg\w* .*an\b(?!\?)|übernimm\w*|zuordn\w*|verschieb\w*|lösch\w*|berechne\w*|prüfe\w*|vergleich\w*|zusammenfass\w*|fasse\w*|analysier\w*|ausles\w*)\b/i;
// "How do I …" asks for guidance about the person's own next step, whatever the verb.
const howTo=/^(?:wie (?:kann|muss|soll|darf) (?:ich|man|wir)|wie (?:lege|finde|erstelle|ändere|trage|buche|komme|mache|starte|öffne|lösche|drucke|sende|exportiere) ich|wie funktioniert|wie geht|wo (?:finde|sehe|kann|ist|sind|steht|stehen)|was (?:bedeutet|heißt)|wofür|wozu|erklär\w*|hilfe\b)/i;
export function isQuickQuestion(message?:string){
 if(!message)return false;
 const text=message.trim().replace(/^test:\s*/i,'');
 if(text.length>300||text.includes('\n'))return false;
 return howTo.test(text)||quickQuestion.test(text)&&!actionVerb.test(text);
}
/** Which model class a request needs. Documents and images always use at least the office model. */
export function routeTier(mode:AIMode,context:Record<string,any>,request:AIRequest={}):ModelTier{
 if(mode==='design_review')return 'review';
 if(designContext(context))return 'planning';
 if(context.entityType==='probe')return 'quick';
 const documents=!!context.sourceKind||(Array.isArray(context.sources)&&context.sources.length>0)||(request.imageCount??0)>0;
 return !documents&&isQuickQuestion(request.message)?'quick':'office';
}
/** Display the same models, prices and limits that reserve() actually enforces. */
export function assistantModelProfiles(config:Record<string,any>){
 const display=(profile:ReturnType<typeof routeModel>)=>({model:profile.model,effort:profile.effort,inputCostPerMillion:profile.inputCostPerMillion,outputCostPerMillion:profile.outputCostPerMillion,maxRequestCost:profile.maxRequestCost});
 const quick=display(routeModel(config,'standard',{entityType:'probe'})),office=display(routeModel(config,'standard',{}));
 const planning=display(routeModel(config,'standard',{entityType:'planning'})),design=display(routeModel(config,'design_review',{entityType:'planning'}));
 return{provider:'anthropic',quick,office,planning,design,standard:office,currency:'USD',monthlyBudget:routeModel(config,'standard',{}).monthlyBudget};
}
/** Prices come from the saved profile; known Claude models fall back to their published rates. */
function prices(config:Record<string,any>,model:string,tier:ModelTier){
 const known=claudeModelPrices[model];
 // Own rates apply to the configurable planning and review models; office and quick models are published models.
 const own=tier==='review'?'design':tier==='planning'?'':null;
 const read=(key:string)=>own===null?undefined:config[own?own+key[0].toUpperCase()+key.slice(1):key];
 const input=read('inputCostPerMillion')??known?.input;
 const output=read('outputCostPerMillion')??known?.output;
 const ownRates=read('inputCostPerMillion')!==undefined;
 const cached=read('cachedInputCostPerMillion')??(!ownRates&&known?known.cachedInput:input?dec(input).mul('0.1').toString():undefined);
 const write=read('cacheWriteCostPerMillion')??(!ownRates&&known?known.cacheWrite:input?dec(input).mul('1.25').toString():undefined);
 return {inputCostPerMillion:input as string,outputCostPerMillion:output as string,...(cached?{cachedInputCostPerMillion:String(cached)}:{}),...(write?{cacheWriteCostPerMillion:String(write)}:{})};
}
function tierModel(config:Record<string,any>,tier:ModelTier){
 const planningModel=config.textModel||process.env.ANTHROPIC_TEXT_MODEL||DEFAULT_TEXT_MODEL;
 if(tier==='review')return config.designModel||process.env.ANTHROPIC_DESIGN_MODEL||DEFAULT_DESIGN_MODEL;
 if(tier==='planning')return planningModel;
 const chosen=tier==='office'?config.officeModel||process.env.ANTHROPIC_OFFICE_MODEL||DEFAULT_OFFICE_MODEL:config.quickModel||process.env.ANTHROPIC_QUICK_MODEL||DEFAULT_QUICK_MODEL;
 // Without published rates the office/quick tier falls back to the priced planning model instead of guessing.
 return claudeModelPrices[chosen]?chosen:planningModel;
}
export function routeModel(config:Record<string,any>,mode:AIMode,context:Record<string,any>,request:AIRequest={}){
 const design=designContext(context);
 const review=mode==='design_review';
 if(review&&!design)throw new Error('Vertiefte Designprüfung ist nur für einen konkreten Planungsstand möglich.');
 const tier=routeTier(mode,context,request);
 const model=tierModel(config,tier);
 const priceTier:ModelTier=(tier==='office'||tier==='quick')&&!claudeModelPrices[model]?'planning':tier;
 const domainPrompt=!design?prompts.office:context.designKind==='room_plan'?prompts.room:context.designKind==='memorial'?prompts.memorial:prompts.office;
 // Stable instructions form a cacheable prefix shared by every request of the same kind.
 const stableInstructions=[clarificationInstructions,prompts.base,domainPrompt,...(context.sourceKind?[prompts.document]:[])].join('\n');
 const volatileInstructions=workflowInstructions(context)+skillDiscoveryInstructions(availableSkills(context));
 const instructions=stableInstructions+'\n'+volatileInstructions;
 const documents=!!context.sourceKind||(Array.isArray(context.sources)&&context.sources.length>0)||(request.imageCount??0)>0;
 return {
  ...prices(config,model,priceTier),model,tier,instructions,stableInstructions,volatileInstructions,review,
  effort:tier==='review'?effort(config.designEffort,'high'):tier==='planning'?effort(config.planningEffort,'medium'):tier==='quick'?effort(config.quickEffort,'low'):documents?effort(config.documentEffort,'medium'):effort(config.effort,'low'),
  maxRequestCost:review?(config.designMaxRequestCost??DEFAULT_DESIGN_MAX_REQUEST_COST):(config.maxRequestCost??DEFAULT_MAX_REQUEST_COST),
  monthlyBudget:config.monthlyBudget??process.env.AI_MONTHLY_BUDGET_USD??DEFAULT_MONTHLY_BUDGET,
  maxOutputTokens:OUTPUT_TOKENS[tier],
  promptVersion:prompts.version+':clarifications-1:task-presets-1:source-task-context-1:read-tools-1:planning-stages-1:claude-1'
 };
}
function workflowInstructions(context:Record<string,any>){
 const step=planningStepSchema.safeParse(context.workflow?.step),facts=context.planningStage??planningWorkflowFacts(context),stage=facts?' Aktueller Planungsstand: '+JSON.stringify(facts):'';
 if(context.entityType==='planning'&&step.success)return 'Aktueller Arbeitsschritt: '+(context.workflow.label??step.data)+'. '+planningStepInstructions(context.designKind,step.data,context.project?.workflow_preset)+' Die Oberfläche zeigt Maße in '+(['mm','cm','m'].includes(context.workflow.displayUnit)?context.workflow.displayUnit:'mm')+'. Antwortmaße in dieser Anzeigeeinheit nennen. Explizite Einheiten in Nachricht oder Quelle gehen vor; bei uneindeutigen Maßangaben rückfragen. Alle Geometrie- und Command-Werte bleiben Dezimalstrings in mm. Vom Nutzer ausdrücklich ausgewählte optionale Einschränkungen: '+JSON.stringify(context.workflow.guardrails??{})+'. Nur wenn der jeweilige Wert true ist, gilt: preserveMeasurements: vorhandene Maßwerte und Maßbezüge unverändert lassen; keine Raum-/Wandknoten verschieben. preserveWording: vorhandene Inschriftzeichen exakt beibehalten. selectionOnly: nur ausgewählte Elemente und deren eigene Maßwerte direkt bearbeiten. Bei false besteht die Einschränkung nicht. Eine Auswahl ist ansonsten Arbeitskontext, keine Sperre für Hinzufügen oder Änderungen an weiteren nötigen Bauteilen. Nur tatsächlich aktive Nutzergrenzen begrenzen die Bearbeitung.';
 return (context.workflow?.purpose??'')+stage;
}
const elementKeys=['glyphPlacements','referenceAssetVersionIds','connectionType','specificationVersionId','ruleVersionId','joinStyle','hingeSide','surfaceType','movementJointElementIds','jointWidthMeasureId','layingDirectionDeg','substrateVersionId','revealDepthMeasureId','miter','face','sourceDocumentId','sourceDocumentVersionId','sourceHash','previewDocumentId','previewDocumentVersionId','previewHash','pageIndex','widthPx','heightPx','sourceKind','calibration','opacity','previewFontKey','previewColor','finishSpecVersionId','roughWidthMeasureId','roughHeightMeasureId','roughThicknessMeasureId','edgeTreatments','machiningFeatureIds','sourceEvidenceVersionIds','recessDepthMeasureId','recessSide','id','kind','label','parentId','phase','locked','transform','point','startNodeId','endNodeId','heightMeasureId','coreThicknessMeasureId','layers','wallId','openingType','offsetAlongWallMeasureId','widthMeasureId','sillHeightMeasureId','openingDirection','boundary','floorId','floorLayers','finishedFloorLevelMeasureId','purpose','thicknessMeasureId','materialSpecVersionId','stockItemId','grainDirectionDeg','productVariantVersionId','assetVersionId','accuracy','surfaceElementId','originUV','rotationDeg','exactText','fontVariantVersionId','fontVariantId','materialArticleReference','renderingBasis','requestedHeightMeasureId','requestedLowercaseHeightMeasureId','requestedMaxWidthMeasureId','lineGapMeasureId','supplyForm','alignment','hostElementId','machiningType','depthMeasureId','minimumWebMeasureId','connectionType','diameterMeasureId','ruleVersionId','start','end','riseMeasureId','runMeasureId','text','category','measureId','mode','refs'];
function compactContour(c:any){if(!c)return undefined;const count=(c.outer?.length??0)+(c.holes??[]).reduce((n:number,h:any[])=>n+h.length,0)+(c.islands??[]).reduce((n:number,p:any)=>n+(p.outer?.length??0)+(p.holes??[]).reduce((s:number,h:any[])=>s+h.length,0),0);return count<=64?c:{edgeCount:count,complexContourOmitted:true,sourceContentHash:c.importProvenance?.sourceContentHash,curveErrorBoundMm:c.importProvenance?.curveErrorBoundMm};}
export function compactContext(input:Record<string,any>,maximumElements=40){
 const limit=Math.max(1,Math.min(40,maximumElements));
 const context=structuredClone(input);
 if(!context.snapshot)return context;
 if(context.entityType==='planning')context.planningStage=planningWorkflowFacts(context);
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

/** Cost ceiling for a known input size: every input token at the higher of the input and cache-write rates. */
export function tokenCost(profile:{inputCostPerMillion:string;cacheWriteCostPerMillion?:string;outputCostPerMillion:string;maxOutputTokens:number},inputTokenCeiling:number){
 const cost=(inputTokenCeiling*Math.max(Number(profile.inputCostPerMillion),Number(profile.cacheWriteCostPerMillion??profile.inputCostPerMillion))+profile.maxOutputTokens*Number(profile.outputCostPerMillion))/1000000;
 if(!Number.isFinite(cost)||cost<=0)throw new DomainError('AI_PRICE_PROFILE','Für das eingestellte Claude-Modell sind noch keine Preise hinterlegt. Der Superadmin kann sie unter Administration → Integrationen ergänzen. Es wurde kein KI-Aufruf gestartet.',503);
 return{inputTokenCeiling,cost:Math.ceil(cost*1000000)/1000000};
}
export function estimatedTextCost(profile:{inputCostPerMillion:string;cacheWriteCostPerMillion?:string;outputCostPerMillion:string;maxOutputTokens:number;instructions:string},input:unknown,imageCount=0){
 // One token never covers less than one UTF-8 byte; images are bounded by the largest accepted page size.
 const inputTokenCeiling=new TextEncoder().encode(JSON.stringify(input)+profile.instructions).length+8192+imageCount*8000;
 const cost=(inputTokenCeiling*Math.max(Number(profile.inputCostPerMillion),Number(profile.cacheWriteCostPerMillion??profile.inputCostPerMillion))+profile.maxOutputTokens*Number(profile.outputCostPerMillion))/1000000;
 if(!Number.isFinite(cost)||cost<=0)throw new DomainError('AI_PRICE_PROFILE','Für das eingestellte Claude-Modell sind noch keine Preise hinterlegt. Der Superadmin kann sie unter Administration → Integrationen ergänzen. Es wurde kein KI-Aufruf gestartet.',503);return{inputTokenCeiling,cost:Math.ceil(cost*1000000)/1000000};
}

/** Never split JSON, Unicode names, or a contour mid-value for an image prompt. */
export function planningVisualizationContext(input:Record<string,any>,byteLimit=14000){
 for(const count of [40,20,10,5,1]){
  const json=JSON.stringify(compactContext(input,count));
  if(new TextEncoder().encode(json).length<=byteLimit)return json;
 }
 throw new Error('Der Planungskontext ist für dieses Bildprofil zu umfangreich. Bitte eine kleinere Variante für die Visualisierung vorbereiten.');
}
