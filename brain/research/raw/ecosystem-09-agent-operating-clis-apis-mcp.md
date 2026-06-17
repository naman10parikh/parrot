---
title: "Ecosystem Research — What an AGENT Operating i18n Tools Needs (CLIs, APIs, MCP)"
type: source
created: 2026-06-17
tags: [i18n, agent-native, mcp, cli, automation, crowdin, lokalise, lingo.dev, i18next-mcp, ci]
sources: ["github.com/gtrias/i18next-mcp-server", "github.com/dalisys/i18n-mcp", "i18next.com/overview/translation-management-systems", "intlpull.com/blog/mcp-model-context-protocol-i18n-guide-2026", "lingo.dev", "registry.npmjs.org"]
summary: "The agent-operating layer for i18n: which CLIs are scriptable (Crowdin Java jar, Lokalise2 Go, lingo.dev npx), which TMSes ship official MCP servers (Crowdin/Lokalise/Phrase/Tolgee/Locize/Smartling/SimpleLocalize as of mid-2026), the community i18n MCP servers + their exact tools, and the CI-native flows. This is parrot's core (section 6)."
---

# What an AGENT Needs to Operate i18n Tooling (June 2026)

> This is the most parrot-relevant section: i18n is unusually agent-friendly because the whole
> workflow (extract → translate → validate → sync) is file-based and CLI/MCP-addressable.
> Verified live 2026-06-17.

## A. The agent-native insight: i18n is a file pipeline, not a UI
Unlike most "operational infra" (Sentry, Upstash), the entire i18n loop is **plain files an agent can read/write + CLIs/MCP an agent can call**:
1. **Extract** — find translatable strings in source (CLI/macro/`useExtracted`).
2. **Validate** — assert every key exists in every locale (CI linter).
3. **Translate** — machine-translate missing keys (LLM CLI or TMS MT).
4. **Sync** — push/pull catalogs to/from a TMS (CLI).
5. **Verify** — eval plural/RTL/format correctness (test suite).
**Every step is scriptable.** This is why i18n is a *good* domain for an agent employee — and why parrot should lean on existing CLIs/MCP rather than hand-rolling.

## B. MCP servers for i18n (the agent's native interface) — STATE OF THE WORLD mid-2026

### B1. Official TMS MCP servers (per i18next docs + intlpull 2026 guide)
As of **mid-2026**, the major Translation Management Systems ship **official MCP servers**: **Crowdin, Lokalise, Phrase, Tolgee, Locize, SimpleLocalize** — plus **Smartling** (launched **August 2025**). This means an agent can manage a real TMS (create projects, push/pull keys, trigger MT, check status) directly via MCP from Claude/Cursor. *Source: i18next.com/overview/translation-management-systems; intlpull.com/blog/mcp-model-context-protocol-i18n-guide-2026 (2026).* 
- **parrot decision:** if the product uses a hosted TMS, prefer its **official MCP server** over shelling its CLI — native tool calls, structured results, OAuth. Fall back to the CLI (section C) when no MCP or for CI (MCP needs an LLM in the loop; CI wants a deterministic CLI).
- **CAVEAT (currency/verify-before-trust):** this "all major TMS ship MCP" claim comes from a 2026 vendor-adjacent guide + the i18next docs page; **parrot should verify each vendor's MCP exists + its tool surface at adoption time** (vendor MCP maturity varies wildly). Treat as "very likely true, confirm per-vendor."

### B2. Community / framework MCP servers (smaller, code-side, OSS)
These run **locally against your repo's translation files** — no TMS account needed. Best for the *developer-side* loop (find missing keys in code, add keys, coverage).
| MCP server | ★ | Last push | What it does |
|---|---|---|---|
| **gtrias/i18next-mcp-server** | 12 | 2025-06-27 | i18next files: `health_check`, `scan_code_for_missing_keys`, `add_translation_key`, `sync_missing_keys`, `get_missing_keys`, `coverage_report`, `usage_analysis`, `quality_analysis`, `validate_files`, `export_data`. |
| **dalisys/i18n-mcp** | 11 | 2025-09-12 | Generic i18n files: real-time file watching, hardcoded-string detection in code, cross-language consistency, advanced search. |
| **zhangyu1818/xcode-i18n-mcp** | 3 | 2025-07-14 | iOS/macOS Xcode `.xcstrings` localization automation. |
| (also seen) **ffeldhaus angular-i18n MCP**, **pakvothe/i1n-cli** | — | — | Angular `.xlf` / framework-specific. |

**gtrias/i18next-mcp-server install (the canonical code-side one):**
```jsonc
// .mcp.json (Cursor/Claude)
{ "mcpServers": { "i18next": {
    "command": "npx", "args": ["-y", "i18next-mcp-server@latest"],
    "env": {
      "I18N_PROJECT_ROOT": ".", "I18N_LOCALES_PATH": "./src/locales",
      "I18N_DEFAULT_LANGUAGE": "en", "I18N_SUPPORTED_LANGUAGES": "en,de,fr,es"
}}}}
```
- **parrot takeaway:** these community MCPs are **low-star and not all freshly maintained** (most last pushed mid-2025). Their *tool surface* is exactly right (esp. `scan_code_for_missing_keys` + `coverage_report` = the two things an agent most wants), but parrot should treat them as "vendor a fork / verify it runs" not "production dependency." The *shape* is the lesson; parrot may want to build/own a small i18n MCP for its own employee (this is a natural parrot harness component — see section F).

## C. The scriptable CLIs (deterministic, CI-native — no LLM needed)

