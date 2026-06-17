---
title: "parrot BATTLE-TESTED-SCENARIOS — real failure/migration/production scenarios + resolutions"
type: synthesis
domain: i18n
created: 2026-06-17
updated: 2026-06-17
tags: [scenarios, golden-tasks, eval, next-intl, icu, plural, rtl, hreflang, migration, formatjs, parrot, cp123]
sources: ["brain/research/raw/ecosystem-04-github-issues-realworld-breakage.md", "brain/research/raw/ecosystem-03-docs-deepdive-loadbearing-flows.md", "brain/research/raw/ecosystem-09-agent-operating-clis-apis-mcp.md", "brain/research/raw/ecosystem-02-starter-repos.md", "brain/research/raw/ecosystem-05-tradeoff-matrix-libraries.md", "brain/research/raw/field-01-library-issues-i18next-nextintl-formatjs.md", "brain/research/raw/field-02-rtl-bidi-and-mt-quality.md", "brain/research/raw/field-03-at-scale-grammar-migration-hn-taste.md", "brain/research/raw/field-04-locale-routing-seo-hreflang.md", "brain/research/raw/field-05-disputes-and-2026-shifts.md"]
related: ["[[parrot EXPERTISE-MAP]]", "[[parrot KNOWN-PITFALLS]]", "[[parrot OPINIONS]]", "[[parrot TOOL-MATRIX]]"]
summary: "16 real, specific i18n/l10n failure/migration/production scenarios (sourced from dated GitHub issues, HN practitioner threads, migration war stories, and SEO postmortems) — each with situation, the trap, the resolution, and the eval-gate. These become golden eval tasks: a fresh parrot session should resolve each one the right way, especially the bugs invisible in English."
---

# parrot BATTLE-TESTED-SCENARIOS

> Each scenario is a real or realistic situation an i18n employee hits, drawn from the research's anti-slop
> layer (dated GitHub issues, HN practitioner threads, named migration war stories, SEO postmortems) + the
> ICU/Intl standards. Format: **Situation → The trap → Resolution → Eval gate.** The eval gate is what a
> golden task checks. These are the difference between "knows the vocabulary" and "ships a product that's
> correct in Polish, Arabic, and Hebrew — not just English."

---

## S1 — A static page renders in English on `/de/` with no error (the `setRequestLocale` footgun)

- **Situation:** A team wires next-intl on a Next.js App-Router app, sets up `[locale]/layout.tsx`, and
  enables static rendering. The German pages at `/de/...` render in English. There is **no error** in the
  build or the console. Source: `ecosystem-03` §A3; `ecosystem-04` §A (#663, 95r/41c).
- **The trap:** Assuming next-intl knows the locale during static rendering. It doesn't — Next.js renders each
  static page/layout independently and doesn't expose the active locale to RSCs during static rendering, so
  next-intl silently falls back to `defaultLocale`. The maintainer calls `setRequestLocale` a "stopgap"; it's
  pure boilerplate that's easy to forget, and forgetting it has zero error signal. Source: `ecosystem-04` §A.
- **Resolution:** Call **`setRequestLocale(locale)` at the top of every statically-rendered page AND layout**,
  after `await params` and before any `useTranslations`/`getMessages`. A parrot skill should **codegen** the
  call into every generated page; accept dynamic rendering only if you deliberately give up static gen. Source:
  `ecosystem-03` §A3.
- **Eval gate:** Given "German pages render in English, no error," the agent names `setRequestLocale`, says it
  must be in **every** static page+layout, and adds it — does NOT say "set the default locale" or "it's a
  caching bug."

## S2 — An agent generates `middleware.ts` on a Next 16 project and locale routing silently does nothing

- **Situation:** A parrot agent wires next-intl routing on a fresh Next.js 16 app, creates
  `src/middleware.ts` with `createMiddleware(routing)`, and the locale prefixes don't work — no redirects, no
  negotiation. Source: `ecosystem-03` §A1; `ecosystem-09` §E (3).
- **The trap:** **Next.js 16 renamed `middleware.ts` → `proxy.ts`.** A `middleware.ts` file on Next 16 is
  silently ignored by the framework — the agent generated a file the runtime never loads. Source:
  `ecosystem-03` §A1.
- **Resolution:** **Detect the Next.js version before generating the middleware file** — `src/proxy.ts` on
  Next 16, `src/middleware.ts` before. The next-intl docs show `proxy.ts` with the note "(formerly
  `middleware.ts` in Next.js <16)." Source: `ecosystem-03` §A1.
