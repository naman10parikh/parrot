---
name: rtl-bidi-audit
description: Audit and fix RTL/bidi as a layout + typography + bidi job — logical-property CSS (with the hand-handled exceptions), selective icon mirroring (never blanket scaleX(-1)), Arabic-safe CSS, and bidi isolation for mixed runs. Use when "make this work in RTL / Arabic looks broken / the checkmark is mirrored", or to gate RTL coverage before shipping a non-Latin locale.
---

# rtl-bidi-audit

> **JTBD-4 — Make RTL actually work.** "Translate the strings" is the easy 1/3; the hard 2/3 — logical CSS +
> bidi isolation + icon mirroring + Arabic typography — is what breaks, **per component**, and English-only /
> single-line testing has **zero** coverage of it. RTL is a **coverage** problem, not a knowledge problem
> (`brain/OPINIONS.md` O11; `brain/BATTLE-TESTED-SCENARIOS.md` S7). **Boundary:** fix the layout/CSS/bidi;
> never author the translated copy (`brain/KNOWN-PITFALLS.md` P29).

## Trigger

- "Make this work in RTL / Arabic / Hebrew" / "the Arabic layout is broken."
- A symptom: a slide animation, background image, or inset shadow points the **wrong way** in RTL even though
  margins mirrored (the logical-props-are-incomplete trap, `brain/KNOWN-PITFALLS.md` P11).
- A **backwards play button** or a **mirrored checkmark** in RTL (the blanket-mirror trap, P12 / `brain/OPINIONS.md` O12).
- Arabic text that looks "broken" — disconnected letters, clipped diacritics, discolored gaps (the
  Latin-default-CSS trap, P13).
- English embedded in Arabic rendering backwards, or truncation from the wrong end (the bidi trap, P14).

## Steps

1. **Confirm `dir` is set** (`<html dir>` / per-component `dir`) for the RTL locale — the prerequisite for
   everything else (`brain/BATTLE-TESTED-SCENARIOS.md` S7). `parrot rtl audit --dir <app>` flags a missing
   `dir`.
2. **Convert physical → logical properties**, but **hand-handle the ones with no logical equivalent**
   (`brain/KNOWN-PITFALLS.md` P11): `margin-left` → `margin-inline-start` is necessary but **incomplete**.
   `transform`, `background-position`, and `box-shadow` have **no logical form** — make them dir-conditional
   (e.g. `scaleX(-1)` only where directional, swapped `background-position`, mirrored shadow offset). Keep a
   physical `border-radius` fallback for Safari (logical `border-start-end-radius` lacks Safari support).
3. **Mirror only DIRECTIONAL icons** (`brain/OPINIONS.md` O12, `brain/KNOWN-PITFALLS.md` P12). Replace any
   blanket `[dir=rtl] svg { transform: scaleX(-1) }` with a selective allow-list: flip nav/back/breadcrumb/
   send/chevrons/search-clear/close/tab; **never** flip play/pause (tape direction, not time), symmetric
   symbols, checkmarks, or warnings. Material heuristic: "object held in the right hand → no flip."
4. **Apply Arabic-safe CSS** (`brain/KNOWN-PITFALLS.md` P13): `letter-spacing: 0` for RTL (spacing
   **disconnects** connected Arabic letters); avoid `word-break` (semantically invalid); use **solid** text
   colors (opacity/RGBa causes artifacts between letters); for underlines use `text-decoration-skip-ink` with
   an inset-box-shadow fallback (no Safari); tune `line-height` to the Arabic font's metrics so the *kasra*
   isn't clipped.
5. **Add bidi isolation for mixed runs** (`brain/KNOWN-PITFALLS.md` P14): `dir="auto"` per run, Unicode
   isolates (LRI/RLI/PDI), or LRM/RLM marks so English-in-Arabic doesn't render backwards and ellipsis
   truncates from the correct end. Pick **one numbering system** per interface.
6. **Wire the RTL webfont / per-script font fallback** so Arabic/Hebrew don't fall back to the OS font
   (`brain/KNOWN-PITFALLS.md` P28) — coordinate with the `i18n-font-fallback` skill.
7. **Prove it with a real RTL render** — `dir="rtl"` present **and** a screenshot of real Arabic content
   (`brain/OPINIONS.md` O11/O23). An assertion-only check cannot catch a mirrored checkmark; add the RTL
   screenshot to the eval. `parrot rtl audit` emits a screenshot stub for this.

## Output

- A per-component fix list: which physical props became logical, which `transform`/`bg`/`shadow` were
  hand-handled, which icons were (and were NOT) mirrored, the Arabic-CSS fixes, the bidi-isolation additions.
- An RTL screenshot (or the stub + instructions to capture one) proving real Arabic content renders
  correctly — the coverage proof an assertion can't give.
- A note naming each trap dodged (P11–P14) with its detect signal.
- **Never** translated copy — RTL is layout/typography/bidi, not "translate the strings" (P29).

## Brain citation

`brain/EXPERTISE-MAP.md` JTBD-4/JTBD-9 · `brain/OPINIONS.md` O11 (RTL = layout/bidi job), O12 (selective icon
mirror), O23 (eval in RTL) · `brain/KNOWN-PITFALLS.md` P11 (logical props incomplete), P12 (blanket-mirror),
P13 (Latin CSS breaks Arabic), P14 (bidi isolation), P28 (font fallback) · `brain/BATTLE-TESTED-SCENARIOS.md`
S7 · P29 (the boundary).
