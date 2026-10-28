import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  designOperationSchema,
  designElementSchema,
  stonePieceElementSchema,
  inscriptionElementSchema,
  planningOperationAllowed,
  type DesignSnapshot,
  type DesignOperation,
} from "@schubert/contracts";
import {
  applyOperations,
  targetMeasure,
  rectangleContour,
  contourBounds,
  mm,
  IDENTITY_TRANSFORM,
  validateDesign,
} from "@schubert/geometry";
import { DomainError, requireRule } from "@schubert/domain";
import { planningDraftOperations } from "./planning-draft.js";

const names: Record<string, string> = {
  stone_piece: "Natursteinbauteil",
  inscription: "Inschrift",
  technical_note: "Hinweis",
  plan_reference: "Skizze als Vorlage",
  group: "Gruppe",
};
/** Expand editable design defaults, never attest a survey, catalogue value or approval. */
export function normalizePlanningEdits(
  context: any,
  input: unknown,
): DesignOperation[] {
  requireRule(
    Array.isArray(input) && input.length > 0 && input.length <= 100,
    "AI_EDIT_COUNT",
    "Bis zu 100 zusammengehörige Bearbeitungen pro Vorschlag verwenden.",
  );
  const original = context.snapshot as DesignSnapshot;
  let current = structuredClone(original);
  const aliases = new Map<string, string>(),
    operations: DesignOperation[] = [],
    relock = new Set<string>();
  const reserve = (value: unknown) => {
    const id = typeof value === "string" ? value : "new:" + randomUUID();
    requireRule(
      !original.elements.some((e) => e.id === id) &&
        !original.frames.some((f) => f.id === id) &&
        !original.measurements[id],
      "AI_NEW_ID",
      "Ein neues Bauteil oder Maß benötigt eine eigene Kennung.",
    );
    if (!aliases.has(id)) aliases.set(id, randomUUID());
    return id;
  };
  const remap = (value: any, field = ""): any =>
    typeof value === "string"
      ? field === "id" || /Ids?$/.test(field)
        ? (aliases.get(value) ?? value)
        : value
      : Array.isArray(value)
        ? value.map((item) => remap(item, field))
        : value && typeof value === "object"
          ? Object.fromEntries(
              Object.entries(value).map(([key, item]) => [
                aliases.get(key) ?? key,
                remap(item, key),
              ]),
            )
          : value;
  for (const rawInput of input) {
    let raw: any = structuredClone(rawInput);
    requireRule(
      raw && typeof raw === "object",
      "AI_EDIT_FORMAT",
      "Eine konkrete Planänderung angeben.",
    );
    if (raw.type === "add_inscription")
      raw = {
        type: "add_element",
        measurements: raw.measurements,
        element: {
          ...raw,
          kind: "inscription",
          id: raw.id ?? "new:inscription:" + randomUUID(),
        },
      };
    if (raw.type === "apply_to_elements") {
      const ids =
        raw.elementIds === "all_inscriptions"
          ? current.elements
              .filter((e) => e.kind === "inscription")
              .map((e) => e.id)
          : raw.elementIds;
      requireRule(
        Array.isArray(ids) && ids.length > 0 && ids.length <= 500,
        "AI_EDIT_SELECTION",
        "Die betroffenen Bauteile aus dem aktuellen Plan auswählen.",
      );
      const expanded = normalizePlanningEdits(
        { ...context, snapshot: current },
        ids.map((elementId) => ({ ...raw.operation, elementId })),
      );
      operations.push(...expanded);
      current = applyOperations(current, expanded, { validate: false });
      continue;
    }
    requireRule(
      planningOperationAllowed("design", raw.type),
      "AI_EDIT_ATTESTATION",
      "Ein Entwurf kann vorbereitet werden. Fachliche Nachweise und Freigaben benötigen weiterhin ihre belegte Fachaktion.",
    );
    const measurements: Record<string, any> = {};
    const measure = (name: string, value: any) => {
      const key = reserve("new:measure:" + randomUUID() + ":" + name);
      measurements[key] = { ...targetMeasure(value ?? null), origin: "ai" };
      return key;
    };
    for (const [id, value] of Object.entries(raw.measurements ?? {})) {
      reserve(id);
      const source = value as any;
      requireRule(
        !source ||
          source.semantic === undefined ||
          source.semantic === "design_target",
        "AI_EDIT_MEASURE",
        "Neue Entwurfsmaße werden als ungeprüfte Planmaße angelegt.",
      );
      requireRule(
        source?.reviewStatus !== "confirmed" &&
          !source?.confirmedBy &&
          !source?.confirmedAt,
        "AI_EDIT_MEASURE",
        "Eine KI-Bearbeitung bestätigt kein Aufmaß.",
      );
      measurements[id] = {
        ...targetMeasure(
          typeof source === "string" ? source : (source?.valueMm ?? null),
          source?.isEstimated ?? false,
        ),
        origin: "ai",
      };
    }
    if (raw.type === "add_element" || raw.type === "add_opening") {
      let e: any = raw.element;
      requireRule(
        e && typeof e === "object",
        "AI_EDIT_ELEMENT",
        "Das neue Bauteil benötigt eine Bauteilart und seine Entwurfsangaben.",
      );
      const newId = reserve(e.id);
      e = {
        label: names[e.kind] ?? "Bauteil",
        parentId: current.frames[0].id,
        phase: "planned",
        locked: false,
        sourceEvidenceVersionIds: [],
        ...e,
        id: newId,
      };
      if (e.kind === "inscription") {
        const surfaces = current.elements.filter(
          (e) =>
            e.kind === "stone_piece" ||
            (e.kind === "surface" && e.surfaceType === "inscription"),
        );
        const selected = surfaces.filter((e) =>
          (context.selectedElementIds ?? []).includes(e.id),
        );
        e.surfaceElementId ??=
          selected.length === 1
            ? selected[0].id
            : surfaces.length === 1
              ? surfaces[0].id
              : undefined;
        requireRule(
          e.surfaceElementId,
          "AI_INSCRIPTION_SURFACE",
          "Für die neue Inschrift die passende Steinfläche auswählen.",
        );
        const existing = current.elements.filter(
            (item: any) =>
              item.kind === "inscription" &&
              item.surfaceElementId === e.surfaceElementId,
          ) as any[],
          style = existing[0],
          host = surfaces.find((item) => item.id === e.surfaceElementId);
        const bounds =
          host && "finishedContour" in host
            ? contourBounds(host.finishedContour)
            : host && "contour" in host
              ? contourBounds(host.contour)
              : null;
        const height =
            e.heightMm ??
            (style
              ? current.measurements[style.requestedHeightMeasureId]?.valueMm
              : null) ??
            "40",
          gap =
            e.lineGapMm ??
            (style
              ? current.measurements[style.lineGapMeasureId]?.valueMm
              : null) ??
            "12";
        let origin = { uMm: "0", vMm: "0" };
        if (bounds) {
          const slots = [0.65, 0.4, 0.2, 0.8];
          const fraction =
            slots.find((f) =>
              existing.every(
                (item) =>
                  Math.abs(
                    Number(item.originUV.vMm) -
                      (Number(bounds.minY) + Number(bounds.height) * f),
                  ) >
                  Number(height) * 2,
              ),
            ) ?? 0.5;
          origin = {
            uMm: mm(Number(bounds.minX) + Number(bounds.width) / 2),
            vMm: mm(Number(bounds.minY) + Number(bounds.height) * fraction),
          };
        }
        e = {
          originUV: origin,
          rotationDeg: "0",
          fontVariantVersionId:
            style?.fontVariantVersionId ?? "unassigned:font",
          referenceAssetVersionIds: [],
          renderingBasis: "shop_image_reference",
          requestedHeightMeasureId:
            e.requestedHeightMeasureId ?? measure("letter-height", height),
          requestedLowercaseHeightMeasureId: null,
          requestedMaxWidthMeasureId: null,
          lineGapMeasureId: e.lineGapMeasureId ?? measure("line-gap", gap),
          supplyForm: style?.supplyForm ?? "individual_letters",
          materialSpecVersionId: null,
          materialArticleReference: null,
          finishSpecVersionId: null,
          alignment: "center",
          glyphPlacements: [],
          previewFontKey: style?.previewFontKey ?? "notoserif",
          previewColor: style?.previewColor ?? "#c6a56d",
          ...e,
        };
        delete e.heightMm;
        delete e.lineGapMm;
        delete e.type;
        delete e.measurements;
      } else if (e.kind === "stone_piece") {
        if (current.kind === 'memorial' && typeof e.purpose === 'string' && ['base','plinth','pedestal','sockel','stele','headstone','gravestone'].includes(e.purpose.trim().toLowerCase())) e.purpose = 'memorial';
        if (!e.finishedContour) {
          requireRule(
            e.widthMm && e.heightMm,
            "AI_STONE_DIMENSIONS",
            "Für den neuen Stein werden Breite und Höhe beziehungsweise Länge und Tiefe benötigt.",
          );
          e.finishedContour = rectangleContour(e.widthMm, e.heightMm);
        }
        e = {
          transform: structuredClone(IDENTITY_TRANSFORM),
          purpose: current.kind === "memorial" ? "memorial" : "countertop",
          thicknessMeasureId:
            e.thicknessMeasureId ?? measure("thickness", e.thicknessMm),
          materialSpecVersionId: "unassigned:material",
          stockItemId: null,
          grainDirectionDeg: null,
          edgeTreatments: [],
          machiningFeatureIds: [],
          ...e,
        };
        if (current.kind === "memorial" && !raw.element.transform)
          e.transform.rotationDeg.x = "90";
        delete e.widthMm;
        delete e.heightMm;
        delete e.thicknessMm;
      } else if (e.kind === "technical_note")
        e = {
          point: { xMm: "0", yMm: "0", zMm: "0" },
          category: "information",
          ruleVersionId: null,
          ...e,
        };
      else if (e.kind === "group")
        e = { transform: structuredClone(IDENTITY_TRANSFORM), ...e };
      else if (e.kind === "plan_reference") {
        const source = (context.sources ?? []).find(
            (source: any) => source.documentId === e.sourceDocumentId,
          ),
          preview = source?.imagePreview;
        requireRule(
          source && preview,
          "AI_SKETCH_SOURCE",
          "Die hochgeladene Bild- oder PDF-Seite zuerst als Bildvorlage vorbereiten.",
        );
        e = {
          transform: structuredClone(IDENTITY_TRANSFORM),
          sourceDocumentVersionId: source.documentVersionId,
          sourceHash: source.sourceHash,
          previewDocumentId: preview.documentId,
          previewDocumentVersionId: preview.documentVersionId,
          previewHash: preview.hash,
          pageIndex: source.pageIndex,
          widthPx: preview.width,
          heightPx: preview.height,
          sourceKind: "sketch",
          calibration: {
            segments: [],
            toleranceMm: "1",
            orthogonalAxesDeclared: false,
            reviewStatus: "unreviewed",
          },
          opacity: 0.45,
          ...e,
        };
        // Hashes and file versions are always supplied by the checked original, not model output.
        Object.assign(e, {
          sourceDocumentVersionId: source.documentVersionId,
          sourceHash: source.sourceHash,
          previewDocumentId: preview.documentId,
          previewDocumentVersionId: preview.documentVersionId,
          previewHash: preview.hash,
          pageIndex: source.pageIndex,
          widthPx: preview.width,
          heightPx: preview.height,
        });
      }
      raw.element = e;
    }
    if (raw.type === "duplicate_element") reserve(raw.newId);
    if (raw.type === "split_wall") {
      reserve(raw.newNodeId);
      reserve(raw.newWallId);
    }
    if (raw.type === "add_constraint" && raw.constraint)
      raw.constraint.id = reserve(raw.constraint.id);
    if (raw.type === "add_frame" && raw.frame)
      raw.frame.id = reserve(raw.frame.id);
    if (Object.keys(measurements).length) raw.measurements = measurements;
    if (raw.type === "remove_element") raw.cascade ??= true;
    if (raw.type === "set_design_target") {
      requireRule(
        raw.confirm !== true,
        "AI_EDIT_ATTESTATION",
        "Planmaße werden geändert, aber nicht fachlich bestätigt.",
      );
      raw.confirm = false;
      raw.origin = "ai";
    }
    raw = remap(raw);
    let parsed: DesignOperation;
    try {
      parsed = designOperationSchema.parse(raw);
    } catch (error) {
      throw new DomainError(
        "AI_EDIT_FIELDS",
        `Die KI konnte die Angaben für „${raw.element?.label ?? 'dieses Bauteil'}“ noch nicht in einen bearbeitbaren Entwurf übersetzen. ` +
          (error instanceof z.ZodError ? 'Bitte prüfen: ' + [...new Set(error.issues.slice(0,3).map(issue=>{
            const fields:Record<string,string>={purpose:'Verwendungszweck',previewFontKey:'Vorschauschrift',originUV:'Position der Inschrift',transform:'Lage des Bauteils',finishedContour:'Steinform',thicknessMeasureId:'Materialstärke',exactText:'Wortlaut der Inschrift'};
            return fields[String(issue.path[1])] ?? 'Bauteilangaben';
          }))].join(', ') + '. ' : '') +
          'Der Plan bleibt unverändert. Ihre Nachricht und Unterlagen bleiben erhalten. Präzisieren Sie das betroffene Bauteil oder ergänzen Sie es über „Hinzufügen“.',
        422,
      );
    }
    const target =
      "elementId" in parsed
        ? current.elements.find((e) => e.id === parsed.elementId)
        : null;
    if (
      target?.kind === "inscription" &&
      target.phase === "existing" &&
      !["duplicate_element", "plan_inscription_revision"].includes(parsed.type)
    ) {
      const revision: DesignOperation = {
        type: "plan_inscription_revision",
        elementId: target.id,
      };
      operations.push(revision);
      current = applyOperations(current, [revision], { validate: false });
    }
    if (parsed.type === "set_element_lock") relock.delete(parsed.elementId);
    // A draft edit may temporarily unlock a protected working element. Its
    // historic revision remains immutable; unchanged locks are restored below.
    for (let attempt = 0; ; attempt++) {
      try {
        current = applyOperations(current, [parsed], { validate: false });
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        const named = message.match(/„([^“]+)“/),
          locked = named
            ? current.elements.find((e) => e.label === named[1])
            : null;
        if (attempt < 50 && message.includes("gesperrt") && locked) {
          const chain: any[] = [];
          let item: any = locked;
          const seen = new Set<string>();
          while (item && !seen.has(item.id)) {
            seen.add(item.id);
            chain.unshift(item);
            item = current.elements.find((e) => e.id === item.parentId);
          }
          let changed = false;
          for (const item of chain) {
            if (!item.locked) continue;
            const unlock: DesignOperation =
              item.kind === "inscription" && item.phase === "existing"
                ? { type: "plan_inscription_revision", elementId: item.id }
                : {
                    type: "set_element_lock",
                    elementId: item.id,
                    locked: false,
                  };
            current = applyOperations(current, [unlock], { validate: false });
            operations.push(unlock);
            if (unlock.type === "set_element_lock") relock.add(item.id);
            changed = true;
          }
          if (changed) continue;
        }
        throw new DomainError(
          "AI_EDIT_GEOMETRY",
          message || "Die Geometrie dieser Änderung benötigt eine Korrektur.",
          422,
        );
      }
    }
    operations.push(parsed);
    if (parsed.type === "set_stone_spec" && parsed.finishedContour) {
      const bounds = contourBounds(parsed.finishedContour);
      for (const dimension of current.elements) {
        if (
          dimension.kind !== "dimension" ||
          dimension.mode !== "driving" ||
          dimension.refs.length !== 1 ||
          dimension.refs[0].elementId !== parsed.elementId ||
          !["width", "height"].includes(dimension.refs[0].feature)
        )
          continue;
        const measure = current.measurements[dimension.measureId];
        if (measure?.semantic !== "design_target") continue;
        const update: DesignOperation = {
          type: "set_design_target",
          measureId: dimension.measureId,
          valueMm:
            dimension.refs[0].feature === "width"
              ? bounds.width
              : bounds.height,
          confirm: false,
          origin: "ai",
        };
        current = applyOperations(current, [update], { validate: false });
        operations.push(update);
      }
    }
  }
  for (const id of relock) {
    if (!current.elements.some((e) => e.id === id)) continue;
    const lock: DesignOperation = {
      type: "set_element_lock",
      elementId: id,
      locked: true,
    };
    current = applyOperations(current, [lock], { validate: false });
    operations.push(lock);
  }
  const report = validateDesign(current);
  requireRule(
    !report.blocking.length,
    "AI_EDIT_GEOMETRY",
    report.blocking.join(" "),
  );
  return operations;
}

