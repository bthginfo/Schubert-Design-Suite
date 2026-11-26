import assert from "node:assert/strict";
import { claudeFetch, claudeMessage, jsonResponse, toolUse, answerText } from "./lib/claude-transport.js";
import { randomUUID } from "node:crypto";
import type { ActorContext, AssistantSuiteArea } from "@schubert/contracts";
import {
  applyAIProposal, assistantInputSchema, assistantProposalPlan, createAssistantReadTools, executeCommand, prepareAssistantContext,
} from "@schubert/application";
import { assistant, planningDraftOperations } from "@schubert/ai";
import { one, withTenant } from "@schubert/db";

const lookup = (area: AssistantSuiteArea, query: string | null, details = true) =>
  ({ area, query, details, from: null, to: null, status: null });

export async function assistantSuiteIntegration(
  actor: (role: string) => ActorContext,
  test: (label: string, run: () => Promise<void>) => Promise<void>,
) {
  const owner = actor("Owner"), tag = "TEST Suite " + randomUUID().slice(0, 10);
  const command = (name: string, payload: Record<string, unknown>, row?: { id: string; version: number }) =>
    executeCommand(owner, { name, payload, id: row?.id, expectedVersion: row?.version, idempotencyKey: randomUUID() });
  const customer = await command("crm.customer.create", { name: tag + " Kunde", email: "suite-customer@example.invalid", city: "Ingolstadt" });
  const order = await command("sales.order.create", { title: tag + " Auftrag", customer_id: customer.id, currency: "EUR",
    lines: [{ description: "Natursteinzuschnitt", quantity: "2", unit: "piece", unit_price: "100", tax_rate: "19" }] });
  const plan = await command("planning.project.create", { name: tag + " Grabmal", kind: "memorial", order_id: order.id });
  const savedPlan = await command("planning.design.change", { base_revision_id: plan.revision.id, operations:
    planningDraftOperations({ snapshot: plan.revision.snapshot }, { kind: "memorial_slab", label: "Musterstein", widthMm: "800", heightMm: "1200", thicknessMm: "160" }) }, plan.variant);
  const worker = await command("workforce.employee.create", { name: tag + " Mitarbeiter", employment_start: "2026-01-01" });
  const prepare = (context: Record<string, unknown>, who = owner) =>
    prepareAssistantContext(who, assistantInputSchema.parse({ message: tag, context }), "http://localhost");
  const privatePage = await prepare({ path: "settings", search: "?tab=integrations" });
  const suiteContext = privatePage.context;

  await test("Suite search works on protected screens without transferring their record data", async () => {
    assert.equal(suiteContext.suite.pageIncluded, false);
    assert.deepEqual(suiteContext.record, {});
    assert.equal(suiteContext.currentReferences.customers, undefined);
    const tools = createAssistantReadTools(owner, suiteContext);
    for (const area of tools.suite!.areas) {
      try {
        const result = await tools.execute("find_suite_records", lookup(area, tag, false)) as any;
        assert.equal(result.area, area);
        assert(Array.isArray(result.items));
      } catch (error) {
        throw new Error("Suite lookup failed for " + area, { cause: error });
      }
    }
    const customerResult: any = await tools.execute("find_suite_records", lookup("customers", customer.name));
    assert.equal(customerResult.items[0].email, "suite-customer@example.invalid");
    assert.equal(customerResult.update.targetId, customer.id);
    const orderResult: any = await tools.execute("find_suite_records", lookup("orders", order.number));
    assert.equal(Number(orderResult.lines[0].unit_price), 100);
    assert.equal(tools.suite!.reference("orders", order.id)?.customer_id, customer.id);
    assert.equal(tools.suite!.links().some(link => link.href === "/customers/" + customer.id), true);
  });

  await test("Suite search separates roles, assigned orders, private staff fields and ambiguous references", async () => {
    const employee = actor("Employee"), limited = createAssistantReadTools(employee, suiteContext);
    assert(!limited.suite!.areas.includes("invoices"));
    assert.equal((await limited.execute("find_suite_records", lookup("invoices", order.number)) as any).unavailable, true);
    assert.deepEqual((await limited.execute("find_suite_records", lookup("orders", order.number)) as any).items, []);
    assert.deepEqual((await limited.execute("find_suite_records", lookup("studio", plan.project.name)) as any).items, []);
    const tools = createAssistantReadTools(owner, suiteContext);
    const staff: any = await tools.execute("find_suite_records", lookup("team", worker.name));
    assert.deepEqual(Object.keys(staff.items[0]).sort(), ["id", "name"]);
    const dispatch = await tools.execute("resolve_dispatch_assignment", { person: worker.name, order: order.number }) as any;
    assert.equal(dispatch.employee_id, worker.id);
    assert.equal(dispatch.order_id, order.id);
    await command("workforce.employee.create", { name: tag + " Mitarbeiter Süd", employment_start: "2026-01-01" });
    const named = createAssistantReadTools(owner, suiteContext, "Bitte „" + worker.name + "“ für diesen Einsatz einteilen.");
    assert.equal((await named.execute("resolve_dispatch_assignment", { person: tag, order: order.number }) as any).employee_id, worker.id);
    await command("crm.customer.create", { name: tag + " Kunde Zweitakte", email: "other@example.invalid" });
    const fresh = createAssistantReadTools(owner, suiteContext);
    const ambiguous: any = await fresh.execute("find_suite_records", lookup("customers", tag + " Kunde"));
    assert.equal(ambiguous.ambiguous, true);
    assert.equal(ambiguous.update, undefined);
    assert.equal(fresh.suite!.reference("customers", customer.id), undefined);
    assert(!JSON.stringify(ambiguous).includes("@example.invalid"));
  });

  const originalFetch = globalThis.fetch, originalKey = process.env.ANTHROPIC_API_KEY, prefix = "msg_suite_" + randomUUID();
  let lookups: ReturnType<typeof lookup>[] = [], answer: Record<string, unknown> = {}, requests = 0;
  const reply = (name: string, input: Record<string, unknown>, row?: { id: string; version: number }) => ({
    commands: [{ name, inputJson: JSON.stringify(input), targetId: row?.id ?? null, baseVersion: row?.version ?? null }],
  });
  try {
    process.env.ANTHROPIC_API_KEY = "synthetic-offline-suite-transport";
    globalThis.fetch = claudeFetch((body) => {
      // The first call offers the suite search; the follow-up answers after the tool results.
      const first = body.tool_choice?.type !== "none" && (body.tools ?? []).some((tool: any) => tool.name === "find_suite_records");
      const content = first ? lookups.map((args, i) => toolUse("find_suite_records", args, "toolu_suite_" + i)) :
        [answerText({ text: "Synthetische Antwort", ...answer })];
      return jsonResponse(claudeMessage({ id: prefix + "_" + (++requests), model: body.model, content }));
    });
    const chat = (message: string, context = suiteContext) =>
      assistant(owner, tag + " " + message, context, "standard", [], undefined, createAssistantReadTools(owner, context));

    await test("An office draft from the planner binds the searched order and is applied exactly once", async () => {
      const local = (await prepare({ path: "studio/" + plan.project.id, variantId: plan.variant.id })).context;
      lookups = [lookup("orders", order.number)];
      answer = reply("billing.invoice.create", { title: tag + " Rechnungsentwurf", kind: "normal", order_id: order.id,
        lines: [{ description: "Natursteinzuschnitt", quantity: "2", unit: "piece", unit_price: "100", tax_rate: "19" }] });
      const result = await chat("Rechnung aus Auftrag", local);
      assert(result.proposal?.id && !result.proposal.validation.planningTarget);
      assert.equal(result.proposal.commands[0].input.customer_id, customer.id);
      assert.equal(result.proposal.validation.referenceLabels[order.id], order.number + " · " + order.title);
      assert.equal(await withTenant(owner, db => one(db, "SELECT 1 FROM invoices WHERE title=$1", [tag + " Rechnungsentwurf"])), null);
      const applied = await applyAIProposal(owner, result.proposal.id);
      assert.equal(applied.record.status, "draft");
      assert.equal(applied.record.number, null);
      assert.equal(applied.record.gross_total, "238.00");
      assert.equal((await applyAIProposal(owner, result.proposal.id)).record.id, applied.record.id);
    });

    await test("A Suite update is bound to a live version and the same search never returns stale cached facts", async () => {
      lookups = [lookup("customers", customer.number)];
      answer = reply("crm.customer.update", { phone: "0123456" }, customer);
      const draft = await chat("Telefon ändern");
      assert.equal(draft.proposal?.commands[0].baseVersion, customer.version);
      await command("crm.customer.update", { city: "Neuburg" }, customer);
      await assert.rejects(() => applyAIProposal(owner, draft.proposal.id), (error: any) => error.code === "VERSION_CONFLICT");
      answer = {};
      const before = requests;
      await chat("Telefon ändern");
      assert.equal(requests, before + 2);
      answer = reply("crm.customer.update", { phone: "0123456" }, { id: randomUUID(), version: 1 });
      await assert.rejects(() => chat("Manipulierter Zielbezug"), (error: any) => error.code === "AI_RECORD_SCOPE");
    });

    await test("Dispo can be drafted from another screen with Berlin times and the real collision checks", async () => {
      lookups = [lookup("team", worker.id), lookup("orders", order.number)];
      answer = reply("workforce.dispatch.create", { title: tag + " Montage", employee_id: worker.id, order_id: order.id,
        starts_at: "2031-07-10T08:00", ends_at: "2031-07-10T10:00" });
      const proposed = await chat("Montage planen");
      assert.equal(proposed.proposal?.commands[0].input.starts_at, "2031-07-10T06:00:00.000Z");
      const applied = await applyAIProposal(owner, proposed.proposal.id);
      assert.equal(applied.record.status, "draft");
      assert.equal(applied.records[0].module, "dispatch");
      const conflict = await chat("Überschneidung");
      await assert.rejects(() => applyAIProposal(owner, conflict.proposal.id), (error: any) => error.code === "DISPATCH_CONFLICT");
      const available = await createAssistantReadTools(owner, suiteContext).execute("find_suite_records",
        { ...lookup("team", worker.id), from: "2031-07-10", to: "2031-07-10" }) as any;
      assert.equal(available.items[0].no_registered_conflict, false);
    });

    await test("A remote plan preview and edit bind the exact saved variant and reject a stale preview", async () => {
      lookups = [lookup("studio", plan.project.name)];
      answer = reply("planning.design.change", { base_revision_id: savedPlan.revision.id, operations: [{
        type: "rename_element", elementId: savedPlan.revision.snapshot.elements.find((element: any) => element.kind === "stone_piece").id, label: "Neuer Musterstein",
      }] }, savedPlan.variant);
      const result = await chat("Anderen Plan ändern");
      const preview = await assistantProposalPlan(owner, result.proposal.id);
      assert.equal(preview.id, savedPlan.revision.id);
      await assert.rejects(() => assistantProposalPlan(actor("Planner"), result.proposal.id));
      const applied = await applyAIProposal(owner, result.proposal.id);
      assert(applied.revision.snapshot.elements.some((element: any) => element.label === "Neuer Musterstein"));
      await assert.rejects(() => assistantProposalPlan(owner, result.proposal.id));
      await assert.rejects(() => chat("Alten Stand manipulieren"), (error: any) => error.code === "AI_STALE_TARGET");
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
  }
}
