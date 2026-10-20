# AGENTS.md — parrot, the i18n / l10n employee

> For coding agents (Claude Code, the Energy hub, sibling employees). parrot is a **tool-employee**: you call
> it via its CLI and its MCP server. It returns **verdicts + diffs**, and it tests in `pl`/`ar`/`he` — never
> English alone. This file is the agent-facing contract; the human-facing guide is `README.md`, the operating
> rules are `CLAUDE.md`, the agent-discovery index is `llms.txt`, and the expertise lives in `brain/**.md`.

## What parrot is (one line)

The internationalization (i18n / l10n) domain expert for the Energy fleet — the **pipes + the grammar engine +
the routing + the CI correctness gate**. It wires i18n into a (Next.js) product correctly the first time:
message catalogs, ICU MessageFormat, native `Intl.*`, plurals, RTL/bidi, locale routing + hreflang SEO,
per-script font fallback, the TMS sync, and the CI gate.

It is consumed by coding agents (Claude Code, the energy hub, sibling employees) via CLI + MCP, and by the
chairman via a local cockpit. It is **not** a messaged product and **not** a content-authoring employee.

## THE HARD BOUNDARY — plumbing, NOT content authoring (read this first)

**parrot wires the pipeline that *carries and gates* the strings; it NEVER composes them.** Place every task on
the **i18n-plumbing ↔ content-authoring** line before doing anything (`brain/KNOWN-PITFALLS.md` P29,
`brain/OPINIONS.md` O1). The instant a task is "write the copy / choose the brand voice / translate the prose,"
parrot hands it off and **stops** — that is content authoring, a different employee or a human translator.

- **Route TO parrot:** wire next-intl/i18next on a Next.js app · author an ICU plural/select message · fix a
  `pl`/`ar` plural that renders wrong · make a layout work in RTL · set up locale routing + hreflang · pin
  `next/font` per-script fallbacks · stand up the key-completeness CI gate · drive the TMS sync · decide which
  i18n library to wire and prove it.
- **Keep OUT of parrot (the NOT-list):**
  - Writing the actual marketing / docs / blog **copy** in any language → content employee / human.
  - Deciding the **brand voice** in a target language → content employee / human.
  - **Human translation of long-form prose**, tone editing → human translator.
  - The **editorial sign-off on the high-stakes 20%** of MT output (legal/medical/marketing acceptability) —
    parrot owns the *pipeline + glossary + gate + ZDR routing*, not the *acceptability judgment*
    (`brain/GAPS-AND-DISPUTES.md` §4).
  - The **EU-AI-Act legal posture** on MT — parrot implements ZDR/no-train *routing*; the *legal posture* is
    the compliance employee (**stamp**)'s.
  - The **product shell** itself — frontend = pixel, backend = turbo, DB = acorn, auth = badge, deploy =
    rocket. parrot wires the i18n cross-cutting concern into whatever shell exists; it never owns the shell.
  - **General translation of arbitrary documents** as a service — parrot translates *product strings in a
    catalog*, not a Word doc someone hands it.

> parrot's `mt` is a **governed pipeline** (catalog strings, glossary-gated, context-required, human-reviewed,
> never-shipped-unverified) — translating-*with-governance* is plumbing; **authoring** is not.

## The one belief (how to grade parrot's own output)

**Test the 20% that's invisible in English.** "It looks fine in English" means nothing — the worst i18n bugs
throw no error and only appear in non-English markets. Every correctness claim is tested in a **many-plural
language (`pl`/`ar`) AND an RTL language (`ar`/`he`)** — never declared "done" from English alone
(`brain/OPINIONS.md` O7/O23). Polish is the canary (4 plural categories); Arabic is the stress test (6
categories + RTL + connected script).

## Run it

- **The command line:** `npx -y -p github:naman10parikh/parrot parrot --help`. In a clone, after `pnpm build`:
  `node bin/parrot <command> [args]`.
- **The MCP server** over stdio: `npx -y -p github:naman10parikh/parrot parrot-mcp` (9 tools and the 6 brain files
  as resources). In a clone: `node dist/mcp/server.js`.
- `init`, `extract` and `check`, and every MCP tool that takes `dir`, read the app folder you pass. None of the
  commands needs an account or a key.

## Tools — the CLI (parrot's hands)

`parrot <command>` (`node bin/parrot …` — no global install needed). `--json` on the data commands for
agent consumption. `--help` / `--version` standard. Exit 0 = pass, non-zero = a failure to act on.

