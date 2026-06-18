# parrot — HARNESS-OVERRIDES (CP123)

> **Vertical:** Internationalization (i18n / l10n) — next-intl@^4 · ICU MessageFormat 1 · native `Intl.*` ·
> plurals · RTL/bidi · locale routing + hreflang SEO · `next/font` per-script fallback · TMS sync (Tolgee/
> Lingo.dev) · the CI correctness gate. Per-component DONE-criteria **overrides** vs
> `audit/HARNESS-CHECKLIST-2026.md`, written by the Wave-P architect, **honored verbatim by Wave-V auditors**.
> Where a row says "as checklist," the generic criterion stands. Where it says "OVERRIDE," grade against THIS
> text, not the generic one. Every ✅ here is file-level git-verifiable. parrot is a **tool-employee**: consumed
> by coding agents (Claude Code, energy hub, sibling employees) + a local cockpit — **NOT** a messaged product,
> and **NOT** a content-authoring employee.
>
> **THE acceptance bar:** `parrot init` wires next-intl + `parrot extract` finds hardcoded strings + `parrot
> check` validates ICU plural/RTL + a locale round-trips verifiably — green ×3 (pass^k) in CI.
>
> **HARD invariant across every component (the boundary, brain P29):** parrot wires the **pipeline + grammar
> engine + routing + CI gate** — it **never authors the words.** Any component that has parrot composing
> marketing/docs/prose copy, deciding brand voice, or doing human translation of long-form text is an automatic
> ❌, regardless of other criteria. parrot's `mt` is a **governed pipeline** (catalog strings, glossary-gated,
> human-reviewed) — translating-with-governance is plumbing; authoring is not.
>
> **Grading calibration (locked, `memory feedback_harness_component_grading_calibration`):** ✅ = real +
> tested/verified with evidence; 🟡 = present but unproven; ❌ = absent. Maturity = round(1 + 4×coverage).

## Harness components (11)

### 1. Identity — **OVERRIDE (1b reachability = N/A)**
- **1a Self · ✅ =** `identity/SOUL.md` + `identity/BRAND.md` filled with the real **parrot** persona (the
  faithful-carrier voice; IS/DOES/REFUSES; the **plumbing↔content-authoring boundary**; the five spine moves; the
  test-in-`pl`/`ar`/`he` reflex); **zero `{{UPPERCASE}}` template slots** (`grep -rE '\{\{[A-Z_]+\}\}' identity/`
  → no match — the scaffold ships `{{AGENT_NAME}}`/`{{MISSION}}`/`{{PLATFORM}}`, so this is a real fix, not a
  freebie); unique one-word name **parrot** + tagline ("Every locale, correct on day one — the 20% English never
  sees") + "powered by Energy"; `CLAUDE.md` non-generic (the test-the-20% + library-is-commoditized spine, NOT the
  forge template). *verify:* `grep -rE '\{\{[A-Z_]+\}\}' identity/` → none; `grep -c parrot identity/BRAND.md` ≥1.
- **1b Reachability · N/A —** parrot is consumed by coding agents + the local cockpit via CLI/MCP, **not**
  messaging channels. A grader marks reachability **N/A, not 🟡/❌**. The CLI + MCP server ARE parrot's
  reachability surface; channel adapters (WhatsApp/SMS/voice/Telegram/iMessage) do not apply and their absence is
  **not** a gap. (DECISIONS per-repo "Identity-reachability = N/A"; checklist Part B "Dev-tool: identity = N/A".)

### 2. Memory — **OVERRIDE (queryable layer indexes the EXPERTISE BRAIN, not code history)**
- **✅ =** `memory/MEMORY.md` bootstrap ≤ 2,000 tokens (the spine: the boundary · the default stack · the 12-JTBD
  index · the one belief "test the 20% invisible in English" · the 6-brain-file pointers · the provider
  one-liners) **AND** a real semantic-search layer (BM25 via `scripts/memory-search.sh`) wired over **`brain/**.md`**
  (NOT git/code history). A `MEMORY.md` + grep alone = 🟡, not ✅ — the queryable layer over the brain is required.
  *verify:* `bash scripts/memory-search.sh "polish plural wrong"` returns a ranked, **cited** hit (e.g.
  `KNOWN-PITFALLS P6` / `BATTLE-TESTED-SCENARIOS S3`) in the top 3; `wc -w memory/MEMORY.md` ≤ ~1500.