export function initialPlanningOperations(
  context: any,
  initial: any = {},
): DesignOperation[] {
  let snapshot = context.snapshot as DesignSnapshot;
  const operations: DesignOperation[] = [];
  if (initial?.draft) {
    const draft = planningDraftOperations(
      { ...context, snapshot },
      initial.draft,
    );
    operations.push(...draft);
    snapshot = applyOperations(snapshot, draft);
  }
  if (initial?.operations?.length) {
    const edits = normalizePlanningEdits(
      { ...context, snapshot },
      initial.operations,
    );
    operations.push(...edits);
    snapshot = applyOperations(snapshot, edits);
  }
  for (const source of context.sources ?? []) {
    if (
      !source.imagePreview ||
      snapshot.elements.some(
        (e) =>
          e.kind === "plan_reference" &&
          e.sourceDocumentId === source.documentId,
      )
    )
      continue;
    const reference = normalizePlanningEdits({ ...context, snapshot }, [
      {
        type: "add_element",
        element: {
          id: "new:source:" + source.documentId,
          kind: "plan_reference",
          sourceDocumentId: source.documentId,
          label: source.name ?? "Skizze als Vorlage",
        },
      },
    ]);
    operations.push(...reference);
    snapshot = applyOperations(snapshot, reference);
  }
  return operations;
}

