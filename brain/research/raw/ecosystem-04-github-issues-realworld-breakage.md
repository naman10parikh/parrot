---
title: "Ecosystem Research — Real-World Breakage (high-engagement GitHub issues, i18n)"
type: source
created: 2026-06-17
tags: [i18n, github-issues, breakage, gotchas, next-intl, i18next, formatjs, lingui, rsc, pluralization, type-safety]
sources: ["github.com/amannn/next-intl/issues", "github.com/i18next/i18next/issues", "github.com/i18next/react-i18next/issues", "github.com/formatjs/formatjs/issues", "github.com/lingui/js-lingui/issues", "github.com/tolgee/tolgee-platform/issues"]
summary: "The highest-engagement issues across every canonical i18n repo, mined for the actual failure modes — RSC/setRequestLocale, ICU pluralization data-loading bugs, type-safety perf cliffs, SWC plugin saga, multi-tenancy + parallel-route incompatibility."
---

# Real-World i18n Breakage — What the GitHub Issues Reveal (June 2026)

> Sourced via `gh api search/issues sort:reactions-+1-desc` on 2026-06-17, then deep-read on the
> load-bearing ones. Engagement shown as `[Nr/Mc]` = N reactions / M comments. These are the
> failure modes that matter — they are what a human burns days on and what an agent must avoid.

## A. THE App-Router / RSC pain cluster (next-intl + lingui)

### `next-intl#663` — "Getting rid of `setRequestLocale`" [95r/41c] — OPEN since 2023-11-24
**The single most-reacted next-intl issue.** This is THE App-Router gotcha.
- **What `setRequestLocale` is:** a function you must call at the top of every statically-rendered Server Component (and layout) so next-intl knows the locale *during static rendering*. It is pure boilerplate from a developer's view.
- **Maintainer (amannn) verbatim:** it is *"intended as a stopgap solution to be removed at some point."* Root cause = Next.js doesn't expose the active locale to RSCs during **static rendering** (the `[locale]` segment param isn't available the way request headers are), so next-intl needs you to hand it the locale explicitly or every static page silently renders the default locale.
- **Status (June 2026):** still open. amannn punted it to `vercel/next.js#58862` — it needs *native Next.js* support to truly fix. Workaround remains: call `setRequestLocale(locale)` in every static layout/page, or accept dynamic rendering (lose static gen).
- **parrot takeaway:** if you choose next-intl + static export, `setRequestLocale` boilerplate is unavoidable and easy to forget — forgetting it = pages render in the wrong language with NO error. This is a top "agent must wire it everywhere" hazard. A parrot skill should *codegen the `setRequestLocale` call into every generated page* and a parrot eval should assert it's present.

### `next-intl#1493` — "Support for `cacheComponents`" [26r/66c] and `#2074` — "Does it actually support cache components from Nextjs 16?" [13r/3c]
- Next.js 16's new **`cacheComponents`** (the successor to PPR / `use cache`) interacts badly with per-request locale. 66 comments = unresolved churn. The whole "locale is request state but I want to cache the component" tension is *the* unsolved frontier for Next-native i18n in 2026.
- **parrot takeaway:** Next.js 16 + i18n + caching is an active danger zone. Flag explicitly; don't assume `next-intl@4` + Next 16 caching "just works." (See `#2074` literally asking "does it actually support it?" — the honest answer in mid-2026 is "partially / verify per release.")

### `next-intl#255` — "Unable to use next-intl with parallel or intercepted routes" [22r/29c]
- next-intl's middleware-based locale routing **conflicts with App Router parallel routes (`@slot`) and intercepted routes (`(.)`)**. A real architectural incompatibility, not a config error.
- **parrot takeaway:** if the product uses parallel/intercepting routes (modals-as-routes, dashboards with slots), next-intl's routing needs careful handling or breaks. Document as a known sharp edge.

