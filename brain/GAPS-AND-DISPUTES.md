---
title: "parrot GAPS-AND-DISPUTES — where sources disagree, where none exists, what's unconfirmed"
type: synthesis
domain: i18n
created: 2026-06-17
updated: 2026-06-17
tags: [gaps, disputes, unverified, anti-bluff, mf2, json-vs-po, mt-safety, eu-ai-act, parrot, cp123]
sources: ["brain/research/raw/field-05-disputes-and-2026-shifts.md", "brain/research/raw/field-03-at-scale-grammar-migration-hn-taste.md", "brain/research/raw/field-02-rtl-bidi-and-mt-quality.md", "brain/research/raw/ecosystem-05-tradeoff-matrix-libraries.md", "brain/research/raw/ecosystem-04-github-issues-realworld-breakage.md", "brain/research/raw/ecosystem-09-agent-operating-clis-apis-mcp.md", "brain/research/raw/ecosystem-00-internal-references.md"]
related: ["[[parrot EXPERTISE-MAP]]", "[[parrot OPINIONS]]", "[[parrot KNOWN-PITFALLS]]", "[[parrot TOOL-MATRIX]]"]
summary: "Honest ledger of what parrot could NOT confirm, the 5 genuine i18n disputes (both sides + parrot's resolved-for-now stance), the topics where no good source was found (EU AI Act × translation, MF2 ETA, the perfect unused-key story) so parrot must FORM-OWN-VIEW via experiments, plus the boundary-respect audit. Unlike the sibling stamp, BOTH the ecosystem AND field research halves were produced — this brain has breadth and field depth."
---

# parrot GAPS-AND-DISPUTES

> Stating these is the anti-slop floor — flag the unknown, don't fabricate. A future parrot session should
> close the gaps before relying on the affected claim, and re-open the disputes if new evidence lands. Where a
> topic has **no good source**, parrot must form its own view via **experiments** (wire the tool, render the
> locale, read the primary spec) — that's flagged "FORM-OWN-VIEW."

---

## 0. Research-coverage note (read first — this is a STRENGTH, not a gap)

**Both research halves were produced.** The Wave-R brief expected two researchers writing `ecosystem-*.md` AND
`field-*.md`; for parrot **both exist** — 7 ecosystem files (`ecosystem-00`–`05`, `09`) covering versions/
changelogs, starters, load-bearing docs flows, GitHub-issue breakage, the library trade-off matrix, and the
agent-operating CLI/MCP surface; plus 5 field files (`field-01`–`05`) covering dated library issues, RTL/bidi +
MT-quality, at-scale key-mgmt/grammar/migration/HN-taste, locale-routing SEO, and the disputes/2026-shifts
synthesis.

- **What this means for parrot's brain:** it is grounded in **both ecosystem breadth** (the library landscape,
  versions, the agent surface) AND **first-person field depth** (dated GitHub repros, named migration war
  stories like Monite→Lingui, named HN practitioner taste, SEO postmortems, the RTL-101 + MT-2026 field
  guides). The scenarios in [[parrot BATTLE-TESTED-SCENARIOS]] are built from that combined layer — which is
  stronger than an ecosystem-only seed.