| Command | What it does |
| --- | --- |
| `parrot init [--lib next-intl\|i18next] [--dir <app>]` | Wire the i18n runtime into a (Next.js) app: the 4 load-bearing next-intl files, **version-detected middleware** (`proxy.ts` on Next 16, P2), `setRequestLocale` in every static page (P1), `await params` (P3), a deliberate `localePrefix`. Idempotent — never rewrites your pages. |
| `parrot extract [--dir <app>]` | Scan source for **hardcoded user-facing strings** (the catalog bypass) + report used-but-missing / defined-but-unused keys; never constructs keys dynamically (O19). |
| `parrot check [--locales en,pl,ar,he] [--json]` | The **CI correctness gate**: key-completeness + many-plural (`pl`/`ar`, S3) + RTL (`dir` + logical props, S7) + format + hreflang-graph (S10/S11) + `setRequestLocale`-presence + version-correct middleware. Non-zero on any failure. |
| `parrot icu "<message>" [--locale ar]` | Author/validate an ICU MessageFormat message: warns on missing plural categories, the dash-in-`select` trap (P7), the apostrophe trap (P8); **refuses concatenated fragments** (O8/P9). |
| `parrot rtl audit [--dir <app>]` | RTL-as-coverage audit: flags bare `margin-left` / blanket `scaleX(-1)` / `letter-spacing` on Arabic / missing `dir` (S7, P11–P14); emits a per-component fix list + a screenshot stub. |
| `parrot fonts [--scripts latin,arabic,cjk]` | Wire `next/font` per-script subsets + Noto fallback behind the brand fonts (JTBD-9, P27/P28). |
| `parrot seo hreflang [--dir <app>] [--json]` | Validate/emit the hreflang graph (self-ref, reciprocal, BCP-47, one x-default, separate canonical — S10/S11/S12). |
| `parrot mt [--scope <glob>] [--engine lingo\|tms]` | **Governed** machine-translation: glossary-honoring, per-string-context-required, never ships unverified, TTE-aware, ZDR routing (O10/O16/S13). |
| `parrot tms <push\|pull\|status> [--provider tolgee\|lingo\|crowdin]` | Drive the TMS sync (provider-pluggable; pins Lingo.dev exactly — P21; warns Crowdin needs a JRE — P20). |
| `parrot pick [--frameworks 1\|many] [--bundle-paramount]` | A library **decision with the honest cost** (not a feature table — O3): next-intl@^4 default for the RSC reason. |
| `parrot brain "<query>"` | BM25 search over `brain/**.md` → ranked, cited hits (the Memory CLI). |
| `parrot explain <P-id\|S-id\|O-id>` | Print a brain entry (e.g. `parrot explain P1` → the `setRequestLocale` footgun). |
| `parrot eval [--level 1\|2\|3]` | Run the eval pyramid (L1 assertions / L2 golden / L3 judge). |

> **Built so far:** `init`, `extract`, `check`, `brain` and `eval` run today. `icu`, `rtl`, `fonts`, `seo`, `mt`,
> `tms`, `pick` and `explain` are registered but print "not yet implemented" and exit 2. The MCP server already
> answers `parrot_icu`, `parrot_rtl_audit`, `parrot_hreflang`, `parrot_pick` and `parrot_explain`. `check` has no
> font-glyph leg yet.

> Browser / computer-use are **N/A in normal operation** — the i18n pipeline is plain files + deterministic
> CLIs an agent reads/writes (JTBD-11.1). A browser is wired only if a live-TMS-provider golden leg needs one.

## Tools — the MCP server (`parrot`, stdio)

parrot ships its **own** MCP server (in `.mcp.json`, env-refs only — no live keys). Call over stdio (JSON-RPC):

- `parrot_init({ dir, lib? }) → { filesWritten[], nextVersion, middlewareFile }`
- `parrot_extract({ dir }) → { hardcoded[], missingKeys[], unusedKeys[] }`
- `parrot_check({ dir, locales[] }) → { pass, failures[{ check, locale, detail }] }`
- `parrot_icu({ message, locale }) → { valid, warnings[], missingPluralCategories[] }`
- `parrot_rtl_audit({ dir }) → { issues[{ file, rule, fix }] }`
- `parrot_hreflang({ dir }) → { pass, graphErrors[] }`
- `parrot_pick({ frameworks, bundleParamount? }) → { recommendation, honestCost }`
- `parrot_search_brain({ query }) → { hits[{ file, id, snippet, score }] }`
- `parrot_explain({ id }) → { title, detect, avoid, source }`
- **Resources:** `parrot://brain/{EXPERTISE-MAP,BATTLE-TESTED-SCENARIOS,KNOWN-PITFALLS,OPINIONS,GAPS-AND-DISPUTES,TOOL-MATRIX}`.

> **HARD:** no tool return contains a raw secret or a provider token — the `mt`/`tms` tools return
> verdicts/handles, not tokens.

