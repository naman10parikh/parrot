---
title: "Ecosystem Research — Honest Trade-off Matrix: i18n Libraries (i18n)"
type: source
created: 2026-06-17
tags: [i18n, comparison, tradeoffs, next-intl, react-i18next, react-intl, lingui, next-international, intlayer, typesafe-i18n, bundle-size, rsc]
sources: ["gundogmuseray.medium.com (Definitive Guide 2026)", "registry.npmjs.org", "github.com issue threads", "next-intl.dev"]
summary: "Brutally honest library trade-off matrix (next-intl vs react-i18next vs react-intl/FormatJS vs Lingui vs next-international vs Intlayer vs typesafe-i18n) with bundle sizes, RSC maturity, type-safety, build coupling, and explicit per-scenario verdicts — plus where each one's OWN issue tracker contradicts its marketing."
---

# Honest Trade-off Matrix — i18n Libraries (June 2026)

> Bundle numbers from the "Definitive Guide to i18n Libraries 2026" (gundogmuseray.medium.com),
> cross-checked against each library's docs + GitHub issues. Verdicts are my own synthesis,
> anchored to the *issue-tracker reality* (ecosystem-04), not the marketing.

## The matrix

| Library | Ver | Runtime bundle (gzip) | RSC / App-Router maturity | Type-safety | Build-tool coupling | Multi-framework | TMS / AI built-in | Weekly DL |
|---|---|---|---|---|---|---|---|---|
| **next-intl** | 4.13 | **~457 B** (claimed) / ~15 KB w/ deps | **Best** (RSC-first, but `setRequestLocale` boilerplate; tree-shaking #1 unsolved) | Good (codegen `global.ts`) | None (runtime lib) | **No** (Next-only; `use-intl` core for plain React) | No | 3.83M |
| **react-i18next** | 17.0.8 | **~6 KB** | OK (needs community RSC adapters; more DIY) | Extra setup (module augmentation; OOM cliff #1883) | None | **Yes** (React/RN/Node/everywhere) | Via plugins (i18next-* connectors) | 13.6M |
| **react-intl** (FormatJS) | 10.1.13 | **~20 KB** ("largest… overkill for simple") | OK | Via `@formatjs/cli` typegen | None (but extract step) | Yes (React; `@formatjs/intl` core) | No | 3.45M |
| **Lingui** | 6.4.0 | **~2 KB** runtime (tiny) | Hard-won (#1698, macro-in-RSC awkward) | Strong (macros typed) | **HIGH** — Babel/SWC plugin REQUIRED (#1224 saga) | Yes | No | 1.35M |
| **next-international** | (stale) | small, type-safe | **Unverified for Next 16** (last push 2024-10) | **Best-by-design** (TS locale files, no augmentation) | None | No (Next) | No | small |
| **Intlayer** | 8.12.4 | **~15 KB** (vs ~31 KB next-intl, per guide) | Yes (Next 15/16 guides current) | **Strong** (per-component typed content) | Build-time (its own compiler/Vite plugin) | Yes (React/Next/Vite/RN) | **Yes — AI translate + visual edit built-in** | 72K (fast-rising) |
| **typesafe-i18n** | (2023) | **~1 KB** (smallest) | n/a | **Full TS** | None | Yes | No | small |

> **Bundle-size caveat:** these numbers are not apples-to-apples (some count only the `t()` runtime, some count the formatter + ICU parser). The guide's own "next-intl ~31 KB" (vs Intlayer ~15 KB) contradicts next-intl's "457 bytes" claim — because **457 B is the bare hook; the real cost is the ICU MessageFormat parser + the messages you ship**. *Treat all bundle claims as directional; measure in your app.* The honest ranking by *real* delivered cost: Lingui/typesafe-i18n (compile-away) < next-international < Intlayer < next-intl < react-i18next < react-intl(FormatJS).

## Per-library honest verdict (marketing vs issue-tracker reality)

### next-intl — **the default for a new Next.js product, with eyes open**
- **For:** RSC-first, fastest setup, native `Intl`/CLDR plurals (avoids the FormatJS plural-data trap), `useExtracted` AI ergonomics, official drift-free examples.
- **Against (from its OWN open issues):** (1) **ships all messages to the client by default** — tree-shaking is issue **#1, still open** (`useExtracted` only partly helps); (2) **`setRequestLocale` boilerplate** in every static page (#663, "stopgap" per maintainer, still open); (3) **parallel/intercepted routes conflict** (#255); (4) **Next 16 `cacheComponents` interaction unsettled** (#1493/#2074); (5) **single-maintainer** project (bus-factor 1 — Jan Amann). 
- **Verdict:** validates Energy's checklist default, *specifically because of RSC maturity*. Best for Next-only products that accept the bundle-bloat + setRequestLocale tax. NOT for multi-framework orgs or RN.

### react-i18next — **the safe, boring, universal choice**
- **For:** 13.6M/wk + i18next's 18.9M/wk = the ecosystem's center of gravity; works literally everywhere (React, RN, Vue, Svelte, Node, vanilla); enormous plugin ecosystem (backend connectors, ICU, language-detector, http-backend); **3 open issues on i18next** = battle-tested.
- **Against (from its OWN issues):** (1) **`<Trans>` + React 18 typing is the most-discussed pain** (#1543, 88 comments) — rich-text interpolation is fragile; (2) **type-safe keys OOM lint on big catalogs** (#1883/#1991); (3) **more boilerplate**, RSC is DIY; (4) ~6 KB heavier than next-intl.
- **Verdict:** pick when you need >1 framework, React Native, the plugin ecosystem, or maximum stability. The "nobody got fired for choosing i18next" option. The `@next` dist-tag trap applies (it's older than `@latest`).

### react-intl / FormatJS — **the ICU standards-purist**
- **For:** *the* reference ICU MessageFormat implementation; complex plural/gender/rich-text; tracks TC39 Intl + CLDR; `@formatjs/intl` core for non-React.
- **Against:** **~20 KB, "overkill for simple key-value"** (the guide's words); the classic plural-data-loading footgun (#1013, 103 reactions, `wontfix`) — though modern versions use native `Intl.PluralRules`; verbose `defineMessages` + extract/compile step.
- **Verdict:** choose for *linguistically complex* apps (many plural categories, gender, ordinals everywhere) or a multi-framework org standardizing on ICU. Overkill for a CRUD app with simple strings.

### Lingui — **the bundle-size winner, if your bundler cooperates**
- **For:** ~2 KB runtime, compile-time extraction + tree-shaking, typed macros (`t\`...\``, `<Trans>`), inline-default-message DX.
- **Against (from its OWN issues):** **build-tool coupling is the existential risk** — macros need a Babel OR SWC plugin (#1224, 86 reactions: the community begged for SWC support); a new bundler can strand you; **extract→translate→compile adds CI complexity**; v6 went **ESM-only** (#2363); RSC support was late + macro-awkward (#1698).
- **Verdict:** choose when bundle size is paramount AND your build toolchain is mainstream (Vite/Next-SWC) AND you'll maintain the extract/compile CI. Do NOT choose for a bleeding-edge/exotic bundler without confirming the plugin exists first.

### next-international — **right idea, possibly abandoned**
- **For:** TS-native locale files = end-to-end key+param type safety with **zero module-augmentation gymnastics** (solves the exact pain react-i18next/i18next have).
- **Against:** **last pushed 2024-10-31 (~20 months stale)** — predates Next 15 async params + Next 16 `cacheComponents`. Bus-factor + currency risk.
- **Verdict:** **don't default to it** in June 2026. Borrow its design idea (typed locale files). Use only after verifying Next 16 compat yourself.

### Intlayer — **the most interesting NEW entrant (watch closely)**
- **For:** per-component co-located content, **strong typing**, **built-in AI translation + visual editor**, build-time tree-shaking (~15 KB, claims ~2x lighter than next-intl), current Next 15/16 + Vite + RN guides, **pushed daily** (767★, 72K/wk and climbing — same DL ballpark as Intlayer-vs-Tolgee-react).
- **Against:** **opinionated co-located model** requires restructuring a JSON-based app; **largely single-maintainer** (bus-factor 1); **small Stack Overflow corpus** (an agent gets less training-data + community help); young (8.x but the ecosystem is new).
- **Verdict:** the one to *evaluate* if starting greenfield and you want AI-translate + tree-shaking + types in one package. Too young to be parrot's *default*, but it's where next-intl's weaknesses (bundle bloat, no built-in AI) are being directly attacked. **parrot should track Intlayer as the likely 2026-2027 challenger to next-intl.**

### typesafe-i18n — **smallest, but stale + non-standard**
- **For:** ~1 KB, full TS, zero deps.
- **Against:** **last major release 2023**, **non-standard message format** (NOT ICU — a portability/lock-in problem). 
- **Verdict:** legacy/avoid for new work; non-ICU format is disqualifying for anything that might later move to a TMS.

## Decision tree for parrot (which library to wire)
1. **Greenfield Next.js, RSC, accept bundle tax →** `next-intl@^4` *(Energy default; correct for the RSC reason)*.
2. **Multi-framework org / React Native / need plugins / max stability →** `i18next@^26` + `react-i18next@^17`.
3. **Linguistically complex (heavy plural/gender) or ICU-standard mandate →** `react-intl@^10` / `@formatjs/intl@^4`.
4. **Bundle size paramount + mainstream bundler + will own CI compile step →** `@lingui/core@^6`.
5. **Greenfield, want AI-translate + tree-shaking + types in one, OK being early →** evaluate **Intlayer**.
6. **Avoid for new work:** next-international (stale), typesafe-i18n (stale + non-ICU) — borrow their type-safety ideas only.

**The meta-verdict:** there is no "best" — there's a 2-axis choice: **(library vs platform)** and **(how many frameworks)**. Energy's next-intl default is right for *Energy's specific situation* (single-framework Next.js, RSC-heavy). parrot's job is to make that choice *deliberate and re-evaluable*, and to wire whichever one with the production triad (runtime lib + CI key-check + TMS sync) — because the library choice matters far less than having the **validate-in-CI + correct-plurals/RTL eval** discipline around it.
