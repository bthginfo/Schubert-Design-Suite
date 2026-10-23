<script lang="ts">
  import type { AppData } from "#lib/client/types.ts";
  import { planningProposalReview } from "#lib/client/proposal-review.ts";
  let {
    data,
    operations,
    revisionId,
  }: { data: AppData; operations: unknown[]; revisionId: string } = $props();
  const preview = $derived(
    planningProposalReview(data, {
      commands: [
        {
          name: "planning.design.change",
          input: { operations, base_revision_id: revisionId },
        },
      ],
    }),
  );
  const changes = $derived(
    preview && !preview.error ? (preview.changes ?? []) : [],
  );
  const visible = $derived(
    changes.filter(
      (c) =>
        !preview?.before?.elements.some(
          (e) => e.id === c.id && ["node", "dimension"].includes(e.kind),
        ) &&
        !preview?.after?.elements.some(
          (e) => e.id === c.id && ["node", "dimension"].includes(e.kind),
        ),
    ),
  );
  const extra = $derived(changes.length - visible.length);
  function path(shape: any) {
    return (
      shape.points
        .map(
          (p: any, i: number) => `${i ? "L" : "M"}${p.xMm} ${-Number(p.yMm)}`,
        )
        .join(" ") +
      (shape.closed ? " Z" : "") +
      " " +
      (shape.holes ?? [])
        .map(
          (ring: any[]) =>
            ring
              .map(
                (p: any, i: number) =>
                  `${i ? "L" : "M"}${p.xMm} ${-Number(p.yMm)}`,
              )
              .join(" ") + " Z",
        )
        .join(" ")
    );
  }
</script>

<section class="planning-proposal" aria-label="Auswirkungen des KI-Vorschlags">
  <h4>Diese Änderungen werden übernommen</h4>
  {#if !preview || preview.error}<p class="field-help" role="status">
      {preview?.error ?? "Keine Vorschau verfügbar."}
    </p>
  {:else}
    <div class="preview-pair">
      {#each [{ label: "Vorher", projection: preview.oldProjection }, { label: "Vorschlag", projection: preview.newProjection }] as item}<figure
        >
          <figcaption>{item.label}</figcaption>
          <svg
            viewBox={preview.box}
            role="img"
            aria-label={item.label +
              (preview.view === "top" ? " · Grundriss" : " · Vorderansicht")}
            >{#each item.projection?.shapes ?? [] as shape}<path
                d={path(shape)}
                fill-rule="evenodd"
                fill={shape.erase
                  ? "#f6f7f2"
                  : shape.closed
                    ? "#e1e7e1"
                    : "none"}
                stroke={shape.erase
                  ? "#f6f7f2"
                  : changes.some((c) => c.id === shape.elementId)
                    ? "#245aa0"
                    : "#607268"}
                stroke-width={preview.stroke}
                stroke-dasharray={shape.estimated
                  ? `${(preview.stroke ?? 1) * 4} ${(preview.stroke ?? 1) * 3}`
                  : undefined}
              />{/each}</svg
          >
        </figure>{/each}
    </div>
    <p class="preview-legend">
      Gleicher Ausschnitt · betroffene Geometrie blau. Entwurfsansicht; der
      genaue Wortlaut steht in der Änderungsliste.
    </p>
    <div class="preview-invariants">
      <span
        >{preview.wordingUnchanged
          ? "Vorhandener Wortlaut bleibt erhalten"
          : "Inschrift wird geändert – Zeichen prüfen"}</span
      ><span
        >{preview.measurementsUnchanged
          ? "Vorhandene Maßwerte bleiben erhalten"
          : "Maßwerte werden geändert"}</span
      >
    </div>
    <div class="change-list">
      {#each visible as change}<article>
          <h5>
            {change.label}<span
              >{change.kind === "added"
                ? "Neu"
                : change.kind === "removed"
                  ? "Entfernt"
                  : "Geändert"}</span
            >
          </h5>
          {#each change.fields as field}<div class="change-field">
              <strong>{field.label}</strong>
              <dl>
                <div>
                  <dt>Vorher</dt>
                  <dd>{field.before}</dd>
                </div>
                <div>
                  <dt>Vorschlag</dt>
                  <dd>{field.after}</dd>
                </div>
              </dl>
            </div>{/each}
        </article>{/each}
    </div>
    {#if extra}<details class="dependent-changes">
        <summary
          >{extra} technische Folgeänderung{extra === 1 ? "" : "en"} ansehen</summary
        >
        <ul>
          {#each changes.filter((c) => !visible.includes(c)) as c}<li>
              {c.label} · {c.kind === "added"
                ? "neu"
                : c.kind === "removed"
                  ? "entfernt"
                  : "angepasst"}
            </li>{/each}
        </ul>
      </details>{/if}
    <p class="field-help">
      Neue Maße bleiben ungeprüft. Stückliste und Flächen folgen dem
      übernommenen Planstand. Freigaben werden hier nicht erteilt.
    </p>
  {/if}
</section>

<style>
  .planning-proposal {
    margin: 16px 0;
    white-space: normal;
  }
  .planning-proposal h4 {
    font-size: 13px;
    margin: 0 0 12px;
    font-weight: 600;
  }
  .preview-pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  figure {
    margin: 0;
    min-width: 0;
  }
  figcaption {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .preview-pair svg {
    display: block;
    width: 100%;
    height: 160px;
    background: #f6f7f2;
    border: 1px solid var(--line);
    border-radius: 10px;
  }
  .preview-legend,
  .planning-proposal > .field-help {
    font-size: 11px;
    line-height: 1.65;
    color: var(--muted);
    margin: 10px 0;
  }
  .preview-invariants {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    background: var(--wash);
    border-radius: 10px;
    font-size: 12px;
    line-height: 1.6;
  }
  .change-list article {
    padding: 13px 0;
    border-bottom: 1px solid var(--line);
  }
  h5 {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: space-between;
    font-size: 13px;
    margin: 0 0 8px;
  }
  h5 span {
    font-size: 11px;
    color: var(--muted);
    font-weight: 400;
  }
  .change-field {
    margin-top: 10px;
  }
  .change-field > strong {
    font-size: 12px;
    font-weight: 500;
  }
  dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 6px 0;
  }
  dl > div {
    min-width: 0;
  }
  dt {
    font-size: 11px;
    color: var(--muted);
  }
  dd {
    margin: 4px 0 0;
    font-size: 12px;
    line-height: 1.65;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .dependent-changes {
    font-size: 12px;
    line-height: 1.6;
    margin: 12px 0;
  }
  .dependent-changes summary {
    min-height: 44px;
    cursor: pointer;
  }
  .dependent-changes ul {
    padding-left: 18px;
  }
  @media (max-width: 420px) {
    .preview-pair svg {
      height: 130px;
    }
    dl {
      grid-template-columns: 1fr;
      gap: 8px;
    }
  }
</style>