const operationFields = designOperationSchema.options
  .filter((schema) =>
    planningOperationAllowed("design", String(schema.shape.type.value)),
  )
  .map(
    (schema) =>
      schema.shape.type.value +
      ": " +
      Object.keys(schema.shape)
        .filter((key) => key !== "type")
        .join(", "),
  );
const elementFields = designElementSchema.options.map(
  (schema) =>
    schema.shape.kind.value +
    ": " +
    Object.keys(schema.shape)
      .filter(
        (key) =>
          ![
            "id",
            "kind",
            "label",
            "parentId",
            "phase",
            "locked",
            "sourceEvidenceVersionIds",
          ].includes(key),
      )
      .join(", "),
);
export const planningEditInstructions =
  'Verbindliche Werte und Koordinaten: stone_piece.purpose ist einer von '+stonePieceElementSchema.shape.purpose.options.join('|')+'. Grabstein, Stele und Sockel haben alle purpose:"memorial"; die Bezeichnung "Sockel" ist label, keine neue Kategorie. inscription.previewFontKey ist einer von '+inscriptionElementSchema.shape.previewFontKey.unwrap().options.join('|')+'. Vorschau-Schrift weglassen, wenn keine konkrete verlangt wurde; niemals erfundene Schriftkennungen oder "serif" verwenden. inscription.originUV hat exakt {uMm:"300",vMm:"600"}, lokale waagerechte/senkrechte Position auf dem Stein in mm. Keine Felder x/y/u/v. Ohne Positionswunsch originUV weglassen; der Server platziert den Text mittig. transform ist {position:{xMm:"0",yMm:"0",zMm:"0"},rotationDeg:{x:"90",y:"0",z:"0"}}. Konturen bestehen aus outer und holes; eine Linie ist {kind:"line",from:{xMm:"0",yMm:"0"},to:{xMm:"600",yMm:"0"}}, ein Bogen {kind:"circular_arc",from:{xMm:"600",yMm:"600"},to:{xMm:"0",yMm:"600"},center:{xMm:"300",yMm:"600"},clockwise:false}. Ein Rundbogen liegt oberhalb seiner waagerechten Kämpferlinie; Radius und Bauteilgesamthöhe aus den angegebenen Maßen ableiten. Alle Koordinaten, Winkel und Maße sind Dezimalstrings. ' +
  'Du kannst den gesamten berechtigten Entwurf bearbeiten: Elemente hinzufügen, ändern, entfernen, duplizieren, Material/Form/Text/Schrift/Kanten/Ausschnitte bearbeiten, Räume/Wände/Öffnungen verändern. Der aktuelle Studioschritt ist Orientierung, keine Bearbeitungssperre. Setze ausdrückliche Gestaltungswünsche direkt als konkreten Vorschlag um. Vorhandene IDs aus dem Kontext verwenden. Neue Elemente und Maße mit lokalen Kennungen new:... anlegen; der Server vergibt eigene IDs. Neue Maße sind ungeprüfte Entwurfsziele, keine Bestandsbestätigung. Für neue Inschrift genügt {type:"add_inscription",surfaceElementId,exactText,label?,heightMm?,lineGapMm?,previewFontKey?,previewColor?,originUV?}; vorhandene Gestaltung wird übernommen, ansonsten editierbare Entwurfsdarstellung. Nicht nach optionaler Schriftgröße/Farbe fragen, wenn eine vorhandene Gestaltung oder ein sinnvoller Entwurf möglich ist. Für neue Steinplatte add_element mit element:{kind:"stone_piece",id:"new:stein",widthMm,heightMm,thicknessMm?,purpose?,...}; alternativ vollständige Kontur. Für eine Skizzenvorlage add_element mit element:{kind:"plan_reference",id:"new:vorlage",sourceDocumentId,label?}; Original/Hash bindet der Server. Maße in measurements können kompakt {valueMm:"40"} sein. Bestehende Inschrift bei gewünschter Gestaltung als neue geplante Fassung weiterbearbeiten; historische Originalrevision bleibt erhalten. set_inscription_text für den genauen neuen Wortlaut; Geburtszeichen * und Sterbezeichen † sind die üblichen gewünschten Zeichen, keine Rückfrage dazu. Für gleiche Eigenschaft an mehreren Elementen {type:"apply_to_elements",elementIds:[...IDs] oder "all_inscriptions",operation:{type:...,weitereFelder...}}. Zulässige Operationen mit Feldern: ' +
  operationFields.join("; ") +
  ". Bauteilfelder (Basisfelder ergänzt der Server): " +
  elementFields.join("; ") +
  ".";
