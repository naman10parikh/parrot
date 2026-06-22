// B3 — plural-category resolver tests. The brain S3/P6/O7 canary: Polish needs few/many; an {one, other}
// catalog is INCOMPLETE for Polish (the silent wrong-plural bug). Resolution is via native Intl.PluralRules (O9).
import { describe, it, expect } from "vitest";
import { categoryFor, requiredCategoriesFor, pluralGap, canaryCategories, type PluralCategory } from "../src/lib/plural.js";

describe("plural resolver (S3/P6/O9)", () => {
  it("Intl.PluralRules('pl').select(5) resolves 'many' (native CLDR data, not hand-rolled)", () => {
    expect(categoryFor("pl", 5)).toBe("many");
    expect(categoryFor("pl", 2)).toBe("few");
    expect(categoryFor("pl", 1)).toBe("one");
  });

  it("Polish requires one/few/many/other (4 categories), English only one/other (2)", () => {
    expect(requiredCategoriesFor("pl").sort()).toEqual(["few", "many", "one", "other"]);
    expect(requiredCategoriesFor("en").sort()).toEqual(["one", "other"]);
  });

  it("Arabic uses all six categories incl. zero/two", () => {
    const ar = requiredCategoriesFor("ar");
    expect(ar).toContain("zero");
    expect(ar).toContain("two");
    expect(ar).toContain("few");
    expect(ar).toContain("many");
  });

  it("flags a pl catalog authored as {one, other} as missing [few, many]", () => {
    const authored = new Set<PluralCategory>(["one", "other"]);
    const gap = pluralGap(authored, "pl");
    expect(gap.complete).toBe(false);
    expect(gap.missing).toEqual(["few", "many"]);
  });

  it("an {one, few, many, other} pl catalog is complete", () => {
    const authored = new Set<PluralCategory>(["one", "few", "many", "other"]);
    expect(pluralGap(authored, "pl").complete).toBe(true);
  });

  it("the canary: count 2 and 5 map to DIFFERENT categories in pl (so they cannot be 'done from English')", () => {
    const c = canaryCategories("pl", [1, 2, 5]);
    expect(c.get(2)).not.toBe(c.get(5)); // few vs many — English would collapse both to 'other'
    // sanity: in English 2 and 5 ARE the same category
    const e = canaryCategories("en", [2, 5]);
    expect(e.get(2)).toBe(e.get(5));
  });
});
