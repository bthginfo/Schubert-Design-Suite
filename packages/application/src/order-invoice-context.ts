import {z} from 'zod';
import type {ActorContext} from '@schubert/contracts';
import {one,rows,type DbClient} from '@schubert/db';
import {requireRule} from '@schubert/domain';

/**
 * Editable start values for an invoice draft created from an order. Billing may invoice an order
 * without permission to open the order workspace, so the agreed positions are read here once.
 * Saving still uses the normal authorized invoice command; nothing is written by this read.
 */
export async function orderInvoiceContext(db:DbClient,ctx:ActorContext,url:URL){
  const id=url.searchParams.get('order_id');
  if(!id||url.searchParams.get('source')!=='order')return null;
  requireRule(z.uuid().safeParse(id).success,'ORDER_SOURCE','Bitte einen vorhandenen Auftrag als Quelle auswählen.',400);
  requireRule(ctx.permissions.includes('billing'),'FORBIDDEN','Für eine Rechnung aus einem Auftrag benötigen Sie die Rechnungsbearbeitung.',403);
  const order=await one<{id:string;number:string|null;title:string|null;currency:string|null;customer_id:string|null}>(db,
    `SELECT id,number,title,currency,customer_id FROM orders WHERE id=$1 AND legal_entity_id=$2 AND status NOT IN('deleted')`,[id,ctx.legalEntityId]);
  requireRule(order,'NOT_FOUND','Der Auftrag ist nicht verfügbar.',404);
  const lines=await rows<Record<string,unknown>>(db,
    `SELECT position,description,quantity::text,unit,unit_price::text,tax_rate::text,discount_percent::text,line_type,optional,selected,product_id,tax_category,tax_exemption_reason
     FROM order_lines WHERE parent_id=$1 ORDER BY position`,[order.id]);
  return {order,lines};
}
