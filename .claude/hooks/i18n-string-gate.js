#!/usr/bin/env node
/**
 * i18n-string-gate — PreToolUse hook (parrot's DOGFOOD law, brain P9/O8/O19).
 *
 * parrot's whole job is to stop hardcoded user-facing strings from bypassing the message catalog. This hook
 * makes parrot obey its own law on its OWN repo: it BLOCKS a Write/Edit (or a `git commit` Bash command) that
 * would introduce
 *   (a) a quoted multi-word user-facing literal in a `.tsx`/`.jsx` return — the catalog bypass (P9/O8):
 *       a string that reaches the user without going through `t()`/`<Trans>` is invisible to every translator
 *       and every i18n CI check; and
 *   (b) a non-`${VAR}` literal value for a secret-shaped env key in `.mcp.json` — keeps the
 *       "env-refs only, no live keys" invariant the MCP component (C1) depends on (HARNESS-OVERRIDES §7).
 *
 * Protocol (matches the inherited PreToolUse hooks): reads the tool-call JSON on stdin
 * (`{ tool_name, tool_input }`), and on a block writes a cited reason to STDERR and `process.exit(2)`
 * (Claude Code: PreToolUse exit code 2 = deny the tool call, surface stderr to the model). Clean input → the
 * hook prints `{}` and exits 0. It NEVER blocks non-Write/Edit/Bash tools and NEVER throws on malformed input
 * (a security hook must fail safe, not crash the session).
 *
 * The hardcoded-string heuristic is intentionally a small, SELF-CONTAINED copy of the intent in
 * `src/lib/hardcoded-heuristic.ts` (the canonical CLI/`parrot extract` detector). A PreToolUse hook must run
 * standalone via `node` with zero build step, so it cannot import the gitignored `dist/` artifact — the two
 * are kept aligned in INTENT (multi-word JSX text + user-facing JSX attrs, skipping technical attrs/URLs/
 * single words), and the canonical, evolving detector remains the TS lib that `parrot extract` ships.
 *
 * Wire-up (.claude/settings.json):
 *   { "hooks": { "PreToolUse": [{
 *       "matcher": "Write|Edit",
 *       "hooks": [{ "type": "command", "command": "node .claude/hooks/i18n-string-gate.js" }] }] } }
 */

"use strict";

// ── Heuristic config (aligned with src/lib/hardcoded-heuristic.ts) ──────────────────────────────────────────

// JSX attributes that render user-facing copy (worth translating).
const USER_FACING_ATTRS = new Set([
  "title",
  "alt",
  "placeholder",
  "label",
  "aria-label",
  "aria-description",
  "aria-placeholder",
]);

// Attributes whose string values are NEVER user copy — explicitly skipped to suppress false positives.
const TECHNICAL_ATTRS = new Set([
  "classname",
  "class",
  "key",
  "id",
  "href",
  "src",
  "rel",
  "type",
  "name",
  "role",
  "htmlfor",
  "for",
  "data-testid",
  "datatestid",
  "style",
  "target",
  "method",
  "action",
  "value",
  "defaultvalue",
]);

// A "word" = a run of letters (so "Hi!" is one word, "Add to cart" is three).
const WORD_RE = /\p{L}+/gu;

