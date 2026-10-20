#!/usr/bin/env node
/**
 * parrot MCP server (stdio) — C1 / PLAN §3 Component 7 / §4 "MCP server tool list" / HARNESS-OVERRIDES §7.
 *
 * Exposes the i18n vertical's operations to a coding agent (Claude Code, energy hub, a sibling employee) over
 * JSON-RPC on stdio. The tools are THIN ADAPTERS over the already-built B2 CLI cores and B3 shared lib —
 * "build one thing, call it from three places" (the CLI, this MCP, and `scripts/memory-search.sh` all reuse
 * the same impls; Consolidate-never-expand). No business logic is re-implemented here.
 *
 * Tools (PLAN §4): parrot_init · parrot_extract · parrot_check · parrot_icu · parrot_rtl_audit ·
 *   parrot_hreflang · parrot_pick · parrot_search_brain · parrot_explain.
 * Resources: parrot://brain/{EXPERTISE-MAP,BATTLE-TESTED-SCENARIOS,KNOWN-PITFALLS,OPINIONS,GAPS-AND-DISPUTES,
 *   TOOL-MATRIX}.
 *
 * HARD invariant (HARNESS-OVERRIDES §7, the boundary): **no tool return contains a raw secret or a provider
 * token.** Every tool here operates on plain files + deterministic string analysis (init/extract/check/icu/
 * rtl/hreflang/pick/brain/explain) — none touches a TMS/MT provider, so none can leak a token. The
 * mt/tms tools (which WOULD touch a provider) are deliberately NOT exposed by C1 — they live in cluster B's
 * governed-pipeline wrapper and are advertised only as `plannedCapabilities` on the A2A card (F2).
 *
 * MCP shape: standard `initialize` + `tools/list` + `tools/call` + `resources/list` + `resources/read`. Tool
 * results use the MCP content envelope `{ content: [{ type:"text", text }], isError? }` so any MCP client
 * (incl. Claude Code) renders them; the structured payload is the JSON inside that text (agent-parseable).
 */

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serveStdio, type RpcHandler } from "./jsonrpc.js";
import { runInit, type I18nLib } from "../cli/commands/init.js";
import { runExtract } from "../cli/commands/extract.js";
import { runCheck } from "../cli/commands/check.js";
import { inspectIcu } from "../lib/icu-parse.js";
import { validateBcp47 } from "../lib/bcp47.js";

/** Server identity advertised in `initialize`. */
const SERVER_INFO = { name: "parrot", version: "0.1.0" } as const;
/** MCP protocol revision parrot speaks (the stdio dev-tool profile). */
const PROTOCOL_VERSION = "2024-11-05";

/** Repo root, resolved from this compiled module (dist/mcp → repo). Used for brain/ resources + brain-search. */
function repoRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

/** The 6 canonical brain artifacts, exposed as `parrot://brain/<NAME>` resources. */
const BRAIN_RESOURCES = [
  "EXPERTISE-MAP",
  "BATTLE-TESTED-SCENARIOS",
  "KNOWN-PITFALLS",
  "OPINIONS",
  "GAPS-AND-DISPUTES",
  "TOOL-MATRIX",
] as const;

/** Wrap a structured payload in the MCP text-content envelope (the JSON is the agent-parseable body). */
function textResult(payload: unknown, isError = false): { content: { type: "text"; text: string }[]; isError?: boolean } {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  return isError ? { content: [{ type: "text", text }], isError: true } : { content: [{ type: "text", text }] };
}

/** Require a string argument; throw a clear error if absent (→ JSON-RPC INVALID_PARAMS upstream). */
function reqString(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v !== "string" || v.length === 0) throw new Error(`missing required string argument: ${key}`);
  return v;
}

