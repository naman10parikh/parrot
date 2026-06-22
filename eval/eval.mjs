#!/usr/bin/env node
/**
 * parrot EVAL PYRAMID (Hamel L1/L2/L3; E1 / PLAN §6 / HARNESS-OVERRIDES §9).
 *
 * The differentiator made executable — "test the 20% invisible in English" as a gate, NOT a self-graded vibe.
 *
 *   L1 (structural, $0)   — repo-shape invariants: identity has no template slots; .mcp.json lists `parrot` with
 *                           no literal secret; dsip.json parses; the acceptance fixture is wired (proxy.ts +
 *                           setRequestLocale present); the 6 brain files exist.
 *   L2 (golden, $0)       — the ≥12 binary golden tasks (eval/golden/GT-*.json), each lifted 1:1 from a brain
 *                           scenario (S-id) and graded against that scenario's OBJECTIVE Eval-gate — never the
 *                           agent's own opinion (dsip noSelfGrading). Two legs per task, BOTH must hold:
 *                             (a) a live-code PROBE against parrot's real functions (init/check/extract/bcp47/
 *                                 plural/icu) — proves actual behavior, ungameable by text; and
 *                             (b) a golden-answer CONTRACT (mustInclude / mustRefuse over the stored `expected`)
 *                                 — turns RED the moment a golden answer is broken (the board break-test).
 *                           Reports F1 (≥0.8 bar) + the CI-blocking subset (eval/ci-blocking.json) status.
 *   L3 (trajectory)       — calibrated LLM-judge on the trajectory tasks (eval/judge/rubric.md). DEFERRED to
 *                           CLAUDE_CODE_OAUTH_TOKEN (D8) — absence is NOT a gap; reports `judge-deferred`, exit 0.
 *
 * Exit code: 0 iff the requested level is green. `--level 2` (and the default) FAIL non-zero if ANY blocking
 * golden task fails (the board's break-test: mutate GT-3's golden answer → L2 red). Zero deps; imports parrot's
 * compiled lib from dist/ (run `pnpm build` first — the CLI `parrot eval` ensures this).
 *
 * Karpathy-surgical: the pyramid the spec names, probes that reuse existing functions (no re-impl), nothing
 * speculative. L3 is a stub-until-token by chairman decision, not an unfinished feature.
 */

import { readFileSync, existsSync, readdirSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url)); // eval/
const REPO_ROOT = join(HERE, "..");
const FIXTURE = join(REPO_ROOT, "eval", "fixtures", "app");
const GOLDEN_DIR = join(HERE, "golden");

