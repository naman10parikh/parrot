// B3 — BCP-47 validator tests. The brain S11/P16 canaries: reject `es-la` (Laos), `me` (Montenegro),
// `en-uk` (Ukraine); accept `es-419`, `en-GB`, and bare languages.
import { describe, it, expect } from "vitest";
import { validateBcp47, isValidBcp47 } from "../src/lib/bcp47.js";

describe("bcp47 validator (S11/P16)", () => {
  it("rejects es-la (la = Laos, not Latin America) and suggests es-419", () => {
    const r = validateBcp47("es-la");
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/Laos/i);
    expect(r.suggestion).toBe("es-419");
  });

  it("rejects en-uk (uk = Ukraine; UK region is GB) and suggests en-GB", () => {
    const r = validateBcp47("en-uk");
    expect(r.valid).toBe(false);
    expect(r.suggestion).toBe("en-GB");
  });

  it("rejects bare `me` (Montenegro, not 'Middle East')", () => {
    expect(isValidBcp47("me")).toBe(false);
  });

  it("accepts es-419 (Latin America, UN M.49 region)", () => {
    expect(isValidBcp47("es-419")).toBe(true);
  });

  it("accepts en-GB (correct UK tag)", () => {
    expect(isValidBcp47("en-GB")).toBe(true);
  });

  it("accepts bare languages and script subtags", () => {
    expect(isValidBcp47("en")).toBe(true);
    expect(isValidBcp47("ar")).toBe(true);
    expect(isValidBcp47("pl")).toBe(true);
    expect(isValidBcp47("zh-Hant")).toBe(true);
    expect(isValidBcp47("x-default")).toBe(true); // hreflang sentinel
  });

  it("rejects lowercase region casing (en-gb) and suggests the uppercase form", () => {
    const r = validateBcp47("en-gb");
    expect(r.valid).toBe(false);
    expect(r.suggestion).toBe("en-GB");
  });
});
