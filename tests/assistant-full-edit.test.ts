import { describe, it, expect } from "vitest";
import {
  createDesign,
  applyOperations,
  rectangleContour,
  assistantGuardrailIssues,
} from "@schubert/geometry";
import {
  assistantActionCatalog,
  planningOperationAllowed,
  type DesignSnapshot,
} from "@schubert/contracts";
import {
  normalizePlanningEdits,
  initialPlanningOperations,
  planningEditInstructions,
} from "../packages/ai/src/planning-edits.js";
import { planningDraftOperations } from "../packages/ai/src/planning-draft.js";
import { rolePermissions } from "@schubert/domain";
function fixture() {
  const empty = createDesign("memorial");
  let snapshot = applyOperations(
    empty,
    planningDraftOperations(
      { snapshot: empty },
      {
        kind: "memorial_slab",
        label: "Stein",
        widthMm: "800",
        heightMm: "1200",
        thicknessMm: "160",
      },
    ),
  );
  const stone = snapshot.elements.find((e) => e.kind === "stone_piece")!;
  snapshot = applyOperations(
    snapshot,
    normalizePlanningEdits({ snapshot }, [
      { type: "add_inscription", exactText: "dwadwadwadwa" },
    ]),
  );
  const text = snapshot.elements.find((e) => e.kind === "inscription")!;
  return { snapshot, stone, text };
}
const unlocked = {
  preserveMeasurements: false,
  preserveWording: false,
  selectionOnly: false,
};
describe("Complete editable AI drafts", () => {
  it('scopes reused new measurement labels to their own components without changing an earlier stone',()=>{
    const snapshot=createDesign('memorial');
    const operations=normalizePlanningEdits({snapshot},['120','180'].map((value,index)=>({type:'add_element',element:{id:'new:piece:'+index,kind:'stone_piece',label:'Stein '+index,widthMm:'600',heightMm:'900',thicknessMeasureId:'new:thickness'},measurements:{'new:thickness':{valueMm:value}}})));
    const after=applyOperations(snapshot,operations),stones=after.elements.filter(e=>e.kind==='stone_piece');
    expect(stones.map(e=>after.measurements[e.thicknessMeasureId].valueMm)).toEqual(['120','180']);
    expect(stones[0].thicknessMeasureId).not.toBe(stones[1].thicknessMeasureId);
  });
  it.each(['base','plinth','pedestal','Sockel'])('keeps the memorial purpose of a %s without inventing a new manufacturing category', purpose => {
    const snapshot=createDesign('memorial');
    const operations=normalizePlanningEdits({snapshot},[{type:'add_element',element:{id:'new:base',kind:'stone_piece',label:'Sockel',purpose,widthMm:'700',heightMm:'140',thicknessMm:'180'}}]);
    const saved=applyOperations(snapshot,operations);
    expect(saved.elements.find(e=>e.kind==='stone_piece')).toMatchObject({label:'Sockel',purpose:'memorial'});
    expect(planningEditInstructions).toContain('originUV hat exakt {uMm:');
    expect(planningEditInstructions).toContain('notoserif|cinzel|lora|cormorantgaramond|greatvibes|montserrat');
  });

  it('preserves an untouched draft and offers plain German recovery for unsupported model fields', () => {
    const snapshot=createDesign('memorial'),before=structuredClone(snapshot);
    expect(()=>normalizePlanningEdits({snapshot},[{type:'add_element',element:{id:'new:base',kind:'stone_piece',label:'Sockel',purpose:'not-a-purpose',widthMm:'700',heightMm:'140',thicknessMm:'180'}}])).toThrow(/Sockel.*Verwendungszweck.*Plan bleibt unverändert/);
    expect(snapshot).toEqual(before);
  });
  it("replaces a placeholder literally with the requested birth and death symbols in every step", () => {
    const { snapshot, text } = fixture(),
      exactText = "Anna Müller\n* 1948\n† 2025";
    for (const step of ["geometry", "design", "review", "output"] as const) {
      expect(planningOperationAllowed(step, "set_inscription_text")).toBe(true);
      const ops = normalizePlanningEdits({ snapshot }, [
        { type: "set_inscription_text", elementId: text.id, exactText },
      ]);
      expect(assistantGuardrailIssues(snapshot, ops, unlocked)).toEqual([]);
      expect(
        applyOperations(snapshot, ops).elements.find((e) => e.id === text.id),
      ).toMatchObject({ exactText });
    }
    expect(text).toMatchObject({ exactText: "dwadwadwadwa" });
  });
  it("continues a surveyed inscription as a planned revision without mutating its original snapshot", () => {
    const { snapshot, text } = fixture();
    Object.assign(text, { phase: "existing", locked: true });
    const original = structuredClone(snapshot);
    const ops = normalizePlanningEdits({ snapshot }, [
      {
        type: "set_inscription_text",
        elementId: text.id,
        exactText: "Neue Fassung",
      },
    ]);
    expect(ops.map((op) => op.type)).toEqual([
      "plan_inscription_revision",
      "set_inscription_text",
    ]);
    expect(
      applyOperations(snapshot, ops).elements.find((e) => e.id === text.id),
    ).toMatchObject({ phase: "planned", exactText: "Neue Fassung" });
    expect(snapshot).toEqual(original);
  });
  it("adds a separate inscription with inherited typography and independent AI plan measures", () => {
    const { snapshot, text, stone } = fixture();
    const ops = normalizePlanningEdits({ snapshot }, [
      {
        type: "add_inscription",
        id: "new:second",
        surfaceElementId: stone.id,
        exactText: "Karl Müller\n* 1945 † 2026",
      },
      {
        type: "set_inscription_layout",
        elementId: "new:second",
        alignment: "left",
      },
    ]);
    const after = applyOperations(snapshot, ops),
      added = after.elements.find(
        (e) => e.kind === "inscription" && e.id !== text.id,
      )!;
    expect(added).toMatchObject({
      kind: "inscription",
      alignment: "left",
      previewFontKey: (text as any).previewFontKey,
    });
    expect(
      assistantGuardrailIssues(
        snapshot,
        ops,
        { ...unlocked, selectionOnly: true },
        [stone.id],
      ),
    ).toEqual([]);
    if (added.kind === "inscription") {
      expect(after.measurements[added.requestedHeightMeasureId]).toMatchObject({
        origin: "ai",
        reviewStatus: "unreviewed",
        valueMm: "40",
      });
      expect(added.requestedHeightMeasureId).not.toBe(
        (text as any).requestedHeightMeasureId,
      );
    }
  });
  it("normalizes complete contour, duplication, naming and deletion operations rather than a six-operation whitelist", () => {
    const { snapshot, stone } = fixture();
    const ops = normalizePlanningEdits({ snapshot }, [
      {
        type: "set_stone_spec",
        elementId: stone.id,
        finishedContour: rectangleContour("900", "1300"),
      },
      {
        type: "duplicate_element",
        elementId: stone.id,
        newId: "new:copy",
        offset: { xMm: "1100", yMm: "0", zMm: "0" },
      },
      { type: "rename_element", elementId: "new:copy", label: "Zweiter Stein" },
      { type: "remove_element", elementId: "new:copy" },
    ]);
    const after = applyOperations(snapshot, ops);
    expect(after.elements.filter((e) => e.kind === "stone_piece")).toHaveLength(
      1,
    );
    expect(after.elements.find((e) => e.id === stone.id)).toMatchObject({
      finishedContour: rectangleContour("900", "1300"),
    });
  });
  it("edits a locked working element and restores its draft lock without altering the historic model", () => {
    const { snapshot, stone } = fixture();
    snapshot.elements.find((element) => element.id === stone.id)!.locked = true;
    const operations = normalizePlanningEdits({ snapshot }, [
      {
        type: "rename_element",
        elementId: stone.id,
        label: "Neuer Entwurfsname",
      },
    ]);
    expect(
      applyOperations(snapshot, operations).elements.find(
        (element) => element.id === stone.id,
      ),
    ).toMatchObject({ label: "Neuer Entwurfsname", locked: true });
    expect(stone.label).toBe("Stein");
  });
  it("keeps literal wording and labels unchanged even when they match a model-supplied local ID", () => {
    const { snapshot, stone } = fixture();
    const operations = normalizePlanningEdits({ snapshot }, [
      {
        type: "add_inscription",
        id: "Anna",
        label: "Anna",
        exactText: "Anna",
        surfaceElementId: stone.id,
      },
      { type: "set_inscription_layout", elementId: "Anna", alignment: "left" },
    ]);
    const added = applyOperations(snapshot, operations).elements.find(
      (element) =>
        element.kind === "inscription" && element.exactText === "Anna",
    );
    expect(added).toMatchObject({
      label: "Anna",
      exactText: "Anna",
      alignment: "left",
    });
    expect(added?.id).not.toBe("Anna");
  });
  it("uses the full model for batch changes even when a displayed model was shortened", () => {
    const { snapshot, text } = fixture();
    const added = normalizePlanningEdits({ snapshot }, [
      { type: "add_inscription", exactText: "Zweite Inschrift" },
    ]);
    const full = applyOperations(snapshot, added);
    const ops = normalizePlanningEdits({ snapshot: full }, [
      {
        type: "apply_to_elements",
        elementIds: "all_inscriptions",
        operation: { type: "set_inscription_layout", previewColor: "#ffffff" },
      },
    ]);
    expect(ops).toHaveLength(2);
    expect(
      applyOperations(full, ops)
        .elements.filter((e) => e.kind === "inscription")
        .every((e) => e.previewColor === "#ffffff"),
    ).toBe(true);
  });
  it("keeps attestations unavailable and refuses forged confirmed measurements", () => {
    const { snapshot, stone } = fixture();
    for (const type of [
      "confirm_design_target",
      "record_survey_measurement",
      "set_inscription_originals",
      "unknown",
    ])
      expect(planningOperationAllowed("design", type)).toBe(false);
    expect(() =>
      normalizePlanningEdits({ snapshot }, [
        {
          type: "set_design_target",
          measureId: (stone as any).thicknessMeasureId,
          valueMm: "200",
          confirm: true,
        },
      ]),
    ).toThrow(/nicht fachlich bestätigt/);
    expect(() =>
      normalizePlanningEdits({ snapshot }, [
        {
          type: "add_inscription",
          exactText: "Test",
          measurements: {
            "new:forged": { valueMm: "40", reviewStatus: "confirmed" },
          },
        },
      ]),
    ).toThrow(/bestätigt kein Aufmaß/);
  });
  it("binds a paper sketch to checked original and preview bytes without inventing a scale", () => {
    const snapshot = createDesign("room_plan"),
      source = {
        documentId: "original",
        documentVersionId: "v1",
        sourceHash: "a".repeat(64),
        pageIndex: 0,
        name: "Badskizze",
        imagePreview: {
          documentId: "preview",
          documentVersionId: "v2",
          hash: "b".repeat(64),
          width: 1440,
          height: 900,
        },
      };
    const ops = initialPlanningOperations({ snapshot, sources: [source] });
    const after = applyOperations(snapshot, ops);
    expect(after.elements).toHaveLength(1);
    expect(after.elements[0]).toMatchObject({
      kind: "plan_reference",
      sourceDocumentId: "original",
      sourceDocumentVersionId: "v1",
      sourceHash: source.sourceHash,
      widthPx: 1440,
      calibration: { segments: [], reviewStatus: "unreviewed" },
    });
    expect(after.measurements).toEqual({});
    expect(() =>
      normalizePlanningEdits({ snapshot, sources: [] }, [
        {
          type: "add_element",
          element: { kind: "plan_reference", sourceDocumentId: "forged" },
        },
      ]),
    ).toThrow(/vorbereiten/);
  });
  it("creates an initial model with stated dimensions and additional inscription in one draft", () => {
    const snapshot = createDesign("memorial");
    const ops = initialPlanningOperations(
      { snapshot },
      {
        draft: {
          kind: "memorial_slab",
          label: "Grabmal",
          widthMm: "800",
          heightMm: "1200",
          thicknessMm: "160",
        },
        operations: [
          { type: "add_inscription", exactText: "Anna\n* 1948 † 2025" },
        ],
      },
    );
    expect(
      applyOperations(snapshot, ops).elements.some(
        (e) => e.kind === "inscription" && e.exactText.startsWith("Anna"),
      ),
    ).toBe(true);
  });
  it("offers authorized business drafts and binds updates to the current record version", () => {
    const customer = {
      module: "customers",
      id: "visible",
      version: 7,
      status: "draft",
    };
    const actions = assistantActionCatalog(
      rolePermissions.Owner,
      customer,
      "Owner",
    );
    expect(actions.find((a) => a.name === "sales.order.create")).toBeDefined();
    expect(actions.find((a) => a.name === "crm.customer.update")).toMatchObject(
      { targetId: "visible", baseVersion: 7 },
    );
    expect(
      assistantActionCatalog(
        rolePermissions.Owner,
        { ...customer, status: "issued" },
        "Owner",
      ).some((a) => a.name.endsWith(".update")),
    ).toBe(false);
    expect(
      assistantActionCatalog(
        rolePermissions.Employee,
        customer,
        "Employee",
      ).some((a) => a.name === "sales.order.create"),
    ).toBe(false);
    expect(
      actions.some((a) => /send|approve|issue|release|payment/.test(a.name)),
    ).toBe(false);
  });
});
