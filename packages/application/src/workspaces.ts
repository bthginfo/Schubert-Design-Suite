import {moduleBySlug,workspaces,type ActorContext,type WorkspaceArea} from '@schubert/contracts';
import {one,ident,type DbClient} from '@schubert/db';
import {requireRule} from '@schubert/domain';

export async function workspaceOverview(db:DbClient,ctx:ActorContext,area:WorkspaceArea){
  const definition=workspaces[area],has=(permission:string)=>ctx.permissions.some(p=>p===permission||p===permission+'.read');
  const allowed=definition.cards.flatMap(card=>{
    const module=moduleBySlug(card.slug);
    if(!module||!has(module.permission))return [];
    const open='open' in card&&card.open;
    const filter=(open?' AND open_amount<>0':'')+(card.slug==='suppliers'?' AND is_supplier':'');
    const count=`(SELECT count(*)::int FROM ${ident(module.table)} WHERE (legal_entity_id=$1 OR legal_entity_id IS NULL)${filter}) AS ${ident(card.slug.replaceAll('-','_'))}`;
    return [{card,open,count}];
  });
  requireRule(allowed.length,'FORBIDDEN','Dieser Arbeitsbereich ist für Ihren Zugang nicht freigegeben.',403);
  const totals=await one<Record<string,number>>(db,'SELECT '+allowed.map(item=>item.count).join(','),[ctx.legalEntityId]);
  const cards=allowed.map(({card,open})=>({...card,total:totals![card.slug.replaceAll('-','_')],href:`/${card.slug}${open?'?status=open':''}`}));
  const extra=definition.extra.flatMap(slug=>{const module=moduleBySlug(slug);return module&&has(module.permission)?[{slug,label:module.label,href:'/'+slug}]:[];});
  return {title:definition.title,intro:definition.intro,cards,extra};
}
