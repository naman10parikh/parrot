---
title: "parrot KNOWN-PITFALLS — version-specific gotchas with detection + avoidance"
type: synthesis
domain: i18n
created: 2026-06-17
updated: 2026-06-17
tags: [pitfalls, gotchas, next-intl, i18next, formatjs, lingui, icu, rtl, hreflang, crowdin, parrot, cp123]
sources: ["brain/research/raw/ecosystem-03-docs-deepdive-loadbearing-flows.md", "brain/research/raw/ecosystem-04-github-issues-realworld-breakage.md", "brain/research/raw/ecosystem-09-agent-operating-clis-apis-mcp.md", "brain/research/raw/ecosystem-01-versions-and-changelogs.md", "brain/research/raw/ecosystem-05-tradeoff-matrix-libraries.md", "brain/research/raw/field-01-library-issues-i18next-nextintl-formatjs.md", "brain/research/raw/field-02-rtl-bidi-and-mt-quality.md", "brain/research/raw/field-03-at-scale-grammar-migration-hn-taste.md", "brain/research/raw/field-04-locale-routing-seo-hreflang.md", "brain/research/raw/field-05-disputes-and-2026-shifts.md"]
related: ["[[parrot EXPERTISE-MAP]]", "[[parrot BATTLE-TESTED-SCENARIOS]]", "[[parrot OPINIONS]]", "[[parrot TOOL-MATRIX]]"]
summary: "The gotcha list — version-specific and dated where possible, each with a DETECT signal and an AVOID rule. These are the traps that ship wrong-language pages, break builds, or fail in non-English markets invisibly. Sourced from dated GitHub issues, library docs, and practitioner field intel as of June 2026."
---

# parrot KNOWN-PITFALLS

> Each pitfall: **what breaks → how to DETECT it → how to AVOID it**, dated/versioned where the research gives
> it. The ones marked ⚠️CURRENT-BUG are live open issues as of June 2026 — re-check before relying on the
> affected surface. The recurring theme: **the worst i18n bugs are invisible in English.** Cross-ref scenarios
> in [[parrot BATTLE-TESTED-SCENARIOS]].

---

## Setup / Next.js-era pitfalls (next-intl App Router)

### P1 — Forgetting `setRequestLocale` in a static page → it silently renders the DEFAULT locale (no error)
- **Breaks:** A statically-rendered page/layout that doesn't call `setRequestLocale(locale)` renders in
  `defaultLocale` regardless of the URL — with **no build or runtime error**. (next-intl #663, 95r/41c, OPEN
  since 2023-11-24; maintainer calls it a "stopgap.") Source: `ecosystem-03` §A3; `ecosystem-04` §A.
- **Detect:** `/de/...` pages render in English; the page is statically rendered; no `setRequestLocale` call at
  the top of the page/layout.
- **Avoid:** Call **`setRequestLocale(locale)` in EVERY static page AND layout** (after `await params`, before
  any `useTranslations`/`getMessages`). Codegen it into every generated page; eval-assert its presence.

### P2 — Generating `middleware.ts` on Next 16 (the file is silently ignored)
- **Breaks:** Next.js 16 **renamed `middleware.ts` → `proxy.ts`.** A `middleware.ts` on Next 16 is never loaded
  — locale routing/negotiation silently does nothing. Source: `ecosystem-03` §A1; `ecosystem-09` §E (3).
- **Detect:** No locale prefixing/redirects on a Next-16 app; the routing file is named `middleware.ts`.
- **Avoid:** **Detect the Next version first** — `src/proxy.ts` on Next 16, `src/middleware.ts` before.

### P3 — Not `await`-ing `params` on Next 15+ (`params` is a Promise)
- **Breaks:** `[locale]` layouts/pages receive `params: Promise<{locale}>` on Next 15+; using it without
  `await` is a type error / runtime crash. Source: `ecosystem-03` §A3; `ecosystem-09` §E (4).
