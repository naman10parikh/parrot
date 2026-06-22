#!/usr/bin/env node
/**
 * parrot run-log aggregator (Component 10 / brain §10; E3).
 *
 * Reads the append-only `logs/runs.jsonl` (one line per `parrot` run, written by src/lib/logger.ts) and prints
 * aggregates: runs-per-command, outcome split, and p50/p95 duration per command. The cockpit's Run-log view
 * (G2) consumes `--json`; a human gets a table.
 *
 * Zero deps (pure Node stdlib). Robust to a missing/empty/partly-corrupt log (skips unparseable lines, never
 * throws). Honors PARROT_RUNS_LOG (same override the logger uses) so it can be pointed at a test/alt log.
 *
 * Usage:  node scripts/runs-view.mjs [--json] [--file <path>]
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Resolve the run log: --file > $PARROT_RUNS_LOG > repo-root logs/runs.jsonl (anchored to this script). */
function resolveLogPath(argv) {
  const fi = argv.indexOf("--file");
  if (fi !== -1 && argv[fi + 1]) return argv[fi + 1];
  if (process.env.PARROT_RUNS_LOG) return process.env.PARROT_RUNS_LOG;
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  return join(repoRoot, "logs", "runs.jsonl");
}

/** Read + parse the jsonl, skipping blank/unparseable lines (a corrupt line must not break the aggregate). */
function readRuns(path) {
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, "utf8").split("\n");
  const runs = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    try {
      runs.push(JSON.parse(t));
    } catch {
      // skip a malformed line (don't crash the view) — defense-in-depth for an append-only log.
    }
  }
  return runs;
}

/** Percentile (nearest-rank) over a numeric array. p50 = median, p95 = tail. Returns 0 for an empty set. */
function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(rank, sorted.length) - 1];
}

/** Build the per-command + overall aggregate. */
function aggregate(runs) {
  const byCmd = new Map();
  for (const r of runs) {
    const cmd = typeof r.cmd === "string" ? r.cmd : "(unknown)";
    if (!byCmd.has(cmd)) byCmd.set(cmd, { cmd, count: 0, pass: 0, fail: 0, error: 0, durations: [], findings: 0 });
    const g = byCmd.get(cmd);
    g.count++;
    if (r.outcome === "pass") g.pass++;
    else if (r.outcome === "fail") g.fail++;
    else if (r.outcome === "error") g.error++;
    if (typeof r.duration_ms === "number") g.durations.push(r.duration_ms);
    if (typeof r.findings_count === "number") g.findings += r.findings_count;
  }
  const commands = [...byCmd.values()]
    .map((g) => ({
      cmd: g.cmd,
      count: g.count,
      pass: g.pass,
      fail: g.fail,
      error: g.error,
      findings: g.findings,
      p50_ms: percentile(g.durations, 50),
      p95_ms: percentile(g.durations, 95),
    }))
    .sort((a, b) => b.count - a.count);

  const allDur = runs.map((r) => r.duration_ms).filter((d) => typeof d === "number");
  return {
    total: runs.length,
    commands,
    overall: {
      count: runs.length,
      p50_ms: percentile(allDur, 50),
      p95_ms: percentile(allDur, 95),
      pass: runs.filter((r) => r.outcome === "pass").length,
      fail: runs.filter((r) => r.outcome === "fail").length,
      error: runs.filter((r) => r.outcome === "error").length,
    },
  };
}

function main(argv) {
  const args = argv.slice(2);
  const asJson = args.includes("--json");
  const path = resolveLogPath(args);
  const runs = readRuns(path);
  const agg = aggregate(runs);

  if (asJson) {
    process.stdout.write(JSON.stringify(agg, null, 2) + "\n");
    return 0;
  }

  const W = (s) => process.stdout.write(s);
  W(`parrot run-log — ${path}\n`);
  if (agg.total === 0) {
    W("  (no runs logged yet — run a `parrot` command to populate logs/runs.jsonl)\n");
    return 0;
  }
  W(`  total runs: ${agg.total}  ·  overall p50=${agg.overall.p50_ms}ms p95=${agg.overall.p95_ms}ms  ·  pass=${agg.overall.pass} fail=${agg.overall.fail} error=${agg.overall.error}\n\n`);
  W(`  ${"command".padEnd(12)} ${"count".padStart(6)} ${"pass".padStart(5)} ${"fail".padStart(5)} ${"err".padStart(4)} ${"p50".padStart(7)} ${"p95".padStart(7)} ${"findings".padStart(9)}\n`);
  W(`  ${"-".repeat(12)} ${"-".repeat(6)} ${"-".repeat(5)} ${"-".repeat(5)} ${"-".repeat(4)} ${"-".repeat(7)} ${"-".repeat(7)} ${"-".repeat(9)}\n`);
  for (const c of agg.commands) {
    W(`  ${c.cmd.padEnd(12)} ${String(c.count).padStart(6)} ${String(c.pass).padStart(5)} ${String(c.fail).padStart(5)} ${String(c.error).padStart(4)} ${(c.p50_ms + "ms").padStart(7)} ${(c.p95_ms + "ms").padStart(7)} ${String(c.findings).padStart(9)}\n`);
  }
  return 0;
}

process.exit(main(process.argv));
