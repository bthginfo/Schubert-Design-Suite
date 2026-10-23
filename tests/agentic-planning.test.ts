import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import {
  createDesign,
  applyOperations,
  assistantGuardrailIssues,
  inverseOperations,
  targetMeasure,
  contourBounds,
} from "@schubert/geometry";
import type {
  DesignOperation,
  DesignSnapshot,
  InscriptionElement,
} from "@schubert/contracts";
import { planningDraftOperations } from "../packages/ai/src/planning-draft.js";
import {
  planningProposalReview,
  planChanges,
} from "../apps/web/src/lib/client/proposal-review.ts";
import type { AppData } from "../apps/web/src/lib/client/types.ts";
import { letteringLayout } from "../apps/web/src/lib/components/studio/lettering-layout.ts";
const unlocked = {
  preserveMeasurements: false,
  preserveWording: false,
  selectionOnly: false,
};
function fixture() {
  const empty = createDesign("memorial");
  const snapshot = applyOperations(
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
  Object.assign(snapshot.measurements, {
    letterHeight: targetMeasure("40"),
    letterGap: targetMeasure("12"),
    letterWidth: targetMeasure("600"),
  });
  const inscription: InscriptionElement = {
    id: "inscription",
    label: "Inschrift",
    kind: "inscription",
    parentId: snapshot.frames[0].id,
    phase: "planned",
    locked: false,
    sourceEvidenceVersionIds: [],
    surfaceElementId: stone.id,
    originUV: { uMm: "400", vMm: "600" },
    rotationDeg: "0",
    exactText: "Anna Müller\n* 12.03.1948  † 01.01.2025",
    fontVariantVersionId: "unassigned:font",
    previewFontKey: "cinzel",
    previewColor: "#dfc08a",
    referenceAssetVersionIds: [],
    renderingBasis: "shop_image_reference",
    requestedHeightMeasureId: "letterHeight",
    requestedLowercaseHeightMeasureId: null,
    requestedMaxWidthMeasureId: "letterWidth",
    lineGapMeasureId: "letterGap",
    supplyForm: "engraved",
    materialSpecVersionId: null,
    materialArticleReference: null,
    finishSpecVersionId: null,
    alignment: "center",
    glyphPlacements: [],
  };
  snapshot.elements.push(inscription);
  return { snapshot: applyOperations(snapshot, []), stone, inscription };
}
const editText = (text: string): DesignOperation => ({
  type: "set_inscription_text",
  elementId: "inscription",
  exactText: text,
});
function proposal(snapshot: DesignSnapshot, operations: DesignOperation[]) {
  return {
    commands: [
      {
        name: "planning.design.change",
        input: { base_revision_id: snapshot.revisionId, operations },
      },
    ],
  };
}
function data(snapshot: DesignSnapshot) {
  return {
    related: { revisions: [{ id: snapshot.revisionId, snapshot }] },
  } as unknown as AppData;
}

describe("Enforced AI edit boundaries", () => {
  it("rejects invented element, scalar measure and inscription binding IDs even with all optional locks off", () => {
    const { snapshot } = fixture();
    for (const op of [
      {
        type: "set_design_target",
        measureId: "invented-measure",
        valueMm: "250",
      },
      {
        type: "move_element",
        elementId: "invented-element",
        delta: { xMm: "10", yMm: "0", zMm: "0" },
      },
      {
        type: "set_inscription_layout",
        elementId: "inscription",
        requestedHeightMeasureId: "invented-height",
      },
    ] as DesignOperation[])
      expect(
        assistantGuardrailIssues(snapshot, [op], unlocked).join(" "),
      ).toContain("nicht vorhanden");
  });
  it("handles PostgreSQL JSONB key ordering without reporting unrelated elements as changed", () => {
    const { snapshot } = fixture();
    const reorder = (item: any): any =>
      Array.isArray(item)
        ? item.map(reorder)
        : item && typeof item === "object"
          ? Object.fromEntries(
              Object.entries(item)
                .reverse()
                .map(([key, v]) => [key, reorder(v)]),
            )
          : item;
    expect(
      assistantGuardrailIssues(
        reorder(snapshot),
        [
          {
            type: "set_inscription_layout",
            elementId: "inscription",
            alignment: "left",
          },
        ],
        { ...unlocked, selectionOnly: true },
        ["inscription"],
      ),
    ).toEqual([]);
  });
  it("preserves every Unicode inscription character and line break when wording is locked", () => {
    const { snapshot, inscription } = fixture();
    for (const text of [
      inscription.exactText.replace("Müller", "Muller"),
      inscription.exactText.replace("\n", " "),
      "",
    ])
      expect(
        assistantGuardrailIssues(snapshot, [editText(text)], {
          ...unlocked,
          preserveWording: true,
        }),
      ).not.toEqual([]);
    expect(
      assistantGuardrailIssues(snapshot, [editText(inscription.exactText)], {
        ...unlocked,
        preserveWording: true,
      }),
    ).toEqual([]);
    expect(
      assistantGuardrailIssues(
        snapshot,
        [editText("Bewusst neuer Wortlaut")],
        unlocked,
      ),
    ).toEqual([]);
  });
  it("allows inscription layout while protecting dimensions and exact wording", () => {
    const { snapshot } = fixture();
    expect(
      assistantGuardrailIssues(
        snapshot,
        [
          {
            type: "set_inscription_layout",
            elementId: "inscription",
            originUV: { uMm: "410", vMm: "620" },
            alignment: "center",
          },
        ],
        { ...unlocked, preserveMeasurements: true, preserveWording: true },
      ),
    ).toEqual([]);
    expect(
      assistantGuardrailIssues(
        snapshot,
        [
          {
            type: "set_inscription_layout",
            elementId: "inscription",
            requestedHeightMeasureId: "letterWidth",
          },
        ],
        { ...unlocked, preserveMeasurements: true },
      ),
    ).not.toEqual([]);
  });
  it("blocks nominal dimensions and structural node movement under measurement lock", () => {
    const { snapshot } = fixture();
    expect(
      assistantGuardrailIssues(
        snapshot,
        [
          {
            type: "set_design_target",
            measureId: "letterHeight",
            valueMm: "42",
          },
        ],
        { ...unlocked, preserveMeasurements: true },
      ),
    ).not.toEqual([]);
    const empty = createDesign("room_plan"),
      room = applyOperations(
        empty,
        planningDraftOperations(
          { snapshot: empty },
          {
            kind: "rectangular_room",
            label: "Bad",
            clearWidthMm: "4000",
            clearDepthMm: "3000",
            heightMm: "2600",
            wallThicknessMm: "200",
          },
        ),
      ),
      node = room.elements.find((e) => e.kind === "node")!;
    expect(
      assistantGuardrailIssues(
        room,
        [
          {
            type: "move_element",
            elementId: node.id,
            delta: { xMm: "20", yMm: "0", zMm: "0" },
          },
        ],
        { ...unlocked, preserveMeasurements: true },
      ),
    ).not.toEqual([]);
  });
  it("requires a real selection and refuses direct edits beyond it", () => {
    const { snapshot, stone } = fixture();
    expect(
      assistantGuardrailIssues(snapshot, [editText("Neu")], {
        ...unlocked,
        selectionOnly: true,
      }),
    ).not.toEqual([]);
    expect(
      assistantGuardrailIssues(
        snapshot,
        [editText("Neu")],
        { ...unlocked, selectionOnly: true },
        [stone.id],
      ),
    ).not.toEqual([]);
    expect(
      assistantGuardrailIssues(
        snapshot,
        [editText("Neu")],
        { ...unlocked, selectionOnly: true },
        ["inscription"],
      ),
    ).toEqual([]);
  });
  it("allows a selected stone’s driving dimension but refuses a shared measure affecting another stone", () => {
    const { snapshot, stone } = fixture();
    const dim = snapshot.elements.find(
      (e) => e.kind === "dimension" && e.refs[0].feature === "width",
    );
    if (dim?.kind !== "dimension") throw Error("fixture");
    expect(
      assistantGuardrailIssues(
        snapshot,
        [
          {
            type: "set_design_target",
            measureId: dim.measureId,
            valueMm: "850",
          },
        ],
        { ...unlocked, selectionOnly: true },
        [stone.id],
      ),
    ).toEqual([]);
    const second = {
      ...structuredClone(stone),
      id: "other",
      label: "Zweiter Stein",
    };
    snapshot.elements.push(second);
    expect(
      assistantGuardrailIssues(
        snapshot,
        [
          {
            type: "set_design_target",
            measureId:
              stone.kind === "stone_piece" ? stone.thicknessMeasureId : "",
            valueMm: "180",
          },
        ],
        { ...unlocked, selectionOnly: true },
        [stone.id],
      ).join(" "),
    ).toContain("weitere Bauteile");
  });
  it("detects an unselected neighboring wall changed through shared nodes", () => {
    const empty = createDesign("room_plan"),
      snapshot = applyOperations(
        empty,
        planningDraftOperations(
          { snapshot: empty },
          {
            kind: "rectangular_room",
            label: "Bad",
            clearWidthMm: "4000",
            clearDepthMm: "3000",
            heightMm: "2600",
            wallThicknessMm: "200",
          },
        ),
      ),
      wall = snapshot.elements.find((e) => e.kind === "wall")!;
    expect(
      assistantGuardrailIssues(
        snapshot,
        [
          {
            type: "move_element",
            elementId: wall.id,
            delta: { xMm: "20", yMm: "0", zMm: "0" },
          },
        ],
        { ...unlocked, selectionOnly: true },
        [wall.id],
      ).join(" "),
    ).toContain("weitere Bauteile");
  });
});

describe("Reversible, reviewable proposals", () => {
  it("restores the effective original font and color for older inscriptions without explicit preview defaults", () => {
    const { snapshot } = fixture(),
      text = snapshot.elements.find(
        (e) => e.kind === "inscription",
      ) as InscriptionElement;
    delete text.previewFontKey;
    delete text.previewColor;
    const original = letteringLayout(snapshot, text),
      ops: DesignOperation[] = [
        {
          type: "set_inscription_layout",
          elementId: text.id,
          previewFontKey: "lora",
          previewColor: "#ffffff",
        },
      ],
      after = applyOperations(snapshot, ops),
      undone = applyOperations(after, inverseOperations(snapshot, ops)!);
    expect(
      letteringLayout(
        undone,
        undone.elements.find((e) => e.id === text.id) as InscriptionElement,
      ),
    ).toEqual(original);
    expect(undone.elements.find((e) => e.id === text.id)).toMatchObject({
      exactText: text.exactText,
    });
  });
  it("includes physical walls, their joins and the room when only a reference node changes", () => {
    const empty = createDesign("room_plan"),
      snapshot = applyOperations(
        empty,
        planningDraftOperations(
          { snapshot: empty },
          {
            kind: "rectangular_room",
            label: "Bad",
            clearWidthMm: "4000",
            clearDepthMm: "3000",
            heightMm: "2600",
            wallThicknessMm: "200",
          },
        ),
      ),
      node = snapshot.elements.find((e) => e.kind === "node")!;
    const review = planningProposalReview(
      data(snapshot),
      proposal(snapshot, [
        {
          type: "move_element",
          elementId: node.id,
          delta: { xMm: "20", yMm: "0", zMm: "0" },
        },
      ]),
    );
    expect(review?.error).toBeNull();
    const ids = new Set(review?.changes?.map((c) => c.id));
    expect(
      snapshot.elements.filter((e) => e.kind === "wall" && ids.has(e.id))
        .length,
    ).toBeGreaterThanOrEqual(2);
    expect(ids.has(snapshot.elements.find((e) => e.kind === "room")!.id)).toBe(
      true,
    );
  });
  it("includes an inscription that follows its moved host without claiming a wording change", () => {
    const { snapshot, stone } = fixture(),
      review = planningProposalReview(
        data(snapshot),
        proposal(snapshot, [
          {
            type: "move_element",
            elementId: stone.id,
            delta: { xMm: "10", yMm: "0", zMm: "0" },
          },
        ]),
      );
    expect(review?.error).toBeNull();
    expect(review?.changes?.some((change) => change.id === "inscription")).toBe(
      true,
    );
    expect(review?.wordingUnchanged).toBe(true);
  });
  it("shows every inscription change together, including changed measure bindings and supplier choices", () => {
    const { snapshot } = fixture(),
      after = applyOperations(snapshot, [
        editText("Bewusst neuer Text"),
        {
          type: "set_inscription_layout",
          elementId: "inscription",
          requestedHeightMeasureId: "letterWidth",
          previewFontKey: "lora",
          materialArticleReference: "TEST-ARTIKEL",
        },
      ]),
      fields = planChanges(snapshot, after).find(
        (c) => c.id === "inscription",
      )!.fields;
    expect(fields).toContainEqual({
      label: "Schrifthöhe",
      before: "40 mm",
      after: "600 mm (anderer Maßbezug)",
    });
    expect(fields).toContainEqual({
      label: "Entwurfsschrift",
      before: "Cinzel",
      after: "Lora",
    });
    expect(fields).toContainEqual({
      label: "Herstellerartikel",
      before: "Nicht festgelegt",
      after: "TEST-ARTIKEL",
    });
    expect(fields.some((f) => f.label === "Wortlaut")).toBe(true);
  });
  for (const kind of ["memorial", "room_plan"] as const)
    it(`undoes a complete ${kind} first draft, including forward references`, () => {
      const before = createDesign(kind),
        operations = planningDraftOperations(
          { snapshot: before },
          kind === "memorial"
            ? {
                kind: "memorial_slab",
                label: "Stein",
                widthMm: "800",
                heightMm: "1200",
                thicknessMm: "160",
              }
            : {
                kind: "rectangular_room",
                label: "Bad",
                clearWidthMm: "4000",
                clearDepthMm: "3000",
                heightMm: "2600",
                wallThicknessMm: "200",
              },
        ),
        after = applyOperations(before, operations),
        inverse = inverseOperations(before, operations);
      expect(inverse?.length).toBeGreaterThan(0);
      const restored = applyOperations(after, inverse!);
      expect(restored.elements).toEqual(before.elements);
      expect(restored.constraints).toEqual(before.constraints);
      expect(after.elements.length).toBeGreaterThan(0);
    });
  it("does not delete later unrelated work when applying an inverse to a new revision", () => {
    const { snapshot } = fixture(),
      operations = [editText("Bewusst neuer Wortlaut")],
      after = applyOperations(snapshot, operations);
    after.revisionId = randomUUID();
    const later = {
      id: "later-note",
      label: "Spätere Notiz",
      parentId: after.frames[0].id,
      phase: "planned" as const,
      locked: false,
      sourceEvidenceVersionIds: [],
      kind: "technical_note" as const,
      point: { xMm: "0", yMm: "0", zMm: "0" },
      text: "Diese spätere Arbeit bleibt erhalten.",
      category: "information" as const,
      ruleVersionId: null,
    };
    after.elements.push(later);
    const restored = applyOperations(
      after,
      inverseOperations(snapshot, operations)!,
    );
    expect(restored.elements.find((e) => e.id === "later-note")).toEqual(later);
    expect(
      restored.elements.find((e) => e.kind === "inscription"),
    ).toMatchObject({ exactText: fixture().inscription.exactText });
  });
  it("lists literal old/new wording and exact decimal dimension changes", () => {
    const { snapshot } = fixture();
    const after = applyOperations(snapshot, [
        editText("Anna Müller\n* 12.03.1948  † 02.01.2025"),
        {
          type: "set_design_target",
          measureId: "letterHeight",
          valueMm: "42.5",
        },
      ]),
      changes = planChanges(snapshot, after);
    expect(changes.find((c) => c.id === "inscription")?.fields[0]).toEqual({
      label: "Wortlaut",
      before: fixture().inscription.exactText,
      after: "Anna Müller\n* 12.03.1948  † 02.01.2025",
    });
    expect(
      changes.find((c) => c.id === "measure:letterHeight")?.fields[0],
    ).toMatchObject({ before: "40 mm", after: "42,5 mm" });
  });
  it("uses one shared comparison frame and reports unchanged dimensions truthfully", () => {
    const { snapshot } = fixture(),
      review = planningProposalReview(
        data(snapshot),
        proposal(snapshot, [editText("Anna Müller\nNeue Zeile")]),
      );
    expect(review?.error).toBeNull();
    expect(review?.wordingUnchanged).toBe(false);
    expect(review?.measurementsUnchanged).toBe(true);
    expect(review?.box.split(" ").map(Number).every(Number.isFinite)).toBe(
      true,
    );
    expect(review?.inverse).toHaveLength(1);
  });
  it("shows dimensions of a new stone and blocks missing revision previews", () => {
    const before = createDesign("memorial"),
      operations = planningDraftOperations(
        { snapshot: before },
        {
          kind: "memorial_slab",
          label: "Stein",
          widthMm: "800",
          heightMm: "1200",
          thicknessMm: "160",
        },
      ),
      review = planningProposalReview(
        data(before),
        proposal(before, operations),
      );
    expect(
      review?.changes?.find((c) => c.label === "Stein")?.fields,
    ).toContainEqual({
      label: "Außenmaße der Steinfläche",
      before: "Noch nicht vorhanden",
      after: "800 × 1200 mm",
    });
    expect(
      planningProposalReview(
        data(before),
        proposal({ ...before, revisionId: randomUUID() }, operations),
      )?.error,
    ).toContain("nicht mehr geladen");
    expect(
      contourBounds(
        (review?.after?.elements.find((e) => e.kind === "stone_piece") as any)
          .finishedContour,
      ).width,
    ).toBe("800");
  });
});
