/**
 * Observability logger (Component 10 / brain §10) — the append-only run log + the MANDATORY URL redactor.
 *
 * Cross-cluster contract: the CLI (`src/cli/util/log.ts`) emits a typed run-line and lazily delegates HERE.
 * This file is the IMPLEMENTATION the seam documented:
 *   - `logRun(entry)`  appends ONE JSON line to `logs/runs.jsonl` (created on first write), never throwing.
 *   - `redactUrl(raw)` strips the query string + fragment (origin + pathname only) so a hreflang/locale/
 *     TMS-callback URL can NEVER carry a token into the log (HARNESS-OVERRIDES §10 — a raw query string or
 *     secret value in a run-line is an automatic ❌).
 *
 * Built by the CLI builder under the CEO's "build the shared logger lib now if your board flags it as an early
 * cross-cluster dependency" directive — the CLI is the primary run-line producer and was no-op-logging without
 * it. Surgical: this is exactly the two exports the seam named; the `runs-view` aggregator + the eval/sandbox
 * wiring remain Cluster E's. Zero deps (Simplicity First); pure Node stdlib.
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The run-line schema (brain §10). Kept structurally identical to the CLI seam's `LogEntry` so the lazy import
 * type-checks on E's side and the JSON shape is stable. Re-declared (not imported) on purpose: the logger lib
 * must not depend on the CLI build stream — the dependency points one way (CLI → logger).
 */
export interface LogEntry {
  /** ISO timestamp. */
  readonly ts: string;
  /** The command run, e.g. "check" / "extract" / "init". */
  readonly cmd: string;
  /** The JTBD node this command serves, if known. */
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

/**
 * Resolve `logs/runs.jsonl` at the REPO ROOT regardless of the caller's cwd.
 * This file compiles to `dist/lib/logger.js`; the repo root is two dirs up (`dist/lib/` → repo). Anchoring to
 * the module location (not `process.cwd()`) means `parrot` logs to the same file whether run from the repo, a
 * target app, or CI — the observability log is parrot's, about parrot's runs.
 */
function runsLogPath(): string {
  // Test/CI override: tests point this at a temp file so they never clobber the SEEDED, committed repo log
  // (E3 requires logs/runs.jsonl to be tracked + not-gitignored; a test's rmSync of the real path would break
  // that + dirty the tree). Production leaves it unset → the repo's logs/runs.jsonl.
  const override = process.env["PARROT_RUNS_LOG"];
  if (override && override.length > 0) return override;
  const here = dirname(fileURLToPath(import.meta.url)); // .../dist/lib
  const repoRoot = join(here, "..", ".."); // .../  (repo root)
  return join(repoRoot, "logs", "runs.jsonl");
}

/**
 * Strip the query string and fragment from a URL — origin + pathname only.
 *
 * A hreflang alternate, a locale-routing redirect, or a TMS provider callback can carry an auth token or a
 * signed param in `?...`; writing that verbatim into an append-only log is a secret leak. We keep enough to be
 * useful for debugging (which endpoint/path) and drop everything that could be sensitive.
 *
 * Robust to non-URL input: a bare string that doesn't parse is returned truncated (never throws), so the
 * redactor is safe to apply to any field that *might* contain a URL.
 */
export function redactUrl(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname}`;
  } catch {
    // Not a parseable absolute URL — return a bounded slice (no query/fragment to strip, but cap length so a
    // huge blob can't bloat the log line).
    return raw.length > 200 ? raw.slice(0, 200) : raw;
  }
}

/**
 * Defense-in-depth: redact any URL-shaped substring inside an arbitrary string value before it's written.
 * The CLI's `LogEntry` fields are scalars today, but `cmd`/future fields could embed a URL — this guarantees
 * no `?query=` survives into a run-line regardless of which field carried it.
 */
function scrubValue(v: unknown): unknown {
  if (typeof v !== "string") return v;
  // Replace each http(s) URL occurrence with its redacted (origin+pathname) form.
  return v.replace(/https?:\/\/[^\s"']+/g, (m) => redactUrl(m));
}

/** Apply `scrubValue` across every field of the entry, returning a safe-to-write record. */
function scrubEntry(entry: LogEntry): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(entry)) out[k] = scrubValue(val);
  return out;
}

/**
 * Append one run-line to `logs/runs.jsonl` (the dir/file are created on first write). NEVER throws —
 * observability must not change a command's exit code. The line is single-line JSON (jsonl), URL-redacted.
 */
export async function logRun(entry: LogEntry): Promise<void> {
  try {
    const path = runsLogPath();
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, JSON.stringify(scrubEntry(entry)) + "\n", "utf8");
  } catch (err) {
    // Last-resort: a failed log write must not break the CLI. Surface to stderr (per typescript.md: no silent
    // swallow), but do not rethrow.
    process.stderr.write(
      `parrot logger: could not append run-line (non-fatal): ${err instanceof Error ? err.message : String(err)}\n`,
    );
  }
}
