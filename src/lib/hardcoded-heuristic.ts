/**
 * Hardcoded-user-facing-string heuristic — finds the catalog-BYPASS: a quoted multi-word literal sitting in
 * JSX/TSX where a `t()` / `<Trans>` call belongs (the brain's P9/O8 "never concatenate, always interpolate via
 * the catalog" spirit, and O19 "keys grep-able, never dynamic"). A string that reaches the user without going
 * through the message catalog is invisible to every translator and every i18n CI check.
 *
 * Shared by `parrot extract` (B2) and the `i18n-string-gate` hook (B4) + the unit tests. Pure, zero deps.
 *
 * HONEST about scope (brain O20 — there is no perfect detector): this is a HEURISTIC, not an AST pass. It is
 * deliberately conservative — it targets the high-signal case (JSX text content + common user-facing JSX
 * attributes) and skips imports, `className`, keys, test ids, URLs, and single-word tokens to keep the
 * false-positive rate low. It will miss template-literal interpolation and dynamic cases; that's stated, not
 * hidden.
 */

/** One hardcoded-string finding. */
export interface HardcodedFinding {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly text: string;
  /** Why it was flagged (which surface): "jsx-text" or "jsx-attribute:<attr>". */
  readonly kind: string;
}

// JSX attributes that render user-facing copy (worth translating). We do NOT flag structural/technical attrs.
const USER_FACING_ATTRS = new Set([
  "title",
  "alt",
  "placeholder",
  "label",
  "aria-label",
  "aria-description",
  "aria-placeholder",
]);

// Attributes whose string values are NEVER user copy — explicitly skipped to suppress false positives.
const TECHNICAL_ATTRS = new Set([
  "classname",
  "class",
  "key",
  "id",
  "href",
  "src",
  "rel",
  "type",
  "name",
  "role",
  "htmlfor",
  "for",
  "data-testid",
  "datatestid",
  "style",
  "target",
  "method",
  "action",
  "value",
  "defaultvalue",
]);

/** A "word" for the multi-word test: a run of letters (so "Hi!" counts as one word, "Add to cart" as three). */
const WORD_RE = /\p{L}+/gu;

/** True if the string is plausibly user-facing copy (≥2 words, has letters, not a URL/path/identifier). */
function looksLikeCopy(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed.length < 3) return false;
  if (/^https?:\/\//i.test(trimmed)) return false; // URL
  if (/^[./~#?]/.test(trimmed)) return false; // path / fragment / query
  if (/^[A-Z0-9_]+$/.test(trimmed)) return false; // SCREAMING_CONST
  if (!/[a-z]/i.test(trimmed)) return false; // no letters at all
  const words = trimmed.match(WORD_RE) ?? [];
  return words.length >= 2; // multi-word — the high-signal case the brain targets
}

/** True if this source line is inside an import/require/export-from statement (never user copy). */
function isImportLine(line: string): boolean {
  return /^\s*(?:import\b|export\b[^=]*\bfrom\b|const\s+\w+\s*=\s*require\()/.test(line);
}

/**
 * Scan one file's source for hardcoded user-facing strings. `filePath` is used only for the finding's `file`
 * field. Only `.tsx`/`.jsx` content is meaningfully scanned (JSX is where user copy lives); callers should
 * gate on extension, but we don't hard-fail other extensions (we just find little).
 */
export function findHardcodedStrings(filePath: string, source: string): HardcodedFinding[] {
  const findings: HardcodedFinding[] = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (isImportLine(line)) continue;

    // (1) JSX text content: `>Add to cart<` — text directly between tags, not inside an expression `{…}`.
    //     We look for `>` … `<` spans on a line and test the inner text.
    const jsxTextRe = />([^<>{}]+)</g;
    for (let m = jsxTextRe.exec(line); m !== null; m = jsxTextRe.exec(line)) {
      const text = (m[1] ?? "").trim();
      if (looksLikeCopy(text)) {
        findings.push({
          file: filePath,
          line: i + 1,
          column: (m.index ?? 0) + 1,
          text,
          kind: "jsx-text",
        });
      }
    }

    // (2) User-facing JSX attributes with a literal string value: `placeholder="Search products"`.
    const attrRe = /([A-Za-z][\w-]*)\s*=\s*"([^"]+)"/g;
    for (let m = attrRe.exec(line); m !== null; m = attrRe.exec(line)) {
      const attr = (m[1] ?? "").toLowerCase();
      const text = (m[2] ?? "").trim();
      if (TECHNICAL_ATTRS.has(attr)) continue;
      // Flag known user-facing attrs; for unknown attrs, stay quiet (conservative — avoid false positives).
      if (USER_FACING_ATTRS.has(attr) && looksLikeCopy(text)) {
        findings.push({
          file: filePath,
          line: i + 1,
          column: (m.index ?? 0) + 1,
          text,
          kind: `jsx-attribute:${attr}`,
        });
      }
    }
  }

  return findings;
}

/**
 * Hook-shaped predicate (B4 consumes this): does this content contain a hardcoded user-facing string that
 * should be blocked? Returns the first finding (for the cited block message) or null. The hook treats any
 * `.tsx`/`.jsx` write through this.
 */
export function firstHardcodedString(filePath: string, source: string): HardcodedFinding | null {
  const found = findHardcodedStrings(filePath, source);
  return found[0] ?? null;
}
