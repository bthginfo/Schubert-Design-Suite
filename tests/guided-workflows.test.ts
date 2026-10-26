import { describe, it, expect } from "vitest";
import { createDesign } from "@schubert/geometry";
import {
  planningPresets,
  planningPreset,
  planningProgress,
  clarificationControls,
  assistantClarificationSchema,
  planningStepLabel,
  planningStepInstructions,
} from "@schubert/contracts";
import { routeModel } from "../packages/ai/src/model-routing.ts";
describe("Task presets keep manual source values and studio scope", () => {
  it("keeps the task-specific AI geometry brief and UI labels aligned without requiring a room for a sill", () => {
    expect(planningStepLabel("room_plan", "geometry", "stone_sill")).toBe(
      "Bauteil & Maße",
    );
    expect(planningStepLabel("memorial", "geometry", "memorial_existing")).toBe(
      "Bestand & Maße",
    );
    expect(
      planningStepInstructions("room_plan", "geometry", "stone_sill"),
    ).toContain("Fensterbank");
    const model = routeModel({}, "standard", {
      entityType: "planning",
      designKind: "room_plan",
      project: { workflow_preset: "stone_sill" },
      workflow: { step: "geometry", label: "Bauteil & Maße" },
    });
    expect(model.instructions).toContain("Fensterbank");
    expect(model.instructions).not.toContain("Nur Raumgeometrie");
    expect(planningStepInstructions("room_plan", "geometry")).toContain(
      "Schwerpunkt: Raumgeometrie",
    );
  });
  it("keeps an existing inscription as stock evidence and requires new planned text for an addition", () => {
    const snapshot = createDesign("memorial");
    snapshot.elements = [
      { kind: "stone_piece", phase: "existing" },
      { kind: "inscription", phase: "existing" },
    ] as any;
    expect(planningProgress(snapshot, "memorial_existing")).toMatchObject({
      hasBase: true,
      hasInscription: false,
      hasDesign: false,
    });
    snapshot.elements.push({ kind: "inscription", phase: "planned" } as any);
    expect(planningProgress(snapshot, "memorial_existing").hasDesign).toBe(
      true,
    );
  });
  it("has German task entries without suggested or fabricated measurements", () => {
    expect(planningPresets.map((p) => p.label)).toEqual([
      "Neues Grabmal",
      "Nachbeschriftung",
      "Bad / Raumaufmaß",
      "Waschtisch / Arbeitsplatte",
      "Fensterbank",
    ]);
    expect(planningPresets.every((p) => !("measurements" in p))).toBe(true);
    expect(planningPreset("stone_sill", "memorial").id).toBe("memorial_new");
  });
  it("requires a stone for a window sill and a room for room intake; removed elements do not advance the workflow", () => {
    const snapshot = createDesign("room_plan");
    snapshot.elements = [{ kind: "room", phase: "planned" }] as any;
    expect(planningProgress(snapshot, "room_bath").hasBase).toBe(true);
    expect(planningProgress(snapshot, "stone_sill").hasBase).toBe(false);
    snapshot.elements = [{ kind: "stone_piece", phase: "demolition" }] as any;
    expect(planningProgress(snapshot, "stone_sill").hasBase).toBe(false);
    snapshot.elements[0].phase = "planned";
    const before = structuredClone(snapshot);
    expect(planningProgress(snapshot, "stone_sill").hasBase).toBe(true);
    expect(snapshot).toEqual(before);
  });
});
describe("Typed clarification controls are bounded and decorate only actual questions", () => {
  it("keeps old text questions and rejects unrelated controls", () => {
    expect(
      clarificationControls(
        ["Wie breit?"],
        [{ question: "Andere Frage", kind: "length", options: [] }],
      ),
    ).toEqual([{ question: "Wie breit?", kind: "text", options: [] }]);
    expect(clarificationControls(["Text?"], undefined)[0].kind).toBe("text");
  });
  it("accepts real scalar/choice/material controls and rejects unbounded or meaningless choices", () => {
    expect(
      clarificationControls(
        ["Breite?"],
        [{ question: "Breite?", kind: "length", options: [] }],
      )[0].kind,
    ).toBe("length");
    expect(
      assistantClarificationSchema.safeParse({
        question: "Ausführung?",
        kind: "choice",
        options: ["Poliert", "Geschliffen"],
      }).success,
    ).toBe(true);
    expect(
      assistantClarificationSchema.safeParse({
        question: "Ausführung?",
        kind: "choice",
        options: ["Poliert"],
      }).success,
    ).toBe(false);
    expect(
      assistantClarificationSchema.safeParse({
        question: "Material?",
        kind: "execute_command",
        options: [],
      }).success,
    ).toBe(false);
  });
});

import { parseManufacturerDelivery } from "../packages/application/src/manufacturer-delivery-parser.ts";
import { manufacturerDeliverySchema } from "@schubert/contracts";
const delivery = {
  source_document_version_id: "00000000-0000-4000-8000-000000000001",
  source_url:
    "https://pro.duravit.de/pro/html/default/downloadcenter.de-de.html",
  label: "TEST · DE-Lieferung",
  unit: "cm" as const,
  mapping: {
    article: "Artikel",
    name: "Name",
    width: "Breite",
    depth: "Tiefe",
    height: "Höhe",
  },
};
describe("Manufacturer delivery parser", () => {
  it("preserves real SKU strings, converts explicitly mapped units and leaves missing dimensions unknown", () => {
    const result = parseManufacturerDelivery(
      Buffer.from(
        " Artikel ; Name ;Breite;Tiefe;Höhe\n001234;TEST Waschtisch;60,5;46;\n",
      ),
      delivery,
    );
    expect(result.items[0]).toMatchObject({
      article: "001234",
      width: "605",
      depth: "460",
      height: null,
      row: 2,
    });
  });
  it("rejects duplicate identities, ambiguous dimensions and foreign market URLs", () => {
    expect(() =>
      parseManufacturerDelivery(
        Buffer.from(
          "Artikel;Name;Breite;Tiefe;Höhe\n123456;TEST A;1,2,3;46;\n",
        ),
        delivery,
      ),
    ).toThrow();
    expect(() =>
      parseManufacturerDelivery(
        Buffer.from(
          "Artikel;Name;Breite;Tiefe;Höhe\n123456;TEST A;60;46;\n123456;TEST B;60;46;\n",
        ),
        delivery,
      ),
    ).toThrow();
    expect(
      manufacturerDeliverySchema.safeParse({
        ...delivery,
        source_url: "https://www.duravit.com/en-us/",
      }).success,
    ).toBe(false);
  });
  it("reports malformed encoding and CSV as actionable domain errors and ignores delimiters inside quoted headers", () => {
    expect(() =>
      parseManufacturerDelivery(new Uint8Array([0xff]), delivery),
    ).toThrow(/UTF-8/);
    expect(() =>
      parseManufacturerDelivery(
        Buffer.from(
          "Artikel;Name;Breite;Tiefe;Höhe\n123456;TEST A;60;46;extra;wrong\n",
        ),
        delivery,
      ),
    ).toThrow(/gleich viele Spalten/);
    const input = {
      ...delivery,
      mapping: { ...delivery.mapping, name: "Name; Bezeichnung" },
    };
    expect(
      parseManufacturerDelivery(
        Buffer.from(
          'Artikel,"Name; Bezeichnung",Breite,Tiefe,Höhe\n123456,TEST A,60,46,\n',
        ),
        input,
      ).items[0].name,
    ).toBe("TEST A");
  });
});
