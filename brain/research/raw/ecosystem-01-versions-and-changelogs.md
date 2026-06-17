---
title: "Ecosystem Research — Versions + Last-6-Months Changelog Deltas (i18n)"
type: source
created: 2026-06-17
tags: [i18n, versions, changelog, next-intl, i18next, formatjs, lingui, tolgee, crowdin, lingo.dev]
sources: ["registry.npmjs.org", "api.npmjs.org", "github.com releases"]
summary: "Canonical i18n tooling as of June 2026: current versions, weekly downloads, GitHub stars, and the concrete changelog deltas from the last ~6 months (Dec 2025–Jun 2026)."
---

# i18n Tooling — Versions, Popularity, Changelog Deltas (June 2026)

> All version + download numbers pulled live 2026-06-17 from `registry.npmjs.org`,
> `api.npmjs.org/downloads`, and GitHub `repos/*` API. Changelog deltas from GitHub releases.

## 1. The version + popularity table (live, 2026-06-17)

| Package | Latest ver | First published | Weekly npm downloads | GitHub stars | Open issues | Last push |
|---|---|---|---|---|---|---|
| **i18next** | **26.3.1** | 2014-01-16-ish | **18,994,009** | 8,583 | 3 | 2026-06-10 |
| **react-i18next** | **17.0.8** | — | **13,594,461** | 10,006 | 0 | 2026-06-10 |
| **next-intl** | **4.13.0** | — | **3,828,665** | 4,293 | 51 | 2026-06-15 |
| **react-intl** (FormatJS) | **10.1.13** | 2014-06-19 | **3,450,120** | 14,718 (formatjs monorepo) | 16 (monorepo) | 2026-06-16 |
| **@formatjs/intl** | 4.1.13 | 2020-08-22 | (part of FormatJS) | ↑ | ↑ | ↑ |
| **intl-messageformat** | 11.2.8 | 2014-01-16 | (part of FormatJS) | ↑ | ↑ | ↑ |
| **@lingui/core** | **6.4.0** | 2018-01-02 | **1,353,645** | (lingui/js-lingui) | — | — |
| **@tolgee/react** | **7.1.1** | 2021-02-04 | **70,378** | 258 (tolgee-js) / 3,979 (platform) | 75 / 193 | 2026-06-16 |
| **lingo.dev** (CLI) | **0.137.0** | 2025-01-17 | **23,531** | 5,402 | 51 | 2026-06-16 |
| **@crowdin/cli** | **4.14.3** | 2020-09-23 | **241,612** | 308 | 7 | 2026-06-15 |

### Honest read of the popularity numbers
- **i18next + react-i18next together = ~32.6M weekly downloads.** This is the gravitational center of the JS i18n ecosystem by a 4-8x margin. It is framework-agnostic (React, Vue, Svelte, Angular, vanilla, Node, RN). When in doubt, this is what the world runs.
- **next-intl (3.8M/wk, 4,293★)** is the Next.js-native challenger. Lower absolute downloads than i18next but the highest *velocity* of the App-Router-era libraries, and it is the one the Energy checklist already names as default. NB: 4,293 stars is modest for the download count — it's a younger, single-maintainer-dominated project (Jan Amann / @amannn).
- **react-intl / FormatJS (3.45M/wk)** is the ICU-MessageFormat reference implementation. The 14,718 stars are on the *monorepo* (which also houses `intl-messageformat`, the polyfills, the CLI, eslint-plugin). It is the standards-purist choice.
- **Lingui (1.35M/wk)** is the macro/compile-time challenger — punches above its star count because of Vite/Babel/SWC macro adoption.
- **Tolgee (70K/wk react SDK)** and **Lingo.dev (23K/wk CLI)** are the *new* AI-localization entrants. Small but fast-growing; Lingo.dev is releasing almost daily (0.136.x → 0.137.0 inside one week of June 2026).
- **Crowdin CLI 241K/wk** dwarfs Lokalise/Tolgee CLIs — Crowdin remains the dominant TMS sync tool. (Crowdin CLI is **Java**, not Node — relevant for an agent: it needs a JRE, not just `npx`.)

