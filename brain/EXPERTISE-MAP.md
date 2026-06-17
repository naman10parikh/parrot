---
title: "parrot EXPERTISE-MAP — what the i18n / l10n employee must master"
type: synthesis
domain: i18n
created: 2026-06-17
updated: 2026-06-17
tags: [expertise-map, i18n, l10n, next-intl, icu, messageformat, rtl, hreflang, plural, jtbd, parrot, cp123]
sources: ["brain/research/raw/ecosystem-00-internal-references.md", "brain/research/raw/ecosystem-01-versions-and-changelogs.md", "brain/research/raw/ecosystem-02-starter-repos.md", "brain/research/raw/ecosystem-03-docs-deepdive-loadbearing-flows.md", "brain/research/raw/ecosystem-04-github-issues-realworld-breakage.md", "brain/research/raw/ecosystem-05-tradeoff-matrix-libraries.md", "brain/research/raw/ecosystem-09-agent-operating-clis-apis-mcp.md", "brain/research/raw/field-01-library-issues-i18next-nextintl-formatjs.md", "brain/research/raw/field-02-rtl-bidi-and-mt-quality.md", "brain/research/raw/field-03-at-scale-grammar-migration-hn-taste.md", "brain/research/raw/field-04-locale-routing-seo-hreflang.md", "brain/research/raw/field-05-disputes-and-2026-shifts.md"]
related: ["[[parrot BATTLE-TESTED-SCENARIOS]]", "[[parrot KNOWN-PITFALLS]]", "[[parrot OPINIONS]]", "[[parrot GAPS-AND-DISPUTES]]", "[[parrot TOOL-MATRIX]]"]
summary: "The structured map of everything the i18n / l10n employee must master, organized by job-to-be-done (not by library), each node cited to a raw source. A fresh Claude session reading brain/ should be able to route any internationalization task and know what 'good' looks like across the 80% English-only devs never see."
---

# parrot EXPERTISE-MAP

> Organized by **job-to-be-done**, not by library. A fresh Claude session reading `brain/` should be able to
> route any i18n / l10n task to the right node and know what "good" looks like. Every node cites its raw
> source. Companion files: scenarios → [[parrot BATTLE-TESTED-SCENARIOS]]; gotchas → [[parrot KNOWN-PITFALLS]];
> taste → [[parrot OPINIONS]]; unknowns → [[parrot GAPS-AND-DISPUTES]]; tools → [[parrot TOOL-MATRIX]].

## The boundary parrot holds first (i18n plumbing vs content authoring) — place EVERY task here before doing anything

The whole localization space splits into **i18n/l10n plumbing** (the code + tooling that makes an app render
correctly in any locale: message catalogs, ICU, plurals, RTL, locale routing, hreflang, font fallback, the
TMS sync) and **content authoring** (writing the actual marketing/docs/blog copy, the editorial voice, the
human translation craft). **parrot owns the plumbing; it does NOT own content authoring.** A localized product
needs both, but parrot is an *operational* employee — it wires a cross-cutting concern, it doesn't write the
words. Source: mission boundary; `ecosystem-00` §interpretation for parrot.

- **Route to parrot** when the task is: *wire next-intl/i18next on this Next.js app · author the ICU
  plural/select message · fix the `pl`/`ar` plural that renders wrong · make the layout work in RTL · set up
  locale routing + hreflang · pin `next/font` per-script fallbacks · stand up the key-completeness CI check ·
  drive the TMS sync (Crowdin/Lokalise/Tolgee/Lingo.dev) · decide which i18n library to wire and prove it.*
  Source: mission boundary; `ecosystem-09` §F (the 12-component blueprint).
- **Keep OUT of parrot** when the task is: *write the French marketing landing page copy · decide the brand
  voice in German · do the actual human translation of long-form prose · edit the blog post for tone.* That's
  content authoring — a different employee / a human translator. parrot wires the *pipeline that carries* those
  strings and gates their *correctness*, it doesn't compose them. Source: mission boundary §4.
- **The one-line handoff rule (memorize):** "parrot = the pipes + the grammar engine + the routing + the CI
  gate; content authoring = the words that flow through the pipes." When the task becomes "write better copy,"
  it's not parrot's. Source: mission boundary.
- **Energy home:** the Energy harness checklist classifies **i18n / localization as C2 operational infra**
  (alongside Sentry, secrets, queues, rate-limiting), marked **GAP — when international**. parrot IS the
  employee that closes that gap. The recurring chairman framing — **"painful to retrofit late"** — is the
  single most important strategic claim parrot owns; filter every finding through "does this make day-1 wiring
  cheap, or does it document the retrofit pain?" Source: `ecosystem-00` §1 (checklist lines 83/360-362/402).

---

## JTBD-1 — "Wire i18n into a (Next.js) product correctly the first time (the setup job)"

The bread-and-butter. The job: get message catalogs, locale routing, and rendering working — and not trip the
four Next-era footguns that make pages silently render the wrong language with no error.

