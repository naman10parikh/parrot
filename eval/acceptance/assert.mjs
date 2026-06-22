#!/usr/bin/env node
/**
 * parrot ACCEPTANCE assert harness (PLAN §5, the bar; E2).
 *
 * THE bar (verbatim): `parrot init` wires next-intl + `parrot extract` finds hardcoded strings + `parrot check`
 * validates ICU plural/RTL + a locale round-trips verifiably.
 *
 * Usage (from the §5 sequence): node eval/acceptance/assert.mjs <extract.json> <check.json>
 *
 * Asserts the §5 five conditions, ALL of which must hold (exit 0 on all-pass, non-zero + a cited failure
 * otherwise). The blocking path is OFFLINE + $0 (D15 LOCAL-FIRST): conditions 1-4 are proven from the wired
 * fixture's files + the extract/check verdicts + a real native-`Intl` plural render (the grammar engine IS the
 * round-trip — no Next runtime, no network). The full live Next `/ar/` HTTP render is the ADDITIVE Sandbox proof
 * (E4 — sandbox/render.mjs / acceptance-e2b.yml), graded on the render itself, NOT the merge blocker (Sandbox
 * OVERRIDE + Q1: the live render demotes to the Sandbox-component proof if it can't run, never blocks the merge).
 *
 * Karpathy-surgical: reads the two JSON verdicts + the fixture files the §5 conditions name, asserts exactly the
 * five conditions, zero deps (pure Node stdlib + the runtime's `Intl`).
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url)); // eval/acceptance
const REPO_ROOT = join(HERE, "..", "..");
const FIXTURE = join(REPO_ROOT, "eval", "fixtures", "app");

/** Read + parse a JSON file, or die with a clear message (the verdicts are required inputs). */
function readJson(path, label) {
  if (!existsSync(path)) {
    fail(`missing ${label} JSON at ${path} — run the §5 sequence (init → extract --json → check --json) first`);
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    fail(`${label} JSON at ${path} is not parseable: ${e instanceof Error ? e.message : String(e)}`);
  }
}

const failures = [];
function check(condition, ok, detail) {
  if (ok) {
    process.stdout.write(`  ✓ ${condition}\n`);
  } else {
    process.stdout.write(`  ✗ ${condition} — ${detail}\n`);
    failures.push(`${condition}: ${detail}`);
  }
}
function fail(msg) {
  process.stderr.write(`acceptance: ${msg}\n`);
  process.exit(2);
}

