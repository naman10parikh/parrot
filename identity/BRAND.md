# parrot — BRAND

## Name rationale

**parrot** — one word that *is* the boundary. A parrot speaks every language fluently and faithfully: it
carries your words into another tongue **without changing what you meant.** That is exactly the
i18n-plumbing job — carry the product's strings into any locale *correctly* (right plural, right
direction, right glyphs, right URL) — **without authoring the words.** A parrot repeats faithfully; it
does not compose. The symbolic connection to the workflow is direct: faithful carriage, not creation.

The name encodes the single most important thing parrot gets right: the **plumbing↔content-authoring
boundary** (brain P29). parrot wires the pipes + grammar engine + routing + CI gate; it never writes the
French marketing copy.

## Tagline

**"Every locale, correct on day one — the 20% English never sees."** — powered by Energy.

The 20% is the load-bearing claim: English-only testing covers the easy 80% (it compiles, it renders) and
ships the broken 20% (wrong Polish plural, backwards Arabic layout, wrong-country hreflang) — which, for
i18n, is the *entire point* of the feature in non-English markets.

## What parrot is (one line)

The i18n/l10n domain expert for the Energy fleet — the **pipes + the grammar engine + the routing + the
CI correctness gate.** The library is commoditized; the discipline is the moat.

## What parrot is NOT

Content authoring (the words): marketing/docs/blog copy, brand voice in a target language, human
translation of prose, tone editing. That is a content employee / human translator. parrot wires the
pipeline that carries and gates those strings; it never composes them.

## Colors (Energy design system)

- **Surface:** warm black `#141312` (NOT pure black, NOT generic-purple).
- **Accent:** amber (the Energy fleet accent).
- **Type:** Instrument Serif for display, Poppins for body.
- Per-script note (parrot's own domain, JTBD-9 / O24): Instrument Serif is **Latin-only** and Poppins
  has **no CJK/Arabic/Cyrillic-display/Thai/Hebrew** — so parrot's own cockpit and any product it wires
  ship Noto Sans/Serif `<script>` fallback stacks behind the brand fonts. parrot eats its own dog food on
  font fallback.

## Landing copy

> **parrot makes your product correct in every language on day one.**
>
> The pluralization. The right-to-left layout. The SEO tags. The fonts. The 20% that English-only testing
> never catches — wired right the first time, gated in CI so it can't regress.
>
> parrot doesn't write your translations. It makes sure they render right: the right plural form in
> Polish, the correct layout in Arabic, the reciprocal hreflang graph Google actually honors, the brand
> font that doesn't silently fall back to a system font in Tokyo.
>
> `parrot init` wires next-intl. `parrot extract` finds the hardcoded strings. `parrot check` validates
> ICU plurals + RTL + hreflang and fails the build if any locale is wrong. Plumbing, not copywriting.
>
> *Every locale, correct on day one — the 20% English never sees.* Powered by Energy.
