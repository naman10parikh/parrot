// B3 — hardcoded-string heuristic tests. The catalog-bypass (P9/O8/O19): a multi-word user-facing literal in
// JSX outside t()/<Trans>. Conservative — skips className/key/imports/URLs/single words (low false positives).
import { describe, it, expect } from "vitest";
import { findHardcodedStrings, firstHardcodedString } from "../src/lib/hardcoded-heuristic.js";

describe("hardcoded-string heuristic (P9/O8/O19)", () => {
  it("flags multi-word JSX text content", () => {
    const found = findHardcodedStrings("x.tsx", "export default () => <div>Welcome to our store</div>;");
    expect(found.length).toBe(1);
    expect(found[0]?.text).toBe("Welcome to our store");
    expect(found[0]?.kind).toBe("jsx-text");
  });

  it("flags a user-facing attribute (placeholder)", () => {
    const found = findHardcodedStrings("x.tsx", '<input placeholder="Search products" />');
    expect(found.some((f) => f.kind === "jsx-attribute:placeholder")).toBe(true);
  });

  it("does NOT flag a t() call (the correct pattern)", () => {
    const found = findHardcodedStrings("x.tsx", "export default () => <div>{t('welcome')}</div>;");
    expect(found.length).toBe(0);
  });

  it("does NOT flag className / technical attributes (low false positives)", () => {
    const found = findHardcodedStrings("x.tsx", '<div className="flex items-center" data-testid="hero card">x</div>');
    expect(found.length).toBe(0);
  });

  it("does NOT flag imports or single-word text", () => {
    const src = 'import { Button } from "@/components/ui/button";\nexport default () => <span>OK</span>;';
    expect(findHardcodedStrings("x.tsx", src).length).toBe(0);
  });

  it("does NOT flag a URL", () => {
    expect(findHardcodedStrings("x.tsx", '<a href="https://example.com/foo">{t("link")}</a>').length).toBe(0);
  });

  it("firstHardcodedString returns the first finding for the hook (B4)", () => {
    const f = firstHardcodedString("x.tsx", "<button>Add to cart</button>");
    expect(f).not.toBeNull();
    expect(f?.text).toBe("Add to cart");
  });
});