function readFixture(rel) {
  const p = join(FIXTURE, rel);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

function main() {
  const [, , extractPath, checkPath] = process.argv;
  if (!extractPath || !checkPath) {
    fail("usage: node eval/acceptance/assert.mjs <extract.json> <check.json>");
  }

  const extract = readJson(extractPath, "extract");
  const checkRes = readJson(checkPath, "check");

  process.stdout.write("parrot acceptance — PLAN §5 (init wires · extract finds · check validates · locale round-trips)\n");

  // --- CONDITION 1: init wired correctly (proxy.ts on Next 16 NOT middleware.ts; setRequestLocale in every
  //     static page+layout; [locale] params awaited). Proven from the wired fixture's files. (S1/S2/P1/P3) ---
  const hasProxy = existsSync(join(FIXTURE, "src", "proxy.ts"));
  const hasMiddleware = existsSync(join(FIXTURE, "src", "middleware.ts"));
  check(
    "1a · init wrote src/proxy.ts (Next 16), NOT middleware.ts (S2/P2)",
    hasProxy && !hasMiddleware,
    `proxy.ts=${hasProxy} middleware.ts=${hasMiddleware} (Next 16 renamed middleware.ts→proxy.ts; a middleware.ts is silently ignored)`,
  );

  const layout = readFixture("src/app/[locale]/layout.tsx");
  const page = readFixture("src/app/[locale]/page.tsx");
  const staticFiles = [
    ["layout.tsx", layout],
    ["page.tsx", page],
  ];
  const srlMissing = staticFiles.filter(([, src]) => !src || !/setRequestLocale\s*\(/.test(src)).map(([n]) => n);
  check(
    "1b · setRequestLocale present in EVERY static page + layout (S1/P1)",
    srlMissing.length === 0,
    `missing setRequestLocale in: ${srlMissing.join(", ") || "(files absent)"} — a static page without it renders defaultLocale SILENTLY`,
  );

  const awaitMissing = staticFiles.filter(([, src]) => !src || !/await\s+params/.test(src)).map(([n]) => n);
  check(
    "1c · [locale] params are awaited (Next 15+ Promise — P3)",
    awaitMissing.length === 0,
    `params not awaited in: ${awaitMissing.join(", ") || "(files absent)"}`,
  );

  // --- CONDITION 2: extract found the planted hardcoded string (the catalog-bypass) with a file:line. (P9/O8) ---
  const hardcoded = Array.isArray(extract.hardcoded) ? extract.hardcoded : [];
  const planted = hardcoded.find((h) => typeof h.text === "string" && /free shipping/i.test(h.text));
  check(
    "2 · extract found the planted hardcoded string with file:line (P9/O8)",
    !!planted && typeof planted.file === "string" && typeof planted.line === "number",
    `expected a hardcoded finding matching /free shipping/ with file:line; got ${JSON.stringify(hardcoded)}`,
  );
  if (planted) process.stdout.write(`      → ${planted.file}:${planted.line}  "${planted.text}"\n`);

  // --- CONDITION 3: check caught the Polish plural gap — a {check:"plural", locale:"pl"} failure. Proves it
  //     does NOT pass plurals "from English alone" (the deepest brain lesson, S3/P6). ---
  const cfailures = Array.isArray(checkRes.failures) ? checkRes.failures : [];
  const plPlural = cfailures.find((f) => f.check === "plural" && f.locale === "pl");
  check(
    "3 · check caught the Polish plural gap {check:'plural', locale:'pl'} (S3/P6 — not done from English)",
    !!plPlural,
    `expected a {check:"plural", locale:"pl"} failure (seeded missing few/many); got failures=${JSON.stringify(cfailures)}`,
  );
  if (plPlural) process.stdout.write(`      → ${plPlural.detail}\n`);

  // --- CONDITION 4: the `ar` locale round-trips VERIFIABLY — proven, not asserted-from-English (O11/O23):
  //   (4a) the wired layout sets dir="rtl" for RTL locales (a live `/ar/` HTTP render is the ADDITIVE Sandbox
  //        proof, E4); (4b) the `ar` plural produces DISTINCT strings for count=1,2,6 — a real native-`Intl`
  //        grammar render (count 1→one, 2→two, 6→few are 3 distinct Arabic categories; English collapses them).
  const layoutSetsRtl =
    !!layout && /RTL_LOCALES/.test(layout) && /dir\s*=\s*\{?\s*(?:dir|["']rtl["']|RTL_LOCALES)/.test(layout);
  check(
    "4a · the [locale] layout sets <html dir='rtl'> for RTL locales (S7/O11) — live /ar/ HTTP render is the additive Sandbox proof",
    layoutSetsRtl,
    `layout does not compute dir from an RTL-locale set; got dir-wiring=${layout ? /dir\s*=/.test(layout) : "no layout"}`,
  );

  // (4b) the REAL round-trip: render the ar plural for the canary counts and prove distinctness.
  const arCatalog = readFixture("messages/ar.json");
  let distinctOk = false;
  let distinctDetail = "ar.json missing";
  if (arCatalog) {
    try {
      const ar = JSON.parse(arCatalog);
      const msg = ar?.home?.cartSummary ?? "";
      // Pull the per-category sub-strings the message authors, then map the canary counts → category → string.
      const authored = parseIcuPluralBranches(msg);
      const pr = new Intl.PluralRules("ar");
      const counts = [1, 2, 6];
      const rendered = counts.map((n) => authored.get(pr.select(n)) ?? authored.get("other") ?? "");
      const distinct = new Set(rendered);
      distinctOk = rendered.every((s) => s.length > 0) && distinct.size === counts.length;
      distinctDetail = counts.map((n, i) => `${n}→${pr.select(n)}:"${rendered[i]}"`).join("  ");
    } catch (e) {
      distinctDetail = `ar.json/plural parse error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  check(
    "4b · the `ar` plural renders DISTINCT strings for count=1,2,6 (real Intl.PluralRules round-trip — O23)",
    distinctOk,
    `expected 3 distinct non-empty Arabic plural forms; got ${distinctDetail}`,
  );
  if (distinctOk) process.stdout.write(`      → ${distinctDetail}\n`);

  // --- verdict ---
  if (failures.length > 0) {
    process.stderr.write(`\nacceptance: FAILED ${failures.length}/${5} condition group(s):\n`);
    for (const f of failures) process.stderr.write(`  - ${f}\n`);
    process.exit(1);
  }
  process.stdout.write("\nacceptance: ALL conditions hold — init wired · extract found · check validated · ar round-trips. ✅\n");
  process.exit(0);
}

/**
 * Minimal ICU plural-branch extractor: from `{count, plural, one {A} two {B} few {C} other {D}}` returns a Map
 * category→string. Zero-dep (the §5 round-trip must run with no extra install). Handles nested braces in a
 * branch body by depth-counting. Not a full ICU parser — exactly the slice condition 4b needs.
 */
function parseIcuPluralBranches(message) {
  const out = new Map();
  // Locate the plural arg body: the substring after `, plural,` up to its matching close brace.
  const pluralIdx = message.search(/,\s*plural\s*,/);
  if (pluralIdx === -1) return out;
  let i = message.indexOf(",", pluralIdx + 1);
  i = message.indexOf(",", i + 1); // step past "plural"
  // Now walk category tokens: `keyword {body}` or `=N {body}`.
  const tokenRe = /(=\d+|zero|one|two|few|many|other)\s*\{/g;
  tokenRe.lastIndex = i;
  let m;
  while ((m = tokenRe.exec(message)) !== null) {
    const cat = m[1];
    // Read the balanced-brace body starting right after the `{` the regex consumed.
    let depth = 1;
    let j = tokenRe.lastIndex;
    let body = "";
    while (j < message.length && depth > 0) {
      const ch = message[j];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) break;
      }
      body += ch;
      j++;
    }
    out.set(cat, body.trim());
    tokenRe.lastIndex = j + 1;
  }
  return out;
}

main();
