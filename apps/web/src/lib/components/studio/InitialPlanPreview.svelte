<script lang="ts">
  import { designSnapshotSchema } from "@schubert/contracts";
  import { projectDesign, contourBounds } from "@schubert/geometry";
  let { snapshot }: { snapshot: unknown } = $props();
  const model = $derived(designSnapshotSchema.parse(snapshot));
  const projection = $derived(
    projectDesign(model, model.kind === "memorial" ? "front" : "top"),
  );
  const size = $derived(
    Math.max(
      projection.bounds.maxX - projection.bounds.minX,
      projection.bounds.maxY - projection.bounds.minY,
      100,
    ),
  );
  const pad = $derived(size * 0.12 + 20);
  const box = $derived(
    `${projection.bounds.minX - pad} ${-projection.bounds.maxY - pad} ${Math.max(1, projection.bounds.maxX - projection.bounds.minX + pad * 2)} ${Math.max(1, projection.bounds.maxY - projection.bounds.minY + pad * 2)}`,
  );
  const references = $derived(
    model.elements.filter((element) => element.kind === "plan_reference"),
  );
  function path(shape: any) {
    return (
      shape.points
        .map(
          (point: any, index: number) =>
            `${index ? "L" : "M"}${point.xMm} ${-Number(point.yMm)}`,
        )
        .join(" ") +
      (shape.closed ? " Z" : "") +
      " " +
      (shape.holes ?? [])
        .map(
          (ring: any[]) =>
            ring
              .map(
                (point, index) =>
                  `${index ? "L" : "M"}${point.xMm} ${-Number(point.yMm)}`,
              )
              .join(" ") + " Z",
        )
        .join(" ")
    );
  }
  const mm = (value: unknown) => String(value).replace(".", ",");
</script>

<div class="initial-plan" aria-label="Vorschau der neuen Planung">
  {#if projection.shapes.length}<svg
      viewBox={box}
      role="img"
      aria-label={model.kind === "memorial"
        ? "Neuer Grabmalentwurf"
        : "Neuer Grundriss"}
      >{#each projection.shapes as shape}<path
          d={path(shape)}
          fill-rule="evenodd"
          fill={shape.erase ? "#f6f7f2" : shape.closed ? "#e1e7e1" : "none"}
          stroke={shape.erase ? "#f6f7f2" : "#245aa0"}
          stroke-width={size / 350}
        />{/each}</svg
    >{/if}
  {#each references as reference}<p class="field-help">
      {reference.label}: Bildvorlage wird im Plan hinterlegt. Maßstab noch nicht
      festgelegt.
    </p>{/each}
  {#each model.elements.filter((element) => element.kind === "stone_piece" || element.kind === "inscription" || element.kind === "room") as element}<div
      class="part"
    >
      <strong>{element.label}</strong
      >{#if element.kind === "stone_piece"}{@const bounds = contourBounds(
          element.finishedContour,
        )}
        <p>
          {mm(bounds.width)} × {mm(bounds.height)} mm · Stärke {mm(
            model.measurements[element.thicknessMeasureId]?.valueMm ?? "offen",
          )} mm
        </p>{:else if element.kind === "inscription"}<p>
          {element.exactText}
        </p>{/if}
    </div>{/each}
  <p class="field-help">
    Ein bearbeitbarer Entwurf. Übernommene Maße bleiben ungeprüft; Preise und
    Freigaben entstehen erst im jeweiligen Fachschritt.
  </p>
</div>

<style>
  .initial-plan {
    margin-top: 14px;
    min-width: 0;
  }
  .initial-plan svg {
    display: block;
    width: 100%;
    height: 190px;
    background: #f6f7f2;
    border: 1px solid var(--line);
    border-radius: 12px;
  }
  .part {
    padding: 10px 0;
    border-bottom: 1px solid var(--line);
  }
  .part strong {
    font-size: 13px;
  }
  .part p {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 13px;
    line-height: 1.6;
    margin: 4px 0;
  }
</style>
