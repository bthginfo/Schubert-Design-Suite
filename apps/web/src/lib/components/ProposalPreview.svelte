<script lang="ts">
  import { assistantRecordModule } from "@schubert/contracts";
  import PlanningProposalPreview from "./studio/PlanningProposalPreview.svelte";
  import InitialPlanPreview from "./studio/InitialPlanPreview.svelte";
  import type { AppData, Row } from "#lib/client/types.ts";
  import { label, display } from "#lib/client/api.ts";
  let { proposal, data }: { proposal: Row; data: AppData } = $props();
  const commands = $derived(
    proposal.proposedCommands ?? proposal.commands ?? [],
  );
  function input(command: Row) {
    return command.payload ?? command.input?.payload ?? command.input ?? {};
  }
  function name(command: Row) {
    const module = assistantRecordModule(command.name);
    return module
      ? module.singular +
          (command.name.endsWith(".update")
            ? " bearbeiten"
            : " als Entwurf anlegen")
      : ((
          {
            "communication.email.create": "E-Mail als Entwurf vorbereiten",
            "planning.project.create": "Neue Planung anlegen",
            "planning.design.change": "Planung ändern",
          } as Record<string, string>
        )[command.name] ?? "Entwurf vorbereiten");
  }
  function fieldName(command: Row, key: string) {
    return (
      assistantRecordModule(command.name)?.fields.find(
        (field) => field.key === key,
      )?.label ??
      (
        {
          recipient: "Empfänger",
          subject: "Betreff",
          body: "Nachricht",
          kind: "Planungsstudio",
          order_id: "Auftrag",
          site_id: "Objekt",
          grave_plot_id: "Grabstätte",
        } as Record<string, string>
      )[key] ??
      label(key)
    );
  }
  function shown(value: unknown, key: string) {
    if (typeof value === "string" && value.startsWith("$created:")) {
      const index = Number(value.slice(9).split(".")[0]),
        command = commands[index];
      return command
        ? `${input(command).name ?? input(command).title ?? "Neuer Entwurf"} · aus Schritt ${index + 1}`
        : "Neuer Entwurf aus diesem Vorschlag";
    }
    return display(value, key, data);
  }
</script>

<div class="proposal-preview">
  {#each commands as item, index}<section>
      <h4>{index + 1}. {name(item)}</h4>
      {#if item.baseVersion ?? proposal.base_version}<p class="field-help">
          Gilt für Version {item.baseVersion ?? proposal.base_version}
        </p>{/if}
      {#if item.name === "planning.design.change"}<PlanningProposalPreview
          {data}
          operations={input(item).operations ?? []}
          revisionId={input(item).base_revision_id}
        />{:else}<dl>
          {#each Object.entries(input(item)).filter(([key]) => !["initial_plan", "operations", "lines", "idempotencyKey", "expectedVersion", "ai_proposal_id"].includes(key)) as [key, value]}<div
            >
              <dt>{fieldName(item, key)}</dt>
              <dd>{shown(value, key)}</dd>
            </div>{/each}
        </dl>{/if}
      {#if item.name === "planning.project.create"}{@const initial =
          proposal.validation?.initialPlanPreviews?.find(
            (preview: Row) => preview.commandIndex === index,
          )}{#if initial}<InitialPlanPreview
            snapshot={initial.snapshot}
          />{/if}{/if}
      {#if input(item).lines?.length}<div class="proposal-lines">
          {#each input(item).lines as line}<div>
              <strong>{line.description}</strong>
              <p>
                {display(line.quantity, "quantity")}
                {display(line.unit)} · {display(line.unit_price, "unit_price")} netto{line.optional
                  ? ` · Option ${line.selected ? "ausgewählt" : "nicht ausgewählt"}`
                  : ""}
              </p>
            </div>{/each}
        </div>{/if}
    </section>{/each}
</div>

<style>
  .proposal-preview {
    white-space: normal;
  }
  .proposal-preview section {
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px solid var(--line);
  }
  h4 {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.6;
    margin-bottom: 9px;
  }
  dl {
    margin: 0;
    display: grid;
    gap: 13px;
  }
  dt {
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 3px;
  }
  dd {
    margin: 0;
    font-size: 14px;
    line-height: 1.7;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .proposal-lines > div {
    padding: 13px 0;
    border-top: 1px solid var(--line);
  }
  .proposal-lines p {
    margin-top: 4px;
    font-size: 12px;
  }
  .proposal-lines strong {
    font-size: 13px;
    font-weight: 500;
  }
</style>
