import { z } from "zod";
import type { DesignSnapshot } from "./planning.js";

export const planningPresets = [
  {
    id: "memorial_new",
    kind: "memorial",
    label: "Neues Grabmal",
    hint: "Stein, Maße und gewünschte Inschrift",
    firstElement: "stone_piece",
    purpose: "memorial",
  },
  {
    id: "memorial_existing",
    kind: "memorial",
    label: "Nachbeschriftung",
    hint: "Bestand dokumentieren und neuen Wortlaut ergänzen",
    firstElement: "stone_piece",
    purpose: "memorial",
  },
  {
    id: "room_bath",
    kind: "room_plan",
    label: "Bad / Raumaufmaß",
    hint: "Innenmaße, Wandstärken und Öffnungen",
    firstElement: "room",
    purpose: "countertop",
  },
  {
    id: "stone_countertop",
    kind: "room_plan",
    label: "Waschtisch / Arbeitsplatte",
    hint: "Plattenmaße, Material und benötigte Ausschnitte",
    firstElement: "stone_piece",
    purpose: "countertop",
  },
  {
    id: "stone_sill",
    kind: "room_plan",
    label: "Fensterbank",
    hint: "Länge, Tiefe, Stärke und Einbaubezüge",
    firstElement: "stone_piece",
    purpose: "sill",
  },
] as const;
export const planningPresetSchema = z.enum([
  "memorial_new",
  "memorial_existing",
  "room_bath",
  "stone_countertop",
  "stone_sill",
]);
export type PlanningPreset = z.infer<typeof planningPresetSchema>;
export function planningPreset(value: unknown, kind: string) {
  return (
    planningPresets.find((p) => p.id === value && p.kind === kind) ??
    planningPresets.find((p) => p.kind === kind)!
  );
}
export function planningProgress(snapshot: DesignSnapshot, presetId?: unknown) {
  const preset = planningPreset(presetId, snapshot.kind),
    active = snapshot.elements.filter((e) => e.phase !== "demolition");
  const hasBase = active.some((e) =>
    preset.firstElement === "room"
      ? e.kind === "room" || e.kind === "wall"
      : e.kind === "stone_piece",
  );
  return {
    preset,
    hasBase,
    hasInscription: active.some(
      (e) =>
        e.kind === "inscription" &&
        (preset.id !== "memorial_existing" || e.phase === "planned"),
    ),
    hasDesign: active.some((e) =>
      snapshot.kind === "memorial"
        ? e.kind === "inscription" &&
          (preset.id !== "memorial_existing" || e.phase === "planned")
        : e.kind === "stone_piece" ||
          e.kind === "surface" ||
          e.kind === "catalog_object",
    ),
  };
}