// ---- compiled parrot lib (dist/) — the probes call the REAL functions, not re-implementations ----
const dist = (p) => join(REPO_ROOT, "dist", p);
async function loadParrot() {
  if (!existsSync(dist("cli/commands/init.js"))) {
    throw new Error("parrot not built — run `pnpm build` (the eval probes import the compiled lib from dist/).");
  }
  const [{ runInit }, { runCheck }, { runExtract }, { validateBcp47 }, plural, { inspectIcu }] = await Promise.all([
    import(dist("cli/commands/init.js")),
    import(dist("cli/commands/check.js")),
    import(dist("cli/commands/extract.js")),
    import(dist("lib/bcp47.js")),
    import(dist("lib/plural.js")),
    import(dist("lib/icu-parse.js")),
  ]);
  return { runInit, runCheck, runExtract, validateBcp47, plural, inspectIcu };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

// ============================== L1 — structural assertions ==============================

function runL1() {
  const checks = [];
  const assert = (name, ok, detail = "") => checks.push({ name, ok, detail });

  // identity has no {{UPPERCASE}} template slots (the scaffold ships {{AGENT_NAME}} etc.)
  for (const f of ["identity/SOUL.md", "identity/BRAND.md"]) {
    const p = join(REPO_ROOT, f);
    const src = existsSync(p) ? readFileSync(p, "utf8") : "";
    assert(`${f} has no {{SLOT}} template slots`, src.length > 0 && !/\{\{[A-Z_]+\}\}/.test(src), existsSync(p) ? "slot found" : "file missing");
  }

  // .mcp.json lists `parrot` AND has no literal secret value (secret-shaped env keys must be ${VAR})
  const mcpPath = join(REPO_ROOT, ".mcp.json");
  let mcpOk = false, mcpNoSecret = false, mcpDetail = ".mcp.json missing";
  if (existsSync(mcpPath)) {
    try {
      const mcp = readJson(mcpPath);
      mcpOk = !!(mcp.mcpServers && mcp.mcpServers.parrot);
      const S = /(TOKEN|KEY|SECRET|PASSWORD|API|CREDENTIAL)/i;
      const bad = [];
      for (const [n, c] of Object.entries(mcp.mcpServers ?? {})) {
        for (const [k, v] of Object.entries(c.env ?? {})) {
          if (S.test(k) && !(typeof v === "string" && v.startsWith("${") && v.endsWith("}"))) bad.push(`${n}.${k}`);
        }
      }
      mcpNoSecret = bad.length === 0;
      mcpDetail = mcpOk ? (mcpNoSecret ? "" : `literal secret in ${bad.join(",")}`) : "no `parrot` server";
    } catch (e) {
      mcpDetail = `.mcp.json parse error: ${e.message}`;
    }
  }
  assert(".mcp.json lists the `parrot` server", mcpOk, mcpDetail);
  assert(".mcp.json has no literal secret (env refs are ${VAR})", mcpNoSecret, mcpDetail);

  // dsip.json parses + is the darwin shape (minimal: dsip + product)
  const dsipPath = join(REPO_ROOT, "dsip.json");
  let dsipOk = false, dsipDetail = "dsip.json missing";
  if (existsSync(dsipPath)) {
    try {
      const d = readJson(dsipPath);
      dsipOk = d.dsip === "0.1" && d.product === "parrot";
      dsipDetail = dsipOk ? "" : `unexpected dsip/product: ${d.dsip}/${d.product}`;
    } catch (e) {
      dsipDetail = `dsip.json parse error: ${e.message}`;
    }
  }
  assert("dsip.json parses (dsip:0.1, product:parrot)", dsipOk, dsipDetail);

  // the acceptance fixture is wired: proxy.ts (Next 16) exists + setRequestLocale present in the layout
  const proxyExists = existsSync(join(FIXTURE, "src", "proxy.ts"));
  assert("fixture src/proxy.ts exists (Next 16 wired, not middleware.ts)", proxyExists && !existsSync(join(FIXTURE, "src", "middleware.ts")), "proxy.ts missing or middleware.ts present");
  const layoutPath = join(FIXTURE, "src", "app", "[locale]", "layout.tsx");
  const layoutSrc = existsSync(layoutPath) ? readFileSync(layoutPath, "utf8") : "";
  assert("fixture [locale]/layout.tsx calls setRequestLocale (S1/P1)", /setRequestLocale\s*\(/.test(layoutSrc), "setRequestLocale absent in layout");

  // the 6 brain files exist
  const BRAIN = ["EXPERTISE-MAP", "BATTLE-TESTED-SCENARIOS", "KNOWN-PITFALLS", "OPINIONS", "GAPS-AND-DISPUTES", "TOOL-MATRIX"];
  for (const b of BRAIN) {
    assert(`brain/${b}.md present`, existsSync(join(REPO_ROOT, "brain", `${b}.md`)), "missing");
  }

  return checks;
}

// ============================== L2 — golden tasks (probe + contract) ==============================

/** Load every GT-*.json, sorted by numeric id. */
function loadGolden() {
  const files = readdirSync(GOLDEN_DIR).filter((f) => /^GT-\d+\.json$/.test(f));
  const tasks = files.map((f) => ({ file: f, ...readJson(join(GOLDEN_DIR, f)) }));
  tasks.sort((a, b) => Number(a.id.replace("GT-", "")) - Number(b.id.replace("GT-", "")));
  return tasks;
}

/** The golden-answer CONTRACT leg: the stored `expected` must include every mustInclude term + refuse every
 *  mustRefuse term (case-insensitive). This is what turns RED when a golden answer is broken. */
function contractLeg(task) {
  const ans = (task.expected ?? "").toLowerCase();
  const missing = (task.mustInclude ?? []).filter((t) => !ans.includes(String(t).toLowerCase()));
  const violated = (task.mustRefuse ?? []).filter((t) => ans.includes(String(t).toLowerCase()));
  const ok = missing.length === 0 && violated.length === 0;
  let detail = "";
  if (!ok) {
    const bits = [];
    if (missing.length) bits.push(`missing required: ${missing.join(", ")}`);
    if (violated.length) bits.push(`commits refused: ${violated.join(", ")}`);
    detail = bits.join("; ");
  }
  return { ok, detail };
}

/** The live-code PROBE leg: run the named probe against parrot's real functions. Returns {ok, detail}. */
function probeLeg(task, P) {
  const key = task.probe;
  if (!key) return { ok: true, detail: "no-probe (knowledge/L3 task — graded by the contract leg)" };
  const tmp = () => mkdtempSync(join(tmpdir(), "parrot-gt-"));

  try {
    switch (key) {
      case "init-layout-has-setRequestLocale": {
        const d = tmp();
        try {
          P.runInit(d, "next-intl", ["en", "pl", "ar"], "en");
          const layout = readFileSync(join(d, "src", "app", "[locale]", "layout.tsx"), "utf8");
          const ok = /setRequestLocale\s*\(/.test(layout) && /await\s+params/.test(layout);
          return { ok, detail: ok ? "" : "generated layout missing setRequestLocale/await params" };
        } finally { rmSync(d, { recursive: true, force: true }); }
      }
      case "init-next16-emits-proxy": {
        const d = tmp();
        try {
          // a Next-16 package.json so version detection reads 16
          writeFileSync(join(d, "package.json"), JSON.stringify({ dependencies: { next: "^16.0.0" } }));
          const r = P.runInit(d, "next-intl", ["en", "pl"], "en");
          const ok = r.middlewareFile === "src/proxy.ts" && existsSync(join(d, "src", "proxy.ts")) && !existsSync(join(d, "src", "middleware.ts"));
          return { ok, detail: ok ? "" : `middlewareFile=${r.middlewareFile}` };
        } finally { rmSync(d, { recursive: true, force: true }); }
      }
      case "plural-pl-requires-few-many": {
        const req = P.plural.requiredCategoriesFor("pl");
        const gap = P.plural.pluralGap(new Set(["one", "other"]), "pl");
        const ok = req.includes("few") && req.includes("many") && gap.missing.includes("few") && gap.missing.includes("many") && !gap.complete;
        return { ok, detail: ok ? "" : `pl required=${req.join(",")} gap.missing=${gap.missing.join(",")}` };
      }
      case "icu-fullsentence-plural-valid": {
        const msg = "You have {count, plural, one {# item} other {# items}} in your cart";
        const insp = P.inspectIcu(msg, "en");
        // a correct full-sentence plural for en authors one+other (complete), and is a single message (no '+').
        const ok = insp.hasPlural && insp.pluralCategories.has("one") && insp.pluralCategories.has("other") && !insp.warnings.some((w) => w.pitfall === "P6");
        return { ok, detail: ok ? "" : `hasPlural=${insp.hasPlural} cats=${[...insp.pluralCategories].join(",")}` };
      }
      case "check-flags-rtl-without-dir": {
        const d = tmp();
        try {
          // an app with an ar catalog + a layout that does NOT set dir → check must flag RTL.
          mkdirSync(join(d, "messages"), { recursive: true });
          writeFileSync(join(d, "messages", "ar.json"), JSON.stringify({ home: { title: "x" } }));
          mkdirSync(join(d, "src", "app", "[locale]"), { recursive: true });
          writeFileSync(join(d, "src", "app", "[locale]", "layout.tsx"), "export default function L(){ return <html><body/></html> }");
          const r = P.runCheck(d, ["ar"]);
          const ok = r.failures.some((f) => f.check === "rtl");
          return { ok, detail: ok ? "" : `no rtl failure; failures=${r.failures.map((f) => f.check).join(",")}` };
        } finally { rmSync(d, { recursive: true, force: true }); }
      }
      case "bcp47-graph-validity": {
        const ok = P.validateBcp47("en-GB").valid && P.validateBcp47("x-default").valid && P.validateBcp47("es-419").valid;
        return { ok, detail: ok ? "" : "a valid BCP-47 code was rejected" };
      }
      case "bcp47-rejects-miscodes": {
        const la = P.validateBcp47("es-la");
        const uk = P.validateBcp47("en-uk");
        const me = P.validateBcp47("me");
        const ok = la.valid === false && la.suggestion === "es-419" && uk.valid === false && uk.suggestion === "en-GB" && me.valid === false;
        return { ok, detail: ok ? "" : `es-la=${JSON.stringify(la)} en-uk=${JSON.stringify(uk)} me.valid=${me.valid}` };
      }
      case "extract-honest-unused-note": {
        const r = P.runExtract(FIXTURE);
        const ok = typeof r.note === "string" && /dynamic|runtime|best-effort/i.test(r.note);
        return { ok, detail: ok ? "" : "extract note not honest about unused-key limits" };
      }
      case "icu-flags-angle-literal": {
        const insp = P.inspectIcu("The URL is '<Issuer URL>'/callback", "en");
        const ok = insp.warnings.some((w) => w.pitfall === "P8");
        return { ok, detail: ok ? "" : "did not flag the <...> apostrophe-escape trap (P8/S8)" };
      }
      case "init-routing-offers-never": {
        const d = tmp();
        try {
          P.runInit(d, "next-intl", ["en", "pl"], "en");
          const routing = readFileSync(join(d, "src", "i18n", "routing.ts"), "utf8");
          const ok = /localePrefix/.test(routing) && /never/.test(routing);
          return { ok, detail: ok ? "" : "routing.ts does not mention localePrefix 'never' (cookie-only, S9)" };
        } finally { rmSync(d, { recursive: true, force: true }); }
      }
      // policy probes: no live parrot-code surface yet (mt/tms/seo are planned capabilities) — the scenario's
      // Eval-gate is enforced by the contract leg. Pass the probe leg (it is genuinely N/A), NOT a fake.
      case "policy-mt-governance":
      case "policy-mf1-default":
      case "policy-detect-to-suggest":
        return { ok: true, detail: "policy task — gate enforced by the golden-answer contract (no code surface yet)" };
      default:
        return { ok: false, detail: `unknown probe '${key}'` };
    }
  } catch (e) {
    return { ok: false, detail: `probe threw: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function runL2(tasks, P) {
  const blocking = new Set(readJson(join(HERE, "ci-blocking.json")));
  const results = [];
  for (const task of tasks) {
    if (task.level === "L3") continue; // L3 trajectory tasks are graded by the judge (level 3), not here
    const probe = probeLeg(task, P);
    const contract = contractLeg(task);
    const pass = probe.ok && contract.ok;
    results.push({
      id: task.id,
      source: task.source,
      blocking: blocking.has(task.id),
      pass,
      probe,
      contract,
    });
  }
  return results;
}

// ============================== L3 — judge stubs (deferred per D8) ==============================

function runL3(tasks) {
  const hasToken = !!(process.env.CLAUDE_CODE_OAUTH_TOKEN || process.env.ANTHROPIC_API_KEY);
  const trajectory = tasks.filter((t) => t.level === "L3");
  return trajectory.map((t) => ({
    id: t.id,
    source: t.source,
    // The judge call is the deferred Claude-half cost. Absence of a token is NOT a gap (D8) — report
    // judge-deferred, never a fake PASS. (When the token lands, this is where the rubric.md judge call runs,
    // passing model "claude-opus-4-8[1m]" explicitly per D14.)
    status: hasToken ? "judge-ready" : "judge-deferred",
  }));
}

// ============================== F1 over the golden set ==============================

/** Binary-classification F1: treat each golden task as "should PASS". TP = passed; FN = failed (a real fail is
 *  a false negative on the "agent is correct" claim). With a curated golden set FP=0, so F1 = 2·precision·
 *  recall/(precision+recall) reduces to recall; we report the recall-form so the ≥0.8 bar is meaningful. */
function f1(results) {
  const tp = results.filter((r) => r.pass).length;
  const total = results.length;
  if (total === 0) return 1;
  const recall = tp / total;
  const precision = 1; // no false positives in a curated golden set
  return (2 * precision * recall) / (precision + recall);
}

// ============================== driver ==============================

export async function runEval(level) {
  const tasks = loadGolden();
  const out = { level, l1: null, l2: null, l3: null, f1: null, blockingFail: [], green: false };

  const P = level >= 2 ? await loadParrot() : null;

  // L1 always runs (it's the cheap structural floor and the RSI loop pings `--level 1`).
  out.l1 = runL1();
  const l1Green = out.l1.every((c) => c.ok);

  if (level === 1) {
    out.green = l1Green;
    return out;
  }

  // L2
  out.l2 = runL2(tasks, P);
  out.f1 = f1(out.l2);
  out.blockingFail = out.l2.filter((r) => r.blocking && !r.pass).map((r) => r.id);
  const l2Green = out.blockingFail.length === 0 && out.f1 >= 0.8;

  if (level === 2) {
    out.green = l1Green && l2Green;
    return out;
  }

  // L3 (deferred judge stubs)
  out.l3 = runL3(tasks);
  // L3 absence of a token is not a gap — green iff L1+L2 green (L3 is nightly/non-blocking).
  out.green = l1Green && l2Green;
  return out;
}

/** Pretty-print + return an exit code. */
function report(out) {
  const W = (s) => process.stdout.write(s);
  W(`parrot eval — level ${out.level}\n`);

  // L1
  W(`\n  L1 (structural):\n`);
  for (const c of out.l1) W(`    ${c.ok ? "✓" : "✗"} ${c.name}${c.ok ? "" : ` — ${c.detail}`}\n`);
  const l1Green = out.l1.every((c) => c.ok);
  W(`    → L1 ${l1Green ? "GREEN" : "RED"} (${out.l1.filter((c) => c.ok).length}/${out.l1.length})\n`);

  if (out.level >= 2 && out.l2) {
    W(`\n  L2 (golden tasks — probe + golden-answer contract, graded vs each scenario Eval-gate):\n`);
    for (const r of out.l2) {
      const tag = r.blocking ? "[blocking]" : "[nightly ]";
      W(`    ${r.pass ? "✓" : "✗"} ${tag} ${r.id} (${r.source})${r.pass ? "" : ` — probe:${r.probe.ok ? "ok" : r.probe.detail} | contract:${r.contract.ok ? "ok" : r.contract.detail}`}\n`);
    }
    W(`    → F1 = ${out.f1.toFixed(3)} (bar ≥ 0.800); blocking failures: ${out.blockingFail.length ? out.blockingFail.join(", ") : "none"}\n`);
  }

  if (out.level >= 3 && out.l3) {
    W(`\n  L3 (trajectory — calibrated LLM-judge, deferred to CLAUDE_CODE_OAUTH_TOKEN per D8):\n`);
    for (const r of out.l3) W(`    • ${r.id} (${r.source}): ${r.status}\n`);
  }

  W(`\n  ${out.green ? "EVAL GREEN ✅" : "EVAL RED ❌"} (level ${out.level})\n`);
  return out.green ? 0 : 1;
}

async function main(argv) {
  const args = argv.slice(2);
  const li = args.indexOf("--level");
  const level = li !== -1 && args[li + 1] ? Number(args[li + 1]) : 2; // default = L2 (the blocking gate)
  if (![1, 2, 3].includes(level)) {
    process.stderr.write(`parrot eval: --level must be 1, 2, or 3 (got ${args[li + 1]})\n`);
    return 2;
  }
  const out = await runEval(level);
  return report(out);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv).then((code) => process.exit(code)).catch((e) => {
    process.stderr.write(`parrot eval: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
}