### `lingui/js-lingui#1698` — "NextJS App Router and RSC Support path" [13r/48c]
- Lingui's equivalent struggle: getting macros + catalogs working in RSC. 48 comments of community figuring out the path. Lingui added RSC support but later than next-intl, and the macro/compile-time model fits RSC awkwardly.
- **parrot takeaway:** **next-intl is the most RSC-mature of the open-source options**; i18next-via-react-i18next needs the community `i18next` RSC adapters; lingui's RSC path was hard-won and macro-based. If RSC is a hard requirement, next-intl is the safest default — which validates Energy's checklist choice, but for the *RSC* reason specifically, not generically.

## B. THE pluralization / ICU data-loading trap (FormatJS)

### `formatjs/formatjs#1013` — "Pluralization problem — different results with FormattedPlural and FormattedMessage" [103r/4c]
**The single most-reacted FormatJS issue.** A genuine ICU correctness landmine.
- **The bug (Polish, `pl`):** for value `2`, `FormattedPlural` correctly gave "pierogi" (the *few* category) but `FormattedMessage` with ICU `{count, plural, ...}` gave "pieroga" (*other*). For value `5`, `FormattedPlural` gave "pierogów" (*many*) but `FormattedMessage` gave the *other* form. **Same number, two different plural categories — one of them wrong.**
- **Root cause:** the locale's CLDR plural-rule data wasn't loaded, so the ICU parser fell back to English-style plural categories (which only have `one`/`other`), silently mis-categorizing. The reporter nailed it: *"When I remove `addLocaleData(pl)` FormattedPlural behaves similar to FormattedMessage so maybe it's a problem with loading locale data?"*
- **Resolution:** labeled **`wontfix`** — i.e. "load the locale data correctly and it works; we won't paper over missing data." (Modern FormatJS uses native `Intl.PluralRules` which loads CLDR automatically in evergreen runtimes — but the *lesson* persists.)
- **parrot takeaway — this is the deepest pluralization lesson in the whole corpus:** **languages with >2 plural categories (Polish, Russian, Arabic, Czech, Welsh, Lithuanian…) will silently render the WRONG plural form if CLDR plural data for that locale isn't loaded** — and you get no error, just grammatically broken text that an English-speaking dev/agent can't see. Arabic has [removed] plural categories (zero/one/two/few/many/other); English has TWO. An agent that tests only in English will ship broken Slavic/Arabic plurals. A parrot eval MUST test plurals in a many-category language (e.g. assert `{count, plural,...}` produces distinct strings for count=1,2,5,0 in `pl`/`ar`/`ru`).

## C. THE type-safety pain cluster (i18next + react-i18next)

### `i18next/i18next#1504` — "Make the translation function fully type-safe" [49r/33c]
- The long saga of making `t('some.key')` typecheck the key against the actual JSON. i18next eventually shipped this via TS module augmentation (`react-i18next.d.ts` declaring `resources`). But it's opt-in and fiddly.

### `i18next/i18next#1991` — "Worse typechecking performance with version 23" [14r/13c] and `#1883` — "Run eslint -> JavaScript heap out of memory" [12r/45c]
- **The type-safety tax is real:** turning on fully-typed keys with large message catalogs **blows up `tsc` and ESLint memory/time** — `#1883` is literally "eslint → JS heap out of memory" (45 comments). Big catalogs + deep key typing = slow IDE, OOM lint.
- **parrot takeaway:** typed-keys is a quality win but has a **scaling cliff** — for large apps the TS server gets slow and CI lint can OOM. Mitigations: `skipLibCheck`, split namespaces, or `KeyPrefix` typing. A parrot harness for a large app should warn about this, not blindly enable full key typing.

### `react-i18next#1543` — "This JSX tag's 'children' prop expects a single child… ReactI18NextChild" [37r/88c]
- **88 comments** — the most-discussed react-i18next issue. The `<Trans>` component's children typing fights React 18's stricter JSX child types. Endless "add this to your tsconfig / cast it / downgrade types" thrash.
- **react-i18next#1483 [26r/39c]** and **#1476 [15r/20c]** are the same family: `<Trans>` + React 18 type definitions = friction.
- **parrot takeaway:** the `<Trans>` component (for interpolating React elements *inside* a translated string, e.g. `Click <a>here</a>`) is the most type-fragile surface in react-i18next. Know the canonical tsconfig fixes; an agent will hit this immediately on any non-trivial rich-text translation.

