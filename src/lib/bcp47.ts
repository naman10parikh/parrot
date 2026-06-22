/**
 * BCP-47 locale-tag validation — the deadliest hreflang bug is a code that is *syntactically valid markup*
 * but *geographically wrong* (brain S11 / P16 / O14): `es-la` reads as Laos (not Latin America), `me` as
 * Montenegro, `en-uk` is wrong (the region is `GB`; `uk` is Ukraine). Valid examples: `es-419`, `en-GB`,
 * `de-CH`, `ar`, `pl`, `zh-Hant`, `x-default` (the hreflang sentinel).
 *
 * Shared by `parrot check` (the hreflang-graph leg), `parrot seo hreflang`, and the unit tests. Pure, no deps
 * (Simplicity First). We validate the BCP-47 SHAPE + flag the well-known mis-codes the brain calls out, rather
 * than shipping a full IANA-registry lookup (the registry has thousands of subtags; the brain's failure modes
 * are the shape + a small high-value denylist of "looks-right-but-wrong" tags).
 */

/** Result of validating one locale tag. `reason` is populated only when `valid` is false. */
export interface Bcp47Result {
  readonly tag: string;
  readonly valid: boolean;
  readonly reason?: string;
  /** A corrected suggestion when we recognize the specific mistake (e.g. `en-uk` → `en-GB`). */
  readonly suggestion?: string;
}

/**
 * Well-known "valid markup, wrong geography" tags the brain (S11/P16) names explicitly. Keyed lowercase.
 * These are the agent footguns — a generic shape check would PASS them, so we deny-list them by name.
 */
const KNOWN_MISCODES: Readonly<Record<string, { reason: string; suggestion: string }>> = {
  "es-la": {
    reason: "`la` is the ISO code for Laos, not Latin America — Search Console will associate this with Laos",
    suggestion: "es-419",
  },
  "en-uk": {
    reason: "`uk` is the ISO code for Ukraine, not the United Kingdom — the UK region code is `GB`",
    suggestion: "en-GB",
  },
  me: {
    reason: "`me` is the ISO 639/3166 code for Montenegro/Montenegrin, not a tag for 'Middle East'",
    suggestion: "ar", // a real Middle-East language; the user must pick the actual target
  },
};

// Subtag shapes per BCP-47 (RFC 5646), reduced to the parts that matter for product i18n:
//   language    = 2-3 ASCII letters (primary)         e.g. en, ar, zh
//   script      = exactly 4 ASCII letters (Title)     e.g. Hant, Latn, Arab
//   region      = exactly 2 ASCII letters (UPPER)  OR exactly 3 digits (UN M.49)  e.g. GB, CH, 419
const LANG_RE = /^[a-z]{2,3}$/;
const SCRIPT_RE = /^[A-Z][a-z]{3}$/;
const REGION_ALPHA_RE = /^[A-Z]{2}$/;
const REGION_DIGIT_RE = /^[0-9]{3}$/;

/**
 * Validate a single BCP-47 language tag. Accepts `language`, `language-region`, `language-script`,
 * `language-script-region`, and the `x-default` hreflang sentinel. Rejects the known mis-codes by name,
 * lowercase regions (`en-gb` — must be `en-GB`), `uk`-for-UK, and malformed shapes.
 */
export function validateBcp47(tag: string): Bcp47Result {
  const raw = (tag ?? "").trim();
  if (raw.length === 0) {
    return { tag: raw, valid: false, reason: "empty tag" };
  }

  // The hreflang `x-default` sentinel is valid by spec (RFC 5646 private-use / hreflang convention).
  if (raw.toLowerCase() === "x-default") {
    return { tag: raw, valid: true };
  }

  const miscode = KNOWN_MISCODES[raw.toLowerCase()];
  if (miscode) {
    return { tag: raw, valid: false, reason: miscode.reason, suggestion: miscode.suggestion };
  }

  const parts = raw.split("-");
  const [lang, ...rest] = parts;
  if (lang === undefined || !LANG_RE.test(lang)) {
    return {
      tag: raw,
      valid: false,
      reason: `primary language subtag must be 2-3 lowercase letters (got '${lang ?? ""}')`,
    };
  }

  // Walk the remaining subtags: at most one script (4 letters), then at most one region (2 UPPER / 3 digits).
  let sawScript = false;
  let sawRegion = false;
  for (const sub of rest) {
    if (!sawScript && !sawRegion && SCRIPT_RE.test(sub)) {
      sawScript = true;
      continue;
    }
    if (!sawRegion && (REGION_ALPHA_RE.test(sub) || REGION_DIGIT_RE.test(sub))) {
      sawRegion = true;
      continue;
    }
    // A lowercase 2-letter where a region belongs is the classic `en-gb` casing mistake.
    if (!sawRegion && /^[a-z]{2}$/.test(sub)) {
      return {
        tag: raw,
        valid: false,
        reason: `region subtag must be UPPERCASE (got '${sub}', expected '${sub.toUpperCase()}')`,
        suggestion: `${lang}-${sub.toUpperCase()}`,
      };
    }
    return { tag: raw, valid: false, reason: `unrecognized or out-of-order subtag '${sub}'` };
  }

  return { tag: raw, valid: true };
}

/** Convenience boolean for call sites that only need pass/fail. */
export function isValidBcp47(tag: string): boolean {
  return validateBcp47(tag).valid;
}