### 3. Skills — as checklist, **with count override ≥5**
- **✅ =** ≥ **5** real `SKILL.md` in `skills/` (`i18n-setup-nextjs` · `icu-message-authoring` · `rtl-bidi-audit`
  · `hreflang-seo-graph` · `mt-tms-governance`; `i18n-font-fallback` is a 6th stretch), each with `## Trigger` +
  `## Steps` + `## Output` + a **`brain/` citation** (encodes specific OPINIONS/PITFALLS — e.g.
  `icu-message-authoring` encodes O7/O8/P6/P9 — not a generic summary). Invokable from another harness (energy
  hub). *verify:* `ls skills/*/SKILL.md | wc -l` → ≥5; `grep -l brain/ skills/*/SKILL.md` = all 5.

### 4. Tools / CLIs — as checklist (**OVERRIDE: browser = N/A in normal operation**)
- **✅ =** real `bin/parrot` binary (`#!/usr/bin/env node`, commander) with the PLAN §4 command tree; `--help`/
  `--version`; exits 0/non-zero; **`--json` on data commands** (employee/agent-first — JTBD-11). Tool list in
  `AGENTS.md` + `llms.txt`. The command tree is implemented **at least through the acceptance path** (`init` /
  `extract` / `check`).
- **OVERRIDE (browser):** the i18n pipeline is plain files + deterministic CLIs an agent reads/writes (brain
  JTBD-11.1) — the web is **not touched in normal operation**, so "no general browser tool" is **not** a gap; a
  browser tool is wired only if a live-TMS-provider golden leg needs one. The checklist's "if it touches the web,
  wire a browser tool" clause does not bind parrot's blocking path.
- *verify:* `node bin/parrot --version` exits 0; `node bin/parrot check eval/fixtures/app --json` emits parseable
  JSON; `node bin/parrot --help` lists every command.

### 5. Hooks — as checklist, **scoped to the hardcoded-string gate (dogfood)**
- **✅ =** `.claude/settings.json` ≥1 real matcher AND `.claude/hooks/i18n-string-gate.js` (PreToolUse on
  Write / git-commit) that **fires and blocks** on a hardcoded user-facing string outside a `t()`/`<Trans>` call
  in a `.tsx` (the catalog-bypass — P9/O8 spirit) **and** on a write of a non-`${VAR}` literal into `.mcp.json`.
  A hook that exists but never fired = 🟡, not ✅. The inherited `protect-secrets.js` is **KEPT** alongside it
  (it blocks credential *files*; the new hook blocks hardcoded-string *patterns*). *verify:* run the trigger
  against a planted hardcoded-string fixture → non-zero exit + the cited message; against clean input → exit 0;
  the side effect appears in the hook log.

### 6. Sub-agents — as checklist (the 2 named personas)
- **✅ =** `.claude/agents/` **flat** (no `agents/agents/` nest); **`i18n-correctness-auditor.md`** +
  **`i18n-migration-planner.md`** present, each ≥40 lines, brain-grounded system prompt, distinct scope, no
  template slots; callable via `Agent`. The **correctness-auditor MUST refuse** to pass plurals tested only in
  English (O7) and MUST check `dir`+logical-props+selective-icon-mirror for RTL (S7); the **migration-planner
  MUST treat** a library swap as a full-component-surface refactor, not a one-liner (S4). *verify:* `ls
  .claude/agents/i18n-*.md` lists both; `grep -L '{{' .claude/agents/i18n-*.md` (no slots); each invoked on a
  fixture produces its scoped finding.

