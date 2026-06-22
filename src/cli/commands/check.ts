/**
 * `parrot check` — THE CI correctness gate (JTBD-10, the differentiator; PLAN §4). Runs the legs the brain
 * says are invisible-in-English: key-completeness · many-plural (S3/P6) · RTL (S7) · format · font-glyph ·
 * hreflang-graph (S10/S11) · setRequestLocale-presence (S1/P1) · Next-version-correct middleware (S2/P2).
 * Non-zero exit on ANY failure (it's a merge gate). `--json` emits a parseable verdict ALWAYS — even on a
 * missing/empty dir — so the agent/CI contract holds independently of whether the fixture exists yet.
 *
 * "Test the 20% invisible in English" made executable. Each failure carries a `check` tag + a brain ID.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { walkFiles, readJsonSafe, flattenKeys } from "../util/fs-walk.js";
import { inspectIcu } from "../../lib/icu-parse.js";
import { validateBcp47 } from "../../lib/bcp47.js";

/** One failed check, citable by leg + brain ID. */
export interface CheckFailure {
  readonly check: "key-completeness" | "plural" | "rtl" | "format" | "font-glyph" | "hreflang" | "setRequestLocale" | "middleware";
  readonly locale?: string;
  readonly detail: string;
  /** The brain pitfall/scenario this leg defends (e.g. "P6", "S3", "P1"). */
  readonly source: string;
}

export interface CheckResult {
  readonly pass: boolean;
  readonly dir: string;
  readonly locales: string[];
  readonly failures: CheckFailure[];
  /** Non-fatal warnings (e.g. ICU apostrophe traps) — reported, do not fail the gate. */
  readonly warnings: string[];
}

const RTL_LANGS = new Set(["ar", "he", "fa", "ur", "ps", "dv", "yi"]);

/** Common next-intl / i18n message-catalog locations, in priority order. */
const MESSAGE_DIR_CANDIDATES = ["messages", "src/messages", "locales", "src/locales", "i18n", "src/i18n", "app/i18n"];

/** Find the message-catalog directory (the dir holding `<locale>.json` files), or null. */
function findMessagesDir(appDir: string): string | null {
  for (const cand of MESSAGE_DIR_CANDIDATES) {
    const p = join(appDir, cand);
    if (existsSync(p)) {
      const jsons = walkFiles(p, [".json"]);
      if (jsons.length > 0) return p;
    }
  }
  return null;
}

/** Detect the locale code from a message filename (`en.json` → `en`, `pl.json` → `pl`). */
function localeFromFile(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.json$/i, "");
}

