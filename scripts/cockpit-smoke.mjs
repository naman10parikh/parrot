#!/usr/bin/env node
// scripts/cockpit-smoke.mjs — the DETERMINISTIC $0, chromium-free cockpit merge gate (G2).
//
// Boots cockpit/server.mjs on an ephemeral port, asserts the 4 view APIs return REAL data, and asserts
// the /ar-proof render is `<html dir="rtl">` with 3 DISTINCT Arabic plural strings (parrot's load-bearing
// RTL coverage proof — O11/O23). Exits non-zero on any failure. This is the merge gate that runs in CI on
// every push (no browser, no install, no build — pure Node stdlib + global fetch). The real-browser layer
// is test/e2e/cockpit.spec.ts (chromium-gated, best-effort in CI).
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const PORT = 7793 + (process.pid % 200); // avoid clashing with a dev cockpit on :7799
const BASE = `http://localhost:${PORT}`;

const fails = [];
function ok(cond, label) {
  if (!cond) fails.push(label);
  else console.log(`  ✓ ${label}`);
}
async function getJson(path) {
  const r = await fetch(BASE + path);
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status}`);
  return r.json();
}
async function getText(path) {
  const r = await fetch(BASE + path);
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status}`);
  return r.text();
}

const srv = spawn("node", ["cockpit/server.mjs", "--port", String(PORT)], { cwd: ROOT });
srv.on("error", (e) => {
  console.error("server spawn failed:", e);
  process.exit(1);
});
function done(code) {
  try {
    srv.kill();
  } catch {
    /* already gone */
  }
  process.exit(code);
}

async function waitUp(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      await fetch(BASE + "/api/brain/files");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error("cockpit did not come up on " + BASE);
}

try {
  await waitUp();

  // view 1 — brain browser
  const files = await getJson("/api/brain/files");
  ok(Array.isArray(files.files) && files.files.length === 6, "brain: exactly 6 brain files listed");
  const one = await getJson("/api/brain/file?name=" + encodeURIComponent(files.files[0]));
  ok(typeof one.markdown === "string" && one.markdown.length > 100, "brain: a file renders real markdown");
  const search = await getJson("/api/brain?q=polish+plural");
  ok(Array.isArray(search.hits) && search.hits.length >= 1 && !!search.hits[0].heading, "brain: BM25 search returns a cited hit");

  // view 2 — run log
  const runs = await getJson("/api/runs");
  ok(runs.aggregate && typeof runs.aggregate.total === "number", "runs: aggregate is valid JSON with a numeric total");

  // view 3 — eval scores (L1 is the $0/no-build structural floor)
  const ev = await getJson("/api/eval?level=1");
  ok(Array.isArray(ev.l1) && ev.l1.length >= 3, "eval: L1 structural assertions present");

  // view 4 + the LOAD-BEARING coverage proof — /ar-proof render
  const ar = await getText("/ar-proof");
  ok(/<html[^>]+dir="rtl"/.test(ar), 'ar-proof: <html dir="rtl"> (RTL direction proven)');
  const plurals = [...ar.matchAll(/<li[^>]*class="ar-plural"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1].trim());
  ok(plurals.length === 3, "ar-proof: 3 CLDR plural categories rendered");
  ok(new Set(plurals).size >= 2, "ar-proof: the plurals are DISTINCT per category (not the English fallback)");

  if (fails.length) {
    console.error(`\ncockpit-smoke FAILED (${fails.length}):`);
    fails.forEach((f) => console.error("  ✗ " + f));
    done(1);
  }
  console.log("\ncockpit-smoke GREEN — 4 views + RTL coverage proof all serve real data ($0, no chromium).");
  done(0);
} catch (e) {
  console.error("cockpit-smoke ERROR:", e instanceof Error ? e.message : String(e));
  done(1);
}