### 7. MCPs — **OVERRIDE (own server `parrot`; stdio-local sufficient for C1)**
- **✅ =** `.mcp.json` lists parrot's **own** server `parrot` (env-refs only, **no live keys** — the scaffold
  already does this correctly for github; keep that pattern); `src/mcp/server.ts` implements the PLAN §4 tools
  (`parrot_init` / `parrot_extract` / `parrot_check` / `parrot_icu` / `parrot_rtl_audit` / `parrot_hreflang` /
  `parrot_pick` / `parrot_search_brain` / `parrot_explain` + `parrot://brain/*` resources) over **stdio**;
  `tools/list` JSON-RPC returns them. Only the 4 inherited servers = 🟡, not ✅. **Hosted-OAuth dual-mode is NOT
  required for C1** (parrot is a dev-tool agents call locally — the checklist permits stdio-local for dev-tools);
  a grader must NOT fail this row for lacking a hosted endpoint. **HARD: no tool return contains a raw secret or a
  provider token** (the MT/TMS tools return verdicts/handles). *verify:* `echo
  '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/mcp/server.js` lists `parrot_*` tools; a
  `parrot_check` call round-trips; `python3 -m json.tool .mcp.json → OK`.

### 8. Dispatch — **OVERRIDE (routing = the JTBD task router; cron = the RSI currency watch)**
- **✅ =** (routing) `src/dispatch/route.ts` maps a task string → JTBD/handler, tested multi-step (`route("the
  German pages render in English") → {jtbd:1, handler:"correctness-auditor", pitfall:"P1"}`); no bare `tmux
  select-pane`. (routine) an **enabled (uncommented)** GH Actions `schedule:` in `.github/workflows/rsi.yml`
  running the deterministic RSI engine — **ENABLED, not just written** (the #1 fleet-gap lesson; CP117 burned on
  "written ≠ enabled"). A commented-out / never-run workflow = 🟡, not ✅. *verify:* the route test passes; `grep
  -A2 'schedule:' .github/workflows/rsi.yml` shows an uncommented cron **and a recorded run-id** in
  IMPLEMENTATION-NOTES.

