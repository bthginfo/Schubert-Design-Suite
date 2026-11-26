import {z} from 'zod';
import type {ActorContext} from '@schubert/contracts';
import {one,rows,type DbClient} from '@schubert/db';
import {requireRule} from '@schubert/domain';

/** Editable start values only. Saving still uses the normal authorized quote command. */
export async function inquiryQuoteContext(db:DbClient,ctx:ActorContext,url:URL){
  const id=url.searchParams.get('inquiry_id');
  if(!id)return null;
  requireRule(z.uuid().safeParse(id).success,'INQUIRY_SOURCE','Bitte eine vorhandene Anfrage als Quelle auswählen.',400);
  requireRule(ctx.permissions.includes('sales')&&ctx.permissions.some(permission=>['crm','crm.read'].includes(permission)),'FORBIDDEN','Für ein Angebot aus einer Anfrage benötigen Sie Zugriff auf Anfragen und die Angebotsbearbeitung.',403);
  const settings=await rows<{module:string;enabled:boolean}>(db,"SELECT module,enabled FROM module_settings WHERE module IN('crm','sales')");
  requireRule(!settings.some(setting=>!setting.enabled),'MODULE_DISABLED','Anfragen oder Angebote sind derzeit nicht freigegeben.',403);
  const inquiry=await one<{id:string;version:number;number:string|null;title:string;description:string|null;customer_id:string;customer_name:string}>(db,
    `SELECT i.id,i.version,i.number,i.title,i.description,i.customer_id,p.name customer_name
     FROM inquiries i JOIN parties p ON p.id=i.customer_id
     WHERE i.id=$1 AND i.legal_entity_id=$2 AND (p.legal_entity_id=$2 OR p.legal_entity_id IS NULL)
       AND p.is_customer AND p.active IS DISTINCT FROM false AND p.status NOT IN('erased','deleted','archived','inactive')`,[id,ctx.legalEntityId]);
  requireRule(inquiry,'NOT_FOUND','Die Anfrage oder ihr Kunde ist nicht verfügbar. Öffnen Sie die Anfrage und prüfen Sie die Kundenzuordnung.',404);
  const proposedCustomer=url.searchParams.get('customer_id');
  requireRule(!proposedCustomer||proposedCustomer.toLowerCase()===inquiry.customer_id,'SOURCE_CUSTOMER_SCOPE','Die Anfrage gehört zu einem anderen Kunden. Öffnen Sie das Angebot direkt aus der richtigen Anfrage.',422);
  const sourceNote=`Quelle: Anfrage ${inquiry.number||inquiry.id}`;
  const description=inquiry.description||'';
  let notes=[sourceNote,description].filter(Boolean).join('\n\n');
  const truncated=notes.length>20000;
  if(truncated){const suffix=`\n\n[Fortsetzung in der ursprünglichen Anfrage: /inquiries/${inquiry.id}]`;notes=notes.slice(0,20000-suffix.length)+suffix;}
  return {values:{customer_id:inquiry.customer_id,title:inquiry.title,notes},customer:{id:inquiry.customer_id,name:inquiry.customer_name},source:{id:inquiry.id,version:inquiry.version,title:inquiry.title,number:inquiry.number,href:'/inquiries/'+inquiry.id,truncated}};
}
