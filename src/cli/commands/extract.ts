/**
 * `parrot extract` — find the catalog BYPASS (JTBD-7; PLAN §4): hardcoded user-facing strings that never went
 * through the message catalog (P9/O8 spirit) + the key gaps (used-but-missing / defined-but-unused). NEVER
 * constructs keys dynamically (O19) — it only reads `t("literal")` / `<Trans id="literal">` call sites by
 * grep, which is exactly why keys must be grep-able and static.
 *
 * HONEST about scope (O20 — there is no perfect unused-key story): static scanning misses dynamic usage and
 * runtime-only features. The verdict says so; it does not promise a clean sweep.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { walkFiles, readJsonSafe, flattenKeys } from "../util/fs-walk.js";
import { findHardcodedStrings, type HardcodedFinding } from "../../lib/hardcoded-heuristic.js";

export interface ExtractResult {
  readonly dir: string;
  /** Hardcoded user-facing strings found in JSX/TSX (file:line:col + text). */
  readonly hardcoded: HardcodedFinding[];
  /** Keys referenced in source via t()/<Trans> but absent from the baseline catalog. */
  readonly missingKeys: string[];
  /** Keys defined in the baseline catalog but never referenced in source (best-effort; see `note`). */
  readonly unusedKeys: string[];
  /** Honesty note about the limits of static unused-key detection (O20). */
  readonly note: string;
}

const SOURCE_EXTS = [".tsx", ".jsx", ".ts", ".js"] as const;
const MESSAGE_DIR_CANDIDATES = ["messages", "src/messages", "locales", "src/locales", "i18n", "src/i18n"];

/** Collect the baseline catalog's flattened keys (prefer en.json). Returns [] if no catalog. */
function baselineKeys(appDir: string): string[] {
  for (const cand of MESSAGE_DIR_CANDIDATES) {
    const dir = join(appDir, cand);
    if (!existsSync(dir)) continue;
    const files = walkFiles(dir, [".json"]);
    const en = files.find((f) => /(^|\/)en\.json$/i.test(f)) ?? files[0];
    if (!en) continue;
    const read = readJsonSafe(en);
    if (read.ok) return Object.keys(flattenKeys(read.value));
  }
  return [];
}

/**
 * Grep static key references: `t("key")`, `t('key')`, `getTranslations`/`useTranslations` are namespace-scoped
 * so we also capture `t("sub.key")`. We deliberately do NOT resolve dynamic keys (O19) — a `t(variable)` is
 * uncatchable by grep and is the anti-pattern, not a case to support.
 */
function referencedKeys(appDir: string): Set<string> {
  const keys = new Set<string>();
  const callRe = /\bt\(\s*["'`]([\w.-]+)["'`]/g;
  const transRe = /<Trans\b[^>]*\bid\s*=\s*["'`]([\w.-]+)["'`]/g;
  for (const file of walkFiles(appDir, SOURCE_EXTS)) {
    let src: string;
    try {
      src = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (let m = callRe.exec(src); m !== null; m = callRe.exec(src)) keys.add(m[1] as string);
    for (let m = transRe.exec(src); m !== null; m = transRe.exec(src)) keys.add(m[1] as string);
  }
  return keys;
}

export function runExtract(appDir: string): ExtractResult {
  const hardcoded: HardcodedFinding[] = [];
  for (const file of walkFiles(appDir, [".tsx", ".jsx"])) {
    let src: string;
    try {
      src = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    hardcoded.push(...findHardcodedStrings(relative(appDir, file), src));
  }

  const defined = baselineKeys(appDir);
  const referenced = referencedKeys(appDir);

  // missing: referenced in source but not defined in the baseline catalog (a used-but-undefined key → fallback).
  const definedSet = new Set(defined);
  const missingKeys = [...referenced].filter((k) => !definedSet.has(k)).sort();

  // unused: defined but never referenced statically (best-effort — see note).
  const unusedKeys = defined.filter((k) => !referenced.has(k)).sort();

  return {
    dir: appDir,
    hardcoded,
    missingKeys,
    unusedKeys,
    note:
      "unusedKeys is best-effort: static scanning cannot see dynamically-constructed or runtime-only key usage (O19/O20). " +
      "Treat it as a candidate list, not a delete list.",
  };
}