/** Optional string arg with a default. */
function optString(args: Record<string, unknown>, key: string, fallback: string): string {
  const v = args[key];
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

/** Coerce a locales argument (array or comma-string) to a string[]. */
function asLocales(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

// ---- tool definitions (the `tools/list` payload; arg sketches mirror PLAN §4) ----

const TOOLS = [
  {
    name: "parrot_init",
    description:
      "Wire the next-intl runtime into a (Next.js) app: the 4 load-bearing files, version-detected middleware " +
      "(proxy.ts on Next 16 — P2/S2), setRequestLocale codegen (P1), await params (P3), deliberate localePrefix. " +
      "Idempotent + non-destructive.",
    inputSchema: {
      type: "object",
      properties: {
        dir: { type: "string", description: "target app directory" },
        lib: { type: "string", enum: ["next-intl", "i18next"], description: "runtime library (default next-intl)" },
        locales: { type: "array", items: { type: "string" }, description: "locales to seed (default en,pl,ar)" },
        defaultLocale: { type: "string", description: "default locale (default en)" },
      },
      required: ["dir"],
    },
  },
  {
    name: "parrot_extract",
    description:
      "Scan source for hardcoded user-facing strings (the catalog-bypass — P9/O8) + used-but-missing / " +
      "defined-but-unused keys. Never constructs keys dynamically (O19).",
    inputSchema: {
      type: "object",
      properties: { dir: { type: "string", description: "target app directory" } },
      required: ["dir"],
    },
  },
  {
    name: "parrot_check",
    description:
      "THE CI correctness gate (the differentiator): key-completeness + many-plural (pl/ar — S3/P6) + RTL (S7) + " +
      "format + hreflang BCP-47 (S11) + setRequestLocale-presence (P1) + Next-version-correct middleware (P2). " +
      "Returns { pass, failures[] }.",
    inputSchema: {
      type: "object",
      properties: {
        dir: { type: "string", description: "target app directory" },
        locales: { type: "array", items: { type: "string" }, description: "locales to check (e.g. en,pl,ar)" },
      },
      required: ["dir"],
    },
  },
  {
    name: "parrot_icu",
    description:
      "Validate an ICU MessageFormat message: warns on missing plural categories for the locale (P6), the " +
      "dash-in-select trap (P7), and the apostrophe/<...> escape trap (P8). Returns { valid, warnings[], " +
      "missingPluralCategories[] }.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "the ICU message string" },
        locale: { type: "string", description: "target locale (drives the missing-plural-category check, e.g. pl)" },
      },
      required: ["message"],
    },
  },
  {
    name: "parrot_rtl_audit",
    description:
      "RTL-as-coverage audit (S7/P11-P13): checks the app's RTL locales declare dir + flags the Latin-default CSS " +
      "that breaks Arabic. Reuses the check RTL leg. Returns { pass, issues[] }.",
    inputSchema: {
      type: "object",
      properties: { dir: { type: "string", description: "target app directory" } },
      required: ["dir"],
    },
  },
  {
    name: "parrot_hreflang",
    description:
      "Validate the hreflang graph: every locale code is valid BCP-47 (rejects es-la/me/en-uk — S11), self-ref + " +
      "reciprocal + one x-default (S10). Reuses the check hreflang leg. Returns { pass, graphErrors[] }.",
    inputSchema: {
      type: "object",
      properties: {
        dir: { type: "string", description: "target app directory" },
        locales: { type: "array", items: { type: "string" }, description: "locale codes to validate" },
      },
      required: ["dir"],
    },
  },
  {
    name: "parrot_pick",
    description:
      "A library decision WITH THE HONEST COST (not a feature table — O3). next-intl@^4 default for the RSC reason " +
      "(O4); the alts (i18next/react-intl/Lingui) with their hidden costs. Returns { recommendation, honestCost, alts[] }.",
    inputSchema: {
      type: "object",
      properties: {
        frameworks: { type: "string", enum: ["1", "many"], description: "one framework or many (drives the rec)" },
        bundleParamount: { type: "boolean", description: "is bundle size the paramount constraint?" },
      },
    },
  },
  {
    name: "parrot_search_brain",
    description:
      "BM25 search over the parrot expertise brain (brain/**.md) → ranked CITED hits (file + entry ID + snippet). " +
      "The same index `parrot brain` and scripts/memory-search.sh use.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "the search query" },
        limit: { type: "number", description: "max hits (default 5)" },
      },
      required: ["query"],
    },
  },
  {
    name: "parrot_explain",
    description:
      "Print a brain entry by ID (e.g. parrot_explain P1 → the setRequestLocale footgun: detect + avoid). Resolves " +
      "P-/S-/O-/JTBD- IDs against the brain.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "a brain entry ID, e.g. P1 / S3 / O7 / JTBD-1" } },
      required: ["id"],
    },
  },
] as const;

// ---- tool handlers (thin adapters over the B2/B3 impls; HARD: no secret in any return) ----

/** Dynamic-import the A4 brain index (the zero-dep .mjs), the one source of truth for brain search. */
async function brainSearch(query: string, limit: number): Promise<unknown> {
  const modPath = join(repoRoot(), "scripts", "brain-search.mjs");
  const mod = (await import(modPath)) as { searchBrain: (q: string, n?: number) => unknown[] };
  return mod.searchBrain(query, limit);
}

