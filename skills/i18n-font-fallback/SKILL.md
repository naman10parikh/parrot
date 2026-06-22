---
name: i18n-font-fallback
description: Wire next/font per-script subsets + Noto fallback stacks behind the brand fonts so non-Latin locales (Arabic, CJK, Hebrew, Cyrillic, Thai) don't silently fall back to the OS font — the design bridge, wired at the same time as message catalogs, not as an afterthought. Use when "the Arabic/CJK text renders in the wrong font" or non-Latin glyphs ship missing (tofu).
---

# i18n-font-fallback

> **JTBD-9 — Cross-locale typography (the design bridge).** The Energy brand fonts don't cover non-Latin
> scripts, so shipping `ar/he/ja/ko/zh/th` silently falls back to the OS font — breaking the "no AI-slop"
> brand promise **specifically in the localized markets**. Own font fallback as a first-class i18n concern,
> not a design afterthought (`brain/OPINIONS.md` O24). **Boundary:** wire the fonts; never author the copy
> (`brain/KNOWN-PITFALLS.md` P29).

## Trigger

- "The Arabic/CJK/Hebrew text renders in the wrong font" / "non-Latin glyphs are missing (tofu/empty boxes)."
- A symptom: a localized market renders in a system font, not the brand font; the script isn't declared in
  `next/font` `subsets:` (the undeclared-subset trap, `brain/KNOWN-PITFALLS.md` P27).
- RTL readability degrades because the Arabic webfont was never wired (`brain/KNOWN-PITFALLS.md` P28).

## Steps

1. **Declare EVERY script you render in `next/font` `subsets:`** (`brain/KNOWN-PITFALLS.md` P27). `next/font`
   auto-subsets by `subsets:`; an undeclared script ships missing glyphs (tofu) for that locale. `parrot fonts
   --scripts latin,arabic,cjk` enumerates what to declare.
2. **Map the brand-font coverage gaps** (`brain/OPINIONS.md` O24, `brain/KNOWN-PITFALLS.md` P28):
   **Instrument Serif is Latin-only**; **Poppins covers Devanagari + Latin** but has **no** CJK / Arabic /
   Cyrillic-display / Thai / Hebrew. Those scripts MUST get a fallback.
3. **Wire Noto fallback stacks behind the brand fonts** — pair each brand font with `Noto Sans/Serif
   <script>` (`Noto Sans Arabic`, `Noto Sans CJK`, `Noto Sans Hebrew`, …) in the font stack so the brand font
   leads where it has glyphs and Noto fills the rest (`brain/OPINIONS.md` O24).
4. **Switch `dir` at the same time** (coordinate with `rtl-bidi-audit`) — wire `dir` switching together with
   the per-script font, so RTL locales get both the right direction and the right glyphs in one pass, alongside
   the message catalogs (`brain/OPINIONS.md` O24 — "at the same time as message catalogs").
5. **Verify with a real render** in each non-Latin locale — confirm no tofu, correct glyphs, and (for Arabic)
   that the webfont + Arabic-safe CSS (P13, from `rtl-bidi-audit`) cooperate. `parrot check`'s font-glyph leg
   asserts the declared subsets cover the rendered locales.

## Output

- The `next/font` config: every rendered script in `subsets:`, Noto fallback stacks behind the brand fonts,
  `dir` switching wired in the same pass.
- A coverage table (brand font × script → covered / Noto-fallback) and a real render proving no tofu.
- A note naming the trap dodged (P27/P28) with its detect signal.
- **Never** translated copy — this is typography plumbing (P29).

## Brain citation

`brain/EXPERTISE-MAP.md` JTBD-9 · `brain/OPINIONS.md` O24 (font fallback first-class) ·
`brain/KNOWN-PITFALLS.md` P27 (undeclared subset → tofu), P28 (brand fonts fall back), P13 (Arabic-safe CSS) ·
P29 (the boundary).