### 9. Evals — as checklist (Hamel L1/L2/L3 + tests), **OVERRIDE: acceptance test is the top integration eval; no self-grading; the differentiator**
- **✅ =** `eval/` with L1 structural assertions (`parrot eval`), L2 ≥3 (parrot ships **≥12**) binary golden tasks
  lifted from `brain/BATTLE-TESTED-SCENARIOS.md` (F1 ≥ 0.8, graded against each scenario's **Eval-gate** — **no
  self-grading**; e.g. GT-3 fails any answer that declares Polish plurals "done" from English; GT-4 fails any
  concatenation), L3 calibrated LLM-judge on the trajectory tasks (GT-11/GT-13/GT-14); Vitest + Playwright
  red-blocking in CI; **the acceptance test green in CI**; **pass^k (k≥3)**. L1-only / a Likert/opinion judge /
  pass@1 = 🟡, not ✅. The CI-blocking golden subset = **GT-1, GT-2, GT-3, GT-5, GT-6, GT-7, GT-9, GT-10, GT-15,
  GT-16 + the acceptance test** (PLAN §6); GT-13/GT-14 (L3 trajectory) nightly, non-blocking. *verify:* `parrot
  eval` → exit 0, pass N/fail 0; the acceptance CI job is green; a deliberately-broken golden answer (e.g. "Polish
  plurals are fine, tested in English") turns CI **red**.

### 10. Observability — as checklist, **OVERRIDE: the logger MUST strip URL query strings**
- **✅ =** append-only `logs/runs.jsonl` written by the CLI + RSI loop; each line `{ts, cmd, jtbd, model,
  duration_ms, outcome, findings_count}`; a `runs`/`runs-view` aggregator; logs include model + duration + tool
  calls. **OVERRIDE: the logger MUST strip URL query strings (origin+pathname only) before writing** (a
  hreflang/locale URL or a TMS callback can carry a token) — a `runs.jsonl` line containing a raw secret-shaped
  value or a full query string is an automatic ❌. *verify:* run `parrot check …` → `runs.jsonl` grows by one
  valid JSON line containing **no** query string / secret value; `node scripts/runs-view.mjs` aggregates;
  `runs.jsonl` NOT gitignored.

### 11. Sandbox / Infra — **OVERRIDE (integration point = scaffold+boot the fixture app & render a non-Latin locale; GH runner is an accepted alt)**
- **✅ =** the real integration point (run `parrot init` on the fixture Next.js app, `parrot extract`, `parrot
  check`, and **render `/ar/`** to assert `dir="rtl"` + a correct Arabic plural) runs **isolated + reproducibly**:
  a `sandbox/` template (E2B default **OR** the GH Actions ubuntu runner as a documented alt) that runs the
  acceptance flow; the acceptance CI job runs inside it and is green; cold-start / break-even noted if E2B
  considered. **E2B is NOT a hard CI gate** — if `E2B_API_KEY` is absent the ubuntu runner satisfies the isolation
  need; a grader **must accept the documented-alt path**. A template never booted = 🟡, not ✅. **Grading note
  (D10):** this component is graded on the **live render itself**; if `E2B_API_KEY` is absent at grade time the
  Sandbox component is 🟡 (not ✅) **but the acceptance/merge gate still passes via the ubuntu path** — the merge
  gate does not depend on E2B; the *Sandbox component ✅* does. *verify:* the acceptance CI job is green inside the
  isolated env; the `/ar/` render asserts `dir="rtl"` + **distinct** Arabic plural strings for count=1,2,6.

## Cross-cutting properties

### RSI / open-endedness — as checklist, **minimum L1; deterministic-$0 now, Claude half deferred (D8)**
- **✅ (L1 minimum) =** `dsip.json` present (domains: `tool-matrix-currency` · `brain-pin-integrity` ·
  `eval-health` · `plural-rtl-coverage`; `selection:"eval-gated"`, `noSelfGrading:true`, snapback
  git component+repo, `externalIntelligence.enabled:true`); `workflows/rsi.workflow.js` deterministic engine
  ($0, tokenless) running refresh-tool-matrix-versions (`npm view` on next-intl/i18next/react-intl/@lingui/core/
  @lingual-i18n-check/lingo.dev) → re-verify-brain-pins → run-eval-pyramid → propose → test-gate → commit;
  `darwin-check dsip.json ≥ L1` (evals gate merges). The **Claude half** (brain-file rewrite + new golden task on a
  real watchlist delta — a next-intl tree-shaking release, an MF2 TC39 Stage-3 move, a new FormatJS-NAPI platform
  drop, a new official TMS MCP) is **deferred to `CLAUDE_CODE_OAUTH_TOKEN`** (D8) — its absence is **NOT** a gap;
  grade the deterministic+L1 bar. *verify:* `node workflows/rsi.workflow.js --deterministic` → exit 0, completes
  the 6 steps, detects a planted stale pin, proposes a diff without committing unless the gate passes;
  `darwin-check ≥ L1`; `rsi.yml` cron uncommented + guarded-green.

### Model routing — as checklist
- **✅ =** `scripts/budget-manager.sh` present (inherited; **no-op per D14** — always Opus max); the RSI workflow +
  any sub-agent spawn pass an **explicit** model (no bare default); commit trailers name the model. *verify:*
  `scripts/budget-manager.sh status` runs; `grep -r 'model:' workflows/ src/` shows explicit routing.

## Packaging surfaces (dev-tool / meta-employee profile)

Required surfaces: **CLI + MCP + plugin + skill-set + AGENTS.md + CLAUDE.md + llms.txt + A2A card + packaged
sub-agent.** (checklist Part B "Dev-tool / Meta-harness" row.)

- **CLI · ✅ =** `bin/parrot` real + `--help`/`--version` + the PLAN §4 command tree, `--json` on data commands.
  (npm-publish under `@energy/` **deferred to the C2 review** — local bin is sufficient for C1; not a gap.)
- **MCP server · ✅ =** own `parrot` stdio server, tools listed, **no raw-secret returns** (registry/Smithery
  listing **deferred** — not a C1 gap).
- **Plugin · ✅ =** `.claude-plugin/manifest.json` valid, bundling CLI + MCP + the ≥5 skills + the
  `i18n-string-gate` hook + the 2 agents; every referenced path resolves. *verify:* `python3 -m json.tool → OK`.
- **Skill-set · ✅ =** ≥5 skills exported (above).
- **A2A card · ✅ =** `.well-known/agent.json` (name `parrot` / description / endpoint / `capabilities` = the
  DELIVERED surfaces: init/extract/check/icu/rtl-audit/hreflang/pick/brain/explain; `plannedCapabilities` =
  mt/tms advertised separately so the card never over-claims), one capability (`check`) round-trips.
- **AGENTS.md · ✅ =** **rewritten for i18n** (the WikiMem "wiki schema" template is replaced): the tool list
  (CLI+MCP) + the 12-JTBD quick-ref + the NOT-list + the **HARD boundary (plumbing not content authoring)**. **A
  grader must FAIL this row if it still contains the WikiMem "wiki schema" / "raw/ wiki/ sources/" template**
  (`grep -ci 'wiki schema\|wiki/sources' AGENTS.md → 0`).
- **CLAUDE.md · ✅ =** rewritten non-generic (i18n operating rules: test the 20% invisible in English;
  library-is-commoditized-discipline-is-the-moat; MF1 default; the plumbing↔authoring boundary), **not** the forge
  "TODO" template (`grep -c 'TODO:' CLAUDE.md → 0`).
- **llms.txt · ✅ =** present, links AGENTS.md + the 6 brain files + the ≥5 skills + the MCP tool names + the A2A
  card + SOUL.md + the one-line default stack + the boundary + the P-/S-/O- ID index.
- **Sub-agent persona (packaged) · ✅ =** the 2 personas above, testable via `Agent` from another harness.
- **Framework adapter (`@energy/agent-toolkit`) · N/A for C1** — meta-harnesses only; parrot is a product-surface
  (i18n) employee, not a fleet meta-harness. Absence is **not** a gap.

## Dogfood gates (parrot's own repo must obey its own law — brain P9/P28, the boundary)

These are **graded on parrot's own repo files** (not a target app) — parrot must practice what it preaches:
- **✅ =** `.gitignore` excludes `.env*` **AND keeps `!.env.example`** (`git check-ignore .env` passes; `git
  check-ignore .env.example` does NOT — confirm `!.env.example` is present).
- **✅ =** `.env.example` is **regenerated from parrot's real schema** (only vars parrot consumes —
  `ANTHROPIC_API_KEY` / `E2B_API_KEY` / `GITHUB_PERSONAL_ACCESS_TOKEN` / optional `LINGODOTDEV_API_KEY` /
  `TOLGEE_API_KEY`+`TOLGEE_API_URL`), **not** the stale energy copy (`grep -ci 'Clerk\|Ticketmaster\|Stripe\|
  GOOGLE_PLACES' .env.example → 0`; the scaffold ships the energy superset — a real fix).
