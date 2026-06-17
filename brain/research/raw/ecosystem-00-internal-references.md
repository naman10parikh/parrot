---
title: "Ecosystem Research — Internal Energy References (i18n)"
type: source
created: 2026-06-17
tags: [i18n, l10n, internal, energy, checklist, design]
sources: ["~/energy/audit/HARNESS-CHECKLIST-2026.md", "~/energy/.claude/rules/design.md", "~/energy/.claude/rules/react.md"]
summary: "What the Energy harness checklist + design rules already say about i18n/l10n and cross-locale typography — the read-only corpus parrot's i18n domain expert must honor."
---

# Internal Energy References for parrot (i18n / l10n)

> Read-only quotes from the Energy corpus. These are the constraints parrot inherits.
> Captured 2026-06-17 by the ecosystem researcher.

## 1. Energy Harness Checklist — i18n section (the GAP this employee fills)

Source: `~/energy/audit/HARNESS-CHECKLIST-2026.md` (406 lines, last touched as part of CP117 honest audit).

**Line 83 (the checklist item):**
> `- [ ] **i18n / localization** — next-intl / Crowdin / Lokalise — **GAP (when international)**`

**Lines 360-362 (the defaults block):**
> ### i18n / localization
> **Default:** **next-intl** (Next-native) / **Crowdin** / **Lokalise**. **GAP** — wire from day-1 if international launch is on the roadmap (painful to retrofit late).

**Line 402 (ownership map):**
> `| Product · C2 infra | i18n / localization      | ❌ **GAP** — when international                                   |`

**Line 303 (context — i18n grouped with the production-essentials gaps):**
> "... a secrets manager · Sentry · transactional email · a durable job queue · Upstash rate-limit. Compliance + i18n"

### Interpretation for parrot
1. Energy's *stated* default stack is **next-intl + Crowdin + Lokalise**. parrot must (a) confirm whether that's still the right call in June 2026, and (b) document the honest trade-offs vs i18next / FormatJS / Lingo.dev / Tolgee so a product team can pick deliberately, not by inertia.
2. The recurring chairman framing — **"painful to retrofit late"** — is the single most important strategic claim parrot owns. Every research finding should be filtered through: *does this make day-1 wiring cheap, or does it document the retrofit pain?*
3. i18n is classified **C2 operational infra** (alongside Sentry, secrets, queues), not C1 app-shell. So parrot is an *operational* employee: it wires a cross-cutting concern, it doesn't own a product surface.

## 2. Energy design rules — cross-locale typography constraints

Source: `~/energy/.claude/rules/design.md` + `~/energy/.claude/rules/react.md`.

The canonical Energy type system (which any localized product frontend must keep working across locales):
- **Instrument Serif** for display/headings; **Poppins** for body. Both via `next/font`.
- "Serif + sans-serif pairing is the single highest-impact anti-AI-generated-look change."
- Warm-black (#141312) surfaces + amber accent; dark mode default.
- No text smaller than 11px (`text-[11px]` minimum).
- No pure white text on dark — use zinc-100/200.

### i18n implication parrot must flag (taste, not in the rules yet)
**Instrument Serif and Poppins do NOT cover non-Latin scripts.** Instrument Serif is Latin-only (basic Latin + a little Latin-ext). Poppins is a Devanagari+Latin family (so Hindi/Marathi are OK) but has **no** CJK, Arabic, Cyrillic-display, Thai, or Hebrew coverage. The moment parrot's product ships ar/he/ja/ko/zh/th, the Energy brand type stack silently falls back to the OS default for those locales — which breaks the "no AI-slop" brand promise *specifically in the localized markets*.

This is the **load-bearing taste finding** that connects parrot's domain (i18n) to Energy's design rules: **font subsetting + per-script fallback stacks (`next/font` `fallback` + Noto Sans <script> / Noto Serif <script>) are a first-class i18n concern, not a design afterthought.** A correct parrot harness wires `next/font` localized fallbacks and RTL-aware `dir` switching at the same time it wires message catalogs. (See ecosystem-06-rtl-typography for the deep-dive.)

`next/font` automatically subsets by `subsets:` — but you must declare every script you intend to render or the glyphs ship missing. RTL also needs `dir="rtl"` on `<html>` (set from the active locale) AND logical CSS properties (`margin-inline-start`, `padding-inline-end`) instead of physical (`margin-left`) or the warm-black/amber layout mirrors incorrectly.

## 3. parrot repo conventions (where this research lives)

Source: `~/parrot/AGENTS.md`, `CLAUDE.md`, `brain/MOC - parrot.md`.

- Brain is a **WikiMem** vault: `raw/` (immutable sources — where this file lives, under `brain/research/raw/`), `wiki/` (LLM-generated), with `entities/`, `concepts/`, `syntheses/`.
- Every page carries YAML frontmatter (`title`, `type`, `created`, `tags`, `sources`, `related`, `summary`).
- Harness formula parrot must satisfy: identity · memory+brain · tools · skills · hooks · subagents · MCP · dispatch · eval. So the i18n research must eventually answer *"what skills / CLIs / MCP / eval does an i18n employee need?"* — that's research-section (6) in the mission.
- Commit convention: `feat(skill):` / `feat(employee):` / `feat(company):`.
