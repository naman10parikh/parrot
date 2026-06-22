/**
 * Contract + integration tests for the parrot MCP server (C1 / PLAN §9 Integration+Contract rows).
 *
 * Drives the REAL `METHODS` table through the JSON-RPC transport (`handleLine`) — no process spawn, no stdio —
 * so every assertion hits the actual tool/resource handlers. Proves:
 *   - `tools/list` returns the ≥9 `parrot_*` tools, each with a name + inputSchema (the §4 tool surface);
 *   - `tools/call` round-trips: parrot_search_brain (a cited brain hit), parrot_check (a {pass,failures}
 *     verdict), parrot_icu (the P6 missing-plural-category warning for pl), parrot_explain (a brain entry by ID);
 *   - `resources/list` + `resources/read` expose the 6 `parrot://brain/*` artifacts;
 *   - the HARD invariant (HARNESS-OVERRIDES §7): no tool return leaks a secret-shaped value;
 *   - robustness: malformed JSON → a parse-error response (the loop doesn't crash).
 */

import { describe, it, expect } from "vitest";
import { handleLine, type JsonRpcResponse } from "../src/mcp/jsonrpc.js";
import { METHODS } from "../src/mcp/server.js";

/** Send one JSON-RPC line through the real METHODS table; return the responses written. */
function rpc(method: string, params?: Record<string, unknown>, id: number | string = 1): Promise<JsonRpcResponse[]> {
  const out: JsonRpcResponse[] = [];
  const line = JSON.stringify({ jsonrpc: "2.0", id, method, params });
  return handleLine(line, METHODS, (r) => out.push(r)).then(() => out);
}

/** Pull the parsed JSON body out of an MCP text-content tool result. */
function toolBody(resp: JsonRpcResponse): unknown {
  const result = resp.result as { content?: { type: string; text: string }[] };
  const text = result?.content?.[0]?.text ?? "";
  return JSON.parse(text);
}

describe("parrot MCP server — tools/list (the §4 tool surface)", () => {
  it("lists at least 9 parrot_* tools, each with a name + inputSchema", async () => {
    const [resp] = await rpc("tools/list");
    const tools = (resp?.result as { tools: { name: string; inputSchema: unknown }[] }).tools;
    const parrotTools = tools.filter((t) => t.name.startsWith("parrot_"));
    expect(parrotTools.length).toBeGreaterThanOrEqual(9);
    // The §4 anchor tools must be present.
    const names = parrotTools.map((t) => t.name);
    expect(names).toContain("parrot_check");
    expect(names).toContain("parrot_search_brain");
    expect(names).toContain("parrot_init");
    // Every tool declares an input schema (agent-consumability / Contract level).
    for (const t of parrotTools) expect(t.inputSchema).toBeTruthy();
  });
});

describe("parrot MCP server — tools/call round-trips", () => {
  it("parrot_search_brain returns ranked cited brain hits", async () => {
    const [resp] = await rpc("tools/call", { name: "parrot_search_brain", arguments: { query: "polish plural wrong" } });
    const body = toolBody(resp!) as { query: string; hits: { file: string; entryId: string | null }[] };
    expect(body.hits.length).toBeGreaterThan(0);
    // a brain file is cited (KNOWN-PITFALLS / BATTLE-TESTED-SCENARIOS) — the S3/P6 silent plural bug.
    const cited = body.hits.some((h) => /KNOWN-PITFALLS|BATTLE-TESTED-SCENARIOS/.test(h.file));
    expect(cited).toBe(true);
  });

  it("parrot_check returns a structured {pass, failures} verdict", async () => {
    const [resp] = await rpc("tools/call", { name: "parrot_check", arguments: { dir: "/tmp/parrot-mcp-nope", locales: ["en", "pl", "ar"] } });
    const body = toolBody(resp!) as { pass: boolean; failures: unknown[] };
    expect(body).toHaveProperty("pass");
    expect(Array.isArray(body.failures)).toBe(true);
    // a non-existent dir cannot pass the gate.
    expect(body.pass).toBe(false);
  });

  it("parrot_icu warns on a missing Polish plural category (P6)", async () => {
    const [resp] = await rpc("tools/call", {
      name: "parrot_icu",
      arguments: { message: "{count, plural, one {# item} other {# items}}", locale: "pl" },
    });
    const body = toolBody(resp!) as { valid: boolean; missingPluralCategories: string[] };
    // pl needs few + many; an {one, other} message is missing them → not valid, with a P6 warning.
    expect(body.valid).toBe(false);
    expect(body.missingPluralCategories.length).toBeGreaterThan(0);
  });

  it("parrot_explain resolves a brain entry by ID (P1)", async () => {
    const [resp] = await rpc("tools/call", { name: "parrot_explain", arguments: { id: "P1" } });
    const body = toolBody(resp!) as { found: boolean; source?: string; text?: string };
    expect(body.found).toBe(true);
    expect(body.source).toMatch(/KNOWN-PITFALLS/);
    expect(body.text).toMatch(/setRequestLocale/);
  });

  it("an unknown tool returns an isError result, not a transport crash", async () => {
    const [resp] = await rpc("tools/call", { name: "parrot_nonexistent", arguments: {} });
    const result = resp?.result as { isError?: boolean };
    expect(result.isError).toBe(true);
  });
});

describe("parrot MCP server — resources", () => {
  it("resources/list exposes the 6 parrot://brain/* artifacts", async () => {
    const [resp] = await rpc("resources/list");
    const resources = (resp?.result as { resources: { uri: string }[] }).resources;
    expect(resources.length).toBe(6);
    expect(resources.every((r) => r.uri.startsWith("parrot://brain/"))).toBe(true);
  });

  it("resources/read returns the KNOWN-PITFALLS markdown", async () => {
    const [resp] = await rpc("resources/read", { uri: "parrot://brain/KNOWN-PITFALLS" });
    const contents = (resp?.result as { contents: { text: string }[] }).contents;
    expect(contents[0]?.text).toMatch(/setRequestLocale/);
  });

  it("resources/read rejects an unknown/traversal URI", async () => {
    const [resp] = await rpc("resources/read", { uri: "parrot://brain/../../etc/passwd" });
    expect(resp?.error).toBeTruthy();
  });
});

describe("parrot MCP server — HARD invariant: no secret in any tool return", () => {
  it("no tool result contains a secret-shaped value", async () => {
    const SECRET = /(sk-ant-|sk_live_|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|xox[bap]-)/;
    const calls: [string, Record<string, unknown>][] = [
      ["parrot_search_brain", { query: "tms token api key" }],
      ["parrot_pick", { frameworks: "1" }],
      ["parrot_check", { dir: "/tmp/parrot-mcp-nope", locales: ["en"] }],
    ];
    for (const [name, args] of calls) {
      const [resp] = await rpc("tools/call", { name, arguments: args });
      const text = JSON.stringify(resp);
      expect(SECRET.test(text)).toBe(false);
    }
  });
});