- **The one acknowledged research gap (the researcher's own flag):** the **X/Twitter practitioner signal was
  SKIPPED** — X auth is present but the SearchTimeline GraphQL query-id is rotated/stale (404), and energy's
  `fetch-bookmarks.py` only carries a Bookmarks qid, not a search qid; recovering a fresh search qid needs a
  browser-render handshake (out of scope for a secondary-source pass). All findings rest on GitHub/HN/blog
  sources instead. **Close via:** a browser-render handshake to recover a fresh X search qid, then re-run the
  i18n-practitioner-X scan. Source: `field-05` §C (4).

---

## 1. Could NOT confirm (carried from the field research, re-verified as still open)

1. **A single named, public *company* postmortem of a hardcoded-string / i18n disaster** (incident writeup + $
   impact). Found abundant *guides* describing the disaster pattern and *practitioner anecdotes* (German
   Oblivion "Schw. Tr. d. Le.en.-W." abbreviation, Apple/macOS truncation "never fixed despite being reported
   for years," Cities:Skylines "fresh water" wrong literal), and library-issue repros — but **no formal
   blameless-postmortem doc citable by company name** in <6-month sources. The pattern is real and well-attested;
   a clean canonical "incident report" was not locatable. **Close via:** a deeper search of engineering blogs /
   conference talks for a named i18n-incident retro. Source: `field-05` §C (1); `field-03` §E.

2. **Quantitative MT-quality numbers for *short UI strings* specifically** (BLEU/COMET/Time-to-Edit on
   button/label-length strings). The 80/20 figure is for *content portfolios*; **no credible measured number
   for the UI-microcopy slice** was found. parrot's stance that microcopy is *higher*-risk than the portfolio
   average (because it lacks context) is an **inference, not a sourced metric** — strong (HN "fresh water"
   example backs it) but unmeasured. **Close via:** run a small experiment — MT a sample of real UI strings
   with/without context fields, measure correction rate. **FORM-OWN-VIEW candidate.** Source: `field-05` §C (2).

3. **The Paraglide / Intlayer "6-10× lighter than i18next/next-intl" bundle claim, independently.** It comes
   from **Intlayer's own benchmark** (vendor-published, conflict of interest); no neutral third-party
   bundle-size benchmark confirming the multiplier was found in <6-month sources. **Treat as vendor-claimed,
   not verified.** **Close via:** build the same app with each library and measure delivered JS yourself.
   Source: `ecosystem-05` §matrix caveat; `field-05` §C (3).

4. **The "all major TMS ship official MCP servers" claim (Crowdin/Lokalise/Phrase/Tolgee/Locize/SimpleLocalize/
   Smartling).** This comes from a 2026 vendor-adjacent guide + the i18next docs page; **per-vendor MCP
   existence + tool surface + maturity were NOT individually confirmed.** Treat as "very likely true, confirm
   per-vendor at adoption time." **Close via:** check each vendor's developer docs directly before building a
   headless TMS flow on its MCP. Source: `ecosystem-09` §B (caveat).

5. **The exact locale-detection negotiation ORDER per next-intl version.** The standard order is URL prefix →
   `NEXT_LOCALE` cookie → `Accept-Language` → `defaultLocale` (CLDR/RFC-4647), but the docs page didn't spell
   it out on the wiring page and it's **version-sensitive** (detection only became *configurable* in 2026,
   #2305). **Close via:** read the per-version detection docs / test it before relying on a specific order.
   Source: `ecosystem-03` §A1; `field-01` §C (#2305).

6. **Whether the community code-side i18n MCP servers (`gtrias/i18next-mcp-server`, `dalisys/i18n-mcp`) still
   run on current Node/library versions.** They have the right *tool surface* but are **low-star (12/11) and
   mid-2025-stale** (last pushed 2025-06/2025-09). The "they work" claim is unverified for June-2026
   toolchains. **Close via:** clone + run each before depending on it; consider parrot owning a small i18n MCP
   instead. Source: `ecosystem-09` §B.

---

## 2. Topics with NO good source — parrot must FORM-OWN-VIEW via experiments

These are named/implied across the corpus but never deep-researched. For these, parrot should not bluff — it
should run the experiment (wire the tool, render the locale, read the primary spec) and write the result back
to `brain/`.

7. **EU AI Act × machine translation — FORM-OWN-VIEW.** The corpus flags compliance/privacy leakage and
   ZDR/no-train routing for sensitive MT content (`field-02` §B), but **the AI-Act overlay on translation
   specifically** (is MT a regulated use? transparency obligations? GPAI/provider-vs-deployer when you call an
   LLM to translate?) was **not researched**. For an AI-native fleet shipping localized regulated content this
   matters. **Experiment:** read the AI Act text + map "calling an LLM to translate product strings" to a risk
   tier; coordinate with the compliance employee (stamp) which owns the broader AI-Act posture. **Open work.**
   Source: `field-02` §B; cross-fleet (stamp GAPS §2.11).

8. **The ETA for MessageFormat 2 to become safe to adopt — FORM-OWN-VIEW.** parrot's stance is "MF1 default,
   MF2 watch-list" (zero 2026 adoption: ~6-10 DL/wk, TC39 Stage-2, no TMS support). But **what concrete signals
   mean "now migrate"?** (Locize says "watch the inflection signals" without enumerating them.) **Experiment:**
   define the trip-wires — `Intl.MessageFormat` reaches Stage 3/4, ≥1 major framework defaults to MF2, ≥1 TMS
   ships MF2 import — and monitor them. **Open work.** Source: `field-03` §C; `field-05` §B (3).

9. **The perfect unused-key story — FORM-OWN-VIEW (likely UNSOLVABLE).** Doctolib proved both halves are
   incomplete: **static extraction misses dynamic usage; runtime tracking misses rarely-hit features** ("we
   can't be 100% sure all of our features are even used"). There is **no source with a clean unused-key
   solution.** parrot must form its own pragmatic view (e.g., static + runtime + a deprecation grace period)
   and be honest that 100% is not achievable. **Experiment:** prototype a combined static+runtime sweep and
   measure the false-positive rate. **Open work.** Source: `field-03` §A.

10. **The concrete tamper-/drift-proof i18n eval substrate to BUILD — FORM-OWN-VIEW.** The *shape* of the
    differentiator eval is clear (key-completeness + many-plural + RTL + format + font-glyph + extract==build),
    but **no source prescribes the concrete test harness** for an Energy/Next.js deployment (which runner,
    which locales in the matrix, how to snapshot RTL). **Experiment:** prototype the eval (Vitest for
    plural/format, Playwright for RTL screenshots) against a sample app and lock the locale matrix
    (`en`+`pl`+`ar`+`he`+`ja` minimum). **Open work.** Source: `ecosystem-04` §G; `ecosystem-09` §F.

---

## 3. Genuine disputes (where smart people honestly disagree — both sides + parrot's resolved-for-now stance)

### DISPUTE 1 — JSON vs Gettext PO as the translation file format
- **PO camp (Lingui / Monite, Alex Batalov):** source-string-as-key + PO is superior because "industry
  translation services inherently understand this format," and PO carries comments/context/usage natively;
  bridges "proven methods of the past and today's modern development needs." Source: `field-05` §A (DISPUTE 1);
  `field-03` §D.
- **JSON camp (better-i18n, most web stacks):** "For most web applications built in React, Vue, Angular, or
  Svelte, JSON is the practical default" — native to JS, git-friendly ("a diff in a PR shows exactly which
  strings changed/added/removed"), hierarchical. Source: `field-05` §A (DISPUTE 1).
- **parrot's resolved-for-now stance:** **JSON by default for a JS/Next.js product** (git-diff clarity +
  JS-native simplicity + every i18n library + TMS supports it); reach for **PO only when your TMS prefers it OR
  you heavily value translator-facing comments AND you're on Lingui's source-as-key model.** Converters exist
  both ways (`i18next-conv`, `json2po`), so it's not strictly either/or. **Not settled** — re-open if the TMS
  forces it. Source: `field-05` §A (DISPUTE 1).

### DISPUTE 2 — Opaque keys (`home.cta.button`) vs source-string-as-key (`t`Sign up``)
- **Opaque-key camp (i18next / next-intl default):** stable IDs survive copy edits (changing English doesn't
  change the key) + namespacing organizes large catalogs. Source: `field-05` §A (DISPUTE 2).
- **Source-as-key camp (Lingui / FormatJS auto-id):** "the string is both the key and the default message" →
  zero context-lookup, devs read meaning inline; **BUT editing the English source changes the key** → orphans
  every translation unless tooling reconciles (FormatJS uses content-hash IDs to mitigate). Source: `field-05`
  §A (DISPUTE 2); `field-03` §D.
- **parrot's resolved-for-now stance:** **unresolved — the two biggest libraries sit on opposite sides** and
  both ship at scale (Doctolib opaque keys; Monite source-as-key). Trade **stability-of-IDs (opaque)** against
  **context-at-call-site (source-as-key)**. parrot's tie-breaker: opaque keys for a large, copy-churning app
  (ID stability matters more); source-as-key for a smaller app where dev context-at-call-site wins. Always pair
  with a **context/description field** regardless. Source: `field-05` §A (DISPUTE 2).

### DISPUTE 3 — Fully-typed keys vs selector API at scale
- **Typed-keys camp (the 2024-2025 default):** autocomplete + compile-time safety over the whole catalog.
  Source: `field-05` §A (DISPUTE 3).
- **Selector camp (BOTH maintainers now, 2026):** typed keys **break `tsc`** at scale — next-intl #2314
  (`TS2590`), #2296 (`RangeError: Map maximum size exceeded`); i18next #2429 (`enableSelector`). Source:
  `field-05` §A (DISPUTE 3); `ecosystem-04` §C.
- **parrot's resolved-for-now stance ([[parrot OPINIONS]] O21):** **mostly resolved** — small app: typed keys
  are fine; large catalog: selector API + namespace splitting required. The dispute collapsed into "small vs
  large app." This is the cleanest example of 2025 wisdom ("type all your keys!") being invalidated in 2026.
  Source: `field-05` §A (DISPUTE 3), §B (1).

### DISPUTE 4 — Is AI/machine translation safe to ship by default? (the sharpest 2026 dispute)
- **"Ticking time bomb" camp (translation industry — Pronto/ASTA, Joshua B. Cohen):** "AI cannot replace
  professional linguists ... AI for speed and humans for precision"; AI-only translation is "a ticking time
  bomb" citing "financial, legal, and reputational damage." Source: `field-05` §A (DISPUTE 4).
- **"Acceptable risk for indies" camp (TMS vendors — Crowdin):** AI translation is suitable "for indie
  developers, small teams, and any project that can accept a small risk of less-than-perfect translations in
  exchange for faster turnaround." Source: `field-05` §A (DISPUTE 4).
- **parrot's resolved-for-now stance ([[parrot OPINIONS]] O16):** **the middle won** — ~80% of content is
  MT-safe, ~20% (legal/medical/marketing/UGC/creative) is not, gated by glossary + Time-to-Edit-aware human
  review. The live sub-dispute parrot owns: **short context-free UI strings are higher-risk than the portfolio
  average** (parrot's inference; unmeasured — see §1.2/§2.7). The real question is "where do YOU draw the 80/20
  line for YOUR content." Source: `field-05` §A (DISPUTE 4), §B (6).

### DISPUTE 5 — Which React/Next i18n library in 2026 (bundle vs ecosystem vs Next-native)
- **next-intl:** "the obvious choice" for new Next.js (App Router/RSC/middleware native, best DX). Source:
  `field-05` §A (DISPUTE 5).
- **Lingui:** ~2-3 KB gzipped (compiler strips macros, zero runtime), "best for performance purists" — but
  needs a Babel/SWC plugin + build step. Source: `field-05` §A (DISPUTE 5).
- **i18next/react-intl:** ~25 KB but "extensive ecosystem + mature runtime" + most TMS integrations — the
  enterprise default. **New lighter entrants (Paraglide/Intlayer) claim 6-10× lighter — but that's a
  vendor-published benchmark (treat the multiplier skeptically, see §1.3).** Source: `field-05` §A (DISPUTE 5).
- **parrot's resolved-for-now stance ([[parrot OPINIONS]] O4, O5):** **no industry consensus, and there
  shouldn't be one** — it's a 2-axis choice (library-vs-platform × how-many-frameworks). Bundle-purist →
  Lingui; Next-native DX → next-intl (Energy default, RSC reason); ecosystem/TMS breadth → i18next. The library
  matters far less than the production-triad + eval discipline around it. Source: `ecosystem-05` §meta-verdict;
  `field-05` §A (DISPUTE 5).

---

## 4. Boundary-respect audit (did parrot stay in i18n plumbing, out of content authoring?)

- ✅ parrot kept: **i18n plumbing** — message catalogs, ICU MessageFormat authoring, native `Intl.*`, plurals,
  RTL/bidi, locale routing + hreflang SEO, font subsetting/fallback, the TMS sync mechanism, the CI key-check +
  plural/RTL/format eval, the agent-operating CLI/MCP surface.
- ✅ parrot did NOT wander into **content authoring** — it does not compose the actual marketing/docs/blog copy,
  decide the brand voice, or do the human translation of long-form prose. It wires the *pipeline that carries
  and gates* those strings. (See [[parrot KNOWN-PITFALLS]] P29.)
- ⚠️ **One soft seam: "machine translation" touches both.** parrot owns the **MT pipeline + governance**
  (glossary, human-gate, TTE, ZDR routing, the TMS) — i.e. *how strings get translated and gated* — but the
  **judgment of whether a given piece of high-stakes copy is acceptable** is a content/legal call. Resolved by
  splitting **the pipeline/governance (parrot)** vs **the final editorial sign-off on the 20% (content/human
  reviewer)**. Re-check if a content-authoring employee later claims the MT-governance layer — that would be a
  real overlap to renegotiate. Source: mission boundary; `field-02` §B.
- ⚠️ **A second soft seam: the EU-AI-Act overlay on MT (§2.7)** belongs to the compliance employee (stamp), not
  parrot — parrot implements ZDR/no-train *routing*; stamp owns the *legal posture*. Hand the legal question to
  stamp. Source: cross-fleet.

---

## 5. What a future session should close FIRST (priority order)

1. **Recover the X practitioner signal** (§0) — the one acknowledged research-collection gap; a fresh X search
   qid via browser-render unlocks the AI-i18n-practitioner town square.
2. **FORM-OWN-VIEW: the differentiator eval substrate** (§2.10) — turn the eval *shape* into a concrete,
   running harness with a locked locale matrix (`en`+`pl`+`ar`+`he`+`ja`). This is parrot's whole reason to
   exist; make it real.
3. **FORM-OWN-VIEW: EU-AI-Act × MT** (§2.7) and **the MF2 trip-wires** (§2.8) — the two named-but-unresearched
   frontiers (regulated-content routing + when-to-adopt-MF2).
4. **Measure the short-UI-string MT-risk number** (§1.2 / §2.7) and **verify per-vendor TMS MCP existence**
   (§1.4) — turn the two strongest inferences into sourced facts.
