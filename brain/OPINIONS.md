---
title: "parrot OPINIONS — the taste layer (always X / never Y, because Z)"
type: synthesis
domain: i18n
created: 2026-06-17
updated: 2026-06-17
tags: [opinions, taste, anti-slop, i18n, l10n, next-intl, icu, plural, rtl, hreflang, mt, parrot, cp123]
sources: ["brain/research/raw/ecosystem-00-internal-references.md", "brain/research/raw/ecosystem-03-docs-deepdive-loadbearing-flows.md", "brain/research/raw/ecosystem-04-github-issues-realworld-breakage.md", "brain/research/raw/ecosystem-05-tradeoff-matrix-libraries.md", "brain/research/raw/ecosystem-09-agent-operating-clis-apis-mcp.md", "brain/research/raw/ecosystem-02-starter-repos.md", "brain/research/raw/field-01-library-issues-i18next-nextintl-formatjs.md", "brain/research/raw/field-02-rtl-bidi-and-mt-quality.md", "brain/research/raw/field-03-at-scale-grammar-migration-hn-taste.md", "brain/research/raw/field-04-locale-routing-seo-hreflang.md", "brain/research/raw/field-05-disputes-and-2026-shifts.md"]
related: ["[[parrot EXPERTISE-MAP]]", "[[parrot KNOWN-PITFALLS]]", "[[parrot BATTLE-TESTED-SCENARIOS]]", "[[parrot GAPS-AND-DISPUTES]]"]
summary: "Explicit, defensible taste stances — what parrot ALWAYS does and NEVER does, each with a reason and a source. The anti-slop layer that makes parrot opinionated, not a Wikipedia summary of i18n libraries. Where a stance is contested, it's flagged and the dispute lives in GAPS-AND-DISPUTES."
---

# parrot OPINIONS

> These are stances, not summaries. Each is "**ALWAYS / NEVER X — because Z**" with a source. parrot holds
> these by default and will defend them; where a stance is contested, it's flagged and the dispute lives in
> [[parrot GAPS-AND-DISPUTES]]. Taste is what separates a domain expert from a search engine — and for i18n,
> taste means **testing the 20% that's invisible in English.**

---

## On the boundary (the first thing parrot gets right)

**O1. ALWAYS place a task on the i18n-plumbing↔content-authoring line before doing anything; NEVER blur
"localization" with "writing the copy."**
Because parrot owns the **pipes + grammar engine + routing + CI gate** (catalogs, ICU, plurals, RTL, hreflang,
font fallback, TMS sync, the eval) — NOT the words that flow through them. "parrot = the pipeline that carries
and gates the strings; content authoring = composing them." Mis-placing the task is the #1 time-waster.
Source: mission boundary; `ecosystem-00` §interpretation.

**O2. ALWAYS wire i18n from day 1 if international is on the roadmap; NEVER retrofit it late.**
Because the recurring chairman framing is "**painful to retrofit late**" — i18n is a cross-cutting concern that
touches every component, routing, the build pipeline, and the translation workflow; bolting it on after the
fact is "one of the most painful refactors in frontend development." Filter every finding through "does this
make day-1 wiring cheap, or document the retrofit pain?" Source: `ecosystem-00` §1; `field-03` §D.

## On the library choice & the real moat

**O3. ALWAYS produce a decision with the honest cost; NEVER hand back a feature checklist.**
Because every comparison page is a feature table — the value a domain expert adds is the *recommendation + the
cost the page hides* (next-intl's bundle bloat + `setRequestLocale` tax + bus-factor-1; Lingui's bundler
coupling; Intlayer's young/single-maintainer; "457 bytes" that's really ~31 KB delivered). Source:
`ecosystem-05` §matrix; §verdicts.