/** Read a brain entry by ID: find the chunk in the BM25 index whose entryId matches, return its full text. */
async function explainBrain(id: string): Promise<{ id: string; found: boolean; source?: string; heading?: string; text?: string }> {
  const modPath = join(repoRoot(), "scripts", "brain-search.mjs");
  const mod = (await import(modPath)) as { loadIndex: () => { docs: { entryId: string | null; file: string; heading: string; text: string }[] } };
  const want = id.trim().toUpperCase();
  const idx = mod.loadIndex();
  const hit = idx.docs.find((d) => (d.entryId ?? "").toUpperCase() === want);
  if (!hit) return { id: want, found: false };
  return { id: want, found: true, source: hit.file, heading: hit.heading, text: hit.text };
}

/** O3/O4/O5 made callable: a decision-WITH-COST (brain taste), never a feature table. */
function pickLibrary(frameworks: string, bundleParamount: boolean): unknown {
  if (bundleParamount) {
    return {
      recommendation: "@lingui/core@^6",
      honestCost:
        "~2 KB runtime, compile-time extraction — BUT macros need a Babel OR SWC plugin (#1224); a bleeding-edge " +
        "bundler with no Lingui plugin strands you, and v6 went ESM-only (#2363). Verify the plugin for your bundler FIRST.",
      because: "O-spine 2: the library is commoditized; pick for a REASON. Bundle-paramount + a mainstream bundler = Lingui (P26).",
      alts: [
        { lib: "next-intl@^4", cost: "ships all messages to the client (tree-shaking still open #1) + setRequestLocale boilerplate" },
      ],
    };
  }
  if (frameworks === "many") {
    return {
      recommendation: "i18next@^26 + react-i18next@^17",
      honestCost:
        "the multi-framework / React-Native / plugin-ecosystem / max-stability option (~32.6M wk downloads). The cost " +
        "is it is NOT the most RSC-mature for a single Next.js app — that is next-intl. Don't pick i18next just for inertia.",
      because: "O4 inverse — many frameworks/RN → i18next; single RSC-heavy Next.js → next-intl.",
      alts: [{ lib: "react-intl@^10", cost: "the reference ICU impl; overkill (~20 KB) for simple-string CRUD apps" }],
    };
  }
  // default: single Next.js app
  return {
    recommendation: "next-intl@^4",
    honestCost:
      "the most RSC-mature OSS option for a single-framework Next.js app — the right default FOR THE RSC REASON (O4), " +
      "not generically. Accept two known costs: it ships all messages to the client (tree-shaking is the #1 open issue) " +
      "AND the setRequestLocale boilerplate (P1) in every static page. Check pushed_at, not stars (O6).",
    because:
      "O3 — a decision WITH the cost, never a feature table. O5 — the library is commoditized; the moat is the discipline " +
      "(CI key-check + plural/RTL eval + TMS sync), not the library choice.",
    alts: [
      { lib: "i18next@^26 + react-i18next@^17", cost: "reach for it for multi-framework / RN / plugin ecosystem / max stability" },
      { lib: "react-intl@^10 / @formatjs/intl@^4", cost: "reach for it for ICU-heavy / multi-framework ICU-standard mandate" },
      { lib: "@lingui/core@^6", cost: "reach for it only when bundle size is paramount AND your bundler has a Lingui plugin (P26)" },
      { lib: "next-international / typesafe-i18n", cost: "AVOID for new work — stale, predate Next 15/16 (O6). Borrow the TS-locale-file idea only." },
    ],
  };
}

