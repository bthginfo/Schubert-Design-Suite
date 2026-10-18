import { modules } from '@schubert/contracts';
export type TableDefinition=Record<string,string>;
export const tables:Record<string,TableDefinition>={};
const typeFor=(type:string)=>type==='checkbox'?'boolean':type==='date'?'date':type==='datetime-local'?'timestamptz':type==='money'||type==='number'?'numeric(20,6)':type==='reference'?'uuid':'text';
for(const m of modules){tables[m.table]??={};for(const f of m.fields)if(!['name','title','notes','number','status'].includes(f.key))tables[m.table][f.key]??=typeFor(f.type);}
function add(name:string,fields:TableDefinition){tables[name]={...tables[name],...fields};}
add('feedback_reports',{actor_id:'text',submitter_name:'text',submitter_role:'text',category:'text',message:'text',expected:'text',page_path:'text',page_label:'text',context:'jsonb',server_release:'text',priority:'text',admin_notes:'text',resolution_ref:'text'});
add('legal_entities',{feedback_enabled:'boolean NOT NULL DEFAULT false',feedback_version:'integer NOT NULL DEFAULT 1'});
add('archive_objects',{object_key:'text',content_hash:'text',size_bytes:'bigint',provider:'text',storage_version_id:'text',retain_until:'timestamptz',proof:'jsonb',document_version_id:'uuid'});
add('open_item_offsets',{target_kind:'text',positive_id:'uuid',negative_id:'uuid',party_id:'uuid',amount:'numeric(20,2)',currency:'char(3)',reason:'text'});
add('dunning_events',{case_id:'uuid',stage:'integer',snapshot:'jsonb',content_hash:'text',document_id:'uuid'});
add('import_batches',{import_kind:'text',mapping:'jsonb'});
add('bank_statement_imports',{bank_account_id:'uuid',mapping:'jsonb',validation_report:'jsonb',source_document_version_id:'uuid'});
add('bank_transactions',{counterparty:'text',counterparty_iban:'text',candidates:'jsonb',fingerprint:'text',raw:'jsonb',duplicate_of_id:'uuid',review_reason:'text'});
add('datev_export_items',{payment_id:'uuid',snapshot:'jsonb'});
add('legal_entities',{company_name:'text',street:'text',postal_code:'text',city:'text',country:'text',vat_id:'text',tax_number:'text',register_number:'text',iban:'text',bic:'text',bank_holder:'text',billing_approved:'boolean DEFAULT false',tax_approved:'boolean DEFAULT false',archive_verified:'boolean DEFAULT false',einvoice_verified:'boolean DEFAULT false',datev_approved:'boolean DEFAULT false',manufacturing_approved:'boolean DEFAULT false',contract_approved:'boolean DEFAULT false',currency:"char(3) DEFAULT 'EUR'",invoice_prefix:"text DEFAULT 'RE'",invoice_year:'integer',datev_advisor:'text',datev_client:'text',datev_account_length:'integer',datev_mapping:'jsonb',tax_profile:'text',archive_region:'text',backup_region:'text',approved_at:'timestamptz',approved_by:'text',recovery_locked:'boolean DEFAULT false'});
add('brands',{legal_entity_id:'uuid',logo_document_id:'uuid',letterhead_version:'text'});
add('business_units',{legal_entity_id:'uuid'});add('locations',{address:'text'});
add('memberships',{user_id:'text NOT NULL',role:'text NOT NULL',permissions:"text[] NOT NULL DEFAULT '{}'",active:'boolean NOT NULL DEFAULT true',permission_version:'integer NOT NULL DEFAULT 1',employee_id:'uuid'});
add('parties',{is_customer:'boolean DEFAULT false',is_supplier:'boolean DEFAULT false',merged_into_id:'uuid',active:'boolean DEFAULT true'});
add('contacts',{party_id:'uuid NOT NULL',email:'text',phone:'text',purpose:'text',confirmed:'boolean DEFAULT false'});
add('addresses',{party_id:'uuid NOT NULL',kind:'text',street:'text',postal_code:'text',city:'text',country:'text',valid_from:'date',valid_until:'date'});
add('party_roles',{party_id:'uuid NOT NULL',role:'text NOT NULL'});add('party_relationships',{from_party_id:'uuid NOT NULL',to_party_id:'uuid NOT NULL',kind:'text'});
add('bank_account_versions',{party_id:'uuid',iban:'text NOT NULL',bic:'text',holder:'text',source_document_id:'uuid',verified_by:'text',verified_at:'timestamptz',valid_from:'date'});
add('quotes',{customer_id:'uuid NOT NULL',order_id:'uuid',current_revision:'integer DEFAULT 0',published_version_id:'uuid',accepted_version_id:'uuid',net_total:'numeric(20,2)',tax_total:'numeric(20,2)',gross_total:'numeric(20,2)',currency:"char(3) DEFAULT 'EUR'"});
add('quote_versions',{quote_id:'uuid NOT NULL',revision:'integer NOT NULL',content_hash:'text NOT NULL',snapshot:'jsonb NOT NULL',valid_until:'date'});
add('quote_acceptances',{quote_id:'uuid NOT NULL',quote_version_id:'uuid NOT NULL',content_hash:'text NOT NULL',person_name:'text NOT NULL',statement:'text NOT NULL',channel:'text',identity_assurance:'text',order_id:'uuid',evidence_document_id:'uuid',accepted_at:'timestamptz DEFAULT now()'});
const lineFields={parent_id:'uuid NOT NULL',position:'integer NOT NULL',description:'text NOT NULL',quantity:'numeric(20,6) NOT NULL',unit:'text NOT NULL',unit_price:'numeric(20,6) NOT NULL',tax_rate:'numeric(8,4) NOT NULL',discount_percent:'numeric(8,4) DEFAULT 0',net_amount:'numeric(20,2) NOT NULL',line_type:"text DEFAULT 'item'",optional:'boolean DEFAULT false',selected:'boolean DEFAULT true',product_id:'uuid',price_version_id:'uuid',cost_unit:'numeric(20,6)',price_applied_at:'timestamptz'};
for(const name of ['quote_lines','invoice_lines','purchase_order_lines','change_order_lines','delivery_note_lines','supplier_invoice_lines','order_lines'])add(name,lineFields);
add('orders',{customer_id:'uuid NOT NULL',quote_version_id:'uuid',commercial_status:"text DEFAULT 'draft'",planning_status:"text DEFAULT 'survey_open'",procurement_status:"text DEFAULT 'no_need'",execution_status:"text DEFAULT 'unplanned'",acceptance_status:"text DEFAULT 'open'",billing_status:"text DEFAULT 'not_due'",payment_status:"text DEFAULT 'open'",budget_net:'numeric(20,2)',currency:"char(3) DEFAULT 'EUR'",confirmed_snapshot:'jsonb'});
add('order_confirmations',{order_id:'uuid NOT NULL',content_hash:'text NOT NULL',snapshot:'jsonb NOT NULL'});
add('invoices',{customer_id:'uuid NOT NULL',order_id:'uuid',kind:"text NOT NULL DEFAULT 'normal'",corrects_invoice_id:'uuid',legal_status:"text DEFAULT 'draft'",artifact_status:"text DEFAULT 'pending'",delivery_status:"text DEFAULT 'not_sent'",payment_status:"text DEFAULT 'open'",snapshot:'jsonb',content_hash:'text',issued_at:'timestamptz',net_total:'numeric(20,2)',tax_total:'numeric(20,2)',gross_total:'numeric(20,2)',prepaid_total:'numeric(20,2) DEFAULT 0',payable_total:'numeric(20,2)',currency:"char(3) DEFAULT 'EUR'",validation_report:'jsonb',rule_version_id:'uuid'});
add('invoice_tax_summaries',{invoice_id:'uuid NOT NULL',tax_rate:'numeric(8,4) NOT NULL',net_amount:'numeric(20,2) NOT NULL',tax_amount:'numeric(20,2) NOT NULL'});
add('invoice_references',{invoice_id:'uuid NOT NULL',reference_invoice_id:'uuid NOT NULL',kind:'text NOT NULL',received_amount:'numeric(20,2) NOT NULL',tax_rate:'numeric(8,4)'});
add('number_counters',{scope:'text NOT NULL',year:'integer NOT NULL',last_value:'integer NOT NULL DEFAULT 0',locked:'boolean DEFAULT false'});
add('issuance_evidence',{invoice_id:'uuid NOT NULL',invoice_number:'text NOT NULL',content_hash:'text NOT NULL',archive_manifest_id:'uuid'});
for(const name of ['receivables','payables'])add(name,{invoice_id:'uuid NOT NULL',party_id:'uuid NOT NULL',original_amount:'numeric(20,2) NOT NULL',open_amount:'numeric(20,2) NOT NULL',currency:"char(3) DEFAULT 'EUR'",due_date:'date',disputed:'boolean DEFAULT false',transferred_to_id:'uuid'});
add('payments',{party_id:'uuid NOT NULL',direction:'text NOT NULL',amount:'numeric(20,2) NOT NULL',currency:"char(3) DEFAULT 'EUR'",booking_date:'date NOT NULL',source:'text',bank_reference:'text',bank_account_id:'uuid'});
add('payment_allocations',{payment_id:'uuid NOT NULL',target_kind:'text NOT NULL',receivable_id:'uuid',payable_id:'uuid',amount:'numeric(20,2) NOT NULL',kind:"text DEFAULT 'cash'",reason:'text'});
add('bank_statement_imports',{document_id:'uuid NOT NULL',content_hash:'text NOT NULL',mapping_version:'text'});
add('bank_transactions',{import_id:'uuid NOT NULL',bank_account_id:'uuid',external_id:'text',booking_date:'date',value_date:'date',amount:'numeric(20,2)',currency:'char(3)',reference:'text',payment_id:'uuid',duplicate_review:'boolean DEFAULT true'});
add('dunning_cases',{receivable_id:'uuid NOT NULL',stage:'integer DEFAULT 0',blocked:'boolean DEFAULT false',reason:'text'});
add('accounting_periods',{starts_on:'date NOT NULL',ends_on:'date NOT NULL',locked:'boolean DEFAULT false'});
add('datev_export_batches',{starts_on:'date',ends_on:'date',mapping_version:'text',content_hash:'text',manifest:'jsonb',document_id:'uuid',import_confirmed_at:'timestamptz'});
add('datev_export_items',{batch_id:'uuid NOT NULL',invoice_id:'uuid',supplier_invoice_id:'uuid',amount:'numeric(20,2)',account:'text',counter_account:'text',tax_key:'text'});
add('manufacturers',{source_url:'text',source_label:'text',observed_at:'date',identity_status:"text DEFAULT 'reference'",rights_status:"text DEFAULT 'review_required'"});
add('product_categories',{parent_id:'uuid',active:'boolean DEFAULT true'});
add('product_variants',{product_id:'uuid NOT NULL',sku:'text',active_version_id:'uuid'});
add('product_variant_versions',{product_variant_id:'uuid NOT NULL',revision:'integer',width_mm:'numeric(20,2)',height_mm:'numeric(20,2)',depth_mm:'numeric(20,2)',source_document_id:'uuid',content_hash:'text',properties:'jsonb'});
add('product_assets',{product_variant_version_id:'uuid',document_id:'uuid',kind:'text',accuracy:'text',rights_verified:'boolean DEFAULT false',geometry_verified:'boolean DEFAULT false',content_hash:'text'});
add('material_specs',{kind:'text',active_version_id:'uuid'});add('material_spec_versions',{material_spec_id:'uuid NOT NULL',surface:'text',thickness_mm:'numeric(20,2)',density_kg_m3:'numeric(20,6)',source_document_id:'uuid',properties:'jsonb'});
add('supplier_price_versions',{supplier_id:'uuid NOT NULL',product_id:'uuid NOT NULL',sku:'text',amount:'numeric(20,6) NOT NULL',currency:"char(3) DEFAULT 'EUR'",basis_quantity:'numeric(20,6) NOT NULL DEFAULT 1',unit:'text NOT NULL',min_quantity:'numeric(20,6) DEFAULT 0',valid_from:'date NOT NULL',valid_until:'date',batch_id:'uuid',source_document_id:'uuid',source_locator:'text',active:'boolean DEFAULT true',previous_version_id:'uuid'});
add('sales_price_versions',{product_id:'uuid NOT NULL',amount:'numeric(20,6)',currency:"char(3) DEFAULT 'EUR'",basis_quantity:'numeric(20,6) DEFAULT 1',unit:'text',valid_from:'date',valid_until:'date',source_version_id:'uuid',revision:'integer NOT NULL DEFAULT 1',previous_version_id:'uuid',source_document_version_id:'uuid',price_basis:'text',tax_rate:'numeric(8,4)',min_quantity:'numeric(20,6) DEFAULT 0',approved_by:'text',approved_at:'timestamptz',content_hash:'text'});
add('price_import_rows',{batch_id:'uuid NOT NULL',row_number:'integer NOT NULL',product_id:'uuid',sku:'text',description:'text',amount:'numeric(20,6)',basis_quantity:'numeric(20,6)',unit:'text',currency:'char(3)',previous_amount:'numeric(20,6)',source_locator:'text',errors:'text[]',approved:'boolean DEFAULT false',raw:'jsonb'});
add('purchase_orders',{supplier_id:'uuid NOT NULL',net_total:'numeric(20,2)',tax_total:'numeric(20,2)',gross_total:'numeric(20,2)',frozen_snapshot:'jsonb',content_hash:'text'});
add('goods_receipts',{purchase_order_id:'uuid NOT NULL',stock_item_id:'uuid NOT NULL',quantity:'numeric(20,6) NOT NULL',receipt_date:'timestamptz DEFAULT now()',source_document_id:'uuid'});
add('supplier_invoices',{supplier_id:'uuid NOT NULL',supplier_number:'text NOT NULL',normalized_number:'text NOT NULL',kind:"text DEFAULT 'invoice'",payment_status:"text DEFAULT 'open'",content_hash:'text',approved_at:'timestamptz'});
add('supplier_invoice_allocations',{supplier_invoice_id:'uuid NOT NULL',order_id:'uuid',stock_item_id:'uuid',cost_center:'text',amount:'numeric(20,2) NOT NULL'});
add('stock_locations',{code:'text',address:'text'});add('stock_lots',{supplier_id:'uuid',material_spec_version_id:'uuid',received_at:'date'});
add('stock_items',{quantity:'numeric(20,6) NOT NULL DEFAULT 0',reserved_quantity:'numeric(20,6) NOT NULL DEFAULT 0',cost_total:'numeric(20,2)',owner_party_id:'uuid',lot_id:'uuid',contour:'jsonb',qr_token:'text',is_owned:'boolean DEFAULT true'});
add('stock_movements',{stock_item_id:'uuid NOT NULL',order_id:'uuid',kind:'text NOT NULL',quantity:'numeric(20,6) NOT NULL',unit:'text NOT NULL',cost_amount:'numeric(20,2)',source_location_id:'uuid',target_location_id:'uuid',reason:'text NOT NULL',source_document_id:'uuid',cutting_job_id:'uuid'});
add('stock_reservations',{stock_item_id:'uuid NOT NULL',order_id:'uuid NOT NULL',quantity:'numeric(20,6) NOT NULL',expires_at:'timestamptz',released_at:'timestamptz',contour:'jsonb'});
add('cutting_jobs',{stock_item_id:'uuid NOT NULL',order_id:'uuid',input_quantity:'numeric(20,6)',input_cost:'numeric(20,2)',rule_version_id:'uuid'});
add('cutting_outputs',{cutting_job_id:'uuid NOT NULL',stock_item_id:'uuid',kind:'text NOT NULL',quantity:'numeric(20,6) NOT NULL',cost_amount:'numeric(20,2) NOT NULL'});
add('inventory_count_lines',{inventory_count_id:'uuid NOT NULL',stock_item_id:'uuid NOT NULL',expected_quantity:'numeric(20,6) NOT NULL',counted_quantity:'numeric(20,6)',movement_sequence:'bigint',counted_by:'text',reason:'text'});
add('qr_labels',{token:'text NOT NULL',entity_type:'text NOT NULL',entity_id:'uuid NOT NULL',revoked_at:'timestamptz',printed_at:'timestamptz'});
add('equipment_maintenance',{equipment_id:'uuid NOT NULL',due_date:'date',completed_at:'date',document_id:'uuid'});
add('buildings',{site_id:'uuid NOT NULL'});add('floors',{building_id:'uuid NOT NULL',level_mm:'numeric(20,2)'});add('rooms',{floor_id:'uuid NOT NULL',site_id:'uuid'});
add('cemetery_rule_versions',{cemetery_id:'uuid NOT NULL',document_id:'uuid NOT NULL',valid_from:'date',valid_until:'date',approved_by:'text'});
add('memorial_people',{grave_plot_id:'uuid NOT NULL',exact_name:'text NOT NULL',birth_display:'text',death_display:'text',date_accuracy:'text',confirmed:'boolean DEFAULT false'});
add('grave_permissions',{grave_plot_id:'uuid NOT NULL',revision_id:'uuid',document_id:'uuid',approved_at:'timestamptz',authority:'text',conditions:'text'});
add('measurements',{planning_project_id:'uuid NOT NULL',value_mm:'numeric(20,2)',semantic:'text NOT NULL',review_status:'text NOT NULL',is_estimated:'boolean DEFAULT true',method:'text',measured_by:'text',measured_at:'timestamptz',evidence_document_id:'uuid'});
add('planning_projects',{kind:'text NOT NULL',order_id:'uuid',site_id:'uuid',grave_plot_id:'uuid'});
add('design_variants',{planning_project_id:'uuid NOT NULL',head_revision_id:'uuid'});
add('design_revisions',{variant_id:'uuid NOT NULL',parent_revision_id:'uuid',snapshot:'jsonb NOT NULL',content_hash:'text NOT NULL',schema_version:'integer NOT NULL DEFAULT 1',revision_number:'integer NOT NULL'});
add('design_commands',{variant_id:'uuid NOT NULL',base_revision_id:'uuid NOT NULL',revision_id:'uuid NOT NULL',operations:'jsonb NOT NULL',undo_of_command_id:'uuid'});
add('design_conflicts',{variant_id:'uuid NOT NULL',base_revision_id:'uuid',proposed_operations:'jsonb',resolved_by_command_id:'uuid'});
add('design_approvals',{variant_id:'uuid NOT NULL',revision_id:'uuid NOT NULL',kind:'text NOT NULL',statement:'text NOT NULL',content_hash:'text NOT NULL',identity_assurance:'text'});
add('manufacturing_releases',{variant_id:'uuid NOT NULL',revision_id:'uuid NOT NULL',content_hash:'text NOT NULL',render_manifest_id:'uuid',reason:'text NOT NULL'});
add('release_packages',{release_id:'uuid NOT NULL',revision_id:'uuid NOT NULL',manifest_hash:'text',validation_report:'jsonb',package_ready:'boolean DEFAULT false'});
add('bom_snapshots',{revision_id:'uuid NOT NULL',content_hash:'text NOT NULL',lines:'jsonb NOT NULL'});
add('render_manifests',{revision_id:'uuid NOT NULL',content_hash:'text NOT NULL',generator_version:'text NOT NULL',manifest:'jsonb NOT NULL'});
add('render_jobs',{revision_id:'uuid NOT NULL',profile:'text',job_run_id:'uuid',connection_version_id:'uuid'});
add('render_artifacts',{revision_id:'uuid NOT NULL',document_id:'uuid NOT NULL',content_hash:'text',kind:'text',width_px:'integer',height_px:'integer',accuracy:'text'});
add('font_families',{manufacturer_id:'uuid',source_url:'text'});
add('font_variants',{font_family_id:'uuid',selection_ref:'text NOT NULL',supply_form:'text NOT NULL',source_url:'text NOT NULL',thumbnail_url:'text NOT NULL',thumbnail_material:'text',observed_at:'date',geometry_status:"text DEFAULT 'raster_reference'",rights_status:"text DEFAULT 'review_required'",material_references:'jsonb',catalog_heights:'jsonb',source_hash:'text'});
add('glyph_assets',{font_variant_id:'uuid NOT NULL',text:'text NOT NULL',asset_document_id:'uuid',geometry_verified:'boolean DEFAULT false',width_mm:'numeric(20,2)',height_mm:'numeric(20,2)',fastening_data:'jsonb'});
add('employees',{user_id:'text',active:'boolean DEFAULT true'});add('employment_periods',{employee_id:'uuid NOT NULL',starts_on:'date NOT NULL',ends_on:'date',weekly_hours:'numeric(8,2)',holiday_region:'text'});
add('work_schedules',{employee_id:'uuid NOT NULL',valid_from:'date NOT NULL',valid_until:'date',mon:'numeric(6,2)',tue:'numeric(6,2)',wed:'numeric(6,2)',thu:'numeric(6,2)',fri:'numeric(6,2)',sat:'numeric(6,2)',sun:'numeric(6,2)'});
add('employee_skills',{employee_id:'uuid NOT NULL',skill:'text NOT NULL',valid_until:'date',evidence_document_id:'uuid'});
add('employee_cost_rate_versions',{employee_id:'uuid NOT NULL',valid_from:'date NOT NULL',valid_until:'date',rate:'numeric(20,6) NOT NULL',currency:"char(3) DEFAULT 'EUR'",kind:'text'});
add('leave_entitlements',{employee_id:'uuid NOT NULL',year:'integer NOT NULL',days:'numeric(8,2) NOT NULL',kind:'text NOT NULL',rule_version_id:'uuid'});
add('leave_ledger',{employee_id:'uuid NOT NULL',request_id:'uuid',year:'integer NOT NULL',days:'numeric(8,2) NOT NULL',kind:'text NOT NULL',reason:'text'});
add('time_sessions',{employee_id:'uuid NOT NULL',started_at:'timestamptz NOT NULL',ended_at:'timestamptz',active:'boolean NOT NULL DEFAULT true',device_id:'text',timezone:"text DEFAULT 'Europe/Berlin'",current_order_id:'uuid',current_activity:'text',received_at:'timestamptz DEFAULT now()'});
add('time_segments',{time_session_id:'uuid NOT NULL',employee_id:'uuid NOT NULL',kind:'text NOT NULL',started_at:'timestamptz NOT NULL',ended_at:'timestamptz',received_at:'timestamptz DEFAULT now()'});
add('time_allocations',{time_segment_id:'uuid NOT NULL',time_session_id:'uuid NOT NULL',employee_id:'uuid NOT NULL',order_id:'uuid',work_package_id:'uuid',cost_center:'text',activity:'text',started_at:'timestamptz NOT NULL',ended_at:'timestamptz',billable:'boolean DEFAULT false'});
add('time_submissions',{employee_id:'uuid NOT NULL',starts_on:'date NOT NULL',ends_on:'date NOT NULL',session_ids:'uuid[] NOT NULL',revision_snapshot:'jsonb',approved_by:'text',approved_at:'timestamptz',warnings:'text[]',reason:'text'});
add('time_corrections',{employee_id:'uuid NOT NULL',session_id:'uuid NOT NULL',old_snapshot:'jsonb NOT NULL',new_snapshot:'jsonb NOT NULL',reason:'text NOT NULL',approved_by:'text'});
add('time_account_ledger',{employee_id:'uuid NOT NULL',submission_id:'uuid NOT NULL',seconds:'integer NOT NULL',kind:'text NOT NULL',source_version:'integer NOT NULL'});
add('labor_cost_ledger',{employee_id:'uuid NOT NULL',submission_id:'uuid NOT NULL',allocation_id:'uuid NOT NULL',order_id:'uuid',seconds:'integer NOT NULL',rate_version_id:'uuid',amount:'numeric(20,2)',source_version:'integer NOT NULL',kind:'text NOT NULL'});
add('time_quantity_entries',{employee_id:'uuid NOT NULL',work_package_id:'uuid',order_id:'uuid',quantity:'numeric(20,6) NOT NULL',unit:'text NOT NULL',activity:'text',performed_on:'date NOT NULL'});
add('work_reports',{employee_id:'uuid NOT NULL',order_id:'uuid',work_package_id:'uuid',performed_on:'date',description:'text',document_id:'uuid'});
add('documents',{source_job_id:'uuid',generation_key:'text',original_name:'text NOT NULL',mime_type:'text NOT NULL',size_bytes:'bigint NOT NULL',content_hash:'text NOT NULL',current_version_id:'uuid',entity_type:'text',entity_id:'uuid',visibility:"text DEFAULT 'internal'",manually_named:'boolean DEFAULT false',archived:'boolean DEFAULT false'});
add('document_versions',{document_id:'uuid NOT NULL',blob_object_id:'uuid NOT NULL',content_hash:'text NOT NULL',revision:'integer NOT NULL',kind:"text DEFAULT 'original'"});
add('blob_objects',{storage_key:'text NOT NULL',provider:'text NOT NULL',content_hash:'text NOT NULL',mime_type:'text NOT NULL',size_bytes:'bigint NOT NULL',storage_version_id:'text',retention_policy_version:'text',retention_basis:'text',retention_started_at:'timestamptz',retain_until:'timestamptz',lock_mode:'text',lock_verified_at:'timestamptz',scan_status:"text DEFAULT 'quarantine'"});
add('document_links',{document_id:'uuid NOT NULL',entity_type:'text NOT NULL',entity_id:'uuid NOT NULL',purpose:'text'});
add('document_extractions',{document_version_id:'uuid NOT NULL',field_name:'text NOT NULL',value:'text',source_locator:'text',parser_version:'text',reviewed_by:'text',source_kind:'text'});
add('search_documents',{document_id:'uuid NOT NULL',document_version_id:'uuid NOT NULL',content:'text',search_vector:'tsvector',scope:'text NOT NULL'});
add('retention_policies',{document_kind:'text NOT NULL',years:'integer',basis:'text NOT NULL',approved_by:'text',valid_from:'date'});
add('retention_assignments',{document_version_id:'uuid NOT NULL',policy_id:'uuid NOT NULL',started_at:'timestamptz NOT NULL',retain_until:'timestamptz NOT NULL'});
add('legal_holds',{document_id:'uuid NOT NULL',reason:'text NOT NULL',review_due:'date',released_at:'timestamptz'});
add('deletion_jobs',{document_id:'uuid',party_id:'uuid',reason:'text NOT NULL',decision:'jsonb',approved_by:'text',approved_at:'timestamptz'});
add('deletion_tombstones',{object_hash:'text NOT NULL',entity_type:'text NOT NULL',deleted_at:'timestamptz NOT NULL DEFAULT now()',review_due:'date'});
add('import_batches',{content_hash:'text',checkpoint:'integer DEFAULT 0',mapping_version:'text',validation_report:'jsonb',committed_at:'timestamptz'});
add('staging_records',{batch_id:'uuid NOT NULL',row_number:'integer NOT NULL',entity_type:'text NOT NULL',legacy_id:'text',data:'jsonb NOT NULL',errors:'text[]',approved:'boolean DEFAULT false',committed_id:'uuid'});
add('import_files',{batch_id:'uuid NOT NULL',document_id:'uuid',original_path:'text NOT NULL',content_hash:'text NOT NULL',size_bytes:'bigint',checkpoint:'text'});
add('legacy_id_map',{source_system:'text NOT NULL',entity_type:'text NOT NULL',legacy_id:'text NOT NULL',entity_id:'uuid NOT NULL',batch_id:'uuid NOT NULL'});
add('portal_accesses',{customer_id:'uuid NOT NULL',token_hash:'text NOT NULL',password_hash:'text NOT NULL',contact_name:'text',identity_assurance:'text NOT NULL',expires_at:'timestamptz',revoked_at:'timestamptz',allow_binding:'boolean DEFAULT false'});
add('portal_sessions',{portal_access_id:'uuid NOT NULL',token_hash:'text NOT NULL',expires_at:'timestamptz NOT NULL'});
add('portal_grants',{portal_access_id:'uuid NOT NULL',entity_type:'text NOT NULL',entity_id:'uuid NOT NULL',capabilities:'text[] NOT NULL',revoked_at:'timestamptz'});
add('portal_publications',{portal_access_id:'uuid NOT NULL',entity_type:'text NOT NULL',entity_id:'uuid NOT NULL',revision_id:'uuid',document_version_id:'uuid',content_hash:'text NOT NULL',audience:'text NOT NULL',published_at:'timestamptz DEFAULT now()',revoked_at:'timestamptz'});
add('portal_declarations',{portal_access_id:'uuid',order_id:'uuid',quote_version_id:'uuid',kind:'text NOT NULL',statement:'text NOT NULL',person_name:'text',identity_assurance:'text',content_hash:'text',received_at:'timestamptz NOT NULL DEFAULT now()'});
add('threads',{order_id:'uuid',customer_id:'uuid',visibility:'text NOT NULL'});
add('messages',{thread_id:'uuid NOT NULL',portal_access_id:'uuid',body:'text NOT NULL',sender_name:'text',visibility:'text NOT NULL',revision_id:'uuid',element_id:'text',position:'jsonb'});
add('outgoing_messages',{recipient:'text NOT NULL',sender:'text NOT NULL',reply_to:'text',subject:'text NOT NULL',body:'text NOT NULL',attachment_version_ids:"uuid[] DEFAULT '{}'",content_hash:'text',message_id:'text NOT NULL',approved_by:'text',approved_at:'timestamptz',provider_response:'text',sent_at:'timestamptz'});
add('delivery_attempts',{outgoing_message_id:'uuid NOT NULL',attempt:'integer NOT NULL',started_at:'timestamptz NOT NULL',finished_at:'timestamptz',result:'text',safe_error:'text'});
add('email_templates',{kind:'text NOT NULL',subject:'text NOT NULL',body:'text NOT NULL',allowed_variables:'text[]',active:'boolean DEFAULT false'});
add('notifications',{user_id:'text',event_id:'uuid',policy_version:'text',link:'text',dedup_key:'text NOT NULL',read_at:'timestamptz'});
add('notification_preferences',{user_id:'text NOT NULL',channel:'text NOT NULL',category:'text NOT NULL',enabled:'boolean DEFAULT true',quiet_from:'time',quiet_until:'time'});
add('integration_connections',{provider:'text NOT NULL',secret_reference:'text',fingerprint:'text',configuration:'jsonb',checked_at:'timestamptz'});
add('ai_runs',{actor_id:'text NOT NULL',capability:'text NOT NULL',model_id:'text NOT NULL',connection_version_id:'uuid',request_hash:'text NOT NULL',provider_id:'text',input_tokens:'integer',output_tokens:'integer',cost_reserved:'numeric(20,6)',cost_actual:'numeric(20,6)',result:'jsonb'});
add('ai_proposals',{actor_id:'text NOT NULL',entity_type:'text',entity_id:'uuid',base_version:'integer',action_type:'text NOT NULL',commands:'jsonb NOT NULL',evidence:'jsonb',assumptions:'text[]',missing_inputs:'text[]',validation:'jsonb',expires_at:'timestamptz'});
add('ai_budgets',{period:'text NOT NULL',limit_amount:'numeric(20,6) NOT NULL',reserved:'numeric(20,6) NOT NULL DEFAULT 0',spent:'numeric(20,6) NOT NULL DEFAULT 0',currency:"char(3) DEFAULT 'EUR'"});
add('ai_budget_reservations',{run_id:'uuid NOT NULL',budget_id:'uuid NOT NULL',amount:'numeric(20,6) NOT NULL',settled:'boolean DEFAULT false'});
add('rule_versions',{approved_by:'text',approved_at:'timestamptz',rule_version:'text'});
add('metric_definitions',{key:'text NOT NULL',definition:'text NOT NULL',unit:'text NOT NULL',source_tables:'text[] NOT NULL',permission:'text NOT NULL',definition_version:'text NOT NULL'});
add('data_quality_issues',{entity_type:'text NOT NULL',entity_id:'uuid',code:'text NOT NULL',severity:'text NOT NULL',description:'text NOT NULL',assigned_to:'uuid'});
add('command_receipts',{actor_scope:'text NOT NULL',command_name:'text NOT NULL',idempotency_key:'text NOT NULL',payload_hash:'text NOT NULL',result:'jsonb NOT NULL'});
add('outbox_events',{event_type:'text NOT NULL',aggregate_type:'text NOT NULL',aggregate_id:'uuid NOT NULL',aggregate_version:'integer NOT NULL',event_sequence:'integer NOT NULL DEFAULT 0',actor_id:'text NOT NULL',correlation_id:'text NOT NULL',payload:'jsonb NOT NULL',published_at:'timestamptz',attempts:'integer NOT NULL DEFAULT 0',lease_until:'timestamptz',fencing_token:'bigint NOT NULL DEFAULT 0'});
add('consumer_inbox',{consumer_name:'text NOT NULL',event_id:'uuid NOT NULL',processed_at:'timestamptz NOT NULL DEFAULT now()'});
add('job_runs',{queued_at:'timestamptz',queue_message_id:'text',event_id:'uuid',actor_id:'text',job_type:'text NOT NULL',payload:'jsonb NOT NULL',attempts:'integer NOT NULL DEFAULT 0',max_attempts:'integer NOT NULL DEFAULT 5',lease_until:'timestamptz',fencing_token:'bigint NOT NULL DEFAULT 0',next_attempt_at:'timestamptz DEFAULT now()',last_error:'text',result:'jsonb',checkpoint:'jsonb',started_at:'timestamptz',finished_at:'timestamptz'});
add('audit_events',{action:'text NOT NULL',aggregate_type:'text NOT NULL',aggregate_id:'uuid',aggregate_version:'integer',actor_id:'text NOT NULL',actor_type:'text NOT NULL',correlation_id:'text NOT NULL',reason:'text',payload_hash:'text NOT NULL',previous_hash:'text',entry_hash:'text NOT NULL'});
add('audit_anchors',{last_event_id:'uuid NOT NULL',entry_hash:'text NOT NULL',document_id:'uuid'});
add('module_settings',{module:'text NOT NULL',enabled:'boolean NOT NULL DEFAULT true'});
add('reauth_sessions',{session_id:'text NOT NULL',user_id:'text NOT NULL',confirmed_at:'timestamptz NOT NULL'});
add('upload_intents',{actor_id:'text NOT NULL',portal_access_id:'uuid',pathname:'text NOT NULL',original_name:'text NOT NULL',mime_type:'text NOT NULL',size_bytes:'bigint NOT NULL',content_hash:'text NOT NULL',entity_type:'text',entity_id:'uuid',expires_at:'timestamptz NOT NULL',document_id:'uuid'});
add('work_calendars',{region:'text NOT NULL',year:'integer NOT NULL',holiday_dates:'text',holidays:'jsonb',approved_at:'timestamptz',approved_by:'text',reason:'text'});
add('time_account_openings',{employee_id:'uuid NOT NULL',as_of:'date NOT NULL',hours:'numeric(20,6) NOT NULL',seconds:'integer',reason:'text NOT NULL',source_document_version_id:'uuid',approved_at:'timestamptz',approved_by:'text'});
add('time_account_adjustments',{employee_id:'uuid NOT NULL',effective_on:'date NOT NULL',hours:'numeric(20,6) NOT NULL',seconds:'integer',kind:'text NOT NULL',reason:'text NOT NULL',source_document_version_id:'uuid',approved_at:'timestamptz',approved_by:'text'});
add('time_account_ledger',{effective_on:'date'});add('labor_cost_ledger',{time_session_id:'uuid'});
export const immutableTables=['quote_versions','quote_acceptances','order_confirmations','design_revisions','design_approvals','manufacturing_releases','stock_movements','payment_allocations','issuance_evidence','invoice_references','time_account_ledger','labor_cost_ledger','audit_events'];

