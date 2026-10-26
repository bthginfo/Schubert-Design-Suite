import {
  designSnapshotSchema,
  designOperationSchema,
  type DesignOperation,
  type DesignSnapshot,
} from "@schubert/contracts";
import {
  applyOperations,
  inverseOperations,
  projectDesign,
  contourBounds,
} from "@schubert/geometry";
import type { AppData, Row } from "./types.ts";
import { planningFont } from "../components/studio/planning-fonts.ts";
export type ChangeField = { label: string; before: string; after: string };
export type PlanChange = {
  id: string;
  label: string;
  kind: "added" | "changed" | "removed";
  fields: ChangeField[];
};
const names: Record<string, string> = {
  phase: "Planungsphase",
  locked: "Bearbeitungssperre",
  finishedContour: "Steinform",
  contour: "Kontur",
  transform: "Position und Drehung",
  edgeTreatments: "Kantenbearbeitung",
  thicknessMeasureId: "Materialstärke",
  parentId: "Zugehörige Gruppe",
  purpose: "Verwendung",
  exactText: "Wortlaut",
  originUV: "Position auf dem Stein",
  rotationDeg: "Drehung",
  alignment: "Ausrichtung",
  previewFontKey: "Entwurfsschrift",
  previewColor: "Schriftfarbe",
  fontVariantVersionId: "Herstellerschrift",
  referenceAssetVersionIds: "Schriftreferenzen",
  renderingBasis: "Schriftgrundlage",
  requestedHeightMeasureId: "Schrifthöhe",
  requestedLowercaseHeightMeasureId: "Kleinbuchstabenhöhe",
  requestedMaxWidthMeasureId: "Maximale Schriftbreite",
  lineGapMeasureId: "Zeilenabstand",
  supplyForm: "Lieferform",
  materialSpecVersionId: "Material",
  materialArticleReference: "Herstellerartikel",
  finishSpecVersionId: "Oberfläche",
  glyphPlacements: "Einzelzeichen und Positionen",
};
const decimal = (value: unknown) => String(value).replace(".", ",");
function value(v: any): string {
  if (v == null) return "Nicht festgelegt";
  if (typeof v === "string" && v.startsWith("unassigned:"))
    return "Noch nicht zugeordnet";
  if (typeof v === "object") {
    if ("uMm" in v) return `u ${decimal(v.uMm)} · v ${decimal(v.vMm)} mm`;
    if ("xMm" in v)
      return `X ${decimal(v.xMm)} · Y ${decimal(v.yMm)} · Z ${decimal(v.zMm)} mm`;
    if ("x" in v && "z" in v)
      return `X ${decimal(v.x)}° · Y ${decimal(v.y)}° · Z ${decimal(v.z)}°`;
    return Array.isArray(v)
      ? v.length
        ? v
            .map((item) =>
              typeof item === "string" ? item : JSON.stringify(item),
            )
            .join("\n")
        : "Keine"
      : JSON.stringify(v);
  }
  return (
    (
      {
        existing: "Bestand",
        planned: "Neue geplante Fassung",
        removed: "Zur Entfernung vorgesehen",
        left: "Linksbündig",
        center: "Zentriert",
        right: "Rechtsbündig",
        individual_letters: "Einzelbuchstaben",
        wording: "Schriftzug",
        engraved: "Gravur",
        other: "Sonstiges",
        shop_image_reference: "Bildreferenz",
        verified_contours: "Belegte Originalkonturen",
        verified_3d: "Belegte 3D-Modelle",
      } as Record<string, string>
    )[String(v)] ?? String(v)
  );
}
function dimensionFields(
  snapshot: DesignSnapshot,
  element: DesignSnapshot["elements"][number],
): ChangeField[] {
  const fields: ChangeField[] = [];
  if (element.kind === "stone_piece") {
    const bounds = contourBounds(element.finishedContour);
    fields.push({
      label: "Außenmaße der Steinfläche",
      before: "Noch nicht vorhanden",
      after: `${decimal(bounds.width)} × ${decimal(bounds.height)} mm`,
    });
  }
  const labels: Record<string, string> = {
    thicknessMeasureId: "Materialstärke",
    heightMeasureId: "Höhe",
    coreThicknessMeasureId: "Wandstärke ohne Belag",
    widthMeasureId: "Breite",
    measureId: "Maßwert",
    requestedHeightMeasureId: "Schrifthöhe",
    lineGapMeasureId: "Zeilenabstand",
  };
  for (const [key, label] of Object.entries(labels)) {
    const id = (element as unknown as Row)[key];
    if (typeof id === "string")
      fields.push({
        label,
        before: "Noch nicht vorhanden",
        after:
          snapshot.measurements[id]?.valueMm == null
            ? "Offen"
            : decimal(snapshot.measurements[id].valueMm) + " mm",
      });
  }
  return fields;
}
export function planChanges(
  before: DesignSnapshot,
  after: DesignSnapshot,
  labels: Record<string, string> = {},
): PlanChange[] {
  const changes: PlanChange[] = [];
  for (const element of before.elements) {
    const next = after.elements.find((e) => e.id === element.id);
    if (!next) {
      changes.push({
        id: element.id,
        label: element.label,
        kind: "removed",
        fields: [],
      });
      continue;
    }
    if (JSON.stringify(element) === JSON.stringify(next)) continue;
    const a = element as unknown as Row,
      b = next as unknown as Row,
      fields: ChangeField[] = [];
    for (const key of Object.keys(names))
      if (JSON.stringify(a[key]) !== JSON.stringify(b[key]))
        fields.push({
          label: names[key],
          before: key.endsWith("MeasureId")
            ? a[key]
              ? decimal(before.measurements[a[key]]?.valueMm ?? "offen") + " mm"
              : "Nicht festgelegt"
            : key === "previewFontKey" && a[key]
              ? planningFont(a[key]).label
              : (labels[a[key]] ?? value(a[key])),
          after: key.endsWith("MeasureId")
            ? b[key]
              ? decimal(after.measurements[b[key]]?.valueMm ?? "offen") +
                " mm (anderer Maßbezug)"
              : "Nicht festgelegt"
            : key === "previewFontKey" && b[key]
              ? planningFont(b[key]).label
              : (labels[b[key]] ?? value(b[key])),
        });
    for (const [key, label] of [
      ["position", "Position"],
      ["rotationDeg", "Drehung"],
    ])
      if (
        JSON.stringify(a.transform?.[key]) !==
        JSON.stringify(b.transform?.[key])
      )
        fields.push({
          label,
          before: value(a.transform?.[key]),
          after: value(b.transform?.[key]),
        });
    if (!fields.length)
      fields.push({
        label:
          element.kind === "node"
            ? "Bezugspunkt"
            : "Geometrie oder Eigenschaften",
        before:
          element.kind === "node" ? value(element.point) : "Bisheriger Stand",
        after:
          next.kind === "node" ? value(next.point) : "Vorgeschlagener Stand",
      });
    changes.push({
      id: element.id,
      label: element.label,
      kind: "changed",
      fields,
    });
  }
  for (const e of after.elements)
    if (!before.elements.some((old) => old.id === e.id))
      changes.push({
        id: e.id,
        label: e.label,
        kind: "added",
        fields: [
          ...(e.kind === "inscription"
            ? [
                {
                  label: "Wortlaut",
                  before: "Noch nicht vorhanden",
                  after: e.exactText,
                },
              ]
            : []),
          ...dimensionFields(after, e),
        ],
      });
  for (const [id, m] of Object.entries(after.measurements)) {
    const old = before.measurements[id];
    if (!old || old.valueMm === m.valueMm) continue;
    const d = after.elements.find(
        (e) => e.kind === "dimension" && e.measureId === id,
      ),
      owner = after.elements.find((e) =>
        Object.entries(e).some(([k, v]) => k.endsWith("MeasureId") && v === id),
      );
    changes.push({
      id: "measure:" + id,
      label: d?.label ?? owner?.label ?? "Planmaß",
      kind: "changed",
      fields: [
        {
          label: "Maßwert",
          before: `${decimal(old.valueMm ?? "offen")} mm`,
          after: `${decimal(m.valueMm ?? "offen")} mm`,
        },
      ],
    });
  }
  return changes;
}
export function planningProposalReview(data: AppData, proposal: Row) {
  const command = (proposal.proposedCommands ?? proposal.commands ?? []).find(
    (c: Row) => c.name === "planning.design.change",
  );
  if (!command) return null;
  try {
    const input =
        command.input?.payload ?? command.payload ?? command.input ?? {},
      revision = data.related?.revisions?.find(
        (r: Row) => r.id === input.base_revision_id,
      );
    if (!revision)
      throw Error(
        "Der zugehörige Planstand ist nicht mehr geladen. Den aktuellen Stand öffnen und einen neuen Vorschlag anfordern.",
      );
    const before = designSnapshotSchema.parse(
        typeof revision.snapshot === "string"
          ? JSON.parse(revision.snapshot)
          : revision.snapshot,
      ),
      operations = (input.operations ?? []).map((op: unknown) =>
        designOperationSchema.parse(op),
      ) as DesignOperation[];
    if (!operations.length)
      throw Error("Der Vorschlag enthält keine prüfbare Planänderung.");
    const after = applyOperations(before, operations),
      changes = planChanges(
        before,
        after,
        Object.fromEntries(
          Object.values(data.related ?? {})
            .flat()
            .filter((row) => row?.name || row?.title)
            .map((row) => [row.version_id ?? row.id, row.name ?? row.title]),
        ),
      );
    let inverse: DesignOperation[] | null = null;
    try {
      inverse = inverseOperations(before, operations);
    } catch {}
    const view = before.kind === "memorial" ? "front" : "top",
      oldProjection = projectDesign(before, view),
      newProjection = projectDesign(after, view),
      boxes = [oldProjection.bounds, newProjection.bounds],
      minX = Math.min(...boxes.map((b) => b.minX)),
      maxX = Math.max(...boxes.map((b) => b.maxX)),
      minY = Math.min(...boxes.map((b) => b.minY)),
      maxY = Math.max(...boxes.map((b) => b.maxY)),
      size = Math.max(maxX - minX, maxY - minY, 100),
      pad = size * 0.12 + 20;
    // Wall joins, room outlines and hosted lettering can move without a change
    // to their own JSON. Use the same canonical projections as the preview.
    function signatures(projection: typeof oldProjection) {
      const entries = new Map<string, unknown[]>();
      for (const item of [...projection.shapes, ...projection.texts])
        entries.set(item.elementId, [
          ...(entries.get(item.elementId) ?? []),
          item,
        ]);
      return new Map(
        [...entries].map(([id, items]) => [id, JSON.stringify(items)]),
      );
    }
    const oldShapes = signatures(oldProjection),
      newShapes = signatures(newProjection),
      listed = new Set(changes.map((change) => change.id));
    for (const element of after.elements)
      if (
        !listed.has(element.id) &&
        before.elements.some((old) => old.id === element.id) &&
        oldShapes.get(element.id) !== newShapes.get(element.id)
      )
        changes.push({
          id: element.id,
          label: element.label,
          kind: "changed",
          fields: [
            {
              label: "Abgeleitete Lage oder Geometrie",
              before: "Bisheriger Planstand",
              after: "Folgt dem geänderten Maß oder Bauteilbezug",
            },
          ],
        });
    const wordingUnchanged =
      before.elements
        .filter((e) => e.kind === "inscription")
        .every((e) => {
          const next = after.elements.find((n) => n.id === e.id);
          return next?.kind === "inscription" && next.exactText === e.exactText;
        }) &&
      after.elements
        .filter((e) => e.kind === "inscription")
        .every((e) => before.elements.some((n) => n.id === e.id));
    return {
      before,
      after,
      operations,
      inverse,
      changes,
      oldProjection,
      newProjection,
      view,
      box: `${minX - pad} ${-maxY - pad} ${Math.max(1, maxX - minX + pad * 2)} ${Math.max(1, maxY - minY + pad * 2)}`,
      stroke: size / 350,
      wordingUnchanged,
      measurementsUnchanged: Object.entries(before.measurements).every(
        ([id, m]) => after.measurements[id]?.valueMm === m.valueMm,
      ),
      error: null,
    };
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Der Vorschlag kann nicht sicher angezeigt werden.",
    };
  }
}