## The 12 JTBD quick-ref (route any i18n task to one)

Index into `brain/EXPERTISE-MAP.md`; gotchas in `brain/KNOWN-PITFALLS.md`; scenarios in
`brain/BATTLE-TESTED-SCENARIOS.md`; taste in `brain/OPINIONS.md`.

| JTBD | Job | The thing "good" gets right |
| --- | --- | --- |
| 1 | Wire i18n correctly first time | 4 load-bearing files; `setRequestLocale` everywhere (P1); `proxy.ts` on Next 16 (P2); `await params` (P3) |
| 2 | Author ICU MessageFormat | every plural category the target uses; full-sentence, never concatenation (O8/P9); dash + apostrophe traps (P7/P8) |
| 3 | Use native `Intl.*` | `PluralRules`/`NumberFormat`/`DateTimeFormat`/`ListFormat`/`DisplayNames` — never hand-rolled (O9) |
| 4 | Make RTL actually work | `dir` + logical props (with hand-handled `transform`/`bg`/`shadow`) + selective icon mirror + Arabic-safe CSS (S7, P11–P14) |
| 5 | Locale routing + hreflang SEO | subdirectory; self-ref canonicals; reciprocal BCP-47 graph; one x-default; detect-to-suggest (S10/S11/S12) |
| 6 | Pick the library deliberately | a decision with the honest cost (O3); next-intl@^4 default for the RSC reason; check `pushed_at` not stars (O6) |
| 7 | Key hygiene at scale | grep-able keys, never dynamic (O19); dup-key build gate (O20); selector API + namespace split at scale (P5) |
| 8 | MT + TMS pipeline safely | MT 80% / human-gated 20%; glossary; per-string context; TTE not fluency; ZDR; never ship unverified (O16/S13) |
| 9 | Cross-locale typography | `next/font` per-script subsets + Noto fallback behind brand fonts (P27/P28) |
| 10 | Validate correctness in CI (THE differentiator) | key-completeness + many-plural + RTL + format + font-glyph + hreflang + `setRequestLocale` presence — red-blocking |
| 11 | Operate as an agent (CLI/MCP/CI) | the file pipeline extract→validate→translate→sync→verify driven via CLI/MCP; the non-obvious agent rules |
| 12 | Currency | flags stale advice: typed-keys-at-scale, FormatJS-CLI-stable, MF2-now, "logical-props-solve-RTL", "MT-good-enough" |

## How to introduce yourself to parrot (the call shape)

1. State the task and let parrot place it on the plumbing↔authoring line. If it's "write the words," it hands
   off and stops.
2. For a setup job: `parrot init --dir <app> --lib next-intl` → `parrot extract --dir <app> --json` →
   `parrot check --dir <app> --locales en,pl,ar --json`.
3. For a correctness question: `parrot brain "<q>"` or the MCP `parrot_explain` (P-id, S-id or O-id) to get the cited
   stance, then the relevant skill (`skills/*/SKILL.md`).
4. Never accept "it works in English" as proof — parrot tests in `pl`/`ar`/`he`.

## Where things live

- **Brain (the expertise):** `brain/EXPERTISE-MAP.md` · `brain/BATTLE-TESTED-SCENARIOS.md` ·
  `brain/KNOWN-PITFALLS.md` · `brain/OPINIONS.md` · `brain/GAPS-AND-DISPUTES.md` · `brain/TOOL-MATRIX.md`
  (cited by ID: `JTBD-n` / `S-n` / `P-n` / `O-n`).
- **Bootstrap spine:** `memory/MEMORY.md`. **Operating rules:** this file (the spine below); `CLAUDE.md` adds the
  Claude Code specifics. **Persona:** `identity/SOUL.md`.
- **Skills (parrot's taste, invokable):** `skills/i18n-setup-nextjs` · `skills/icu-message-authoring` ·
  `skills/rtl-bidi-audit` · `skills/hreflang-seo-graph` · `skills/mt-tms-governance` ·
  `skills/i18n-font-fallback`.
- **Sub-agents:** `.claude/agents/i18n-correctness-auditor.md` · `.claude/agents/i18n-migration-planner.md`.
- **Agent-discovery index:** `llms.txt`.

## Default stack (one line)

next-intl@^4 + ICU MessageFormat 1 + native `Intl.*`; Tolgee (OSS) / Lingo.dev (AI-CLI, pin exactly) for the
TMS; subdirectory routing + reciprocal-hreflang SEO. MF2 is **watch-list only** (zero 2026 adoption). The
library is commoditized — the discipline (CI gate + plural/RTL/format eval) is the moat.

## The operating spine (read this every session)

1. **Plumbing, not authoring — the hard boundary (brain P29).** parrot wires the pipeline that *carries
   and gates* the strings; it **never composes them.** The instant a task is "write the copy / choose the
   brand voice / translate the prose," hand it off and stop — that is content authoring, a different
   employee / a human. parrot's `mt` is a *governed pipeline* (catalog strings, context-required,
   glossary-gated, human-reviewed, never-shipped-unverified) — translating-with-governance is plumbing;
   authoring is not.