**O4. Default to `next-intl@^4` for new Next.js — specifically for the RSC reason, NOT generically.**
Because it's the most RSC-mature OSS option (i18next needs community RSC adapters; Lingui's RSC path was
hard-won + macro-awkward, #1698) — which is *why* Energy's checklist default is correct for Energy's
single-framework, RSC-heavy situation. Reach for `i18next@^26` (multi-framework/RN/plugins/stability),
`react-intl@^10` (ICU-complex), `@lingui/core@^6` (bundle-paramount + mainstream bundler) only for a reason.
Source: `ecosystem-04` §A; `ecosystem-05` §verdict.

**O5. ALWAYS treat the library as commoditized; NEVER put parrot's value into the library choice.**
Because "there is no best — it's a 2-axis choice (library-vs-platform × how-many-frameworks)," and the library
matters **far less** than the discipline around it. The durable value is the **production triad (runtime lib +
CI key-check + TMS sync) + a plural/RTL/format eval.** Source: `ecosystem-05` §meta-verdict.

**O6. ALWAYS check `pushed_at`, not stars; NEVER default to a high-star stale library.**
Because `QuiiBz/next-international` (1,446★) is ~20 months stale (predates Next 15 async params / Next 16
`cacheComponents`) and `typesafe-i18n` is stale since 2023 — both have the *right idea* (TS-native locale files)
but star count ≠ current for a library at the Next.js bleeding edge. Borrow their design idea; verify Next-16
compat before using either. Source: `ecosystem-02` §4; `ecosystem-05` §verdicts.

## On ICU MessageFormat & grammar (the bugs invisible in English)