| CLI | Lang/runtime | Install | Agent-relevant commands |
|---|---|---|---|
| **Crowdin CLI** (`@crowdin/cli` 4.14.3) | **Java (needs JRE)** | `npm i -g @crowdin/cli` (wraps a jar) | `crowdin upload sources`, `crowdin download`, `crowdin status`, config = `crowdin.yml`. Dominant TMS-sync CLI (241K/wk). |
| **Lokalise CLI** (`lokalise2`) | **Go (single binary)** | brew / GH release | `lokalise2 file upload/download`, project ops. Lighter to run than Crowdin (no JRE). |
| **lingo.dev CLI** (0.137.0) | **Node** | `npx lingo.dev@0.137.0` | `lingo.dev i18n` (AI machine-translate missing keys via its engine + a lockfile), CI mode opens a PR. The most agent-native MT CLI. **Pin exactly — it's 0.x, releases daily.** |
| **Tolgee CLI** (`@tolgee/cli`) | Node | `npm i -g @tolgee/cli` | `tolgee push/pull`, `tolgee extract` (find keys in code), works against self-hosted or cloud Tolgee. |
| **@lingual/i18n-check** (0.9.5) | Node | dev dep | `i18n-check -l src/locales -s en -u src -f next-intl` — **CI key-completeness linter** (the ixartz pattern). Fails build on missing/unused keys. NOT a TMS — a validator. |
| **FormatJS CLI** (`@formatjs/cli`) | Node | dev dep | `formatjs extract` (pull ICU messages from source into a catalog), `formatjs compile` (precompile AST). The react-intl extraction toolchain. |
| **Lingui CLI** (`@lingui/cli`) | Node | dev dep | `lingui extract` (macro-based extraction), `lingui compile`. |

### Agent gotcha: Crowdin needs Java
The `@crowdin/cli` npm package is a **wrapper around a Java jar** — the agent's environment must have a **JRE**, not just Node. On a fresh sandbox, `crowdin` will fail with no JRE. **Lokalise (Go binary)** and **lingo.dev (Node)** have no such dependency — prefer them in constrained agent sandboxes, or ensure a JRE is provisioned before choosing Crowdin.

## D. The CI-native agent flow (the dream loop, with its sharp edges)
The most agent-native pattern (esp. lingo.dev, Tolgee, Crowdin GH Actions):
```
PR opened
  → CI: i18n-check (assert no missing/unused keys)        # deterministic gate
  → CI: lingo.dev i18n  (LLM translates new/changed keys) # AI fills gaps
  → CI: commit translated files / open a translation PR
  → CI: run i18n eval (plural+RTL+format correctness)     # parrot's eval
```
- **Sharp edge (real):** `lingodotdev/lingo.dev#334` — "Opening PR from GH Action run on PR check results in error state." The auto-PR flow has **GitHub-Actions-permission failures** on PR-triggered runs (the default `GITHUB_TOKEN` can't always push/open PRs from a forked-PR context). parrot must wire `permissions: contents: write, pull-requests: write` and handle the fork case.
- **Sharp edge:** machine-translated strings need **human/agent review for context** — `{count}` placeholders, brand terms, and ICU plural categories can be mistranslated. Lingo.dev's "context-aware engine" + lockfile mitigates drift but doesn't eliminate review. parrot's eval is the safety net here.

## E. What an agent must KNOW operating these (the non-obvious rules)
1. **next-intl ships anonymous telemetry** (the v4.11.1 changelog "detached telemetry process"). An agent setting up a privacy-sensitive product should disable it (env/config) — and *know it exists*.
2. **`react-i18next@next` / `react-intl@next` are OLDER than `@latest`** (the dist-tag trap from ecosystem-01). Never `npm i pkg@next` to "get newest."
3. **Middleware file is `proxy.ts` on Next 16**, `middleware.ts` before (ecosystem-03). Detect Next version before generating it.
4. **`params` is a Promise on Next 15+** — `await params` in `[locale]` layouts/pages.
5. **`setRequestLocale` in every static page+layout** or static pages silently render default locale (no error).
6. **Plural/RTL bugs are invisible in English** — an agent that self-tests only in `en` ships broken `pl`/`ar`/`he`. The eval MUST include a many-plural-category language + an RTL language.
7. **`t.raw` + `dangerouslySetInnerHTML` = XSS** — sanitize.
8. **Crowdin CLI needs a JRE.**
9. **Locale codes:** use BCP-47 (`en`, `en-US`, `zh-Hans`). ICU `select` values can't contain dashes (`en-GB` → `en_GB`). hreflang wants ISO-639-1 + region (`en-us`). Three slightly-different conventions for the "same" thing — a classic agent footgun.

## F. parrot harness implication (mapping to the 12 components)
i18n maps cleanly onto the agent-native harness formula — this is parrot's blueprint:
- **skills/** — `i18n-setup` (wire next-intl/i18next per detected stack incl. proxy.ts/setRequestLocale), `i18n-extract`, `i18n-rtl-audit`, `i18n-font-fallback` (the design-rule bridge).
- **tools/** — wrappers over `i18n-check`, `formatjs extract`, `lingo.dev`, Crowdin/Lokalise CLIs (CLI-anything pattern).
- **.mcp.json** — own a small i18n MCP (fork/borrow the gtrias tool surface: `scan_code_for_missing_keys`, `coverage_report`, `add_translation_key`) so parrot's employee has native tool calls; optionally proxy to a TMS's official MCP.
- **eval/** — THE differentiator: assert plural correctness in `pl`/`ar`, RTL `dir`+logical-props in `he`, format correctness (currency/date) across locales, key-completeness, and font-glyph coverage per script. (See ecosystem-08 for the eval spec.)
- **hooks/** — pre-commit: block hardcoded user-facing strings (the `dalisys/i18n-mcp` "hardcoded-string detection" idea as a hook).
- **dispatch/** — the CI PR-translate loop (section D), with the GH-Actions-permission fix baked in.