## 2. Last-6-months changelog deltas (Dec 2025 → Jun 2026)

### next-intl — 4.9.0 → 4.13.0 (the `useExtracted` era)
The dominant 2026 theme is **AI-friendly message extraction** (`useExtracted`) — you write the default message inline and the build extracts + keys it, instead of hand-maintaining a key namespace. This directly matters for an *agent* writing localized code.

- **v4.13.0 (2026-05-28)** — URL-safe base64 encoding for auto-generated `useExtracted` keys. **Breaking** for existing `useExtracted` users (keys change).
- **v4.12.0 (2026-05-13)** — More `useExtracted` improvements; **small config change required** to upgrade.
- **v4.11.2 (2026-05-11)** — Reverted the v4.10.1 `x-forwarded-host` redirect-domain change (caused reverse-proxy redirect bugs).
- **v4.11.1 (2026-05-08)** — Eliminated watchers for the detached telemetry process. (next-intl ships anonymous telemetry — see ecosystem-09 agent-notes; can disable.)
- **v4.11.0 (2026-04-28)** — `displayName` property on `useFormatter` (localized region/language/currency display names via `Intl.DisplayNames`).
- **v4.10.1 (2026-04-28)** — Set redirect domain when `x-forwarded-host` present. **Breaking note**: reverse-proxy users must ensure `x-forwarded-port` is correct (typically 443). *(Reverted in 4.11.2 — a real-world thrash worth flagging.)*
- **v4.10.0 (2026-04-28)** — Per-domain `localePrefix` override (domain-based routing got finer-grained).
- **v4.9.2 (2026-04-27)** — Prototype-safety guards for `precompile: true` (precompile = ship parsed AST instead of runtime ICU parsing — perf feature).
- **v4.9.1 (2026-04-10)** — Middleware pathname validation hardening.
- **v4.9.0 (2026-04-01)** — `transitionTypes` support on the `<Link>` component (View Transitions API integration).

**Takeaway:** next-intl in 2026 = (a) `useExtracted` AI/agent ergonomics, (b) `precompile` perf, (c) increasingly fiddly reverse-proxy/domain routing (the x-forwarded thrash shows this surface is still settling). v4 has been the major line since v4.0 (2025); v3 → v4 is the migration cliff (see ecosystem-04).

### i18next — 26.0.x → 26.3.1 (steady, mature)
i18next went to **v25 in 2025** (major: dropped CommonJS-first, ESM-first, new `init` options) and is now deep in the **v26** line (current 26.3.1, 2026-06-03). The cadence is fast (12 patch/minor releases Mar→Jun 2026) but *low-drama* — 3 open issues total on an 18.9M/wk package is a remarkable maturity signal. `react-i18next` `next` tag is `10.0.0-alpha.3` for those on the *legacy* major; current stable is the 17.x line. Deltas in the window are mostly TS-typing refinements, plugin compatibility, and `Intl`-backed formatting. The story here is **stability, not novelty** — i18next is the boring-reliable choice.

### react-i18next — 16.6.x → 17.0.8 (major 17 in Mar 2026)
- **v17.0.0 (2026-03-27)** — new major. Then a steady patch train to **17.0.8 (2026-05-14)**.
- `dist-tags`: `legacy: 9.0.10`, `next: 10.0.0-alpha.3`, `latest: 17.0.8` — note the **two parallel lines**: people on v9 (very old, React 16/17 era) get `legacy`; the `next` 10.x-alpha is a *separate* slow-moving track. The mainline is 17.x. This split is a gotcha for anyone reading `npm install react-i18next@next` expecting the newest — `@next` is OLDER than `@latest` here.

### FormatJS (react-intl 10.1.13 / intl-messageformat 11.2.8 / @formatjs/intl 4.1.13)
Weekly-cadence patch releases across the whole monorepo (e.g. intl-messageformat 11.2.4 → 11.2.8 over May–Jun 2026; react-intl 10.1.8 → 10.1.13 over the same window). FormatJS tracks the **TC39 Intl** spec and **CLDR** data drops — most releases are CLDR refreshes + parser fixes, not API churn. `react-intl` `next` tag is `5.0.4-alpha.0` (a long-running future-major experiment) — do NOT install `@next`, it's older than `@latest` 10.x. Stable, standards-pinned, slow API drift = its whole value prop.

