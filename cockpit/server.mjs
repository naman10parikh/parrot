#!/usr/bin/env node
/**
 * parrot COCKPIT server (Component "product surface" / PLAN §10 / D3; G1).
 *
 * The chairman's eyes on the i18n employee. A localhost, zero-dependency Node `http` server (the proven
 * sentinel/talent-intel pattern) + a vanilla-JS SPA, in the warm-black Energy design (#141312 surfaces, amber
 * accent, Instrument-Serif display + Poppins body — `.claude/rules/design.md`). Agents drive parrot via the CLI
 * and the MCP server; this cockpit is for a human to SEE the brain, the run telemetry, the eval pyramid, and to
 * ask the employee a question — all over REAL data, no mocks.
 *
 * Four views (PLAN §10), each backed by an API endpoint that reads real artifacts:
 *   1. Brain browser      → GET /api/brain/files , GET /api/brain/file?name=…  (the 6 brain/*.md, rendered)
 *   2. Run log            → GET /api/runs                                       (logs/runs.jsonl + aggregates)
 *   3. Eval scores        → GET /api/eval                                       (eval/eval.mjs --json: L1/L2/L3)
 *   4. Ask the employee   → GET /api/brain?q=…  + POST /api/action              (BM25 brain search + quick-acts)
 *
 * Plus GET /ar-proof — a real rendered DOM (<html dir="rtl"> + the fixture's distinct Arabic plurals, via native
 * Intl.PluralRules) so the G2 Playwright smoke can assert the RTL coverage proof in a browser, hermetically and
 * at $0 (no Next install — honors D15: the merge gate has no provider/runtime dependency). This is the SAME
 * grammar engine the fixture layout runs; the live-HTTP `next dev` render is the additive E2B path (E4).
 *
 * Zero deps (pure Node stdlib). Reuses the existing data layer — `searchBrain` from scripts/brain-search.mjs,
 * the runs aggregator (scripts/runs-view.mjs --json), the eval pyramid (eval/eval.mjs --json) — no re-impl.
 *
 * Usage:  node cockpit/server.mjs [--port 7799]
 */

import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import { searchBrain } from "../scripts/brain-search.mjs";

const HERE = dirname(fileURLToPath(import.meta.url)); // cockpit/
const REPO_ROOT = join(HERE, "..");
const PUBLIC_DIR = join(HERE, "public");
const BRAIN_DIR = join(REPO_ROOT, "brain");

// The 6 canonical brain artifacts (PLAN §10 view 1) — name → on-disk file. Anything not in this allow-list is
// rejected (no arbitrary file read through ?name=).
const BRAIN_FILES = {
  "EXPERTISE-MAP": "EXPERTISE-MAP.md",
  "BATTLE-TESTED-SCENARIOS": "BATTLE-TESTED-SCENARIOS.md",
  "KNOWN-PITFALLS": "KNOWN-PITFALLS.md",
  "OPINIONS": "OPINIONS.md",
  "GAPS-AND-DISPUTES": "GAPS-AND-DISPUTES.md",
  "TOOL-MATRIX": "TOOL-MATRIX.md",
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(body) });
  res.end(body);
}

function sendText(res, code, text, mime = "text/plain; charset=utf-8") {
  res.writeHead(code, { "content-type": mime });
  res.end(text);
}

/** Spawn a Node script in the repo root and resolve with {code, stdout, stderr}. No shell (argv array). */
function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: REPO_ROOT });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (e) => resolve({ code: -1, stdout, stderr: stderr + String(e) }));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

