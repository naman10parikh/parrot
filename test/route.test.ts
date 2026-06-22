/**
 * Tests for the dispatch router (D1 / PLAN §3 Component 8 / HARNESS-OVERRIDES §8).
 *
 * The load-bearing case (board verify): `route("the German pages render in English")` → `{jtbd:1,
 * handler:"correctness-auditor", pitfall:"P1"}` — the silent setRequestLocale bug (S1/P1). Plus multi-step
 * coverage across the JTBD nodes, the brain pitfalls, the content-authoring boundary (P29), and the fallback.
 */

import { describe, it, expect } from "vitest";
import { route } from "../src/dispatch/route.js";

describe("route — the canonical setup case (S1/P1)", () => {
  it("'German pages render in English' → JTBD-1, correctness-auditor, P1", () => {
    const r = route("the German pages render in English");
    expect(r.jtbd).toBe(1);
    expect(r.handler).toBe("correctness-auditor");
    expect(r.pitfall).toBe("P1");
  });

  it("is case-insensitive and tolerant of phrasing", () => {
    expect(route("Our /de/ pages are SHOWING ENGLISH with no error").jtbd).toBe(1);
    expect(route("the page shows the default locale instead of the URL locale").pitfall).toBe("P1");
  });
});

describe("route — ICU grammar (the bugs invisible in English)", () => {
  it("a Polish plural complaint → JTBD-2, P6 (the silent CLDR-category bug)", () => {
    const r = route("the plural is wrong in Polish for count=2 and count=5");
    expect(r.jtbd).toBe(2);
    expect(r.pitfall).toBe("P6");
    expect(r.handler).toBe("correctness-auditor");
  });

  it("a concatenated sentence → JTBD-2, P9 (never concatenate)", () => {
    expect(route("we built the sentence by concatenating fragments").pitfall).toBe("P9");
  });

  it("an INVALID_TAG / apostrophe trap → JTBD-2, P8", () => {
    expect(route("the build fails with INVALID_TAG on a valid English string").pitfall).toBe("P8");
  });
});

describe("route — RTL, SEO, migration, MT", () => {
  it("an RTL/Arabic complaint → JTBD-4, P11", () => {
    const r = route("we support RTL but Arabic looks broken and a checkmark is mirrored");
    expect(r.jtbd).toBe(4);
    expect(r.pitfall).toBe("P11");
  });

  it("localized pages vanishing from Google → JTBD-5, P15 (canonical-to-.com)", () => {
    expect(route("our localized pages vanished from Google after we set canonical").jtbd).toBe(5);
    expect(route("the hreflang codes are es-la and en-uk").jtbd).toBe(5);
  });

  it("a library swap → JTBD-6, migration-planner (full-surface refactor)", () => {
    const r = route("we want to migrate from react-i18next to Lingui");
    expect(r.jtbd).toBe(6);
    expect(r.handler).toBe("migration-planner");
  });

  it("an auto-translate request → JTBD-8 (governed MT pipeline)", () => {
    expect(route("can you machine translate the whole UI").jtbd).toBe(8);
  });

  it("a Next-16 middleware question → JTBD-1, P2", () => {
    expect(route("the middleware does nothing on Next 16").pitfall).toBe("P2");
  });
});

describe("route — the content-authoring boundary (P29)", () => {
  it("'write the marketing copy' is OUT of scope (jtbd 0, hand off)", () => {
    const r = route("write the French marketing copy for the landing page");
    expect(r.jtbd).toBe(0);
    expect(r.handler).toBe("out-of-scope");
  });

  it("'translate the blog post' (prose authoring) is OUT of scope", () => {
    expect(route("translate the blog post into German for tone").handler).toBe("out-of-scope");
  });
});

describe("route — fallback + edge cases", () => {
  it("an unrecognized task falls back to JTBD-11 (operate the pipeline via CLI)", () => {
    const r = route("do the thing with the locales somehow");
    expect(r.jtbd).toBe(11);
    expect(r.handler).toBe("cli");
  });

  it("an empty task returns the fallback, never throws", () => {
    expect(() => route("")).not.toThrow();
    expect(route("   ").jtbd).toBe(11);
  });

  it("every route names a brain source (no unsourced decision)", () => {
    const tasks = [
      "German pages render in English",
      "the plural is wrong in Polish",
      "Arabic looks broken in RTL",
      "migrate from i18next to next-intl",
      "write the marketing copy",
    ];
    for (const t of tasks) expect(route(t).source.length).toBeGreaterThan(0);
  });
});
