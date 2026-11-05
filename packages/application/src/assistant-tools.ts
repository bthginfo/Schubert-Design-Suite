import {z} from 'zod';
import {withTenant,one,rows,type DbClient} from '@schubert/db';
import {requireRule,rolePermissions,DomainError} from '@schubert/domain';
import {ASSISTANT_READ_TOOL_VERSION,ASSISTANT_READ_RESULT_BYTES,dispatchLookupSchema,suiteLookupSchema,type ActorContext,type AssistantReadToolAccess} from '@schubert/contracts';
import {inspectPlanningSnapshot} from '../../ai/src/planning-facts.js';
import {catalogLookupSchema} from '../../ai/src/specialist-tools.js';
import {planningProductSearchSchema,planningProductsInTransaction} from './catalog-search.js';
import {assistantAreaEnabled,authorizeAssistantRead,createSuiteReadScope,suiteAreasFor} from './assistant-suite.js';

const canPlan=(permissions:readonly string[])=>permissions.some(p=>['*','planning','planning.read','planning.*'].includes(p));
const text=(value:unknown,max=100)=>typeof value==='string'?value.slice(0,max):value;
const match=(value:string)=>'%'+value.replace(/[\\%_]/g,'\\$&')+'%';

/** Keep evidence as valid JSON and explicitly disclose any omitted records. */
export function compactToolEvidence(input:any){
  const result=structuredClone(input);let omitted=0;
  const arrays=[result.items,result.lines,result.unresolvedMeasurements,result.validation?.warnings,result.validation?.blocking,result.release?.blocking].filter(Array.isArray);
  while(Buffer.byteLength(JSON.stringify(result),'utf8')>ASSISTANT_READ_RESULT_BYTES){
    const largest=arrays.filter(a=>a.length>0).sort((a,b)=>JSON.stringify(b).length-JSON.stringify(a).length)[0];
    if(!largest)throw Error('Evidence metadata exceeds the allowed scope.');
    largest.pop();omitted++;result.truncated=true;result.omittedForContext=omitted;
  }
  return result;
}

