---
title: "Field Intel: Disputes (both sides verbatim) + what 2026 invalidated from 2025"
type: synthesis
created: "2026-06-17"
updated: "2026-06-17"
tags: [i18n, field-intelligence, disputes, gaps, 2026-shifts, opinions]
sources: ["aggregated from field-01..04; see inline URLs"]
summary: "Where credible i18n sources DISAGREE — captured both sides — to feed GAPS-AND-DISPUTES, plus the explicit list of 2025 conventional wisdom that 2026 invalidated. Three things this researcher could NOT confirm are flagged."
---

# Field Intel: Disputes + 2026 shifts

## A. Live disputes (both sides, for GAPS-AND-DISPUTES)

### Dispute 1 — JSON vs Gettext PO as the translation file format
- **PO camp (Lingui/Monite, [Alex Batalov](https://medium.com/@radist2s/one-command-one-day-multiple-languages-our-migration-from-react-i18next-to-linguijs-4b07ac73a9bb)):**
  source-string-as-key + PO is superior because *"industry translation services inherently understand this
  format"* and PO carries comments/context/usage natively; bridges *"proven methods of the past and today's
  modern development needs."*
- **JSON camp ([better-i18n](https://better-i18n.com/en/blog/json-translation-files/), most web stacks):** *"For
  most web applications built in React, Vue, Angular, or Svelte, JSON is the practical default"* — native to JS,
  *"a diff in a pull request shows exactly which strings changed, which were added, and which were removed"*
  (git-friendliness), hierarchical organization.
- **Status:** genuine, unresolved. Converters exist both ways (`i18next-conv`, `json2po`), so it's not strictly
  either/or. **The real axis is: does your *TMS* prefer PO and do you value translator-facing comments (→ PO) vs
  do you value git-diff clarity and JS-native simplicity (→ JSON)?**

### Dispute 2 — Opaque keys (`home.cta.button`) vs source-string-as-key (`t`Sign up``)
- **Opaque-key camp (i18next/next-intl default):** stable IDs survive copy edits (changing English copy doesn't
  change the key), and namespacing organizes large catalogs.
- **Source-as-key camp (Lingui/FormatJS auto-id):** *"the string ... is both the key and the default message"* →
  zero context-lookup, devs read meaning inline. **But** editing the English source *changes the key* → orphans
  every translation unless tooling reconciles (FormatJS uses content-hash IDs to mitigate).
- **Status:** unresolved; the two biggest libs sit on opposite sides. Doctolib (opaque keys) and Monite
  (source-as-key) both ship at scale. Trade stability-of-IDs against context-at-call-site.

### Dispute 3 — Fully-typed keys vs selector API at scale
- **Typed-keys camp (the 2024-2025 default):** autocomplete + compile-time safety over the whole catalog.
- **Selector camp (BOTH maintainers now, 2026):** typed keys **break `tsc`** at scale — next-intl
  [#2314](https://github.com/amannn/next-intl/issues/2314) (`TS2590` type explosion),
  [#2296](https://github.com/amannn/next-intl/issues/2296) (`RangeError: Map maximum size exceeded`); i18next
  [#2429](https://github.com/i18next/i18next/issues/2429) `enableSelector`. **Resolved-ish:** both maintainers
  are steering toward selectors for large catalogs. The dispute is now "small app (typed is fine) vs large app
  (selector required)."

### Dispute 4 — Is AI/machine translation safe to ship by default? (the sharpest 2026 dispute)
- **"Ticking time bomb" camp (pro translation industry — Pronto, ASTA):** [Joshua B. Cohen, Pronto](https://www.fortune.com/press-releases/pronto-translations-ai-translation-gaps-human-translators-2026-01-07):
  *"AI has become a powerful tool in our workflow, but it cannot replace professional linguists ... AI for speed
  and humans for precision."* ASTA framed AI-only translation as *"a ticking time bomb"* citing
  *"financial, legal, and reputational damage."*
- **"Acceptable risk for indies" camp (TMS vendors):** Crowdin positions AI translation as suitable *"for indie
  developers, small teams, and any project that can accept a small risk of less-than-perfect translations in
  exchange for faster turnaround and reduced costs."*
- **Synthesis (Translated/Crowdin 2026 surveys, field-02):** the *middle* won — **~80% of content is safe for
  MT, ~20% (legal/medical/marketing/UGC/creative) is not**, gated by glossary + Time-to-Edit-aware human review.
  The dispute is really about *where you draw the 80/20 line for YOUR content* and whether short context-free UI
  strings count as "low-risk" (this researcher's read: they're *higher* risk than they look, per the HN
  "fresh water vs sweet water" example — short strings lack the context MT needs).

### Dispute 5 — Which React/Next library in 2026 (bundle vs ecosystem vs Next-native)
- **next-intl:** *"the obvious choice"* for new Next.js (App Router/RSC/middleware native), best DX.
- **Lingui:** ~**3KB** gzipped (compiler strips macros, zero runtime), *"best for performance purists with
  compile-time guarantees"* — but needs a Babel/SWC plugin + build step.
- **i18next/react-intl:** ~**25KB** (i18next+react-i18next core) but the *"extensive ecosystem and mature
  runtime"* + most TMS integrations — the enterprise default.
- **New lighter entrants (Paraglide, Intlayer):** claimed **6-10× lighter** than i18next/next-intl.
  *Source:* [Intlayer benchmark](https://intlayer.org/en-GB/doc/benchmark/nextjs) — **but this is a vendor
  publishing its own benchmark (conflict of interest; treat the multiplier skeptically).**
- **Status:** no consensus. Bundle-size-purist → Lingui/Paraglide; Next-native DX → next-intl; ecosystem/TMS
  breadth → i18next.

---

## B. What 2026 invalidated from 2025 conventional wisdom (currency check)

1. **"Type all your translation keys for safety."** → **Invalidated at scale.** Fully-typed catalogs break
   `tsc` (TS2590, Map-size RangeError). Both i18next and next-intl shipped/proposed **selector APIs** in 2026 to
   escape it. (field-01)
2. **"Use `@formatjs/cli` + babel-plugin-formatjs, it's stable."** → **Invalidated.** formatjs moved to
   **native NAPI binaries** in 2026 → perf cliffs (100× slower on Windows), dropped platforms (macOS-x64,
   Alpine/musl), and extract-vs-build divergence. Migrating off the Babel plugin silently changes escaping/entity
   handling. (field-01)
3. **"MessageFormat 2 is the future, plan your migration."** → **Premature for 2026.** MF2 adoption is
   ~6-10 weekly downloads vs ICU MF1's ~300k; TC39 stuck at Stage 2; no TMS support; zero production case
   studies. Locize verdict: *"Most teams: no, not yet."* (field-03)
4. **"i18next `defaultValue_<plural>` / `saveMissingPlurals` to seed JSON."** → **Being deprecated.** Maintainer
   @jamuhl calls them *"pre-CLDR-era legacy"*; 2026 direction is static extraction (i18next-cli) or raw-key
   `saveMissing`. (field-01 #2428)
5. **"Just use CSS logical properties and RTL is solved."** → **Incomplete.** No logical equivalent for
   `transform`, `background-position`, `box-shadow`; `border-radius` logical forms lack Safari support; bidi
   isolation, numbering systems, and icon-mirroring are *separate* problems logical properties don't touch.
   (field-02)
6. **"AI translation is good enough now, automate everything."** → **Invalidated/refined.** 2026 consensus is
   80% MT / 20% human, gated by glossary + Time-to-Edit; *"95% of enterprises prioritize platforms over models"*
   — the governance layer matters more than the raw model. (field-02, field-05)

---

## C. Things this researcher could NOT confirm (flag for GAPS-AND-DISPUTES)

1. **A single named, public *company* postmortem of a hardcoded-string/i18n disaster** (with incident writeup +
   $ impact). Found abundant *guides* describing the disaster pattern and *practitioner anecdotes* (German
   Oblivion abbreviations, Apple macOS truncation, Cities:Skylines "fresh water"), and library-issue repros, but
   no formal blameless-postmortem doc I could cite by company name. The pattern is real and well-attested; a
   clean canonical "incident report" was not locatable in <6-month sources.
2. **Quantitative MT quality numbers for *short UI strings* specifically** (BLEU/COMET/Time-to-Edit on
   button/label-length strings). The 80/20 figure is for *content portfolios*; I could not confirm a credible
   measured number for the UI-microcopy slice, which I argue is higher-risk than the portfolio average due to
   missing context — but that's my inference, not a sourced metric.
3. **The Paraglide/Intlayer "6-10× lighter" claim independently** — it comes from Intlayer's *own* benchmark
   (vendor-published). I could not find a neutral third-party bundle-size benchmark confirming the multiplier in
   <6-month sources. Treat as vendor-claimed, not verified.
4. **(X/Twitter signal: SKIPPED.)** X auth (`auth_token`+`ct0`) is present in `~/.claude/x-auth/x-session.json`,
   but the SearchTimeline GraphQL query-id is rotated/stale (404), and energy's `fetch-bookmarks.py` only carries
   a Bookmarks qid, not a search qid. Recovering a fresh search qid needs a browser-render handshake — out of
   scope for a secondary source per mission ("else note skipped"). All findings above rest on
   GitHub/HN/Reddit-adjacent/blog sources instead.
