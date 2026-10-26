import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { ActorContext } from "@schubert/contracts";
import { assistantActionCatalog } from "@schubert/contracts";
import {
  executeCommand,
  applyAIProposal,
  baseData,
  loadPage,
  invalidateReads,
} from "@schubert/application";
import { withTenant, insert, one, rows, update } from "@schubert/db";
import { assistant } from "@schubert/ai";
import {
  assistantInputSchema,
  prepareAssistantContext,
} from "../packages/application/src/assistant-context.js";
import { normalizePlanningEdits } from "../packages/ai/src/planning-edits.js";
import { planningDraftOperations } from "../packages/ai/src/planning-draft.js";

export async function assistantFullEditIntegration(
  actor: (role: string) => ActorContext,
  test: (name: string, run: () => Promise<void>) => Promise<void>,
) {
  const owner = actor("Owner"),
    call = (name: string, payload: any = {}, record?: any) =>
      executeCommand(owner, {
        name,
        id: record?.id,
        expectedVersion: record?.version,
        idempotencyKey: randomUUID(),
        payload,
      });
  const catalog = assistantActionCatalog(
    owner.permissions,
    undefined,
    owner.role,
  );
  async function proposal(
    commands: any[],
    validation: any = {},
    evidence: any[] = [],
    ctx = owner,
  ) {
    return withTenant(ctx, (db) =>
      insert(db, "ai_proposals", {
        ...baseData(ctx),
        actor_id: ctx.actorId,
        entity_type: "orders",
        action_type: "draft_changes",
        commands,
        validation: { actionCatalog: catalog, ...validation },
        evidence,
        missing_inputs: [],
        expires_at: new Date(Date.now() + 600000),
        status: "proposed",
      }),
    );
  }
  async function source() {
    return withTenant(owner, async (db) => {
      const content_hash = "a".repeat(64),
        preview_hash = "b".repeat(64),
        base = baseData(owner);
      const blob = await insert(db, "blob_objects", {
          ...base,
          storage_key: "TEST/ai-paper-" + randomUUID(),
          provider: "vercel_blob",
          content_hash,
          mime_type: "image/png",
          size_bytes: 100,
          scan_status: "clean",
          status: "available",
        }),
        doc = await insert(db, "documents", {
          ...base,
          name: "TEST Papierzeichnung",
          original_name: "papierzeichnung.png",
          mime_type: "image/png",
          size_bytes: 100,
          content_hash,
          status: "available",
        }),
        version = await insert(db, "document_versions", {
          ...base,
          document_id: doc.id,
          blob_object_id: blob.id,
          content_hash,
          revision: 1,
          status: "available",
        });
      await update(db, "documents", doc.id, { current_version_id: version.id });
      const pblob = await insert(db, "blob_objects", {
          ...base,
          storage_key: "TEST/ai-preview-" + randomUUID(),
          provider: "vercel_blob",
          content_hash: preview_hash,
          mime_type: "image/png",
          size_bytes: 90,
          scan_status: "trusted_generator",
          status: "available",
        }),
        pdoc = await insert(db, "documents", {
          ...base,
          name: "TEST Lesbare Bildseite",
          original_name: "preview.png",
          mime_type: "image/png",
          size_bytes: 90,
          content_hash: preview_hash,
          status: "available",
        }),
        pversion = await insert(db, "document_versions", {
          ...base,
          document_id: pdoc.id,
          blob_object_id: pblob.id,
          content_hash: preview_hash,
          revision: 1,
          status: "available",
        });
      const previewJob = await insert(db, "job_runs", {
        ...base,
        name: "TEST completed chat preview metadata",
        job_type: "document.preview",
        payload: {
          documentId: doc.id,
          documentVersionId: version.id,
          sourceHash: content_hash,
          pageIndex: 0,
          aiPreview: true,
          aiReading: true,
        },
        result: {
          previewHash: preview_hash,
          width: 1440,
          height: 900,
          previewDocumentVersionId: pversion.id,
        },
        status: "completed",
      });
      await update(db, "documents", pdoc.id, {
        current_version_id: pversion.id,
        source_job_id: previewJob.id,
      });
      return {
        doc,
        blob,
        version,
        context: {
          documentId: doc.id,
          documentVersionId: version.id,
          sourceHash: content_hash,
          pageIndex: 0,
          name: doc.name,
          imagePreview: {
            documentId: pdoc.id,
            documentVersionId: pversion.id,
            hash: preview_hash,
            width: 1440,
            height: 900,
          },
        },
        evidence: { documentVersionId: version.id, sourceHash: content_hash },
      };
    });
  }
  let customer: any, order: any;
  await test("AI business drafts atomically create a linked customer and order, preserve the original source, and retry once", async () => {
    const original = await source(),
      saved = await proposal(
        [
          {
            name: "crm.customer.create",
            input: {
              name: "TEST KI Papierkunde " + randomUUID(),
              party_type: "person",
            },
          },
          {
            name: "sales.order.create",
            input: {
              title: "TEST Auftrag aus Papierzeichnung",
              customer_id: "$created:0",
              currency: "EUR",
              business_unit: "memorial",
              description: "Grabmal nach beigefügter Zeichnung",
            },
          },
        ],
        {},
        [original.evidence],
      );
    const result = await applyAIProposal(owner, saved.id),
      again = await applyAIProposal(owner, saved.id);
    assert.equal(result.record.id, again.record.id);
    [customer, order] = result.records.map((item: any) => item.record);
    assert.equal(order.customer_id, customer.id);
    assert.equal(order.status, "draft");
    assert.equal(result.href, "/orders/" + order.id);
    const links = await withTenant(owner, (db) =>
      rows<any>(db, "SELECT * FROM document_links WHERE document_id=$1", [
        original.doc.id,
      ]),
    );
    assert.equal(links.length, 2);
    assert(links.every((link) => link.purpose === "ai_source"));
    const originalDoc = await withTenant(owner, (db) =>
      one<any>(db, "SELECT * FROM documents WHERE id=$1", [original.doc.id]),
    );
    assert.equal(originalDoc.content_hash, original.doc.content_hash);
    assert.equal(originalDoc.entity_id, null);
    invalidateReads(owner);
    const page = await loadPage(
      owner,
      "orders/" + order.id,
      new URL("http://localhost/orders/" + order.id),
    );
    assert(
      page.related.documents.some((doc: any) => doc.id === original.doc.id),
    );
    const audit = await withTenant(owner, (db) =>
      rows<any>(
        db,
        "SELECT action FROM audit_events WHERE aggregate_id=ANY($1::uuid[])",
        [result.records.map((item: any) => item.record.id)],
      ),
    );
    assert(audit.some((row) => row.action === "crm.customer.create"));
    assert(audit.some((row) => row.action === "sales.order.create"));
  });
  await test("AI source withdrawal or unauthorized child commands roll the entire multi-record draft back", async () => {
    const original = await source();
    await withTenant(owner, (db) =>
      update(db, "blob_objects", original.blob.id, {
        scan_status: "quarantine",
      }),
    );
    const name = "TEST rollback " + randomUUID(),
      saved = await proposal(
        [
          { name: "crm.customer.create", input: { name } },
          {
            name: "sales.order.create",
            input: {
              customer_id: "$created:0",
              title: "TEST nicht anlegen",
              currency: "EUR",
            },
          },
        ],
        {},
        [original.evidence],
      );
    await assert.rejects(
      () => applyAIProposal(owner, saved.id),
      (error: any) => error.code === "AI_SOURCE_CHANGED",
    );
    assert.equal(
      await withTenant(owner, (db) =>
        one(db, "SELECT id FROM parties WHERE name=$1", [name]),
      ),
      null,
    );
    const employee = actor("Employee"),
      forbidden = await proposal(
        [
          {
            name: "sales.order.create",
            input: {
              customer_id: customer.id,
              title: "TEST keine Rolleneskalation",
              currency: "EUR",
            },
          },
        ],
        {},
        [],
        employee,
      );
    await assert.rejects(
      () => applyAIProposal(employee, forbidden.id),
      (error: any) => error.code === "FORBIDDEN",
    );
  });
  await test("AI updates use the actual visible business record version and retain later edits", async () => {
    const context = await prepareAssistantContext(
      owner,
      assistantInputSchema.parse({
        message: "Notiz im Auftrag ergänzen.",
        context: { path: "orders/" + order.id },
      }),
      "http://localhost",
    );
    const action = context.context.actionCatalog.find(
      (a: any) => a.name === "sales.order.update",
    );
    assert.equal(action.targetId, order.id);
    const saved = await proposal(
      [
        {
          name: action.name,
          targetId: action.targetId,
          baseVersion: action.baseVersion,
          input: { notes: "TEST Änderung per KI" },
        },
      ],
      { actionCatalog: context.context.actionCatalog },
    );
    const changed = await applyAIProposal(owner, saved.id);
    assert.equal(changed.record.notes, "TEST Änderung per KI");
    const stale = await proposal(
      [
        {
          name: action.name,
          targetId: action.targetId,
          baseVersion: action.baseVersion,
          input: { notes: "TEST alte Antwort" },
        },
      ],
      { actionCatalog: context.context.actionCatalog },
    );
    await assert.rejects(
      () => applyAIProposal(owner, stale.id),
      (error: any) => error.code === "VERSION_CONFLICT",
    );
  });
  await test("A sketch can create a new room plan from the studio overview and keeps its checked unscaled reference", async () => {
    const context = await prepareAssistantContext(
      owner,
      assistantInputSchema.parse({
        message: "Bad aus Skizze anlegen.",
        context: { path: "studio" },
      }),
      "http://localhost",
    );
    assert(context.context.allowedCommands.includes("planning.project.create"));
    assert.equal(context.context.snapshot, undefined);
    const original = await source(),
      saved = await proposal(
        [
          {
            name: "planning.project.create",
            input: {
              kind: "room_plan",
              name: "TEST Bad aus Papier",
              order_id: order.id,
              initial_plan: {
                draft: {
                  kind: "rectangular_room",
                  label: "Bad",
                  clearWidthMm: "4000",
                  clearDepthMm: "3000",
                  heightMm: "2600",
                  wallThicknessMm: "200",
                },
              },
            },
          },
        ],
        { sources: [original.context] },
        [original.evidence],
      );
    const result = await applyAIProposal(owner, saved.id);
    assert.equal(result.module, "studio");
    assert.equal(result.record.order_id, order.id);
    assert(
      result.revision.snapshot.elements.some(
        (element: any) => element.kind === "room",
      ),
    );
    assert(
      result.revision.snapshot.elements.some(
        (element: any) =>
          element.kind === "plan_reference" &&
          element.sourceDocumentVersionId === original.version.id &&
          element.calibration.segments.length === 0,
      ),
    );
    assert(
      Object.values(result.revision.snapshot.measurements).every(
        (measure: any) =>
          measure.origin === "ai" && measure.reviewStatus === "unreviewed",
      ),
    );
  });
  await test("An existing inscription can be replaced and another added; restoring creates a new draft and rejects stale undo", async () => {
    const plan = await call("planning.project.create", {
        name: "TEST Vollständige KI-Bearbeitung",
        kind: "memorial",
      }),
      draft = planningDraftOperations(
        { snapshot: plan.revision.snapshot },
        {
          kind: "memorial_slab",
          label: "Stein",
          widthMm: "800",
          heightMm: "1200",
          thicknessMm: "160",
        },
      );
    let ready = await call(
      "planning.design.change",
      { base_revision_id: plan.revision.id, operations: draft },
      plan.variant,
    );
    const added = normalizePlanningEdits(
      { snapshot: ready.revision.snapshot },
      [{ type: "add_inscription", exactText: "dwadwadwadwa" }],
    );
    ready = await call(
      "planning.design.change",
      { base_revision_id: ready.revision.id, operations: added },
      ready.variant,
    );
    const text = ready.revision.snapshot.elements.find(
      (element: any) => element.kind === "inscription",
    );
    const operations = normalizePlanningEdits(
      { snapshot: ready.revision.snapshot },
      [
        {
          type: "set_inscription_text",
          elementId: text.id,
          exactText: "Anna Müller\n* 1948 † 2025",
        },
        { type: "add_inscription", exactText: "Karl Müller\n* 1945 † 2026" },
      ],
    );
    const saved = await proposal(
      [
        {
          name: "planning.design.change",
          targetId: ready.variant.id,
          baseVersion: ready.variant.version,
          input: { base_revision_id: ready.revision.id, operations },
        },
      ],
      {
        planningTarget: {
          variantId: ready.variant.id,
          baseVersion: ready.variant.version,
          revisionId: ready.revision.id,
        },
      },
    );
    const changed = await applyAIProposal(owner, saved.id);
    assert.equal(
      changed.revision.snapshot.elements.filter(
        (e: any) => e.kind === "inscription",
      ).length,
      2,
    );
    assert(
      changed.revision.snapshot.elements.some(
        (e: any) => e.exactText === "Anna Müller\n* 1948 † 2025",
      ),
    );
    const restored = await call(
      "planning.design.restore_previous",
      {
        base_revision_id: changed.revision.id,
        source_revision_id: ready.revision.id,
      },
      changed.variant,
    );
    assert.notEqual(restored.revision.id, ready.revision.id);
    assert.deepEqual(
      restored.revision.snapshot.elements,
      ready.revision.snapshot.elements,
    );
    const historical = await withTenant(owner, (db) =>
      one<any>(db, "SELECT snapshot FROM design_revisions WHERE id=$1", [
        ready.revision.id,
      ]),
    );
    assert.deepEqual(historical.snapshot, ready.revision.snapshot);
    await assert.rejects(
      () =>
        call(
          "planning.design.restore_previous",
          {
            base_revision_id: changed.revision.id,
            source_revision_id: ready.revision.id,
          },
          changed.variant,
        ),
      (error: any) =>
        error.code === "VERSION_CONFLICT" || error.code === "REVISION_CONFLICT",
    );
  });
  await test("A plan change and an office task use one authorized transaction and retain the returned plan revision", async () => {
    const plan = await call("planning.project.create", {
      name: "TEST gemeinsamer Plan und Aufgabe",
      kind: "memorial",
    });
    const operations = normalizePlanningEdits(
      { snapshot: plan.revision.snapshot },
      [
        {
          type: "add_element",
          element: { kind: "technical_note", text: "Kundenwunsch prüfen" },
        },
      ],
    );
    const saved = await proposal(
      [
        {
          name: "planning.design.change",
          targetId: plan.variant.id,
          baseVersion: plan.variant.version,
          input: { base_revision_id: plan.revision.id, operations },
        },
        {
          name: "communication.task.create",
          input: { title: "TEST Kundenwunsch nachfassen", order_id: order.id },
        },
      ],
      {
        planningTarget: {
          variantId: plan.variant.id,
          revisionId: plan.revision.id,
          baseVersion: plan.variant.version,
        },
      },
    );
    const result = await applyAIProposal(owner, saved.id);
    assert.equal(result.module, "tasks");
    assert.equal(result.variant.id, plan.variant.id);
    assert(
      result.revision.snapshot.elements.some(
        (element: any) => element.text === "Kundenwunsch prüfen",
      ),
    );
    assert.equal(result.records.length, 2);
  });
  await test("Revoking a business role prevents replaying an already applied composite AI receipt", async () => {
    const admin = actor("SuperAdmin"),
      user = await executeCommand(admin, {
        name: "administration.user.create",
        idempotencyKey: randomUUID(),
        payload: {
          name: "TEST KI Rollenwechsel " + randomUUID(),
          email: "ai-role-" + randomUUID() + "@example.invalid",
          password: "Synthetic!" + randomUUID(),
          role: "Owner",
        },
      });
    const temporary = { ...owner, actorId: user.user_id, employeeId: null },
      member = await withTenant(admin, (db) =>
        one<any>(db, "SELECT * FROM memberships WHERE user_id=$1", [
          user.user_id,
        ]),
      );
    const saved = await proposal(
      [
        {
          name: "crm.customer.create",
          input: { name: "TEST berechtigter Entwurf " + randomUUID() },
        },
      ],
      {},
      [],
      temporary,
    );
    await applyAIProposal(temporary, saved.id);
    try {
      await withTenant(admin, (db) =>
        update(db, "memberships", member.id, {
          role: "Employee",
          permissions: [],
          permission_version: member.permission_version + 1,
        }),
      );
      await assert.rejects(
        () => applyAIProposal(temporary, saved.id),
        (error: any) => error.code === "FORBIDDEN",
      );
    } finally {
      await withTenant(admin, (db) =>
        update(db, "memberships", member.id, {
          role: member.role,
          permissions: member.permissions,
          permission_version: member.permission_version + 2,
        }),
      );
    }
  });
  await test("Real OpenAI SDK accepts high-detail paper imagery and normalizes customer/order commands with server action scope", async () => {
    const nativeFetch = globalThis.fetch,
      priorKey = process.env.OPENAI_API_KEY,
      requests: any[] = [];
    const context = await prepareAssistantContext(
      owner,
      assistantInputSchema.parse({
        message: "Aus dieser Zeichnung einen Auftrag anlegen.",
        context: { path: "customers/" + customer.id },
      }),
      "http://localhost",
    );
    const output = {
      text: "Auftragsentwurf aus der Zeichnung vorbereitet.",
      targetId: null,
      baseVersion: null,
      commands: [
        {
          name: "sales.order.create",
          targetId: null,
          baseVersion: null,
          inputJson: JSON.stringify({
            title: "TEST SDK Auftrag aus Zeichnung",
            customer_id: customer.id,
            business_unit: "memorial",
            description:
              "800 × 1200 mm gemäß lesbarer Zeichnung; Preise offen.",
          }),
        },
      ],
      missingInputs: [],
      assumptions: [],
      clarifications: [],
      visualization: null,
    };
    try {
      process.env.OPENAI_API_KEY = "synthetic-offline-full-edit";
      globalThis.fetch = async (input, init) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        assert.equal(new URL(url).origin, "https://api.openai.com");
        const body = JSON.parse(
          String(
            init?.body ?? (input instanceof Request ? await input.text() : ""),
          ),
        );
        requests.push(body);
        return new Response(
          JSON.stringify({
            id: "resp_full_edit_" + randomUUID(),
            object: "response",
            status: "completed",
            created_at: Math.floor(Date.now() / 1000),
            model: body.model,
            output: [
              {
                type: "message",
                id: "msg_" + randomUUID(),
                status: "completed",
                role: "assistant",
                content: [
                  {
                    type: "output_text",
                    text: JSON.stringify(output),
                    annotations: [],
                  },
                ],
              },
            ],
            usage: {
              input_tokens: 1100,
              output_tokens: 250,
              total_tokens: 1350,
              input_tokens_details: { cached_tokens: 0 },
              output_tokens_details: { reasoning_tokens: 0 },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      };
      const result = await assistant(
        owner,
        "TEST Bildauftrag " + randomUUID(),
        context.context,
        "standard",
        [
          {
            dataUrl: "data:image/png;base64,aGVsbG8=",
            documentId: randomUUID(),
            documentVersionId: randomUUID(),
            sourceHash: "a".repeat(64),
            previewHash: "b".repeat(64),
            pageIndex: 0,
            detail: "high",
          },
        ],
      );
      assert.equal(requests.length, 1);
      assert(JSON.stringify(requests[0].input).includes('"detail":"high"'));
      assert(requests[0].instructions.includes("actionCatalog"));
      assert.equal(result.proposal.commands[0].input.customer_id, customer.id);
      assert.equal(result.proposal.commands[0].input.currency, "EUR");
      const plan = await call("planning.project.create", {
        name: "TEST gemeinsamer Erstentwurf mit Inschriften",
        kind: "memorial",
      });
      const planContext = await prepareAssistantContext(
        owner,
        assistantInputSchema.parse({
          message: "Ersten Stein mit zwei Inschriften anlegen.",
          context: {
            path: "studio/" + plan.project.id,
            variantId: plan.variant.id,
          },
        }),
        "http://localhost",
      );
      output.commands = [
        {
          name: "planning.design.change",
          targetId: plan.variant.id,
          baseVersion: plan.variant.version,
          inputJson: JSON.stringify({
            base_revision_id: plan.revision.id,
            draft: {
              kind: "memorial_slab",
              label: "Stein",
              widthMm: "800",
              heightMm: "1200",
              thicknessMm: "160",
            },
            operations: [
              {
                type: "add_inscription",
                exactText: "Anna Müller\n* 1948 † 2025",
              },
            ],
          }),
        },
        {
          name: "planning.design.change",
          targetId: plan.variant.id,
          baseVersion: plan.variant.version,
          inputJson: JSON.stringify({
            base_revision_id: plan.revision.id,
            operations: [
              {
                type: "add_inscription",
                exactText: "Karl Müller\n* 1945 † 2026",
              },
            ],
          }),
        },
      ];
      const combined = await assistant(
        owner,
        "TEST gemeinsamer Stein und Text " + randomUUID(),
        planContext.context,
      );
      assert.equal(combined.proposal.commands.length, 1);
      const applied = await applyAIProposal(owner, combined.proposal.id);
      assert.equal(
        applied.revision.snapshot.elements.filter(
          (element: any) => element.kind === "inscription",
        ).length,
        2,
      );
      assert(
        applied.revision.snapshot.elements.some(
          (element: any) => element.exactText === "Anna Müller\n* 1948 † 2025",
        ),
      );
      output.commands = [
        {
          name: "communication.task.create",
          targetId: null,
          baseVersion: null,
          inputJson: JSON.stringify({
            title: "TEST Neue Aufgabe nach angewendetem Vorschlag",
          }),
        },
      ];
      const cacheMessage = "TEST kein veralteter Cache " + randomUUID(),
        first = await assistant(owner, cacheMessage, context.context);
      await applyAIProposal(owner, first.proposal.id);
      const count = requests.length,
        next = await assistant(owner, cacheMessage, context.context);
      assert.equal(requests.length, count + 1);
      assert(next.proposal?.id);
      assert.notEqual(next.proposal.id, first.proposal.id);
    } finally {
      globalThis.fetch = nativeFetch;
      if (priorKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = priorKey;
    }
  });
}