### Lingui — 6.0.x → 6.4.0 (fast-moving, SWC era)
- **v6.0.1 (2026-04-30)** through **v6.4.0 (2026-06-16)** — five releases in ~6 weeks. Active development.
- `dist-tags`: `canary: 5.1.2`, `next: 6.0.0-next.4`, `latest: 6.4.0`. The v5 → v6 jump (early 2026) is the recent migration cliff; v6 modernized the macro toolchain (SWC plugin maturity, Vite-first). Lingui's differentiator: **compile-time macros** (`t`\`...\``, `<Trans>`) that extract messages from source — same "write inline, extract automatically" philosophy as next-intl's `useExtracted`, but older and macro-based.

### Tolgee — react SDK 6.6 → 7.1.1 (major 7 in Mar 2026)
- **@tolgee/react v7.0.0 (2026-03-26)**, now **7.1.1 (2026-06-05)**. Major 7 modernized the React SDK (React 19 support, new observer for in-context translation). Platform repo (tolgee/tolgee-platform) is *very* active (193 open issues, pushed daily) — it's a full self-hostable TMS (Spring/Kotlin backend + React frontend), not just an SDK. Tolgee's hook: **in-context translation** (alt-click any string in your running app to edit its translation) + open-source self-host.

### Lingo.dev — 0.136.x → 0.137.0 (daily releases, AI-native TMS)
- Releasing **almost daily**: 0.136.1 (2026-06-05) → 0.136.4 (2026-06-11) → 0.137.0 (2026-06-16). Still pre-1.0 (0.x) after 18 months — fast iteration, no stability guarantee. `beta: 0.123.0`, `next: 0.127.0` tags lag `latest`. This is the **AI-translation-CLI** entrant (formerly "Replexica"): point it at your i18n JSON, it machine-translates via LLMs with a context-aware engine + lockfile. 5,402★ on the OSS repo. The product is the *engine* (paid API) + OSS CLI/compiler.

### Crowdin CLI — 4.13.0 → 4.14.3 (Java, slow + stable)
- 4.13.0 (2026-01-20) → 4.14.3 (2026-06-11). Monthly-ish cadence. **Written in Java** (needs a JRE / the bundled jar, NOT a pure-npm tool despite the `@crowdin/cli` npm wrapper). It is the dominant TMS-sync CLI (241K/wk). Lokalise's equivalent is `lokalise2` (Go binary) — see ecosystem-07.

## 3. Version-pinning guidance for an agent (parrot)
1. **Next.js product → `next-intl@^4`** (currently 4.13.0). If you see a v3 codebase, that's a migration target, not a starting point.
2. **Framework-agnostic / non-Next → `i18next@^26` + `react-i18next@^17`** (or framework binding). Never install `@next` for react-i18next — it's the *older* legacy-bridge line.
3. **Strict ICU MessageFormat compliance / multi-framework org → `react-intl@^10`** (`@formatjs/intl@^4` for non-React).
4. **Compile-time macros, Vite-heavy → `@lingui/core@^6` + `@lingui/macro`.**
5. **Want AI machine-translation in CI → `lingo.dev` CLI** (pin exactly, it's 0.x and moves daily — `lingo.dev@0.137.0`, not `^`).
6. **Self-hosted OSS TMS → Tolgee platform** (`@tolgee/react@^7`); **managed TMS → Crowdin (`@crowdin/cli@^4`, needs JRE) or Lokalise (`lokalise2` Go binary)**.

**Trap to flag:** for both `react-i18next` and `react-intl`, the `@next` / `next` dist-tag points to an OLDER alpha than `@latest`. An agent that reflexively runs `npm i pkg@next` to "get the newest" will *downgrade*. Always resolve the actual semver, don't trust the tag name.
