import assert from "node:assert/strict";
import { claudeFetch, claudeMessage, claudeError, jsonResponse, toolUse, instructionsOf } from "./lib/claude-transport.js";
import { randomUUID, createHash } from "node:crypto";
import type { ActorContext } from "@schubert/contracts";
import { withTenant, one, rows } from "@schubert/db";
import { assistant } from "@schubert/ai";
import { integrationConfiguration } from "@schubert/adapters";
import { compactContext, routeModel } from "../packages/ai/src/model-routing.js";
import { skillRegistryVersion } from "../packages/ai/src/skills.js";
import {
  assistantInputSchema,
  prepareAssistantContext,
} from "../packages/application/src/assistant-context.js";
import { normalizeUsage, usageCost } from "../packages/ai/src/usage.js";

/** Real SDK + real PostgreSQL; provider transport alone is synthetic and offline. */
export async function aiSkillsIntegration(
  actor: (role: string) => ActorContext,
  test: (name: string, run: () => Promise<void>) => Promise<void>,
) {
  const owner = actor("Owner"),
    nativeFetch = globalThis.fetch,
    priorKey = process.env.ANTHROPIC_API_KEY;
  const providerPrefix =
    "msg_schubert_skills_" + randomUUID().replaceAll("-", "") + "_";
  const testRunScope =
    "a.actor_id=$1 AND a.legal_entity_id=$3 AND EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(a.usage_details->'provider_calls','[]'::jsonb)) AS calls(item) WHERE left(item->>'id',length($2::text))=$2)";
  const testRunParameters = [
    owner.actorId,
    providerPrefix,
    owner.legalEntityId,
  ];
  let requests: any[] = [],
    mode = "load";
  const output = {
    text: "Bitte die vereinbarte Oberfläche nennen.",
    targetId: null,
    baseVersion: null,
    commands: [],
    missingInputs: ["Welche Oberfläche wurde vereinbart?"],
    assumptions: [],
  };
  // Synthetic transport only: the official endpoint is asserted and never contacted.
  const syntheticFetch: typeof fetch = claudeFetch((body) => {
    requests.push(body);
    if (requests.length === 2 && mode === "reject") return claudeError(429, "rate_limit_error");
    if (requests.length === 2 && mode === "timeout")
      throw new Error("Synthetic provider outcome unknown");
    const load = requests.length === 1 && mode !== "direct";
    const content = load
      ? [toolUse("load_schubert_skills", { skill_ids: [mode === "wrong" ? "schubert-room-de" : "schubert-office-drafts-de"] })]
      : [{ type: "text", text: mode === "missing-usage-invalid" ? "invalid-json" : JSON.stringify(output) }];
    const message: any = claudeMessage({ id: providerPrefix + randomUUID(), model: body.model, content });
    if (mode === "missing-usage-invalid" && !load) delete message.usage;
    return jsonResponse(message);
  });
  const prepared = await prepareAssistantContext(
    owner,
    assistantInputSchema.parse({
      message: "TEST Fachhilfe Formular",
      context: {
        path: "quotes",
        editor: {
          module: "quotes",
          values: { title: "TEST Fachhilfe", notes: "Oberfläche noch offen" },
          lines: [],
          total_line_count: 0,
        },
      },
    }),
    "http://localhost",
  );
  const latest = () =>
    withTenant(owner, (db) =>
      one<any>(
        db,
        "SELECT * FROM ai_runs a WHERE " +
          testRunScope +
          " ORDER BY created_at DESC,id DESC LIMIT 1",
        testRunParameters,
      ),
    );
  const reservation = (id: string) =>
    withTenant(owner, (db) =>
      one<any>(db, "SELECT * FROM ai_budget_reservations WHERE run_id=$1", [
        id,
      ]),
    );
  const reset = (next: string) => {
    mode = next;
    requests = [];
  };
  try {
    globalThis.fetch = syntheticFetch;
    process.env.ANTHROPIC_API_KEY = "synthetic-offline-skills-transport";
    await test("A previous response contract cannot shadow a new request; current answers still reuse their cache", async () => {
      reset("direct");
      const message = "TEST SKILLS legacy contract " + randomUUID();
      const config = await integrationConfiguration(owner, "anthropic");
      const context = compactContext(prepared.context);
      const profile = routeModel(config, "standard", context);
      const legacyInput = {message,context,references:[],promptVersion:profile.promptVersion,skillRegistryVersion,connectionVersionId:config.connectionVersionId??null};
      const legacyHash = createHash("sha256").update(JSON.stringify({capability:"assistant_reasoning",model:profile.model,input:legacyInput})).digest("hex");
      await withTenant(owner,db=>db.query("INSERT INTO ai_runs(tenant_id,legal_entity_id,actor_id,capability,model_id,request_hash,status,result,cost_actual) VALUES($1,$2,$3,'assistant_reasoning',$4,$5,'completed',$6,'0')",[owner.tenantId,owner.legalEntityId,owner.actorId,profile.model,legacyHash,JSON.stringify({text:"LEGACY RESPONSE",proposal:null})]));
      const fresh = await assistant(owner,message,prepared.context);
      assert.equal(requests.length,1);
      assert.notEqual(fresh.text,"LEGACY RESPONSE");
      assert.notEqual((await latest()).request_hash,legacyHash);
      const cached = await assistant(owner,message,prepared.context);
      assert.equal(cached.cached,true);
      assert.equal(requests.length,1);
    });
    await test("Skill load uses the real Anthropic SDK, the unchanged cached prefix and summed PostgreSQL billing", async () => {
      reset("load");
      const message = "TEST SKILLS " + randomUUID(),
        result = await assistant(owner, message, prepared.context),
        run = await latest();
      assert.equal(requests.length, 2);
      assert.deepEqual(requests[0].tool_choice, { type: "auto", disable_parallel_tool_use: true });
      assert.deepEqual(requests[1].tool_choice, { type: "none" });
      assert.deepEqual(requests[1].messages[0], requests[0].messages[0]);
      assert.deepEqual(requests[1].system, requests[0].system);
      assert(!instructionsOf(requests[0]).includes("# Büro & Entwürfe"));
      assert(instructionsOf(requests[1]).includes("# Büro & Entwürfe"));
      assert.deepEqual(
        result.skillsUsed.map((skill: any) => skill.id),
        ["schubert-office-drafts-de"],
      );
      assert.equal(result.proposal, null);
      assert.equal(run.input_tokens, 2000);
      assert.equal(run.output_tokens, 200);
      assert.equal(run.usage_details.provider_calls.length, 2);
      assert.equal(run.usage_details.attempted_calls, 2);
      assert.equal(run.usage_details.loaded_skills[0].jurisdiction, "DE");
      assert.equal(
        Number(run.cost_actual),
        Number(
          Number(
            usageCost(
              normalizeUsage({ input_tokens: 2000, output_tokens: 200 }),
              run.pricing_snapshot,
            ),
          ).toFixed(6),
        ),
      );
      assert.equal((await reservation(run.id)).settled, true);
      const cached = await assistant(owner, message, prepared.context);
      assert.equal(cached.cached, true);
      assert.equal(cached.actualCost, "0");
      assert.deepEqual(cached.skillsUsed, result.skillsUsed);
      assert.equal(requests.length, 2);
    });
    await test("A direct answer can skip the available skill and releases unused two-call budget", async () => {
      reset("direct");
      const result = await assistant(
          owner,
          "TEST SKILLS direct " + randomUUID(),
          prepared.context,
        ),
        run = await latest();
      assert.equal(requests.length, 1);
      assert.deepEqual(result.skillsUsed, []);
      assert.equal(run.input_tokens, 1000);
      assert.equal(run.usage_details.attempted_calls, 1);
      assert.equal((await reservation(run.id)).settled, true);
      assert(Number(run.cost_actual) < Number(run.cost_reserved));
    });
    await test("Unavailable studio skill fails before a second call and the completed selection remains billed", async () => {
      reset("wrong");
      await assert.rejects(
        () =>
          assistant(
            owner,
            "TEST SKILLS scope " + randomUUID(),
            prepared.context,
          ),
        (error: any) => error.code === "AI_SKILL_SCOPE",
      );
      const run = await latest();
      assert.equal(requests.length, 1);
      assert.equal(run.status, "invalid_response");
      assert.equal(run.usage_details.loaded_skills.length, 0);
      assert(Number(run.cost_actual) > 0);
      assert.equal((await reservation(run.id)).settled, true);
    });
    await test("A rejected follow-up charges the completed call instead of releasing its whole reservation as free", async () => {
      reset("reject");
      await assert.rejects(
        () =>
          assistant(
            owner,
            "TEST SKILLS rejection " + randomUUID(),
            prepared.context,
          ),
        (error: any) => error.code === "AI_PROVIDER_LIMIT",
      );
      const run = await latest();
      assert.equal(requests.length, 2);
      assert.equal(run.status, "failed");
      assert.equal(run.input_tokens, 1000);
      assert.equal(run.usage_details.attempted_calls, 2);
      assert.equal(run.usage_details.provider_calls.length, 1);
      assert(Number(run.cost_actual) > 0);
      assert.equal((await reservation(run.id)).settled, true);
    });
    await test("An unknown follow-up keeps its reservation and blocks a duplicate paid request", async () => {
      reset("timeout");
      const message = "TEST SKILLS timeout " + randomUUID();
      await assert.rejects(
        () => assistant(owner, message, prepared.context),
        (error: any) => error.code === "AI_OUTCOME_UNKNOWN",
      );
      const run = await latest();
      assert.equal(requests.length, 2);
      assert.equal(run.status, "outcome_unknown");
      assert.equal(run.cost_actual, null);
      assert.equal(run.usage_details.provider_calls.length, 1);
      assert.equal(run.usage_details.attempted_calls, 2);
      assert.equal((await reservation(run.id)).settled, false);
      await assert.rejects(
        () => assistant(owner, message, prepared.context),
        (error: any) => error.code === "AI_DUPLICATE_PENDING",
      );
      assert.equal(requests.length, 2);
    });
    await test("Missing usage remains reserved even after invalid output and blocks a duplicate paid request", async () => {
      reset("missing-usage-invalid");
      const message = "TEST SKILLS missing usage " + randomUUID();
      await assert.rejects(
        () => assistant(owner, message, prepared.context),
        (error: any) => error.code === "AI_RESPONSE_INVALID",
      );
      const run = await latest();
      assert.equal(requests.length, 2);
      assert.equal(run.status, "invalid_response");
      assert.equal(run.cost_actual, null);
      assert.equal((await reservation(run.id)).settled, false);
      await assert.rejects(
        () => assistant(owner, message, prepared.context),
        (error: any) => error.code === "AI_DUPLICATE_PENDING",
      );
      assert.equal(requests.length, 2);
    });
  } finally {
    globalThis.fetch = nativeFetch;
    if (priorKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = priorKey;
    // Keep every synthetic evidence row, but undo only this transport test's
    // simulated spend/holds. There were no provider requests or real charges.
    await withTenant(owner, async (db) => {
      const runs = await rows<any>(
        db,
        "SELECT a.*,r.id reservation_id,r.amount,r.settled,r.budget_id FROM ai_runs a JOIN ai_budget_reservations r ON r.run_id=a.id WHERE " +
          testRunScope +
          " FOR UPDATE OF a,r",
        testRunParameters,
      );
      for (const run of runs) {
        await db.query(
          "UPDATE ai_budgets SET spent=spent-$1::numeric,reserved=reserved-$2::numeric WHERE id=$3",
          [
            run.settled ? (run.cost_actual ?? "0") : "0",
            run.settled ? "0" : run.amount,
            run.budget_id,
          ],
        );
        await db.query(
          "UPDATE ai_budget_reservations SET settled=true,status='settled' WHERE id=$1",
          [run.reservation_id],
        );
        await db.query(
          "UPDATE ai_runs SET status=CASE WHEN status='outcome_unknown' THEN 'failed' ELSE status END,task_type='skill_transport_test',usage_details=usage_details||$2::jsonb WHERE id=$1",
          [
            run.id,
            JSON.stringify({
              synthetic_transport: true,
              asserted_status: run.status,
              no_provider_charge: true,
            }),
          ],
        );
      }
    });
  }
}
