// B3 — ICU inspector tests. Brain P6 (missing categories), P7 (dash in select), P8 (apostrophe/<...> escape).
import { describe, it, expect } from "vitest";
import { inspectIcu } from "../src/lib/icu-parse.js";

describe("icu inspector (P6/P7/P8)", () => {
  it("extracts the authored plural categories", () => {
    const r = inspectIcu("{count, plural, one {# item} few {# items} other {# items}}");
    expect(r.hasPlural).toBe(true);
    expect([...r.pluralCategories].sort()).toEqual(["few", "one", "other"]);
  });

  it("P6 — warns when a plural message misses categories the target locale needs (pl needs few/many)", () => {
    const r = inspectIcu("{count, plural, one {# element} other {# elementów}}", "pl");
    const p6 = r.warnings.find((w) => w.pitfall === "P6");
    expect(p6).toBeDefined();
    expect(p6?.message).toMatch(/few/);
    expect(p6?.message).toMatch(/many/);
  });

  it("P6 — no warning when the message is complete for the locale", () => {
    const r = inspectIcu("{count, plural, one {x} few {y} many {z} other {w}}", "pl");
    expect(r.warnings.some((w) => w.pitfall === "P6")).toBe(false);
  });

  it("P7 — flags a dash in a select value name (a locale code in a select)", () => {
    const r = inspectIcu("{loc, select, en-GB {British} other {default}}");
    expect(r.hasSelect).toBe(true);
    const p7 = r.warnings.find((w) => w.pitfall === "P7");
    expect(p7).toBeDefined();
    expect(p7?.message).toMatch(/en-GB/);
  });

  it("P8 — flags a prose apostrophe (French l') as a lossy-escape risk", () => {
    const r = inspectIcu("Vous n'avez aucun message");
    expect(r.warnings.some((w) => w.pitfall === "P8")).toBe(true);
  });

  it("P8 — flags a <...>-shaped literal (FormatJS INVALID_TAG, S8)", () => {
    const r = inspectIcu("The URL is <Issuer URL> here");
    expect(r.warnings.some((w) => w.pitfall === "P8")).toBe(true);
  });

  it("a clean English plural message authored for English has no P6 warning for English", () => {
    const r = inspectIcu("{count, plural, one {# item} other {# items}}", "en");
    expect(r.warnings.some((w) => w.pitfall === "P6")).toBe(false);
  });
});