/** Render the fixture's `ar` cartSummary plural for count 1,2,6 via native Intl — the RTL coverage proof DOM. */
function arProofData() {
  const catPath = join(REPO_ROOT, "eval", "fixtures", "app", "messages", "ar.json");
  const fallback = { dir: "rtl", branches: {}, rendered: [], error: null };
  if (!existsSync(catPath)) return { ...fallback, error: "fixture messages/ar.json absent (run `parrot init` on the fixture)" };
  let msg = "";
  try {
    msg = JSON.parse(readFileSync(catPath, "utf8"))?.home?.cartSummary ?? "";
  } catch (e) {
    return { ...fallback, error: `ar.json parse error: ${e.message}` };
  }
  // Extract the per-category plural branches from the ICU message (same shape sandbox/render-ar.mjs reads).
  const branches = new Map();
  const idx = msg.search(/,\s*plural\s*,/);
  if (idx !== -1) {
    const tokenRe = /(=\d+|zero|one|two|few|many|other)\s*\{/g;
    tokenRe.lastIndex = msg.indexOf(",", msg.indexOf(",", idx + 1) + 1);
    let m;
    while ((m = tokenRe.exec(msg)) !== null) {
      let depth = 1;
      let j = tokenRe.lastIndex;
      let body = "";
      while (j < msg.length && depth > 0) {
        const ch = msg[j];
        if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) break;
        }
        body += ch;
        j++;
      }
      branches.set(m[1], body.trim());
      tokenRe.lastIndex = j + 1;
    }
  }
  const pr = new Intl.PluralRules("ar");
  const counts = [1, 2, 6];
  const rendered = counts.map((n) => ({
    count: n,
    category: pr.select(n),
    text: (branches.get(pr.select(n)) ?? branches.get("other") ?? "").replace("#", String(n)),
  }));
  return { dir: "rtl", rendered, error: null };
}

/** The /ar-proof HTML — a REAL document Playwright loads: <html dir="rtl"> + the 3 distinct Arabic plurals. */
function arProofHtml() {
  const { dir, rendered, error } = arProofData();
  const rows = rendered
    .map((r) => `<li data-count="${r.count}" data-category="${r.category}" class="ar-plural">${r.text}</li>`)
    .join("\n      ");
  // dir="rtl" + lang="ar" on the root element — exactly what the fixture layout emits for an RTL locale (S7/O11).
  return `<!doctype html>
<html lang="ar" dir="${dir}">
<head><meta charset="utf-8"><title>parrot — /ar/ RTL render proof</title>
<style>body{background:#141312;color:#e7e3da;font-family:system-ui,sans-serif;padding:2rem}
.ar-plural{font-size:1.4rem;margin:.4rem 0}code{color:#e8a838}</style></head>
<body>
  <h1>parrot · Arabic (<code>ar</code>) RTL render proof</h1>
  ${error ? `<p style="color:#e06c5a">${error}</p>` : ""}
  <p>The fixture <code>[locale]/layout.tsx</code> sets <code>&lt;html dir="rtl"&gt;</code> for RTL locales; the
     <code>ar</code> plural renders <strong>distinct</strong> strings per CLDR category — proven, not from English.</p>
  <ul id="ar-plurals">
      ${rows}
  </ul>
</body>
</html>`;
}

