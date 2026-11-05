import { describe, expect, it } from "vitest";
import { assistantRequestDay } from "@schubert/contracts";
import { assistantDispatchTime } from "./suite-actions.js";

describe("calendar grounding for the assistant", () => {
  it("retains explicitly requested dates, including a different year", () => {
    for (const date of ["10. Juli 2031", "10.07.2031", "2031-07-10"])
      expect(assistantRequestDay("Montage am " + date, "2026-11-05")).toBe("2031-07-10");
  });

  it("resolves relative days without inventing an ambiguous date", () => {
    expect(assistantRequestDay("Einsatz übermorgen", "2026-12-31")).toBe("2027-01-02");
    expect(assistantRequestDay("Heute oder morgen?", "2026-12-31")).toBeUndefined();
    expect(assistantRequestDay("Am Morgen", "2026-12-31")).toBeUndefined();
    expect(assistantRequestDay("31. Februar 2031", "2026-11-05")).toBeUndefined();
  });

  it("converts Berlin time in summer and winter and rejects ambiguous clock changes", () => {
    expect(assistantDispatchTime("2031-07-10T08:00")).toBe("2031-07-10T06:00:00.000Z");
    expect(assistantDispatchTime("2031-12-10T08:00")).toBe("2031-12-10T07:00:00.000Z");
    expect(() => assistantDispatchTime("2026-10-25T02:30")).toThrow(/Zeitumstellung/);
    expect(() => assistantDispatchTime("2026-03-29T02:30")).toThrow(/Zeitumstellung/);
  });
});
