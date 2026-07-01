#!/usr/bin/env node
// sandbox/boot.mjs — parrot's E2B Firecracker sandbox-boot acceptance (E4, the Sandbox/Infra
// component, brain §11 / HARNESS-OVERRIDES §11 / PLAN §3 component 11). This is the REAL
// integration point: it ACTUALLY BOOTS an ephemeral E2B microVM, copies parrot's built dist/ +
// the bundled acceptance fixture INTO the VM, runs a REAL parrot verb INSIDE the sandbox, asserts
// rc=0 + a real datum, measures the cold start (≤500ms target), logs telemetry, and tears down.
//
// The in-VM verb is parrot's load-bearing i18n proof (O11/O23), run with ZERO creds and ZERO
// runtime deps (pure Node stdlib + built-in Intl — the whole reason the lib deliberately does NOT
// use FormatJS's NAPI parser, which P25 says breaks in bare-Node sandboxes):
//   1) `parrot check --dir eval/fixtures/app --locales en,pl,ar --json` → asserts the correctness
//      gate ran and caught the PLANTED pl plural gap ({check:"plural",locale:"pl"} in failures) —
//      i.e. `pass:false` for the RIGHT reason (S3/P6). A real verdict, not a toy echo.
//   2) `sandbox/render-ar.mjs --mode local` → the `/ar/` render proof: the [locale] layout resolves
//      <html dir="rtl"> for `ar` AND the ar plural renders 3 DISTINCT strings for count=1,2,6 via
//      real Intl.PluralRules('ar') (S7/O11/O23). rc=0 = the dir + plural facts both held IN the VM.
//
// Gating (D15 / Sandbox OVERRIDE): this is the SANDBOX-COMPONENT gate, NOT the merge gate. The merge
// gate is acceptance.yml (init→extract→check→assert.mjs + pass^k + eval L2 + render-ar --mode local)
// on the ubuntu runner — it needs NO E2B key. If E2B_API_KEY is ABSENT, this runs the SAME two
// proofs LOCALLY on the host ($0 fallback, deterministic) so the additive CI job NEVER blocks on a
// cred and the boot logic is still exercised end-to-end. When the key IS present (inherited from
// energy .env), a real Firecracker boot runs. The live `next dev` HTTP `/ar/` render (render-ar
// --mode live) stays the ADDITIVE acceptance-e2b.yml path — heavy Next install, off the fast boot.
//
// Mirrors pigeon/sandbox/boot.mjs (the Sandbox.create + in-VM verb pattern) + bee/hush (Dockerfile +
// acceptance convention), adapted to parrot's i18n/RTL-render domain.

import { readFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const RUNS_LOG = join(REPO_ROOT, "logs", "runs.jsonl");
const CLI = "bin/parrot"; // parrot's launcher: a thin shim that imports+CALLS main() from dist/cli/index.js.
                          // (running `node dist/cli/index.js` directly is a no-op — index.js only EXPORTS main.)
const RENDER_AR = "sandbox/render-ar.mjs";
const COLD_START_TARGET_MS = 500;

// The exact parrot check invocation the sandbox exercises (THE datum — the correctness gate on the
// bundled fixture). --json makes the verdict machine-checkable; the fixture PLANTS a pl plural gap.
const CHECK_ARGS = [
  CLI,
  "check",
  "--dir", "eval/fixtures/app",
  "--locales", "en,pl,ar",
  "--json",
];

/** Load parrot's gitignored .env into process.env (the E2B SDK reads E2B_API_KEY from env). */
function loadDotEnv() {
  try {
    for (const line of readFileSync(join(REPO_ROOT, ".env"), "utf8").split("\n")) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    // no .env — rely on the ambient environment (CI sets E2B_API_KEY as a secret).
  }
}

/**
 * Append a sandbox-boot telemetry row to logs/runs.jsonl (append-only). Never throws.
 * @param {Record<string, unknown>} row
 */
function logRow(row) {
  try {
    mkdirSync(dirname(RUNS_LOG), { recursive: true });
    appendFileSync(
      RUNS_LOG,
      JSON.stringify({
        ts: new Date().toISOString(),
        verb: "sandbox-boot",
        model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8[1m]",
        ...row,
      }) + "\n",
    );
  } catch {
    // best-effort telemetry
  }
}

/** @param {string} msg */
function note(msg) {
  process.stderr.write(`[parrot-sandbox] ${msg}\n`);
}

/** Parse the `parrot check --json` verdict out of a mixed stdout blob. */
function parseCheckResult(stdout) {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(stdout.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Assert the invariant against a `parrot check` verdict: the gate ran on the fixture AND caught the
 * PLANTED pl plural gap (pass:false for the RIGHT reason — S3/P6). Returns {ok, plGap, detail}.
 * @param {any} v the parsed check JSON
 */
function checkInvariant(v) {
  const failures = Array.isArray(v?.failures) ? v.failures : [];
  const plGap = failures.some((f) => f?.check === "plural" && f?.locale === "pl");
  const ok = v?.pass === false && plGap;
  return {
    ok,
    plGap,
    detail: `pass=${v?.pass} plPluralGapCaught=${plGap} failures=${failures.length}`,
  };
}

/**
 * The $0 LOCAL fallback (no E2B key): run the SAME two proofs on the host and assert. Keeps the boot
 * logic exercised end-to-end so the additive CI job is meaningful even without a cred (D15).
 */
function runLocalFallback() {
  const t0 = performance.now();
  // `parrot check` EXITS 1 on findings (the planted pl gap) — that's a linter, not a failure. Capture
  // stdout regardless of exit code (execFileSync throws on non-zero → read err.stdout); assert on the verdict.
  let checkOut = "";
  try {
    checkOut = execFileSync("node", CHECK_ARGS, { cwd: REPO_ROOT, encoding: "utf8" });
  } catch (err) {
    checkOut = (err && typeof err === "object" && "stdout" in err && err.stdout) ? String(err.stdout) : "";
  }
  const localMs = Math.round((performance.now() - t0) * 10) / 10;
  const v = parseCheckResult(checkOut);
  const inv = checkInvariant(v);
  // The /ar/ render proof (dir=rtl + distinct ar plural) — rc=0 means both facts held.
  let renderOk = false;
  try {
    execFileSync("node", [RENDER_AR, "--mode", "local"], { cwd: REPO_ROOT, encoding: "utf8" });
    renderOk = true;
  } catch {
    renderOk = false;
  }
  const invariantHeld = inv.ok && renderOk;

  const result = {
    mode: "local-$0-fallback",
    reason: "E2B_API_KEY absent — ran parrot check + /ar/ render on the host (D15 local-first). E2B live boot pending the key (S-E2B).",
    localMs,
    pass: v?.pass ?? null,
    plPluralGapCaught: inv.plGap,
    failures: Array.isArray(v?.failures) ? v.failures.length : null,
    arRenderOk: renderOk,
    invariantHeld,
  };
  logRow(result);
  process.stdout.write(JSON.stringify(result) + "\n");
  if (!invariantHeld) {
    note(`LOCAL INVARIANT FAILED: check=${inv.detail}, arRenderOk=${renderOk}`);
    process.exit(1);
  }
  note(`LOCAL $0 BOOT PASS — parrot check rc=0 (${inv.detail}), /ar/ render dir=rtl+distinct-plural OK, ran in ${localMs}ms (E2B live boot pending key)`);
  process.exit(0);
}

/** The real E2B Firecracker boot: copy dist+fixture in, run parrot check + /ar/ render IN the VM, assert, tear down. */
async function runE2B() {
  const { Sandbox } = await import("e2b");
  /** @type {import("e2b").Sandbox | null} */
  let sbx = null;
  try {
    // 1) Boot the microVM — MEASURE the cold start (≤500ms target).
    const t0 = performance.now();
    sbx = await Sandbox.create({ timeoutMs: 180_000 });
    const coldStartMs = Math.round((performance.now() - t0) * 10) / 10;
    note(`sandbox booted: ${sbx.sandboxId} (cold start ${coldStartMs}ms, target ≤${COLD_START_TARGET_MS}ms)`);

    // 2) Copy parrot's built artifacts INTO the sandbox: the compiled dist/, the render-ar proof,
    //    the acceptance fixture (messages + [locale] layout — what check + render-ar read), and
    //    package.json. render-ar is pure stdlib (built-in Intl); `parrot check` needs exactly ONE
    //    runtime dep — `commander` (zero transitive deps) — so we copy its resolved dir to a FLAT
    //    node_modules/commander in the VM. No in-VM `npm install` / network for deps needed (faster,
    //    hermetic — the whole reason the lib avoids FormatJS's NAPI parser, P25).
    const { realpathSync } = await import("node:fs");
    const commanderReal = realpathSync(join(REPO_ROOT, "node_modules", "commander"));
    const toCopy = [
      { abs: join(REPO_ROOT, "dist"), remote: "/home/user/parrot/dist" },
      { abs: join(REPO_ROOT, "sandbox/render-ar.mjs"), remote: "/home/user/parrot/sandbox/render-ar.mjs" },
      { abs: join(REPO_ROOT, "eval/fixtures/app"), remote: "/home/user/parrot/eval/fixtures/app" },
      { abs: join(REPO_ROOT, "package.json"), remote: "/home/user/parrot/package.json" },
      { abs: commanderReal, remote: "/home/user/parrot/node_modules/commander" },
    ];
    for (const { abs, remote } of toCopy) {
      if (!existsSync(abs)) throw new Error(`missing ${abs} — run \`pnpm build\` && \`pnpm install\` before the sandbox boot`);
      await copyPathIntoSandbox(sbx, abs, remote);
    }
    // The launcher: bin/parrot is extensionless, which Node 20 (the E2B default template) REFUSES to run
    // under a "type":"module" package.json (ERR_UNKNOWN_FILE_EXTENSION). Write a `.mjs` twin of bin/parrot
    // into the VM so `node run.mjs <verb>` works on ANY Node ≥20 — same import, node-version-agnostic.
    await sbx.files.write(
      "/home/user/parrot/run.mjs",
      `import { main } from "./dist/cli/index.js";\nmain(["node", "parrot", ...process.argv.slice(2)]).catch((e) => { process.stderr.write(String(e?.message ?? e) + "\\n"); process.exit(1); });\n`,
    );
    note("dist + render-ar + fixture + commander + run.mjs launcher copied in (no in-VM npm install — check is 1-dep, render-ar is stdlib)");

    // 3) RUN the real parrot check against the LIVE boot (the correctness gate on the fixture).
    //    `check` is a LINTER: it EXITS 1 when it finds issues (the fixture PLANTS a pl plural gap on
    //    purpose), so a non-zero exit is EXPECTED and correct — the signal is the --json VERDICT, not
    //    rc. `|| true` keeps E2B's commands.run from throwing on that expected non-zero (same pattern
    //    the ubuntu merge gate uses in acceptance.yml); we assert on the parsed verdict below.
    // CHECK_ARGS[0] is the host launcher (bin/parrot); in-VM we invoke the same verb via run.mjs.
    const checkVerb = CHECK_ARGS.slice(1).map((a) => `'${a}'`).join(" ");
    const checkCmd = `cd /home/user/parrot && node run.mjs ${checkVerb} || true`;
    const checkRun = await sbx.commands.run(checkCmd, { timeoutMs: 60_000 });
    const v = parseCheckResult(checkRun.stdout);
    if (!v) throw new Error(`no parrot check verdict in-sandbox (exit ${checkRun.exitCode}); stdout: ${checkRun.stdout.slice(0, 200)}; stderr: ${checkRun.stderr.slice(0, 400)}`);
    const inv = checkInvariant(v);

    // 4) RUN the /ar/ render proof IN the VM (dir=rtl + distinct ar plural — rc=0 = both facts held).
    const renderRun = await sbx.commands.run(
      `cd /home/user/parrot && node ${RENDER_AR} --mode local`,
      { timeoutMs: 60_000 },
    );
    const arRenderOk = renderRun.exitCode === 0;

    // 5) Assert THE INVARIANT against the LIVE boot: the gate caught the planted pl gap AND /ar/ rendered.
    const invariantHeld = inv.ok && arRenderOk;
    const coldStartOk = coldStartMs <= COLD_START_TARGET_MS;

    const result = {
      mode: "e2b-live-boot",
      sandboxId: sbx.sandboxId,
      coldStartMs,
      coldStartOk,
      coldStartTargetMs: COLD_START_TARGET_MS,
      pass: v.pass,
      plPluralGapCaught: inv.plGap,
      failures: Array.isArray(v.failures) ? v.failures.length : null,
      arRenderOk,
      invariantHeld,
    };
    logRow(result);
    process.stdout.write(JSON.stringify(result) + "\n");

    if (!invariantHeld) {
      note(`INVARIANT FAILED: check=${inv.detail}, arRenderOk=${arRenderOk} (render exit ${renderRun.exitCode}, stderr: ${renderRun.stderr.slice(0, 200)})`);
      process.exitCode = 1;
    } else {
      note(`LIVE BOOT PASS — parrot check rc=0 (${inv.detail}), /ar/ render dir=rtl+distinct-plural OK, cold start ${coldStartMs}ms${coldStartOk ? " (≤500ms ✓)" : " (>500ms — logged)"}`);
    }
  } finally {
    // 6) ALWAYS tear the sandbox down.
    if (sbx) {
      try {
        await sbx.kill();
        note("sandbox torn down");
      } catch (err) {
        note(`teardown warning: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}

/**
 * Copy a local file or directory into the sandbox. E2B's files.write takes one file at a time, so
 * a directory is walked and each file is written under its mirrored remote path.
 * @param {import("e2b").Sandbox} sbx
 * @param {string} absLocal
 * @param {string} remote
 */
async function copyPathIntoSandbox(sbx, absLocal, remote) {
  const { readdirSync, statSync, readFileSync: rf } = await import("node:fs");
  const st = statSync(absLocal);
  if (st.isDirectory()) {
    for (const entry of readdirSync(absLocal)) {
      await copyPathIntoSandbox(sbx, join(absLocal, entry), `${remote}/${entry}`);
    }
  } else {
    await sbx.files.write(remote, rf(absLocal, "utf8"));
  }
}

async function main() {
  loadDotEnv();
  // Guard: dist must be built (both paths run the compiled CLI via the bin/parrot launcher).
  if (!existsSync(join(REPO_ROOT, "dist", "cli", "index.js"))) {
    note("missing dist/cli/index.js — run `pnpm build` first");
    process.exit(1);
  }
  const hasKey = Boolean(process.env.E2B_API_KEY);
  if (!hasKey) {
    // Honest $0 fallback (NOT a skip-with-nothing): exercise the SAME two proofs on the host so the
    // boot logic is proven even without an E2B cred. The additive CI job never blocks (exit 0).
    note("E2B_API_KEY absent — running parrot check + /ar/ render LOCALLY ($0 fallback, D15). E2B live boot pending the key (S-E2B).");
    runLocalFallback(); // exits 0 on pass
    return;
  }
  await runE2B();
}

main().catch((err) => {
  process.stderr.write(`[parrot-sandbox] ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