add('documents',{generation_proof:'jsonb'});
add('payment_allocations',{tax_splits:'jsonb',tax_basis:'text'});
add('payment_tax_reviews',{allocation_id:'uuid',tax_splits:'jsonb',basis:'text',approved_by:'text'});
add('invoices',{settlement_rule_version_id:'uuid'});
add('invoice_references',{settlement_evidence:'jsonb'});
add('invoice_tax_summaries',{tax_category:'text',tax_exemption_reason:'text'});
add('invoices',{historical_import:'boolean',source_document_version_id:'uuid',legacy_source:'text',tax_category:'text',tax_exemption_reason:'text'});
for(const t of ['invoice_lines'])add(t,{tax_category:'text',tax_exemption_reason:'text'});
add('supplier_invoices',{artifact_status:'text',source_document_version_id:'uuid',archive_proof:'jsonb'});
add('goods_receipts',{product_id:'uuid',unit:'text'});
add('dunning_cases',{next_due_date:'date',fee:'numeric(20,2)',snapshot:'jsonb',document_id:'uuid'});
add('datev_export_batches',{approved_by:'text',approved_at:'timestamptz',import_confirmation:'text'});

// Confirmed operational evidence and immutable configuration versions.
add('integration_connections',{"current_version_id": "uuid"});
add('integration_connection_versions',{"connection_id": "uuid", "provider": "text", "configuration": "jsonb", "secret_reference": "text", "fingerprint": "text", "source_version": "integer"});
add('performance_valuations',{"order_id": "uuid", "effective_on": "date", "value_net": "numeric(20,2)", "currency": "char(3)", "basis": "text", "rule_version_id": "uuid", "approved_by": "text", "approved_at": "timestamptz"});
add('cost_estimates',{"order_id": "uuid", "as_of": "date", "uncommitted_remaining_amount": "numeric(20,2)", "currency": "char(3)", "cost_level": "text", "basis": "text", "rule_version_id": "uuid", "approved_by": "text", "approved_at": "timestamptz"});
add('liquidity_openings',{"bank_account_id": "uuid", "as_of": "date", "amount": "numeric(20,2)", "currency": "char(3)", "source_document_version_id": "uuid", "approved_by": "text", "approved_at": "timestamptz"});
add('report_snapshots',{"filters": "jsonb", "definition_version": "text", "definition_versions": "jsonb", "data_as_of": "timestamptz", "snapshot": "jsonb", "content_hash": "text", "document_id": "uuid", "currency": "char(3)"});
add('backup_manifests',{"snapshot_at": "timestamptz", "content_hash": "text", "manifest": "jsonb", "archive_proof": "jsonb", "encryption_version": "text"});
add('restore_checks',{"backup_id": "uuid", "report": "jsonb", "completed_at": "timestamptz", "rpo_seconds": "integer", "rto_seconds": "integer"});
add('import_cutovers',{"source_system": "text", "watermark": "text", "legacy_writes_locked": "boolean", "evidence_document_version_id": "uuid", "reconciliation": "jsonb", "approved_by": "text", "approved_at": "timestamptz"});
add('quote_cost_snapshots',{"quote_version_id": "uuid", "lines": "jsonb", "content_hash": "text"});
add('material_requirements',{"order_id": "uuid", "product_id": "uuid", "quantity": "numeric(20,6)", "unit": "text", "required_on": "date", "source_revision_id": "uuid", "source_document_version_id": "uuid", "approved_at": "timestamptz", "approved_by": "text"});
add('blob_usage_months',{"period": "text", "transfer_bytes": "bigint", "simple_operations": "bigint", "advanced_operations": "bigint"});
add('blob_storage_objects',{"storage_key": "text", "size_bytes": "bigint", "content_hash": "text", "reserved_until": "timestamptz"});
add('notification_preferences',{"user_id": "text", "channel": "text", "category": "text", "enabled": "boolean", "quiet_start": "text", "quiet_end": "text", "digest": "boolean"});
add('notification_deliveries',{"event_id": "uuid", "policy_version": "text", "user_id": "text", "channel": "text", "action": "text", "notification_id": "uuid"});
add('metric_definitions',{"calculation_rule": "text", "included_states": "text[]", "excluded_states": "text[]", "time_basis": "text"});
add('supplier_invoice_allocations',{"cost_kind": "text"});
add('supplier_invoices',{"validation_report": "jsonb", "currency": "char(3)"});
add('goods_receipts',{"purchase_order_line_id": "uuid"});
add('purchase_orders',{"confirmed_delivery_date": "date", "confirmation_document_version_id": "uuid"});
add('time_account_ledger',{"leave_request_id": "uuid"});

