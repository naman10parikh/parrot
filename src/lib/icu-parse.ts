/**
 * Focused ICU MessageFormat 1 inspector — extracts the plural categories a message AUTHORS and flags the
 * specific authoring traps the parrot brain names: dashes in `select`/value names (P7), the lossy
 * apostrophe-escape that breaks French `l'` / English `<...>` through the AST round-trip (P8 / S8), and
 * missing plural categories for a target locale (P6 / S3, via plural.ts).
 *
 * DELIBERATELY NOT @formatjs/icu-messageformat-parser: P25 documents that FormatJS moved to platform-specific
 * native NAPI binaries that break in bare Node sandboxes (no musl binary, dropped platforms, 100x Windows perf
 * cliff). parrot's `check` runs in exactly such sandboxes, so we ship a small zero-dep inspector for the
 * traps the brain calls out rather than inheriting that cliff. We do NOT re-implement full ICU rendering —
 * runtime formatting is the runtime library's job (next-intl/`Intl.*`, O9).
 *
 * Shared by `parrot icu` and `parrot check` (the plural/format legs) + the unit tests.
 */

import type { PluralCategory } from "./plural.js";
import { pluralGap } from "./plural.js";

const VALID_CATEGORIES: readonly PluralCategory[] = ["zero", "one", "two", "few", "many", "other"];

/** One warning about an ICU message, keyed by a brain pitfall ID so the verdict is citable. */
export interface IcuWarning {
  /** The brain pitfall this maps to: P6 (missing categories), P7 (dash in select), P8 (apostrophe escape). */
  readonly pitfall: "P6" | "P7" | "P8";
  readonly message: string;
}

/** Structured result of inspecting one ICU message. */
export interface IcuInspection {
  readonly source: string;
  /** Plural categories the message authors (e.g. {one, other}). Empty if the message has no plural arg. */
  readonly pluralCategories: Set<PluralCategory>;
  /** Exact `=N` selectors present (e.g. `=0`), which are NOT plural categories and don't satisfy them. */
  readonly exactSelectors: number[];
  /** Whether the message contains a `plural`/`selectordinal` argument at all. */
  readonly hasPlural: boolean;
  /** Whether the message contains a `select` argument. */
  readonly hasSelect: boolean;
  readonly warnings: IcuWarning[];
}

/**
 * Inspect an ICU message string. Locale is optional; when provided, missing-plural-category warnings (P6) are
 * computed against that locale's required categories (e.g. an `{one, other}` message warns for `pl`).
 */
export function inspectIcu(source: string, locale?: string): IcuInspection {
  const src = source ?? "";
  const warnings: IcuWarning[] = [];

  const pluralCategories = new Set<PluralCategory>();
  const exactSelectors: number[] = [];

  // --- plural / selectordinal arguments: {count, plural, one {…} few {…} other {…}} ---
  // Match the category keyword tokens that introduce a sub-message ( `keyword {` ), plus `=N {` exacts.
  const hasPlural = /\{[^{}]*,\s*(?:plural|selectordinal)\s*,/.test(src);
  if (hasPlural) {
    // Category keywords appearing immediately before a `{` are the authored categories.
    const catRe = /(?:^|[\s}])(zero|one|two|few|many|other)\s*\{/g;
    for (let m = catRe.exec(src); m !== null; m = catRe.exec(src)) {
      pluralCategories.add(m[1] as PluralCategory);
    }
    const exactRe = /(?:^|[\s}])=(\d+)\s*\{/g;
    for (let m = exactRe.exec(src); m !== null; m = exactRe.exec(src)) {
      exactSelectors.push(Number(m[1]));
    }
    // P6 — missing categories for the target locale (the silent Polish/Arabic plural bug).
    if (locale) {
      const gap = pluralGap(pluralCategories, locale);
      if (!gap.complete) {
        warnings.push({
          pitfall: "P6",
          message:
            `missing plural categor${gap.missing.length === 1 ? "y" : "ies"} ` +
            `[${gap.missing.join(", ")}] for locale '${locale}' — ` +
            `'${locale}' renders the wrong form SILENTLY without ${gap.missing.length === 1 ? "it" : "them"} (P6/S3)`,
        });
      }
    }
  }

  // --- select arguments: {gender, select, male {…} female {…} other {…}} ---
  const hasSelect = /\{[^{}]*,\s*select\s*,/.test(src);
  if (hasSelect) {
    // P7 — a dash in a select value name is invalid ICU (value names are alphanumeric+underscore only).
    // Catches the classic "map a locale code (`en-GB`) into a select" footgun.
    const selectBlockRe = /\{[^{}]*,\s*select\s*,([\s\S]*?)\}/g;
    for (let blk = selectBlockRe.exec(src); blk !== null; blk = selectBlockRe.exec(src)) {
      const body = blk[1] ?? "";
      const valueRe = /(?:^|[\s}])([A-Za-z0-9_-]+)\s*\{/g;
      for (let v = valueRe.exec(body); v !== null; v = valueRe.exec(body)) {
        const name = v[1] ?? "";
        if (name.includes("-")) {
          warnings.push({
            pitfall: "P7",
            message:
              `select value name '${name}' contains a dash — ICU select/value names are ` +
              `alphanumeric+underscore only; replace '-' with '_' (e.g. en-GB → en_GB) before using a locale ` +
              `code in a select (P7)`,
          });
        }
      }
    }
  }

  // --- P8 — lossy apostrophe escaping (French l', English it's, and <...>-shaped literals) ---
  // ICU uses a single quote to escape literal braces ('{name}'); a stray apostrophe in prose can accidentally
  // start/end an escape and mangle the message. A `<...>`-shaped substring additionally trips FormatJS's
  // AST round-trip (#6593 INVALID_TAG, S8). We FLAG (not rewrite) — surgical.
  const hasLoneApostrophe = /[A-Za-z]'[A-Za-z]/.test(src); // l', it's — apostrophe between letters
  const hasAngleLiteral = /<[^>]+>/.test(src);
  if (hasLoneApostrophe || hasAngleLiteral) {
    const bits: string[] = [];
    if (hasLoneApostrophe) bits.push("a prose apostrophe (French `l'`, English `it's`) can accidentally begin an ICU escape");
    if (hasAngleLiteral) bits.push("a `<...>`-shaped literal is lossy through FormatJS's AST round-trip (INVALID_TAG, S8)");
    warnings.push({
      pitfall: "P8",
      message: `${bits.join("; ")} — escape robustly and test the round-trip in apostrophe-heavy locales (P8)`,
    });
  }

  return { source: src, pluralCategories, exactSelectors, hasPlural, hasSelect, warnings };
}

/** Whether a string token is a recognized CLDR plural category keyword. */
export function isPluralCategory(token: string): token is PluralCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(token);
}
