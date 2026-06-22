/**
 * Tests for the observability logger (Component 10 / brain §10) — the URL redactor + the append-only run log.
 *
 * The load-bearing assertion is the HARD §10 invariant: a hreflang/locale/TMS-callback URL can carry a token,
 * so the logger MUST strip the query string before writing — a raw `?query=` or secret value in a run-line is
 * an automatic ❌. These tests prove the redactor strips it and that `logRun` appends a valid, scrubbed line.
 */

import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";
import { readFileSync, rmSync, existsSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { redactUrl, logRun, type LogEntry } from "../src/lib/logger.js";

// The logger writes to logs/runs.jsonl (anchored to the repo root). That file is SEEDED + COMMITTED (E3 — it
// must be tracked + not-gitignored), so the test MUST NOT write to / delete it. We point the logger at a TEMP
// file via the PARROT_RUNS_LOG override for the duration of these tests, and clean only that temp file. This
// keeps the seeded repo log pristine through `pnpm test` (no dirty tree, no deleted seed).
const TMP_DIR = mkdtempSync(join(tmpdir(), "parrot-logtest-"));
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

describe("redactUrl — strips query strings (no token leak into the log)", () => {
  it("drops the ?query (token + signature) keeping origin+pathname", () => {
    const out = redactUrl("https://x.com/ar/?token=SECRET123&sig=abc");
    // origin + pathname only — the locale path is kept for debugging, the secret query is gone.
    expect(out).toBe("https://x.com/ar/");
    expect(out).not.toContain("SECRET123");
    expect(out).not.toContain("token=");
  });

  it("drops the #fragment too", () => {
    expect(redactUrl("https://tms.example.com/cb#access=xyz")).toBe("https://tms.example.com/cb");
  });

  it("never throws on non-URL input (returns a bounded slice)", () => {
    expect(redactUrl("not a url")).toBe("not a url");
    const long = "x".repeat(500);
    expect(redactUrl(long).length).toBeLessThanOrEqual(200);
  });
});

describe("logRun — appends one valid, scrubbed JSON line", () => {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    cmd: "check",
    jtbd: 10,
    model: "claude-opus-4-8[1m]",
    duration_ms: 5,
    outcome: "fail",
    findings_count: 2,
  };

  it("writes a single jsonl line with the §10 schema keys", async () => {
    await logRun(entry);
    const lines = readFileSync(RUNS, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0] as string) as Record<string, unknown>;
    for (const k of ["ts", "cmd", "model", "duration_ms", "outcome", "jtbd", "findings_count"] as const) {
      expect(parsed).toHaveProperty(k);
    }
  });

  it("scrubs a URL-with-token embedded in a field (defense-in-depth) — no query survives", async () => {
    // Even if a future/edge field carries a URL, the written line must not contain the raw query string.
    await logRun({ ...entry, cmd: "tms https://x.com/ar/?token=SECRET123" });
    const written = readFileSync(RUNS, "utf8");
    expect(written).toContain("https://x.com/ar/");
    expect(written).not.toContain("SECRET123");
    expect(written).not.toContain("token=");
  });
});
