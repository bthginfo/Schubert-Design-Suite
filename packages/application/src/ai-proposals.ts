import { assistantGuardrailIssues } from "@schubert/geometry";
import { withTenant, update, one } from "@schubert/db";
import {
  assistantCommandAllowed,
  designOperationSchema,
  planningOperationAllowed,
  type ActorContext,
} from "@schubert/contracts";
import { requireRule } from "@schubert/domain";
import { getRecord, executeCommand } from "./core.js";

export async function applyAIProposal(ctx: ActorContext, id: string) {
  const proposal = await withTenant(ctx, (db) =>
    getRecord(db, "ai_proposals", id, false),
  );
  requireRule(
    proposal.actor_id === ctx.actorId &&
      (proposal.status === "applied" ||
        (proposal.status === "proposed" &&
          new Date(proposal.expires_at) > new Date())),
    "PROPOSAL_EXPIRED",
    "Vorschlag ist nicht mehr anwendbar.",
    409,
  );
  requireRule(
    !proposal.missing_inputs?.length &&
      proposal.commands.length >= 1 &&
      proposal.commands.length <= 10,
    "PROPOSAL_REVIEW",
    "Die für diesen Entwurf erforderlichen Angaben zuerst ergänzen.",
  );
  for (const command of proposal.commands) {
    requireRule(
      assistantCommandAllowed(command.name),
      "AI_COMMAND",
      "Diese Aktion ist nicht als bearbeitbarer Entwurf verfügbar.",
    );
    if (command.name === "planning.design.change") {
      const revision = await withTenant(ctx, (db) =>
        one<any>(
          db,
          "SELECT snapshot FROM design_revisions WHERE id=$1 AND variant_id=$2",
          [
            command.input.base_revision_id,
            command.targetId ?? proposal.entity_id,
          ],
        ),
      );
      requireRule(
        revision,
        "AI_STALE_TARGET",
        "Der Vorschlag gehört nicht zu diesem Planstand.",
        409,
      );
      const operations = command.input.operations;
      requireRule(
        Array.isArray(operations) &&
          operations.length > 0 &&
          operations.length <= 1000,
        "AI_EDIT_COUNT",
        "Die Planänderung ist leer oder zu umfangreich.",
      );
      for (const raw of operations) {
        requireRule(
          planningOperationAllowed("design", raw?.type),
          "AI_EDIT_ATTESTATION",
          "Fachliche Nachweise und Freigaben benötigen ihre belegte Fachaktion.",
        );
        const op = designOperationSchema.parse(raw);
        if (op.type === "set_design_target")
          requireRule(
            !op.confirm,
            "AI_EDIT_ATTESTATION",
            "Ein Entwurfsmaß wird durch die KI nicht fachlich bestätigt.",
          );
      }
      if (proposal.validation?.guardrails) {
        const issues = assistantGuardrailIssues(
          revision.snapshot,
          operations,
          proposal.validation.guardrails,
          proposal.validation.selectedElementIds ?? [],
        );
        requireRule(!issues.length, "AI_EDIT_BOUNDARY", issues.join(" "));
      }
    }
  }
  const onlyPlanning =
      proposal.commands.length === 1 &&
      proposal.commands[0].name === "planning.design.change",
    command = proposal.commands[0];
  const result = onlyPlanning
    ? await executeCommand(ctx, {
        name: command.name,
        id: command.targetId ?? proposal.entity_id,
        expectedVersion: command.baseVersion ?? proposal.base_version,
        idempotencyKey: "ai-proposal-" + proposal.id,
        payload: { ...command.input, ai_proposal_id: proposal.id },
      })
    : await executeCommand(ctx, {
        name: "assistant.proposal.commit",
        idempotencyKey: "ai-proposal-" + proposal.id,
        payload: { proposal_id: proposal.id },
      });
  if (proposal.status !== "applied")
    await withTenant(ctx, (db) =>
      update(db, "ai_proposals", proposal.id, {
        status: "applied",
        ...(!onlyPlanning && result.record?.id
          ? { entity_id: result.record.id, entity_type: result.module }
          : {}),
      }),
    );
  return result;
}