add('recommendation_feedback',{recommendation_id:'uuid',outcome:'text',reason:'text',source_snapshot:'jsonb'});
add('purchase_orders',{currency:'char(3)'});

add('outgoing_messages',{connection_version_id:'uuid',reply_to:'text',attachment_snapshot:'jsonb'});

add('open_item_offsets',{effective_on:'date'});add('dunning_cases',{rule_version_id:'uuid'});add('stock_movements',{source_movement_id:'uuid'});add('supplier_invoice_lines',{purchase_order_line_id:'uuid'});

add('stock_items',{currency:'char(3)'});add('goods_receipts',{stock_quantity:'numeric(20,6)',stock_unit:'text',conversion_proof:'jsonb'});add('stock_movements',{goods_receipt_id:'uuid'});

for(const t of ['quote_lines','order_lines','purchase_order_lines'])add(t,{tax_category:'text',tax_exemption_reason:'text'});

add('notifications',{category:'text',available_at:'timestamptz'});
add('tasks',{action_link:'text',source_event_id:'uuid'});

add('change_orders',{currency:'char(3)',net_total:'numeric(20,2)',tax_total:'numeric(20,2)',gross_total:'numeric(20,2)',frozen_snapshot:'jsonb',content_hash:'text',accepted_at:'timestamptz'});
add('delivery_notes',{currency:'char(3)'});
for(const t of ['change_order_lines','delivery_note_lines','supplier_invoice_lines'])add(t,{tax_category:'text',tax_exemption_reason:'text'});