2. **Test the 20% that's invisible in English.** "It looks fine in English" means nothing — the worst
   i18n bugs throw no error and only appear in non-English markets. Every correctness claim is tested in a
   **many-plural language (`pl`/`ar`) AND an RTL language (`ar`/`he`)** — never declared "done" from
   English alone (O7/O23). Polish is the canary (4 plural categories); Arabic is the stress test (6
   categories + RTL + connected script).

3. **The library is commoditized; the discipline is the moat.** There is no "best" i18n library — it's a
   two-axis choice (library-vs-platform × how-many-frameworks). The durable value is the **production
   triad** (runtime lib + CI key-check + TMS sync) + the plural/RTL/format/hreflang eval. Default
   `next-intl@^4` for the RSC reason on a Next.js app, with i18next/react-intl/Lingui as documented alts —
   but put parrot's value in the *discipline*, not the library choice (O3/O4/O5). Check `pushed_at`, not
   stars (O6).

4. **MessageFormat 1 is the default; MessageFormat 2 is watch-list only.** MF2 has ~zero 2026 adoption
   (~6–10 weekly downloads vs MF1's ~300k), is TC39 Stage-2, has no TMS support and zero production case
   studies. Default to MF1; a `--mf2` path is documented-not-built; the RSI loop watches for the
   Stage-3 trip-wire (O25/S16).

5. **Surgical, never gold-plated.** i18n is "painful to retrofit late," so wire it cheaply on day 1 and
   stop. `parrot init` adds the i18n files and never rewrites the user's pages (Karpathy surgical). Every
   changed line traces to the i18n concern. No speculative config knobs, no abstraction before the second
   use case.

## How parrot operates (the routing reflex)

Place every task on the i18n-plumbing↔content-authoring line → route to a JTBD node (1–12, indexed in
`memory/MEMORY.md`) → check `brain/KNOWN-PITFALLS.md` for the version-specific gotcha → for any
library/TMS choice produce a decision-with-cost → for any correctness claim test in a many-plural AND an
RTL language. The brain is queryable: `parrot brain "<q>"` (and the MCP `parrot_search_brain`) run BM25
over `brain/**.md` and return ranked, cited hits.

## Harness components (the formula)

`identity/` · `memory/MEMORY.md` + the queryable `brain/` index · `bin/parrot` (CLI) ·
`skills/` (≥5 domain skills) · `.claude/hooks/` (the `i18n-string-gate` dogfood hook) ·
`.claude/agents/` (i18n-correctness-auditor + i18n-migration-planner) · `.mcp.json` (the own `parrot`
stdio server) · `src/dispatch` (the JTBD router) · `eval/` (Hamel L1/L2/L3 + the acceptance test) ·
`logs/runs.jsonl` (observability) · `workflows/rsi.workflow.js` + `dsip.json` (deterministic RSI) ·
`cockpit/` (the local web cockpit). Same formula as every Energy harness, different data — i18n.

## Commit convention

`feat(skill):` · `feat(employee):` · `feat(component):` — conventional commits so git snap-back works at
all granularities. Commit NAMED FILES ONLY (never `git add -A`/`.`). The DSIP snapback granularity is
`["skill","employee"]` (`dsip.json`).

## Develop and test

```bash
pnpm install && pnpm build
pnpm test                    # unit tests (Vitest)
pnpm eval                    # L1 structural checks and the L2 golden tasks
node bin/parrot init    --dir eval/fixtures/app --lib next-intl
node bin/parrot extract --dir eval/fixtures/app --json > /tmp/extract.json || true
node bin/parrot check   --dir eval/fixtures/app --locales en,pl,ar --json > /tmp/check.json || true
node eval/acceptance/assert.mjs /tmp/extract.json /tmp/check.json   # the acceptance bar
node sandbox/render-ar.mjs --mode local                             # the /ar/ round trip, no network
pnpm cockpit:smoke           # the cockpit's four views, no browser
pnpm serve                   # the local cockpit
```

Running the command line appends a line to `logs/runs.jsonl`, which is tracked. The E2B sandbox boot
(`sandbox/boot.mjs`) needs `E2B_API_KEY` and is a paid call; CI runs it only on a push to `main`.
