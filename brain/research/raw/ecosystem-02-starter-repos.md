---
title: "Ecosystem Research — Best Starter / Template / Example Repos (i18n)"
type: source
created: 2026-06-17
tags: [i18n, starters, templates, examples, next-intl, i18next, boilerplate]
sources: ["github.com/ixartz/Next-js-Boilerplate", "github.com/amannn/next-intl/tree/main/examples", "github.com/i18next/next-app-dir-i18next-example", "github.com/QuiiBz/next-international"]
summary: "The 3-5 best i18n starter/example repos as of June 2026 — stars, last-commit, exact i18n stack, and WHY each is worth copying. The production reference is ixartz/Next-js-Boilerplate (next-intl + Crowdin + i18n-check CI)."
---

# Best i18n Starter / Example Repos (June 2026)

> Verified live 2026-06-17 via `gh api`. Ranked by usefulness-to-an-agent, not just stars.

## 1. ixartz/Next-js-Boilerplate — 12,980★ — pushed 2026-06-01 — **THE production reference**
- **i18n stack (confirmed from its `package.json`):** `next-intl: ^4.12.0` + a root **`crowdin.yml`** + **`@lingual/i18n-check: ^0.9.5`** wired as a CI script: `"check:i18n": "i18n-check -l src/locales -s en -u src -f next-intl"`.
- **Why it's the reference:** this is the most-starred, *actively-maintained* (pushed this month) Next.js App-Router starter, and it ships the **complete production i18n triad**: (1) the runtime library (next-intl), (2) the TMS sync (Crowdin via `crowdin.yml`), and (3) a **CI guard** (`i18n-check`) that fails the build if a translation key is used in source but missing from a locale file, or defined but unused. That CI guard is the single most-copyable idea in the whole starter space — it turns "did we forget to translate this string?" from a production incident into a red CI check.
- **What parrot should lift:** the `i18n-check` CI pattern + the `crowdin.yml` shape. This validates Energy's checklist default (next-intl + Crowdin) with a real, popular, current codebase — and *adds* the missing fourth leg the checklist doesn't mention: **a key-completeness linter in CI** (`@lingual/i18n-check`).
- Stack also: Next.js App+Pages router, Tailwind 4, Clerk, Drizzle — i.e. nearly the exact Energy stack, so its choices transfer cleanly.

## 2. amannn/next-intl `examples/` — official, in-monorepo — pushed 2026-06-15
The canonical next-intl reference apps (8 of them). The ones that matter:
- **`example-app-router`** — the baseline App-Router setup. Copy this first.
- **`example-app-router-extracted`** — demonstrates the **2026 `useExtracted` flow** (write inline default messages, build extracts+keys them). This is the AI/agent-ergonomic pattern; the most relevant example for an *agent* generating localized code.
- **`example-app-router-migration`** — **the v3→v4 / pages→app migration reference.** Read this before any migration.
- **`example-app-router-without-i18n-routing`** — the **cookie-only / no-locale-in-URL** strategy (the thing issue #366 asked for; now a first-class example). Critical for multi-tenant SaaS or apps that don't want `/en/` prefixes.
- **`example-app-router-playground`** — kitchen-sink of every feature.
- **`example-pages-router`** + **`example-pages-router-legacy`** — for legacy Pages Router apps.
- **`example-use-intl`** — `use-intl` standalone (next-intl's framework-agnostic core) for non-Next React/Node.
- **Why:** these are maintained in lockstep with the library (pushed same day as releases), so they never drift from the current API — unlike third-party blog tutorials. **For an agent, the official `examples/` dir is the highest-trust, lowest-drift source of working code.**

## 3. i18next/next-app-dir-i18next-example(-ts) — 190★ / 165★ — pushed 2026-06-12
- The **official i18next** App-Router reference (plain JS at 190★, **TypeScript at 165★**), plus `next-app-dir-i18next-no-locale-path-example` (21★) for the cookie-only strategy.
- **Why:** if the product is *not* committing to next-intl (e.g. it's a multi-framework org standardizing on i18next, or needs i18next's huge plugin ecosystem — backend connectors, ICU, language detection), this is the maintained App-Router pattern. Pushed this month, so current with Next 15/16. The `-ts` variant is the one to copy.
- **Caveat:** i18next-in-RSC is more DIY than next-intl-in-RSC — these examples show the community-blessed wiring (a custom `initServerI18n` + a client provider), but it's more moving parts than next-intl's `getRequestConfig`.

## 4. QuiiBz/next-international — 1,446★ — pushed 2024-10-31 — **the type-safe-first alternative (but watch the staleness)**
- A **fully type-safe, zero-dependency** i18n library for Next.js (locale files are `.ts` so keys + ICU params are typed end-to-end with no module-augmentation gymnastics).
- **Why worth knowing:** it solves the type-safety pain (i18next #1504 / react-i18next #1543 cluster) *by design* — keys and interpolation values are typed from the source, no codegen. The DX many teams actually want.
- **HONEST FLAG (currency):** **last pushed 2024-10-31** — ~20 months stale as of June 2026. For a library that lives at the Next.js bleeding edge, 20 months is a long time (it predates Next 15's async params and Next 16's `cacheComponents`). **Do not default to it** without verifying Next 16 compatibility yourself. Listed because its *design idea* (TS-native locale files) is the right one and worth borrowing even if the library itself is dormant.

## 5. (TMS-side) lingo.dev — examples in main repo — pushed 2026-06-16
- Lingo.dev's repo carries example configs for its **AI-translate-in-CI** flow (point the CLI at i18n JSON, it machine-translates and can open a PR). No standalone high-star example repo, but the main repo's docs/examples are the reference for the "agent translates strings automatically" pattern. Relevant to parrot specifically because **this is the most agent-native of all the tools** — translation as a CI step, not a human handoff.

## Ranking for parrot's purposes
| Rank | Repo | Use when |
|---|---|---|
| 1 | **ixartz/Next-js-Boilerplate** | Starting a real Next.js product — lift the next-intl + crowdin.yml + i18n-check CI triad wholesale. |
| 2 | **next-intl `examples/`** | Need correct, current, drift-free next-intl code (esp. `-extracted`, `-migration`, `-without-i18n-routing`). |
| 3 | **i18next/next-app-dir-i18next-example-ts** | Org is i18next-standardized or needs the plugin ecosystem. |
| 4 | **QuiiBz/next-international** | Borrow the TS-native-locale-files idea; verify Next 16 compat before using as-is (stale). |
| 5 | **lingo.dev repo** | Wiring AI machine-translation into CI (the agent-native flow). |

**Anti-slop note:** I deliberately excluded the dozen high-star "SaaS boilerplate" repos that *mention* i18n but where it's a peripheral checkbox (moemail, ShipFree, relivator, etc.). Stars on a general boilerplate ≠ a good i18n reference. The list above is filtered to repos where i18n is *the point* or where the i18n wiring is demonstrably production-grade (ixartz).