## D. THE SWC / build-tooling saga (Lingui)

### `lingui/js-lingui#1224` — "SWC plugin" [86r/34c] + `#1158` "Support for SWC" [17r/19c]
- Lingui's macros originally needed **Babel**. With Next.js/Vite moving to **SWC**, Babel-only macros became a blocker (you couldn't use Lingui without opting out of SWC's speed). 86 reactions = the community really wanted `@lingui/swc-plugin`. It now exists, but the saga shows Lingui's **compile-time-macro model is tightly coupled to your build toolchain** — a new bundler/transpiler can strand you.
- **`#2363` "V6 Roadmap: ESM Only distribution"** — Lingui v6 went ESM-only; CommonJS consumers had to migrate.
- **parrot takeaway:** **Lingui's power (compile-time extraction) is also its biggest risk — it lives or dies by build-tool plugin support.** If you're on a bleeding-edge bundler, verify the Lingui plugin exists *first*. next-intl/i18next are runtime libraries with no transpiler coupling — safer for unusual toolchains.

## E. Multi-tenancy / routing-flexibility cluster (next-intl)

### `next-intl#1107` — "Integration with multi-tenancy" [20r/35c] and `#366` — "Option to not have the locale anywhere in the URL" [14r/13c]
- Multi-tenant SaaS (tenant in subdomain/path) + locale-in-path is awkward; some teams want **no locale in the URL at all** (cookie-only detection) which next-intl made hard for a long time (it's prefix-routing-first).
- **next-intl#1 — "Automatic tree-shaking of messages" [45r/38c]** (still OPEN, issue #1!) — you ship ALL messages to the client by default; tree-shaking only what a component uses is the long-requested holy grail. `useExtracted` (2026) is partly aimed at this.
- **next-intl#663 setRequestLocale** (above) + **#1 tree-shaking** being the two oldest/most-reacted OPEN issues tells you next-intl's two structural weaknesses: **RSC locale plumbing** and **bundle bloat from shipping all messages**.

## F. TMS / platform-side breakage (Tolgee, Lingo.dev)

### `tolgee/tolgee-platform#3400` — "DeepL no longer working, due to deprecated legacy authentication" [8r/4c]
- Real-world: a TMS's machine-translation provider integration **broke when DeepL deprecated legacy auth**. Lesson: TMS↔MT-provider integrations are a fragile seam that breaks on the provider's schedule, not yours.
### `tolgee/tolgee-platform#2300` — "Apple String Catalog Support" [14r/6c] + `#1550` "Branching" [27r/8c]
- Tolgee's most-wanted: **Apple `.xcstrings` String Catalog** support (the 2024+ iOS format) and **branching** (Git-like translation branches). Tells you what mature TMS features teams expect.
### `lingodotdev/lingo.dev#851` — "Support for Open Source Models" [5r/7c] + `#334` — "Opening PR from GH Action run on PR check results in error state" [3r/3c]
- Lingo.dev users want **OSS/local LLMs** (not just the hosted engine) — speaks to lock-in concern. `#334` = the GitHub Action that auto-opens translation PRs has a known failure on PR-triggered runs (CI permissions). **parrot takeaway:** Lingo.dev's "AI translates in CI and opens a PR" flow is the agent-native dream but has real CI-permission sharp edges.

## G. The cross-library meta-pattern (what every i18n tool breaks on)
1. **RSC / static-rendering locale plumbing** (Next.js era) — unsolved-by-framework; every library has a workaround with a footgun.
2. **Plural/CLDR data loading for >2-category languages** — silent wrong-text, untestable in English.
3. **Type-safety vs build performance** — full key-typing OOMs lint on big catalogs.
4. **`<Trans>`/rich-text interpolation typing** — the most fragile DX surface.
5. **Compile-time macros ↔ bundler coupling** (Lingui) — a toolchain change can strand you.
6. **Bundle bloat** — shipping all messages to the client by default.
7. **TMS↔MT-provider auth drift** — integrations break on the vendor's clock.

A parrot eval suite that doesn't probe (1), (2), and (3) is testing the easy 80% and shipping the broken 20% — which, for i18n, is *the entire point of the feature in non-English markets*.
