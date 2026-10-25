import {moduleBySlug,workspaces,type ActorContext,type WorkspaceArea} from '@schubert/contracts';
import {one,ident,type DbClient} from '@schubert/db';
import {requireRule} from '@schubert/domain';

export async function workspaceOverview(db:DbClient,ctx:ActorContext,area:WorkspaceArea){
  const definition=workspaces[area],has=(permission:string)=>ctx.permissions.some(p=>p===permission||p===permission+'.read');
  const cards=[];
  for(const card of definition.cards){
    const module=moduleBySlug(card.slug);if(!module||!has(module.permission))continue;
    const open='open'in card&&card.open;
    const count=await one<{total:number}>(db,`SELECT count(*)::int total FROM ${ident(module.table)} WHERE legal_entity_id=$1${open?' AND open_amount<>0':''}`,[ctx.legalEntityId]);
    cards.push({...card,total:count?.total??0,href:`/${card.slug}${open?'?status=open':''}`});
  }
  requireRule(cards.length,'FORBIDDEN','Dieser Arbeitsbereich ist für Ihren Zugang nicht freigegeben.',403);
  const extra=definition.extra.flatMap(slug=>{const module=moduleBySlug(slug);return module&&has(module.permission)?[{slug,label:module.label,href:'/'+slug}]:[];});
  return {title:definition.title,intro:definition.intro,cards,extra};
}