- **✅ (keep it correct) =** `.mcp.json` uses `${VAR}` refs, **no literal secret** — a grader confirms this stays
  correct (the scaffold already does it for github), not regrade it as new work.

## Product surface (i18n is parrot's vertical, but parrot is the HARNESS, not the app)

- parrot does **not** ship its own product app beyond the **cockpit** (D3). The "product surface" parrot operates
  ON is the *target* (Next.js) app it wires/checks — represented in grading by the shipped `eval/fixtures/app`. The
  Part C "i18n / localization — GAP" line is **closed by parrot's existence** as the owning employee: parrot's
  product-surface DONE = the acceptance test (`parrot init` → next-intl wired → `parrot check` green in `pl`/`ar`).
- Deploy/CI/DB/frontend-shell of any target app belong to **rocket/acorn/pixel** — **out of scope for parrot's
  grading** (PLAN §2 NOT-list). Auth/sign-in of any target app belong to **badge**; the EU-AI-Act legal posture on
  MT belongs to **stamp** (parrot implements ZDR/no-train *routing*, not the *legal posture*). parrot wires the
  i18n cross-cutting concern into whatever shell exists — it never owns the shell.
- **Content authoring is OUT** (the HARD invariant above): parrot wires the pipeline that carries + gates the
  strings; composing the strings (marketing/docs/prose copy, brand voice, human translation of long-form text) is
  a content employee / human translator's job. A grader sees parrot authoring copy → that component is ❌.

---

*Grading authority: this file + the locked calibration. Where this file and the generic
`audit/HARNESS-CHECKLIST-2026.md` differ, **this file wins** for parrot. Maturity = round(1 + 4×coverage) over
these cells. Source of every criterion: `PLAN.md` §3/§4/§5 + the six `brain/` artifacts.*
