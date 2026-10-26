import { z } from "zod";
import {
  assistantCommandAllowed,
  assistantRecordModule,
  type ActorContext,
} from "@schubert/contracts";
import { one, withTenant } from "@schubert/db";
import { requireRule } from "@schubert/domain";
import { register, getRecord, executeChildCommand } from "./core.js";
import {
  assertDocumentAccess,
  assertDocumentTarget,
  assertManufacturerUse,
} from "./document-access.js";
import { initialPlanningOperations } from "../../ai/src/planning-edits.js";

function references(value: any, created: any[], field = ""): any {
  if (
    typeof value === "string" &&
    /(?:_id|Id)$/.test(field) &&
    /^\$created:\d+(?:\.(?:project|variant|revision))?$/.test(value)
  ) {
    const [index, key] = value.slice(9).split("."),
      result = created[Number(index)];
    requireRule(
      result,
      "AI_DRAFT_REFERENCE",
      "Die neue Verknüpfung benötigt einen vorher angelegten Entwurf.",
    );
    return key
      ? result[key]?.id
      : (result.record?.id ?? result.id ?? result.project?.id);
  }
  if (Array.isArray(value))
    return value.map((item) => references(item, created, field));
  return value && typeof value === "object"
    ? Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          references(item, created, key),
        ]),
      )
    : value;
}
/** Every child uses the same handlers, permissions, transaction, audit and receipt as manual work. */
register("assistant.proposal.commit", "account.self", async (r) => {
  const { proposal_id } = z
      .strictObject({ proposal_id: z.uuid() })
      .parse(r.payload),
    proposal = await getRecord(r.db, "ai_proposals", proposal_id, true);
  requireRule(
    proposal.actor_id === r.ctx.actorId &&
      proposal.status === "proposed" &&
      new Date(proposal.expires_at) > new Date(),
    "PROPOSAL_EXPIRED",
    "Dieser Vorschlag ist nicht mehr anwendbar.",
    409,
  );
  requireRule(
    !proposal.missing_inputs?.length &&
      Array.isArray(proposal.commands) &&
      proposal.commands.length >= 1 &&
      proposal.commands.length <= 10,
    "PROPOSAL_REVIEW",
    "Die für diesen Entwurf erforderlichen Angaben zuerst ergänzen.",
  );
  const created: any[] = [],
    results: any[] = [],
    catalog = proposal.validation?.actionCatalog ?? [];
  for (const [index, command] of proposal.commands.entries()) {
    requireRule(
      assistantCommandAllowed(command.name),
      "AI_COMMAND",
      "Dieser Entwurf enthält keine unterstützte Fachaktion.",
    );
    const capability = catalog.find((item: any) => item.name === command.name);
    requireRule(
      capability ||
        (command.name === "planning.design.change" &&
          proposal.validation?.planningTarget) ||
        [
          "crm.inquiry.create",
          "sales.quote.create",
          "communication.email.create",
          "communication.task.create",
        ].includes(command.name),
      "AI_COMMAND_SCOPE",
      "Diese Aktion war im geöffneten Arbeitsbereich nicht verfügbar.",
    );
    const module = assistantRecordModule(command.name);
    let id = command.targetId ?? null,
      version = command.baseVersion ?? null;
    if (command.name === "planning.design.change") {
      const target = proposal.validation.planningTarget;
      requireRule(
        id === target.variantId &&
          version === target.baseVersion &&
          command.input.base_revision_id === target.revisionId,
        "AI_RECORD_SCOPE",
        "Die Planänderung gehört nicht zum angezeigten Stand.",
      );
    } else if (command.name.endsWith(".update")) {
      requireRule(
        capability?.targetId === id && capability?.baseVersion === version,
        "AI_RECORD_SCOPE",
        "Die Änderung gehört nicht zum angezeigten Datensatz.",
      );
    } else {
      id = null;
      version = null;
    }
    const payload = references(command.input, created),
      initialPlan = payload.initial_plan;
    delete payload.initial_plan;
    if (command.name === "communication.email.create") {
      const allowed = proposal.validation?.allowedRecipients ?? [];
      requireRule(
        allowed.includes(String(payload.recipient ?? "").toLowerCase()),
        "AI_RECIPIENT_SCOPE",
        "Den E-Mail-Empfänger aus der Vorschau verwenden.",
      );
    }
    let result = await executeChildCommand(r, {
      name: command.name,
      ...(id ? { id } : {}),
      ...(version !== null ? { expectedVersion: version } : {}),
      idempotencyKey: r.command.idempotencyKey + ":" + index,
      payload: { ...payload, ai_proposal_id: proposal.id },
    });
    const links = proposal.evidence ?? [];
    if (command.name === "planning.project.create" && result.project) {
      const context = {
        entityType: "planning",
        designKind: result.project.kind,
        variantId: result.variant.id,
        baseVersion: result.variant.version,
        revisionId: result.revision.id,
        snapshot: result.revision.snapshot,
        sources: proposal.validation?.sources ?? [],
      };
      const operations = initialPlanningOperations(context, initialPlan);
      if (operations.length) {
        const changed = await executeChildCommand(r, {
          name: "planning.design.change",
          id: result.variant.id,
          expectedVersion: result.variant.version,
          idempotencyKey: r.command.idempotencyKey + ":plan:" + index,
          payload: {
            base_revision_id: result.revision.id,
            operations,
            ai_proposal_id: proposal.id,
          },
        });
        result = { ...result, ...changed };
      }
    }
    const plan = result.variant
      ? await getRecord(
          r.db,
          "planning_projects",
          result.variant.planning_project_id,
        )
      : null;
    const record = result.project ?? plan ?? result.record ?? result,
      slug = plan ? "studio" : (module?.slug ?? "mail");
    for (const evidence of slug === "mail" ? [] : links) {
      if (!evidence.documentVersionId) continue;
      const sourceVersion = await getRecord(
          r.db,
          "document_versions",
          evidence.documentVersionId,
        ),
        doc = await getRecord(r.db, "documents", sourceVersion.document_id);
      await assertDocumentAccess(r.db, r.ctx, doc, sourceVersion.id);
      requireRule(
        sourceVersion.content_hash === evidence.sourceHash &&
          sourceVersion.status === "available" &&
          doc.status === "available",
        "AI_SOURCE_CHANGED",
        "Eine verwendete Quelldatei ist nicht mehr im geprüften Stand verfügbar.",
      );
      const blob = await getRecord(
        r.db,
        "blob_objects",
        sourceVersion.blob_object_id,
      );
      requireRule(
        blob.status === "available" &&
          ["clean", "trusted_generator"].includes(blob.scan_status) &&
          blob.content_hash === sourceVersion.content_hash,
        "AI_SOURCE_CHANGED",
        "Eine verwendete Quelldatei ist nicht mehr geprüft verfügbar.",
      );
      await assertManufacturerUse(r.db, doc, sourceVersion.id, "ai");
      await assertDocumentTarget(r.db, r.ctx, slug, record.id);
      const exists = await one(
        r.db,
        "SELECT 1 FROM document_links WHERE document_id=$1 AND entity_type=$2 AND entity_id=$3",
        [doc.id, slug, record.id],
      );
      if (!exists)
        await r.insert("document_links", {
          document_id: doc.id,
          entity_type: slug,
          entity_id: record.id,
          purpose: "ai_source",
          status: "active",
        });
    }
    created.push(result);
    results.push({
      record,
      module: slug,
      ...(result.variant
        ? { variant: result.variant, revision: result.revision }
        : {}),
      href:
        slug === "mail"
          ? record.order_id
            ? "/orders/" + record.order_id
            : record.customer_id
              ? "/customers/" + record.customer_id
              : "/sales"
          : "/" + slug + "/" + record.id,
    });
  }
  const primary = results.at(-1),
    planning = results.findLast((item) => item.variant);
  return {
    ...primary.record,
    record: primary.record,
    module: primary.module,
    href: primary.href,
    records: results,
    ...(planning
      ? { variant: planning.variant, revision: planning.revision }
      : {}),
  };
});

export async function assistantAttachmentStatus(ctx: ActorContext, id: string) {
  return withTenant(ctx, async (db) => {
    const doc = await getRecord(db, "documents", z.uuid().parse(id));
    await assertDocumentAccess(db, ctx, doc);
    const version = await getRecord(
        db,
        "document_versions",
        doc.current_version_id,
      ),
      blob = await getRecord(db, "blob_objects", version.blob_object_id);
    const job = await one<any>(
      db,
      "SELECT status,last_error FROM job_runs WHERE job_type='document.ingest' AND payload->>'documentId'=$1 ORDER BY created_at DESC LIMIT 1",
      [doc.id],
    );
    return {
      id: doc.id,
      name: doc.name,
      status:
        doc.status === "available" &&
        version.status === "available" &&
        ["clean", "trusted_generator"].includes(blob.scan_status)
          ? "available"
          : ["infected", "rejected", "blocked"].includes(blob.scan_status)
            ? "blocked"
            : job && ["failed", "unavailable"].includes(job.status)
              ? "unavailable"
              : "checking",
      message: job?.last_error ?? null,
    };
  });
}