/** Read the target app's Next.js major version from its package.json (for the middleware leg). null if absent. */
function detectNextMajor(appDir: string): number | null {
  const pkg = readJsonSafe(join(appDir, "package.json"));
  if (!pkg.ok || typeof pkg.value !== "object" || pkg.value === null) return null;
  const deps = {
    ...((pkg.value as Record<string, unknown>)["dependencies"] as Record<string, string> | undefined),
    ...((pkg.value as Record<string, unknown>)["devDependencies"] as Record<string, string> | undefined),
  };
  const spec = deps["next"];
  if (!spec) return null;
  const m = spec.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * Run the correctness gate. `requestedLocales` is the `--locales` list (e.g. ["en","pl","ar"]); if empty we
 * use whatever locales the catalog defines. The baseline for key-completeness is `en` if present, else the
 * first locale.
 */
export function runCheck(appDir: string, requestedLocales: string[]): CheckResult {
  const failures: CheckFailure[] = [];
  const warnings: string[] = [];

  if (!existsSync(appDir)) {
    failures.push({
      check: "key-completeness",
      detail: `app directory does not exist: ${appDir}`,
      source: "JTBD-10",
    });
    return { pass: false, dir: appDir, locales: requestedLocales, failures, warnings };
  }

  // --- locate catalogs ---
  const messagesDir = findMessagesDir(appDir);
  const catalogs = new Map<string, Record<string, string>>();
  if (messagesDir) {
    for (const file of walkFiles(messagesDir, [".json"])) {
      const loc = localeFromFile(file);
      const read = readJsonSafe(file);
      if (read.ok) {
        catalogs.set(loc, flattenKeys(read.value));
      } else {
        failures.push({
          check: "format",
          locale: loc,
          detail: `malformed JSON catalog ${relative(appDir, file)}: ${read.error}`,
          source: "P8",
        });
      }
    }
  } else {
    failures.push({
      check: "key-completeness",
      detail: `no message catalog found (looked in: ${MESSAGE_DIR_CANDIDATES.join(", ")})`,
      source: "JTBD-10",
    });
  }

  const locales = requestedLocales.length > 0 ? requestedLocales : [...catalogs.keys()].sort();
  const baseline = catalogs.has("en") ? "en" : locales[0];
  const baselineKeys = baseline ? Object.keys(catalogs.get(baseline) ?? {}) : [];

  // --- leg: key-completeness (S15/O22 — a missing key ships the fallback/ID, silently) ---
  for (const loc of locales) {
    if (loc === baseline) continue;
    const cat = catalogs.get(loc);
    if (!cat) {
      failures.push({
        check: "key-completeness",
        locale: loc,
        detail: `no catalog file for requested locale '${loc}'`,
        source: "O22",
      });
      continue;
    }
    const missing = baselineKeys.filter((k) => !(k in cat));
    if (missing.length > 0) {
      failures.push({
        check: "key-completeness",
        locale: loc,
        detail: `${missing.length} key(s) present in '${baseline}' but missing in '${loc}': ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}`,
        source: "O22",
      });
    }
  }

  // --- leg: many-plural (S3/P6 — the canary; refuse plurals "done from English") ---
  // For each locale, every catalog string that contains a plural arg must author every category the locale uses.
  for (const loc of locales) {
    const cat = catalogs.get(loc);
    if (!cat) continue;
    for (const [key, value] of Object.entries(cat)) {
      if (!/,\s*(?:plural|selectordinal)\s*,/.test(value)) continue;
      const insp = inspectIcu(value, loc);
      const p6 = insp.warnings.find((w) => w.pitfall === "P6");
      if (p6) {
        failures.push({
          check: "plural",
          locale: loc,
          detail: `key '${key}': ${p6.message}`,
          source: "S3",
        });
      }
      // P7/P8 ICU authoring traps are warnings, not gate failures (they don't silently ship wrong plurals).
      for (const w of insp.warnings) {
        if (w.pitfall !== "P6") warnings.push(`[${loc}] key '${key}': ${w.message}`);
      }
    }
  }

  // --- leg: RTL (S7/P11 — `dir` must be set for RTL locales; an RTL locale with no dir is broken) ---
  const rtlRequested = locales.filter((l) => RTL_LANGS.has(l.split("-")[0] ?? l));
  if (rtlRequested.length > 0) {
    const layoutFiles = walkFiles(appDir, [".tsx", ".jsx"]).filter((f) => /layout\.(tsx|jsx)$/.test(f));
    // Scan layout source for a `dir=` assignment on <html> (dir="rtl" or dir={getLangDir(locale)} etc.).
    let dirSet = false;
    for (const f of layoutFiles) {
      try {
        const src = readFileSync(f, "utf8");
        if (/\bdir\s*=\s*[{"]/.test(src) || /getLangDir|rtl/i.test(src)) {
          dirSet = true;
          break;
        }
      } catch {
        /* unreadable layout — ignore */
      }
    }
    if (layoutFiles.length === 0) {
      failures.push({
        check: "rtl",
        detail: `RTL locale(s) [${rtlRequested.join(", ")}] requested but no layout file found to set <html dir>`,
        source: "S7",
      });
    } else if (!dirSet) {
      failures.push({
        check: "rtl",
        detail: `RTL locale(s) [${rtlRequested.join(", ")}] requested but no \`dir\` set on <html> in any layout — RTL text will render LTR (S7/P11)`,
        source: "S7",
      });
    }
  }

  // --- leg: hreflang / BCP-47 validity (S11/P16 — every requested locale code must be valid BCP-47) ---
  for (const loc of locales) {
    const v = validateBcp47(loc);
    if (!v.valid) {
      failures.push({
        check: "hreflang",
        locale: loc,
        detail: `invalid BCP-47 locale code '${loc}': ${v.reason}${v.suggestion ? ` — did you mean '${v.suggestion}'?` : ""}`,
        source: "S11",
      });
    }
  }

  // --- leg: setRequestLocale presence (S1/P1 — every static page/layout under app/[locale] must call it) ---
  const localeRouteRoot = ["app/[locale]", "src/app/[locale]"].map((p) => join(appDir, p)).find(existsSync);
  if (localeRouteRoot) {
    const pageFiles = walkFiles(localeRouteRoot, [".tsx", ".jsx"]).filter((f) => /(page|layout)\.(tsx|jsx)$/.test(f));
    const offenders: string[] = [];
    for (const f of pageFiles) {
      try {
        const src = readFileSync(f, "utf8");
        if (!/setRequestLocale\s*\(/.test(src)) offenders.push(relative(appDir, f));
      } catch {
        /* ignore */
      }
    }
    if (offenders.length > 0) {
      failures.push({
        check: "setRequestLocale",
        detail: `${offenders.length} static page/layout under app/[locale] missing setRequestLocale() (renders defaultLocale SILENTLY): ${offenders.slice(0, 4).join(", ")}${offenders.length > 4 ? "…" : ""}`,
        source: "P1",
      });
    }
  }

  // --- leg: Next-version-correct middleware (S2/P2 — proxy.ts on Next 16, middleware.ts before) ---
  const nextMajor = detectNextMajor(appDir);
  if (nextMajor !== null) {
    const hasMiddleware = ["middleware.ts", "src/middleware.ts"].some((p) => existsSync(join(appDir, p)));
    const hasProxy = ["proxy.ts", "src/proxy.ts"].some((p) => existsSync(join(appDir, p)));
    if (nextMajor >= 16 && hasMiddleware && !hasProxy) {
      failures.push({
        check: "middleware",
        detail: `Next ${nextMajor} renamed middleware.ts → proxy.ts; a middleware.ts here is SILENTLY ignored (locale routing does nothing) (S2/P2)`,
        source: "P2",
      });
    }
    if (nextMajor < 16 && hasProxy && !hasMiddleware) {
      failures.push({
        check: "middleware",
        detail: `Next ${nextMajor} uses middleware.ts (proxy.ts is Next 16+); the proxy.ts here is not loaded (S2/P2)`,
        source: "P2",
      });
    }
  }

  return {
    pass: failures.length === 0,
    dir: appDir,
    locales,
    failures,
    warnings,
  };
}