async function handleApi(req, res, url) {
  // GET /api/brain?q=…  — BM25 brain search (Ask-the-employee + the MCP parrot_search_brain path).
  if (url.pathname === "/api/brain" && req.method === "GET") {
    const q = (url.searchParams.get("q") || "").trim();
    if (!q) return sendJson(res, 200, { query: "", hits: [] });
    const hits = searchBrain(q, Number(url.searchParams.get("limit")) || 8);
    return sendJson(res, 200, { query: q, hits });
  }

  // GET /api/brain/files — the list of the 6 brain artifacts (Brain-browser nav).
  if (url.pathname === "/api/brain/files" && req.method === "GET") {
    return sendJson(res, 200, { files: Object.keys(BRAIN_FILES) });
  }

  // GET /api/brain/file?name=EXPERTISE-MAP — raw markdown of one brain artifact (allow-listed; no path escape).
  if (url.pathname === "/api/brain/file" && req.method === "GET") {
    const name = url.searchParams.get("name") || "";
    const file = BRAIN_FILES[name];
    if (!file) return sendJson(res, 404, { error: `unknown brain file: ${name}`, files: Object.keys(BRAIN_FILES) });
    const path = join(BRAIN_DIR, file);
    if (!existsSync(path)) return sendJson(res, 404, { error: `brain file missing on disk: ${file}` });
    return sendJson(res, 200, { name, markdown: readFileSync(path, "utf8") });
  }

  // GET /api/runs — the run log aggregate (runs-view --json) + the recent raw lines for the table.
  if (url.pathname === "/api/runs" && req.method === "GET") {
    const agg = await run("node", ["scripts/runs-view.mjs", "--json"]);
    let aggregate = { total: 0, commands: [], overall: {} };
    try {
      aggregate = JSON.parse(agg.stdout || "{}");
    } catch {
      /* keep the empty default if runs-view emitted nothing parseable */
    }
    // Recent raw lines straight from logs/runs.jsonl (newest last → show newest first, capped).
    const logPath = join(REPO_ROOT, "logs", "runs.jsonl");
    let recent = [];
    if (existsSync(logPath)) {
      recent = readFileSync(logPath, "utf8")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          try {
            return JSON.parse(l);
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .slice(-100)
        .reverse();
    }
    return sendJson(res, 200, { aggregate, recent });
  }

  // GET /api/eval[?level=2] — the eval pyramid (eval/eval.mjs --json). Default L1 (fast, $0, no build needed for
  // the structural floor); ?level=2 runs the golden gate (needs `pnpm build` for the dist/ probes).
  if (url.pathname === "/api/eval" && req.method === "GET") {
    const level = ["1", "2", "3"].includes(url.searchParams.get("level") || "") ? url.searchParams.get("level") : "1";
    const r = await run("node", ["eval/eval.mjs", "--level", level, "--json"]);
    try {
      return sendJson(res, 200, { ...JSON.parse(r.stdout), exit: r.code });
    } catch {
      // L2 needs the compiled dist/ — if it isn't built, eval errors to stderr; surface that honestly, not a crash.
      return sendJson(res, 200, {
        level: Number(level),
        green: null,
        error: (r.stderr || "eval produced no JSON").trim().slice(0, 400),
        l1: null,
        l2: null,
      });
    }
  }

  // GET /api/ci-blocking — the CI-blocking golden subset (eval/ci-blocking.json), for the Eval view's badge.
  if (url.pathname === "/api/ci-blocking" && req.method === "GET") {
    const p = join(REPO_ROOT, "eval", "ci-blocking.json");
    let set = [];
    try {
      set = JSON.parse(readFileSync(p, "utf8"));
    } catch {
      /* empty if absent */
    }
    return sendJson(res, 200, { blocking: set });
  }

  // POST /api/action — the Ask-the-employee quick-action row: `parrot pick` (a library decision) or
  // `parrot check <dir>` (the correctness gate on a path). Body: {action:"pick"|"check", dir?}. Returns the
  // CLI's stdout — these commands return verdicts, never secrets (the §4 HARD invariant).
  if (url.pathname === "/api/action" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    let parsed = {};
    try {
      parsed = JSON.parse(body || "{}");
    } catch {
      return sendJson(res, 400, { error: "invalid JSON body" });
    }
    if (parsed.action === "pick") {
      const r = await run("node", ["bin/parrot", "pick"]);
      return sendJson(res, 200, { action: "pick", exit: r.code, output: (r.stdout || r.stderr).trim() });
    }
    if (parsed.action === "check") {
      const dir = typeof parsed.dir === "string" && /^[a-zA-Z0-9_./-]+$/.test(parsed.dir) ? parsed.dir : "eval/fixtures/app";
      const r = await run("node", ["bin/parrot", "check", "--dir", dir, "--json"]);
      return sendJson(res, 200, { action: "check", dir, exit: r.code, output: (r.stdout || r.stderr).trim() });
    }
    return sendJson(res, 400, { error: `unknown action: ${parsed.action}` });
  }

  return sendJson(res, 404, { error: `no such endpoint: ${url.pathname}` });
}

/** Serve a static asset from cockpit/public (index.html for "/"). Path-escape guarded to PUBLIC_DIR. */
function serveStatic(req, res, url) {
  let rel = url.pathname === "/" ? "/index.html" : url.pathname;
  rel = rel.replace(/\.\.+/g, ""); // no parent traversal
  const path = join(PUBLIC_DIR, rel);
  if (!path.startsWith(PUBLIC_DIR) || !existsSync(path)) return sendText(res, 404, "not found");
  const ext = extname(path);
  return sendText(res, 200, readFileSync(path), MIME[ext] || "application/octet-stream");
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/ar-proof") return sendText(res, 200, arProofHtml(), "text/html; charset=utf-8");
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return serveStatic(req, res, url);
  } catch (e) {
    return sendJson(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
});

function parsePort(argv) {
  const i = argv.indexOf("--port");
  if (i !== -1 && argv[i + 1]) return Number(argv[i + 1]);
  return Number(process.env.PORT) || 7799;
}

const PORT = parsePort(process.argv.slice(2));
server.listen(PORT, () => {
  process.stdout.write(`parrot cockpit → http://localhost:${PORT}  (brain · runs · evals · ask)\n`);
});
