import {one,type DbClient} from '@schubert/db';
import type {ActorContext} from '@schubert/contracts';

export function usagePeriod(value:string|null|undefined,now=new Date()){
 const current=now.toISOString().slice(0,7);
 const period=value&&/^(20\d{2})-(0[1-9]|1[0-2])$/.test(value)&&value<=current?value:current;
 const start=period+'-01T00:00:00.000Z',end=new Date(start);end.setUTCMonth(end.getUTCMonth()+1);
 return {period,start,end:end.toISOString()};
}
export async function aiUsage(db:DbClient,ctx:ActorContext,requested?:string|null,detail=true){
 const range=usagePeriod(requested);
 const aggregate=`count(*)::int requests,
  COALESCE(sum(input_tokens),0)::text input_tokens,COALESCE(sum(output_tokens),0)::text output_tokens,
  COALESCE(sum(COALESCE(input_tokens,0)::bigint+COALESCE(output_tokens,0)::bigint),0)::text total_tokens,
  COALESCE(sum((usage_details->>'cached_tokens')::bigint),0)::text cached_tokens,
  count(*) FILTER(WHERE input_tokens IS NULL OR output_tokens IS NULL)::int missing_usage,
  count(*) FILTER(WHERE usage_details->>'cached_tokens' IS NOT NULL)::int cache_measured,
  count(*) FILTER(WHERE cost_actual IS NULL)::int missing_cost,
  count(*) FILTER(WHERE status='rejected')::int rejected,
  COALESCE(sum(cost_actual),0)::text cost,
  COALESCE(sum(cost_actual) FILTER(WHERE cost_basis='provider_confirmed' OR status='cost_reconciled'),0)::text confirmed_cost,
  COALESCE(sum(cost_actual) FILTER(WHERE cost_basis IS DISTINCT FROM 'provider_confirmed' AND status NOT IN('cost_reconciled','rejected')),0)::text estimated_cost`;
 const result=await one<any>(db,`WITH month_runs AS MATERIALIZED (
  SELECT capability,model_id,task_type,status,input_tokens,output_tokens,usage_details,cost_actual,cost_basis
  FROM ai_runs WHERE tenant_id=$1 AND legal_entity_id=$2 AND created_at>=$3::timestamptz AND created_at<$4::timestamptz
 ) SELECT (SELECT row_to_json(s) FROM(SELECT ${aggregate} FROM month_runs)s) totals,
  (SELECT jsonb_build_object('period',period,'limit_amount',limit_amount,'spent',spent,'reserved',reserved,'currency',currency) FROM ai_budgets WHERE tenant_id=$1 AND legal_entity_id=$2 AND period=$5) budget
  ${detail?`,COALESCE((SELECT jsonb_agg(s ORDER BY s.cost::numeric DESC,s.task_type,s.model_id) FROM(SELECT COALESCE(task_type,capability) task_type,model_id,${aggregate} FROM month_runs GROUP BY COALESCE(task_type,capability),model_id)s),'[]'::jsonb) tasks,
   COALESCE((SELECT jsonb_agg(s) FROM(SELECT id,version,status,capability,task_type,model_id,cost_reserved,created_at FROM ai_runs WHERE tenant_id=$1 AND legal_entity_id=$2 AND status IN('running','outcome_unknown','cost_review') ORDER BY created_at DESC LIMIT 30)s),'[]'::jsonb) unsettled`:''}`,
 [ctx.tenantId,ctx.legalEntityId,range.start,range.end,range.period]);
 return {...result,period:range.period,asOf:new Date().toISOString()};
}