- **1.1 Know the 4 load-bearing next-intl files (the canonical App-Router wiring):** (1) the middleware —
  **`src/proxy.ts` on Next 16** (formerly `middleware.ts`); (2) `src/i18n/routing.ts` (`defineRouting` with
  `locales`/`defaultLocale`/`localePrefix`); (3) the `[locale]/layout.tsx` (`generateStaticParams` +
  `setRequestLocale` + `NextIntlClientProvider`); (4) `src/i18n/navigation.ts` (`createNavigation` — import
  `Link`/`redirect`/`useRouter` from *here*, never from `next/link`, or you lose locale-prefixing). Source:
  `ecosystem-03` §A.
- **1.2 The #1 setup footgun: `setRequestLocale` in EVERY static page + layout, or it silently renders the
  default locale.** Next.js renders each static page/layout independently and doesn't expose the active locale
  to RSCs during static rendering, so next-intl needs the locale handed to it explicitly. Forgetting it = no
  error, just wrong-language pages. It's the most-reacted next-intl issue (#663, 95r) and the maintainer calls
  it a "stopgap." A parrot skill should **codegen the `setRequestLocale` call into every generated page** and a
  parrot eval should assert it's present. Source: `ecosystem-03` §A3; `ecosystem-04` §A (#663).
- **1.3 The #2 setup footgun: `params` is a `Promise` on Next 15+ — `await params`.** Miss it → type error /
  runtime crash. The `[locale]` layout/page signature is `params: Promise<{locale: string}>`. Source:
  `ecosystem-03` §A3; `ecosystem-09` §E (4).
- **1.4 The #3 setup footgun: detect the Next.js version before generating the middleware file.** `proxy.ts`
  on Next 16, `middleware.ts` before. An agent generating `middleware.ts` on a Next-16 project produces a file
  the framework silently ignores. Source: `ecosystem-03` §A1; `ecosystem-09` §E (3).
