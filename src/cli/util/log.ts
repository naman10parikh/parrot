/**
 * Run-logging SEAM for the CLI (cross-cluster contract with E3 / Observability).
 *
 * Every `parrot` command should append one run-line to `logs/runs.jsonl` (brain §10 / E3). The IMPLEMENTATION
 * of that append — including the MANDATORY URL-query-string redaction (a hreflang/locale/TMS-callback URL can
 * carry a token; HARNESS-OVERRIDES §10) — is OWNED by E3 in `src/lib/logger.ts`. This file is the CALL SITE:
 * the CLI emits a typed `LogEntry` here, and we lazily/optionally delegate to E3's logger if it has shipped.
 *
 * Why a seam, not a direct import: B2 (this CLI) and E3 (the logger) are different build streams. A hard import
 * would (a) break this CLI's compile until E3 lands, and (b) risk clobbering E3's named file + its redaction
 * unit test. The lazy-optional import means the CLI compiles and runs TODAY (logging is a no-op), and the
 * moment E3 publishes `src/lib/logger.ts` exporting `logRun(entry)`, every `parrot` run starts appending —
 * with ZERO further edits here. E3's verify ("a `parrot check` run grows logs/runs.jsonl by exactly one line")
 * is satisfied by E3's impl + this call site together.
 *
 * E3 CONTRACT — `src/lib/logger.ts` must export:
 *     export async function logRun(entry: LogEntry): Promise<void>   // appends one JSON line, redacts URLs
 *     export function redactUrl(raw: string): string                 // origin+pathname only (strip ?query)
 */

/** The run-line schema (brain §10 / E3). Stable contract between this call site and E3's logger. */
export interface LogEntry {
  /** ISO timestamp. */
  readonly ts: string;
  /** The command run, e.g. "check" / "extract" / "init". */
  readonly cmd: string;
  /** The JTBD node this command serves (PLAN §2), if known. */
  readonly jtbd: number | null;
  /** The model in use (always Opus per D14; recorded for provenance). */
  readonly model: string;
  /** Wall-clock duration in ms. */
  readonly duration_ms: number;
  /** "pass" | "fail" | "error" — the command's outcome. */
  readonly outcome: "pass" | "fail" | "error";
  /** Count of findings/failures the command produced. */
  readonly findings_count: number;
}

/** The model identity recorded in run lines (D14: always Opus, max effort). */
export const PARROT_MODEL = process.env["ANTHROPIC_MODEL"] ?? "default";

/**
 * Emit one run-line. Delegates to E3's `src/lib/logger.ts#logRun` if present; otherwise a silent no-op (the
 * logger has not shipped yet). Never throws — observability must not break a command's exit code.
 */
export async function logRun(entry: LogEntry): Promise<void> {
  try {
    // Lazy, OPTIONAL cross-cluster dependency (E3's src/lib/logger.ts → dist/lib/logger.js). The specifier is
    // a runtime variable on purpose: it keeps the type checker from resolving a module that may not have
    // shipped yet, while runtime resolution still finds it once E3 lands. If absent, the import throws → no-op.
    const spec = "../../lib/logger.js";
    const mod = (await import(spec)) as { logRun?: (e: LogEntry) => Promise<void> | void };
    if (typeof mod.logRun === "function") {
      await mod.logRun(entry);
    }
  } catch {
    // E3's logger not present yet — intentional no-op (see seam rationale above).
  }
}

/** Helper to build a LogEntry from a command run. */
export function makeEntry(
  cmd: string,
  jtbd: number | null,
  startedAt: number,
  outcome: LogEntry["outcome"],
  findingsCount: number,
): LogEntry {
  return {
    ts: new Date().toISOString(),
    cmd,
    jtbd,
    model: PARROT_MODEL,
    duration_ms: Date.now() - startedAt,
    outcome,
    findings_count: findingsCount,
  };
}
