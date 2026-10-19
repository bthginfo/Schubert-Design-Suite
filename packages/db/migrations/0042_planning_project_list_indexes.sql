-- Match tenant-scoped keyset pagination, with and without an order context.
-- Existing plans, order assignments and approval evidence remain unchanged.
CREATE INDEX planning_projects_tenant_recent_idx
  ON planning_projects(tenant_id,legal_entity_id,updated_at DESC,id DESC);
CREATE INDEX planning_projects_tenant_order_recent_idx
  ON planning_projects(tenant_id,legal_entity_id,order_id,updated_at DESC,id DESC);