- **Detect:** Type error on `params.locale`; or a runtime crash reading `locale` off a Promise.
- **Avoid:** `const {locale} = await params;` in every `[locale]` page/layout.

### P4 — `npm i react-i18next@next` / `react-intl@next` DOWNGRADES you (the dist-tag trap)
- **Breaks:** For both `react-i18next` and `react-intl`, the `@next` dist-tag points to an **OLDER alpha** than
  `@latest` (`react-i18next@next`=10.0.0-alpha vs `@latest` 17.x; `react-intl@next`=5.0.4-alpha vs `@latest`
  10.x). An agent running `pkg@next` to "get the newest" silently downgrades. Source: `ecosystem-01` §3;
  `ecosystem-09` §E (2).
- **Detect:** Installed version is *lower* than the published `latest` after using `@next`.
- **Avoid:** **Resolve the actual semver; never trust the `@next` tag name.** Pin `react-i18next@^17` /
  `react-intl@^10`.

### P5 — ⚠️CURRENT-BUG: typed message keys break `tsc` (`TS2590`) / OOM lint at scale
- **Breaks:** Fully-typed `t('a.b.c')` over a large catalog blows up the compiler: `TS2590: Expression
  produces a union type that is too complex to represent` (next-intl #2314, 2026-05-02, OPEN); `RangeError: Map
  maximum size exceeded` on type-gen (next-intl #2296, 2026-03-29); ESLint "JavaScript heap out of memory"
  (i18next #1883); slow typecheck (i18next #1991). Source: `field-01` §C; `ecosystem-04` §C.
- **Detect:** `tsc` errors `TS2590` / Map-size `RangeError`, or ESLint OOMs, after enabling typed keys on a
  catalog with thousands of keys.
- **Avoid:** Small app → typed keys are fine. Large catalog → **selector API** + **split namespaces into
  multiple files** (first-class in next-intl only since 2026, #2303) + `skipLibCheck`/`KeyPrefix`. Warn about
  the cliff; don't blindly enable full key typing.

## ICU MessageFormat / grammar pitfalls (the bugs invisible in English)

### P6 — Authoring only English plural categories → wrong text in Polish/Arabic/Russian (silent)
- **Breaks:** `{count, plural, one {...} other {...}}` covers English's 2 forms but renders the *other* form
  (grammatically wrong) for the missing categories in languages with more — **Polish 4** (one/few/many/other),
  **Arabic 6** (zero/one/two/few/many/other), **Czech 3**. No error. (FormatJS #1013, 103r, `wontfix`; i18next
  #2423, 2026-04-21 — `pl` only, `_other` missing while `_one` worked.) Source: `ecosystem-04` §B; `field-01`
  §B; `field-03` §B.
- **Detect:** Plurals look right in English; a `pl`/`ar`/`ru` reviewer reports wrong word forms for count=2/5;
  missing CLDR plural data falls back to English categories.
- **Avoid:** Author **every plural category the target language uses**; use native `Intl.PluralRules` / modern
  next-intl (auto-loads CLDR). **Eval-assert distinct strings for count=0,1,2,5 in `pl`/`ar`/`ru`.** Polish is
  the canary.

### P7 — Dashes in ICU `select`/value names break the message
- **Breaks:** ICU value names + `select` values are **alphanumeric+underscore only** — a dash (`en-GB`) is
  invalid, so mapping a *locale* into a `select` fails. Source: `ecosystem-03` §B1, §B4; `ecosystem-09` §E (9).
- **Detect:** An ICU parse error on a `select` whose values are locale codes with dashes.
- **Avoid:** `locale.replaceAll('-', '_')` first (`en-GB` → `en_GB`) before using a locale in a `select`.

### P8 — A stray apostrophe (French `l'`) accidentally starts an ICU escape
- **Breaks:** ICU escapes literal braces with single quotes (`'{name}'`); a normal apostrophe in prose
  (French `l'`, English `it's`) can accidentally begin/end an escape and mangle the message. The same lossiness
  fails FormatJS builds (#6593: valid English with `<...>` → `INVALID_TAG`). Source: `ecosystem-03` §B6;
  `field-01` §A.
- **Detect:** Apostrophe-heavy languages render with missing/extra braces; FormatJS build throws `INVALID_TAG`
  on copy containing `<...>`.
- **Avoid:** Escape robustly; avoid `<...>`-shaped literals; test the message round-trip in apostrophe-heavy
  locales. Know ICU apostrophe-escaping is **lossy through FormatJS's AST round-trip**.

### P9 — Concatenating sentence fragments (the #1 i18n anti-pattern)
- **Breaks:** Building a sentence from `t('a') + count + t('b')` produces ungrammatical output in any language
  with different word order, gender agreement, declension, or plural-in-context. Source: `field-03` §B, §E.
- **Detect:** Translatable strings are sentence fragments; `+` concatenation around `t()` calls.
- **Avoid:** **Never concatenate — write the full sentence with ICU interpolation** (verbatim @Etheryte:
  "always always *always* write out the full sentence ... use the tooling to interpolate"). One message per
  full sentence + a context field. This is the single most-repeated i18n rule.

### P10 — String-joining lists instead of `Intl.ListFormat`
- **Breaks:** `arr.join(', ')` + `' and '` hardcodes English list grammar — separators, conjunctions, and the
  Oxford comma all vary by locale. Source: `field-03` §B.
- **Detect:** Manual `", "` / `" and "` joining of a localized list.
- **Avoid:** Use **`Intl.ListFormat`** (conjunction/disjunction/unit) — never string-join.

## RTL / bidi pitfalls (the hard 2/3 of i18n)

### P11 — "Just use logical properties and RTL is solved" (it's INCOMPLETE)
- **Breaks:** `transform`, `background-position`, `box-shadow` have **no logical equivalent**; `border-radius`
  logical forms (`border-start-end-radius`) lack Safari support. Swapping `margin-left`→`margin-inline-start`
  alone leaves animations, background images, and shadows un-mirrored in RTL. Source: `field-02` §A; `field-05`
  §B (5).
- **Detect:** RTL layout mostly mirrors but a slide animation / background image / inset shadow points the
  wrong way; Safari shows wrong corner radii.
- **Avoid:** Hand-handle `transform` (`scaleX(-1)` or dir-conditional), `background-position`, `box-shadow` per
  `dir`; keep physical `border-radius` fallbacks for Safari. RTL is a **coverage** problem — add an RTL
  screenshot to the eval.

### P12 — A blanket `[dir=rtl] svg { transform: scaleX(-1) }` mirrors play buttons + checkmarks
- **Breaks:** Flipping ALL icons mirrors things that must NOT flip — **media-player controls** (play/pause
  represent tape direction, not time), symmetric symbols, **checkmarks/warnings**. Source: `field-02` §A;
  `field-03` §E.
- **Detect:** A backwards play button or a mirrored checkmark in RTL.
- **Avoid:** **Flip only directional icons** (nav/back/breadcrumb/send/chevrons/search-clear/close/tab);
  **never** play/pause, symmetric symbols, or objects "held in the right hand" (Material heuristic).

### P13 — Latin-default CSS destroys Arabic (`letter-spacing`, `word-break`, opacity, underline, `line-height`)
- **Breaks:** `letter-spacing` **disconnects** connected Arabic letters; `word-break` is semantically invalid;
  text opacity/RGBa causes artifacts between letters; `text-decoration: underline` overlaps letter dots;
  `line-height` truncates diacritics (the *kasra*). Source: `field-02` §A.
- **Detect:** Arabic text looks "broken" — disconnected letters, clipped diacritics, discolored gaps; only
  visible with real Arabic content (and multi-line for `line-height`).
- **Avoid:** **`letter-spacing: 0`** for RTL; avoid `word-break`; solid text colors (no opacity); for
  underlines use `text-decoration-skip-ink` (lacks Safari → inset-box-shadow fallback); tune `line-height` to
  the Arabic font's metrics.

### P14 — Mixed LTR+RTL renders backwards without per-run `dir` (bidi isolation)
- **Breaks:** English embedded in Arabic context "displays backwards"; ellipsis truncates from the wrong end —
  the bidi algorithm needs explicit direction per run. Hits **LTR apps too** the moment they show user data.
  Source: `field-02` §A.
- **Detect:** A mixed-direction string renders in the wrong order; truncation from the wrong side.
- **Avoid:** `dir="auto"` per run, Unicode isolates (LRI/RLI/PDI), or LRM/RLM marks. Pick **one numbering
  system per interface** (don't mix ٠١٢ and 012).

## Locale-routing / SEO pitfalls

### P15 — Canonical pointing to the global `.com` site DELETES your localized pages from the index
- **Breaks:** Setting a localized page's `canonical` to the `.com` homepage **consolidates away the localized
  pages "faster than robots.txt"** — the single most destructive i18n SEO mistake. Source: `field-04` §the
  mistake list (4).
- **Detect:** Localized pages dropping out of Google's index; canonical not self-referencing; canonical +
  hreflang combined in one tag (ignored).
- **Avoid:** **Each localized page's canonical points to ITSELF**; canonical and hreflang are **separate
  elements**.

### P16 — Wrong/invalid hreflang ISO codes (`la`=Laos, `me`=Montenegro, `en-uk`)
- **Breaks:** Codes are read literally — `es-la` associates with **Laos** (not Latin America), `me` with
  **Montenegro**, `en-uk` is **wrong** (the country code is `en-GB`; `uk` is Ukraine). Markup is valid, geography
  is wrong. Source: `field-04` §the mistake list (2).
- **Detect:** Search Console shows the wrong country association; hreflang codes that "look" right but aren't
  BCP-47.
- **Avoid:** **BCP-47**: lowercase language, uppercase region (`en-GB`, `es-419`, `de-CH`). **CI-check every
  code is valid BCP-47.** Mind the 3 conventions (BCP-47 vs ICU-`select`-no-dashes vs hreflang).

### P17 — Non-reciprocal / homepage-only / missing-x-default hreflang (Google ignores it)
- **Breaks:** If A links to B but B doesn't link back, Google **ignores the annotation**; homepage-only
  hreflang doesn't extrapolate to subpages; a missing `x-default` makes Google guess for unspecified markets;
  multiple codes in one tag don't work. Source: `field-04` §the mistake list (1, 5, 6, 7, 8).
- **Detect:** "non-self-referencing" / "no return tags" errors in Search Console; hreflang only on the homepage.
- **Avoid:** Treat the hreflang set as a **graph with a CI check**: every node **self-references**, every edge
  is **bidirectional**, exactly **one `x-default`**, one element per URL, on **every** localized page.

### P18 — Hard-redirecting users/crawlers by geo-IP/Accept-Language (tanks SEO, traps users)
- **Breaks:** Auto-redirecting on geo-IP means Googlebot (US) only sees US content; users can't reach a locale
  via a shared link. Source: `field-04` §detection-vs-routing.
- **Detect:** A middleware that 30x-redirects based on geo-IP/`Accept-Language`; locales unreachable by URL.
- **Avoid:** **Detect to SUGGEST (banner/cookie), never hard-redirect — especially not the crawler.** Keep
  every locale reachable by URL. (next-intl detection became configurable only in 2026, #2305.)

### P19 — Trusting the routing library's generated alternate slugs (it can introduce drift)
- **Breaks:** next-intl `Link` emitted **wrong alternate slugs** (#2334, 2026-05-21) and **broke locale
  switching under `output: 'export'`** (#2332) — the library introduces the exact "URL drift between locales"
  that breaks the hreflang graph, even when you wrote it correctly. Source: `field-01` §C; `field-04` §the
  mistake list (10).
- **Detect:** Generated `<link rel="alternate">` slugs don't match the actual localized URLs; locale switch
  fails on a statically-exported site.
- **Avoid:** **Verify the generated alternates** (don't assume the routing wrapper is correct); avoid
  `output: 'export'` + i18n routing or test it explicitly per release.

## TMS / machine-translation / agent-operator pitfalls

### P20 — Crowdin CLI fails in a bare Node sandbox (it's a Java jar — needs a JRE)
- **Breaks:** `@crowdin/cli` (4.14.3) is a **wrapper around a Java jar**; on a fresh agent sandbox with only
  Node, `crowdin` fails with no JRE. Source: `ecosystem-09` §C; `ecosystem-01` §1.
- **Detect:** `crowdin` errors about a missing Java runtime in a Node-only environment.
- **Avoid:** **Provision a JRE before choosing Crowdin**, or prefer **Lokalise (`lokalise2`, Go binary)** /
  **Lingo.dev (Node)** in constrained sandboxes.

### P21 — Not pinning Lingo.dev exactly (0.x, releases DAILY)
- **Breaks:** `lingo.dev` is still pre-1.0 after 18 months and releases **almost daily** (0.136.1 → 0.137.0
  inside one week of June 2026) with no stability guarantee; a `^`-range pulls a breaking change overnight.
  Source: `ecosystem-01` §1; `ecosystem-09` §C.
- **Detect:** CI behavior changes between runs with no code change; `lingo.dev` resolved to a newer 0.x.
- **Avoid:** **Pin exactly** — `lingo.dev@0.137.0`, never `^`. (Its `beta`/`next` tags also LAG `latest`.)

### P22 — ⚠️CURRENT-BUG: Lingo.dev auto-PR fails from a forked-PR GitHub Action (permissions)
- **Breaks:** The "AI translates in CI and opens a PR" flow hits **GitHub-Actions-permission failures** on
  PR-triggered runs — the default `GITHUB_TOKEN` can't push/open PRs from a forked-PR context. (lingo.dev #334.)
  Source: `ecosystem-09` §D; `ecosystem-04` §F.
- **Detect:** The translation auto-PR step errors with a permissions/error-state on PRs (esp. from forks).
- **Avoid:** Wire **`permissions: contents: write, pull-requests: write`** and **handle the forked-PR case**
  (e.g., run on `pull_request_target` carefully, or commit to a branch instead of opening a cross-fork PR).

### P23 — Auto-translating short UI strings (they're HIGHER-risk than the 80/20 average)
- **Breaks:** Context-free MT mistranslates short, isolated strings — `"Open"` as adjective not verb;
  `"fresh water"` as drinking water not opposite-of-saltwater (Cities:Skylines shipped the wrong literal). The
  80/20 "MT-safe" figure is for *content portfolios*, not microcopy. Source: `field-02` §B; `field-03` §E.
- **Detect:** Short button/label strings sent to MT with no context; verb/adjective ambiguity in the output.
- **Avoid:** Give **every string a `description`/context field**; use a **glossary/termbase** the MT must
  honor; treat microcopy as higher-risk than the portfolio average.

### P24 — Shipping machine translation to production without a human gate (and ignoring TTE)
- **Breaks:** Piping strings to an LLM and shipping is the failure mode the whole industry warns against —
  terminology drift, brand-voice erosion, hallucination, compliance leakage. Fluent-but-subtly-wrong is **more**
  expensive than obviously-bad because reviewers trust it (high **Time-to-Edit**). Source: `field-02` §B;
  `field-05` §A (DISPUTE 4), §B (6).
- **Detect:** No human review gate; MT released straight to prod; no glossary; sensitive content through a
  train-on-data provider.
- **Avoid:** **MT never reaches prod unverified** (`include_unverified_translations: false`); gate the
  high-risk 20% (legal/medical/marketing/UGC/creative) with TTE-aware human review; route sensitive content
  through **ZDR/no-train** infra. Platforms over models; multi-engine routing.

## Build-tooling / library pitfalls

### P25 — ⚠️CURRENT-BUG: `@formatjs/cli` native-NAPI rewrite — perf cliffs, dropped platforms, extract≠build
- **Breaks:** FormatJS moved extract/compile to **platform-specific native NAPI binaries** in 2026 →
  `formatjs extract` **~100x slower on Windows** (#6706, 2026-06-02: 0.3s→46s+/file), **no binary for Alpine/
  musl** (#6742, breaks `FROM node:alpine`), **dropped macOS x64/Windows** at points (#6603/#6602/#6583), and
  **extract-vs-build ID divergence** (#6177/#6735 — IDs differ between extract-time and build-time → strings
  silently show their fallback/ID). Source: `field-01` §A; `field-05` §B (2).
- **Detect:** Extract is glacial on Windows / never completes; Docker build fails on Alpine; a chunk of strings
  show their key/fallback instead of the translation though the build passed.
- **Avoid:** **Pin `@formatjs/cli` exactly**; test extract perf on the **dev OS** (not just Linux CI); use a
  glibc base image or `--extract-source-location` to force the JS path for musl/custom-ID schemes; **assert the
  extract==build invariant** (byte-identical IDs/messages) as a CI check.

### P26 — Lingui's compile-time macros stranded by a bundler change (build-tool coupling)
- **Breaks:** Lingui's macros need a **Babel OR SWC plugin** (#1224, 86r — the community begged for SWC
  support); a new/exotic bundler with no Lingui plugin strands you. v6 also went **ESM-only** (#2363). Source:
  `ecosystem-04` §D; `ecosystem-05` §Lingui.
- **Detect:** Lingui macros not transforming under your bundler; CommonJS consumers breaking after v6.
- **Avoid:** **Verify the Lingui plugin exists for your bundler FIRST**; prefer a runtime library
  (next-intl/i18next, no transpiler coupling) for unusual toolchains.

## Design-bridge pitfalls

### P27 — Undeclared script in `next/font` `subsets:` → glyphs ship missing
- **Breaks:** `next/font` auto-subsets by `subsets:` — but you must declare **every** script you render or the
  glyphs ship missing (empty boxes/tofu) for that locale. Source: `ecosystem-00` §2.
- **Detect:** Missing glyphs / tofu boxes in a localized market; the script isn't in `subsets:`.
- **Avoid:** Declare every script you intend to render; pair brand fonts with Noto Sans/Serif `<script>`
  fallback stacks.

### P28 — Energy brand fonts silently fall back to the OS default in localized markets
- **Breaks:** **Instrument Serif is Latin-only**; **Poppins covers Devanagari+Latin** but has **no** CJK/
  Arabic/Cyrillic-display/Thai/Hebrew. Shipping `ar/he/ja/ko/zh/th` silently falls back to the OS font — breaking
  the "no AI-slop" brand promise *specifically in the localized markets*. Source: `ecosystem-00` §2; `field-02`
  §A.
- **Detect:** Non-Latin locales render in a system font, not the brand font; RTL readability degrades.
- **Avoid:** Wire **per-script fallback stacks** (Noto Sans/Serif `<script>`) behind the brand fonts +
  `dir` switching at the same time as message catalogs — own it as the `i18n-font-fallback` skill, not a design
  afterthought.

---

## Boundary pitfall (the one that wastes the most time)

### P29 — parrot wandering into content authoring (or vice-versa)
- **Breaks:** parrot starts writing the actual French marketing copy / deciding the German brand voice / doing
  the human translation of long-form prose — that's **content authoring**, not i18n plumbing; or a content
  author tries to wire the ICU/routing/CI themselves. Source: mission boundary; `ecosystem-00` §interpretation.
- **Detect:** The task is "write better copy / choose the tone / translate the blog post," not "wire the
  pipeline / fix the plural / gate correctness."
- **Avoid:** **Place every task on the i18n-plumbing↔content-authoring line first.** Content authoring → hand
  off and stop. parrot keeps the *pipes + grammar engine + routing + CI gate*: catalogs, ICU, plurals, RTL,
  hreflang, font fallback, TMS sync, the eval — not the words that flow through them.
