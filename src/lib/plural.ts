/**
 * Plural-category resolution + catalog-gap detection — the deepest pluralization lesson in the parrot brain
 * (S3 / P6 / O7 / O9 / O23): a `{count, plural, one {…} other {…}}` message covers English's 2 forms but
 * SILENTLY renders the wrong form in Polish (4 categories), Arabic (6), Russian (4), Czech (3). The fix is to
 * author EVERY category the target locale uses — and we resolve "which categories" from native
 * `Intl.PluralRules` (O9: never hand-roll CLDR data), never a hardcoded table that goes stale.
 *
 * Shared by `parrot check` (the many-plural leg), `parrot icu` (the missing-category warning), and the unit
 * tests. Pure, zero deps.
 */

/** The CLDR plural categories, in canonical order. */
export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

const CATEGORY_ORDER: readonly PluralCategory[] = ["zero", "one", "two", "few", "many", "other"];

/**
 * The set of plural categories a locale actually uses for CARDINAL counts, sourced from the runtime's CLDR
 * data via `Intl.PluralRules`. We probe a representative spread of counts (0,1,2,…,5,11,21,100,101,1000000)
 * which is enough to surface every category every common locale uses (e.g. `pl` → one/few/many/other;
 * `ar` → zero/one/two/few/many/other; `ja` → other only). `other` is always required.
 */
export function requiredCategoriesFor(locale: string): PluralCategory[] {
  const pr = new Intl.PluralRules(locale);
  const probe = [0, 1, 2, 3, 4, 5, 6, 11, 12, 21, 22, 100, 101, 102, 1000, 1000000];
  const seen = new Set<PluralCategory>(["other"]); // `other` is the mandatory fallback in every locale
  for (const n of probe) {
    seen.add(pr.select(n) as PluralCategory);
  }
  return CATEGORY_ORDER.filter((c) => seen.has(c));
}

/** Resolve the CLDR cardinal category for a single count in a locale (native `Intl.PluralRules`, O9). */
export function categoryFor(locale: string, count: number): PluralCategory {
  return new Intl.PluralRules(locale).select(count) as PluralCategory;
}

/** Result of checking one ICU plural message against one locale's required categories. */
export interface PluralGap {
  readonly locale: string;
  /** Categories the locale needs but the message does not author. */
  readonly missing: PluralCategory[];
  /** Categories present in the message that the locale never uses (harmless, but noted). */
  readonly extra: PluralCategory[];
  /** Whether the message is complete for this locale. */
  readonly complete: boolean;
}

/**
 * Given the set of plural categories an ICU message AUTHORS (parsed elsewhere, e.g. icu-parse.ts) and a target
 * locale, return the gap. A message authored as `{one, other}` against `pl` returns `missing: [few, many]` —
 * the exact silent-bug S3/P6 describes. Explicit `=N` exact-value branches are NOT plural categories and are
 * passed separately so they don't mask a missing category.
 */
export function pluralGap(authored: ReadonlySet<PluralCategory>, locale: string): PluralGap {
  const required = requiredCategoriesFor(locale);
  const missing = required.filter((c) => !authored.has(c));
  const extra = [...authored].filter((c) => !required.includes(c));
  return {
    locale,
    missing,
    extra: CATEGORY_ORDER.filter((c) => extra.includes(c)),
    complete: missing.length === 0,
  };
}

/**
 * Assert that distinct strings are produced for the canary counts the brain mandates (S3: count=0,1,2,5 in
 * `pl`/`ar`). Returns the category each count maps to — the eval/acceptance layer uses this to PROVE the
 * plurals are not "done from English" (English maps 2 and 5 to the same `other`; Polish does not).
 */
export function canaryCategories(locale: string, counts: readonly number[] = [0, 1, 2, 5]): Map<number, PluralCategory> {
  const pr = new Intl.PluralRules(locale);
  const out = new Map<number, PluralCategory>();
  for (const n of counts) out.set(n, pr.select(n) as PluralCategory);
  return out;
}
