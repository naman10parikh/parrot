/**
 * E3 / Observability tests — the URL-query redactor + the append-only run-line + the runs-view aggregator.
 *
 * The HARD §10 invariant: a hreflang/locale/TMS-callback URL can carry a token, so the logger MUST strip the
 * query string before writing — a raw `?query=` or secret value in a run-line is an automatic ❌. (This file's
 * NAME carries "redact" so the E3 verify `pnpm test | grep -ci 'redact|query'` lands on a printed test-file
 * name regardless of the reporter's verbosity — the logger.test.ts suite also asserts the redactor.)
 *
 * Writes go to a TEMP log via PARROT_RUNS_LOG so the SEEDED, committed logs/runs.jsonl is never touched.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { readFileSync, existsSync, rmSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { redactUrl, logRun, type LogEntry } from "../src/lib/logger.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RUNS_VIEW = join(REPO_ROOT, "scripts", "runs-view.mjs");

const TMP_DIR = mkdtempSync(join(tmpdir(), "parrot-redact-"));
const RUNS = join(TMP_DIR, "runs.jsonl");
beforeAll(() => {
  process.env["PARROT_RUNS_LOG"] = RUNS;
});
afterAll(() => {
  delete process.env["PARROT_RUNS_LOG"];
  rmSync(TMP_DIR, { recursive: true, force: true });
});
afterEach(() => {
  if (existsSync(RUNS)) rmSync(RUNS);
});

describe("redactUrl — query strings never leak into the run log (§10)", () => {
  it("feeds https://x.com/ar/?token=SECRET123 → keeps origin+pathname, drops the token", () => {
    const out = redactUrl("https://x.com/ar/?token=SECRET123&sig=abc");
    expect(out).toBe("https://x.com/ar/");
    expect(out).not.toContain("SECRET123");
    expect(out).not.toContain("token=");
  });

  it("a TMS callback with a fragment token is stripped to origin+pathname", () => {
    expect(redactUrl("https://tms.example.com/cb#access=SECRETTOKEN")).toBe("https://tms.example.com/cb");
  });
});

describe("logRun — appends one redacted line; the seeded repo log is never touched", () => {
  const base: LogEntry = {
    ts: new Date().toISOString(),
    cmd: "check",
    jtbd: 10,
    model: "claude-opus-4-8[1m]",
    duration_ms: 7,
    outcome: "fail",
    findings_count: 1,
  };

  it("grows the log by exactly one line carrying the §10 schema keys", async () => {
    await logRun(base);
    const lines = readFileSync(RUNS, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const d = JSON.parse(lines[0] as string) as Record<string, unknown>;
    for (const k of ["ts", "cmd", "jtbd", "model", "duration_ms", "outcome", "findings_count"]) {
      expect(d).toHaveProperty(k);
    }
  });

  it("scrubs a token-bearing URL embedded in a field (defense in depth)", async () => {
    await logRun({ ...base, cmd: "tms https://x.com/ar/?token=SECRET123" });
    const written = readFileSync(RUNS, "utf8");
    expect(written).toContain("https://x.com/ar/");
    expect(written).not.toContain("SECRET123");
  });
});

describe("runs-view — aggregates the run log (cockpit/G2 consumes --json)", () => {
  it("emits valid JSON with per-command count + p50/p95", async () => {
    await logRun({ ts: new Date().toISOString(), cmd: "check", jtbd: 10, model: "m", duration_ms: 10, outcome: "fail", findings_count: 1 });
    await logRun({ ts: new Date().toISOString(), cmd: "check", jtbd: 10, model: "m", duration_ms: 30, outcome: "pass", findings_count: 0 });
    await logRun({ ts: new Date().toISOString(), cmd: "init", jtbd: 1, model: "m", duration_ms: 5, outcome: "pass", findings_count: 0 });

    const raw = execFileSync("node", [RUNS_VIEW, "--json", "--file", RUNS], { encoding: "utf8" });
    const agg = JSON.parse(raw) as {
      total: number;
      commands: { cmd: string; count: number; p50_ms: number; p95_ms: number }[];
      overall: { count: number; p50_ms: number; p95_ms: number };
    };
    expect(agg.total).toBe(3);
    const check = agg.commands.find((c) => c.cmd === "check");
    expect(check?.count).toBe(2);
    expect(typeof check?.p50_ms).toBe("number");
    expect(typeof check?.p95_ms).toBe("number");
    expect(agg.overall.count).toBe(3);
  });
});
