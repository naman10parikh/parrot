#!/usr/bin/env node
/**
 * parrot RSI engine (D2 / PLAN §11 / HARNESS-OVERRIDES "RSI / open-endedness").
 *
 * The DETERMINISTIC, $0, TOKENLESS half of the self-improvement loop (D8 — the Claude half is deferred until
 * CLAUDE_CODE_OAUTH_TOKEN is set; its absence is NOT a gap). Runs the 6-step loop the brain prescribes for
 * keeping parrot current as the i18n ecosystem churns (Lingo.dev daily, next-intl/FormatJS weekly):
 *
 *   1. refresh-tool-matrix-versions  — `npm view <pkg> version` for the 6 tracked packages; diff vs the pins
 *   2. re-verify-brain-pins          — confirm the pinned version strings still appear in brain/TOOL-MATRIX.md
 *   3. run-eval-pyramid              — `parrot eval --level 1` (E1) stays green (skipped-as-pending if absent)
 *   4. propose                       — write a proposal (pin bumps / drift) to .rsi/proposal.json (gitignored)
 *   5. test-gate                     — proceed ONLY if the eval pyramid stays green (the dsip eval-gate)
 *   6. commit                        — only on a green gate; the --deterministic run NEVER commits (proposes only)
 *
 * MODEL ROUTING (D12/D14): this engine + any agent it would spawn run on Opus, max effort, never a bare
 * default. The deterministic half spawns NO model (it's pure Node + `npm view`); the deferred Claude half,
 * when it lights up, MUST pass this model explicitly: the alias, which moves to each new Opus by itself.
 *   model: "opus"
 *
 * Robustness: `npm view` may be unreachable (offline CI / sandbox) — each lookup is guarded; a network failure
 * degrades to "unavailable" and the run still completes green (the engine is informational on the deterministic
 * half — it PROPOSES, it never auto-commits or fails the build on a transient network miss).
 *
 * Karpathy-surgical: pure Node, zero deps, the 6 steps and nothing speculative.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** The model this RSI loop runs on (D12/D14: explicit, never a bare default, never a fixed ID). */
export const MODEL = "opus";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROPOSAL_DIR = join(REPO_ROOT, ".rsi");
const PROPOSAL_PATH = join(PROPOSAL_DIR, "proposal.json");

/**
 * The packages the tool matrix pins (TOOL-MATRIX Cat 1/5/3) + the version claim the brain currently makes.
 * Step 1 diffs the live `npm view <pkg> version` against `pin`; step 2 confirms `pin` still appears in the
 * brain file. A drift here is what the Claude half (deferred) would rewrite.
 */
const TRACKED = [
  { pkg: "next-intl", pin: "4.13.0", note: "the wired default (RSC-mature)" },
  { pkg: "i18next", pin: "26", note: "multi-framework / RN alt" },
  { pkg: "react-intl", pin: "10", note: "ICU-heavy alt" },
  { pkg: "@lingui/core", pin: "6", note: "bundle-paramount alt (needs a bundler plugin — P26)" },
  { pkg: "@lingual/i18n-check", pin: "0.9.5", note: "the CI key-completeness gate (ixartz pattern)" },
  { pkg: "lingo.dev", pin: "0.137.0", note: "AI-CLI — pin EXACTLY, releases daily (P21)" },
];

const STEP_NAMES = [
  "refresh-tool-matrix-versions",
  "re-verify-brain-pins",
  "run-eval-pyramid",
  "propose",
  "test-gate",
  "commit",
];