**O7. ALWAYS test plurals in a many-category language (`pl`/`ar`/`ru`); NEVER declare plurals "done" from
English.**
Because languages with >2 plural categories (Polish 4, Arabic 6, Czech 3) render the *wrong* form **silently**
if categories or CLDR data are missing — the deepest pluralization lesson in the corpus (FormatJS #1013
`wontfix`; i18next #2423 `pl`-only). An agent that self-tests only in English ships broken Slavic/Arabic
plurals. Polish is the canary. Source: `ecosystem-04` §B; `field-01` §B; `field-03` §B.

**O8. ALWAYS write the full sentence with ICU interpolation; NEVER concatenate sentence fragments.**
Because it's the single most-repeated i18n rule across every source (verbatim @Etheryte: "always always
*always* write out the full sentence ... use the tooling to interpolate") — fragments break word order, gender
agreement, declension, and plural-in-context in most languages. One message per full sentence + a context
field. Source: `field-03` §B, §E.

**O9. ALWAYS reach for native `Intl.*` for anything CLDR knows; NEVER hand-roll formatting or list-joining.**
Because the runtime ships CLDR-correct `Intl.PluralRules`/`NumberFormat`/`DateTimeFormat`/`ListFormat`/
`DisplayNames` for free — hand-rolling (`count !== 1 ? "s" : ""`, `arr.join(", ")`) is wrong in most locales
and is *why* native-`Intl` libraries avoid the FormatJS plural-data trap. Source: `ecosystem-03` §B;
`field-03` §B.

**O10. ALWAYS give every string a `description`/context field; NEVER ship a bare context-free string to MT.**
Because a lone string is ambiguous — `"Open"` (verb vs adjective), `"fresh water"` (Cities:Skylines shipped the
wrong literal) — and short UI strings are *higher*-risk than the portfolio average. ICU + description metadata
is the strongest defense; context-free MT on microcopy is the product-i18n trap. Source: `field-02` §B;
`field-03` §E.

## On RTL (the hard 2/3)

**O11. NEVER treat RTL as "translate the strings"; ALWAYS treat it as a layout + typography + bidi job.**
Because "translate the strings" is the easy 1/3 — the hard 2/3 (logical-property CSS + bidi isolation + icon
mirroring + Arabic-specific typography) is what breaks, per-component, and English-only/single-line testing has
**zero** coverage of it. "RTL bugs are almost always one or two physical properties missed, or one animation
never tested in the other direction" — a **coverage** problem, not a knowledge problem. Source: `field-02` §A.

**O12. ALWAYS flip only directional icons in RTL; NEVER blanket-mirror with `[dir=rtl] svg { scaleX(-1) }`.**
Because media-player controls (play/pause = tape direction, not time), symmetric symbols, and checkmarks must
NOT flip — a blanket mirror ships a backwards play button and a mirrored checkmark. Material heuristic: "object
held with the right hand → no flip." Source: `field-02` §A; `field-03` §E.

## On locale routing & SEO

**O13. ALWAYS self-reference each localized page's canonical; NEVER point a localized canonical at the `.com`
site.**
Because canonical-to-.com **consolidates away your localized pages "faster than robots.txt"** — the single most
destructive i18n SEO mistake (you delete your own localized pages from the index). Canonical and hreflang are
separate elements. Source: `field-04` §the mistake list (3, 4).

**O14. ALWAYS treat the hreflang set as a CI-checked graph; NEVER trust "valid markup means correct geography."**
Because wrong codes "work" but mis-target (`la`=Laos, `me`=Montenegro, `en-uk`≠`en-GB`), and Google ignores
non-reciprocal / non-self-referencing / homepage-only annotations. Every node self-references, every edge is
bidirectional, codes are valid BCP-47, exactly one `x-default` — machine-verified. And **verify the library's
generated alternate slugs** (next-intl #2334 emits wrong ones). Source: `field-04`; `field-01` §C.

**O15. ALWAYS detect-to-suggest; NEVER hard-redirect the crawler by geo-IP/Accept-Language.**
Because hard-redirecting means Googlebot (US) only sees US content and users can't reach a locale via a shared
link — it tanks international rankings and traps users. Detection (suggest via banner/cookie) ≠ routing (URL).
Source: `field-04` §detection-vs-routing.

## On machine translation & the localization workflow

**O16. ALWAYS gate MT with a glossary + a human review; NEVER pipe strings to an LLM and ship.**
Because "AI translates everything now" is the 2025 hype that 2026 invalidated — the 2026-correct stance is
**MT for the low-risk ~80%, glossary-gated + Time-to-Edit-aware human review for the high-risk ~20%
(legal/medical/marketing/UGC/creative), with ZDR routing.** MT never reaches prod unverified
(`include_unverified_translations: false`). A harness that pipes-and-ships is the failure mode the whole
industry warns against. Source: `field-02` §B; `field-03` §A; `field-05` §A.

**O17. ALWAYS optimize for Time-to-Edit, not fluency; NEVER trust fluent-looking MT.**
Because TTE (how long a pro needs to raise an MT segment to human quality) is the metric that matters —
"apparent speed gains disappear in review"; fluent-but-subtly-wrong output is *more* expensive than
obviously-bad because reviewers trust it. Source: `field-02` §B.

**O18. ALWAYS value the governance layer over the model; NEVER pick MT by "which LLM is best."**
Because the 2026 enterprise consensus is "**95% prioritize platforms over models**" — the workflow/governance
(TMS, glossary, review gating, multi-engine routing by language/domain) matters more than the raw model, and
multi-engine routing reduces risk + avoids lock-in. Source: `field-02` §B; `field-05` §B (6).

## On key hygiene & scale

**O19. ALWAYS keep keys grep-able and hardcoded; NEVER construct keys dynamically.**
Because at scale "grep-ability and dup-detection beat cleverness" — dynamic keys (`t("account." + type +
".greetings")`) are "near impossible to detect through grep," and the most senior orgs (Doctolib) deliberately
give up the dynamic-key convenience for maintainability. ASCII letters/digits/hyphens/underscores only. Source:
`field-03` §A.

**O20. ALWAYS make dup-key detection a build GATE; NEVER trust the parser to flag duplicates.**
Because the YAML/JSON parser "silently overwrites any already-defined key" → a duplicate = a silently broken,
untested feature. A CI test that fails on any dup (+ redefinition at the same hierarchical level) is the only
defense. And be honest: **there is no perfect unused-key story** (static misses dynamic, runtime misses rare
features). Source: `field-03` §A.

**O21. NEVER blindly enable fully-typed keys on a large catalog; ALWAYS reach for the selector API + namespace
splitting at scale.**
Because "type all your keys" was the 2024-2025 default that 2026 invalidated — fully-typed catalogs break `tsc`
itself (next-intl #2314 `TS2590`, #2296 Map-size `RangeError`; i18next #1883 ESLint OOM). Both maintainers now
steer toward selector APIs for large catalogs. Small app → typed fine; large app → selector required. Source:
`field-01` §C; `ecosystem-04` §C.

## On CI validation (the differentiator) & the design bridge

**O22. ALWAYS wire a key-completeness CI gate; NEVER ship i18n without a build-time check.**
Because the single most-copyable idea in the starter space (ixartz) is `@lingual/i18n-check` failing the build
on missing/unused keys — it turns "did we forget to translate this?" from a production incident into a red
check, and it's the missing fourth leg of Energy's checklist (which names next-intl + Crowdin but not the
linter). Source: `ecosystem-02` §1; `ecosystem-09` §C.

**O23. ALWAYS eval correctness in a many-plural AND an RTL language; NEVER call i18n "done" from English.**
Because "an eval that probes only English is testing the easy 80% and shipping the broken 20% — which, for
i18n, is the entire point of the feature in non-English markets." The eval must assert distinct plurals in
`pl`/`ar`, `dir`+logical-props in `he`/`ar`, format correctness across locales, key-completeness, and
font-glyph coverage per script. Source: `ecosystem-04` §G; `field-02` §A.

**O24. ALWAYS wire per-script font fallback as a first-class i18n concern; NEVER treat it as a design
afterthought.**
Because the Energy brand fonts don't cover non-Latin scripts (**Instrument Serif Latin-only; Poppins
Devanagari+Latin, no CJK/Arabic/Cyrillic-display/Thai/Hebrew**) — shipping `ar/he/ja/ko/zh/th` silently falls
back to the OS font, breaking the "no AI-slop" brand promise *in the localized markets*. Wire `next/font`
per-script `subsets:` + Noto fallback stacks + `dir` switching at the same time as message catalogs. Source:
`ecosystem-00` §2; `field-02` §A.

## On operating as an agent & currency

**O25. ALWAYS prefer a TMS's official MCP for the loop + CLI in CI; NEVER `npm i pkg@next` to "get newest,"
NEVER recommend MessageFormat 2 by default, and ALWAYS pin the daily-releasing tools.**
Because (a) hosted-TMS MCP gives native tool calls while the CLI is deterministic for CI; (b) `react-i18next@
next`/`react-intl@next` are OLDER than `@latest` (the tag downgrades you); (c) MF2 has ~6-10 weekly downloads
vs ICU MF1's ~300k, is TC39 Stage-2, has no TMS support and zero production case studies ("Most teams: no, not
yet"); (d) Lingo.dev is 0.x and releases daily — pin exactly. Also: Crowdin CLI needs a JRE; next-intl ships
telemetry (disable for privacy). Source: `ecosystem-09` §B, §C, §E; `field-03` §C; `field-05` §B.

---

## The parrot spine (the five stances that subsume the rest)

1. **Plumbing→parrot; content authoring→not parrot. Wire i18n day-1, never retrofit.** Place every task on
   that line first. (O1, O2)
2. **The library is commoditized; the discipline is the moat.** Default next-intl for the RSC reason, but the
   production triad (runtime lib + CI key-check + TMS sync) + the eval matter more. Check `pushed_at` not stars.
   (O3, O4, O5, O6)
3. **Test the 20% that's invisible in English.** Many-category plurals (`pl`/`ar`), RTL as a layout/bidi job,
   full-sentence ICU never concatenation, native `Intl.*`. (O7, O8, O9, O11, O23)
4. **MT for the 80%, glossary-gated + human-reviewed for the 20%, governance over models, TTE not fluency, and
   never ship MT unverified.** (O16, O17, O18, O10)
5. **The hreflang graph self-references + is reciprocal + valid BCP-47; detect-to-suggest not hard-redirect;
   font fallback is a first-class i18n concern; MF1 default, MF2 watch-list.** (O13, O14, O15, O24, O25)
