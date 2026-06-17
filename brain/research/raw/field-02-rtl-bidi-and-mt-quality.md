---
title: "Field Intel: RTL/Bidi breakage + Machine-Translation quality (2026)"
type: source
created: "2026-06-17"
updated: "2026-06-17"
tags: [i18n, field-intelligence, rtl, bidi, machine-translation, ai-translation, typography]
sources:
  - "https://rtlstyling.com/posts/rtl-styling/ (RTL Styling 101)"
  - "https://translated.com/resources/machine-translation-2026-assessment (Translated, 2026)"
  - "https://crowdin.com/blog/ai-translation-enterprise-survey-2026"
  - "https://simplelocalize.io/blog/posts/rtl-design-guide-developers/"
summary: "Concrete RTL/bidi production bugs (what physical CSS breaks, where logical properties have NO equivalent, icon-mirroring rules, Arabic typography gotchas) and the honest 2026 MT-quality picture (the 80/20 line, when AI translation is unsafe, Time-to-Edit metric)."
---

# Field Intel: RTL/Bidi breakage + MT quality

## A. RTL / Bidirectional layout — the concrete failure list

Source: [RTL Styling 101](https://rtlstyling.com/posts/rtl-styling/) (deep practitioner guide) + cross-checked
against [SimpleLocalize RTL guide](https://simplelocalize.io/blog/posts/rtl-design-guide-developers/).

### Physical CSS that silently breaks in RTL
- **`letter-spacing` destroys Arabic.** Arabic letters are meant to be *connected*; English `letter-spacing`
  disconnects them. **Set `letter-spacing: 0` for RTL content.** This is the most common Latin-default carried
  blindly into Arabic.
- **`word-break` is semantically invalid for Arabic** — connected letters must not break mid-word.
- **Text transparency (RGBa / opacity on text) causes rendering artifacts** — discolored areas *between* Arabic
  letters. Use solid colors for Arabic text.
- **Underlines (`text-decoration: underline`) overlap Arabic letter dots → unreadable.**
  `text-decoration-skip-ink` helps but **lacks Safari support**; fallback is an inset `box-shadow`.
- **`line-height` truncates diacritics.** Arabic fonts have different vertical metrics; an English-tuned
  `line-height` can clip the *kasra* (a diacritic essential for correct reading). Only shows up with real
  multi-line content.

### Where CSS logical properties have NO equivalent (the trap of "just use logical properties")
The popular 2025 advice is "use `margin-inline-start` and you're done." That is **incomplete** — these have no
logical form and must be hand-handled per `dir`:
- **`transform`** — e.g. a sliding/arrow animation needs a manual `scaleX(-1)` or a `dir`-conditional transform.
  There is no `transform-inline`.
- **`background-position`** — not logical. Must swap background images or override position for RTL.
- **`box-shadow`** — not logical. Inset shadows (used for the underline fallback above) must be hand-flipped.
- **`border-radius` logical forms (`border-start-end-radius`) lack Safari support** → keep physical fallbacks.

> **Verbatim opinion (RTL Styling 101):** *"RTL bugs are almost always the result of one or two physical
> properties that were missed, or one animation that was never tested in the other direction."* — i.e. RTL
> failure is a *coverage* problem, not a *knowledge* problem. (Echoed by DEV/Medium logical-properties posts.)

### Bidirectional text isolation (the hardest class — affects LTR apps too the moment they show user data)
- **Mixed LTR+RTL in one element renders in the wrong order** without explicit `dir` per run. "English text in
  Arabic context displays backwards." Fix: `dir="auto"` per run, or Unicode isolates (LRI/RLI/PDI), or
  the older LRM/RLM marks.
- **Ellipsis truncates from the wrong end** without `dir="auto"`.
- **Numerals inconsistency looks unprofessional** — mixing Eastern-Arabic numerals (٠١٢) with Latin (012) in one
  UI. Pick one numbering system per interface. (This ties to the formatjs `numberingSystem` polyfill bug in
  field-01 — the system can betray you even when you choose correctly.)

### Icon mirroring — the rule most teams get wrong (flip *some*, never *all*)
- **FLIP:** navigation/breadcrumb arrows, menu toggles, send buttons (messaging), search/clear field icons,
  close buttons, tab arrows, card image/text ordering.
- **DO NOT FLIP:** **media player controls (play/pause)** — they represent *tape direction, not time*; objects
  held in the right hand; symmetric symbols; checkmarks/warnings/info badges.
- **Material Design heuristic (cited):** *"if an icon represents an object that can be held with a person's
  right hand, then it doesn't need flipping."* The classic bug is `[dir=rtl] svg { transform: scaleX(-1) }` as a
  blanket rule → mirrored checkmarks and a backwards play button.

### Text-expansion / contraction breaking layout
- **Contraction breaks buttons:** "Done" → "تم" (Arabic) makes buttons collapse too small → add `min-width`.
- **English abbreviations don't translate:** "Sat" for Saturday has no Arabic equivalent (connected letters
  prevent shortening). Don't design around abbreviations you can't localize.
- (Expansion direction, cross-referenced from German below in field-03: German/Finnish run +30–40% longer; fixed
  pixel widths and single-line `nowrap` buttons are the classic break.)

### Font selection
- **System-default fonts degrade RTL readability.** The guide's example: Twitter's rendering of "تغريد" is hard
  to read due to a poor font + bold weight + tight dot spacing. Ship a proper Arabic webfont; don't rely on the
  user's system font.

**RTL meta-lesson:** RTL is not a "translate the strings" task — it is a *layout + typography + bidi-algorithm*
task that fails per-component, and English-only / single-line testing has **zero** coverage of it.

---

## B. Machine translation quality in 2026 — the honest "when is AI safe" line

Sources: [Translated — MT in 2026: An Honest Assessment](https://translated.com/resources/machine-translation-2026-assessment),
[Crowdin 2026 AI Translation Enterprise Survey](https://crowdin.com/blog/ai-translation-enterprise-survey-2026),
Lokalise/Smartling 2026 AI-localization posts.

### The 80/20 line (the practical answer)
- **~80% of a typical content portfolio** (general comms, standard docs, informational/support content) can be
  handled at **near-human quality** by 2026 AI systems.
- **The remaining ~20%** — regulated docs (legal/medical/compliance), client-facing high-stakes content,
  specialized/literary material — **still needs human expertise.**

### Content types NOT safe to auto-translate (verbatim categories from Translated)
- **Marketing / brand messaging** — needs "persuasion, tone, and cultural fit."
- **Creative / literary work** — "style is part of the meaning."
- **User-generated content** — "slang, typos, sarcasm, and incomplete context."
- **Regulated content** — legal, medical, compliance-heavy.

### Specific MT failure modes (name these in any harness)
- **Terminology drift** — "may repeat the wrong term across a document." (Your fix: a glossary / termbase the
  MT must honor — non-negotiable for product strings.)
- **Brand-voice erosion** — systems "smooth out tone until brand language sounds interchangeable."
- **Compliance/privacy leakage** — routing sensitive material "through infrastructure that does not fit a
  company's compliance needs" (ZDR/no-train matters here).
- **Context loss in specialized domains** — domain language gets missed. (Aggravated for short UI strings: an
  isolated key like `"Open"` has no context → MT can't tell verb from adjective. This is *the* product-i18n MT
  trap — see field-03 string-context discussion.)
- **Hallucination** — MT/LLM can introduce new/inaccurate info; 2026 stacks add "hallucination detection" as a
  safety net.

### The metric that matters in 2026: **Time to Edit (TTE)**, not "fluency"
> **Verbatim (Translated):** TTE measures *"how long a professional translator needs to raise a
> machine-translated segment to human quality."* The insight: *"apparent speed gains disappear in review"* when
> TTE is high. Fluency-looking output that's subtly wrong is *more* expensive than obviously-bad output, because
> reviewers trust it.

### Strongest verbatim opinions to quote
- Translated: *"Human expertise will remain central in high-risk and high-value content. Legal, medical, and
  creative work all require judgment that goes beyond fluent wording."*
- Translated: reserve human effort for *"the hardest decisions"* rather than *"blanket automation."*
- Crowdin 2026 survey framing: *"95% of Enterprises Prioritize Platforms Over Models"* — i.e. the 2026 enterprise
  consensus is that the *workflow/governance layer* (TMS, glossary, review gating, routing) matters more than
  which raw LLM you pick. The shift is "from *whether* to use AI translation to *how* to implement it safely."
- Multi-engine routing is the 2026 default: "AI translation success in 2026 isn't about choosing a single
  model—it's about running a system" that routes by language/domain/context (reduces risk + avoids lock-in).

**MT meta-lesson for parrot:** "AI translates everything now" is the 2025 hype that 2026 invalidated. The
2026-correct stance is: **MT for the 80% low-risk bucket, gated by a glossary/termbase and a TTE-aware human
review for the high-risk 20%, with privacy-compliant routing.** A harness that just pipes strings to an LLM and
ships is the failure mode the whole industry is now warning against.