- **1.5 Pick the `localePrefix` strategy deliberately:** `'always'` (every locale prefixed — cleanest),
  `'as-needed'` (default locale unprefixed — most common for SEO), `'never'` (cookie-only, no locale in URL —
  the multi-tenant / "no `/en/` prefix" case, issue #366). Per-domain override exists since next-intl v4.10.0.
  Source: `ecosystem-03` §A2.
- **1.6 Use the right hook per environment:** `useTranslations('ns')` (client hook) vs `getTranslations('ns')`
  (async, Server Component). Using the wrong one in the wrong environment is a common error. Translations
  outside React components are deliberately restricted to **Server Actions, Metadata, Route Handlers** — an
  agent fighting this is fighting the library's design. Source: `ecosystem-03` §E.
- **1.7 Start from a current, drift-free reference, not a blog tutorial.** The production triad lives in
  `ixartz/Next-js-Boilerplate` (next-intl + `crowdin.yml` + `i18n-check` CI). The official `amannn/next-intl`
  `examples/` dir (esp. `-extracted`, `-migration`, `-without-i18n-routing`) is the highest-trust, lowest-drift
  source of working code — maintained in lockstep with releases. Source: `ecosystem-02` §1, §2.

## JTBD-2 — "Author messages in ICU MessageFormat correctly (the grammar-engine job)"

The actual i18n "language." Both next-intl AND react-intl/FormatJS use **ICU MessageFormat** (Unicode
standard) — learn it once, it transfers across all three. This is where most "it works in English, broke in
Polish" bugs live. Full grammar trap list in [[parrot KNOWN-PITFALLS]].

- **2.1 Cardinal plural is the load-bearing construct — and the silent-failure machine.** Syntax:
  `{count, plural, =0 {no followers} =1 {one follower} other {# followers}}`. `#` = the auto-formatted number;
  `=N` exact match beats category tags. The 6 category tags are **`zero` `one` `two` `few` `many` `other`**
  (`other` is the required fallback). **The critical fact: you must author a translation for every category the
  target language uses, or the renderer falls to `other` and produces grammatically wrong text** — with NO
  error. English has 2 forms; Chinese 1; Polish 4 (one/few/many/other); **Arabic [removed]** (zero/one/two/few/many/
  other). Source: `ecosystem-03` §B2; `ecosystem-04` §B.
- **2.2 The deepest pluralization lesson in the whole corpus: languages with >2 plural categories will render
  the WRONG form if CLDR plural data isn't loaded — invisibly to an English speaker.** The FormatJS landmark
  bug (#1013, 103r, `wontfix`): Polish value `2` gave the *few* form via `FormattedPlural` but the *other* form
  via `FormattedMessage` — same number, two categories, one wrong, because the locale's CLDR data wasn't loaded.
  Modern next-intl uses native `Intl.PluralRules` (auto-loads CLDR in evergreen runtimes), which avoids it —
  but the *lesson* persists: **an agent that tests only in English ships broken Slavic/Arabic plurals.** A
  parrot eval MUST assert distinct strings for count=0,1,2,5 in `pl`/`ar`/`ru`. Source: `ecosystem-04` §B;
  `field-01` §B (#2423).
- **2.3 Ordinal plural is separate from cardinal:** `{year, selectordinal, one {#st} two {#nd} few {#rd} other
  {#th}}` → English 1st/2nd/3rd/4th (4 forms). `=N` overrides. Source: `ecosystem-03` §B3.
- **2.4 Select maps an enum to a label (gender, status):** `{gender, select, female {She} male {He} other
  {They}}`. `other` required. Source: `ecosystem-03` §B4.
- **2.5 The dash trap: ICU value names + `select` values are alphanumeric + underscore only — NO dashes.**
  Mapping a *locale* into a `select` requires `locale.replaceAll('-', '_')` first (`en-GB` → `en_GB`). Source:
  `ecosystem-03` §B1, §B4; `ecosystem-09` §E (9).
- **2.6 The apostrophe-escape trap: wrap literal braces in single quotes (`'{name}'`), but a stray apostrophe
  in prose (French `l'`) can accidentally start an escape** — a classic ICU bug in apostrophe-heavy languages.
  The same lossiness bites FormatJS's AST round-trip (#6593: valid English with `<...>` → `INVALID_TAG` build
  failure). Source: `ecosystem-03` §B6; `field-01` §A (#6593).
- **2.7 Number/date/time skeletons (`::` syntax):** `{key, number, ::currency/GBP compact-short}`,
  `{n, number, ::.00}`, `{d, date, medium}`, `{t, time, short}`. Prefer next-intl's `useFormatter()` + named
  formats in config over inline skeletons for reuse. Source: `ecosystem-03` §B5.
- **2.8 The grammar traps beyond plural (the stuff English-only devs never see):** **multiple plurals in one
  sentence** (`{a} apples and {b} oranges` = two independent axes — needs nested/compound ICU); **gender
  agreement** (many languages gender the verb/adjective, not just the pronoun); **list formatting** (use
  `Intl.ListFormat`, NEVER string-join `", "` + `" and "` — separators/conjunctions/Oxford comma vary);
  **declensions/cases** (Slavic/Finnish: the same noun changes form by grammatical case — often unsolvable by
  interpolation, the translator must restructure). Source: `field-03` §B.

## JTBD-3 — "Use the native Intl API for everything CLDR already knows (the formatting job)"

The browser/runtime ships CLDR-correct formatting for free via the `Intl` namespace. Hand-rolling any of this
is a bug factory. parrot reaches for native `Intl` before any library helper.

- **3.1 `Intl.PluralRules`** — resolves the correct plural *category* for a locale + number (the CLDR engine
  modern next-intl delegates to). This is *why* native-`Intl` libraries avoid the FormatJS plural-data trap.
  Source: `ecosystem-03` §B; `ecosystem-04` §B.
- **3.2 `Intl.NumberFormat`** — currency, percent, units, compact, sign-display, and **numbering systems**
  (Latin `012` vs Arabic-Indic `٠١٢` vs Bengali). The numbering system is locale-load-bearing and easy to get
  wrong (see 3.6). Source: `ecosystem-03` §B5; `field-02` §A (numerals).
- **3.3 `Intl.DateTimeFormat`** — calendars, time zones, era/region display. (FormatJS bug #6767/#6794: the
  *polyfill* path ignores `numberingSystem`, giving wrong digits exactly for the Arabic/Persian/Bengali users
  who need the polyfill on older devices.) Source: `field-01` §A (#6767).
- **3.4 `Intl.ListFormat`** — locale-correct list joining (conjunction/disjunction/unit). The fix for the
  "Alice, Bob, and Charlie" trap. Source: `field-03` §B.
- **3.5 `Intl.DisplayNames`** — localized language/region/currency/script display names (next-intl exposes this
  via `useFormatter().displayName` since v4.11.0). Source: `ecosystem-01` §2 (v4.11.0).
- **3.6 One numbering system per interface.** Mixing Eastern-Arabic numerals (٠١٢) with Latin (012) in one UI
  "looks unprofessional"; pick one and apply it consistently — and know the polyfill can betray you even when
  you choose correctly (3.3). Source: `field-02` §A (numerals).

## JTBD-4 — "Make RTL actually work (the bidi + layout job, not the 'translate the strings' job)"

The hard 2/3 of internationalization. **"Translate the strings" is the easy 1/3 of RTL; the layout +
typography + bidi-algorithm is where it breaks, per-component, and English-only/single-line testing has ZERO
coverage of it.** The docs spell out 3 requirements; the field intel adds the gotchas the "just use logical
properties" advice misses. Source: `ecosystem-03` §D; `field-02` §A.

- **4.1 The 3 things "proper RTL" requires (verbatim from next-intl docs):** (1) the **`dir` attribute** —
  `<html dir={rtl ? 'rtl' : 'ltr'}>`, set from the active locale; (2) **layout mirroring via CSS logical
  properties** (`margin-inline-start` not `margin-left`); (3) **element mirroring** — flip directional icons
  (back-arrows, chevrons). Source: `ecosystem-03` §D.
- **4.2 "Just use logical properties and RTL is solved" is INCOMPLETE.** These have no logical form and must be
  hand-handled per `dir`: **`transform`** (a sliding/arrow animation needs a manual `scaleX(-1)` or
  dir-conditional transform — there is no `transform-inline`); **`background-position`** (swap images / override);
  **`box-shadow`** (not logical — inset shadows must be hand-flipped); **`border-radius` logical forms
  (`border-start-end-radius`) lack Safari support** → keep physical fallbacks. Source: `field-02` §A.
- **4.3 Physical CSS that silently destroys Arabic:** **`letter-spacing`** disconnects connected Arabic letters
  (set `letter-spacing: 0` for RTL — the most common Latin default carried blindly into Arabic); **`word-break`**
  is semantically invalid (connected letters mustn't break mid-word); **text opacity/RGBa** causes rendering
  artifacts between letters (use solid colors); **`text-decoration: underline`** overlaps Arabic letter dots
  (`text-decoration-skip-ink` helps but lacks Safari support → inset-box-shadow fallback); **`line-height`**
  truncates diacritics like the *kasra* (only visible with real multi-line content). Source: `field-02` §A.
- **4.4 Bidirectional text isolation — the hardest class, and it hits LTR apps the moment they show user data.**
  Mixed LTR+RTL in one element renders in the wrong order ("English text in Arabic context displays backwards");
  ellipsis truncates from the wrong end. Fix: `dir="auto"` per run, Unicode isolates (LRI/RLI/PDI), or LRM/RLM
  marks. Source: `field-02` §A.
- **4.5 Icon mirroring — flip SOME, never ALL.** FLIP: nav/breadcrumb arrows, menu toggles, send buttons,
  search/clear icons, close buttons, tab arrows, card image/text ordering. **DO NOT FLIP: media-player controls
  (play/pause — they represent tape direction, not time), objects held in the right hand, symmetric symbols,
  checkmarks/warnings.** The classic bug is `[dir=rtl] svg { transform: scaleX(-1) }` as a blanket rule →
  mirrored checkmarks + a backwards play button. Material heuristic: "if an icon represents an object held with
  the right hand, it doesn't need flipping." Source: `field-02` §A.
- **4.6 RTL reverses widgets, not just text.** Sliders, range inputs, progress bars get reversed; logical
  properties even support vertical scripts (Traditional Mongolian) "automagically." Source: `field-03` §E
  (@scriptsmith, @yorwba).
- **4.7 The RTL meta-lesson (verbatim, RTL Styling 101):** "RTL bugs are almost always the result of one or two
  physical properties that were missed, or one animation that was never tested in the other direction." → **RTL
  failure is a *coverage* problem, not a *knowledge* problem.** A parrot eval must assert `dir` is set + logical
  props are used + at least one RTL-rendered screenshot. Source: `field-02` §A.

## JTBD-5 — "Get locale routing + hreflang SEO right (the international-SEO job)"

Where i18n meets discoverability. i18n SEO failure is almost always (a) a *reciprocity/consistency* bug in the
hreflang graph, or (b) a *canonical pointing away from the localized page* — both silent, both delete or
mis-rank your localized content. **Treat the hreflang set as a graph with a CI check.** Source: `field-04`.

- **5.1 hreflang must be reciprocal.** If page A links to B, B must link back to A or Google ignores the
  annotation entirely — the #1 hreflang bug. Every page must also **self-reference** (list itself in its
  hreflang set) and there must be exactly one **`x-default`** (or Google guesses which version to show
  unspecified markets). Source: `field-04` §the mistake list (1, 5, 6).
- **5.2 Wrong ISO codes are the deadliest bug because the site "works."** `es-la` → people mean "Latin
  America" but **`la` is Laos**; `me` is **Montenegro**, not "Middle East"; **`en-uk` is wrong — the country
  code is `en-GB`** (`uk` is Ukraine). Search engines read codes literally → wrong-geography association. Use
  BCP-47: lowercase language, uppercase region (`en-US`, `de-CH`). Source: `field-04` §the mistake list (2).
- **5.3 The single most destructive SEO mistake: canonical pointing to the global/.com site.** It consolidates
  away your localized pages "faster than robots.txt" — you delete your own localized pages from the index.
  **Each localized page's canonical must point to itself.** And canonical + hreflang must be **separate
  elements** (combining them in one tag is ignored). Source: `field-04` §the mistake list (3, 4).
- **5.4 hreflang is per-page, not homepage-only.** Google doesn't extrapolate to subpages — every localized
  page needs its own annotation. One element per URL (no `hreflang="es-ES;fr;fr-BE"` lists). Source: `field-04`
  §the mistake list (7, 8).
- **5.5 URL-structure default for startups: subdirectories** (`example.com/fr/`) — they inherit the root
  domain's authority. ccTLDs (`example.fr`) require building per-country authority from scratch; subdomains sit
  between and are treated as more separate. Verbatim: "Choose subdirectories by default, add an x-default, keep
  self-referencing canonicals per language." Source: `field-04` §URL structure.
- **5.6 Detection ≠ routing — and auto-redirecting the crawler hurts SEO.** *Routing* = which URL serves which
  locale (the SEO concern). *Detection* = picking a locale for an undecided user (Accept-Language, cookie,
  geo-IP). **Detect to SUGGEST (banner/cookie), never hard-redirect the crawler** (Googlebot crawls from US →
  only sees US content; users can't reach other locales via a shared link). next-intl only shipped a
  *configurable* detection pipeline in 2026 (#2305). Source: `field-04` §detection-vs-routing.
- **5.7 The library can introduce drift you didn't write.** next-intl #2334 (`Link` emits *wrong* alternate
  slugs) and #2332 (locale switch broken under `output: 'export'`) are exactly the "URL drift between locales"
  failure — verify the generated alternates, don't assume the routing wrapper is correct. Source: `field-04`
  §the mistake list (10); `field-01` §C (#2334, #2332).

## JTBD-6 — "Pick the i18n library deliberately (and prove it), not by inertia (the selection job)"

parrot produces a **decision with the honest cost**, not a feature table. The library choice matters far less
than having the validate-in-CI + correct-plurals/RTL eval discipline around it. Full matrix in
[[parrot TOOL-MATRIX]].

- **6.1 Default to `next-intl@^4` for a new Next.js product — specifically for the RSC reason.** It's the
  most RSC-mature OSS option (i18next-via-react-i18next needs community RSC adapters; Lingui's RSC path was
  hard-won + macro-awkward — #1698). This validates Energy's checklist default, but for the *RSC maturity*
  reason, not generically. Accept the two known costs: ships all messages to the client (tree-shaking is issue
  #1, still open) + the `setRequestLocale` boilerplate. Source: `ecosystem-05` §verdict; `ecosystem-04` §A.
- **6.2 Reach for `i18next@^26` + `react-i18next@^17` for multi-framework / React Native / plugin-ecosystem /
  max stability.** Together = ~32.6M weekly downloads, the ecosystem's gravitational center; works everywhere;
  huge plugin ecosystem (backend connectors, ICU, language-detector). 3 open issues on an 18.9M/wk package =
  battle-tested. The "nobody got fired for choosing i18next" option. Source: `ecosystem-01` §1; `ecosystem-05`
  §verdict.
- **6.3 Reach for `react-intl@^10` / `@formatjs/intl@^4` for linguistically complex apps or an ICU-standard
  mandate** (heavy plural/gender/ordinal everywhere, multi-framework org standardizing on ICU). It's the
  reference ICU implementation; overkill for a CRUD app with simple strings (~20 KB). Source: `ecosystem-05`
  §verdict.
- **6.4 Reach for `@lingui/core@^6` when bundle size is paramount AND your bundler is mainstream AND you'll own
  the extract/compile CI.** ~2 KB runtime, compile-time extraction. **Its power is its existential risk: macros
  need a Babel OR SWC plugin** (#1224, 86r) — a bleeding-edge bundler can strand you; verify the plugin exists
  first. Source: `ecosystem-05` §verdict; `ecosystem-04` §D.
- **6.5 Track Intlayer as the likely 2026-2027 challenger; don't default to it yet.** It attacks next-intl's
  exact weaknesses (built-in AI translate + visual editor + build-time tree-shaking + per-component typed
  content) but is young, opinionated (co-located model requires restructuring a JSON app), largely
  single-maintainer, and has a small Stack Overflow corpus (less agent training-data + community help).
  Evaluate it greenfield; don't bet a product on it. Source: `ecosystem-05` §Intlayer.
- **6.6 Avoid for new work: `next-international` (stale — last push 2024-10, predates Next 15 async params / Next
  16 `cacheComponents`) and `typesafe-i18n` (stale since 2023 + NON-ICU message format = lock-in).** Borrow
  their TS-native-locale-files design idea only. Source: `ecosystem-05` §verdicts; `ecosystem-02` §4.
- **6.7 The meta-verdict: there is no "best" — it's a 2-axis choice (library-vs-platform × how-many-frameworks).**
  Energy's next-intl default is right for *Energy's* situation (single-framework Next.js, RSC-heavy). parrot's
  job is to make the choice *deliberate and re-evaluable*, and to wire whichever one with the production triad
  (runtime lib + CI key-check + TMS sync). Source: `ecosystem-05` §meta-verdict.

## JTBD-7 — "Manage translation files + keys at scale without sprawl (the key-hygiene job)"

The discipline that separates a 50-string toy from a 50,000-string product. At scale, **grep-ability and
dup-detection beat cleverness** — every "dynamic key" convenience is a future tooling blind spot. Source:
`field-03` §A.

- **7.1 Keys must be grep-able: ASCII letters, digits, hyphens, underscores only.** Readability + reliable
  static search depend on it (Doctolib's hard rule). next-intl's namespace separator is `.` and keys themselves
  can't contain `.`. Source: `field-03` §A; `ecosystem-03` §E.
- **7.2 NEVER construct keys dynamically.** `I18n.t("account.#{type}.greetings")` makes it "near impossible to
  detect through grep" which keys are used. **Hardcode explicit key names** — trade flexibility for
  maintainability. This is the same conclusion behind i18next's `enableSelector` + next-intl's `useExtracted`
  static-analysis direction. Source: `field-03` §A.
- **7.3 Duplicate-key detection must be a build GATE, not a hope.** The YAML/JSON parser "silently overwrites
  any already-defined key" → a dup key = a silently broken, untested feature. Write a CI test that fails on any
  duplicate key + one preventing redefinition at the same hierarchical level. Source: `field-03` §A.
- **7.4 There is NO perfect unused-key story** (a genuine limitation, feeds GAPS). Static extraction misses
  dynamic usage; runtime tracking (logging accessed keys to Redis/localStorage) misses rarely-hit features —
  Doctolib admits "we can't be 100% sure all of our features are even used." Don't promise a clean unused-key
  sweep. Source: `field-03` §A.
- **7.5 Splitting messages across files + selector APIs are the 2026 answers to scale.** First-class
  multi-file message support only landed in next-intl in 2026 (#2303); before it, the single-giant-JSON
  assumption fed the TS2590 type explosion. Split namespaces early on a large app. Source: `field-01` §C
  (#2303, #2314).
- **7.6 The 2026 shift: strict-typed keys break at scale.** "Type all your translation keys" was the 2024-2025
  default; in 2026 it's invalidated for large catalogs — fully-typed keys break `tsc` itself (next-intl #2314
  `TS2590`, #2296 `RangeError: Map maximum size exceeded`; i18next #1883 ESLint OOM, #1991 slow typecheck).
  **Both maintainers now steer toward a selector API for large catalogs.** Small app → typed keys fine; large
  app → selector required. A parrot harness should warn about this, not blindly enable full key typing. Source:
  `field-01` §C, §cross-library pattern; `ecosystem-04` §C.

## JTBD-8 — "Run the machine-translation + TMS pipeline safely (the localization-workflow job)"

The bridge from "the code is i18n-ready" to "the strings are actually translated." The 2026-correct stance:
**MT for the low-risk 80%, gated by a glossary/termbase + a Time-to-Edit-aware human review for the high-risk
20%, with privacy-compliant routing.** A harness that pipes strings to an LLM and ships is the failure mode
the whole industry is now warning against. Source: `field-02` §B; `field-05`.

- **8.1 The 80/20 line (the practical answer):** ~80% of a content portfolio (general comms, standard docs,
  support content) is near-human-quality from 2026 AI systems; the remaining ~20% — **regulated (legal/medical/
  compliance), client-facing high-stakes, marketing/brand, creative/literary, user-generated (slang/typos/
  sarcasm)** — still needs human expertise. Source: `field-02` §B.
- **8.2 Short UI strings are HIGHER-risk than the portfolio average** (parrot's load-bearing inference). An
  isolated key like `"Open"` has no context → MT can't tell verb from adjective; `"fresh water"` shipped as the
  wrong literal in Cities:Skylines because the translator had no domain context. **Every string needs a
  `description`/context field** — a bare string is ambiguous. This is the strongest argument for ICU +
  description metadata and against context-free MT on microcopy. Source: `field-02` §B; `field-03` §E
  (@worklaptopacct).
- **8.3 The MT failure modes to name in any harness:** **terminology drift** (fix: a glossary/termbase the MT
  must honor — non-negotiable for product strings); **brand-voice erosion**; **compliance/privacy leakage**
  (route through ZDR/no-train infra for sensitive material); **context loss**; **hallucination** (2026 stacks
  add hallucination detection). Source: `field-02` §B.
- **8.4 The metric that matters in 2026 is Time-to-Edit (TTE), not "fluency."** TTE = how long a professional
  needs to raise an MT segment to human quality; "apparent speed gains disappear in review" when TTE is high.
  Fluent-but-subtly-wrong output is *more* expensive than obviously-bad output, because reviewers trust it.
  Source: `field-02` §B.
- **8.5 Machine-translated strings NEVER reach production unverified.** Doctolib ships MT with
  `include_unverified_translations: false` — auto-MT fills the gap, a human gate releases it. "AI for speed,
  humans for precision." Source: `field-03` §A; `field-02` §B.
- **8.6 The 2026 enterprise consensus: platforms over models.** "95% of enterprises prioritize platforms over
  models" — the workflow/governance layer (TMS, glossary, review gating, routing) matters more than which raw
  LLM you pick; multi-engine routing by language/domain is the default (reduces risk + avoids lock-in). Source:
  `field-02` §B; `field-05` §B (6).
- **8.7 The TMS choice: managed (Crowdin/Lokalise) vs OSS self-host (Tolgee) vs AI-native CLI (Lingo.dev).**
  Crowdin CLI dominates (241K/wk) but is **Java** (needs a JRE — fails in a bare Node sandbox); Lokalise's
  `lokalise2` is a Go binary (no JRE); Tolgee is self-hostable with in-context translation (alt-click any string
  to edit); Lingo.dev is the most agent-native (AI-translate-in-CI + lockfile, releases daily — pin exactly).
  Source: `ecosystem-09` §C; `ecosystem-01` §1.

## JTBD-9 — "Keep the Energy brand type stack working across non-Latin scripts (the design-bridge job)"

The load-bearing taste finding that connects parrot's domain to Energy's design rules. **The Energy brand fonts
do NOT cover non-Latin scripts** — font subsetting + per-script fallback stacks are a first-class i18n concern,
not a design afterthought. Source: `ecosystem-00` §2.

- **9.1 The exact coverage gap:** **Instrument Serif is Latin-only** (basic Latin + a little Latin-ext);
  **Poppins covers Devanagari + Latin** (so Hindi/Marathi are OK) but has **NO** CJK, Arabic, Cyrillic-display,
  Thai, or Hebrew coverage. The moment the product ships `ar/he/ja/ko/zh/th`, the Energy brand type stack
  silently falls back to the OS default for those locales — breaking the "no AI-slop" brand promise *specifically
  in the localized markets*. Source: `ecosystem-00` §2.
- **9.2 The fix: wire `next/font` per-script fallbacks at the same time as message catalogs.** `next/font`
  auto-subsets by `subsets:` — but you must declare *every* script you intend to render or glyphs ship missing.
  Pair the brand fonts with Noto Sans `<script>` / Noto Serif `<script>` fallback stacks per locale. A correct
  parrot harness wires localized font fallbacks + RTL `dir` switching + message catalogs together. Source:
  `ecosystem-00` §2.
- **9.3 Ship a proper webfont for RTL/CJK — don't rely on the user's system font.** System-default fonts
  degrade RTL readability (the RTL-101 example: poor font + bold + tight dot spacing makes Arabic hard to read).
  Source: `field-02` §A (font selection).
- **9.4 This is a parrot skill (`i18n-font-fallback`), not a design ticket.** It's the place parrot's domain
  (i18n) meets Energy's `design.md` rules — own it as the bridge. Source: `ecosystem-00` §2; `ecosystem-09` §F.

## JTBD-10 — "Validate i18n correctness in CI (the eval/gate job — THE differentiator)"

The single most-copyable idea in the whole starter space: **a key-completeness linter + a plural/RTL/format
eval that fails the build.** It turns "did we forget to translate this?" and "is the Polish plural wrong?" from
production incidents into red CI checks. **An eval suite that probes only English is testing the easy 80% and
shipping the broken 20% — which, for i18n, is the entire point of the feature in non-English markets.** Source:
`ecosystem-02` §1; `ecosystem-04` §G; `ecosystem-09` §F.

- **10.1 Key-completeness check (the table-stakes gate):** `@lingual/i18n-check` —
  `i18n-check -l src/locales -s en -u src -f next-intl` — fails the build if a key is used in source but missing
  from a locale, or defined but unused. The ixartz pattern; the missing fourth leg of Energy's checklist (which
  names next-intl + Crowdin but not the CI linter). Source: `ecosystem-02` §1; `ecosystem-09` §C.
- **10.2 Plural correctness in a many-category language (the differentiator):** assert
  `{count, plural, ...}` produces *distinct* strings for count=0,1,2,5 in `pl`/`ar`/`ru` — the FormatJS #1013 /
  i18next #2423 class of bug that's invisible in English. Source: `ecosystem-04` §B, §G; `field-01` §B.
- **10.3 RTL correctness:** assert `dir="rtl"` is set from the locale + logical CSS properties are used (no
  bare `margin-left`) + at least one RTL-rendered screenshot for visual confirmation. RTL is a coverage problem
  — the eval IS the coverage. Source: `field-02` §A; `ecosystem-09` §F.
- **10.4 Format correctness across locales:** currency/date/number render correctly (Intl-backed) in a sample
  of locales including a non-Latin-numbering one. Source: `ecosystem-03` §B5; `field-02` §A.
- **10.5 Font-glyph coverage per script:** assert every declared script has a font that covers it (the JTBD-9
  gap as a check). Source: `ecosystem-00` §2.
- **10.6 The extract==build invariant (FormatJS-specific):** if you use FormatJS, assert the extract pipeline
  and the build pipeline produce byte-identical IDs/messages — divergence (#6177, #6735) means strings show
  their fallback/ID instead of the translation, silently. Source: `field-01` §A.
- **10.7 setRequestLocale presence + Next-version-correct middleware** (JTBD-1) belong in the eval too — assert
  every static page calls `setRequestLocale` and the middleware file matches the Next version. Source:
  `ecosystem-04` §A; `ecosystem-09` §F.

## JTBD-11 — "Operate the i18n pipeline as an AGENT (CLIs, MCP, CI), and know the non-obvious rules"

i18n is unusually agent-friendly because the whole workflow (extract → validate → translate → sync → verify) is
**plain files an agent can read/write + CLIs/MCP an agent can call** — not a UI. parrot should lean on existing
CLIs/MCP rather than hand-rolling. Source: `ecosystem-09` §A.

- **11.1 The file pipeline (every step is scriptable):** (1) **extract** strings from source (CLI/macro/
  `useExtracted`); (2) **validate** every key in every locale (CI linter); (3) **translate** missing keys
  (LLM CLI or TMS MT); (4) **sync** catalogs to/from a TMS (CLI); (5) **verify** plural/RTL/format correctness
  (eval). Source: `ecosystem-09` §A.
- **11.2 The scriptable CLIs (deterministic, CI-native, no LLM):** `@lingual/i18n-check` (key linter),
  `@formatjs/cli` (`extract`/`compile`), `@lingui/cli` (`extract`/`compile`), `@crowdin/cli` (Java),
  `lokalise2` (Go), `lingo.dev` (Node, AI-translate, pin exactly), `@tolgee/cli` (push/pull/extract). Source:
  `ecosystem-09` §C.
- **11.3 MCP servers: prefer a TMS's official MCP if hosted; lean on the community code-side MCP for the
  developer loop.** As of mid-2026 major TMSes (Crowdin/Lokalise/Phrase/Tolgee/Locize/SimpleLocalize/Smartling)
  ship official MCP servers — **verify per-vendor at adoption time** (maturity varies). For the repo-side loop,
  `gtrias/i18next-mcp-server` has the right tool surface (`scan_code_for_missing_keys`, `coverage_report`,
  `add_translation_key`) but is low-star / mid-2025-stale — treat as "vendor a fork / verify it runs," and
  consider parrot owning a small i18n MCP itself. Source: `ecosystem-09` §B.
- **11.4 The CI-native dream loop (with its sharp edges):** PR opened → `i18n-check` (deterministic gate) →
  `lingo.dev i18n` (LLM fills gaps) → commit / open translation PR → i18n eval (plural+RTL+format). **Sharp
  edge: the auto-PR flow has GitHub-Actions-permission failures** (lingo.dev #334 — default `GITHUB_TOKEN`
  can't push/open PRs from a forked-PR context) — wire `permissions: contents: write, pull-requests: write` +
  handle the fork case. Source: `ecosystem-09` §D.
- **11.5 The non-obvious rules an agent MUST know:** (1) middleware is **`proxy.ts` on Next 16**; (2) `params`
  is a **Promise** on Next 15+; (3) **`setRequestLocale` in every static page** or wrong-locale silently; (4)
  **plural/RTL bugs are invisible in English** — eval in a many-plural + an RTL language; (5) `t.raw` +
  `dangerouslySetInnerHTML` = **XSS** (sanitize); (6) **Crowdin CLI needs a JRE**; (7) **`react-i18next@next` /
  `react-intl@next` are OLDER than `@latest`** — never `npm i pkg@next` to "get newest" (it downgrades); (8)
  next-intl ships **anonymous telemetry** (disable for privacy-sensitive products); (9) three slightly-different
  locale-code conventions — BCP-47 (`zh-Hans`), ICU `select` (no dashes → `en_GB`), hreflang (`en-us`). Source:
  `ecosystem-09` §E; `ecosystem-03` §C.
- **11.6 The 12-component harness blueprint (parrot's own scaffold):** **skills/** — `i18n-setup`,
  `i18n-extract`, `i18n-rtl-audit`, `i18n-font-fallback`; **tools/** — wrappers over `i18n-check`/`formatjs
  extract`/`lingo.dev`/Crowdin/Lokalise (CLI-anything); **.mcp.json** — own a small i18n MCP (borrow the gtrias
  surface) + optionally proxy a TMS MCP; **eval/** — the JTBD-10 differentiator; **hooks/** — pre-commit block
  on hardcoded user-facing strings; **dispatch/** — the CI PR-translate loop with the GH-Actions-permission fix
  baked in. Source: `ecosystem-09` §F.

## JTBD-12 — "Know the canonical references + what 2026 invalidated (the currency job)"

The artifacts a parrot agent reads to become dangerous, plus the explicit list of 2025 wisdom that 2026 broke
— so parrot doesn't advise from stale knowledge. Source: `ecosystem-02`; `field-05` §B.

- **12.1 The production reference = `ixartz/Next-js-Boilerplate`** (12,980★, pushed monthly) — lift the
  next-intl + `crowdin.yml` + `i18n-check` CI triad wholesale; its stack (Next App+Pages, Tailwind 4, Clerk,
  Drizzle) ≈ Energy's, so its choices transfer. Source: `ecosystem-02` §1.
- **12.2 The drift-free code source = official `amannn/next-intl` `examples/`** (esp. `-extracted`,
  `-migration`, `-without-i18n-routing`) — maintained in lockstep with releases, unlike blog tutorials. The
  i18next equivalent = `i18next/next-app-dir-i18next-example-ts`. Source: `ecosystem-02` §2, §3.
- **12.3 The signal that the libraries themselves are going agent-native:** next-intl issue #2297 is literally
  titled "Skill.md file for AI agents?" — the maintainer community is asking for agent-consumable docs. This is
  parrot's reason to exist, validated from inside the ecosystem. Source: `field-01` §C (#2297).
- **12.4 What 2026 invalidated (the currency checklist — flag if you catch yourself advising any of these):**
  (1) "type all your keys" → **broken at scale** (selector APIs); (2) "`@formatjs/cli` + babel-plugin is stable"
  → **invalidated** (native NAPI rewrite → perf cliffs, dropped platforms, extract-vs-build divergence);
  (3) "MessageFormat 2 is the future, plan your migration" → **premature** (~6-10 weekly downloads vs ICU MF1's
  ~300k; TC39 stuck at Stage 2; no TMS support); (4) "i18next `defaultValue_<plural>`/`saveMissingPlurals` to
  seed JSON" → **being deprecated** (maintainer calls it "pre-CLDR-era legacy"); (5) "just use CSS logical
  properties and RTL is solved" → **incomplete**; (6) "AI translation is good enough, automate everything" →
  **refined to 80/20 + governance.** Source: `field-05` §B.

---

## How to use this map (the routing reflex)

1. **Place the task on the i18n-plumbing↔content-authoring boundary first** (the top section). If it's writing
   the actual copy/voice, it's not parrot's — hand it off and stop.
2. **Route to a JTBD node**, read its sub-points, and check [[parrot KNOWN-PITFALLS]] for the version-specific
   gotcha before acting (esp. the Next-version + plural + RTL traps).
3. **For any "which library / which TMS" question, produce a decision with the honest cost** ([[parrot
   TOOL-MATRIX]] + [[parrot OPINIONS]]) — never a feature checklist. The discipline (CI gate + eval) matters
   more than the library.
4. **For any correctness claim, test in a many-plural language (`pl`/`ar`) AND an RTL language (`he`/`ar`)** —
   never declare i18n "done" from English alone (JTBD-10).
5. **When sources disagree, read [[parrot GAPS-AND-DISPUTES]]** for the resolved stance + the open question
   (JSON-vs-PO, opaque-keys-vs-source-as-key, typed-vs-selector, MT-safe-by-default, which-library).