- **Eval gate:** On a Next-16 project, the agent generates `proxy.ts` (not `middleware.ts`) and checks the Next
  version first — and explains the rename rather than debugging the matcher.

## S3 — The Polish plural renders the wrong word for `count=2` and `count=5` (the silent CLDR-data bug)

- **Situation:** A team ships `{count, plural, =0 {...} one {...} other {# items}}` and tests it in English —
  perfect. In Polish, `count=2` and `count=5` both render the *other* form, which is grammatically wrong; a
  Polish user reports "pieroga" where it should be "pierogi"/"pierogów." No error. Source: `ecosystem-04` §B
  (FormatJS #1013, 103r); `field-01` §B (i18next #2423, 2026-04-21).
- **The trap:** Authoring only English plural categories (`one`/`other`). **Polish has 4** (one/few/many/other),
  **Arabic 6**, **Czech 3**, **Japanese 1**. With missing categories — or missing CLDR plural data — the
  renderer falls to `other` and produces wrong text, invisibly to an English-speaking dev/agent. FormatJS
  #1013 was labeled `wontfix`: "load the locale data correctly and it works." Source: `ecosystem-04` §B;
  `field-03` §B.
- **Resolution:** Author **every plural category the target language uses** (use native `Intl.PluralRules` /
  modern next-intl which auto-loads CLDR); **add a parrot eval that asserts distinct strings for count=0,1,2,5
  in `pl`/`ar`/`ru`.** This is the deepest pluralization lesson in the whole corpus — Polish is the canary.
  Source: `ecosystem-04` §B, §G; `field-01` §B.
- **Eval gate:** The agent tests plurals in a many-category language (`pl`/`ar`), authors the `few`/`many`
  categories, and refuses to declare plurals "done" from English alone.

## S4 — Migrating react-i18next → Lingui, the UI half-updates on language switch (the macro-context bug)

- **Situation:** A team (Monite, real) migrates from react-i18next to LinguiJS to get source-string-as-key DX.
  After the migration, switching the language updates *some* of the UI but leaves other strings in the old
  language. Source: `field-03` §D (Alex Batalov / Monite migration war story).
- **The trap:** The compiled Lingui **`t` macro doesn't subscribe to the `I18nProvider` context** — only
  `<Trans/>` components auto-update on a locale change. A silent "UI half-updates on language switch" bug. Plus:
  the `t` macro **can't run at module scope** ("top-level macro failure"), and SSR can render **different
  languages in different page sections**. Source: `field-03` §D.
- **Resolution:** Add **`useLingui()` hooks** in components that use `t` so they re-render on locale change;
  write a **custom ESLint rule forbidding module-scope `t`** ("easier to explicitly forbid than to spend time on
  Code Review later"); fix SSR with **per-language dynamic imports** of locale providers. Automate the bulk
  conversion with a jscodeshift codemod (the 80%) and hand-fix edge cases. **General rule: changing your i18n
  library mid-project touches every component, routing, the build pipeline, and the translation workflow** —
  one of the most painful frontend refactors; budget for it. Source: `field-03` §D.
- **Eval gate:** Given "UI half-updates after switching to Lingui," the agent names the macro-not-subscribed-to-
  context cause, prescribes `useLingui()` + an ESLint guard on module-scope `t`, and treats the migration as a
  full-component-surface refactor — not a one-line fix.

## S5 — `tsc` blows up (`TS2590`) after adding fully-typed message keys on a large catalog

- **Situation:** A team enables fully-typed `t('a.b.c')` keys with autocomplete over a 3,000-key catalog. The
  TypeScript compiler errors with `TS2590: Expression produces a union type that is too complex to represent`,
  or the type-generation hits `RangeError: Map maximum size exceeded`; ESLint OOMs. Source: `field-01` §C
  (next-intl #2314 2026-05-02, #2296 2026-03-29); `ecosystem-04` §C (i18next #1883, #1991).
- **The trap:** Believing "type all your keys for safety" scales. It was the 2024-2025 default; in 2026 it's
  **invalidated at scale** — fully-typed catalogs break `tsc` itself and OOM lint. Both next-intl and i18next
  maintainers are now proposing/steering toward a **selector API** to escape it. Source: `field-01` §C,
  §cross-library pattern; `field-05` §B (1).
- **Resolution:** For a **small app**, typed keys are fine. For a **large catalog**: use the **selector API**,
  **split namespaces into multiple files** (first-class in next-intl only since 2026, #2303), apply
  `skipLibCheck` / `KeyPrefix` typing. A parrot harness should **warn about the scaling cliff**, not blindly
  enable full key typing. Source: `field-01` §C; `ecosystem-04` §C.
- **Eval gate:** Given "tsc TS2590 after typing keys on a big catalog," the agent recommends selector API +
  namespace splitting (not "increase tsc memory"), and explains that strict-typed-keys is the wrong default at
  scale.

## S6 — `@formatjs/cli` extract goes 100x slower on Windows and the Docker build breaks on Alpine

- **Situation:** A team upgrades `@formatjs/cli` past ~6.16.x. Suddenly `formatjs extract` takes **46s+ per
  file** on the developers' Windows machines (was 0.3s) and "effectively never completes" on the full repo;
  separately, the Docker image built `FROM node:alpine` fails because there's **no native binary for musl**.
  Source: `field-01` §A (#6706 2026-06-02, #6742 2026-06-05).
- **The trap:** Assuming "`@formatjs/cli` + babel-plugin is stable" (the 2025 wisdom). FormatJS moved its
  extract/compile engine to **platform-specific native NAPI binaries** in 2026 — which shipped per-platform
  perf cliffs (invisible if CI is Linux-only), **dropped platforms** (macOS x64 / Intel Macs, Windows, Alpine/
  musl at various points), and **extract-vs-build ID divergence** (#6177/#6735 — IDs differ between
  extract-time and build-time → translations silently miss). Source: `field-01` §A; `field-05` §B (2).
- **Resolution:** **Pin `@formatjs/cli` exactly** and **test extract perf on the OS your devs actually use**
  (not just Linux CI); for the musl gap, use a glibc base image or force the JS path; **assert the extract==build
  invariant** (IDs/messages byte-identical) as a CI check, because the divergence is silent — the build passes,
  the app runs, but strings show their fallback/ID. Source: `field-01` §A.
- **Eval gate:** Given the perf cliff / Alpine break, the agent pins the CLI version, flags the native-NAPI
  rewrite as the cause, tests on the dev OS, and adds an extract==build invariant check — does NOT just bump to
  "latest."

## S7 — "We support RTL" — the strings are translated but Arabic letters are disconnected and a checkmark is mirrored

- **Situation:** A team translates all strings to Arabic, sets `dir="rtl"`, swaps `margin-left` for
  `margin-inline-start`, and ships. Arabic users report the text looks broken (letters disconnected, diacritics
  clipped), a back-arrow is correct but the **play button points backwards** and a **checkmark is mirrored**.
  Source: `field-02` §A (RTL Styling 101); `ecosystem-03` §D.
- **The trap:** Two errors. (1) "Just use logical properties and RTL is solved" is **incomplete** — and the
  team carried Latin defaults that **destroy Arabic**: `letter-spacing` disconnects connected letters,
  `line-height` truncates the *kasra*. (2) A blanket `[dir=rtl] svg { transform: scaleX(-1) }` mirrors
  **everything** — including media-player controls (tape direction, not time), symmetric symbols, and
  checkmarks, which must NOT flip. Source: `field-02` §A.
- **Resolution:** Set **`letter-spacing: 0`** for RTL content; tune `line-height` for the Arabic font's
  metrics; ship a **proper Arabic webfont** (don't rely on the OS font); **flip only directional icons**
  (nav/back/send/chevrons), **never** play/pause, symmetric symbols, or checkmarks (Material heuristic:
  "object held with the right hand → no flip"). Handle `transform`/`background-position`/`box-shadow` per `dir`
  (no logical equivalent). **RTL is a coverage problem** — add an RTL screenshot to the eval. Source: `field-02`
  §A.
- **Eval gate:** Given "RTL strings translated but Arabic looks broken + checkmark mirrored," the agent fixes
  `letter-spacing`/`line-height`/webfont AND replaces the blanket `scaleX(-1)` with selective icon mirroring
  (excluding play/pause/checkmarks) — and adds an RTL visual check.

## S8 — An English string with `<...>` in it fails the FormatJS build with `INVALID_TAG`

- **Situation:** A perfectly valid English message — `"The URL is '<Issuer URL>'/..."` — passes review, then
  the build fails with `SyntaxError: INVALID_TAG`. Source: `field-01` §A (#6593, 2026-05-20).
- **The trap:** `@formatjs/unplugin` with `flatten: true` (the **default**) drops the apostrophe-escape marker
  on tag-like substrings during the AST round-trip (`printAST(hoistSelectors(parse(...)))`); a re-parse then
  sees `<Issuer URL>` as a rich-text tag → build failure. **The default config breaks the build on valid
  English copy that happens to contain `<...>`.** ICU apostrophe-escaping is lossy through the AST. Source:
  `field-01` §A.
- **Resolution:** Be aware ICU apostrophe-escaping is **lossy through FormatJS's AST round-trip**; avoid
  `<...>`-shaped literals in messages or escape them robustly; know the same lossiness bites the French `l'`
  apostrophe (a stray apostrophe can start an escape). Test the round-trip. Source: `field-01` §A; `ecosystem-03`
  §B6.
- **Eval gate:** Given `INVALID_TAG` on valid English with `<...>`, the agent identifies the apostrophe-escape
  AST round-trip loss (not a syntax typo) and fixes the escaping — does NOT just delete the string.

## S9 — A multi-tenant SaaS needs locale in a cookie, not the URL, and next-intl fights it

- **Situation:** A multi-tenant SaaS (tenant in the subdomain) wants **no `/en/` prefix anywhere** — locale
  via cookie only — and also uses **parallel/intercepted routes** (modals-as-routes, dashboards with slots).
  next-intl's middleware-based routing breaks both. Source: `ecosystem-04` §A (#255), §E (#366, #1107);
  `ecosystem-03` §A2.
- **The trap:** Assuming next-intl's prefix-routing-first model fits every app. **#255: middleware locale
  routing conflicts with parallel (`@slot`) and intercepted (`(.)`) routes** (a real architectural
  incompatibility, not a config error). **#366: "no locale in the URL at all" was hard for a long time**
  (prefix-routing-first). Source: `ecosystem-04` §A, §E.
- **Resolution:** Use **`localePrefix: 'never'`** (cookie-only detection) — now a first-class example
  (`example-app-router-without-i18n-routing`); for parallel/intercepted routes, handle next-intl's routing
  carefully or accept it as a known sharp edge. **Document the incompatibility up front** rather than debugging
  it mid-build. Source: `ecosystem-03` §A2; `ecosystem-02` §2.
- **Eval gate:** Given a multi-tenant cookie-only requirement, the agent reaches for `localePrefix: 'never'` +
  the `-without-i18n-routing` example, and flags the parallel/intercepted-route conflict — rather than forcing
  prefix routing.

## S10 — A canonical pointing to the `.com` site deletes all the localized pages from Google

- **Situation:** A site launches `/fr/`, `/de/`, `/es/` localized pages and sets each one's `<link
  rel="canonical">` to the global `.com` homepage (a common "consolidate to the main site" reflex). Weeks later
  the localized pages vanish from Google's index. Source: `field-04` §the mistake list (4).
- **The trap:** Canonical-to-.com **consolidates away your localized pages "faster than robots.txt"** — it's
  the single most destructive i18n SEO mistake. (Compounded if canonical + hreflang are combined in one tag,
  which Google ignores.) Source: `field-04` §the mistake list (3, 4).
- **Resolution:** **Each localized page's canonical points to ITSELF**; canonical and hreflang are **separate
  elements**; every page **self-references** in its hreflang set, the graph is **reciprocal**, and there's
  exactly **one `x-default`**. Treat the hreflang set as a graph with a CI check (self-ref + bidirectional +
  valid BCP-47 + one x-default). Source: `field-04`.
- **Eval gate:** Given "localized pages disappearing from Google after setting canonical to .com," the agent
  fixes canonicals to self-reference, separates canonical from hreflang, and verifies hreflang reciprocity —
  does NOT add the pages to a sitemap and hope.

## S11 — hreflang codes "work" but the site is associated with the wrong country

- **Situation:** A team annotates `es-la` for "Latin America," `me` for "Middle East," and `en-uk` for the UK.
  Search Console shows the site associated with Laos, Montenegro, and Ukraine. Source: `field-04` §the mistake
  list (2).
- **The trap:** Wrong ISO codes are **the deadliest hreflang bug because the markup is syntactically valid** —
  search engines read codes literally. **`la` is Laos** (not Latin America), **`me` is Montenegro** (not a
  language/region for "Middle East"), **`en-uk` is wrong** — the country code is **`en-GB`** (`uk` is Ukraine).
  Source: `field-04` §the mistake list (2).
- **Resolution:** Use **BCP-47 correctly**: lowercase language, uppercase region (`en-GB`, `de-CH`, `es-419`
  for Latin America). Add a **CI check that every hreflang code is valid BCP-47.** Know the three slightly-
  different locale-code conventions (BCP-47 vs ICU-`select`-no-dashes vs hreflang) — a classic agent footgun.
  Source: `field-04`; `ecosystem-09` §E (9).
- **Eval gate:** The agent rejects `es-la`/`me`/`en-uk`, supplies the correct BCP-47 codes (`es-419`/`en-GB`),
  and adds a code-validity check — rather than trusting that "valid markup" means "correct geography."

## S12 — Auto-redirecting users by geo-IP tanks SEO and traps users in the wrong locale

- **Situation:** A team hard-redirects every visitor to a locale based on geo-IP / `Accept-Language`. Googlebot
  (crawling from the US) only ever sees the US content; users who share a `/de/` link get bounced to `/en/`;
  international rankings drop. Source: `field-04` §detection-vs-routing.
- **The trap:** Conflating **detection** (picking a locale for an undecided user) with **routing** (which URL
  serves which locale), and **hard-redirecting the crawler**. Googlebot can't index locales it's redirected
  away from; users can't reach a locale via a shared link. next-intl only shipped a *configurable* detection
  pipeline in 2026 (#2305) — before that teams hand-rolled middleware and got this wrong. Source: `field-04`;
  `field-01` §C (#2305).
- **Resolution:** **Detect to SUGGEST (a banner / a cookie preference), never hard-redirect** — especially not
  the crawler. Keep every locale reachable by URL. Source: `field-04` §detection-vs-routing.
- **Eval gate:** The agent replaces the geo-IP hard-redirect with a suggestion banner + cookie, keeps all
  locales crawlable, and explains the detection-vs-routing distinction.

## S13 — A short UI string is machine-translated wrong because it has no context

- **Situation:** A team auto-translates the whole UI with an LLM/MT. The button `"Open"` is translated as the
  *adjective* (not the verb) in several languages; a label `"fresh water"` is translated as the literal
  (drinking water) when it meant "opposite of saltwater." Source: `field-02` §B; `field-03` §E
  (@worklaptopacct, the Cities:Skylines example).
- **The trap:** Treating short UI strings as "low-risk" because the 80/20 rule says ~80% of content is MT-safe.
  **Short, isolated strings are HIGHER-risk than the portfolio average** — they lack the context MT needs to
  disambiguate (`"Open"` verb vs adjective). The 80/20 figure is for *content portfolios*, not microcopy.
  Source: `field-02` §B; `field-05` §C (2).
- **Resolution:** Give **every string a `description`/context field** (ICU + description metadata; the TMS
  carries it for human + AI translators); use a **glossary/termbase** the MT must honor; keep a **human review
  gate** (`include_unverified_translations: false`) and watch **Time-to-Edit** (fluent-but-wrong is more
  expensive than obviously-bad). NOT-safe categories: legal/medical/marketing/UGC/creative. Source: `field-02`
  §B; `field-03` §A, §E.
- **Eval gate:** Given "auto-translate the whole UI," the agent insists on a per-string context field + glossary
  + human gate, flags short strings as higher-risk, and refuses blanket context-free MT on microcopy.

## S14 — A string concatenated from fragments is untranslatable (the #1 i18n rule, violated)

- **Situation:** A dev builds a sentence as `t('youHave') + ' ' + count + ' ' + t('items') + ' ' + t('inCart')`
  to "reuse" the fragments. Translators can't produce correct grammar in any language with different word order,
  gender agreement, or plural-in-context. Source: `field-03` §B, §E (@Etheryte, HN consensus).
- **The trap:** Concatenating sentence fragments. **The single most-repeated i18n rule across every source
  (verbatim, @Etheryte):** "always always *always* write out the full sentence you want to translate and use
  the tooling to interpolate everything you want to put in it" — so the translator sees full context and can't
  shoot themselves in the foot. Fragments break word order, gender, declension, and plural agreement. Source:
  `field-03` §B, §E.
- **Resolution:** **Never concatenate — write the full sentence with ICU interpolation:** `t('cartSummary',
  {count})` where the message is `"You have {count, plural, one {# item} other {# items}} in your cart"`. One
  message per full sentence, with a context/description field. Source: `field-03` §B, §E.
- **Eval gate:** The agent refuses the concatenation, rewrites it as a single full-sentence ICU message with
  interpolation + plural, and cites the never-concatenate rule.

## S15 — A duplicate key silently overwrites a feature's strings; nobody notices for months

- **Situation:** A large app's translation JSON/YAML accumulates 50,000 keys. A dev adds `home.cta.label`
  unaware it already exists at a different nesting level; the parser **silently overwrites** the earlier one. A
  feature's button shows the wrong (or fallback) text in production; it's caught months later. Source:
  `field-03` §A (Doctolib).
- **The trap:** Trusting that the i18n file parser flags duplicates. "The YAML parser used under the hood
  silently overwrites any already-defined key" → **a duplicate key = a silently broken, untested feature.** And
  the temptation to "fix" lookup with **dynamic keys** (`t("account." + type + ".greetings")`) makes usage
  "near impossible to detect through grep." Source: `field-03` §A.
- **Resolution:** **Dup-key detection must be a build GATE** — a CI test that fails on any duplicate key + one
  preventing redefinition at the same hierarchical level (Doctolib's fix). **Keys must be grep-able** (ASCII
  letters/digits/hyphens/underscores) and **never dynamically constructed** (hardcode explicit names — trade
  flexibility for maintainability). Accept that there's **no perfect unused-key story** (static misses dynamic
  usage; runtime misses rare features). Source: `field-03` §A.
- **Eval gate:** The agent adds a dup-key CI gate, forbids dynamic key construction, and is honest that
  unused-key detection is fundamentally incomplete — does NOT promise a clean unused-key sweep.

## S16 — A team adopts MessageFormat 2 in 2026 and strands itself with no tooling

- **Situation:** A team reads that "MessageFormat 2 is the future" (gender×plural, nested selectors,
  multi-variable matching) and migrates their messages to MF2 in 2026 to be ahead of the curve. Their TMS
  can't import MF2, no framework defaults to it, and they're maintaining a custom toolchain. Source: `field-03`
  §C (Locize, May 2026); `field-05` §B (3).
- **The trap:** Mistaking spec-momentum for ecosystem-readiness. **MF2 adoption in 2026 is effectively zero:**
  `i18next-mf2` ~6-10 weekly downloads vs `i18next-icu` (MF1) ~300,000; **TC39 `Intl.MessageFormat` stuck at
  Stage 2**; **no major framework defaults to it; no TMS (Crowdin/Lokalise/Phrase) supports it; zero public
  production case studies.** A harness recommending MF2 today strands the user. Source: `field-03` §C.
- **Resolution:** **Default ICU MessageFormat 1; flag MF2 as watch-list.** Adopt MF2 *only* for a brand-new
  project with genuinely complex multi-selector (gender×plural) needs AND willingness to run without mainstream
  tooling. Verbatim (Locize): "Most teams: no, not yet" — "stay on ICU MF1, watch the inflection signals, be
  ready to migrate when the ecosystem moves." Source: `field-03` §C; `field-05` §B (3).
- **Eval gate:** Asked "should we move to MessageFormat 2 in 2026?", the agent says "not yet for most teams,"
  cites the ~zero adoption + Stage-2 + no-TMS-support, defaults to ICU MF1, and keeps MF2 on a watch-list.

---

## Coverage map (which JTBD each scenario stresses — for golden-task eval selection)

| Scenario | Primary JTBD | What it proves |
|---|---|---|
| S1 | JTBD-1 (setup) | `setRequestLocale` in every static page or wrong-locale silently |
| S2 | JTBD-1 (setup) | `proxy.ts` on Next 16 — detect framework version |
| S3 | JTBD-2 / JTBD-10 (ICU plural / eval) | author every plural category; test in `pl`/`ar` |
| S4 | JTBD-6 (migration) | Lingui macro not subscribed to context; library swap = full refactor |
| S5 | JTBD-7 (key hygiene) | typed-keys break `tsc` at scale → selector API + namespace split |
| S6 | JTBD-11 / JTBD-10 (agent ops / eval) | FormatJS native-NAPI cliffs; pin CLI; extract==build invariant |
| S7 | JTBD-4 (RTL) | logical props incomplete; selective icon mirroring; Arabic CSS |
| S8 | JTBD-2 (ICU authoring) | apostrophe-escape lossy through FormatJS AST → INVALID_TAG |
| S9 | JTBD-1 / JTBD-5 (setup / routing) | cookie-only `localePrefix: 'never'`; parallel-route conflict |
| S10 | JTBD-5 (SEO) | canonical-to-.com deletes localized pages; self-reference |
| S11 | JTBD-5 (SEO) | wrong ISO codes (la=Laos, me=Montenegro, en-uk); BCP-47 |
| S12 | JTBD-5 (SEO) | detect-to-suggest, never hard-redirect the crawler |
| S13 | JTBD-8 (MT workflow) | short strings higher-risk; per-string context + glossary + gate |
| S14 | JTBD-2 (ICU authoring) | never concatenate — full-sentence ICU interpolation |
| S15 | JTBD-7 (key hygiene) | dup-key build gate; grep-able keys; no dynamic keys |
| S16 | JTBD-2 / JTBD-12 (ICU / currency) | MF1 default; MF2 watch-list (zero 2026 adoption) |