/** `npm view <pkg> version`, guarded — returns the version string or null on any failure (offline-safe). */
function npmViewVersion(pkg) {
  try {
    const out = execFileSync("npm", ["view", pkg, "version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 20000 });
    return out.trim() || null;
  } catch {
    return null; // offline / not-found / timeout — degrade gracefully, never crash the loop.
  }
}

/** Does a major-version pin still "match" the latest (same major)? For exact pins, exact match. Heuristic, $0. */
function pinSatisfied(pin, latest) {
  if (!latest) return null; // unknown (offline) — neither satisfied nor drifted.
  if (/^\d+$/.test(pin)) return latest.split(".")[0] === pin; // major pin (e.g. "26")
  return latest === pin; // exact pin (e.g. "0.137.0" / "4.13.0")
}

/** Step 1 — refresh versions + diff vs pins. `plantStale` injects a fake drift so the verify can prove propose. */
function refreshToolMatrixVersions(plantStale) {
  const rows = TRACKED.map((t) => {
    const latest = npmViewVersion(t.pkg);
    const satisfied = pinSatisfied(t.pin, latest);
    return { pkg: t.pkg, pin: t.pin, latest, satisfied, note: t.note };
  });
  if (plantStale) {
    // Planted drift: pretend next-intl's pin is far behind, so a proposal is generated deterministically even
    // when offline. Used by the D2 verify to prove "detects a planted stale pin → proposes, does not commit."
    rows.unshift({ pkg: "next-intl", pin: "4.0.0", latest: "9.99.0", satisfied: false, note: "PLANTED stale pin (verify harness)" });
  }
  return rows;
}

/** Step 2 — confirm each pin string still appears in brain/TOOL-MATRIX.md (brain-pin-integrity domain). */
function reVerifyBrainPins() {
  const file = join(REPO_ROOT, "brain", "TOOL-MATRIX.md");
  let text = "";
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return TRACKED.map((t) => ({ pkg: t.pkg, pin: t.pin, presentInBrain: null }));
  }
  return TRACKED.map((t) => ({ pkg: t.pkg, pin: t.pin, presentInBrain: text.includes(t.pin) }));
}

/** Step 3 — run the eval pyramid L1 (E1's `parrot eval`). Skipped-as-pending if the command/eval isn't built. */
function runEvalPyramid() {
  const binParrot = join(REPO_ROOT, "bin", "parrot");
  const distEval = join(REPO_ROOT, "dist", "cli", "index.js");
  if (!existsSync(distEval)) return { ran: false, green: null, reason: "CLI not built (pnpm build) — eval skipped (deterministic half is informational)" };
  try {
    execFileSync("node", [binParrot, "eval", "--level", "1"], { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60000 });
    return { ran: true, green: true, reason: "parrot eval --level 1 exited 0" };
  } catch (e) {
    // `parrot eval` is owned by cluster E (E1). Until it lands it exits non-zero (a stub) — that is EXPECTED on
    // the deterministic half and does NOT fail the RSI loop (the loop proposes; the eval-gate is advisory here).
    const code = e && typeof e === "object" && "status" in e ? e.status : "?";
    return { ran: true, green: false, reason: `parrot eval --level 1 not yet green (exit ${code}) — E1 pending; loop stays informational` };
  }
}

/** Step 4 — write the proposal (drifted pins + brain-pin gaps) to .rsi/proposal.json (gitignored, $0). */
function propose(versionRows, brainRows) {
  const drifted = versionRows.filter((r) => r.satisfied === false);
  const brainGaps = brainRows.filter((r) => r.presentInBrain === false);
  const proposal = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    driftedPins: drifted.map((r) => ({ pkg: r.pkg, brainPin: r.pin, latest: r.latest, action: `bump brain/TOOL-MATRIX.md pin for ${r.pkg} → ${r.latest}` })),
    brainPinGaps: brainGaps.map((r) => ({ pkg: r.pkg, pin: r.pin, action: `re-check the ${r.pkg} version claim in brain/TOOL-MATRIX.md` })),
    note:
      "Deterministic, $0 proposal. The Claude half (deferred — D8) would rewrite the affected brain file + add a " +
      "golden task for the new failure class when CLAUDE_CODE_OAUTH_TOKEN is set. Nothing is committed here.",
  };
  mkdirSync(PROPOSAL_DIR, { recursive: true });
  writeFileSync(PROPOSAL_PATH, JSON.stringify(proposal, null, 2) + "\n", "utf8");
  return proposal;
}

