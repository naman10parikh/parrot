/**
 * parrot dispatch router (D1 / PLAN §3 Component 8 routing / HARNESS-OVERRIDES §8).
 *
 * Maps a free-text i18n task string → `{ jtbd, handler, pitfall }` so a coding agent (or the energy hub) can
 * route any internationalization request to the right JTBD node, the right parrot sub-agent persona, and the
 * version-specific pitfall to check first. This is the executable form of the brain's "routing reflex"
 * (EXPERTISE-MAP §"How to use this map"): place the task on the plumbing↔content-authoring line, route to a
 * JTBD node, name the gotcha.
 *
 * The handlers are the two packaged sub-agents (C2/C3) plus the CLI as a fallback executor:
 *   - "correctness-auditor"  → `.claude/agents/i18n-correctness-auditor.md` (plural/RTL/format/hreflang bugs)
 *   - "migration-planner"    → `.claude/agents/i18n-migration-planner.md`   (library swap / setup wiring)
 *   - "cli"                  → run a `parrot` command directly (extract/check/pick/icu — deterministic legs)
 *
 * Karpathy-surgical: a keyword→route table, ordered most-specific-first. No speculative ML, no config knobs.
 * The boundary (P29) is enforced: a content-authoring task routes to `jtbd:0, handler:"out-of-scope"` — parrot
 * hands it off and stops, it never composes copy.
 */

/** The handler a task routes to: a parrot sub-agent persona, the CLI, or the out-of-scope hand-off. */
export type Handler = "correctness-auditor" | "migration-planner" | "cli" | "out-of-scope";

/** A routing decision: the JTBD node (0 = out of scope), the handler, and the first pitfall to check. */
export interface Route {
  /** The JTBD node from EXPERTISE-MAP (1–12), or 0 for a content-authoring task parrot refuses. */
  readonly jtbd: number;
  /** Which handler should pick this up. */
  readonly handler: Handler;
  /** The version-specific pitfall (KNOWN-PITFALLS P-id) to check first; null when none is salient. */
  readonly pitfall: string | null;
  /** The brain scenario(s)/opinion this route is grounded in (for the agent's context). */
  readonly source: string;
}

/** One routing rule: a matcher over the lowercased task + the decision it yields. Order = priority. */
interface Rule {
  readonly test: (t: string) => boolean;
  readonly route: Route;
}

const has = (t: string, ...words: string[]): boolean => words.some((w) => t.includes(w));

/**
 * The rule table — MOST SPECIFIC FIRST. The first matching rule wins. Each route names its JTBD node, the
 * handler, the load-bearing pitfall, and the brain source. Grounded 1:1 in EXPERTISE-MAP JTBD-1..12 +
 * BATTLE-TESTED-SCENARIOS S1..S16 + KNOWN-PITFALLS P1..P29.
 */
