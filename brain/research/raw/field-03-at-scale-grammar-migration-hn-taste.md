---
title: "Field Intel: At-scale key mgmt, grammar traps, migration war stories, HN practitioner taste"
type: source
created: "2026-06-17"
updated: "2026-06-17"
tags: [i18n, field-intelligence, key-sprawl, plurals, gender, migration, taste, hackernews, doctolib]
sources:
  - "https://medium.com/doctolib/keys-to-efficient-i18n-ec38fd461d7d (Doctolib eng)"
  - "https://medium.com/@radist2s/...migration-from-react-i18next-to-linguijs... (Monite, Alex Batalov)"
  - "https://www.locize.com/blog/messageformat-2-i18next/ (Locize, May 2026)"
  - "https://localazy.com/blog/beyond-interpolation-multiple-plurals-genders-and-building-lists"
  - "https://news.ycombinator.com/item?id=37062755 (HN: Lessons From Linguistics, 188pts/97cmts)"
  - "https://phrase.com/blog/posts/internationalization-beyond-code-..."
summary: "Doctolib's at-scale key hygiene (grep-able keys, dup-key tests, runtime usage tracking), the concrete grammar traps (multiple plurals, gender, lists, Czech-3/Arabic-6/Japanese-1), the LinguiJS migration war story, MF2's near-zero 2026 adoption, and named HN practitioner taste (pseudo/emoji/id locales, German abbreviation disasters)."
---

# Field Intel: At-scale mgmt, grammar, migrations, HN taste

## A. Translation-key sprawl at scale — Doctolib's hard-won hygiene