/** Step 5 — the eval-gate. Proceed to commit ONLY if the eval pyramid stays green (no self-grading). */
function testGate(evalResult) {
  // On the deterministic half, the eval may be pending (E1). The gate is: NEVER regress. A pending/non-green
  // eval means we do NOT proceed to a commit — we leave the proposal for review. green===true is the only pass.
  return { pass: evalResult.green === true, reason: evalResult.green === true ? "eval green — gate open" : "eval not green/pending — gate CLOSED (propose-only, no commit)" };
}

/** Step 6 — commit. Deterministic mode NEVER commits (it proposes). A real commit needs a green gate + the
 *  Claude half. This step only reports intent — it does not touch git. */
function commit(deterministic, gate) {
  if (deterministic) {
    return { committed: false, reason: "--deterministic: PROPOSE-ONLY by contract; the working tree is never modified, nothing is committed (CP117 lesson: enabled ≠ auto-commit)." };
  }
  if (!gate.pass) return { committed: false, reason: "gate closed — nothing committed" };
  return { committed: false, reason: "gate open, but the deterministic engine still does not auto-commit; the Claude half (D8) opens a reviewed PR when its token is set" };
}

/** Run the full 6-step loop. Returns the structured report; exits 0 on success (informational, offline-safe). */
export function runRsi({ deterministic = true, plantStale = false } = {}) {
  const report = { model: MODEL, steps: STEP_NAMES, deterministic, results: {} };

  // Step 1
  const versionRows = refreshToolMatrixVersions(plantStale);
  report.results["refresh-tool-matrix-versions"] = versionRows;

  // Step 2
  const brainRows = reVerifyBrainPins();
  report.results["re-verify-brain-pins"] = brainRows;

  // Step 3
  const evalResult = runEvalPyramid();
  report.results["run-eval-pyramid"] = evalResult;

  // Step 4
  const proposal = propose(versionRows, brainRows);
  report.results["propose"] = { proposalPath: ".rsi/proposal.json", driftedCount: proposal.driftedPins.length, brainGapCount: proposal.brainPinGaps.length };

  // Step 5
  const gate = testGate(evalResult);
  report.results["test-gate"] = gate;

  // Step 6
  const committed = commit(deterministic, gate);
  report.results["commit"] = committed;

  return report;
}

/** CLI: `node workflows/rsi.workflow.js --deterministic [--plant-stale-pin]`. */
function main(argv) {
  const args = argv.slice(2);
  const deterministic = args.includes("--deterministic") || !args.includes("--claude");
  const plantStale = args.includes("--plant-stale-pin");

  process.stdout.write(`parrot RSI engine — model=${MODEL} (deterministic=${deterministic})\n`);
  process.stdout.write(`steps: ${STEP_NAMES.join(" → ")}\n\n`);

  const report = runRsi({ deterministic, plantStale });

  // Print each step name + a one-line outcome (the verify greps for the 6 step names).
  for (const step of STEP_NAMES) {
    const r = report.results[step];
    let line = "";
    if (step === "refresh-tool-matrix-versions") {
      const drifted = r.filter((x) => x.satisfied === false).length;
      const offline = r.filter((x) => x.latest === null).length;
      line = `${r.length} packages checked · ${drifted} drifted · ${offline} unavailable(offline)`;
    } else if (step === "re-verify-brain-pins") {
      const gaps = r.filter((x) => x.presentInBrain === false).length;
      line = `${r.length} pins re-verified · ${gaps} brain-pin gap(s)`;
    } else if (step === "run-eval-pyramid") {
      line = r.reason;
    } else if (step === "propose") {
      line = `wrote ${r.proposalPath} · ${r.driftedCount} pin-bump(s) + ${r.brainGapCount} brain gap(s) proposed`;
    } else if (step === "test-gate") {
      line = r.reason;
    } else if (step === "commit") {
      line = r.reason;
    }
    process.stdout.write(`✔ ${step}: ${line}\n`);
  }

  process.stdout.write(`\nRSI deterministic pass complete — proposed (not committed). Claude half deferred (D8).\n`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv));
}