add('backup_states',{dirty_version:'bigint',backed_version:'bigint',last_changed_at:'timestamptz',last_snapshot_at:'timestamptz',last_manifest_id:'uuid'});

add('notification_deliveries',{payload:'jsonb',eligible_at:'timestamptz',outgoing_message_id:'uuid'});

for(const t of ['quote_lines','invoice_lines','purchase_order_lines','change_order_lines','delivery_note_lines','supplier_invoice_lines','order_lines'])add(t,{cost_review_required:'boolean',cost_evidence:'jsonb'});

add('document_line_revisions',{parent_type:'text',parent_id:'uuid',parent_version:'integer',lines:'jsonb',content_hash:'text'});

add('processing_purposes',{document_id:'uuid',party_id:'uuid',purpose:'text',legal_basis:'text',retain_until:'timestamptz',closed_at:'timestamptz',closed_by:'text',closure_reason:'text'});
add('retention_policies',{approved_at:'timestamptz',content_hash:'text',responsible_person:'text',source_reference:'text',previous_version_id:'uuid'});
add('legal_holds',{released_by:'text',release_reason:'text'});
add('deletion_tombstones',{entity_id:'uuid',related_ids:'uuid[]',deletion_job_id:'uuid',independent_proof:'jsonb'});
add('ai_runs',{source_document_ids:'uuid[]',task_type:'text',usage_details:'jsonb',pricing_snapshot:'jsonb',cost_basis:'text'});add('ai_proposals',{ai_run_id:'uuid'});