/** True if the string is plausibly user-facing copy (>=2 words, has letters, not a URL/path/identifier). */
function looksLikeCopy(s) {
  const trimmed = s.trim();
  if (trimmed.length < 3) return false;
  if (/^https?:\/\//i.test(trimmed)) return false; // URL
  if (/^[./~#?]/.test(trimmed)) return false; // path / fragment / query
  if (/^[A-Z0-9_]+$/.test(trimmed)) return false; // SCREAMING_CONST
  if (!/[a-z]/i.test(trimmed)) return false; // no letters at all
  const words = trimmed.match(WORD_RE) || [];
  return words.length >= 2; // multi-word — the high-signal case the brain (P9) targets
}

/** True if this source line is an import/require/export-from statement (never user copy). */
function isImportLine(line) {
  return /^\s*(?:import\b|export\b[^=]*\bfrom\b|const\s+\w+\s*=\s*require\()/.test(line);
}

/**
 * Find the first hardcoded user-facing string in `.tsx`/`.jsx` source. Returns `{ line, text, kind }` or null.
 * Skips text already inside a `{...}` expression (so `{t("welcome")}` and `{count}` are NOT flagged) by only
 * matching JSX text between `>` and `<` that contains no braces.
 */
function firstHardcodedString(source) {
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || "";
    if (isImportLine(line)) continue;

    // (1) JSX text content: `>Add to cart<` — text directly between tags, not inside an expression `{…}`.
    const jsxTextRe = />([^<>{}]+)</g;
    for (let m = jsxTextRe.exec(line); m !== null; m = jsxTextRe.exec(line)) {
      const text = (m[1] || "").trim();
      if (looksLikeCopy(text)) return { line: i + 1, text, kind: "jsx-text" };
    }

    // (2) User-facing JSX attributes with a literal string value: `placeholder="Search products"`.
    const attrRe = /([A-Za-z][\w-]*)\s*=\s*"([^"]+)"/g;
    for (let m = attrRe.exec(line); m !== null; m = attrRe.exec(line)) {
      const attr = (m[1] || "").toLowerCase();
      const text = (m[2] || "").trim();
      if (TECHNICAL_ATTRS.has(attr)) continue;
      if (USER_FACING_ATTRS.has(attr) && looksLikeCopy(text)) {
        return { line: i + 1, text, kind: `jsx-attribute:${attr}` };
      }
    }
  }
  return null;
}

// ── .mcp.json literal-secret gate (HARNESS-OVERRIDES §7 / C1 invariant) ─────────────────────────────────────

const SECRET_KEY_RE = /(TOKEN|KEY|SECRET|PASSWORD|API|CREDENTIAL)/i;

/**
 * Find the first secret-shaped env key in a `.mcp.json` body whose value is a literal (not a `${VAR}` ref).
 * Benign path values (MEMORY_FILE_PATH, VAULT_PATH, …) are exempt — only keys matching SECRET_KEY_RE are gated,
 * mirroring the C1 `MCP-NOSECRET-OK` check. Returns `{ server, key }` or null. Tolerant of unparseable JSON
 * (a half-written file mid-edit must not crash the hook — fail open, the JSON gate is a backstop not a parser).
 */
function firstLiteralSecretInMcp(content) {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null; // not valid JSON yet (mid-edit) — don't block on a parse error
  }
  const servers = parsed && parsed.mcpServers;
  if (!servers || typeof servers !== "object") return null;
  for (const [server, cfg] of Object.entries(servers)) {
    const env = cfg && cfg.env;
    if (!env || typeof env !== "object") continue;
    for (const [key, val] of Object.entries(env)) {
      if (!SECRET_KEY_RE.test(key)) continue;
      const isRef = typeof val === "string" && val.startsWith("${") && val.endsWith("}");
      if (!isRef) return { server, key };
    }
  }
  return null;
}

// ── Hook plumbing ───────────────────────────────────────────────────────────────────────────────────────────

function deny(reason) {
  // PreToolUse: exit code 2 = block the tool call; stderr is surfaced to the model.
  process.stderr.write(`[i18n-string-gate] ${reason}\n`);
  process.exit(2);
}

/** Extract the file path + the string content this tool call would write (Write/Edit shapes). */
function extractWrite(toolInput) {
  if (!toolInput || typeof toolInput !== "object") return null;
  const filePath = toolInput.file_path || toolInput.filePath;
  if (!filePath) return null;
  // Write → `content`; Edit → `new_string` (what gets inserted). MultiEdit → join the edits' new_string.
  let content = "";
  if (typeof toolInput.content === "string") content = toolInput.content;
  else if (typeof toolInput.new_string === "string") content = toolInput.new_string;
  else if (Array.isArray(toolInput.edits)) {
    content = toolInput.edits.map((e) => (e && e.new_string) || "").join("\n");
  }
  return { filePath: String(filePath), content };
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;

  let data;
  try {
    data = JSON.parse(input);
  } catch {
    // No/invalid stdin — nothing to gate. Fail open.
    process.stdout.write("{}");
    return;
  }

  const toolName = data.tool_name;
  const toolInput = data.tool_input;

  // We only gate file writes/edits (the surfaces that introduce a hardcoded string or a literal .mcp.json key).
  if (toolName !== "Write" && toolName !== "Edit" && toolName !== "MultiEdit") {
    process.stdout.write("{}");
    return;
  }

  const w = extractWrite(toolInput);
  if (!w || !w.content) {
    process.stdout.write("{}");
    return;
  }

  const lower = w.filePath.toLowerCase();

  // Gate A — hardcoded user-facing string in .tsx/.jsx (the catalog bypass, P9/O8).
  if (lower.endsWith(".tsx") || lower.endsWith(".jsx")) {
    const hit = firstHardcodedString(w.content);
    if (hit) {
      deny(
        `Hardcoded user-facing string blocked in ${w.filePath} (line ${hit.line}, ${hit.kind}): ` +
          `"${hit.text}". User-facing copy must go through the message catalog — wrap it in t()/<Trans> ` +
          `(brain P9/O8: never let a string bypass the catalog; it is invisible to every translator and ` +
          `every i18n CI check). Run \`parrot extract\` to find all bypasses.`,
      );
    }
  }

  // Gate B — literal secret value in .mcp.json (env must be ${VAR} refs, HARNESS-OVERRIDES §7 / C1).
  if (lower.endsWith(".mcp.json") || lower.endsWith("/.mcp.json")) {
    const sec = firstLiteralSecretInMcp(w.content);
    if (sec) {
      deny(
        `Literal secret value blocked in ${w.filePath}: server "${sec.server}" env key "${sec.key}" must ` +
          `be a \${ENV_VAR} reference, not a literal (HARNESS-OVERRIDES §7 — .mcp.json carries no live keys; ` +
          `keep the C1 MCP-NOSECRET invariant). Use "${sec.key}": "\${${sec.key}}".`,
      );
    }
  }

  process.stdout.write("{}");
}

main();