const TOOL_HANDLERS: Readonly<Record<string, RpcHandler>> = {
  parrot_init: (args) => {
    const dir = reqString(args, "dir");
    const lib = optString(args, "lib", "next-intl") as I18nLib;
    const locales = asLocales(args["locales"]);
    const defaultLocale = optString(args, "defaultLocale", "en");
    const result = runInit(dir, lib, locales.length ? locales : ["en", "pl", "ar"], defaultLocale);
    return textResult(result);
  },
  parrot_extract: (args) => {
    const result = runExtract(reqString(args, "dir"));
    // extract returns no secret — hardcoded[] are source literals, key lists are catalog keys.
    return textResult(result, result.hardcoded.length > 0);
  },
  parrot_check: (args) => {
    const result = runCheck(reqString(args, "dir"), asLocales(args["locales"]));
    return textResult(result, !result.pass);
  },
  parrot_icu: (args) => {
    const message = reqString(args, "message");
    const locale = typeof args["locale"] === "string" ? (args["locale"] as string) : undefined;
    const insp = inspectIcu(message, locale);
    const missingPluralCategories = insp.warnings.filter((w) => w.pitfall === "P6").map((w) => w.message);
    const out = {
      valid: insp.warnings.length === 0,
      hasPlural: insp.hasPlural,
      hasSelect: insp.hasSelect,
      pluralCategories: [...insp.pluralCategories],
      warnings: insp.warnings,
      missingPluralCategories,
    };
    return textResult(out, insp.warnings.length > 0);
  },
  parrot_rtl_audit: (args) => {
    // RTL is a leg of the full correctness gate; surface just the rtl failures (S7/P11). Reuse, don't re-impl.
    const result = runCheck(reqString(args, "dir"), asLocales(args["locales"]));
    const issues = result.failures.filter((f) => f.check === "rtl");
    return textResult({ pass: issues.length === 0, issues, note: "RTL is a coverage problem (O11) — pair with a rendered /ar/ screenshot in CI." }, issues.length > 0);
  },
  parrot_hreflang: (args) => {
    // hreflang BCP-47 validity is a leg of the gate; surface the hreflang failures (S10/S11). Reuse.
    const result = runCheck(reqString(args, "dir"), asLocales(args["locales"]));
    const graphErrors = result.failures.filter((f) => f.check === "hreflang");
    return textResult({ pass: graphErrors.length === 0, graphErrors, note: "Treat hreflang as a graph: self-ref + reciprocal + one x-default + valid BCP-47 (O14)." }, graphErrors.length > 0);
  },
  parrot_pick: (args) => {
    const frameworks = optString(args, "frameworks", "1");
    const bundleParamount = args["bundleParamount"] === true;
    return textResult(pickLibrary(frameworks, bundleParamount));
  },
  parrot_search_brain: async (args) => {
    const query = reqString(args, "query");
    const limit = typeof args["limit"] === "number" ? (args["limit"] as number) : 5;
    const hits = await brainSearch(query, limit);
    return textResult({ query, hits });
  },
  parrot_explain: async (args) => {
    const id = reqString(args, "id");
    const entry = await explainBrain(id);
    return textResult(entry, !entry.found);
  },
};

// ---- MCP method handlers (initialize / tools / resources) ----

/** The MCP method table (exported so the contract test can drive real handlers without spawning a process). */
export const METHODS: Readonly<Record<string, RpcHandler>> = {
  initialize: () => ({
    protocolVersion: PROTOCOL_VERSION,
    capabilities: { tools: {}, resources: {} },
    serverInfo: SERVER_INFO,
  }),
  // Many clients send `initialized`/`notifications/initialized` as a notification — accept it as a no-op.
  initialized: () => ({}),
  "notifications/initialized": () => ({}),
  ping: () => ({}),

  "tools/list": () => ({ tools: TOOLS }),
  "tools/call": async (params) => {
    const name = typeof params["name"] === "string" ? (params["name"] as string) : "";
    const args = (params["arguments"] as Record<string, unknown> | undefined) ?? {};
    const handler = TOOL_HANDLERS[name];
    if (!handler) return textResult(`unknown tool: ${name}`, true);
    try {
      return await handler(args);
    } catch (e) {
      // A tool-level failure returns an MCP error RESULT (isError:true), not a transport error — the agent
      // can read the message and recover. (No secret can appear here — these tools never touch a provider.)
      return textResult(e instanceof Error ? e.message : String(e), true);
    }
  },

  "resources/list": () => ({
    resources: BRAIN_RESOURCES.map((n) => ({
      uri: `parrot://brain/${n}`,
      name: n,
      description: `parrot expertise brain artifact: ${n}`,
      mimeType: "text/markdown",
    })),
  }),
  "resources/read": (params) => {
    const uri = typeof params["uri"] === "string" ? (params["uri"] as string) : "";
    const m = uri.match(/^parrot:\/\/brain\/([A-Z-]+)$/);
    if (!m || !BRAIN_RESOURCES.includes(m[1] as (typeof BRAIN_RESOURCES)[number])) {
      throw new Error(`unknown resource: ${uri}`);
    }
    const file = join(repoRoot(), "brain", `${m[1]}.md`);
    if (!existsSync(file)) throw new Error(`resource file missing: brain/${m[1]}.md`);
    const text = readFileSync(file, "utf8");
    return { contents: [{ uri, mimeType: "text/markdown", text }] };
  },
};

/** Start the stdio server (all MCP methods + tool dispatch wired). */
export function startServer(): void {
  serveStdio(METHODS);
}

// Entry point: `node dist/mcp/server.js` (or the parrot-mcp bin) speaks JSON-RPC on stdio. npx starts a bin
// through a symlink in node_modules/.bin, so resolve argv[1] before comparing it with this module's path.
function entryPath(): string {
  try {
    return process.argv[1] ? realpathSync(process.argv[1]) : "";
  } catch {
    return process.argv[1] ?? ""; // Intentionally silent: an unresolvable argv[1] falls back to the raw path.
  }
}
if (entryPath() !== "" && entryPath() === fileURLToPath(import.meta.url)) {
  startServer();
}