add('invoices',{planned_transmission_date:'date',recipient_regime:'text',retention_policy_id:'uuid'});add('legal_entities',{previous_year_turnover:'numeric(20,2)',turnover_year:'integer'});

add('legacy_id_map',{source_hash:'text'});
add('documents',{original_path:'text',import_batch_id:'uuid'});
add('import_batches',{source_document_version_id:'uuid',inventory_hash:'text',cutover_id:'uuid',is_final_delta:'boolean'});
add('import_archive_entries',{batch_id:'uuid',path:'text',metadata:'jsonb',document_id:'uuid',content_hash:'text',target_type:'text',target_id:'uuid',last_error:'text'});
add('migration_cutovers',{source_system:'text',source_fence_kind:'text',source_fence_statement:'text',source_watermark:'text',evidence_document_version_id:'uuid',fenced_at:'timestamptz',source_totals:'jsonb',reconciliation:'jsonb',released_at:'timestamptz',released_by:'text',release_statement:'text'});

add('product_availability_versions',{revision:'integer NOT NULL',previous_version_id:'uuid',content_hash:'text',approved_at:'timestamptz',approved_by:'text',evidence_version_id:'uuid',review_scope:'text',validation_report:'jsonb'});

add('recipient_invoice_profiles',{approved_by:'text',approved_at:'timestamptz',content_hash:'text'});
add('order_tax_decisions',{approved_by:'text',approved_at:'timestamptz',content_hash:'text'});
add('business_document_versions',{kind:'text',entity_id:'uuid',entity_version:'integer',snapshot:'jsonb',content_hash:'text'});
add('invoices',{recipient_profile_version_id:'uuid'});
add('delivery_note_lines',{order_line_id:'uuid',stock_item_id:'uuid',lot_number:'text',movement_kind:'text'});
add('delivery_notes',{person_name:'text',declaration:'text',evidence_document_version_id:'uuid',confirmed_at:'timestamptz'});
add('acceptance_reports',{person_name:'text',declaration:'text',evidence_document_version_id:'uuid',confirmed_at:'timestamptz',warranty_rule_version_id:'uuid',warranty_started_on:'date',warranty_until:'date'});