/** Request-scoped, read-only tools. Model arguments cannot choose a tenant, actor, URL or plan. */
export function createAssistantReadTools(ctx:ActorContext,input:Record<string,any>,message=''):AssistantReadToolAccess{
  const context=structuredClone(input);
  const suite=context.suite?createSuiteReadScope(message):undefined;
  const areas=suite?suiteAreasFor(ctx):[];
  const currentPlan=context.entityType==='planning'&&context.snapshot&&canPlan(ctx.permissions);
  const available:AssistantReadToolAccess['available']=[
    ...(currentPlan||areas.includes('studio')?['lookup_planning_catalog'] as const:[]),
    ...(currentPlan?['inspect_current_plan'] as const:[]),
    ...(areas.length?['find_suite_records'] as const:[]),
    ...(areas.includes('dispatch')?['resolve_dispatch_assignment'] as const:[]),
  ];
  async function authorize(db:DbClient){
    const member=await one<any>(db,`SELECT m.role,m.permissions,m.permission_version,m.legal_entity_id,
      (SELECT jsonb_build_object('revisionId',v.head_revision_id,'version',v.version,'hash',r.content_hash) FROM design_variants v JOIN design_revisions r ON r.id=v.head_revision_id AND r.variant_id=v.id WHERE v.id=$2::uuid AND v.planning_project_id=$3::uuid) live,
      (SELECT enabled FROM module_settings WHERE module='planning') planning_enabled
      FROM memberships m WHERE m.user_id=$1 AND m.active`,[ctx.actorId,context.variantId,context.project?.id]);
    requireRule(member&&member.legal_entity_id===ctx.legalEntityId,'SESSION_REVOKED','Der Zugang ist für diesen Vorgang nicht mehr freigegeben.',401);
    const permissions=[...new Set([...(rolePermissions[member.role]??[]),...(member.permissions??[])])] as string[];
    requireRule(canPlan(permissions)&&member.planning_enabled!==false,'FORBIDDEN','Die Planungsbibliothek ist für diesen Zugang nicht freigegeben.',403);
    requireRule(member.permission_version===ctx.permissionVersion&&member.live?.revisionId===context.revisionId&&member.live?.version===context.baseVersion&&member.live?.hash===context.contentHash,'AI_STALE_CONTEXT','Der Planstand oder der Zugriff hat sich geändert. Die Anfrage am aktuellen Stand erneut stellen.',409);
  }
  return {version:ASSISTANT_READ_TOOL_VERSION,available,...(suite?{suite:{...suite,areas}}:{}),async execute(name,args){
    requireRule(available.includes(name),'AI_TOOL_SCOPE','Diese Fachabfrage ist im aktuellen Bereich nicht verfügbar.',403);
    if(name==='resolve_dispatch_assignment'){
      const {person,order}=dispatchLookupSchema.parse(args);
      return withTenant(ctx,async db=>{
        const actor=await authorizeAssistantRead(db,ctx);
        const filters={status:null,from:null,to:null,details:false};
        const team=await suite!.lookup(db,actor,{...filters,area:'team',query:person});
        const orders=await suite!.lookup(db,actor,{...filters,area:'orders',query:order});
        return compactToolEvidence({area:'dispatch',source:'dispatch_references',
          items:[...team.items.map((row:any)=>({role:'employee',id:row.id,name:row.name})),
            ...orders.items.map((row:any)=>({role:'order',id:row.id,number:row.number,title:row.title??row.name}))],
          employee_id:team.resolvedId??null,order_id:orders.resolvedId??null,
          employeeAmbiguous:!!team.ambiguous,orderAmbiguous:!!orders.ambiguous,
        });
      });
    }
    if(name==='find_suite_records'){
      const payload=suiteLookupSchema.parse(args);
      return withTenant(ctx,async db=>{
        const raw=await suite!.lookup(db,await authorizeAssistantRead(db,ctx),payload),result=compactToolEvidence(raw);
        if(raw.lines?.length&&raw.lines.length>result.lines.length&&result.resolvedId){
          result.moreLines=true;
          const reference=suite!.reference(payload.area,result.resolvedId);
          if(reference)reference.fullLines=false;
        }
        return result;
      });
    }
    const payload=name==='lookup_planning_catalog'?catalogLookupSchema.parse(args):z.strictObject({}).parse(args);
    return withTenant(ctx,async db=>{
      if(currentPlan)await authorize(db);
      else{
        const actor=await authorizeAssistantRead(db,ctx);
        requireRule(canPlan(actor.permissions)&&await assistantAreaEnabled(db,'studio',actor),'FORBIDDEN','Die Planungsbibliothek ist für diesen Zugang nicht freigegeben.',403);
      }
      if(name==='inspect_current_plan')return compactToolEvidence(inspectPlanningSnapshot(context.snapshot,context.selectedElementIds??[]));
      const {kind,query}=catalogLookupSchema.parse(payload);let items:any[];
      if(kind==='products'){
        const records=await planningProductsInTransaction(db,planningProductSearchSchema.parse({q:query}),6);
        items=records.map((row:any)=>({id:row.id,name:text(row.name),manufacturer:text(row.manufacturer_name),sku:text(row.manufacturer_sku),widthMm:row.width_mm,depthMm:row.depth_mm,heightMm:row.height_mm,materialVersionId:row.material_spec_version_id,status:row.status,sourceHash:row.content_hash,sourceUrl:text(row.source_url,300),availability:row.availability_status,technicalApproval:row.status==='approved'&&!!row.approved_at}));
      }else if(kind==='materials'){
        const records=await rows<any>(db,`SELECT v.id,v.name,v.surface,v.thickness_mm,v.status,v.content_hash,v.approved_at,v.properties->>'sourceUrl' source_url FROM material_spec_versions v JOIN material_specs s ON s.id=v.material_spec_id WHERE s.status NOT IN('deleted','inactive','archived') AND(v.status='approved' AND v.approved_at IS NOT NULL OR v.status='source_reference' AND v.properties->>'sourceCatalog' IS NOT NULL AND v.content_hash IS NOT NULL) AND(v.id=s.active_version_id OR s.active_version_id IS NULL) AND concat_ws(' ',v.name,v.surface,v.properties->>'stoneType',v.properties->>'supplier') ILIKE $1 ORDER BY v.name,v.revision DESC,v.id LIMIT 6`,[match(query)]);
        items=records.map(row=>({id:row.id,name:text(row.name),surface:text(row.surface),thicknessMm:row.thickness_mm,status:row.status,sourceHash:row.content_hash,sourceUrl:text(row.source_url,300),technicalApproval:row.status==='approved'&&!!row.approved_at}));
      }else{
        const records=await rows<any>(db,"SELECT id,name,selection_ref,supply_form,geometry_status,rights_status,source_url,source_hash FROM font_variants WHERE status NOT IN('deleted','inactive','archived') AND concat_ws(' ',name,selection_ref,supply_form) ILIKE $1 ORDER BY name,id LIMIT 6",[match(query)]);
        items=records.map(row=>({id:row.id,name:text(row.name),selectionRef:row.selection_ref,supplyForm:row.supply_form,geometryStatus:row.geometry_status,rightsStatus:row.rights_status,sourceUrl:text(row.source_url,300),sourceHash:row.source_hash,technicalApproval:false}));
      }
      return compactToolEvidence({source:'permitted_catalog',kind,items,possiblyMore:items.length===6,revisionId:context.revisionId,meaning:'Tatsächliche berechtigte Bibliothekstreffer. Referenzen ohne technische Freigabe bleiben ungeprüft; keine Reservierung, Preis- oder Lieferzusage.'});
    }).catch(error=>{if(error instanceof DomainError)throw error;throw new DomainError('AI_TOOL_UNAVAILABLE','Die Fachabfrage konnte gerade nicht abgeschlossen werden. Es wurde nichts geändert und kein weiterer kostenpflichtiger Modellaufruf gestartet.',503);});
  }};
}
