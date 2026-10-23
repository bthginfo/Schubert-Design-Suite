<script lang="ts">
  import {feedbackFetch} from "#lib/client/feedback-context.ts";
  import {onMount,onDestroy,tick,type Component} from 'svelte';
  import {goto,invalidateAll,beforeNavigate} from '$app/navigation';
  import {page} from '$app/state';
  import {designSnapshotSchema,type DesignSnapshot,type DesignElement,type DesignOperation,type Point3,type Point2} from '@schubert/contracts';
  import{createDesign,applyOperations,inverseOperations,validateDesign,calculateBOM,projectDesign,projectDimensions,layoutDimension,measureValue,parseMillimetres,rectangleContour,hasAssetUsage,mm,D,worldMatrix,sourceSvgMatrix,buildDesignSnapTargets,designSnapOrigin,findDesignSnap,movingSnapElementIds,selectionMoveOperations,type DesignView,type ViewShape}from'@schubert/geometry';
  import type{AppData}from'#lib/client/types.ts';
  import{command,recordName,statuses}from'#lib/client/api.ts';
  import{describeStudioIssue}from'./studio/issues.ts';
  import Icon from './Icon.svelte';
  import StudioWorkflow from './studio/StudioWorkflow.svelte';
  import ManufacturerPicker from './studio/ManufacturerPicker.svelte';
  import OutlineImportDialog from './studio/OutlineImportDialog.svelte';
  let manufacturerOpen=$state(false),libraryOutlineOpen=$state(false),librarySourceVersion=$state(''),librarySourceUnit=$state(''),libraryTargetId=$state('');
  let librarySources:any[]=$state([]);
  async function useManufacturer(asset:any,action:'plan'|'outline'|'ai'){
    if(action==='ai'){await tick();window.dispatchEvent(new CustomEvent('schubert:assistant:open',{detail:{source:{documentId:asset.document_id,name:asset.name,pageNumber:1,includeImage:true}}}));return;}
    librarySources=[...librarySources.filter(row=>row.version_id!==asset.document_version_id),{...asset,version_id:asset.document_version_id,status:'available',content_hash:asset.source_hash}];
    librarySourceVersion=asset.document_version_id;librarySourceUnit=asset.source_unit??'';
    if(action==='outline'){libraryTargetId=selected?.id??'';libraryOutlineOpen=true;}else{sourceReferenceId='';sourcePlanOpen=true;}
  }
  import {planningStepSchema,type PlanningStep} from '@schubert/contracts';
  import {studioAssistantContext,registerStudioAssistant,type StudioAssistantContext} from '#lib/client/studio-assistant.ts';
  let planningStep=$state<PlanningStep>('geometry');
  let stepVariant='';
  function studioContext():StudioAssistantContext{
    if(!snapshot)throw new Error('Bitte zuerst eine Planvariante öffnen.');
    return {projectId:snapshot.planningProjectId,variantId:snapshot.variantId,revisionId:baseRevisionId,baseVersion,kind:snapshot.kind,step:planningStep,view,selectedElementIds:selectedIds.slice(0,20),selectedLabels:selectedElements.slice(0,20).map(e=>e.label),dirty:hasUnsentChanges,historic:isHistoric};
  }
  function choosePlanningStep(next:PlanningStep){
    planningStep=next;
    if(next==='review'){openInspector('checks');return;}
    if(next==='output'){openInspector('images');return;}
    const current=snapshot;if(!current)return;
    const candidate=current.elements.find(e=>next==='geometry'?(current.kind==='memorial'?e.kind==='stone_piece':e.kind==='wall'):(current.kind==='memorial'?e.kind==='inscription':e.kind==='stone_piece'||e.kind==='surface'));
    if(candidate)selectedIds=[candidate.id];
    openInspector('properties');
  }
  function readStepPreference(id:string){try{return sessionStorage.getItem('schubert:studio-step:'+id);}catch{return null;}}
  function askForStep(prompt:string){window.dispatchEvent(new CustomEvent('schubert:assistant:open',{detail:{prompt}}));}
  $effect(()=>{if(!mounted||!snapshot)return;if(stepVariant!==snapshot.variantId){stepVariant=snapshot.variantId;const saved=planningStepSchema.safeParse(readStepPreference(stepVariant));planningStep=saved.success?saved.data:'geometry';if(!compactWorkbench&&!snapshot.elements.length){leftPanel=false;rightPanel=false;}}});
  $effect(()=>{if(!mounted||!snapshot)return;studioAssistantContext.set(studioContext());try{sessionStorage.setItem('schubert:studio-step:'+snapshot.variantId,planningStep);}catch{/* Optional navigation preference only. */}});

  import {searchableSelect} from '#lib/client/searchable-select.ts';
  import WorkbenchPanel from './studio/WorkbenchPanel.svelte';
  import {workbenchViewport,workbenchPopover} from './studio/workbench.ts';
  import {displayGridStep,centeredZoom} from './studio/viewport.ts';
  import {hiddenWallIds} from './studio/wall-visibility.ts';
  let showWalls=$state(true),showDimensions=$state(true);
  let canvasWidth=$state(800),canvasHeight=$state(600);
  import MaterialPicker from './studio/MaterialPicker.svelte';
  import ReferencePicker from './ReferencePicker.svelte';
  import {stoneAppearance}from'./studio/stone-appearance.ts';
  import ProductPicker from './studio/ProductPicker.svelte';
  import{frozenProductVersion}from'./studio/catalog-reference.ts';
  let resolvedProducts:any[]=$state([]);
  import AddElementDialog from './studio/AddElementDialog.svelte';
  import MeasurementField from './studio/MeasurementField.svelte';
  import LetteringPreview from './studio/LetteringPreview.svelte';
  import {planningFonts}from'./studio/planning-fonts.ts';
  import {inscriptionCenter}from'./studio/lettering-layout.ts';
  import'./studio/planning-fonts.css';
  let studioRoot:HTMLDivElement,fullscreen=$state(false),gridSnap=$state(true);
  let fullscreenMode=$state<'none'|'native'|'fallback'>('none');
  let fullscreenOpener:HTMLElement|null=null,fullscreenScroll={x:0,y:0};
  let savedPageOverflow:{body:string;root:string}|null=null;
  function announceFallbackFullscreen(element:HTMLElement|null){window.dispatchEvent(new CustomEvent('schubert:studio:fullscreen',{detail:{element}}));}
  function lockPageScroll(){if(savedPageOverflow)return;savedPageOverflow={body:document.body.style.overflow,root:document.documentElement.style.overflow};document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';}
  function unlockPageScroll(){if(!savedPageOverflow)return;document.body.style.overflow=savedPageOverflow.body;document.documentElement.style.overflow=savedPageOverflow.root;savedPageOverflow=null;}
  function finishFullscreen(restore=true){
    if(!fullscreen&&fullscreenMode==='none')return;
    fullscreen=false;fullscreenMode='none';unlockPageScroll();announceFallbackFullscreen(null);
    if(restore)void tick().then(()=>{window.scrollTo(fullscreenScroll.x,fullscreenScroll.y);if(fullscreenOpener?.isConnected)fullscreenOpener.focus({preventScroll:true});});
  }
  async function toggleFullscreen(){
    if(fullscreen){
      try{if(document.fullscreenElement===studioRoot)await document.exitFullscreen();}
      catch{notice='Der Browser hat das Beenden des Vollbilds verhindert. Beenden Sie es mit Escape.';return;}
      finishFullscreen();return;
    }
    fullscreenOpener=document.activeElement instanceof HTMLElement?document.activeElement:null;
    fullscreenScroll={x:window.scrollX,y:window.scrollY};
    studioRoot.querySelectorAll<HTMLElement>('[data-workbench-popover]:popover-open').forEach(node=>node.hidePopover());
    fullscreen=true;fullscreenMode='fallback';lockPageScroll();
    try{
      if(studioRoot.requestFullscreen){await studioRoot.requestFullscreen();fullscreenMode='native';announceFallbackFullscreen(null);}
      else {announceFallbackFullscreen(studioRoot);notice='Der Planer füllt das Browserfenster. Ihr Browser unterstützt keinen Geräte-Vollbildmodus.';}
    }catch{announceFallbackFullscreen(studioRoot);notice='Der Planer füllt das Browserfenster. Ihr Browser erlaubt hier keinen Geräte-Vollbildmodus.';}
  }
  function syncFullscreen(){
    if(document.fullscreenElement===studioRoot){fullscreen=true;fullscreenMode='native';lockPageScroll();announceFallbackFullscreen(null);}
    else if(fullscreenMode==='native')finishFullscreen();
  }
  import ContourEditor from './studio/ContourEditor.svelte';
  import EdgeTreatmentEditor from './studio/EdgeTreatmentEditor.svelte';
  import GlyphLayoutDialog from './studio/GlyphLayoutDialog.svelte';
  import SourcePlanDialog from './studio/SourcePlanDialog.svelte';
  import ReleasePackages from './studio/ReleasePackages.svelte';
  import CompositeDialog from './studio/CompositeDialog.svelte';
  import VisualizationDialog from './studio/VisualizationDialog.svelte';
  import ConstraintDialog from './studio/ConstraintDialog.svelte';
  import MachiningEditor from './studio/MachiningEditor.svelte';
  import LayerEditor from './studio/LayerEditor.svelte';
  import WallGeometryEditor from './studio/WallGeometryEditor.svelte';
  import OpeningEditor from './studio/OpeningEditor.svelte';
  import RoomBoundaryEditor from './studio/RoomBoundaryEditor.svelte';
  import TechnicalReferencesEditor from './studio/TechnicalReferencesEditor.svelte';
  import SelectionMoveEditor from './studio/SelectionMoveEditor.svelte';
  import ComparisonDetails from './studio/ComparisonDetails.svelte';
  import type{CameraAction,CameraCommand}from'./studio/camera-navigation.ts';
  let constraintOpen=$state(false);
  let compositeOpen=$state(false),visualizationOpen=$state(false),visualizationMode=$state<'plan'|'photo'>('plan');
  let sourcePlanOpen=$state(false),sourceReferenceId=$state('');
  let glyphLayoutOpen=$state(false);
  let{data}:{data:AppData}=$props();
  const planningDocuments=$derived([...new Map([...(data.related?.documents??[]),...librarySources].map(row=>[row.version_id??row.id,row])).values()]);

  type History={operations:DesignOperation[];inverse:DesignOperation[]|null;before:DesignSnapshot;after:DesignSnapshot};
  let snapshot:DesignSnapshot|null=$state(null),baseRevisionId=$state(''),baseVersion=$state(0),loadedSource=$state(''),pending:DesignOperation[]=$state([]),history:History[]=$state([]),redo:History[]=$state([]);
  let multiSelect=$state(false),snapMarker:{point:Point2;radius:number}|null=$state(null);
  let selectedIds:string[]=$state([]),view:DesignView|'3d'=$state('front'),mode:'select'|'move'|'pan'=$state('move'),zoom=$state(1),panX=$state(0),panY=$state(0),grid=$state(true),snap=$state(true),gridSize=$state('10');
  let saving=$state(false),error=$state(''),notice=$state(''),conflict:any=$state(null),localAvailable=$state(true),mounted=$state(false),lastSaved=$state(''),addKind=$state(''),leftPanel=$state(true),rightPanel=$state(true),tab=$state('properties'),treeFilter=$state(''),selectedPhase=$state('all'),historicalId=$state(''),compareId=$state(''),variantName=$state(''),approvalKind=$state('design'),statement=$state(''),releaseReason=$state(''),approvalOpen=$state(false),releaseOpen=$state(false),revisionName=$state('');
  let compactWorkbench=$state(false);
  let displayOptionsOpen=$state(false);
  let projectMenu=$state<HTMLDivElement>(),displayMenu=$state<HTMLDivElement>(),addMenu=$state<HTMLDivElement>();
  function openInspector(next='properties'){if(next==='checks')planningStep='review';else if(next==='images')planningStep='output';else if(next==='properties'&&['review','output'].includes(planningStep))planningStep='geometry';tab=next;rightPanel=true;if(compactWorkbench)leftPanel=false;}
  function toggleElementPanel(){leftPanel=!leftPanel;if(compactWorkbench&&leftPanel)rightPanel=false;}
  function togglePropertiesPanel(){rightPanel=!rightPanel;if(rightPanel){tab='properties';if(compactWorkbench)leftPanel=false;}}
  function projectAction(action:()=>void){projectMenu?.hidePopover();action();}
  function chooseAdd(kind:string){addMenu?.hidePopover();addKind=kind;}
  function selectFromTree(id:string,event:MouseEvent){select(id,event);if(compactWorkbench&&!multiSelect&&!event.shiftKey){leftPanel=false;void tick().then(()=>canvas?.focus({preventScroll:true}));}}
  let projectName=$state(''),projectKind:'memorial'|'room_plan'=$state('memorial'),orderId=$state(''),siteId=$state(''),gravePlotId=$state(''),creating=$state(false);
  let appliedOrderContext:string|null=null;
  const projectOrder=$derived((data.lookups?.orders??[]).find(order=>order.id===data.summary?.projectOrderId)??null);
  const projectListHref=$derived(data.detail?.order_id?`/studio?order=${encodeURIComponent(data.detail.order_id)}`:projectOrder?`/studio?order=${encodeURIComponent(projectOrder.id)}`:'/studio');
  const canViewOrders=$derived(!!data.context?.permissions?.some(permission=>permission==='*'||permission==='orders'||permission.startsWith('orders.')));
  $effect(()=>{if(!data.detail&&appliedOrderContext!==(projectOrder?.id??'')){appliedOrderContext=projectOrder?.id??'';orderId=projectOrder?.id??'';}});
  let prerequisiteKind=$state('');let prerequisiteDone:(id:string)=>void=()=>{};
  let renderProfile=$state<'preview'|'final'>('preview');
  let ThreePreview:Component<any>|null=$state(null),threeLoading=$state(false),threeReset=$state(0);
  let threeCameraCommand:CameraCommand|null=$state(null),threeZoom=$state(1),cameraCommandNumber=0,renderRequestBusy=$state(false),renderStatusBusy=$state(false);
  let outgoing:{base_revision_id:string;expected_version:number;operations:DesignOperation[];idempotency_key:string;count:number}|null=$state(null);
  let leaveDialog:HTMLDialogElement,leaveOpen=$state(false),navigationBusy=$state(false),navigationError=$state(''),pendingNavigation=$state('');
  let permittedNavigation:string|null=null;
  const hasUnsentChanges=$derived(pending.length>0||saving||!!outgoing);
  function viewOnlyNavigation(url:URL|null){if(!url||url.pathname!==page.url.pathname||!snapshot)return false;return (url.searchParams.get('variant')??variants[0]?.id)===snapshot.variantId;}
  beforeNavigate(navigation=>{
    if(permittedNavigation&&navigation.to?.url.href===permittedNavigation){permittedNavigation=null;return;}
    if(!snapshot||!hasUnsentChanges||viewOnlyNavigation(navigation.to?.url??null))return;
    navigation.cancel();
    // SvelteKit invokes the browser's own close/reload confirmation for unloads.
    if(navigation.willUnload)return;
    pendingNavigation=navigation.to?.url.href??'';navigationError='';leaveOpen=true;
    void tick().then(()=>{if(leaveOpen&&!leaveDialog.open)leaveDialog.showModal();});
  });
  function beforeUnload(event:BeforeUnloadEvent){if(hasUnsentChanges&&!permittedNavigation){event.preventDefault();event.returnValue='';}}
  function continueEditing(){if(navigationBusy)return;leaveOpen=false;pendingNavigation='';navigationError='';leaveDialog?.close();}
  async function continueNavigation(saveFirst:boolean){
    if(navigationBusy||saving||!pendingNavigation)return;
    navigationBusy=true;navigationError='';
    try{
      if(saveFirst){while(pending.length){if(!(await save())||conflict||error){navigationError=error||'Der Plan konnte nicht gespeichert werden. Bleiben Sie hier und prüfen Sie die Hinweise.';return;}}if(saving||outgoing){navigationError='Bitte warten Sie, bis der laufende Speichervorgang abgeschlossen ist.';return;}}
      // Session backup is best effort; it is never represented as a server save.
      storeLocal();const href=pendingNavigation;permittedNavigation=href;leaveOpen=false;leaveDialog.close();
      await goto(href);pendingNavigation='';
    }catch(problem){navigationError=problem instanceof Error?problem.message:'Die nächste Seite konnte nicht geöffnet werden.';leaveOpen=true;await tick();if(!leaveDialog.open)leaveDialog.showModal();}
    finally{permittedNavigation=null;navigationBusy=false;}
  }
  let canvas:SVGSVGElement=$state() as SVGSVGElement,drag:{id:string|null;startX:number;startY:number;dx:number;dy:number;originalPanX:number;originalPanY:number;ids:string[];origin:Point2|null}|null=$state(null),snapLabel=$state('');
  const variants=$derived(data.related?.variants??[]),revisions=$derived(data.related?.revisions??[]),fonts=$derived(data.related?.fonts??[]),products=$derived([...new Map([...(data.related?.product_variants??data.related?.products??[]),...resolvedProducts].map((p:any)=>[p.product_variant_version_id??p.version_id??p.id,p])).values()]);
  const materials=$derived(data.lookups?.material_spec_versions??data.lookups?.['material-versions']??data.lookups?.material_specs??[]),stockItems=$derived(data.lookups?.stock_items??data.lookups?.stock??[]),edgeTreatments=$derived(data.lookups?.edge_treatment_versions??data.lookups?.['edge-treatments']??[]),finishes=$derived(data.lookups?.finish_spec_versions??data.lookups?.finishes??[]);
  const variant=$derived(variants.find((v:any)=>v.id===page.url.searchParams.get('variant'))??variants.find((v:any)=>v.id===snapshot?.variantId)??variants[0]);
  const sourceRevision=$derived(revisions.find((r:any)=>r.id===variant?.head_revision_id)??revisions.find((r:any)=>r.variant_id===variant?.id)??revisions[0]);
  const historical=$derived(historicalId?revisions.find((r:any)=>r.id===historicalId):null);
  const activeSnapshot=$derived(historical?parseSnapshot(historical.snapshot):snapshot);
  const hiddenWalls=$derived(activeSnapshot?hiddenWallIds(activeSnapshot,showWalls):new Set<string>());
  const selected=$derived(activeSnapshot?.elements.find(e=>e.id===selectedIds[0])??null),isHistoric=$derived(!!historical&&historical.id!==baseRevisionId);
  const inspectorTitle=$derived(tab==='properties'?(selected?.label??'Eigenschaften'):tab==='checks'?'Prüfstand':tab==='images'?'Bilder & Exporte':tab==='compare'?'Variantenvergleich':tab==='text'?'Wörtliche Textprüfung':tab==='bom'?'Stückliste':'Varianten & Revisionen');
  const validation=$derived(activeSnapshot?validateDesign(activeSnapshot):{blocking:[],warnings:[]}),releaseValidation=$derived(activeSnapshot?validateDesign(activeSnapshot,{forRelease:true}):{blocking:[],warnings:[]});
  const projection=$derived.by(()=>{if(!activeSnapshot)return null;const projected=projectDesign(activeSnapshot,view==='3d'?'front':view);return {...projected,shapes:projected.shapes.filter(shape=>!hiddenWalls.has(shape.elementId)),texts:projected.texts.filter(text=>!hiddenWalls.has(text.elementId))};}),bom=$derived(activeSnapshot?calculateBOM(activeSnapshot):null);
  function shapeMaterial(elementId:string){const element=activeSnapshot?.elements.find(e=>e.id===elementId),id=element?.kind==='stone_piece'?element.materialSpecVersionId:element?.kind==='surface'?element.layers.at(-1)?.materialSpecVersionId:null;return (data.related?.materials??[]).find((m:any)=>m.id===id);}
  async function importStoneLibrary(){try{const result=await command('catalog.stones.import',undefined,{});notice=result.added?`${result.added} reale Materialreferenzen ergänzt.`:'Die Steinbibliothek ist bereits vollständig geladen.';await invalidateAll();}catch(problem){error=(problem as Error).message;}}
  const font=$derived(selected?.kind==='inscription'?fonts.find((f:any)=>(f.version_id??f.id)===selected.fontVariantVersionId):null);
  const fontArticles=$derived(font?.material_references?Object.entries(font.material_references).flatMap(([key,values])=>(Array.isArray(values)?values:[]).map((value:any)=>({value:String(value),label:`${key==='B'?'Bronze':key==='A'?'Aluminium':key==='E'?'Edelstahl':key} · ${value}`}))):[]);
  let showTechnicalElements=$state(false);
  const technicalElementCount=$derived((activeSnapshot?.elements??[]).filter(e=>e.kind==='node'||e.kind==='dimension').length);
  const elements=$derived((activeSnapshot?.elements??[]).filter(e=>(showTechnicalElements||!!treeFilter||selectedIds.includes(e.id)||!['node','dimension'].includes(e.kind))&&(!treeFilter||e.label.toLocaleLowerCase('de').includes(treeFilter.toLocaleLowerCase('de')))&&(selectedPhase==='all'||e.phase===selectedPhase)));
  const bounds=$derived(projection?.bounds??{minX:0,minY:0,maxX:1000,maxY:1000,width:1000,height:1000});
  const pad=$derived(Math.max(bounds.width,bounds.height)*.14+20);
  const vb=$derived({x:bounds.minX-pad+panX,y:-bounds.maxY-pad+panY,width:(bounds.width+pad*2)/zoom,height:(bounds.height+pad*2)/zoom});
  const pixelScale=$derived(Math.max(vb.width/Math.max(1,canvasWidth),vb.height/Math.max(1,canvasHeight)));
  const visibleGridStep=$derived(displayGridStep(Number(parseMillimetres(gridSize)??'10'),pixelScale));
  const dimensions=$derived.by(()=>activeSnapshot&&view!=='3d'?projectDimensions(activeSnapshot,view).filter(dimension=>!hiddenWalls.has(dimension.elementId)):[]);
  const snapTargets=$derived.by(()=>activeSnapshot&&view!=='3d'?buildDesignSnapTargets(activeSnapshot,view,projection??undefined):[]);
  const selectedElements=$derived((activeSnapshot?.elements??[]).filter(e=>selectedIds.includes(e.id))),allSelectionLocked=$derived(selectedElements.length>0&&selectedElements.every(e=>e.locked));
  const syncLabel=$derived(conflict?'Konflikt prüfen':saving?'Wird gespeichert …':pending.length?'Änderungen ausstehend':lastSaved?'Synchronisiert':'Revision geladen');
  const canRelease=$derived(!!data.context?.permissions?.some(p=>p==='*'||p==='planning.release'||p==='planning.*'));
  const renderJobs=$derived(data.related?.render_jobs??[]),renderArtifacts=$derived(data.related?.render_artifacts??[]);
  const canEdit=$derived(!!data.context?.permissions?.some(p=>p==='*'||p==='planning'||p==='planning.*'||p==='planning.write'||p==='planning.manage'||p==='planning.project.create'));
  const storageKey=$derived.by(()=>`schubert-studio:${data.user?.id??'anonymous'}:${snapshot?.planningProjectId??''}:${snapshot?.variantId??''}`);
  const kindLabels:Record<string,string>={node:'Bezugsknoten',wall:'Wand',opening:'Öffnung',room:'Raum',stone_piece:'Naturstein',catalog_object:'Produkt',inscription:'Inschrift',group:'Gruppe',surface:'Fläche',machining:'Bearbeitung',connection:'Anschluss',clearance:'Freizone',slope:'Gefälle',technical_note:'Hinweis',grave_border:'Einfassung',dimension:'Bemaßung',plan_reference:'Quellplan / Foto'};
  $effect(()=>{if(!mounted)return;window.dispatchEvent(new CustomEvent('schubert:studio:selection',{detail:{variantId:snapshot?.variantId??null,selectedElementIds:selectedIds.filter(id=>snapshot?.elements.some(e=>e.id===id)).slice(0,20)}}));});
  onDestroy(()=>{if(typeof window!=='undefined'){window.dispatchEvent(new CustomEvent('schubert:studio:selection',{detail:{variantId:null,selectedElementIds:[]}}));if(document.fullscreenElement===studioRoot)void document.exitFullscreen().catch(()=>{});unlockPageScroll();announceFallbackFullscreen(null);}});
  function parseSnapshot(raw:any):DesignSnapshot|null{if(!raw)return null;try{return designSnapshotSchema.parse(typeof raw==='string'?JSON.parse(raw):raw);}catch{return null;}}
  $effect(()=>{const incoming=sourceRevision;const token=incoming?.id??'';if(token!==loadedSource){loadedSource=token;if(incoming){const parsed=parseSnapshot(incoming.snapshot);if(parsed){if(snapshot?.revisionId!==parsed.revisionId){if(snapshot?.variantId===parsed.variantId&&(pending.length||saving||outgoing)){conflict={message:'Der Server enthält inzwischen einen anderen Planstand. Ihre ungesendeten Änderungen bleiben erhalten. Prüfen Sie den Konflikt oder legen Sie eine getrennte Variante an.'};return;}snapshot=parsed;baseRevisionId=incoming.id;baseVersion=Number(variant?.version??0);pending=[];history=[];redo=[];outgoing=null;conflict=null;view=parsed.kind==='memorial'?'front':'top';selectedIds=[];restoreLocal();}}else error='Diese historische Schemaversion kann nicht sicher bearbeitet werden. Der Originalstand bleibt erhalten; technische Migration erforderlich.';}else if(!data.detail){snapshot=null;}}});
  onMount(()=>{
    mounted=true;
    const unregisterAssistant=registerStudioAssistant(async()=>{
      await tick();
      if(isHistoric)throw new Error('Öffnen Sie den aktuellen Planstand, um ihn mit der KI zu bearbeiten.');
      if(conflict)throw new Error('Bitte zuerst den Versionskonflikt im Plan klären.');
      if(saveInFlight&&!(await saveInFlight))throw new Error(error||'Der Plan konnte nicht gespeichert werden.');
      if(saving)throw new Error('Eine fachliche Bestätigung wird gerade gespeichert. Bitte kurz warten.');
      while(pending.length){if(!(await save()))throw new Error(error||'Den Plan zuerst speichern.');}
      if(isHistoric||conflict||hasUnsentChanges)throw new Error('Der Planstand hat sich geändert. Bitte die Anfrage erneut senden.');
      return studioContext();
    },(base,operations,result)=>{
      if(!snapshot||baseRevisionId!==base||pending.length||saving||outgoing||isHistoric||conflict)return false;
      const next=parseSnapshot(result.revision?.snapshot);if(!next||next.variantId!==snapshot.variantId)return false;
      const before=snapshot;let inverse:DesignOperation[]|null=null;try{inverse=inverseOperations(before,operations);}catch{}
      history=[...history,{operations,inverse,before,after:next}];redo=[];adoptResult(result);pending=[];
      if(!before.elements.length&&next.elements.length){const primary=next.elements.find(e=>next.kind==='memorial'?e.kind==='stone_piece':e.kind==='room');if(primary)selectedIds=[primary.id];if(!compactWorkbench){leftPanel=true;rightPanel=true;}tab='properties';}
      selectedIds=selectedIds.filter(id=>next.elements.some(e=>e.id===id));notice=inverse?'Änderung übernommen. Rückgängig bleibt verfügbar.':'Änderung übernommen. Frühere Planstände bleiben unter Stände verfügbar.';return true;
    });
    const narrow=window.matchMedia('(max-width:1100px)');
    let desktopPanels={left:leftPanel,right:rightPanel},previousCompact=false;
    const adapt=()=>{
      const compact=narrow.matches;
      if(compact&&!previousCompact){desktopPanels={left:leftPanel,right:rightPanel};leftPanel=false;rightPanel=false;}
      else if(!compact&&previousCompact){leftPanel=desktopPanels.left;rightPanel=desktopPanels.right;}
      compactWorkbench=compact;previousCompact=compact;
    };
    adapt();narrow.addEventListener('change',adapt);restoreLocal();
    const companionAction=(event:Event)=>{const action=(event as CustomEvent).detail?.action;if(!snapshot)return;if(action==='image'||action==='photo')void openVisualization(action==='photo'?'photo':'plan');else if(action==='exports')openInspector('images');};
    window.addEventListener('schubert:studio:action',companionAction);
    return()=>{unregisterAssistant();mounted=false;narrow.removeEventListener('change',adapt);window.removeEventListener('schubert:studio:action',companionAction);};
  });
  function restoreLocal(){if(!mounted||!snapshot)return;try{const stored=JSON.parse(sessionStorage.getItem(storageKey)||'null');if(stored?.baseRevisionId===baseRevisionId&&stored.operations?.length&&!pending.length){snapshot=applyOperations(snapshot,stored.operations);pending=stored.operations;notice='Nicht synchronisierte Änderungen aus dieser Sitzung wiederhergestellt.';}else if(stored?.operations?.length&&stored.baseRevisionId!==baseRevisionId){conflict={message:'Lokaler Entwurf basiert auf einer älteren Revision.',stored};}}catch{localAvailable=false;}}
  function storeLocal(){if(!mounted||!snapshot)return;const payload={baseRevisionId,operations:pending,savedAt:new Date().toISOString()};try{if(pending.length)sessionStorage.setItem(storageKey,JSON.stringify(payload));else sessionStorage.removeItem(storageKey);}catch{localAvailable=false;}}
  $effect(()=>{storeLocal();});
  $effect(()=>{if(mounted&&pending.length&&!saving&&!conflict&&!error&&!leaveOpen&&!navigationBusy&&data.connected){const timeout=setTimeout(()=>void save(),1600);return()=>clearTimeout(timeout);}});
  async function createProject(event:SubmitEvent){event.preventDefault();creating=true;error='';try{const result=await command('planning.project.create',undefined,{name:projectName,kind:projectKind,...(orderId?{order_id:orderId}:{}),...(projectKind==='room_plan'&&siteId?{site_id:siteId}:{}),...(projectKind==='memorial'&&gravePlotId?{grave_plot_id:gravePlotId}:{})});await goto(`/studio/${result.project.id}?variant=${result.variant.id}`);await invalidateAll();}catch(e){error=(e as Error).message;}finally{creating=false;}}
  function applyBatch(operations:DesignOperation[],id?:string,track=true){if(!snapshot||isHistoric)throw new Error('Diesen historischen Stand zuerst als neue Variante öffnen.');if(!canEdit)throw new Error('Zum Bearbeiten fehlt die Planungsberechtigung.');const before=snapshot;const after=applyOperations(before,operations);let inverse:DesignOperation[]|null=null;try{inverse=inverseOperations(before,operations);}catch{/* Atomic batches can have temporary forward references. */}snapshot=after;pending=[...pending,...operations];error='';notice='';if(track){history=[...history,{operations,inverse,before,after}];redo=[];}if(id){selectedIds=[id];if(!compactWorkbench){leftPanel=true;rightPanel=true;}tab='properties';if(after.elements.find(e=>e.id===id)?.kind==='inscription')planningStep='design';}}
  function edit(operations:DesignOperation[]){try{if(operations.some(o=>['confirm_design_target','confirm_survey_measurement','set_inscription_originals','confirm_contour_import'].includes(o.type)))void reviewMeasures(operations);else applyBatch(operations);}catch(e){error=(e as Error).message;}}
  async function reviewMeasures(operations:DesignOperation[]){if(!snapshot||!canEdit||isHistoric)return;try{if(pending.length&&!(await save()))return;await sendDirect(operations);notice='Fachliche Bestätigung auf dem Server gespeichert.';}catch(e){error=(e as Error).message;}}
  async function sendDirect(operations:DesignOperation[]){if(!snapshot||saving)throw new Error('Bitte den laufenden Speichervorgang abwarten.');saving=true;try{const response=await feedbackFetch(`/api/v1/designs/${snapshot.variantId}/commands`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_revision_id:baseRevisionId,expected_version:baseVersion,operations,idempotency_key:crypto.randomUUID()})});const payload=await response.json();if(!response.ok){if(response.status===409)conflict=payload;throw new Error(payload.error?.message??payload.message??'Fachliche Bestätigung konnte nicht gespeichert werden.');}const remaining=$state.snapshot(pending);adoptResult(payload.result??payload);pending=remaining;if(remaining.length)snapshot=applyOperations(snapshot!,remaining);await invalidateAll();}finally{saving=false;}}
  function adoptResult(result:any){const next=parseSnapshot(result.revision?.snapshot);if(!next)throw new Error('Serverantwort enthält keinen gültigen Planstand.');snapshot=next;baseRevisionId=result.revision.id;baseVersion=Number(result.variant.version);lastSaved=new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});}
  let saveInFlight:Promise<boolean>|null=null;
  function save():Promise<boolean>{if(saveInFlight)return saveInFlight;saveInFlight=saveNow().finally(()=>{saveInFlight=null;});return saveInFlight;}
  async function saveNow():Promise<boolean>{if(!snapshot||saving||conflict||isHistoric)return false;if(!pending.length)return true;saving=true;error='';try{
    outgoing??={base_revision_id:baseRevisionId,expected_version:baseVersion,operations:$state.snapshot(pending),idempotency_key:crypto.randomUUID(),count:pending.length};const batch=outgoing;
    const {count:_count,...body}=batch;const response=await feedbackFetch(`/api/v1/designs/${snapshot.variantId}/commands`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const payload=await response.json();
    if(!response.ok){if(response.status===409){conflict=payload;throw new Error('Eine andere Änderung hat diesen Variantenstand fortgeschrieben. Ihr lokaler Entwurf bleibt erhalten.');}outgoing=null;throw new Error(payload.error?.message??payload.message??'Plan konnte nicht gespeichert werden.');}
    const remaining=pending.slice(batch.count);adoptResult(payload.result??payload);pending=remaining;if(remaining.length)snapshot=applyOperations(snapshot!,remaining);outgoing=null;try{await invalidateAll();}catch{notice='Änderungen sind gespeichert. Die Ansicht bei wiederhergestellter Verbindung neu laden.';}return true;
  }catch(e){error=e instanceof TypeError?'Der Server ist derzeit nicht erreichbar. Ihre Änderungen bleiben in dieser Sitzung erhalten. Speichern Sie erneut, sobald die Verbindung wieder besteht.':(e as Error).message;return false;}finally{saving=false;}}
  function undo(){if(!snapshot||!history.length||saving||outgoing)return;const step=history[history.length-1];try{
    if(pending.length>=step.operations.length&&JSON.stringify(pending.slice(-step.operations.length))===JSON.stringify(step.operations)){snapshot=step.before;pending=pending.slice(0,-step.operations.length);}
    else if(step.inverse){applyBatch(step.inverse,undefined,false);}else{notice='Dieser Nachweis bleibt versioniert. Nutzen Sie für eine Korrektur einen neuen fachlichen Änderungsstand.';return;}
    history=history.slice(0,-1);redo=[...redo,step];error='';
  }catch(e){error=(e as Error).message;}}
  function redoAction(){if(!redo.length||saving||outgoing)return;const step=redo[redo.length-1];try{applyBatch(step.operations,undefined,false);history=[...history,step];redo=redo.slice(0,-1);}catch(e){error=(e as Error).message;}}
  function select(id:string,event?:MouseEvent|KeyboardEvent){if(event?.shiftKey||multiSelect)selectedIds=selectedIds.includes(id)?selectedIds.filter(v=>v!==id):[...selectedIds,id];else selectedIds=[id];const item=snapshot?.elements.find(e=>e.id===id);if(item?.kind==='inscription')planningStep='design';else if(['review','output'].includes(planningStep))planningStep='geometry';tab='properties';}
  function path(shape:ViewShape){return shape.points.map((p,i)=>`${i?'L':'M'} ${p.xMm} ${-Number(p.yMm)}`).join(' ')+(shape.closed?' Z':'')+' '+shape.holes.map(h=>h.map((p,i)=>`${i?'L':'M'} ${p.xMm} ${-Number(p.yMm)}`).join(' ')+' Z').join(' ');}
  function fit(){zoom=1;panX=0;panY=0;threeReset++;}
  function navigateCamera(action:CameraAction){threeCameraCommand={id:++cameraCommandNumber,action};}
  function changeZoom(larger:boolean){if(view==='3d')navigateCamera(larger?'zoom_in':'zoom_out');else {const next=larger?Math.min(12,zoom*1.25):Math.max(.15,zoom/1.25);panX=centeredZoom(panX,bounds.width+pad*2,zoom,next);panY=centeredZoom(panY,bounds.height+pad*2,zoom,next);zoom=next;}}
  async function setView(next:DesignView|'3d'){if(view!==next){zoom=1;panX=0;panY=0;}if(view!==next&&next==='3d'){threeCameraCommand=null;threeZoom=1;}view=next;if(next==='3d'&&!ThreePreview){threeLoading=true;try{ThreePreview=(await import('./studio/ThreePreview.svelte')).default;}catch(e){error='Die 3D-Ansicht konnte nicht geladen werden.';}finally{threeLoading=false;}}}
  function parentDelta(e:DesignElement,dx:number,dy:number):Point3{const world=view==='top'?[dx,dy,0]:view==='side'?[0,dx,dy]:[dx,0,dy];const matrix=worldMatrix(snapshot!,e.kind==='inscription'?e.surfaceElementId:e.kind==='machining'||e.kind==='slope'?e.hostElementId:e.parentId);const local=[0,1,2].map(col=>matrix[col]*world[0]+matrix[4+col]*world[1]+matrix[8+col]*world[2]);return e.kind==='inscription'?{xMm:mm(local[0]),yMm:'0',zMm:mm(local[1])}:{xMm:mm(local[0]),yMm:mm(local[1]),zMm:mm(local[2])};}
  function worldDelta(dx:number,dy:number):Point3{return view==='top'?{xMm:mm(dx),yMm:mm(dy),zMm:'0'}:view==='side'?{xMm:'0',yMm:mm(dx),zMm:mm(dy)}:{xMm:mm(dx),yMm:'0',zMm:mm(dy)};}
  function moveSelection(dx:number,dy:number,ids=selectedIds){if(!snapshot||!ids.length)return;try{const deltaWorld=worldDelta(dx,dy);if(!selectionMoveOperations(snapshot,ids,deltaWorld).length){notice='In dieser Richtung ist keine unabhängige Lageänderung möglich. Die zugehörigen Bezugselemente im Formular bearbeiten.';return;}edit([{type:'move_selection',elementIds:[...ids],deltaWorld}]);}catch(problem){error=(problem as Error).message;}}
  function startPointer(event:PointerEvent,id:string|null=null){if(event.button!==0)return;if(mode==='move'&&id){if(event.shiftKey)select(id,event as unknown as MouseEvent);else if(!selectedIds.includes(id))selectedIds=multiSelect?[...selectedIds,id]:[id];tab='properties';}if(mode==='pan'||(mode==='move'&&id&&selectedIds.includes(id)&&!isHistoric&&canEdit&&!activeSnapshot?.elements.find(e=>e.id===id)?.locked)){canvas.setPointerCapture(event.pointerId);const matrix=canvas.getScreenCTM(),at=matrix?new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse()):null,origin=id&&at?designSnapOrigin(snapTargets,id,{xMm:mm(at.x),yMm:mm(-at.y)})??projection?.shapes.find(shape=>shape.elementId===id)?.points[0]??null:null;snapMarker=null;snapLabel='';drag={id:mode==='pan'?null:id,ids:mode==='pan'?[]:[...selectedIds],origin,startX:event.clientX,startY:event.clientY,dx:0,dy:0,originalPanX:panX,originalPanY:panY};event.preventDefault();event.stopPropagation();}}
  function movePointer(event:PointerEvent){if(!drag||!canvas)return;const rect=canvas.getBoundingClientRect(),scale=Math.max(vb.width/rect.width,vb.height/rect.height);let dx=(event.clientX-drag.startX)*scale,dy=-(event.clientY-drag.startY)*scale;if(!drag.id){panX=drag.originalPanX-dx;panY=drag.originalPanY+dy;return;}snapLabel='';snapMarker=null;if((snap||gridSnap)&&!event.altKey&&activeSnapshot&&drag.origin){const excluded=new Set(drag.ids.flatMap(id=>[...movingSnapElementIds(activeSnapshot!,id)])),result=findDesignSnap(snap?snapTargets:[],{xMm:mm(Number(drag.origin.xMm)+dx),yMm:mm(Number(drag.origin.yMm)+dy)},8*scale,excluded,gridSnap?Number(parseMillimetres(gridSize)??'10'):null);if(result){dx=Number(result.point.xMm)-Number(drag.origin.xMm);dy=Number(result.point.yMm)-Number(drag.origin.yMm);snapLabel=result.label;snapMarker={point:result.point,radius:6*scale};}}drag={...drag,dx,dy};}
  function endPointer(event:PointerEvent){if(!drag)return;const current=drag;drag=null;snapLabel='';snapMarker=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);if(current.id&&(current.dx||current.dy))moveSelection(current.dx,current.dy,current.ids);}
  function onKeys(event:KeyboardEvent){
    const target=event.target instanceof Element?event.target:null;
    if(event.defaultPrevented||document.querySelector('dialog[open]')||studioRoot?.querySelector('[popover]:popover-open'))return;
    if(event.key==='Escape'&&fullscreen){if(fullscreenMode==='fallback'){event.preventDefault();finishFullscreen();}return;}
    if(target?.closest('input,textarea,select,[contenteditable="true"],[role="combobox"]'))return;
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redoAction():undo();}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();void save();}
    if(event.key==='Escape'&&(selectedIds.length||addKind)){event.preventDefault();selectedIds=[];addKind='';}
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&view!=='3d'&&!target?.closest('button,a,summary')&&selected&&!selected.locked&&!isHistoric){event.preventDefault();const amount=event.shiftKey?10:1;moveSelection(event.key==='ArrowLeft'?-amount:event.key==='ArrowRight'?amount:0,event.key==='ArrowDown'?-amount:event.key==='ArrowUp'?amount:0);}
  }
  function changePosition(axis:'xMm'|'yMm'|'zMm',value:string){if(!selected)return;const n=parseMillimetres(value);if(n===null){error='Position bitte eindeutig in mm eingeben.';return;}const position='transform'in selected?selected.transform.position:'point'in selected?selected.point:null;if(position)edit([{type:'set_element_position',elementId:selected.id,position:{...position,[axis]:n}}]);}
  function duplicate(){if(!snapshot)return;try{const operations:DesignOperation[]=selectedIds.map(id=>({type:'duplicate_element',elementId:id,newId:crypto.randomUUID(),offset:{xMm:'20',yMm:'0',zMm:'0'}}));applyBatch(operations);selectedIds=operations.map(op=>'newId'in op?op.newId:'').filter(Boolean);}catch(problem){error=(problem as Error).message;}}
  function removeSelection(){if(!snapshot)return;try{let candidate=snapshot;const operations:DesignOperation[]=[];for(const id of selectedIds){if(!candidate.elements.some(e=>e.id===id))continue;const operation:DesignOperation={type:'remove_element',elementId:id,cascade:true};candidate=applyOperations(candidate,[operation]);operations.push(operation);}const removed=snapshot.elements.filter(e=>!candidate.elements.some(n=>n.id===e.id)),dependent=removed.filter(e=>!selectedIds.includes(e.id));if(dependent.length&&!window.confirm(`Mit der Auswahl werden ${dependent.length} abhängige Elemente entfernt: ${dependent.slice(0,6).map(e=>e.label).join(', ')}${dependent.length>6?' …':''}. Entfernen?`))return;applyBatch(operations);selectedIds=[];}catch(e){error=(e as Error).message;}}
  async function createVariant(baseId=baseRevisionId){if(!snapshot)return;error='';try{const preserving=!!conflict,localOps=$state.snapshot(pending);if(pending.length&&!preserving&&!(await save()))return;const result=await command('planning.variant.create',undefined,{planning_project_id:snapshot.planningProjectId,name:variantName.trim()||`Variante ${variants.length+1}`,base_revision_id:baseId});const nextVariant=result.variant??result;
    if(preserving&&localOps.length){const response=await feedbackFetch(`/api/v1/designs/${nextVariant.id}/commands`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_revision_id:result.revision?.id??nextVariant.head_revision_id,expected_version:Number(nextVariant.version),operations:localOps,idempotency_key:crypto.randomUUID()})});const payload=await response.json();if(!response.ok)throw new Error(payload.error?.message??'Getrennte Variante wurde angelegt; lokale Änderungen bleiben für die manuelle Übernahme erhalten.');if(JSON.stringify(pending)!==JSON.stringify(localOps)){notice='Die getrennte Variante enthält den angeforderten Entwurf. Währenddessen hinzugefügte Änderungen bleiben hier erhalten; prüfen und speichern Sie diese vor dem Wechsel.';await invalidateAll();return;}pending=[];outgoing=null;conflict=null;}
    await goto(`/studio/${snapshot.planningProjectId}?variant=${nextVariant.id}`);variantName='';historicalId='';await invalidateAll();}catch(e){error=(e as Error).message;}}
  let checkpointRequest:{fingerprint:string;key:string}|null=$state(null);
  async function nameRevision(event:SubmitEvent){event.preventDefault();if(!snapshot||isHistoric||saving||!revisionName.trim())return;error='';try{if(pending.length&&!(await save()))return;const name=revisionName.trim(),fingerprint=JSON.stringify({base:baseRevisionId,name});if(checkpointRequest?.fingerprint!==fingerprint)checkpointRequest={fingerprint,key:crypto.randomUUID()};saving=true;const result=await command('planning.revision.checkpoint',snapshot.variantId,{base_revision_id:baseRevisionId,name},baseVersion,checkpointRequest.key),remaining=$state.snapshot(pending);adoptResult(result);pending=remaining;if(remaining.length)snapshot=applyOperations(snapshot!,remaining);checkpointRequest=null;revisionName='';notice='Der benannte Stand ist als eigene unveränderliche Revision gespeichert.';try{await invalidateAll();}catch{notice+=' Die Ansicht bei wiederhergestellter Verbindung neu laden.';}}catch(problem){error=(problem as Error).message;}finally{saving=false;}}
  async function approve(event:SubmitEvent){event.preventDefault();if(!snapshot)return;try{if(pending.length&&!(await save()))return;await command('planning.approval.create',undefined,{variant_id:snapshot.variantId,revision_id:baseRevisionId,kind:approvalKind,statement});notice='Die Zustimmung wurde an genau diese Revision gebunden.';approvalOpen=false;statement='';await invalidateAll();}catch(e){error=(e as Error).message;}}
  async function release(event:SubmitEvent){event.preventDefault();if(!snapshot)return;try{if(pending.length&&!(await save()))return;await command('planning.manufacturing.release',undefined,{variant_id:snapshot.variantId,revision_id:baseRevisionId,reason:releaseReason});notice='Fertigungsfreigabe angefordert. Das Paket ist erst nach vollständiger Artefaktprüfung verwendbar.';releaseOpen=false;await invalidateAll();}catch(e){error=(e as Error).message;}}
  async function requestRender(){if(!snapshot||renderRequestBusy)return;renderRequestBusy=true;try{if(pending.length&&!(await save()))return;const result=await command('planning.render.request',undefined,{variant_id:snapshot.variantId,revision_id:baseRevisionId,profile:renderProfile});notice=result.status==='unavailable'?'Renderdienst ist noch nicht betriebsbereit. Der Auftrag zeigt diesen Zustand in der Verarbeitung.':result.message??'Renderauftrag gespeichert. Den Stand der Verarbeitung mit „Renderstatus aktualisieren“ abrufen.';await invalidateAll();}catch(e){error=(e as Error).message;}finally{renderRequestBusy=false;}}
  async function refreshRenderStatus(){if(renderStatusBusy)return;renderStatusBusy=true;try{await invalidateAll();}catch{error='Der Renderstatus konnte gerade nicht abgerufen werden. Bitte später erneut versuchen.';}finally{renderStatusBusy=false;}}
  async function openVisualization(intent:'plan'|'photo'='plan'){planningStep='output';visualizationMode=intent;if(pending.length&&!(await save()))return;visualizationOpen=true;}
  async function openComposite(){if(pending.length&&!(await save()))return;compositeOpen=true;}
  async function replaceCatalog(versionId:string,assetId:string|null=null){if(selected?.kind!=='catalog_object'||!versionId)return;const elementId=selected.id,variantId=snapshot?.variantId;try{const product=await frozenProductVersion(versionId);if(snapshot?.variantId!==variantId||selected?.id!==elementId)return;resolvedProducts=[...resolvedProducts.filter(p=>p.id!==product.id),product];edit([{type:'replace_product_variant',elementId,productVariantVersionId:versionId,assetVersionId:assetId,accuracy:'verified_envelope',footprint:rectangleContour(String(product.width_mm),String(product.depth_mm))}]);if(!error)notice=`Produktstand als Entwurf gewählt: ${product.width_mm} × ${product.depth_mm} × ${product.height_mm??'Höhe offen'} mm. ${selected.connectionElementIds.length} Anschlussbezug / ${selected.clearanceElementIds.length} Freiraumbezug: Lage, Montage, benachbarte Ausschnitte und zugehörige Preisfassung prüfen. Der Produktwechsel bestätigt keine Ausführung.`;}catch(problem){error=(problem as Error).message;}}
  async function repairIssue(raw:string){const issue=describeStudioIssue(activeSnapshot,raw);if(!issue.elementId)return;selectedIds=[issue.elementId];openInspector('properties');const binding=activeSnapshot?.constraints.find(c=>raw.includes(c.id)||c.measureId===issue.measureId);if(binding)constraintOpen=true;await tick();const target=issue.measureId?document.querySelector<HTMLElement>(`[data-measure-id="${CSS.escape(issue.measureId)}"]`):binding?document.querySelector<HTMLElement>(`[data-constraint-id="${CSS.escape(binding.id)}"]`):document.querySelector<HTMLElement>('.inspector-body');target?.scrollIntoView({block:'center',behavior:'smooth'});target?.querySelector<HTMLElement>('input:not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(:disabled)')?.focus();}
  async function exportPlan(kind:string){if(!snapshot)return;if(pending.length&&!(await save()))return;window.open(`/api/v1/designs/${snapshot.variantId}/export?kind=${kind}&view=${view==='3d'?'front':view}&revision_id=${activeSnapshot?.revisionId??baseRevisionId}`,'_blank','noopener');}
  function imageUrl(entry:any):string|null{try{const url=new URL(entry?.thumbnail_url??entry?.image_url??'');return url.protocol==='https:'&&url.hostname==='shop.strassacker.com'&&url.pathname.startsWith('/fonts/')?url.href:null;}catch{return null;}}
  function changeFont(id:string){if(selected?.kind!=='inscription')return;const ref=fonts.find((f:any)=>(f.version_id??f.id)===id);edit([{type:'set_inscription_layout',elementId:selected.id,fontVariantVersionId:id,referenceAssetVersionIds:[],renderingBasis:'shop_image_reference',glyphPlacements:[],supplyForm:ref?.supply_form??selected.supplyForm,materialArticleReference:null}]);}
  function changeUV(axis:'uMm'|'vMm',value:string){if(selected?.kind!=='inscription')return;const n=parseMillimetres(value);if(n===null){error='Position bitte in mm eingeben.';return;}edit([{type:'set_inscription_layout',elementId:selected.id,originUV:{...selected.originUV,[axis]:n}}]);}
  const comparedSnapshot=$derived.by(()=>{const v=variants.find((v:any)=>v.id===compareId),r=revisions.find((r:any)=>r.id===v?.head_revision_id);return parseSnapshot(r?.snapshot);});
  function comparison(){return comparedSnapshot?calculateBOM(comparedSnapshot):null;}
  function downloadLocal(){if(!snapshot)return;const blob=new Blob([JSON.stringify({base_revision_id:baseRevisionId,expected_version:baseVersion,operations:pending,snapshot},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='schubert-plan-lokaler-entwurf.json';a.click();URL.revokeObjectURL(url);}
</script>

<svelte:window onkeydown={onKeys} onbeforeunload={beforeUnload}/><svelte:document onfullscreenchange={syncFullscreen}/>
<div class="studio-root" class:workbench={!!snapshot&&!!data.detail} class:is-fullscreen={fullscreen} data-compact={compactWorkbench} data-fullscreen-mode={fullscreenMode} bind:this={studioRoot} use:workbenchViewport={!!snapshot&&!!data.detail}>
{#if !data.detail}
  <div class="page-heading"><div><h1>Planungsstudio</h1><p>Grabmale und Räume. Eine Planung verbindet Maße, Gestaltung, Stückliste und Freigaben.</p></div></div>
  {#if projectOrder}<div class="order-context"><span>Planungen zu <strong>{projectOrder.name}</strong></span>{#if canViewOrders}<a class="text-link" href={`/orders/${projectOrder.id}`}>Zum Auftrag<Icon name="arrow" size={14}/></a>{/if}<a class="text-link" href="/studio">Alle Planungen</a></div>{/if}
  {#if error}<div class="notice danger" role="alert">{error}</div>{/if}
  <section class="studio-entry"><div class="entry-intro"><h2>Was möchten Sie planen?</h2><p>Öffnen Sie einen vorhandenen Entwurf oder beginnen Sie mit einem konkreten Objekt. Fehlende Maße bleiben sichtbar.</p><div class="entry-types" data-tour="studio-types"><button class:chosen={projectKind==='memorial'} onclick={()=>projectKind='memorial'}><Icon name="pen" size={23}/><span>Grabmalstudio<small>Stein, Inschrift & Erinnerung</small></span><Icon name="arrow" size={18}/></button><button class:chosen={projectKind==='room_plan'} onclick={()=>projectKind='room_plan'}><Icon name="box" size={23}/><span>Raum & Naturstein<small>Aufmaß, Bauteile & Material</small></span><Icon name="arrow" size={18}/></button></div></div><form class="project-form" onsubmit={createProject}><h3>Neues Planungsprojekt</h3><label>Projektname<input bind:value={projectName} required placeholder={projectKind==='memorial'?'Zum Beispiel Grabmal Familie Weber':'Zum Beispiel Bad Erdgeschoss'}/></label><label>Auftragsbezug<select use:searchableSelect={orderId} bind:value={orderId}><option value="">Später zuordnen</option>{#each data.lookups?.orders??[] as order}<option value={order.id}>{order.name}</option>{/each}</select></label><label>{projectKind==='memorial'?'Grabstätte':'Objekt / Baustelle'}<select use:searchableSelect={projectKind==='memorial'?gravePlotId:siteId} value={projectKind==='memorial'?gravePlotId:siteId} onchange={(e)=>{if(projectKind==='memorial')gravePlotId=e.currentTarget.value;else siteId=e.currentTarget.value;}}><option value="">Später zuordnen</option>{#each (projectKind==='memorial'?(data.lookups?.grave_plots??[]):(data.lookups?.sites??[])) as item}<option value={item.id}>{item.name}</option>{/each}</select></label><button class="btn primary" type="submit" disabled={creating||!canEdit}><Icon name="plus" size={17}/>{creating?'Wird angelegt …':'Planung beginnen'}</button><p class="small muted">Alle Entwürfe sind versioniert. Freigaben erfolgen auf einem bestimmten Planstand.</p></form></section>
  <section class="project-list"><header><h2>{projectOrder?'Planungen zu diesem Auftrag':'Ihre Planungen'}</h2><span>{data.records.length} angezeigt</span></header><form class="project-search" action="/studio" method="GET">{#if projectOrder}<input type="hidden" name="order" value={projectOrder.id}/>{/if}<label class="sr-only" for="studio-project-search">Planung suchen</label><input id="studio-project-search" type="search" name="q" maxlength="120" value={data.summary?.projectSearch??''} placeholder="Projektname suchen …"/><button class="btn" type="submit"><Icon name="search" size={16}/>Suchen</button>{#if data.summary?.projectSearch}<a class="btn" href={projectListHref}>Zurücksetzen</a>{/if}</form>{#each data.records as project}<a href={`/studio/${project.id}`}><span class="project-icon"><Icon name={project.kind==='memorial'?'pen':'box'} size={20}/></span><span><strong>{recordName(project)}</strong><small>{project.kind==='memorial'?'Grabmalstudio':'Raum & Naturstein'} · {statuses[project.status]??'Entwurf'}</small></span><Icon name="arrow" size={18}/></a>{:else}<p class="empty-projects">{data.summary?.projectSearch?'Keine Planung zu diesem Namen gefunden. Ändern Sie den Suchbegriff.':projectOrder?'Zu diesem Auftrag gibt es noch keine Planung. Beginnen Sie oben mit dem ersten Entwurf.':'Hier erscheinen Ihre ersten Planungen. Legen Sie oben ein Projekt an.'}</p>{/each}{#if data.summary?.projectNext}<footer><a class="btn" href={data.summary.projectNext}>Weitere Planungen<Icon name="arrow" size={15}/></a></footer>{/if}</section>
  <section class="library-section"><h2>Objekte & Planungsbibliotheken</h2>{#if data.context?.permissions?.some(p=>p==='*'||p==='catalog'||p==='catalog.*')}<button class="btn" onclick={importStoneLibrary}>Steinbibliothek ergänzen</button>{/if}<p>Eigene Quellen, geprüfte Materialien und reale Herstellerfassungen vorbereiten.</p><div>{#each [['buildings','Gebäude'],['floors','Geschosse'],['rooms','Räume'],['materials','Materialien'],['material-versions','Materialstände'],['product-variants','Produktausführungen'],['product-versions','Produktstände'],['product-availability','Verfügbarkeitsauskünfte'],['product-assets','Herstellerdateien'],['fonts','80 Schriftreferenzen'],['glyph-library','Originalzeichen'],['edge-treatments','Kantenprofile'],['material-boards','Materialboards']] as [href,label]}<a href={`/${href}`}>{label}<Icon name="arrow" size={13}/></a>{/each}</div></section>
{:else if !snapshot}
  <div class="studio-loading"><Icon name="pen" size={32}/><h2>Planstand wird geladen</h2><p>{error||'Eine gültige, kanonische Planrevision ist Voraussetzung für die Bearbeitung.'}</p><a class="btn" href={projectListHref}>Zur Projektübersicht</a></div>
{:else}
  <header class="studio-heading">
    <div class="studio-breadcrumb"><a href={projectListHref}>Planungsstudio</a><Icon name="chevron" size={12}/><span>{snapshot.kind==='memorial'?'Grabmal':'Raum & Naturstein'}</span>{#if data.detail.order_id&&canViewOrders}<Icon name="chevron" size={12}/><a href={`/orders/${data.detail.order_id}`}>Zum Auftrag</a>{/if}</div>
    <div class="studio-title-row">
      <div class="studio-project-title"><h1 title={data.detail.name??data.detail.title??'Planung'}>{data.detail.name??data.detail.title??'Planung'}</h1><p aria-live="polite"><span class="sync-dot" class:unsaved={pending.length>0} class:has-conflict={!!conflict}></span><span class="sync-label">{syncLabel}{lastSaved&&!pending.length?' · '+lastSaved:''}</span><span class="compact-variant-name">{variant?.name??'Variante'}</span><span class="revision-chip">Rev. {sourceRevision?.revision_number??sourceRevision?.version??baseVersion}</span></p></div>
      <div class="heading-actions">
        <button id="studio-project-actions" class="btn" popovertarget="studio-project-menu" aria-label="Projektaktionen"><Icon name="file" size={15}/><span>Projekt</span><Icon name="down" size={12}/></button>
        <button class="btn fullscreen-button" aria-label={fullscreen?'Vollbild beenden':'Vollbild'} aria-pressed={fullscreen} onclick={toggleFullscreen}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d={fullscreen?"M8 3v5H3m13-5v5h5M3 16h5v5m13-5h-5v5":"M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"}/></svg><span>{fullscreen?'Vollbild beenden':'Vollbild'}</span></button>
        <button class="btn primary save-plan" onclick={()=>save()} disabled={saving||!pending.length||!!conflict||isHistoric}><Icon name="check" size={16}/>{saving?'Speichert …':'Speichern'}</button>
      </div>
    </div>
  </header>
  <div id="studio-project-menu" class="workbench-popover project-menu" popover="auto" data-workbench-popover bind:this={projectMenu} use:workbenchPopover={'studio-project-actions'} aria-label="Projektaktionen">
    <h2>Projekt & Unterlagen</h2>
    <p class="project-menu-title">{data.detail.name??data.detail.title??'Planung'}</p>
    <p class="project-menu-state">{syncLabel}{lastSaved&&!pending.length?' · '+lastSaved:''}</p>
    <a href={projectListHref}><Icon name="back" size={17}/><span>Zur Projektübersicht</span></a>
    {#if data.detail.order_id&&canViewOrders}<a href={'/orders/'+data.detail.order_id}><Icon name="briefcase" size={17}/><span>Zum Auftrag</span></a>{/if}
    <div class="popover-divider"></div>
    <button onclick={()=>projectAction(()=>openInspector('images'))}><Icon name="image" size={17}/><span>Bilder & Exporte<small>Fotorealistische Ansichten und gespeicherte Bilder</small></span></button>
    <button onclick={()=>projectAction(()=>{sourceReferenceId='';sourcePlanOpen=true;})}><Icon name="upload" size={17}/><span>Quellplan / Foto<small>Vorlage importieren und kalibrieren</small></span></button>
    <button onclick={()=>projectAction(()=>openInspector('text'))}><Icon name="pen" size={17}/><span>Inschriften prüfen<small>Namen und Daten im Wortlaut lesen</small></span></button>
    <button onclick={()=>projectAction(()=>openInspector('bom'))}><Icon name="file" size={17}/><span>Stückliste<small>Bauteile, Mengen und Bearbeitungen</small></span></button>
    <button onclick={()=>projectAction(()=>void exportPlan('pdf'))} disabled={saving||!!conflict}><Icon name="download" size={17}/><span>Planungs-PDF<small>Ansichten, Maße und Stückliste</small></span></button>
    <div class="popover-divider"></div>
    <button onclick={()=>projectAction(()=>openInspector('compare'))}><Icon name="box" size={17}/><span>Varianten vergleichen</span></button>
    <button onclick={()=>projectAction(()=>constraintOpen=true)} disabled={!canEdit||isHistoric}><Icon name="link" size={17}/><span>Bindungen bearbeiten</span></button>
    <button onclick={()=>projectAction(()=>openInspector('checks'))}><Icon name="check" size={17}/><span>Prüfung & Freigaben</span></button>
    <details class="project-variants"><summary>Varianten & Revisionen</summary><nav aria-label="Projektvarianten">{#each variants as v}<a class:active={v.id===snapshot.variantId} href={'/studio/'+snapshot.planningProjectId+'?variant='+v.id}>{v.name??'Variante'}<small>{statuses[v.status]??'Entwurf'}</small></a>{/each}</nav><button onclick={()=>projectAction(()=>{variantName='Variante '+(variants.length+1);openInspector('versions');})} disabled={!canEdit}><Icon name="plus" size={16}/>Neue Variante anlegen</button><button onclick={()=>projectAction(()=>openInspector('versions'))}><Icon name="clock" size={16}/>Revisionen anzeigen</button></details>
  </div>
  {#if error}<div class="studio-notice danger" role="alert"><Icon name="alert" size={18}/><span>{describeStudioIssue(activeSnapshot,error).message}</span><button aria-label="Fehlermeldung schließen" onclick={()=>error=''}>×</button></div>{/if}
  {#if notice}<div class="studio-notice info" role="status"><Icon name="check" size={18}/><span>{notice}</span><button aria-label="Hinweis schließen" onclick={()=>notice=''}>×</button></div>{/if}
  {#if !localAvailable}<div class="studio-notice warning">Dieser Browser erlaubt keine Sitzungssicherung. Änderungen vor dem Schließen manuell synchronisieren.</div>{/if}
  {#if conflict}<div class="conflict-panel"><h3>Änderungen sicher erhalten</h3><p>{conflict.message??'Der Server enthält eine neuere Revision. Ihr Entwurf wurde nicht überschrieben.'}</p><div><button class="btn" onclick={downloadLocal}>Lokalen Entwurf herunterladen</button><button class="btn" onclick={()=>{variantName='Konfliktkopie';void createVariant(baseRevisionId);}}>Getrennte Variante anlegen</button><button class="btn" onclick={()=>location.reload()}>Aktuellen Serverstand öffnen</button></div></div>{/if}
  {#if variants.length>1}<nav class="variant-bar" aria-label="Planvarianten"><div class="variant-tabs">{#each variants as v}<a class:active={v.id===snapshot.variantId} href={'/studio/'+snapshot.planningProjectId+'?variant='+v.id}>{v.name??'Variante'}<small>{statuses[v.status]??'Entwurf'}</small></a>{/each}</div><button class="text-button" onclick={()=>{variantName='Variante '+(variants.length+1);openInspector('versions');}}><Icon name="plus" size={14}/>Variante</button><span class="variant-divider"></span><button class="text-button check-count" onclick={()=>openInspector('checks')}><Icon name="alert" size={14}/>{validation.blocking.length+validation.warnings.length} Prüfpunkte</button></nav>{/if}
  <StudioWorkflow {snapshot} step={planningStep} onstep={choosePlanningStep} onadd={chooseAdd} oninspect={openInspector} onai={askForStep} readonly={!canEdit||isHistoric}/>
  <div class="editor-toolbar" role="group" aria-label="Planungswerkzeuge">
    <div class="main-tools">
      <div class="tool-group tool-modes" role="group" aria-label="Bearbeitung wählen">
        <button aria-label="Auswählen" aria-pressed={mode==='select'} disabled={view==='3d'} title={view==='3d'?'In der 2D-Ansicht bearbeiten; 3D-Kamera im Plan bedienen.':'Element auswählen, ohne es zu verschieben'} class:active={mode==='select'} onclick={()=>mode='select'}><svg width="17" height="17" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 2 16 10 10 11 7 17Z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><span>Auswahl</span></button>
        <button aria-label="Element verschieben" aria-pressed={mode==='move'} disabled={view==='3d'} title={view==='3d'?'In der 2D-Ansicht bearbeiten; 3D-Kamera im Plan bedienen.':'Element auswählen und auf dem Plan ziehen'} class:active={mode==='move'} onclick={()=>mode='move'}><svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true"><path d="M10 2v16M2 10h16M7 5l3-3 3 3M7 15l3 3 3-3M5 7l-3 3 3 3M15 7l3 3-3 3"/></svg><span>Verschieben</span></button>
        <button aria-label="Ansicht verschieben" aria-pressed={mode==='pan'} disabled={view==='3d'} title={view==='3d'?'3D-Kamera im Plan bedienen.':'Ansicht verschieben, ohne Bauteile zu verändern'} class:active={mode==='pan'} onclick={()=>mode='pan'}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 13V6a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v6c0 5-2 7-6 7h-1c-3 0-5-2-7-5l-3-5a1.5 1.5 0 0 1 2-2l3 3Z"/></svg><span>Hand</span></button>
      </div>
      <button type="button" class="manufacturer-tool" onclick={()=>manufacturerOpen=true}><Icon name="file" size={16}/><span>Herstellerdaten</span></button>
      <button id="studio-add-element" class="add-tool" popovertarget="studio-add-menu" aria-label="Element hinzufügen" disabled={!canEdit||isHistoric}><Icon name="plus" size={17}/><span>Hinzufügen</span></button>
    </div>
    <div class="view-tools">
      <div class="view-toggle" aria-label="Ansicht wählen">{#each [['front','Front'],['side','Seite'],['top',snapshot.kind==='memorial'?'Drauf':'Grundriss'],['3d','3D']] as [key,name]}<button class:active={view===key} aria-pressed={view===key} onclick={()=>setView(key as any)}>{name}</button>{/each}</div>
      <span class="view-caption">{view==='3d'?'Modellvorschau':'Maßhaltige Ansicht'}</span>
      <button id="studio-display-options" class="display-tool" popovertarget="studio-display-menu" aria-expanded={displayOptionsOpen} aria-controls="studio-display-menu"><Icon name="settings" size={16}/><span>Darstellung</span><Icon name="down" size={12}/></button><button class="fit-button" aria-label="Einpassen" title="Gesamten Plan in die Ansicht einpassen" onclick={fit}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8h8v8H8z"/></svg><span>Einpassen</span></button>
    </div>
  </div>
  <div id="studio-add-menu" class="workbench-popover add-menu" popover="auto" data-workbench-popover bind:this={addMenu} use:workbenchPopover={'studio-add-element'} aria-label="Element hinzufügen"><h2>Plan erweitern</h2><div>{#each snapshot.kind==='memorial'?[['stone_piece','Stein / Sockel'],['inscription','Inschrift'],['grave_border','Einfassung'],['catalog_object','Zubehör'],['group','Gruppe'],['technical_note','Hinweis']]:[['room','Raum'],['wall','Wand'],['opening','Tür / Fenster'],['stone_piece','Steinbauteil'],['surface','Belagsfläche'],['catalog_object','Produkt'],['connection','Anschluss'],['machining','Bearbeitung'],['clearance','Freifläche'],['slope','Gefälle'],['group','Gruppe'],['technical_note','Hinweis']] as [kind,name]}<button onclick={()=>chooseAdd(kind)} disabled={!canEdit||isHistoric}><Icon name="plus" size={16}/>{name}</button>{/each}</div></div>
  <div id="studio-display-menu" class="workbench-popover display-menu" popover="auto" data-workbench-popover bind:this={displayMenu} ontoggle={(event)=>displayOptionsOpen=event.newState==='open'} use:workbenchPopover={'studio-display-options'} aria-label="Darstellung"><h2>Darstellung</h2><p class="popover-hint">Die Anzeige verändert keine Maße oder Bauteile.</p><label class="compact-check"><input type="checkbox" bind:checked={snap} disabled={view==='3d'}/><span>An Objekten fangen<small>Kanten und Bezugspunkte beim Ziehen treffen</small></span></label><label class="compact-check"><input type="checkbox" bind:checked={gridSnap} disabled={view==='3d'}/><span>Am Raster einrasten<small>Unabhängig vom sichtbaren Raster</small></span></label><label class="compact-check"><input type="checkbox" bind:checked={grid} disabled={view==='3d'}/><span>Raster anzeigen</span></label><label class="inspector-label grid-width">Rasterweite (mm)<input bind:value={gridSize} inputmode="decimal" disabled={view==='3d'}/></label><label class="compact-check"><input type="checkbox" bind:checked={showDimensions} disabled={view==='3d'}/><span>Maße</span></label>{#if activeSnapshot?.kind==='room_plan'}<label class="compact-check"><input type="checkbox" bind:checked={showWalls}/><span>Wände anzeigen</span></label>{/if}<div class="popover-divider"></div><h3>Bedienung</h3><p class="popover-hint">Auswahl wählt ein Element. Verschieben bewegt es auf dem Plan. Mit der Hand verschieben Sie nur die Ansicht.</p><div class="canvas-disclaimer">{snapshot.kind==='memorial'?'Entwurfsansicht · Text und Bauteile im Plan auswählen und bearbeiten.':'Planmaße und Aufmaß werden getrennt geführt. Katalogobjekte ohne Originaldaten sind vereinfacht.'}<span class="editing-hint">Ziehen oder Pfeiltasten: 1 mm · Umschalt: 10 mm · Alt beim Ziehen: ohne Einrasten.</span></div><p class="popover-hint">Fangradius: 8 Bildschirmpixel. Zoom ändert keine realen Maße.</p></div>
  {#if isHistoric}<div class="historic-bar">Historische Revision · unveränderliche Ansicht<button onclick={()=>{variantName='Fortschreibung';void createVariant(historicalId);}}>Als neue Variante bearbeiten</button><button onclick={()=>historicalId=''}>Zum aktuellen Stand</button></div>{/if}
  <div class="studio-workspace" class:left-hidden={!leftPanel} class:right-hidden={!rightPanel}>
    {#if leftPanel}<WorkbenchPanel id="studio-elements-panel" side="left" title="Elemente" overlay={compactWorkbench} closeLabel="Elementliste schließen" returnFocusId="studio-elements-toggle" onclose={()=>leftPanel=false}><div class="element-panel"><div class="tree-tools"><input aria-label="Elemente suchen" bind:value={treeFilter} placeholder="Im Plan suchen …"/><select use:searchableSelect={selectedPhase} aria-label="Phase filtern" bind:value={selectedPhase}><option value="all">Alle Phasen</option><option value="existing">Bestand</option><option value="planned">Geplant</option><option value="demolition">Rückbau</option></select></div><div class="selection-tools"><label><input type="checkbox" bind:checked={multiSelect}/>Mehrfachauswahl</label><button type="button" onclick={()=>selectedIds=[]} disabled={!selectedIds.length}>Auswahl aufheben</button></div>{#if technicalElementCount}<label class="technical-elements-toggle"><input type="checkbox" bind:checked={showTechnicalElements}/>Technische Hilfselemente ({technicalElementCount})</label>{/if}<!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable plan elements must be reachable with the keyboard in Safari.) --><div class="element-tree" role="list" tabindex="0" aria-label="Elemente der Planung">{#each elements as element}<div role="listitem"><button class:selected={selectedIds.includes(element.id)} class:child={element.parentId!==snapshot.frames[0].id} class:subtle={element.kind==='dimension'||element.kind==='node'} onclick={(event)=>selectFromTree(element.id,event)}><Icon name={element.kind==='inscription'?'pen':element.kind==='group'?'box':element.kind==='technical_note'?'file':element.kind==='node'?'plus':'box'} size={15}/><span>{element.label}<small>{kindLabels[element.kind]}{element.phase==='existing'?' · Bestand':element.phase==='demolition'?' · Rückbau':''}</small></span>{#if element.locked}<Icon name="lock" size={12}/>{/if}</button></div>{:else}<div class="tree-empty" role="listitem"><p>{treeFilter?'Keine passenden Elemente.':'Dieser Plan ist noch offen.'}</p><span>Beginnen Sie mit einem Stein oder einem bemaßten Raum.</span></div>{/each}</div><div class="add-elements"><span>Plan erweitern</span><div>{#each snapshot.kind==='memorial'?[['stone_piece','Stein / Sockel'],['inscription','Inschrift'],['grave_border','Einfassung'],['catalog_object','Zubehör'],['group','Gruppe'],['technical_note','Hinweis']]:[['room','Raum'],['wall','Wand'],['opening','Tür / Fenster'],['stone_piece','Steinbauteil'],['surface','Belagsfläche'],['catalog_object','Produkt'],['connection','Anschluss'],['machining','Bearbeitung'],['clearance','Freifläche'],['slope','Gefälle'],['group','Gruppe'],['technical_note','Hinweis']] as [kind,name]}<button onclick={()=>addKind=kind} disabled={!canEdit||isHistoric}><Icon name="plus" size={13}/>{name}</button>{/each}</div></div></div></WorkbenchPanel>{/if}
    <section class="canvas-panel" aria-label="Planansicht"><div class="canvas-context"><div class="panel-tools"><button id="studio-elements-toggle" aria-label="Elementliste ein- oder ausblenden" aria-expanded={leftPanel} aria-controls="studio-elements-panel" class:active={leftPanel} onclick={toggleElementPanel}><Icon name="menu" size={17}/><span>Elemente</span></button><button id="studio-properties-toggle" aria-label="Eigenschaften ein- oder ausblenden" aria-expanded={rightPanel} aria-controls="studio-properties-panel" class:active={rightPanel} onclick={togglePropertiesPanel}><Icon name="settings" size={17}/><span>Eigenschaften</span>{#if selectedIds.length}<span class="selection-count">{selectedIds.length}</span>{/if}</button></div><div class="tool-group history-tools"><button aria-label="Rückgängig" title="Rückgängig · Strg/⌘ Z" onclick={undo} disabled={!history.length||saving||!!outgoing||isHistoric}><Icon name="rotate-ccw" size={17}/></button><button aria-label="Wiederholen" title="Wiederholen · Strg/⌘ Umschalt Z" onclick={redoAction} disabled={!redo.length||saving||!!outgoing||isHistoric}><Icon name="refresh" size={17}/></button></div><span class="canvas-active-element">{selected?.label??(snapshot.kind==='memorial'?'Gestaltung':'Technische Planung')}</span><span title={view!=='3d'?`Rasteranzeige ${visibleGridStep} mm; Fangraster ${gridSize} mm`:undefined}>mm · {isHistoric?'Historie':'Entwurf'}{view!=='3d'&&grid?` · Raster ${visibleGridStep.toLocaleString('de-DE')} mm`:''}</span></div>
      {#if view==='3d'}{#if ThreePreview}<ThreePreview materials={data.related?.materials??[]} {showWalls} snapshot={activeSnapshot!} resetKey={threeReset} assets={data.related?.assets??[]} glyphs={data.related?.glyphs??[]} navigationCommand={threeCameraCommand} onzoomchange={(value:number)=>threeZoom=value}/>{:else}<div class="canvas-empty"><div class="canvas-empty-content"><Icon name="box" size={30}/><h3>{threeLoading?'3D wird geladen …':'3D-Ansicht nicht verfügbar'}</h3><p>Die übrigen Ansichten bleiben bearbeitbar.</p></div></div>{/if}
      {:else}<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (The focusable planning application implements canvas keyboard commands through onKeys; every element also has equivalent list and form access.) --><svg bind:this={canvas} bind:clientWidth={canvasWidth} bind:clientHeight={canvasHeight} class:move-mode={mode==='move'} class:pan-mode={mode==='pan'} tabindex="0" viewBox={`${vb.x} ${vb.y} ${vb.width} ${vb.height}`} role="application" aria-label="Maßhaltiger Plan. Elemente auch in der Liste auswählen und im Formular bearbeiten." onkeydown={onKeys} onpointerdown={(event)=>startPointer(event)} onpointermove={movePointer} onpointerup={endPointer} onpointercancel={()=>{drag=null;snapLabel='';snapMarker=null;}} onlostpointercapture={()=>{drag=null;snapLabel='';snapMarker=null;}}>
        <defs>{#each activeSnapshot!.elements.filter(e=>e.kind==='stone_piece'||e.kind==='surface') as element}{@const material=shapeMaterial(element.id)}{#if material}{@const appearance=stoneAppearance(material)}<pattern id={`material-${element.id}`} patternUnits="userSpaceOnUse" width="800" height="800"><rect width="800" height="800" fill={appearance.color}/><image href={appearance.path} width="800" height="800" opacity=".38" preserveAspectRatio="xMidYMid slice"/></pattern>{/if}{/each}<pattern id="studio-grid" patternUnits="userSpaceOnUse" width={visibleGridStep} height={visibleGridStep}><circle cx="0" cy="0" r={pixelScale*.8} fill="#a5b1a8"/></pattern><pattern id="stone-hatch" patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(28)"><line x1="0" x2="0" y1="0" y2="16" stroke="#c4c7bf" stroke-width=".6"/></pattern></defs>
        {#if view==='top'}{#each activeSnapshot?.elements??[] as reference}{#if reference.kind==='plan_reference'&&reference.previewDocumentId}{@const sourceMatrix=sourceSvgMatrix(activeSnapshot!,reference)}{#if sourceMatrix}<image href={`/api/v1/documents/${reference.previewDocumentId}/download?version=${reference.previewDocumentVersionId}&inline=1`} width={reference.widthPx} height={reference.heightPx} opacity={reference.opacity} transform={`matrix(${sourceMatrix.join(' ')})`} pointer-events="none"><title>{reference.label} · ungeprüfte Quellenreferenz</title></image>{/if}{/if}{/each}{/if}{#if grid}<rect x={vb.x} y={vb.y} width={vb.width} height={vb.height} fill="url(#studio-grid)" pointer-events="none"/>{/if}
        {#each projection?.shapes??[] as shape,index}{@const isSelected=selectedIds.includes(shape.elementId)}{@const dragging=drag?.ids.includes(shape.elementId)}
          <g transform={dragging?`translate(${drag!.dx} ${-drag!.dy})`:undefined} class:chosen-shape={isSelected} class:secondary-shape={shape.secondary} class={`plan-shape kind-${shape.kind}`} role="button" tabindex={shape.secondary?-1:0} aria-hidden={shape.secondary?true:undefined} aria-label={`${shape.label}, ${kindLabels[shape.kind]}`} aria-pressed={isSelected} onclick={(event)=>{if(mode==='select')select(shape.elementId,event);}} onkeydown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(shape.elementId,event);}}} onpointerdown={(event)=>startPointer(event,shape.elementId)}>
            {#if shape.points.length===1}<circle cx={shape.points[0].xMm} cy={-Number(shape.points[0].yMm)} r={pixelScale*4} fill={isSelected?'#315c4c':'#fafbf8'} stroke="#315c4c" stroke-width={pixelScale*1.25}/>{:else}<path d={path(shape)} fill={shape.erase?'#f6f7f2':!shape.closed?'none':shape.kind==='room'?'#f0f0e9':shape.kind==='clearance'||shape.kind==='machining'||shape.secondary?'none':shape.kind==='catalog_object'?'#dbe4dc':shape.kind==='wall'?'#d6dcd3':shapeMaterial(shape.elementId)?`url(#material-${shape.elementId})`:'#e3e3d9'} fill-rule="evenodd" stroke={shape.erase?'#f6f7f2':isSelected?'#315c4c':shape.kind==='opening'?'#567b65':'#7a857b'} stroke-width={pixelScale*(shape.erase?2:isSelected||shape.kind==='opening'?1.8:1.25)} stroke-dasharray={!shape.erase&&(shape.secondary||shape.estimated||shape.kind==='clearance')?`${pixelScale*5} ${pixelScale*4}`:undefined}/>{/if}
            {#if isSelected&&!shape.secondary&&shape.points.length>2}{#each shape.points.slice(0,32) as point}<rect x={Number(point.xMm)-vb.width/350} y={-Number(point.yMm)-vb.width/350} width={vb.width/175} height={vb.width/175} fill="#fff" stroke="#315c4c" stroke-width={vb.width/1000}/>{/each}{/if}
          </g>
        {/each}
        {#if showDimensions}{#each dimensions as dimension}
          {@const d=layoutDimension(dimension,32*pixelScale)}
          {@const length=Math.hypot(d.b.x-d.a.x,d.b.y-d.a.y)/pixelScale}
          {#if length>75}
            <g class="dimension-annotation" pointer-events="none" aria-label={dimension.label+': '+dimension.valueMm+' mm'}>
              <title>{dimension.label}: {dimension.valueMm} mm · {dimension.basis==='reference'?'geometrisches Bezugsmaß':'Planmaß'}</title>
              <path d={'M'+dimension.a.xMm+' '+(-Number(dimension.a.yMm))+'L'+d.a.x+' '+(-d.a.y)+'L'+d.b.x+' '+(-d.b.y)+'L'+dimension.b.xMm+' '+(-Number(dimension.b.yMm))} fill="none" stroke="#65776c" stroke-width="1" vector-effect="non-scaling-stroke"/>
              {#each [d.a,d.b] as p}<path d={'M'+(p.x-3*pixelScale)+' '+(-p.y+3*pixelScale)+'l'+(6*pixelScale)+' '+(-6*pixelScale)} stroke="#315c4c" stroke-width="1.4" vector-effect="non-scaling-stroke"/>{/each}
              <text x={d.label.x} y={-d.label.y-5*pixelScale} text-anchor="middle" font-size={12*pixelScale} font-weight="500" fill="#244e3d" stroke="#f6f7f2" stroke-width={4*pixelScale} paint-order="stroke">{Number(dimension.valueMm).toLocaleString('de-DE',{maximumFractionDigits:2})}{dimension.label.endsWith('Wandachse')?' · Achse':''}</text>
            </g>
          {/if}
        {/each}{/if}
        {#each activeSnapshot!.elements.filter(e=>e.kind==='inscription'&&e.phase!=='demolition') as element}{#if element.kind==='inscription'}<g transform={drag?.ids.includes(element.id)?`translate(${drag.dx} ${-drag.dy})`:undefined}><LetteringPreview snapshot={activeSnapshot!} {element} {view} selected={selectedIds.includes(element.id)} {pixelScale} onselect={event=>{if(mode==='select')select(element.id,event);}} onpointerdown={event=>startPointer(event,element.id)}/></g>{/if}{/each}
        {#each (projection?.texts??[]).filter(item=>activeSnapshot?.elements.find(e=>e.id===item.elementId)?.kind!=='inscription') as item,index}<g transform={drag?.ids.includes(item.elementId)?`translate(${drag.dx} ${-drag.dy})`:undefined} role="button" tabindex="0" aria-label={`Inschrift / Hinweis ${index+1}: ${item.text}`} onclick={(event)=>{if(mode==='select')select(item.elementId,event);}} onkeydown={(event)=>{if(event.key==='Enter')select(item.elementId,event);}} onpointerdown={(event)=>startPointer(event,item.elementId)} class="text-anchor"><circle cx={item.point.xMm} cy={-Number(item.point.yMm)} r={vb.width/100} fill={selectedIds.includes(item.elementId)?'#315c4c':'#fff'} stroke="#315c4c" stroke-width={vb.width/900}/><text x={item.point.xMm} y={-Number(item.point.yMm)+vb.width/320} text-anchor="middle" font-size={vb.width/110} fill={selectedIds.includes(item.elementId)?'#fff':'#315c4c'}>{index+1}</text></g>{/each}
        {#if snapMarker}<g class="snap-marker" pointer-events="none" aria-hidden="true"><circle cx={snapMarker.point.xMm} cy={-Number(snapMarker.point.yMm)} r={snapMarker.radius} fill="#fff" stroke="#315c4c" stroke-width="2" vector-effect="non-scaling-stroke"/><path d={`M${Number(snapMarker.point.xMm)-snapMarker.radius*1.5} ${-Number(snapMarker.point.yMm)}h${snapMarker.radius*3}M${snapMarker.point.xMm} ${-Number(snapMarker.point.yMm)-snapMarker.radius*1.5}v${snapMarker.radius*3}`} fill="none" stroke="#315c4c" stroke-width="1.5" vector-effect="non-scaling-stroke"/></g>{/if}
      </svg>
      {#if !snapshot.elements.length}<div class="canvas-empty"><div class="canvas-empty-content"><div class="plan-mark"><Icon name={snapshot.kind==='memorial'?'pen':'box'} size={30}/></div><h3>{snapshot.kind==='memorial'?'Raum für Erinnerung.':'Der erste Strich für Ihren Raum.'}</h3><p>{snapshot.kind==='memorial'?'Legen Sie Steinform und Auftragsmaße fest. Inschriften und Material ergänzen Sie anschließend.':'Beginnen Sie mit einem bemaßten Raum oder ergänzen Sie Bauteile einzeln.'}</p><button class="btn primary" onclick={()=>addKind=snapshot!.kind==='memorial'?'stone_piece':'room'} disabled={!canEdit}><Icon name="plus" size={16}/>{snapshot.kind==='memorial'?'Ersten Stein anlegen':'Raum anlegen'}</button></div></div>{/if}
      {/if}
      <div class="canvas-bottom"><div class="canvas-selection"><span>{snapLabel||((selectedIds.length?selectedIds.length+' ausgewählt':snapshot.elements.length+' Elemente')+' · '+(mode==='move'?'Verschieben':mode==='pan'?'Hand':'Auswahl'))}</span><span class="plan-units">mm</span>{#if compactWorkbench&&selected}<button class="selection-properties" onclick={()=>openInspector('properties')}>Bearbeiten<Icon name="chevron" size={13}/></button>{/if}</div><div class="zoom-control"><button aria-label="Verkleinern" onclick={()=>changeZoom(false)}>−</button><span>{Math.round((view==='3d'?threeZoom:zoom)*100)} %</span><button aria-label="Vergrößern" onclick={()=>changeZoom(true)}>+</button></div></div>
    </section>
    {#if rightPanel}<WorkbenchPanel id="studio-properties-panel" side="right" title={inspectorTitle} overlay={compactWorkbench} closeLabel="Eigenschaften schließen" returnFocusId="studio-properties-toggle" onclose={()=>rightPanel=false}><div class="inspector"><nav aria-label="Eigenschaftenbereiche"><button class:active={tab==='properties'} onclick={()=>tab='properties'}>Eigenschaften</button><button class:active={tab==='checks'} onclick={()=>openInspector('checks')}>Prüfen</button><button class:active={tab==='versions'||tab==='compare'} onclick={()=>tab='versions'}>Stände</button><button class:active={tab==='images'} onclick={()=>openInspector('images')}>Bilder</button>{#if snapshot.kind==='memorial'}<button class:active={tab==='text'} onclick={()=>tab='text'}>Text</button>{/if}<button class:active={tab==='bom'} onclick={()=>tab='bom'}>Stückliste</button></nav>
      {#if tab==='properties'}{#if selected}<div class="inspector-body"><h2>{selected.label}</h2><p class="inspector-kind">{kindLabels[selected.kind]}{selected.phase==='existing'?' · Bestand':''}</p>{#if selectedIds.length>1}<p class="field-hint">{selectedIds.length} Elemente ausgewählt. Gemeinsame Aktionen betreffen die gesamte Auswahl; Einzelangaben unten gelten für {selected.label}.</p>{/if}{#if selectedIds.length>1||selected.kind==='room'}<SelectionMoveEditor snapshot={activeSnapshot!} {selectedIds} disabled={!canEdit||isHistoric||selectedElements.some(e=>e.locked)} onchange={edit}/>{/if}{#if selected.locked}<div class="inspector-info"><Icon name="lock" size={15}/>Dieses Element ist gesperrt.{selected.kind==='inscription'?' Bestehende Schrift bleibt geschützt.':''}</div>{/if}
        <fieldset disabled={!canEdit||isHistoric||selected.locked}>{#if selected.kind!=='inscription'}<label class="inspector-label">Planungsphase<select use:searchableSelect={selected.phase} value={selected.phase} onchange={event=>edit([{type:'set_element_phase',elementId:selected!.id,phase:event.currentTarget.value as DesignElement['phase']}])}><option value="planned">Geplant</option><option value="existing">Bestand</option><option value="demolition">Rückbau</option></select></label>{/if}<label class="inspector-label">Bezeichnung<input value={selected.label} onchange={(event)=>edit([{type:'rename_element',elementId:selected!.id,label:event.currentTarget.value}])}/></label>
          {#if 'transform'in selected||'point'in selected}<details class="placement-details"><summary>Position & Ausrichtung</summary>
          {#if 'transform'in selected||'point'in selected}{@const position='transform'in selected?selected.transform.position:'point'in selected?selected.point:null}{#if position}<div class="inspector-section"><h3>Position</h3><div class="xyz-fields">{#each [['xMm','X'],['yMm','Y'],['zMm','Z']] as [axis,name]}<label>{name}<input inputmode="decimal" value={position[axis as keyof Point3]} onchange={(event)=>changePosition(axis as keyof Point3,event.currentTarget.value)}/></label>{/each}</div><p class="field-hint">Lokaler Bezug: {activeSnapshot!.elements.find(e=>e.id===selected!.parentId)?.label??activeSnapshot!.frames.find(f=>f.id===selected!.parentId)?.datumLabel??'Planursprung'} · mm</p></div>{/if}{/if}
          {#if 'transform'in selected}<label class="inspector-label">Drehung um Z (Grad)<input inputmode="decimal" value={selected.transform.rotationDeg.z} onchange={(event)=>{const n=event.currentTarget.value.replace(',','.');if(/^-?\d+(?:\.\d+)?$/.test(n)&&selected&&'transform'in selected)edit([{type:'rotate_element',elementId:selected.id,rotationDeg:{...selected.transform.rotationDeg,z:n}}]);}}/></label>{/if}
          </details>{/if}
          {#if selected.kind==='dimension'}<div class="inspector-section"><h3>Bauteilmaß und Quellenbezug</h3><MeasurementField snapshot={activeSnapshot!} measureId={selected.measureId} label={selected.label} elementId={selected.id} field="measureId" evidence={data.related?.documents??[]} onchange={edit} actorId={data.user?.id??''} canConfirm={canRelease} disabled={!canEdit||isHistoric}/><p class="field-hint">{selected.mode==='reference'?'Dieses Referenzmaß stammt aus der Geometrie.':'Ein treibendes Maß bindet die zugeordneten Bauteilbezüge.'}</p></div>{/if}{#if selected.kind==='plan_reference'}<div class="inspector-section"><h3>Versionierter Quellplan</h3><p class="field-hint">Seite {selected.pageIndex+1} · {selected.sourceKind} · {selected.sourceHash.slice(0,16)}…</p><button class="btn small" onclick={()=>{sourceReferenceId=selected.id;sourcePlanOpen=true;}}>Quelle und Kalibrierung öffnen</button></div>{/if}{#if selected.kind==='stone_piece'}<div class="inspector-section"><h3>Außenmaße & Material</h3>{#each activeSnapshot!.elements.filter(e=>e.kind==='dimension'&&e.mode==='driving'&&e.refs.some(r=>r.elementId===selected!.id)) as dim}{#if dim.kind==='dimension'}<MeasurementField snapshot={activeSnapshot!} measureId={dim.measureId} label={dim.refs[0]?.feature==='width'?'Breite':snapshot.kind==='memorial'?'Höhe':'Länge / Tiefe'} elementId={dim.id} field="measureId" evidence={data.related?.documents??[]} onchange={edit} actorId={data.user?.id??''} canConfirm={canRelease} disabled={!canEdit||isHistoric}/>{/if}{/each}<MeasurementField snapshot={activeSnapshot!} measureId={selected.thicknessMeasureId} label="Materialstärke" elementId={selected.id} field="thicknessMeasureId" onchange={edit} actorId={data.user?.id??''} canConfirm={canRelease} evidence={data.related?.documents??[]} disabled={!canEdit||isHistoric}/><label class="inspector-label" for="stone-material">Naturstein / Material</label><MaterialPicker id="stone-material" materials={data.related?.materials??[]} value={selected.materialSpecVersionId.startsWith('unassigned')?'':selected.materialSpecVersionId} onchange={value=>edit([{type:'set_stone_spec',elementId:selected!.id,materialSpecVersionId:value||'unassigned:material'}])}/><details class="placement-details"><summary>Fertigung: Maserung, Rohplatte & Kanten</summary><label class="inspector-label">Maserungsrichtung (Grad)<input inputmode="decimal" value={selected.grainDirectionDeg??''} onchange={(event)=>edit([{type:'set_stone_spec',elementId:selected!.id,grainDirectionDeg:event.currentTarget.value?event.currentTarget.value.replace(',','.'):null}])}/></label><label class="inspector-label">Rohplatte / Charge<select use:searchableSelect={selected.stockItemId??''} value={selected.stockItemId??''} onchange={(event)=>edit([{type:'set_stone_spec',elementId:selected!.id,stockItemId:event.currentTarget.value||null}])}><option value="">Nicht zugeordnet</option>{#each stockItems as stock}<option value={stock.id}>{stock.name}</option>{/each}</select></label><h3>Kantenbearbeitung</h3>{#key selected.id}<EdgeTreatmentEditor stone={selected} treatments={edgeTreatments} onchange={edit}/>{/key}</details><div class="inspector-actions"><button class="btn small" onclick={()=>addKind='machining'}>Ausschnitt / Bearbeitung ergänzen</button>{#if snapshot.kind==='memorial'}<button class="btn small" onclick={()=>addKind='inscription'}>Inschrift ergänzen</button>{/if}</div></div>{/if}
          {#if selected.kind==='inscription'}<div class="inspector-section"><h3>Inschrift gestalten</h3><p class="field-hint">Ziehen Sie den Text auf dem Stein an die gewünschte Stelle. Mit den Pfeiltasten verschieben Sie um 1 mm, mit Umschalt um 10 mm. Alt hält das Einrasten kurz aus.</p><label class="inspector-label" for="inscription-design-font">Entwurfsschrift</label><select use:searchableSelect={selected.previewFontKey??'notoserif'} class="inscription-font-select" id="inscription-design-font" value={selected.previewFontKey??'notoserif'} onchange={event=>edit([{type:'set_inscription_layout',elementId:selected!.id,previewFontKey:event.currentTarget.value as any}])}>{#each planningFonts as entry}<option value={entry.key}>{entry.label}</option>{/each}</select><label class="inspector-label">Schriftfarbe<input type="color" value={selected.previewColor??'#c6a56d'} onchange={event=>edit([{type:'set_inscription_layout',elementId:selected!.id,previewColor:event.currentTarget.value}])}/></label><div class="inspector-actions"><button class="btn small" onclick={()=>{if(selected?.kind==='inscription')edit([{type:'set_inscription_layout',elementId:selected.id,alignment:'center',rotationDeg:'0',originUV:inscriptionCenter(activeSnapshot!,selected)}]);}}>Auf Stein zentrieren</button></div><label class="inspector-label">Drehung (Grad)<input inputmode="decimal" value={selected.rotationDeg} onchange={event=>edit([{type:'set_inscription_layout',elementId:selected!.id,rotationDeg:event.currentTarget.value.replace(',','.') }])}/></label><label class="inspector-label">Originaltext<textarea rows="5" value={selected.exactText} onchange={(event)=>edit([{type:'set_inscription_text',elementId:selected!.id,exactText:event.currentTarget.value}])}></textarea></label><p class="field-hint">Namen, Daten und Sonderzeichen werden unverändert gespeichert. Keine automatische Großschreibung.</p><details class="supplier-details"><summary>Hersteller, Ausführung und Originaldaten</summary><p class="field-hint">Die sichtbare Entwurfsschrift ist eine lizenzierte Gestaltungsvorschau. Eine gewählte Herstellerschrift wird über die Originalreferenz bestellt und gesondert geprüft.</p><label class="inspector-label">Herstellerschrift<select use:searchableSelect={selected.fontVariantVersionId} value={selected.fontVariantVersionId} onchange={(event)=>changeFont(event.currentTarget.value)}><option value="unassigned:font">Noch nicht zugeordnet</option>{#each fonts as entry}<option value={entry.version_id??entry.id}>{entry.name} · {entry.selection_ref} · {entry.supply_form==='wording'?'Schriftzug':'Einzelbuchstaben'}</option>{/each}</select></label>{#if font&&imageUrl(font)}<figure class="font-reference"><img src={imageUrl(font)!} alt={`Originale Strassacker-Bildreferenz ${font.name} ${font.selection_ref}`} loading="lazy" referrerpolicy="no-referrer"/><figcaption>{font.name} · Auswahl {font.selection_ref}<br/>Originalbild · {font.thumbnail_material==='bronze'?'Bronze':font.thumbnail_material==='aluminium'?'Aluminium':font.thumbnail_material??'Quellmaterial'} · Bildreferenz</figcaption></figure>{/if}<p class="font-warning">Keine belegten Zeichenbreiten oder Bohrpunkte. Benötigte Glyphen und der Satz werden vom Lieferanten bestätigt.</p></details><MeasurementField snapshot={activeSnapshot!} measureId={selected.requestedHeightMeasureId} label="Gewünschte Zeichenhöhe" onchange={edit} actorId={data.user?.id??''} canConfirm={canRelease} disabled={!canEdit||isHistoric}/><MeasurementField snapshot={activeSnapshot!} measureId={selected.requestedMaxWidthMeasureId} label="Maximale Schriftbreite" elementId={selected.id} field="requestedMaxWidthMeasureId" onchange={edit} actorId={data.user?.id??''} canConfirm={canRelease} disabled={!canEdit||isHistoric}/><MeasurementField snapshot={activeSnapshot!} measureId={selected.requestedLowercaseHeightMeasureId} label="Gewünschte Kleinbuchstabenhöhe" elementId={selected.id} field="requestedLowercaseHeightMeasureId" onchange={edit} actorId={data.user?.id??''} canConfirm={canRelease} disabled={!canEdit||isHistoric}/><MeasurementField snapshot={activeSnapshot!} measureId={selected.lineGapMeasureId} label="Zeilenabstand" onchange={edit} actorId={data.user?.id??''} canConfirm={canRelease} disabled={!canEdit||isHistoric}/><div class="xyz-fields two"><label>u (mm)<input inputmode="decimal" value={selected.originUV.uMm} onchange={(e)=>changeUV('uMm',e.currentTarget.value)}/></label><label>v (mm)<input inputmode="decimal" value={selected.originUV.vMm} onchange={(e)=>changeUV('vMm',e.currentTarget.value)}/></label></div><label class="inspector-label">Ausrichtung<select use:searchableSelect={selected.alignment} value={selected.alignment} onchange={(event)=>edit([{type:'set_inscription_layout',elementId:selected!.id,alignment:event.currentTarget.value as any}])}><option value="left">Links</option><option value="center">Zentriert</option><option value="right">Rechts</option></select></label><label class="inspector-label">Belegte Materialausführung<select use:searchableSelect={selected.materialArticleReference??''} value={selected.materialArticleReference??''} onchange={(event)=>edit([{type:'set_inscription_layout',elementId:selected!.id,materialArticleReference:event.currentTarget.value||null}])}><option value="">Ausführung noch offen</option>{#each fontArticles as article}<option value={article.value}>{article.label}</option>{/each}</select></label><label class="inspector-label" for="inscription-material">Konkreter Materialstand</label><ReferencePicker id="inscription-material" reference="material-versions" initial={materials} value={selected.materialSpecVersionId??''} onchange={value=>edit([{type:'set_inscription_layout',elementId:selected!.id,materialSpecVersionId:value||null}])}/><label class="inspector-label">Bestätigtes Finish<select use:searchableSelect={selected.finishSpecVersionId??''} value={selected.finishSpecVersionId??''} onchange={(event)=>edit([{type:'set_inscription_layout',elementId:selected!.id,finishSpecVersionId:event.currentTarget.value||null}])}><option value="">Noch nicht festgelegt</option>{#each finishes as finish}<option value={finish.id}>{finish.name}</option>{/each}</select></label><p class="field-hint">Nutzungsrechte und Variantenverträglichkeit müssen aus den zugehörigen Herstellerunterlagen hervorgehen.</p><a class="text-button" href="/glyph-library">Originaldaten & Befestigung verwalten</a><button class="btn small" disabled={isHistoric||selected.phase==='existing'&&!canRelease} onclick={()=>glyphLayoutOpen=true}>Geprüfte Originalzeichen zuordnen</button>{#if font?.material_references}<p class="field-hint">Belegte Quellreferenzen: {Object.entries(font.material_references).map(([key,value])=>`${key}: ${Array.isArray(value)?value.join(', '):value}`).join(' · ')}</p>{/if}</div>{/if}
          {#if selected.kind==='wall'}<div class="inspector-section"><h3>Wandaufbau</h3><MeasurementField snapshot={activeSnapshot!} measureId={selected.heightMeasureId} label="Wandhöhe" elementId={selected.id} field="heightMeasureId" onchange={edit} actorId={data.user?.id??''} canConfirm={canRelease} evidence={data.related?.documents??[]} disabled={!canEdit||isHistoric}/><MeasurementField snapshot={activeSnapshot!} measureId={selected.coreThicknessMeasureId} label="Kernstärke" elementId={selected.id} field="coreThicknessMeasureId" onchange={edit} actorId={data.user?.id??''} canConfirm={canRelease} evidence={data.related?.documents??[]} disabled={!canEdit||isHistoric}/><button class="btn small" onclick={()=>addKind='opening'}>Tür / Fenster ergänzen</button><p class="field-hint">Die Lage entsteht aus Anfangs- und Endknoten. Gemeinsame Wände werden einmal geführt.</p></div>{/if}
          {#if selected.kind==='opening'}<div class="inspector-section"><OpeningEditor snapshot={activeSnapshot!} opening={selected} documents={planningDocuments} onchange={edit} actorId={data.user?.id??''} canConfirm={canRelease} disabled={!canEdit||isHistoric}/></div>{/if}
          {#if selected.kind==='catalog_object'}<div class="inspector-section"><h3>Produktvariante</h3><p class="field-hint">{selected.productVariantVersionId.startsWith('unassigned')?'Freies Hüllmodell · kein bestellbarer Artikel':(products.find((p:any)=>(p.version_id??p.product_variant_version_id??p.id)===selected.productVariantVersionId)?.name??'Eingefrorener Herstellerartikel')}</p><p class="inspector-info">2D-Darstellung: {selected.accuracy==='verified_original'?'verifizierte Originalkontur':selected.accuracy==='verified_envelope'?'verifizierte Nennmaßhülle':'vereinfachte Hülle'}. Ein reales Produkt wird durch Variantenwahl geändert.</p><label class="inspector-label" for="catalog-version">Verfügbare Variante</label><ProductPicker id="catalog-version" initial={products} allowEmpty={false} value={selected.productVariantVersionId.startsWith('unassigned')?'':selected.productVariantVersionId} onchange={value=>replaceCatalog(value)}/><label class="inspector-label" for="catalog-original">Geprüfte Originalversion</label><ReferencePicker id="catalog-original" reference="product-model-assets" parentId={selected.productVariantVersionId.startsWith('unassigned')?'':selected.productVariantVersionId} initial={(data.related?.assets??[]).filter((a:any)=>a.product_variant_version_id===(selected?.kind==='catalog_object'?selected.productVariantVersionId:null)&&a.geometry_verified&&['mesh','outline'].includes(a.kind)&&hasAssetUsage(a,'internal_consultation')).map((a:any)=>({id:a.id,name:a.name??(a.kind==='mesh'?'Originales 3D-Modell':'Originale 2D-Kontur')}))} value={selected.assetVersionId??''} onchange={value=>{if(selected?.kind==='catalog_object')replaceCatalog(selected.productVariantVersionId,value||null);}}/><p class="field-hint">Die 2D-Hülle und ein verifiziertes 3D-Original werden getrennt ausgewiesen. Modelle werden mit belegten Einheiten und Achsen geladen; Größenänderungen erfordern eine andere Produktvariante.</p><a class="text-button" href="/product-assets">Produktdateien und Nutzungsnachweise verwalten</a><div class="inspector-actions"><button class="btn small" onclick={()=>addKind='connection'}>Anschluss</button><button class="btn small" onclick={()=>addKind='clearance'}>Freizone</button></div></div>{/if}
          {#if selected.kind==='surface'}<div class="inspector-section"><h3>Belagsfläche</h3><p class="field-hint">{{floor:'Boden',wall:'Wand',ceiling:'Decke',shower:'Dusche',inscription:'Beschriftungsfl\u00e4che'}[selected.surfaceType]} · {selected.layers.length} Schichten</p><MeasurementField snapshot={activeSnapshot!} measureId={selected.jointWidthMeasureId} label="Fugenbreite" onchange={edit} actorId={data.user?.id??''} canConfirm={canRelease} disabled={!canEdit||isHistoric}/><label class="inspector-label">Verlegerichtung (Grad)<input value={selected.layingDirectionDeg??''} onchange={(event)=>edit([{type:'set_surface_spec',elementId:selected!.id,layingDirectionDeg:event.currentTarget.value?event.currentTarget.value.replace(',','.'):null}])}/></label></div>{/if}
          {#if selected.kind==='wall'}<WallGeometryEditor snapshot={activeSnapshot!} wall={selected} onchange={edit} disabled={!canEdit||isHistoric}/>{/if}{#if ['wall','surface','room'].includes(selected.kind)}<LayerEditor snapshot={activeSnapshot!} element={selected} materials={materials} products={products} documents={planningDocuments} actorId={data.user?.id??''} canConfirm={canRelease} disabled={!canEdit||isHistoric} onchange={edit}/>{/if}
          {#if selected.kind==='machining'}<div class="inspector-section"><MachiningEditor snapshot={activeSnapshot!} feature={selected} assets={data.related?.assets??[]} documents={planningDocuments} onchange={edit} actorId={data.user?.id??''} canConfirm={canRelease} disabled={!canEdit||isHistoric}/></div>{/if}
          {#if selected.kind==='room'}<RoomBoundaryEditor snapshot={activeSnapshot!} room={selected} onchange={edit} disabled={!canEdit||isHistoric}/><div class="inspector-section"><h3>Raum & Höhenbezug</h3><label class="inspector-label">Bestehender Raum<select use:searchableSelect={selected.roomId} value={selected.roomId} onchange={(event)=>edit([{type:'set_room_spec',elementId:selected!.id,roomId:event.currentTarget.value}])}><option value={selected.roomId}>Aktueller Bezug</option>{#each data.lookups?.rooms??[] as room}<option value={room.id}>{room.name}</option>{/each}</select></label><label class="inspector-label">Geschoss<select use:searchableSelect={selected.floorId} value={selected.floorId} onchange={(event)=>edit([{type:'set_room_spec',elementId:selected!.id,floorId:event.currentTarget.value}])}><option value={selected.floorId}>Aktueller Bezug</option>{#each data.lookups?.floors??[] as floor}<option value={floor.id}>{floor.name}</option>{/each}</select></label><MeasurementField snapshot={activeSnapshot!} measureId={selected.finishedFloorLevelMeasureId} label="Oberkante Fertigfußboden" elementId={selected.id} field="finishedFloorLevelMeasureId" onchange={edit} actorId={data.user?.id??''} canConfirm={canRelease} evidence={data.related?.documents??[]} disabled={!canEdit||isHistoric}/></div>{/if}
          {#if selected.kind==='technical_note'}<div class="inspector-section"><h3>Ausführungshinweis</h3><label class="inspector-label">Wörtlicher Hinweis<textarea rows="5" value={selected.text} onchange={(event)=>{if(selected?.kind==='technical_note')edit([{type:'set_technical_note',elementId:selected.id,text:event.currentTarget.value,category:selected.category,ruleVersionId:selected.ruleVersionId}]);}}></textarea></label><label class="inspector-label">Prüfart<select use:searchableSelect={selected.category} value={selected.category} onchange={(event)=>{if(selected?.kind==='technical_note')edit([{type:'set_technical_note',elementId:selected.id,text:selected.text,category:event.currentTarget.value as any,ruleVersionId:selected.ruleVersionId}]);}}><option value="information">Information</option><option value="approval_required">Fachfreigabe erforderlich</option><option value="installation">Montagehinweis</option><option value="source">Quelle</option></select></label></div>{/if}
          {#if selected.kind==='grave_border'||selected.kind==='slope'||selected.kind==='connection'||selected.kind==='clearance'}<div class="inspector-section"><h3>Fachmaße</h3>{#each (selected.kind==='grave_border'?[['widthMeasureId','Randbreite'],['heightMeasureId','Randhöhe']]:selected.kind==='slope'?[['riseMeasureId','Höhenunterschied'],['runMeasureId','Lauflänge']]:selected.kind==='connection'?[['diameterMeasureId','Anschlussdurchmesser']]:[['heightMeasureId','Freizuhaltende Höhe']]) as [field,label]}<MeasurementField snapshot={activeSnapshot!} measureId={(selected as any)[field]} {label} elementId={selected.id} {field} onchange={edit} actorId={data.user?.id??''} canConfirm={canRelease} evidence={data.related?.documents??[]} disabled={!canEdit||isHistoric}/>{/each}{#if selected.kind==='connection'}<label class="inspector-label">Anschlussart<select use:searchableSelect={selected.connectionType} value={selected.connectionType} onchange={(event)=>{if(selected?.kind==='connection')edit([{type:'set_connection_spec',elementId:selected.id,connectionType:event.currentTarget.value as any,specificationVersionId:selected.specificationVersionId,hostElementId:selected.hostElementId}]);}}><option value="water">Wasser</option><option value="waste">Abfluss</option><option value="electric">Elektro</option><option value="fastening">Befestigung</option><option value="joint">Fuge</option><option value="other">Andere</option></select></label>{/if}</div>{/if}
          {#if !['group','node','dimension','plan_reference','machining','inscription'].includes(selected.kind)}<TechnicalReferencesEditor snapshot={activeSnapshot!} element={selected} documents={planningDocuments} materials={materials} finishes={finishes} rules={data.related?.rules??[]} actorId={data.user?.id??''} canConfirm={canRelease} onchange={edit}/>{/if}
          {#if selected.kind==='stone_piece'||selected.kind==='surface'||selected.kind==='machining'&&selected.machiningType!=='miter'||selected.kind==='clearance'||selected.kind==='grave_border'}<div class="inspector-section"><h3>Geometrie & Ausschnitte</h3>{#key selected.id}<ContourEditor snapshot={activeSnapshot!} documents={planningDocuments} planningProjectId={snapshot!.planningProjectId} canReview={canRelease} elementId={selected.id} contour={selected.kind==='stone_piece'?selected.finishedContour:selected.contour} onchange={edit}/>{/key}</div>{/if}
          <label class="inspector-label">Gruppe<select use:searchableSelect={selected.parentId??''} value={selected.parentId??''} onchange={(event)=>edit([{type:'reparent_element',elementId:selected!.id,parentId:event.currentTarget.value||null}])}><option value={snapshot.frames[0].id}>Planwurzel</option>{#each snapshot.elements.filter(e=>e.kind==='group'&&e.id!==selected!.id) as g}<option value={g.id}>{g.label}</option>{/each}</select></label>
        </fieldset><div class="inspector-footer"><button class="btn small" onclick={duplicate} disabled={!canEdit||isHistoric}>Duplizieren</button><button class="btn small" onclick={()=>edit(selectedIds.map(elementId=>({type:'set_element_lock',elementId,locked:!allSelectionLocked})))} disabled={!canEdit||isHistoric||(allSelectionLocked&&selectedElements.some(e=>e.kind==='inscription'&&e.phase==='existing'))}>{selectedIds.length>1?(allSelectionLocked?'Alle entsperren':'Alle sperren'):(selected.locked?'Entsperren':'Sperren')}</button><button class="delete-element" onclick={removeSelection} disabled={!canEdit||isHistoric||selected.locked}><Icon name="trash" size={15}/>Entfernen</button></div></div>
        {:else}<div class="inspector-empty"><Icon name="pen" size={28}/><h3>Im Detail gestalten.</h3><p>Wählen Sie ein Element im Plan oder in der Liste. Hier bearbeiten Sie Maße, Material und Ausführung.</p><p class="small">Alle Drag-Aktionen sind auch über Zahlenfelder möglich.</p></div>{/if}
      {:else if tab==='text'}<div class="inspector-body secondary-inspector">{#if activeSnapshot!.elements.some(e=>e.kind==='inscription')}<section class="literal-preview"><header><div><h2>Namen. Daten. Jedes Zeichen.</h2></div><span>Leseschrift zur Prüfung · keine Herstellerkontur</span></header><div class="literal-groups">{#each activeSnapshot!.elements.filter(e=>e.kind==='inscription') as inscription,index}{#if inscription.kind==='inscription'}<article class:selected={selectedIds.includes(inscription.id)}><button aria-label={`${inscription.label} im Plan auswählen`} onclick={()=>{selectedIds=[inscription.id];openInspector('properties');}}><span>{index+1}</span>{inscription.label}{#if inscription.locked}<Icon name="lock" size={13}/>{/if}</button><p>{inscription.exactText}</p><small>Höhe {measureValue(activeSnapshot!,inscription.requestedHeightMeasureId)??'offen'} mm · Max. Breite {measureValue(activeSnapshot!,inscription.requestedMaxWidthMeasureId)??'offen'} mm</small></article>{/if}{/each}</div></section>{:else}<div class="inspector-empty"><Icon name="pen" size={26}/><h3>Noch keine Inschrift</h3><p>Legen Sie eine Inschrift an. Hier lesen Sie anschließend alle Namen, Daten und Sonderzeichen im Wortlaut.</p><button class="btn" onclick={()=>addKind='inscription'} disabled={!canEdit||isHistoric}>Inschrift hinzufügen</button></div>{/if}</div>
      {:else if tab==='bom'}<div class="inspector-body secondary-inspector">{#if bom}<section class="bom-panel"><header><div><h2>Stück- und Bearbeitungsliste</h2></div><button class="btn small" onclick={()=>exportPlan('bom')}><Icon name="download" size={15}/>Exportieren</button></header><div class="bom-scroll"><table><thead><tr><th>Bauteil</th><th>Ausführung</th><th>Menge</th><th>Nettofläche</th><th>Stärke</th><th>Kante</th></tr></thead><tbody>{#each bom.lines as line}<tr><td><button onclick={()=>{selectedIds=[line.elementId];openInspector('properties');}}>{line.label}</button></td><td>{line.category}{#if activeSnapshot!.elements.some(element=>element.id===line.elementId&&element.kind==='room')} · Wandachsen{/if}</td><td>{line.quantity} {line.unit}</td><td>{line.netAreaM2===null?'—':`${line.netAreaM2} m²`}</td><td>{line.thicknessMm===null?'Offen':`${line.thicknessMm} mm`}</td><td>{line.edgeLengthM===null?'—':`${line.edgeLengthM} m`}</td></tr>{/each}</tbody></table></div><footer>{#if snapshot.kind==='room_plan'}Raumflächen und Bodenschichten beziehen sich auf die Wandachsen. Für Belagsmengen eine eigene Belagsfläche mit bestätigten Innenmaßen anlegen. {/if}Kein pauschaler Verschnitt oder Gewicht ohne bestätigte Regel. {bom.totals.unresolvedVolumeCount} Bauteile mit ungeklärtem Volumen.</footer></section>{/if}</div>
      {:else if tab==='images'}<div id="studio-presentations" class="inspector-body presentation-inspector"><h3>Realistische Bilder</h3><p class="field-hint">Entwickeln Sie eine fotorealistische Ansicht oder bearbeiten Sie ein vorhandenes Foto. Qualität und Kosten wählen Sie vor dem Start.</p><button class="btn small" onclick={()=>openVisualization()} disabled={!canEdit||isHistoric}>Fotorealistisches Bild erstellen</button><button class="btn small" onclick={()=>openVisualization('photo')} disabled={!canEdit||isHistoric}><Icon name="camera" size={15}/>Foto bearbeiten</button><details class="presentation-advanced"><summary>Bestandsinschrift schützen</summary><p class="field-hint">Für die verbindliche Kundenfassung bestehende Schrift über geprüfte Originalpixel erhalten.</p><button class="btn small" onclick={openComposite} disabled={!canEdit||isHistoric}>Konzeptbild mit geschütztem Bestand</button></details><h3 class="mt">Technische Ansichten</h3><p class="field-hint">Die Modelldarstellung gibt die gespeicherte Geometrie wieder.</p><label class="inspector-label">Auflösung<select use:searchableSelect={renderProfile} bind:value={renderProfile}><option value="preview">Kundenansicht · 1440 × 1080</option><option value="final">Finale Ansicht · 3840 × 2880</option></select></label><button class="btn small" onclick={requestRender} disabled={isHistoric||renderRequestBusy}>{renderRequestBusy?'Wird angefordert …':'Renderauftrag anfordern'}</button><button class="btn small" onclick={refreshRenderStatus} disabled={renderStatusBusy}>{renderStatusBusy?'Wird aktualisiert …':'Renderstatus aktualisieren'}</button>{#each renderJobs as job}<div class="render-record"><strong>{job.profile==='concept'?'Geschütztes Konzeptbild':job.profile==='final'?'Finale Ansicht':'Kundenansicht'}</strong><span>{job.status==='completed'?'Fertig':job.status==='running'?'Wird berechnet':job.status==='pending'?'Wartet':job.status==='unavailable'?'Dienst fehlt':job.status==='failed'?'Prüfung erforderlich':job.status}</span><small>{job.revision_id===baseRevisionId?'Aktueller Planstand':'Früherer Planstand'}</small>{#if job.last_error}<p>{job.last_error}</p>{/if}</div>{/each}{#each renderArtifacts as artifact}<a data-sveltekit-reload class="render-record" href={`/api/v1/documents/${artifact.document_id}/download${artifact.document_version_id?'?version='+artifact.document_version_id:''}`} target="_blank" rel="noreferrer"><strong>Gespeicherte Ansicht · {artifact.width_px} × {artifact.height_px} px</strong><small>{artifact.revision_id===baseRevisionId?'Aktueller Planstand':'Früherer Planstand'} · {artifact.kind==='protected_composite'?'Konzept · Originalpixel geschützt':artifact.accuracy==='verified_geometry'?'Geprüfte Plangeometrie':'Modelldarstellung'}</small></a>{/each}<p class="field-hint">Render benötigt einen eingerichteten Worker. Ein generiertes Bild ist keine technische Zeichnung.</p><div class="inspector-actions"><button class="btn small" onclick={()=>exportPlan('svg')}>SVG</button><button class="btn small" onclick={()=>exportPlan('bom')}>Stückliste exportieren</button></div><h3 class="mt">Planungsunterlagen</h3><p class="field-hint">PDF mit Ansichten, Maßen und Stückliste aus dem gespeicherten Stand.</p><button class="btn small" onclick={()=>exportPlan('pdf')}><Icon name="download" size={15}/>Planungs-PDF herunterladen</button></div>{:else if tab==='checks'}<div class="inspector-body"><h2>Prüfstand</h2><p class="field-hint">{releaseValidation.blocking.length} Punkte verhindern derzeit eine technische Freigabe. Der Entwurf bleibt bearbeitbar.</p>{#each releaseValidation.blocking as issue}<div class="check-item"><Icon name="alert" size={15}/><div><p>{describeStudioIssue(activeSnapshot,issue).message}</p>{#if describeStudioIssue(activeSnapshot,issue).elementId}<button class="text-button" onclick={()=>repairIssue(issue)}>{describeStudioIssue(activeSnapshot,issue).fieldLabel??'Bauteil'} öffnen</button>{/if}</div></div>{/each}{#each releaseValidation.warnings as issue}<div class="check-item neutral"><Icon name="help" size={15}/><div><p>{describeStudioIssue(activeSnapshot,issue).message}</p>{#if describeStudioIssue(activeSnapshot,issue).elementId}<button class="text-button" onclick={()=>repairIssue(issue)}>{describeStudioIssue(activeSnapshot,issue).fieldLabel??'Bauteil'} öffnen</button>{/if}</div></div>{/each}<div class="inspector-section"><h3>Freigaben sind getrennt</h3><p class="field-hint">Kundenbestätigung von Text oder Gestaltung ersetzt keine technische Fachprüfung oder Genehmigung.</p><button class="btn small" onclick={()=>approvalOpen=!approvalOpen} disabled={isHistoric}>Zustimmung dokumentieren</button>{#if approvalOpen}<form class="approval-form" onsubmit={approve}><label class="inspector-label">Art<select use:searchableSelect={approvalKind} bind:value={approvalKind}><option value="design">Gestaltung</option><option value="inscription">Wörtliche Inschrift</option><option value="technical">Technische Prüfung</option></select></label><label class="inspector-label">Konkrete Erklärung<textarea bind:value={statement} required rows="4" placeholder="Prüfumfang und Nachweis für genau diese Revision"></textarea></label><button class="btn small primary" type="submit">An diese Revision binden</button></form>{/if}</div><div class="inspector-section"><button class="btn small" onclick={()=>releaseOpen=!releaseOpen} disabled={!canRelease||releaseValidation.blocking.length>0||isHistoric}>Fertigungsfreigabe vorbereiten</button>{#if releaseOpen}<form onsubmit={release}><label class="inspector-label">Fachlicher Freigabegrund<textarea bind:value={releaseReason} required rows="3"></textarea></label><p class="font-warning">Fertigung erst mit vollständig geprüftem Paket. Diese Aktion ist verbindlich und wird serverseitig autorisiert.</p><button class="btn small primary" type="submit">Diese Revision zur Fertigung freigeben</button></form>{/if}</div><div class="inspector-section"><ReleasePackages packages={data.related?.release_packages??[]} revisionId={baseRevisionId}/><button class="btn small" onclick={()=>openInspector('images')}><Icon name="image" size={15}/>Bilder & Exporte öffnen</button></div></div>
      {:else if tab==='compare'}{@const other=comparison()}<div class="inspector-body"><h2>Variantenvergleich</h2><label class="inspector-label">Vergleichsstand<select use:searchableSelect={compareId} bind:value={compareId}><option value="">Variante auswählen</option>{#each variants.filter((v:any)=>v.id!==snapshot!.variantId) as v}<option value={v.id}>{v.name}</option>{/each}</select></label>{#if other&&bom}<table class="compare-table"><thead><tr><th>Merkmal</th><th>Aktuell</th><th>Vergleich</th></tr></thead><tbody><tr><td>Bauteile</td><td>{bom.totals.pieces}</td><td>{other.totals.pieces}</td></tr><tr><td>Netto Stein (m²)</td><td>{bom.totals.stoneNetAreaM2}</td><td>{other.totals.stoneNetAreaM2}</td></tr><tr><td>Bearb. Kante (m)</td><td>{bom.totals.treatedEdgeLengthM}</td><td>{other.totals.treatedEdgeLengthM}</td></tr><tr><td>Produktpositionen</td><td>{bom.lines.filter(l=>l.category==='Katalogartikel').length}</td><td>{other.lines.filter(l=>l.category==='Katalogartikel').length}</td></tr><tr><td>Prüfpunkte</td><td>{bom.validation.warnings.length}</td><td>{other.validation.warnings.length}</td></tr></tbody></table>{#if comparedSnapshot}<ComparisonDetails current={activeSnapshot!} other={comparedSnapshot} currentName={historical?.name??sourceRevision?.name??variant?.name??'Aktueller Stand'} otherName={variants.find((v:any)=>v.id===compareId)?.name??'Vergleichsstand'} approvals={data.related?.approvals??[]} library={[...products,...materials,...fonts,...finishes]} onselect={id=>{selectedIds=[id];tab='properties';}}/>{/if}<p class="field-hint">Kosten entstehen aus freigegebenen Preisständen der Kalkulation. Für fehlende Preise wird keine Summe erfunden.</p>{:else}<p class="field-hint">Wählen Sie eine weitere Variante mit geladenem Revisionsstand.</p>{/if}</div>
      {:else}<div class="inspector-body"><h2>Varianten & Revisionen</h2><label class="inspector-label">Neue Variante<input bind:value={variantName} placeholder="Zum Beispiel Heller Naturstein"/></label><button class="btn small primary" onclick={()=>createVariant(historicalId||baseRevisionId)} disabled={!canEdit}>Aus diesem Stand anlegen</button><form class="inspector-section" onsubmit={nameRevision}><h3>Aktuellen Stand benennen</h3><label class="inspector-label">Revisionsbezeichnung<input bind:value={revisionName} maxlength="150" required placeholder="Zum Beispiel Abstimmung vom 17. Oktober" disabled={!canEdit||isHistoric||saving}/></label><button class="btn small" type="submit" disabled={!canEdit||isHistoric||saving||!revisionName.trim()}>Als benannte Revision speichern</button><p class="field-hint">Speichert einen neuen unveränderlichen Planstand. Freigaben bleiben an der jeweils geprüften ursprünglichen Revision.</p></form><div class="inspector-section"><h3>Gespeicherte Revisionen</h3>{#each revisions.filter((r:any)=>r.variant_id===snapshot!.variantId) as revision}<button class="revision-row" class:active={(historicalId||baseRevisionId)===revision.id} onclick={()=>historicalId=revision.id===baseRevisionId?'':revision.id}><strong>{revision.name??revision.label??`Revision ${revision.revision_number??revision.version??revision.id.slice(0,8)}`}</strong><small>{revision.created_at?new Date(revision.created_at).toLocaleString('de-DE'):'Unveränderlicher Planstand'}</small></button>{/each}</div></div>{/if}
    </div></WorkbenchPanel>{/if}
  </div>
  <footer class="workbench-status"><span>{isHistoric?'Historischer Stand':fullscreenMode==='native'?'Geräte-Vollbild':fullscreenMode==='fallback'?'Browserfenster':'Entwurfsplanung'} · Maße in mm</span><span class="keyboard-hint">Pfeiltasten: 1 mm · Umschalt: 10 mm · Strg/⌘ S: speichern</span></footer>

  {#if addKind}<AddElementDialog kind={addKind} {snapshot} {data} selectedId={selectedIds[0]??null} onprerequisite={(kind,done)=>{prerequisiteKind=kind;prerequisiteDone=done;}} onclose={()=>{addKind='';prerequisiteKind='';}} onadd={(ops,id)=>{applyBatch(ops,id);addKind='';}}/>{/if}
  {#if prerequisiteKind}<AddElementDialog kind={prerequisiteKind} {snapshot} {data} selectedId={null} onclose={()=>prerequisiteKind=''} onadd={(ops,id)=>{applyBatch(ops,id);prerequisiteDone(id);prerequisiteKind='';}}/>{/if}
{/if}

{#if glyphLayoutOpen&&selected?.kind==='inscription'&&activeSnapshot}<GlyphLayoutDialog inscription={selected} snapshot={activeSnapshot} glyphs={data.related?.glyphs??[]} evidence={data.related?.documents??[]} onsubmit={edit} onclose={()=>glyphLayoutOpen=false}/>{/if}
{#if sourcePlanOpen&&activeSnapshot}<SourcePlanDialog initialSourceVersion={librarySourceVersion} snapshot={activeSnapshot} documents={planningDocuments} referenceId={sourceReferenceId} disabled={!canEdit||isHistoric} onapply={(ops,id)=>{try{applyBatch(ops,id);}catch(problem){error=(problem as Error).message;throw problem;}}} onclose={()=>sourcePlanOpen=false}/>{/if}
{#if constraintOpen&&activeSnapshot}<ConstraintDialog snapshot={activeSnapshot} selectedId={selectedIds[0]??''} rules={data.related?.rules??[]} disabled={!canEdit||isHistoric} onapply={ops=>applyBatch(ops)} onclose={()=>constraintOpen=false}/>{/if}
{#if manufacturerOpen}<ManufacturerPicker studio={snapshot?.kind??'both'} canImportContour={!!selected&&['stone_piece','surface','clearance','grave_border'].includes(selected.kind)&&!selected.locked&&canEdit&&!isHistoric} onchoose={useManufacturer} onclose={()=>manufacturerOpen=false}/>{/if}
{#if libraryOutlineOpen&&activeSnapshot}<OutlineImportDialog documents={planningDocuments} planningProjectId={activeSnapshot.planningProjectId} initialSourceVersion={librarySourceVersion} initialUnit={librarySourceUnit} onapply={contour=>{applyBatch([{type:'set_contour',elementId:libraryTargetId,contour}]);}} onclose={()=>libraryOutlineOpen=false}/>{/if}
{#if visualizationOpen}<VisualizationDialog {data} revisionId={baseRevisionId} intent={visualizationMode} designKind={snapshot?.kind??'memorial'} jobs={data.related?.ai_visualizations??[]} onclose={()=>visualizationOpen=false}/>{/if}
{#if compositeOpen}<CompositeDialog revisionId={baseRevisionId} jobs={renderJobs} documents={planningDocuments} onclose={()=>compositeOpen=false}/>{/if}
<dialog class="studio-leave-dialog" bind:this={leaveDialog!} aria-labelledby="studio-leave-title" aria-describedby="studio-leave-description" oncancel={(event)=>{event.preventDefault();continueEditing();}} onclose={()=>{if(leaveOpen&&!navigationBusy)continueEditing();}}>
  <h2 id="studio-leave-title">Änderungen noch nicht gespeichert</h2>
  <p id="studio-leave-description">{saving?'Der aktuelle Speichervorgang läuft noch. Bitte warten Sie, bevor Sie die Planung verlassen.':hasUnsentChanges?'Die letzten Änderungen sind noch nicht auf dem Server gespeichert. Möchten Sie zuerst speichern oder hier weiterarbeiten?':'Alle Änderungen sind inzwischen gespeichert. Sie können jetzt zur nächsten Seite wechseln.'}</p>
  {#if hasUnsentChanges&&!saving}<p class="leave-backup">{localAvailable?'Ohne Speichern wechseln: Die ungesendeten Änderungen bleiben als Wiederherstellung in dieser Browser-Sitzung. Sie sind für andere Personen noch nicht verfügbar.':'Dieser Browser erlaubt keine Sitzungssicherung. Ohne Speichern gehen die ungesendeten Änderungen beim Verlassen verloren.'}</p>{/if}
  {#if navigationError}<p class="leave-error" role="alert">{describeStudioIssue(activeSnapshot,navigationError).message}</p>{:else if conflict}<p class="leave-error" role="alert">Ein Versionskonflikt verhindert das Speichern. Bearbeiten Sie den Konflikt oder erhalten Sie den lokalen Entwurf als getrennte Variante.</p>{/if}
  <div class="leave-actions"><button type="button" class="btn" disabled={navigationBusy} onclick={continueEditing}>Weiter bearbeiten</button><button type="button" class="btn" disabled={navigationBusy||saving} onclick={()=>continueNavigation(false)}>Ohne Speichern wechseln</button><button type="button" class="btn primary" disabled={navigationBusy||saving||!!conflict} onclick={()=>continueNavigation(true)}>{navigationBusy?'Wird gespeichert …':'Speichern und wechseln'}</button></div>
</dialog>
</div>
<style>
/* The application theme supplies surfaces. Technical drawing paper stays physical. */
.studio-root{container-type:inline-size;--studio-ink:var(--ink);--studio-green:var(--forest);--studio-muted:var(--muted);--studio-border:var(--line);color:var(--ink);min-width:0}
.studio-root.workbench{display:flex;flex-direction:column;height:var(--workbench-height,calc(100dvh - 200px));min-height:320px;overflow:hidden;background:var(--paper);border:1px solid var(--line);border-radius:18px;box-shadow:var(--panel-shadow,0 8px 26px #08111f0e);box-sizing:border-box}
.studio-root.workbench.is-fullscreen,.studio-root.workbench:fullscreen{position:fixed;inset:0;z-index:180;width:100%;height:100dvh;min-height:0;max-height:100dvh;max-width:none;padding:0;margin:0;overflow:hidden;border:0;border-radius:0;background:var(--paper);box-shadow:none;overscroll-behavior:contain}
.studio-heading{flex:none;min-width:0;padding:11px 16px 12px;border-bottom:1px solid var(--line-soft,var(--line));background:var(--paper)}
.studio-breadcrumb{display:flex;align-items:center;gap:7px;min-width:0;margin:0 0 7px;font-size:11px;line-height:1.4;color:var(--muted);white-space:nowrap;overflow:auto}
.studio-breadcrumb a{flex:none;color:var(--muted);text-decoration:none}
.studio-breadcrumb a:hover{text-decoration:underline;text-underline-offset:3px;color:var(--forest)}
.studio-breadcrumb :global(svg){flex:none}
.studio-title-row{display:flex;align-items:center;justify-content:space-between;gap:16px;min-width:0}
.studio-project-title{flex:1;min-width:0}
.studio-title-row h1{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0 0 6px;font-size:19px;font-weight:600;line-height:1.3;letter-spacing:-.025em}
.studio-title-row p{display:flex;align-items:center;gap:6px;min-width:0;margin:0;color:var(--muted);font-size:11px;line-height:1.5}
.sync-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sync-dot{flex:none;width:6px;height:6px;border-radius:50%;background:var(--success)}
.sync-dot.unsaved{background:var(--warning)}
.sync-dot.has-conflict{background:var(--danger)}
.revision-chip{flex:none;padding:2px 5px;border-radius:4px;background:var(--wash);font-variant-numeric:tabular-nums;white-space:nowrap}
.compact-variant-name{display:inline;padding:2px 6px;border-radius:5px;background:var(--wash);font-size:10px}
.heading-actions{display:flex;flex:none;align-items:center;gap:7px}
.heading-actions .btn{min-height:38px;padding:8px 11px;gap:6px;font-size:12px;white-space:nowrap}
.heading-actions :global(svg){flex:none}
.studio-notice{display:flex;flex:none;align-items:flex-start;gap:10px;max-height:120px;overflow:auto;padding:10px 14px;color:var(--ink);background:var(--wash);font-size:12px;line-height:1.6;border-bottom:1px solid var(--line)}
.studio-notice span{flex:1;white-space:pre-wrap}
.studio-notice :global(svg){flex:none;margin-top:2px}
.studio-notice button{display:grid;place-items:center;flex:none;min-width:32px;min-height:32px;padding:0;border:0;border-radius:6px;background:transparent;color:inherit;font-size:20px;cursor:pointer}
.studio-notice.danger,.conflict-panel{background:var(--danger-wash);color:var(--danger)}
.studio-notice.warning{background:var(--warning-wash);color:var(--warning)}
.conflict-panel{flex:none;max-height:180px;overflow:auto;padding:14px;border-bottom:1px solid var(--line)}
.conflict-panel h3{margin:0 0 7px;font-size:15px}
.conflict-panel p{margin:0 0 10px;font-size:13px;line-height:1.6}
.conflict-panel>div{display:flex;flex-wrap:wrap;gap:8px}
.variant-bar{display:flex;flex:none;align-items:center;gap:13px;min-height:39px;padding:0 15px;overflow:auto;background:var(--input-surface,var(--paper));border-bottom:1px solid var(--line-soft,var(--line))}
.variant-tabs{display:flex;flex:none;align-self:stretch;gap:18px;min-width:0;white-space:nowrap}
.variant-tabs a{display:flex;flex:none;align-items:center;gap:7px;min-height:39px;padding:0 1px;border-bottom:2px solid transparent;color:var(--muted);font-size:12px;font-weight:500;text-decoration:none}
.variant-tabs a.active{color:var(--forest);border-bottom-color:var(--forest)}
.variant-tabs small{padding:2px 5px;border-radius:4px;background:var(--wash);color:var(--muted);font-size:10px;font-weight:400}
.text-button{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 3px;border:0;background:transparent;color:var(--forest);font:inherit;font-size:12px;line-height:1.5;cursor:pointer;text-align:left}
.variant-bar>.text-button{flex:none;white-space:nowrap}
.variant-divider{flex:none;width:1px;height:17px;background:var(--line)}
.editor-toolbar{display:flex;flex:none;flex-direction:column;gap:8px;padding:9px 12px;border-bottom:1px solid var(--line);background:var(--paper)}
.main-tools,.view-tools{display:flex;align-items:center;gap:9px;min-width:0}
.main-tools{flex-wrap:wrap}
.view-tools{justify-content:flex-start}
.tool-group,.panel-tools{display:flex;flex:none;align-items:center;gap:3px}
.tool-group{padding-right:9px;border-right:1px solid var(--line-soft,var(--line))}
.panel-tools{margin-left:0}
.editor-toolbar button{display:inline-flex;flex:none;align-items:center;justify-content:center;gap:6px;min-width:34px;min-height:34px;padding:7px 9px;border:0;border-radius:7px;background:transparent;color:var(--muted);font:inherit;font-size:12px;line-height:1.4;white-space:nowrap;cursor:pointer}
.editor-toolbar button:hover{background:var(--wash);color:var(--ink)}
.editor-toolbar button.active{color:var(--forest);background:var(--accent-wash)}
.editor-toolbar button:disabled{opacity:.45;cursor:default}
.editor-toolbar .add-tool{background:var(--wash);color:var(--ink)}
.editor-toolbar .add-tool:hover{background:var(--accent-wash);color:var(--forest)}
.selection-count{display:grid;place-items:center;min-width:18px;height:18px;padding:0 3px;border-radius:4px;background:var(--paper);font-size:10px;font-variant-numeric:tabular-nums}
.view-toggle{display:flex;flex:none;gap:2px;padding:3px;border-radius:8px;background:var(--wash)}
.view-toggle button{min-height:30px;padding:5px 11px;font-size:12px}
.view-toggle button.active{background:var(--paper);color:var(--forest);box-shadow:0 2px 5px #08111f13}
.view-caption{flex:1;min-width:0;color:var(--muted);font-size:11px}
.editor-toolbar .display-tool,.editor-toolbar .fit-button{padding:6px 9px;color:var(--ink)}
.historic-bar{display:flex;flex:none;align-items:center;flex-wrap:wrap;gap:8px 15px;max-height:115px;overflow:auto;padding:9px 15px;border-bottom:1px solid var(--line);background:var(--warning-wash);color:var(--warning);font-size:12px;line-height:1.5}
.historic-bar button{min-height:32px;padding:0;border:0;background:none;color:inherit;font:inherit;font-size:12px;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.placement-details{margin:12px 0 18px;padding:11px 12px;border:1px solid var(--line-soft,var(--line));border-radius:11px;background:var(--input-surface)}
.placement-details>summary{min-height:26px;color:var(--ink);font-size:12px;font-weight:500;cursor:pointer;line-height:1.6}
.placement-details[open]>summary{margin-bottom:16px}
@container(min-width:1040px){.editor-toolbar{flex-direction:row;align-items:center;justify-content:space-between;gap:12px}.main-tools{flex:none}.view-tools{flex:1;justify-content:flex-end}.view-caption{display:none}}
.studio-workspace{position:relative;display:grid;flex:1;grid-template-columns:215px minmax(0,1fr) 286px;min-width:0;min-height:0;overflow:hidden;background:var(--input-surface,var(--paper))}
.studio-workspace.left-hidden{grid-template-columns:minmax(0,1fr) 286px}
.studio-workspace.right-hidden{grid-template-columns:215px minmax(0,1fr)}
.studio-workspace.left-hidden.right-hidden{grid-template-columns:minmax(0,1fr)}
.studio-root[data-compact=true] .studio-workspace{grid-template-columns:minmax(0,1fr)}
.element-panel{display:flex;flex:1;flex-direction:column;min-height:0;min-width:0;overflow:hidden;background:var(--input-surface,var(--paper))}
.tree-tools{display:grid;flex:none;gap:7px;padding:12px}
.tree-tools input{box-sizing:border-box;width:100%;min-width:0;min-height:38px;padding:9px 10px;border:1px solid var(--line);border-radius:7px;background:var(--paper);color:var(--ink);font:inherit;font-size:12px}
.tree-tools select{min-height:36px;padding:6px 8px;border:1px solid var(--line);border-radius:7px;background:var(--paper);color:var(--ink);font:inherit;font-size:12px}
.selection-tools{display:flex;flex:none;align-items:center;justify-content:space-between;gap:8px;padding:0 12px 9px;font-size:11px;line-height:1.5}
.selection-tools label{display:flex;align-items:center;gap:6px;min-height:36px}
.selection-tools input{flex:none;accent-color:var(--forest)}
.selection-tools button{min-height:36px;padding:3px;border:0;background:none;color:var(--forest);font:inherit;font-size:11px;text-align:right;cursor:pointer}
.selection-tools button:disabled{color:var(--muted);opacity:.5;cursor:default}
.element-tree{flex:1;min-height:0;padding:0 6px 8px;overflow:auto;overscroll-behavior:contain}
.element-tree button{display:flex;align-items:center;gap:7px;box-sizing:border-box;width:100%;min-height:47px;padding:9px 8px;border:0;border-radius:7px;background:transparent;color:var(--muted);font:inherit;text-align:left;cursor:pointer}
.element-tree button:hover{background:var(--wash)}
.element-tree button>span{flex:1;min-width:0;overflow-wrap:anywhere;color:var(--ink);font-size:12px;font-weight:500;line-height:1.5}
.element-tree button :global(svg){flex:none}
.element-tree button small{display:block;margin-top:3px;color:var(--muted);font-size:10px;font-weight:400}
.element-tree button.selected{background:var(--accent-wash)}
.element-tree button.selected>span{color:var(--forest)}
.element-tree button.child{padding-left:16px}
.element-tree button.subtle{min-height:34px;padding-block:6px}
.tree-empty{padding:15px 10px;color:var(--muted);font-size:12px;line-height:1.7}
.tree-empty p{margin:0 0 7px}
.add-elements{flex:none;max-height:35%;padding:13px 12px;overflow:auto;border-top:1px solid var(--line);background:var(--paper);overscroll-behavior:contain}
.add-elements>span{color:var(--ink);font-size:12px;font-weight:600}
.add-elements>div{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:9px}
.add-elements button{display:flex;align-items:center;gap:4px;min-width:0;min-height:36px;padding:7px;border:1px solid var(--line);border-radius:7px;background:var(--paper);color:var(--ink);font:inherit;font-size:11px;line-height:1.5;text-align:left;cursor:pointer}
.add-elements button :global(svg){flex:none}
.add-elements button:hover{background:var(--wash)}
.add-elements button:disabled{opacity:.5;cursor:default}
.canvas-panel{position:relative;display:flex;flex-direction:column;min-height:0;min-width:0;height:100%;overflow:hidden;background:var(--wash)}
.canvas-context{position:relative;z-index:1;display:flex;flex:none;flex-wrap:wrap;align-items:center;gap:6px;min-height:40px;padding:5px 8px;border-bottom:1px solid var(--line);background:var(--wash);color:var(--muted);font-size:11px;line-height:1.5}
.canvas-active-element{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink)}
.canvas-context>span:last-child{flex:none;font-size:10px;white-space:nowrap;font-variant-numeric:tabular-nums}
.canvas-context .tool-group{padding:0;border:0}
.canvas-context button{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-width:32px;min-height:32px;padding:6px;border:0;border-radius:6px;background:transparent;color:var(--muted);font:inherit;font-size:11px;line-height:1.5;white-space:nowrap;cursor:pointer}
.canvas-context button.active{background:var(--paper);color:var(--forest)}
.canvas-context button:hover{background:var(--paper);color:var(--ink)}
.canvas-context button:disabled{opacity:.45;cursor:default}
.canvas-panel>svg{display:block;flex:1;width:100%;height:0;min-height:0;touch-action:none;color-scheme:light;background:#f6f7f2;color:#202522;--forest:#315c4c;--muted:#58625b;--ink:#202522}
.canvas-panel>svg:focus-visible{outline:2px solid #315c4c;outline-offset:-3px}
.plan-shape{cursor:pointer}
.plan-shape:focus-visible{outline:none;filter:drop-shadow(0 1px 2px #315c4c)}
.plan-shape:hover path{stroke:#315c4c}
.secondary-shape{pointer-events:none;opacity:.65}
.move-mode .plan-shape{cursor:move}
.pan-mode{cursor:grab}
.pan-mode:active{cursor:grabbing}
.text-anchor{cursor:pointer}
.snap-marker{filter:drop-shadow(0 1px 2px #fff)}
.canvas-empty{position:absolute;inset:40px 0 42px;display:flex;align-items:flex-start;justify-content:center;padding:16px;text-align:center;pointer-events:none;overflow:auto}
.canvas-empty-content{display:flex;flex-direction:column;align-items:center;box-sizing:border-box;width:min(100%,390px);margin-block:auto;padding:23px 20px;border-radius:14px;background:var(--paper);color:var(--ink);box-shadow:0 8px 28px #08111f12}
.canvas-empty button{pointer-events:auto;margin-top:12px}
.canvas-empty h3{margin:14px 0 8px;color:var(--ink);font-size:18px;font-weight:600;letter-spacing:-.025em;line-height:1.4}
.canvas-empty p{max-width:340px;margin:0;color:var(--muted);font-size:12px;line-height:1.7}
.plan-mark{display:grid;place-items:center;width:46px;height:50px;border-radius:22px 22px 6px 6px;background:var(--wash);color:var(--forest)}
.canvas-bottom{display:flex;flex:none;align-items:center;justify-content:space-between;gap:8px;min-height:42px;padding:5px 10px;border-top:1px solid var(--line);background:var(--paper);color:var(--muted);font-size:11px;font-variant-numeric:tabular-nums;box-sizing:border-box}
.canvas-selection{display:flex;align-items:center;gap:6px;min-width:0}
.canvas-selection>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.plan-units{display:none}
.zoom-control{display:flex;flex:none;align-items:center;gap:6px}
.zoom-control>span{min-width:39px;text-align:center}
.canvas-bottom button{display:inline-flex;flex:none;align-items:center;justify-content:center;min-width:30px;min-height:30px;padding:3px;border:0;border-radius:6px;background:var(--wash);color:var(--ink);font:inherit;font-size:17px;cursor:pointer}
.canvas-bottom .selection-properties{gap:2px;padding:5px;color:var(--forest);background:var(--accent-wash);font-size:11px}
.canvas-bottom button:hover{background:var(--accent-wash);color:var(--forest)}
.workbench-status{display:flex;flex:none;align-items:center;gap:15px;box-sizing:border-box;min-height:64px;padding:10px 158px 10px 15px;border-top:1px solid var(--line-soft,var(--line));background:var(--input-surface,var(--paper));color:var(--muted);font-size:11px;line-height:1.6}
.workbench-status>span:first-child{flex:none}
.keyboard-hint{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}
.workbench.is-fullscreen :global(.assistant-trigger){right:12px;bottom:10px}
.workbench.is-fullscreen :global(.assistant-drawer){bottom:12px;right:12px;max-height:calc(100dvh - 24px)}
.canvas-panel :global(.three-stage){position:relative;flex:1;min-height:0;height:0;overflow:hidden}
.canvas-panel :global(.three-canvas){flex:1;min-height:0;height:100%}
.canvas-panel :global(.three-footer){position:relative;inset:auto;flex:0 1 auto;min-height:44px;max-height:35%;overflow:auto;border:0;border-top:1px solid var(--line);border-radius:0;background:var(--paper);box-shadow:none;overscroll-behavior:contain}
.canvas-panel :global(.three-caption){font-size:11px;padding:0 12px 9px}
.canvas-panel :global(.three-unresolved){font-size:11px;padding:8px 12px}
.canvas-panel :global(.camera-disclosure>summary){padding:9px 12px;font-size:12px;min-height:38px}
.canvas-panel :global(.camera-disclosure>summary span){font-size:11px}
/* Expanded camera controls occupy their own viewport region. ThreeScene refits
   the real model when the remaining drawing surface changes size. */
.canvas-panel :global(.three-stage:has(.camera-disclosure[open])){flex-direction:row}
.canvas-panel :global(.three-stage:has(.camera-disclosure[open]) .three-canvas){flex:1 1 0;min-width:0;min-height:0}
.canvas-panel :global(.three-stage:has(.camera-disclosure[open]) .three-footer){position:relative;inset:auto;align-self:stretch;flex:0 0 216px;width:216px;height:100%;max-height:100%;max-width:none;border-width:0 0 0 1px;border-radius:0;box-shadow:none;overflow:auto}
.canvas-panel :global(.three-stage:has(.camera-disclosure[open]) .camera-disclosure>summary span){display:block;margin:3px 0 0;font-size:11px;line-height:1.5}
.canvas-panel :global(.three-stage:has(.camera-disclosure[open]) .camera-tools){display:grid;grid-template-columns:minmax(0,1fr);gap:12px;padding:0 10px 12px}
.canvas-panel :global(.three-stage:has(.camera-disclosure[open]) .camera-tools>div){display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;min-width:0}
.canvas-panel :global(.three-stage:has(.camera-disclosure[open]) .camera-tools span){grid-column:1/-1;min-width:0;margin-bottom:2px;font-size:12px}
.canvas-panel :global(.three-stage:has(.camera-disclosure[open]) .camera-tools button){min-width:0;min-height:44px;padding:6px;font-size:12px}
.inspector{display:flex;flex:1;flex-direction:column;min-height:0;min-width:0;overflow:hidden;background:var(--paper)}
.inspector>nav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));flex:none;gap:3px;min-width:0;padding:6px 8px;overflow:auto;border-bottom:1px solid var(--line);background:var(--paper);scrollbar-width:thin}
.inspector>nav button{flex:none;min-height:34px;padding:7px 8px;border:0;border-radius:7px;background:transparent;color:var(--muted);font:inherit;font-size:11px;line-height:1.5;white-space:nowrap;cursor:pointer}
.inspector>nav button.active{background:var(--accent-wash);color:var(--forest)}
.inspector>nav button:hover{background:var(--wash)}
.inspector-body{flex:1;min-height:0;min-width:0;padding:19px 16px 26px;overflow:auto;overscroll-behavior:contain}
.inspector-body h2{margin:0 0 13px;color:var(--ink);font-size:17px;font-weight:600;letter-spacing:-.025em;line-height:1.4;overflow-wrap:anywhere}
.inspector-kind{margin:-5px 0 18px;color:var(--muted);font-size:12px;line-height:1.6}
.inspector-body fieldset{min-width:0;margin:0;padding:0;border:0}
.inspector-label{display:block;margin:0 0 17px;color:var(--ink);font-size:13px;font-weight:500;line-height:1.6}
.inspector-label input,.inspector-label select,.inspector-label textarea,.xyz-fields input{display:block;box-sizing:border-box;width:100%;min-width:0;min-height:40px;margin-top:7px;padding:9px 10px;border:1px solid var(--line);border-radius:8px;background:var(--input-surface,var(--paper));color:var(--ink);font:inherit;font-size:13px;font-weight:400;font-variant-numeric:tabular-nums}
.inspector-label textarea{line-height:1.7;resize:vertical}
.inspector-label input:focus,.inspector-label select:focus,.inspector-label textarea:focus,.xyz-fields input:focus{outline:2px solid var(--forest);outline-offset:2px}
.inspector-label input[type=color]{max-width:90px;height:44px;padding:5px}
.inspector-section{margin:21px 0 0;padding:21px 0 0;border-top:1px solid var(--line-soft,var(--line))}
.inspector-section h3{margin:0 0 13px;color:var(--ink);font-size:13px;font-weight:600;line-height:1.5}
.xyz-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.xyz-fields.two{grid-template-columns:repeat(2,minmax(0,1fr))}
.xyz-fields label{color:var(--muted);font-size:12px;line-height:1.5}
.xyz-fields input{padding:8px}
.field-hint{margin:10px 0 16px;color:var(--muted);font-size:12px;line-height:1.7;overflow-wrap:anywhere}
.inspector-info{display:flex;align-items:flex-start;gap:7px;margin-bottom:15px;padding:11px;border-radius:8px;background:var(--wash);color:var(--muted);font-size:12px;line-height:1.7}
.inspector-info :global(svg){flex:none;margin-top:2px}
.font-reference{margin:0 0 12px;padding:10px;border-radius:8px;background:var(--wash)}
.font-reference img{display:block;width:100%;height:90px;object-fit:contain;background:#fff;color-scheme:light}
.font-reference figcaption{margin-top:7px;color:var(--muted);font-size:12px;line-height:1.7}
.font-warning{margin:12px 0 18px;padding:11px;border-radius:8px;background:var(--warning-wash);color:var(--warning);font-size:12px;line-height:1.7}
.supplier-details,.presentation-advanced{margin:20px 0;padding:13px;border-radius:10px;background:var(--wash)}
.supplier-details summary,.presentation-advanced summary{min-height:30px;color:var(--ink);font-size:12px;font-weight:600;line-height:1.6;cursor:pointer}
.inspector-actions{display:flex;flex-wrap:wrap;gap:7px;margin:14px 0}
.inspector-actions .btn,.inspector-footer .btn{min-height:36px;padding:8px 9px;font-size:12px;line-height:1.5}
.inspector-footer{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px;padding-top:17px;border-top:1px solid var(--line)}
.delete-element{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:5px;border:0;background:none;color:var(--danger);font:inherit;font-size:12px;cursor:pointer}
.delete-element:disabled{opacity:.45;cursor:default}
.inspector-empty{flex:1;min-height:0;padding:30px 20px;overflow:auto;color:var(--muted);text-align:center;font-size:13px;line-height:1.7;overscroll-behavior:contain}
.inspector-empty h3{margin:12px 0 8px;color:var(--ink);font-size:16px;font-weight:600;letter-spacing:-.02em}
.inspector-empty p{margin:0 0 13px;font-size:12px;line-height:1.8}
.check-item{display:flex;align-items:flex-start;gap:8px;padding:12px 0;border-bottom:1px solid var(--line-soft,var(--line));color:var(--muted)}
.check-item :global(svg){flex:none;margin-top:3px}
.check-item p{margin:0;font-size:13px;line-height:1.65}
.check-item .text-button{margin-top:5px;min-height:36px;font-size:12px;text-decoration:underline;text-underline-offset:3px;white-space:normal}
.revision-row{display:block;width:100%;margin:8px 0;padding:12px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink);font:inherit;text-align:left;cursor:pointer}
.revision-row strong{display:block;font-size:12px;font-weight:500;line-height:1.5}
.revision-row small{display:block;margin-top:6px;color:var(--muted);font-size:11px;line-height:1.6}
.revision-row.active{border-color:var(--forest);background:var(--accent-wash)}
.compare-table{width:100%;margin:20px 0;border-collapse:collapse;font-size:11px}
.compare-table th,.compare-table td{padding:10px 4px;border-bottom:1px solid var(--line);line-height:1.7;text-align:left;overflow-wrap:anywhere}
.compare-table th{color:var(--muted);font-weight:500}
.presentation-inspector>.btn{width:100%;justify-content:flex-start;margin:5px 0;font-size:12px}
.render-record{display:grid;gap:5px;padding:12px 0;border-bottom:1px solid var(--line-soft,var(--line));color:inherit;font-size:12px;line-height:1.6;text-decoration:none;overflow-wrap:anywhere}
.render-record small,.render-record p{margin:0;color:var(--muted);font-size:12px}
.secondary-inspector{padding:0}
.literal-preview,.bom-panel{min-width:0;background:var(--paper)}
.literal-preview>header,.bom-panel>header{display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:18px 16px;border-bottom:1px solid var(--line-soft,var(--line))}
.literal-preview>header h2,.bom-panel>header h2{margin:0;font-size:16px;font-weight:600;line-height:1.5;letter-spacing:-.02em}
.literal-preview>header>span{color:var(--muted);font-size:12px;line-height:1.6}
.literal-groups article{padding:18px 16px;border-bottom:1px solid var(--line-soft,var(--line))}
.literal-groups article.selected{background:var(--accent-wash)}
.literal-groups article>button{display:flex;align-items:center;gap:8px;min-height:36px;padding:0;border:0;background:none;color:var(--forest);font:inherit;font-size:12px;line-height:1.5;text-align:left;cursor:pointer}
.literal-groups article>button span{display:grid;place-items:center;flex:none;min-width:20px;height:20px;border:1px solid var(--line);border-radius:5px;font-size:10px}
.literal-groups article>p{margin:14px 0;color:var(--ink);font-size:19px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere}
.literal-groups small{color:var(--muted);font-size:12px;line-height:1.7}
.bom-scroll{overflow:auto}
.bom-panel table{width:100%;border-collapse:collapse;font-size:12px;text-align:left;white-space:nowrap}
.bom-panel th,.bom-panel td{padding:12px 16px;border-bottom:1px solid var(--line-soft,var(--line))}
.bom-panel th{color:var(--muted);font-size:11px;font-weight:500;background:var(--input-surface,var(--paper))}
.bom-panel td{color:var(--muted)}
.bom-panel td button{min-height:36px;padding:0;border:0;background:none;color:var(--forest);font:inherit;text-align:left;cursor:pointer}
.bom-panel footer{padding:16px;color:var(--muted);font-size:12px;line-height:1.7}
.inscription-font-select{box-sizing:border-box;width:100%;min-height:40px;margin:0 0 16px;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--input-surface,var(--paper));color:var(--ink);font:inherit;font-size:13px}
.workbench-popover{position:fixed;inset:auto;box-sizing:border-box;width:min(340px,calc(100% - 24px));max-width:calc(100% - 24px);max-height:calc(100dvh - 24px);margin:0;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--paper);color:var(--ink);box-shadow:var(--overlay-shadow,0 12px 35px #08111f28);overflow:auto;overscroll-behavior:contain}
.workbench-popover h2{margin:3px 4px 10px;font-size:14px;font-weight:600;line-height:1.5;letter-spacing:-.015em}
.workbench-popover h3{margin:13px 4px 7px;font-size:13px;font-weight:600;line-height:1.5}
.project-menu>button,.project-menu>a,.add-menu button{display:flex;align-items:center;gap:10px;box-sizing:border-box;width:100%;min-height:42px;padding:9px 10px;border:0;border-radius:8px;background:transparent;color:var(--ink);font:inherit;font-size:13px;line-height:1.5;text-align:left;text-decoration:none;cursor:pointer}
.project-menu>button :global(svg),.project-menu>a :global(svg),.add-menu button :global(svg){flex:none;color:var(--muted)}
.project-menu>button:hover,.project-menu>a:hover,.add-menu button:hover{background:var(--wash)}
.project-menu>button:disabled,.add-menu button:disabled{opacity:.45;cursor:default}
.project-menu small{display:block;margin-top:3px;color:var(--muted);font-size:11px;line-height:1.5}
.project-menu-title{margin:0 4px 5px;color:var(--ink);font-size:15px;font-weight:600;line-height:1.5;overflow-wrap:anywhere}
.project-menu-state{margin:0 4px 10px;color:var(--muted);font-size:12px;line-height:1.6;overflow-wrap:anywhere}
.project-variants{margin-top:8px;border-top:1px solid var(--line-soft,var(--line))}
.project-variants summary{min-height:44px;padding:11px 8px;box-sizing:border-box;font-size:13px;font-weight:500;line-height:1.6;cursor:pointer}
.project-variants nav{display:grid;gap:3px;margin:0 0 8px}
.project-variants a,.project-variants button{display:flex;align-items:center;gap:7px;box-sizing:border-box;width:100%;min-height:42px;padding:9px 10px;border:0;border-radius:7px;background:transparent;color:var(--ink);font:inherit;font-size:12px;line-height:1.5;text-align:left;text-decoration:none;cursor:pointer}
.project-variants a{justify-content:space-between;overflow-wrap:anywhere}
.project-variants a.active{background:var(--accent-wash);color:var(--forest)}
.project-variants a:hover,.project-variants button:hover{background:var(--wash)}
.project-variants button:disabled{opacity:.45;cursor:default}
.add-menu>div{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.popover-divider{height:1px;margin:9px 2px;background:var(--line-soft,var(--line))}
.popover-hint,.canvas-disclaimer{margin:0 4px 12px;color:var(--muted);font-size:12px;line-height:1.7}
.editing-hint{display:block;margin-top:7px}
.compact-check{display:flex;align-items:center;gap:10px;min-height:44px;padding:6px 4px;color:var(--ink);font-size:13px;line-height:1.6;cursor:pointer}
.compact-check input{flex:none;width:17px;height:17px;accent-color:var(--forest)}
.compact-check small{display:block;color:var(--muted);font-size:11px;line-height:1.6}
.grid-width{margin:5px 4px 10px}
.grid-width input{max-width:140px}
.studio-entry{display:grid;grid-template-columns:1fr 1fr;min-width:0;overflow:hidden;border:1px solid var(--line);border-radius:14px;background:var(--paper)}
.entry-intro{padding:29px;border-right:1px solid var(--line);background:var(--input-surface,var(--wash))}
.entry-intro h2{margin:0 0 14px;color:var(--ink);font-size:27px;line-height:1.25;font-weight:600;letter-spacing:-.03em}
.entry-intro>p{max-width:400px;color:var(--muted);font-size:14px;line-height:1.75}
.entry-types{display:grid;gap:10px;margin-top:25px}
.entry-types>button{display:flex;align-items:center;gap:15px;min-width:0;padding:15px;border:1px solid var(--line);border-radius:10px;background:var(--paper);color:var(--ink);text-align:left;cursor:pointer}
.entry-types>button:hover{background:var(--wash)}
.entry-types>button.chosen{border-color:var(--forest);background:var(--accent-wash)}
.entry-types button>span{flex:1;min-width:0;font-size:15px;font-weight:550}
.entry-types button small{display:block;margin-top:5px;color:inherit;font-size:13px;font-weight:400;line-height:1.6}
.entry-types button :global(svg){flex:none}
.project-form{padding:29px}
.project-form h3{margin:0 0 24px;font-size:17px;font-weight:600}
.project-form label{display:block;margin-bottom:20px;color:var(--ink);font-size:13px}
.project-form input,.project-form select{display:block;box-sizing:border-box;width:100%;min-height:44px;margin-top:8px;padding:11px;border:1px solid var(--line);border-radius:8px;background:var(--input-surface,var(--paper));color:var(--ink);font:inherit;font-size:14px}
.project-form>.btn{width:100%;margin-top:10px;justify-content:center}
.project-form>.small{margin-top:20px;color:var(--muted);font-size:12px;line-height:1.8}
.project-list{margin-top:25px;overflow:hidden;border:1px solid var(--line);border-radius:14px;background:var(--paper)}
.project-list>header{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:20px 23px;border-bottom:1px solid var(--line)}
.project-list h2{margin:0;font-size:17px;font-weight:500}
.project-list>header>span{color:var(--muted);font-size:12px}
.project-list>a{display:flex;align-items:center;gap:15px;padding:20px 23px;border-bottom:1px solid var(--line-soft,var(--line));text-decoration:none}
.project-list>a:hover{background:var(--input-surface,var(--wash))}
.project-icon{display:grid;place-items:center;flex:none;width:38px;height:44px;border-radius:9px;background:var(--accent-wash);color:var(--forest)}
.project-list a>span:nth-child(2){flex:1;min-width:0}
.project-list strong{color:var(--ink);font-size:14px;font-weight:600;overflow-wrap:anywhere}
.project-list small{display:block;margin-top:5px;color:var(--muted);font-size:12px;line-height:1.6}
.empty-projects{padding:25px;color:var(--muted);font-size:13px;line-height:1.7}
.project-search{display:flex;flex-wrap:wrap;gap:10px;padding:17px 23px;border-bottom:1px solid var(--line-soft,var(--line))}
.project-search input{flex:1;box-sizing:border-box;min-width:160px;width:100%;max-width:500px;min-height:44px;padding:11px 14px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink);font:inherit;font-size:14px}
.project-list>footer{padding:20px;text-align:right}
.library-section{margin:28px 0;padding:25px 0;border-top:1px solid var(--line)}
.library-section h2{margin:0 0 9px;font-size:18px;font-weight:600}
.library-section p{color:var(--muted);font-size:13px;line-height:1.7}
.library-section>div{display:flex;flex-wrap:wrap;gap:8px;margin-top:17px}
.library-section a{display:flex;align-items:center;gap:10px;min-height:42px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--forest);font-size:12px;text-decoration:none}
.studio-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:400px;color:var(--muted);text-align:center}
.studio-loading h2{font-weight:500}
.studio-loading p{max-width:500px;font-size:13px;line-height:1.8}
.order-context{display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px;margin:0 0 20px;padding:12px 16px;border-radius:10px;background:var(--accent-wash);color:var(--ink);font-size:13px;line-height:1.6}
.order-context>span{flex:1;min-width:180px}
.order-context a{display:inline-flex;align-items:center;gap:6px;min-height:32px;color:var(--forest);text-underline-offset:3px}
.studio-leave-dialog{box-sizing:border-box;width:calc(100% - 32px);max-width:620px;max-height:calc(100dvh - 32px);padding:28px;overflow:auto;border:0;border-radius:14px;background:var(--paper);color:var(--ink);box-shadow:var(--overlay-shadow)}
.studio-leave-dialog::backdrop{background:#08111fb3}
.studio-leave-dialog h2{margin:0 0 12px;font-size:20px;line-height:1.4;letter-spacing:-.025em}
.studio-leave-dialog p{margin:0 0 16px;color:var(--muted);font-size:14px;line-height:1.7}
.studio-leave-dialog .leave-backup{font-size:13px}
.studio-leave-dialog .leave-error{padding:12px 14px;border-radius:8px;background:var(--danger-wash);color:var(--danger)}
.leave-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px;margin-top:24px}
.leave-actions button{min-height:44px}
.studio-root :global(button:focus-visible),.studio-root :global(a:focus-visible){outline:2px solid var(--forest);outline-offset:3px}
.studio-root :global(input::selection),.studio-root :global(textarea::selection){background:var(--accent-wash);color:var(--ink)}
.studio-root :global(input),.studio-root :global(textarea){caret-color:var(--forest)}
.studio-root :global(.element-tree),.studio-root :global(.inspector-body),.studio-root :global(.workbench-popover){scrollbar-color:var(--line) transparent;scrollbar-width:thin}
@media(min-width:1600px){.studio-workspace{grid-template-columns:235px minmax(0,1fr) 312px}.studio-workspace.left-hidden{grid-template-columns:minmax(0,1fr) 312px}.studio-workspace.right-hidden{grid-template-columns:235px minmax(0,1fr)}}
.studio-root[data-compact=true] .studio-workspace.left-hidden,.studio-root[data-compact=true] .studio-workspace.right-hidden{grid-template-columns:minmax(0,1fr)}
.studio-root[data-compact=true] .studio-breadcrumb{display:none}
.studio-root[data-compact=true] .studio-title-row{flex-direction:column;align-items:stretch;gap:7px}
.studio-root[data-compact=true] .studio-project-title{flex:none;width:100%}
.studio-root[data-compact=true] .studio-title-row h1{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden;text-overflow:clip;white-space:normal;overflow-wrap:anywhere}
.studio-root[data-compact=true] .studio-title-row p{flex-wrap:wrap}
.studio-root[data-compact=true] .sync-label{overflow:visible;text-overflow:clip;white-space:normal;overflow-wrap:anywhere}
.studio-root[data-compact=true] .heading-actions{justify-content:flex-start}
.studio-root[data-compact=true] .save-plan{margin-left:auto}
.studio-root[data-compact=true] .view-caption{display:none}
.studio-root[data-compact=true] .view-tools{gap:6px}
.studio-root[data-compact=true] .element-tree button{min-height:48px}
.studio-root[data-compact=true] .add-elements{max-height:40%}
.studio-root[data-compact=true] .inspector-label input,.studio-root[data-compact=true] .inspector-label select,.studio-root[data-compact=true] .inspector-label textarea,.studio-root[data-compact=true] .xyz-fields input{min-height:48px;font-size:16px}
.studio-root[data-compact=true] .tree-tools input,.studio-root[data-compact=true] .tree-tools select{min-height:48px;font-size:16px}
.studio-root[data-compact=true] .inspector>nav button{min-height:44px;padding:8px 10px;font-size:12px}
.studio-root[data-compact=true] .selection-tools label,.studio-root[data-compact=true] .selection-tools button{min-height:48px;font-size:12px}
.studio-root[data-compact=true] .inspector-actions .btn,.studio-root[data-compact=true] .inspector-footer .btn,.studio-root[data-compact=true] .delete-element,.studio-root[data-compact=true] .check-item .text-button{min-height:48px}
@media(max-width:1100px){.studio-entry{grid-template-columns:1fr}.entry-intro{border-right:0;border-bottom:1px solid var(--line)}.entry-types{grid-template-columns:1fr 1fr}.keyboard-hint{display:none}.view-caption{margin-left:auto}}
@media(max-width:720px){
  .studio-root.workbench{border-radius:11px}
  .studio-root.workbench:not(.is-fullscreen):not(:fullscreen){min-height:680px}
  .studio-heading{padding:9px 10px}
  .studio-breadcrumb{margin-bottom:6px;font-size:10px}
  .studio-title-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px}
  .studio-root .heading-actions{width:auto;flex-wrap:nowrap;justify-content:flex-end}
  .studio-root .heading-actions #studio-project-actions>span,.studio-root .heading-actions .fullscreen-button span{display:none}
  .studio-title-row h1{margin-bottom:5px;font-size:16px}
  .studio-root[data-compact=true] .studio-title-row h1{display:block;white-space:nowrap;text-overflow:ellipsis;-webkit-line-clamp:unset;line-clamp:unset}
  .studio-title-row p{gap:4px;font-size:11px}
  .revision-chip{display:none}
  .compact-variant-name{display:inline;padding:2px 5px;border-radius:4px;background:var(--wash);font-size:10px;line-height:1.5;overflow-wrap:anywhere}
  .heading-actions{gap:3px}
  .heading-actions .btn{gap:4px;min-height:44px;padding:7px 8px;font-size:11px}
  .heading-actions .btn :global(svg){width:14px;height:14px}
  .heading-actions #studio-project-actions{padding-inline:7px}
  .heading-actions #studio-project-actions>:global(svg:first-child){display:block}
  .fullscreen-button[aria-pressed=true] span{max-width:62px;white-space:normal;line-height:1.35}
  .variant-bar{display:none}
  .variant-tabs{gap:13px}
  .variant-tabs a{min-height:36px;font-size:11px}
  .variant-tabs small{display:none}
  .variant-bar .text-button{min-height:36px;font-size:11px}
  .editor-toolbar{gap:5px;padding:6px}
  .main-tools{flex-wrap:nowrap;gap:4px;overflow:auto;scrollbar-width:thin}
  .tool-group{gap:1px;padding-right:4px}
  .editor-toolbar button{min-width:42px;min-height:44px;padding:6px;font-size:11px}
  .tool-modes button{gap:4px;padding-inline:5px}
  .tool-modes button :global(svg){width:15px;height:15px}
  .panel-tools{margin-left:0;gap:1px}
  .panel-tools button{gap:4px}
  .view-tools{gap:4px;overflow:auto;scrollbar-width:thin}
  .view-toggle{gap:1px;padding:2px}
  .view-toggle button{min-width:34px;min-height:40px;padding:6px 7px;font-size:11px}
  .view-caption{display:none}
  .editor-toolbar .display-tool,.editor-toolbar .fit-button{min-height:44px;padding:6px;font-size:11px}
  .editor-toolbar .fit-button span{display:none}
  .editor-toolbar .display-tool>:global(svg:last-child){display:none}
  .canvas-context{min-height:48px;padding:2px 5px;font-size:10px}
  .canvas-context button{min-width:42px;min-height:44px;padding:5px;font-size:11px}
  .canvas-context .panel-tools{flex:1;justify-content:flex-start;gap:4px}
  .canvas-context .panel-tools button{gap:4px}
  .canvas-context>span{display:none}
  .canvas-bottom{position:relative;flex-direction:column;align-items:flex-start;justify-content:flex-start;min-height:64px;padding:3px 138px 3px 6px;gap:1px;font-size:10px}
  .canvas-bottom button{min-width:42px;min-height:42px}
  .canvas-bottom .selection-properties{position:absolute;left:134px;bottom:3px;min-width:0;width:72px;min-height:44px;padding:5px 2px;font-size:10px}
  .zoom-control{gap:2px}
  .zoom-control>span{min-width:36px}
  .canvas-selection{gap:4px;width:100%;min-height:14px;min-width:0;line-height:14px}
  .canvas-selection>span:first-child{flex:1;min-width:0;max-width:none}
  .canvas-selection .plan-units{display:inline;flex:none;overflow:visible}
  .zoom-control{min-height:44px}
  .workbench-status{display:none}
  .canvas-empty{inset:48px 0 64px;padding:12px}
  .canvas-empty-content{padding:15px 14px}
  .canvas-empty h3{margin-top:8px;font-size:16px}
  .canvas-empty p{font-size:12px;line-height:1.6}
  .canvas-empty .plan-mark{display:none}
  .canvas-empty .btn{min-height:44px;font-size:12px}
  .canvas-panel :global(.camera-disclosure>summary){min-height:44px;padding:9px 10px}
  .canvas-panel :global(.three-caption){display:none}
  .canvas-panel :global(.camera-disclosure[open]+.three-caption){display:block}
  .canvas-panel :global(.three-stage:has(.camera-disclosure[open])){flex-direction:column}
  .canvas-panel :global(.three-stage:has(.camera-disclosure[open]) .three-canvas){height:0;min-height:0;flex:1 1 0}
  .canvas-panel :global(.three-stage:has(.camera-disclosure[open]) .three-footer){position:relative;inset:auto;flex:0 1 auto;align-self:stretch;width:100%;height:auto;max-height:min(180px,45%);border-width:1px 0 0;border-radius:0}
  .canvas-panel :global(.three-stage:has(.camera-disclosure[open]) .camera-disclosure>summary span){display:none}
  .canvas-panel :global(.three-stage:has(.camera-disclosure[open]) .camera-tools){display:flex;flex-wrap:nowrap;gap:13px;padding:0 10px 10px;overflow-x:auto;scroll-snap-type:x proximity}
  .canvas-panel :global(.three-stage:has(.camera-disclosure[open]) .camera-tools>div){flex:none;grid-template-columns:repeat(4,44px);scroll-snap-align:start}
  .inspector-body{padding:20px 17px 25px}
  .inspector-empty{padding:27px 19px}
  .inspector-empty p{font-size:13px}
  .workbench-popover input:not([type=checkbox]){min-height:48px;font-size:16px}
  .workbench-popover button,.project-menu>a,.project-variants a,.compact-check{min-height:48px}
  .compact-check input{width:19px;height:19px}
  .project-menu small{font-size:12px}
  .entry-intro,.project-form{padding:24px 20px}
  .entry-intro h2{font-size:26px}
  .entry-types{grid-template-columns:1fr}
  .project-form input,.project-form select,.project-search input{min-height:48px;font-size:16px}
  .project-form>.btn{min-height:52px}
  .project-search{padding:16px}
  .project-list>header,.project-list>a{padding:18px}
  .order-context a{min-height:44px}
  .leave-actions{display:grid;grid-template-columns:1fr}
  .leave-actions button{min-height:48px;justify-content:center}
  .studio-leave-dialog{padding:22px}
}
@media(max-width:360px){.canvas-bottom .selection-properties{display:none}}
@media(max-height:580px){
  .studio-root.is-fullscreen .studio-breadcrumb{display:none}
  .studio-root.is-fullscreen .studio-heading{padding-block:6px}
  .studio-root.is-fullscreen .variant-bar{min-height:31px}
  .studio-root.is-fullscreen .variant-tabs a{min-height:31px}
  .studio-root.is-fullscreen .editor-toolbar{gap:3px;padding-block:4px}
  .studio-root.is-fullscreen .canvas-context{min-height:25px;padding-block:3px}
  .canvas-empty-content{padding:12px 15px}
  .canvas-empty .plan-mark{display:none}
  .canvas-empty h3{margin:0 0 6px;font-size:15px}
}
@media(prefers-reduced-motion:reduce){.studio-root :global(*){scroll-behavior:auto!important}}


.technical-elements-toggle{display:flex;align-items:center;gap:8px;padding:8px 14px;min-height:44px;font-size:11px;line-height:1.5;color:var(--muted)}.technical-elements-toggle input{accent-color:var(--forest);width:16px;height:16px;flex:none}</style>