tables.supplier_invoices.tax_summaries='jsonb';
add('outgoing_messages',{order_id:'uuid',customer_id:'uuid',supplier_id:'uuid',parent_message_id:'uuid',dispatch_started_at:'timestamptz',dispatch_job_id:'uuid',dispatch_fencing_token:'bigint',last_error:'text'});
add('threads',{supplier_id:'uuid'});
add('mail_delivery_evidence',{outgoing_message_id:'uuid',job_id:'uuid',outcome:'text',source:'text',message_id:'text',mail_content_hash:'text',attachment_snapshot:'jsonb',accepted_at:'timestamptz',provider_reference:'text',evidence_document_version_id:'uuid',evidence_hash:'text',reason:'text',content_hash:'text'});

add('inventory_count_observations',{line_id:'uuid',quantity:'numeric(20,6)',actor_id:'text',observed_at:'timestamptz'});
add('inventory_count_lines',{resolved_observation_id:'uuid'});

add('user_onboarding',{actor_id:'text NOT NULL',step:'integer NOT NULL DEFAULT 0',guide_version:'integer NOT NULL DEFAULT 1'});add('legal_entities',{training_mode:'boolean NOT NULL DEFAULT false'});

add('numbering_profiles',{scope:'text NOT NULL',template:'text NOT NULL',padding:'integer NOT NULL',annual:'boolean NOT NULL DEFAULT true'});

add('demo_datasets',{records:'jsonb',coverage:'jsonb',dataset_version:'integer NOT NULL DEFAULT 1'});