const RULES: readonly Rule[] = [
  // --- BOUNDARY FIRST (P29): content authoring is OUT — parrot hands it off, never composes copy. ---
  {
    // "write/translate the marketing copy / blog post / brand voice" — authoring, not plumbing.
    test: (t) =>
      has(t, "write the copy", "marketing copy", "blog post", "brand voice", "write better copy", "tone of the copy", "translate the article", "translate the blog", "translate the prose", "rewrite the copy", "author the"),
    route: { jtbd: 0, handler: "out-of-scope", pitfall: null, source: "P29 / boundary — content authoring is a different employee/human" },
  },

  // --- JTBD-1: setup / wiring. The canonical German-pages case is here (S1/P1). ---
  {
    // "pages render in English / wrong language / shows the default locale" → setRequestLocale (P1).
    test: (t) =>
      (has(t, "render in english", "rendering in english", "render in the wrong", "wrong language", "shows english", "showing english", "default locale") &&
        !has(t, "plural")) ||
      has(t, "setrequestlocale"),
    route: { jtbd: 1, handler: "correctness-auditor", pitfall: "P1", source: "S1 / P1 — setRequestLocale missing → silent default-locale render" },
  },
  {
    // "middleware not working / proxy.ts / Next 16 routing" → version-detected middleware (P2).
    test: (t) => has(t, "middleware", "proxy.ts", "locale routing not", "routing does nothing", "no redirect", "next 16", "next16"),
    route: { jtbd: 1, handler: "migration-planner", pitfall: "P2", source: "S2 / P2 — middleware.ts silently ignored on Next 16 (renamed proxy.ts)" },
  },
  {
    // "await params / params is a promise" → P3.
    test: (t) => has(t, "await params", "params is a promise", "params promise"),
    route: { jtbd: 1, handler: "migration-planner", pitfall: "P3", source: "P3 — [locale] params is a Promise on Next 15+" },
  },
  {
    // generic "wire / set up / install i18n / next-intl on this app" → setup wiring.
    test: (t) => has(t, "wire i18n", "set up i18n", "setup i18n", "set up next-intl", "install next-intl", "add i18n", "scaffold i18n", "wire next-intl", "internationalize this app", "add internationalization"),
    route: { jtbd: 1, handler: "migration-planner", pitfall: "P1", source: "JTBD-1 / S1 — wire the 4 load-bearing files; codegen setRequestLocale" },
  },

  // --- JTBD-2 / ICU grammar. plural FIRST (the differentiator), then concatenation, then escape traps. ---
  {
    // "plural wrong in Polish/Arabic / count=2/5 wrong" → P6 (the silent CLDR-category bug).
    test: (t) => has(t, "plural") || (has(t, "count") && has(t, "polish", "arabic", "russian", "czech", "wrong word", "wrong form")),
    route: { jtbd: 2, handler: "correctness-auditor", pitfall: "P6", source: "S3 / P6 — missing plural categories render the wrong form silently in pl/ar" },
  },
  {
    // "concatenated / built from fragments / string + count + string" → P9 (the #1 anti-pattern).
    test: (t) => has(t, "concatenat", "fragment", "string +", "+ count", "glued together", "join the strings into a sentence"),
    route: { jtbd: 2, handler: "correctness-auditor", pitfall: "P9", source: "S14 / P9 — never concatenate; write the full-sentence ICU message" },
  },
  {
    // "INVALID_TAG / apostrophe / <...> in the message / dash in select" → P8/P7 (ICU escape traps).
    test: (t) => has(t, "invalid_tag", "invalid tag", "apostrophe", "escape", "dash in select", "select with locale"),
    route: { jtbd: 2, handler: "correctness-auditor", pitfall: "P8", source: "S8 / P8 — ICU apostrophe-escape lossy through the AST round-trip" },
  },

  // --- JTBD-4: RTL / bidi. ---
  {
    test: (t) => has(t, "rtl", "right-to-left", "right to left", "arabic looks broken", "hebrew", "mirrored", "bidi", "dir=", "letter-spacing on arabic", "checkmark flipped", "play button backwards"),
    route: { jtbd: 4, handler: "correctness-auditor", pitfall: "P11", source: "S7 / P11-P13 — RTL is a layout/bidi/typography coverage problem, not 'translate the strings'" },
  },

  // --- JTBD-5: locale routing + hreflang SEO. ---
  {
    // "hreflang / canonical / localized pages vanished from Google / wrong country" → P15/P16/P17.
    test: (t) => has(t, "hreflang", "canonical", "vanished from google", "dropped from google", "disappeared from the index", "wrong country", "es-la", "en-uk", "x-default", "alternate slugs"),
    route: { jtbd: 5, handler: "correctness-auditor", pitfall: "P15", source: "S10 / S11 / P15-P17 — canonical-to-.com deletes localized pages; hreflang as a CI-checked BCP-47 graph" },
  },
  {
    // "geo-IP redirect / Accept-Language redirect / locale detection" → P18 (detect-to-suggest, not redirect).
    test: (t) => has(t, "geo-ip", "geoip", "accept-language redirect", "hard-redirect", "auto-redirect", "locale detection", "detect the locale"),
    route: { jtbd: 5, handler: "correctness-auditor", pitfall: "P18", source: "S12 / P18 — detect-to-suggest (banner/cookie), never hard-redirect the crawler" },
  },

  // --- JTBD-6: library selection / migration. ---
  {
    // "switch/migrate from X to Y / which i18n library" → migration-planner (full-surface refactor, S4).
    test: (t) => has(t, "migrate", "switch from", "swap library", "swap from", "move from i18next", "move to next-intl", "move to lingui", "which i18n library", "which library should", "pick a library", "choose a library", "lingui", "react-i18next to"),
    route: { jtbd: 6, handler: "migration-planner", pitfall: "P26", source: "S4 / O3 / O4 — a library swap is a full-component-surface refactor; decision-with-cost" },
  },

  // --- JTBD-7: key hygiene at scale. ---
  {
    // "duplicate key / dynamic key / typed keys break tsc / TS2590" → P5/P? (key hygiene + typed-key cliff).
    test: (t) => has(t, "duplicate key", "dup key", "dynamic key", "ts2590", "typed keys", "type all the keys", "tsc out of memory", "key hygiene", "unused keys", "missing keys"),
    route: { jtbd: 7, handler: "cli", pitfall: "P5", source: "S5 / S15 / P5 — typed keys break tsc at scale (selector API); dup-key build gate; never dynamic keys" },
  },

  // --- JTBD-8: MT / TMS pipeline. ---
  {
    test: (t) => has(t, "machine translat", "auto-translate", "auto translate", "mt pipeline", "tms", "crowdin", "lingo.dev", "tolgee", "lokalise", "translate the whole ui", "translation pipeline"),
    route: { jtbd: 8, handler: "cli", pitfall: "P23", source: "S13 / O16 / P23 — MT 80% / human-gated 20%, glossary + per-string context; short strings higher-risk; never ship unverified" },
  },

  // --- JTBD-9: cross-locale typography / fonts. ---
  {
    test: (t) => has(t, "font", "glyph", "tofu", "wrong font", "noto", "subset", "cjk renders", "arabic font", "missing glyph"),
    route: { jtbd: 9, handler: "cli", pitfall: "P28", source: "S? / O24 / P27-P28 — next/font per-script subsets + Noto fallback; brand fonts don't cover non-Latin" },
  },

  // --- JTBD-10: validate correctness in CI (the differentiator) — generic "check / audit / is it correct". ---
  {
    test: (t) => has(t, "check correctness", "validate i18n", "audit i18n", "ci gate", "is the i18n correct", "is it correct in", "test the localization", "verify the locales", "is the translation correct"),
    route: { jtbd: 10, handler: "correctness-auditor", pitfall: "P6", source: "JTBD-10 / O23 — the CI correctness gate; test the 20% invisible in English" },
  },

  // --- JTBD-12: currency / 2026 shifts. ---
  {
    test: (t) => has(t, "messageformat 2", "message format 2", "mf2", "should we move to", "is this advice still", "2026", "stale advice"),
    route: { jtbd: 12, handler: "correctness-auditor", pitfall: null, source: "S16 / O25 — MF1 default, MF2 watch-list (zero 2026 adoption); flag invalidated advice" },
  },
];

/** The fallback route when nothing matches: send to the CLI extract/check path under JTBD-11 (agent ops). */
const FALLBACK: Route = {
  jtbd: 11,
  handler: "cli",
  pitfall: null,
  source: "JTBD-11 — operate the pipeline (extract→check); start with `parrot extract`/`parrot check`",
};

/**
 * Route an i18n task string to its `{ jtbd, handler, pitfall }`. Case-insensitive; first matching rule wins
 * (rules are ordered most-specific-first). Content-authoring tasks return `jtbd:0 / out-of-scope` (the
 * boundary, P29). An empty/whitespace task returns the JTBD-11 fallback rather than throwing.
 */
export function route(task: string): Route {
  const t = (task ?? "").toLowerCase().trim();
  if (t.length === 0) return FALLBACK;
  for (const rule of RULES) {
    if (rule.test(t)) return rule.route;
  }
  return FALLBACK;
}
