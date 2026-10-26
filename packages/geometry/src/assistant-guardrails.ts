import type {
  DesignSnapshot,
  DesignOperation,
  PlanningGuardrails,
} from "@schubert/contracts";
import { applyOperations } from "./model.js";
import { designSnapshotSchema } from "@schubert/contracts";

function measureReferences(
  value: unknown,
  ids = new Set<string>(),
): Set<string> {
  if (value && typeof value === "object")
    for (const [key, item] of Object.entries(value)) {
      if (
        (key === "measureId" || key.endsWith("MeasureId")) &&
        typeof item === "string"
      )
        ids.add(item);
      else if (item && typeof item === "object") measureReferences(item, ids);
    }
  return ids;
}

/** User-selected edit boundaries are checked against the full model, not LLM claims. */
export function assistantGuardrailIssues(
  before: DesignSnapshot,
  operations: DesignOperation[],
  guardrails: PlanningGuardrails,
  selectedIds: string[] = [],
): string[] {
  // PostgreSQL JSONB reorders keys; schema normalization makes before/after
  // comparisons independent of transport ordering and legacy default fields.
  before = designSnapshotSchema.parse(before);
  const issues = new Set<string>(),
    selection = new Set(selectedIds),
    measures = new Set<string>();
  if (guardrails.selectionOnly) {
    if (!selection.size)
      issues.add(
        "Zuerst ein Bauteil auswählen oder „Nur Auswahl bearbeiten“ ausschalten.",
      );
    for (let previous = -1; previous !== selection.size;) {
      previous = selection.size;
      for (const element of before.elements)
        if (element.parentId && selection.has(element.parentId))
          selection.add(element.id);
    }
    function collect(value: unknown) {
      if (!value || typeof value !== "object") return;
      for (const [key, item] of Object.entries(value)) {
        if (
          (key === "measureId" || key.endsWith("MeasureId")) &&
          typeof item === "string"
        )
          measures.add(item);
        else if (item && typeof item === "object") collect(item);
      }
    }
    for (const element of before.elements)
      if (
        selection.has(element.id) ||
        (element.kind === "dimension" &&
          element.refs.some((ref) => selection.has(ref.elementId)))
      )
        collect(element);
  }
  const knownElements=new Map(before.elements.map(element=>[element.id,element])),knownMeasures=new Set(Object.keys(before.measurements));
  for (const op of operations) {
    if("measurements" in op)for(const id of Object.keys(op.measurements??{}))knownMeasures.add(id);
    const element =
      "elementId" in op
        ? knownElements.get(op.elementId)
        : undefined;
    if (
      ("elementId" in op && !element) ||
      (op.type === "set_design_target" && !knownMeasures.has(op.measureId)) ||
      (op.type === "set_inscription_layout" &&
        Object.entries(op).some(
          ([key, value]) =>
            key.endsWith("MeasureId") &&
            typeof value === "string" &&
            !knownMeasures.has(value),
        ))
    )
      return [
        "Der Vorschlag verweist auf ein Bauteil oder Maß, das im aktuellen Plan nicht vorhanden ist. Einen neuen Vorschlag zum aktuellen Stand anfordern.",
      ];
    if (guardrails.selectionOnly) {
      const allowed =
        op.type === "set_design_target"
          ? measures.has(op.measureId)
          : (op.type==='add_element'||op.type==='add_opening')
            ? selection.has(op.element.parentId??'')||('surfaceElementId' in op.element&&selection.has(op.element.surfaceElementId))||('wallId' in op.element&&selection.has(op.element.wallId))
            :op.type==='move_selection'?op.elementIds.every(id=>selection.has(id))
            : "elementId" in op && selection.has(op.elementId);
      if (!allowed)
        issues.add(
          "Der Vorschlag bearbeitet etwas außerhalb Ihrer Auswahl. Auswahl erweitern oder den ganzen Plan erlauben.",
        );
    }
    if (
      guardrails.preserveMeasurements &&
      (op.type === "set_design_target" ||
        (["move_element", "set_element_position"].includes(op.type) &&
          element &&
          ["node", "wall", "room"].includes(element.kind)))
    )
      issues.add(
        "Die gewählte Änderung kann Maße verändern. „Maßwerte beibehalten“ zuerst bewusst ausschalten.",
      );
    if (
      guardrails.preserveMeasurements &&
      op.type === "set_inscription_layout" &&
      element?.kind === "inscription"
    )
      for (const [key, value] of Object.entries(op))
        if (
          key.endsWith("MeasureId") &&
          value !== (element as unknown as Record<string, unknown>)[key]
        )
          issues.add(
            "Die gewählte Schriftänderung verändert einen Maßbezug. „Maßwerte beibehalten“ zuerst ausschalten.",
          );
    if(op.type==='add_element'||op.type==='add_opening'){
      knownElements.set(op.element.id,op.element);
      if(guardrails.selectionOnly){selection.add(op.element.id);for(const id of measureReferences(op.element))measures.add(id);}
    }else if(op.type==='remove_element')knownElements.delete(op.elementId);
    else if(op.type==='duplicate_element'&&element){knownElements.set(op.newId,{...element,id:op.newId});if(selection.has(element.id))selection.add(op.newId);}
  }
  if (
    guardrails.selectionOnly ||
    guardrails.preserveWording ||
    guardrails.preserveMeasurements
  ) {
    const after = applyOperations(before, operations);
    if (guardrails.selectionOnly) {
      // A shared measurement or wall node can affect geometry whose JSON target
      // was never named by the model. Check actual effects as well as direct IDs.
      const changedNodes = new Set(
        before.elements
          .filter(
            (e) =>
              e.kind === "node" &&
              JSON.stringify(e) !==
                JSON.stringify(after.elements.find((n) => n.id === e.id)),
          )
          .map((e) => e.id),
      );
      for (const element of before.elements) {
        if (
          selection.has(element.id) ||
          ["node", "dimension"].includes(element.kind)
        )
          continue;
        const next = after.elements.find((e) => e.id === element.id);
        if (
          JSON.stringify(element) !== JSON.stringify(next) ||
          [...measureReferences(element)].some(
            (id) =>
              before.measurements[id]?.valueMm !==
              after.measurements[id]?.valueMm,
          ) ||
          (element.kind === "wall" &&
            (changedNodes.has(element.startNodeId) ||
              changedNodes.has(element.endNodeId)))
        )
          issues.add(
            "Die Änderung wirkt auf weitere Bauteile außerhalb Ihrer Auswahl. Betroffene Bauteile mit auswählen oder den ganzen Plan erlauben.",
          );
      }
    }
    if (guardrails.preserveWording)
      for (const element of before.elements)
        if (element.kind === "inscription") {
          const next = after.elements.find((e) => e.id === element.id);
          if (
            next?.kind !== "inscription" ||
            next.exactText !== element.exactText
          )
            issues.add(
              "Der vorhandene Wortlaut ist geschützt. „Wortlaut beibehalten“ zuerst bewusst ausschalten.",
            );
        }
    if (guardrails.preserveMeasurements)
      for (const [id, measure] of Object.entries(before.measurements))
        if (after.measurements[id]?.valueMm !== measure.valueMm)
          issues.add(
            "Ein vorhandener Maßwert würde verändert. „Maßwerte beibehalten“ zuerst ausschalten.",
          );
  }
  return [...issues];
}