Source: [Doctolib — Keys to efficient i18n](https://medium.com/doctolib/keys-to-efficient-i18n-ec38fd461d7d)
(large healthcare eng org, Rails + JS).

- **Keys must be grep-able.** Enforce "only basic characters — ASCII letters, digits, hyphens, underscores."
  Readability + reliable static search depend on it.
- **Dynamic key construction is catastrophic for tooling — verbatim example of the anti-pattern:**
  `I18n.t("common.account.#{account_type}.greetings")` makes it *"near impossible to detect through grep"* which
  keys are used. **Their fix: hardcode explicit key names**, trading flexibility for maintainability.
  (Identical conclusion to i18next's `enableSelector` + next-intl `useExtracted` static-analysis direction.)
- **The silent-overwrite landmine:** *"the Ruby YAML parser used under the hood silently overwrites any already
  defined key."* A duplicate key = a silently broken (untested) feature. **They wrote a CI test that fails on any
  duplicate key**, plus a test preventing redefinition at the same hierarchical level (devs miss existing keys in
  sprawling YAML). Generalizes: **dup-key detection must be a build gate, not a hope.**
- **Unused-key detection is fundamentally incomplete.** They monkey-patch both Ruby and JS i18n libs to log
  *accessed* keys to Redis/localStorage at runtime — but admit *"we can't be 100% sure all of our features are
  even used at all."* Static extraction misses dynamic usage; runtime tracking misses rarely-hit features.
  **There is no perfect unused-key story** — this is a genuine dispute/limitation (feeds GAPS).
- **MT + mandatory human gate:** they auto-MT new keys but ship with `include_unverified_translations: false` —
  unverified machine output **never reaches production.** (Matches the field-02 "MT for speed, human gate"
  consensus.)

**Taste:** at scale, *grep-ability and dup-detection beat cleverness.* Every "dynamic key" convenience is a
future tooling blind spot. The most senior orgs deliberately give up dynamic keys.

---

## B. Grammar traps that go beyond interpolation (the stuff English-only devs never see)

Source: [Localazy — Beyond interpolation](https://localazy.com/blog/beyond-interpolation-multiple-plurals-genders-and-building-lists)
+ [Phrase — Linguistics for developers](https://phrase.com/blog/posts/internationalization-beyond-code-a-developers-guide-to-real-world-language-challenges/).

- **Plural-category counts differ wildly — verbatim:** *"The Czech language has three [plural forms], Arabic
  six, and in Japanese, there is only one form."* So a hardcoded `count !== 1 ? "s" : ""` (English binary) is
  wrong in *most* languages. (Cross-ref field-01 #2423: Polish has 4 — one/few/many/other — and that's exactly
  where i18next's plural resolution bug surfaced.) **Arabic has [removed] categories: zero, one, two, few, many,
  other** — most devs don't even know `zero` and `two` are distinct categories.
- **Multiple plurals in one sentence:** `"{count1} apples and {count2} oranges"` — two *independent* plural
  axes. Naive single-`{count}` plural blocks can't express it; needs nested/compound ICU or MF2.
- **Gender agreement breaks the classic template:** `"{user} has updated his profile"` breaks for female /
  neutral subjects. Needs `male`/`female`/`other` variants — and many languages gender the *verb/adjective*, not
  just the pronoun. (German example surfaced on HN: terminology + gender compounding.)
- **List formatting is locale-specific:** `"Alice, Bob, and Charlie"` vs `"Alice and Bob"` — separators,
  conjunctions, and Oxford comma all vary. Use `Intl.ListFormat`, never string-join with `", "` + `" and "`.
- **Declensions/cases (Slavic, Finnish):** the *same noun* changes form by grammatical case — interpolating a
  noun into a slot can produce the wrong case. Often unsolvable with simple interpolation; sometimes needs the
  translator to restructure the whole sentence.

**The one rule that subsumes most of this (HN consensus, verbatim, @Etheryte):** *"always always _always_ write
out the full sentence you want to translate and use the tooling to interpolate everything you want to put in it.
That way the translator always sees the full context and you make it harder ... to shoot yourself in the foot."*
→ **Never concatenate sentence fragments.** The single most-repeated i18n rule across every source.

---

## C. MessageFormat 2 (MF2) — the 2026 "wait, don't migrate" signal

Source: [Locize — MessageFormat 2 in i18next, state of migration, May 2026](https://www.locize.com/blog/messageformat-2-i18next/).

- **What MF2 changes vs ICU MF1:** splits a message into 3 explicit parts — `.input` (name + type variables),
  `.match` (which variable drives selection), and explicit variant lists. **Fallback selector changed from
  `other` to `*`.** MF2's real win: *"Gender + plural combinations, nested selectors, multi-variable matching:
  these are MF1's pain points and MF2's strengths."*
- **But adoption in May 2026 is effectively zero — the hard numbers:**
  - `i18next-mf2` plugin: **~6–10 weekly npm downloads.**
  - `i18next-icu` (MF1): **~300,000 weekly downloads.**
  - TC39 `Intl.MessageFormat`: **stuck at Stage 2** (needs ~a dozen orgs in production to advance).
  - **No major framework** (FormatJS, Lingui, react-intl) defaults to MF2; **no TMS** (Crowdin, Lokalise,
    Phrase) ships MF2 support; **zero public production case studies.**
- **Verbatim recommendation:** *"Most teams: no, not yet."* Adopt only for brand-new projects with complex
  multi-selector (gender×plural) needs and willingness to run without mainstream tooling. Otherwise *"stay on
  ICU MessageFormat 1, watch the inflection signals, and be ready to migrate when the ecosystem moves."*
- **Why this matters for 2026 currency:** MF2 is the spec everyone *talks* about as "the future," but the field
  reality is the gravitational pull hasn't started. A harness that recommends MF2 today would be ahead of the
  tooling and strand the user. **Default ICU MF1; flag MF2 as watch-list.**

---

## D. Migration war story — react-i18next → LinguiJS in 1 day (Monite)

Source: [Alex Batalov / Monite](https://medium.com/@radist2s/one-command-one-day-multiple-languages-our-migration-from-react-i18next-to-linguijs-4b07ac73a9bb).

**Why they left react-i18next (the frustrations):**
1. **Opaque keys** like `look.deep` — *"lack of context ... particularly problematic in larger codebases,
   leading to unnecessary cognitive load and potential mistakes."*
2. **Search inefficiency** — can't locate usage without meaningful context.
3. **Translation-unfriendly JSON** — complex plural rules, no usage indicators for translators, **no comments.**

**The core architectural difference:** react-i18next uses arbitrary dotted keys referencing JSON; **LinguiJS uses
the source string AS the key** — `t`Look deep`` where *"the string 'Look deep' is both the key and the default
message."* Translators/devs understand context without opening language files.

**What they automated:** ~600 tokens converted via a **ChatGPT-generated jscodeshift codemod**
(`i18next.t('some.key')` → `` t`Key Source 1` ``, reading JSON values to fill the template). Succeeded by
**automating the 80% common pattern, hand-fixing edge cases.** Verbatim: *"jscodeshift is not a silver
bullet...you don't have to cover all cases, just identify the most popular constructs."*

**The gotchas they hit (real migration breakage):**
- **`t` macro can't run at module scope** ("top-level macro failure") → they wrote custom ESLint rules to forbid
  it. Philosophy verbatim: *"It's easier to explicitly forbid something than to spend time on Code Review
  later."*
- **Language-switching bug:** the compiled `t` macro **doesn't subscribe to `I18nProvider` context** — only
  `<Trans/>` components auto-update. Dynamic locale changes needed `useLingui()` hooks added in components. **A
  silent "UI half-updates on language switch" bug.**
- **SSR risk:** async translation loading could render **different languages in different page sections**; fixed
  with dynamic imports for locale providers caching per language. (Same SSR/per-request-locale hazard as the
  i18next `cloneInstance` race in field-01 #2422 — it's a *category* of bug, not library-specific.)

**Strong opinion (taste):** the author advocates **Gettext PO files over JSON** because *"industry translation
services inherently understand this format,"* and that Lingui bridges *"proven methods of the past and today's
modern development needs."* (This is a genuine JSON-vs-PO dispute — see GAPS; the JSON camp counters that PO is
heavyweight for JS and JSON is git-diff-friendly.)

**General migration warning (cross-source, SimpleLocalize/BuildPilot 2026):** *"Changing your i18n library
mid-project is one of the most painful refactors in frontend development — it touches every component, affects
routing, changes your build pipeline, and disrupts your translation workflow."* App-Router migration tripwire:
*"if you are migrating ... and seeing 'use client' is required errors, check whether your i18n library's API
depends on React context."*

---

## E. Named HN practitioner taste (real engineers, attributed)

From [HN: Lessons From Linguistics](https://news.ycombinator.com/item?id=37062755) (Shopify Eng blog discussion,
188 pts / 97 comments, 2023 — still the canonical practitioner thread; opinions remain current).

- **Pseudo-localization is the #1 underused QA technique.** @rickspencer3 (ex-Microsoft): MS had a pseudo-loc
  tool that *"would inject backwards text, longer text"* giving QA *"instant feedback on whether the UI would
  accommodate the localization process."* @Cthulhu_ adds: ship "lorem ipsum or auto-translated versions" during
  dev. → **Pseudo-locale (accented, +40% length, bracketed) catches expansion/hardcoding bugs before any real
  translation exists.**
- **Emoji-locale to find hardcoded strings.** @Cicero22: *"A third dev locale worth considering is one which
  consists of random emojis. Makes it very easy to find hardcoded strings."* (Anything still in English/Latin =
  un-externalized.)
- **The "id locale" gotcha (great + dangerous).** @the_imp: an identity dev-locale is great, *"Just don't call
  it 'id'; it's the locale code for Indonesian. Using a word longer than three characters like 'identity' will
  help ensure it won't conflict with a real locale."* → **Naming a debug locale `id`/`en-XX` can collide with
  real BCP-47 codes.**
- **Text expansion rules of thumb:** @Wildgoose: *"English is often much shorter ... we used a rough rule of
  thumb of always doubling the space used for English."* @jakub_g: *"Cyrillic text might be same 'length' but
  glyphs ... are wider hence overall the string needs more space"* (it's *glyph width*, not just char count).
  @Cthulhu_ counterpoint: CJK *"CAN be a lot more compact"* but CJK headline culture packs more info → can be
  *longer* in practice. **Expansion is bidirectional and font-dependent — not a fixed % you can hardcode.**
- **The real-world horror story (German abbreviation):** @egormakarov on German Oblivion: *"Schw. Tr. d. Le.en.-W."*
  for "small potion of healing" — what happens when you cram an expanding language into a fixed English-sized
  slot. Even Apple/macOS (@TheAceOfHearts) has native-language strings *"cut off ... never fixed despite being
  reported for years."* → **Even trillion-dollar companies ship text-truncation bugs; budget for it.**
- **RTL reverses widgets, not just text** (@scriptsmith): *"input widgets like sliders get reversed."*
  @yorwba: logical properties (`inline/block`-`start/end`) *"automagically supports even vertical scripts like
  Traditional Mongolian, but most people probably don't think that far ahead."*
- **Auto-translate-on-missing-key exists but needs a backend** (@majido): i18next `saveMissing` hooks → a TMS
  (locize's business model). Several note "MT at build time, send files to human or machine" pipelines are
  trivial to roll yourself (@gorbypark).
- **The context problem MT can't solve alone** (@worklaptopacct): a lone sentence often lacks context —
  *"'fresh water'"* vs *"'sweet water'"* (opposite-of-saltwater) — Cities:Skylines shipped the wrong literal
  because the translator had no domain context. → **Translators (human or AI) need a `description`/context field
  per string; a bare string is ambiguous.** This is the strongest argument for ICU + description metadata and
  for *not* trusting context-free MT on short UI strings.

**HN meta-taste:** the practitioners' priority order is (1) never concatenate — full sentences with
interpolation, (2) pseudo/emoji dev-locales to surface bugs early, (3) budget for text expansion + font width,
(4) RTL flips widgets not just text, (5) give every string a context/description field. None of this is
library-specific; it's the durable craft.
