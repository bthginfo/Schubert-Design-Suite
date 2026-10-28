/** Static SQL fragments; callers supply placeholders and an allowlisted alias only. */
export function customerPlanningScope(alias:string, customer:string, entity:string) {
  return `(EXISTS(SELECT 1 FROM orders co WHERE co.id=${alias}.order_id AND co.customer_id=${customer} AND co.legal_entity_id=${entity})
    OR EXISTS(SELECT 1 FROM sites cs WHERE cs.id=${alias}.site_id AND cs.customer_id=${customer} AND cs.legal_entity_id=${entity})
    OR EXISTS(SELECT 1 FROM grave_plots cg WHERE cg.id=${alias}.grave_plot_id AND cg.customer_id=${customer} AND cg.legal_entity_id=${entity}))`;
}
export function customerDocumentScope(alias:string, customer:string, entity:string) {
  const related = `((${alias}.entity_type IN('customer','customers','party','parties') AND ${alias}.entity_id=${customer})
    OR (${alias}.entity_type IN('order','orders','sales.order') AND EXISTS(SELECT 1 FROM orders co WHERE co.id=${alias}.entity_id AND co.customer_id=${customer} AND co.legal_entity_id=${entity}))
    OR (${alias}.entity_type IN('quote','quotes') AND EXISTS(SELECT 1 FROM quotes cq WHERE cq.id=${alias}.entity_id AND cq.customer_id=${customer} AND cq.legal_entity_id=${entity}))
    OR (${alias}.entity_type IN('invoice','invoices') AND EXISTS(SELECT 1 FROM invoices ci WHERE ci.id=${alias}.entity_id AND ci.customer_id=${customer} AND ci.legal_entity_id=${entity}))
    OR EXISTS(SELECT 1 FROM document_links cdl WHERE cdl.document_id=${alias}.id AND cdl.legal_entity_id=${entity}
      AND ((cdl.entity_type IN('customer','customers') AND cdl.entity_id=${customer})
        OR (cdl.entity_type IN('order','orders','sales.order') AND EXISTS(SELECT 1 FROM orders clo WHERE clo.id=cdl.entity_id AND clo.customer_id=${customer} AND clo.legal_entity_id=${entity})))))`;
  // A processing thumbnail is not another customer original or business PDF.
  return `(NOT EXISTS(SELECT 1 FROM job_runs customer_preview WHERE customer_preview.id=${alias}.source_job_id AND customer_preview.job_type IN('document.preview','planning.source.preview')) AND ${related})`;
}
