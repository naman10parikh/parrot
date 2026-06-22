---
name: hreflang-seo-graph
description: Set up locale routing + the hreflang graph correctly — self-referencing canonicals (never canonical-to-.com), a reciprocal BCP-47 hreflang graph with exactly one x-default, detect-to-suggest (never geo-IP hard-redirect), and verification of the routing library's generated alternate slugs. Use when "set up locale routing" or "our localized pages vanished from Google".
---

# hreflang-seo-graph

> **JTBD-5 — Locale routing + hreflang SEO.** Wrong codes "work" but mis-target geography; a localized
> canonical pointing at the `.com` site **deletes your localized pages from the index faster than
> robots.txt**. Treat the hreflang set as a **CI-checked graph**, not markup that "looks valid"
> (`brain/OPINIONS.md` O14). **Boundary:** wire the routing + the graph; never author the page copy
> (`brain/KNOWN-PITFALLS.md` P29).

## Trigger

- "Set up locale routing / subdirectory vs subdomain" / "wire hreflang."
- A symptom: localized pages **dropped out of Google's index** after a canonical change (the canonical-to-.com
  trap, `brain/KNOWN-PITFALLS.md` P15 / `brain/OPINIONS.md` O13).
- Search Console reports the **wrong country** for a locale (the bad-ISO-code trap, P16 — `es-la`=Laos,
  `me`=Montenegro, `en-uk`≠`en-GB`).
- "non-self-referencing" / "no return tags" errors, or hreflang only on the homepage (the
  non-reciprocal/homepage-only trap, P17).
- A middleware that 30x-redirects by geo-IP/`Accept-Language` (the hard-redirect trap, P18 / O15).
- Generated `<link rel="alternate">` slugs don't match the real localized URLs (the library-drift trap, P19).

## Steps

1. **Choose the routing shape deliberately** — subdirectory is the default (`brain/OPINIONS.md` O13;
   `brain/BATTLE-TESTED-SCENARIOS.md` S10/S12); subdomain/ccTLD/cookie-only are documented alternatives with
   their costs, not silent defaults.
2. **Each localized page's `<link rel="canonical">` points to ITSELF** (`brain/OPINIONS.md` O13,
   `brain/KNOWN-PITFALLS.md` P15). **Never** point a localized canonical at the global `.com` page — that
   consolidates your own localized pages out of the index. Canonical and hreflang are **separate elements**
   (do not combine them in one tag — Google ignores that).
3. **Validate every locale code as BCP-47** (`brain/OPINIONS.md` O14, `brain/KNOWN-PITFALLS.md` P16,
   `brain/BATTLE-TESTED-SCENARIOS.md` S11): lowercase language, uppercase region — `en-GB`, `es-419`, `de-CH`.
   Reject `es-la` (Laos), `me` (Montenegro), `en-uk` (use `en-GB`; `uk` is Ukraine). This is the shared
   `src/lib/bcp47.ts` validator the `parrot check`/`parrot seo hreflang` legs use. Mind the **three locale-code
   conventions** (BCP-47 hreflang vs ICU-`select`-no-dashes vs the routing lib's slug).
4. **Build the hreflang set as a graph and CI-check it** (`brain/OPINIONS.md` O14, `brain/KNOWN-PITFALLS.md`
   P17): every node **self-references**, every edge is **bidirectional** (A↔B — non-reciprocal annotations are
   ignored), exactly **one `x-default`**, on **every** localized page (homepage-only doesn't extrapolate),
   one element per URL. `parrot seo hreflang --json` emits the graph errors; the `parrot check` hreflang leg
   red-blocks on any.
5. **Detect-to-SUGGEST, never hard-redirect** (`brain/OPINIONS.md` O15, `brain/KNOWN-PITFALLS.md` P18). Offer
   a locale via a banner + cookie; keep **every** locale reachable by URL. A geo-IP/`Accept-Language` 30x
   redirect means Googlebot (US) only ever sees US content and shared links break. Detection (suggest) ≠
   routing (URL).
6. **Verify the routing library's generated alternate slugs** (`brain/KNOWN-PITFALLS.md` P19) — next-intl
   `Link` has emitted **wrong** alternates (#2334) and broken locale switching under `output: 'export'`
   (#2332). Don't assume the wrapper is correct; diff the generated `<link rel="alternate">` against the
   actual localized URLs, and avoid (or explicitly test) `output: 'export'` + i18n routing per release.

## Output

- The routing config (shape chosen + why) + the hreflang/canonical emission, with: self-referencing
  canonicals, a reciprocal BCP-47 graph, exactly one `x-default`, a detect-to-suggest banner (not a redirect).
- A `parrot seo hreflang` / `parrot check` graph report (pass, or the specific graph errors).
- A diff of the library's generated alternates vs the real URLs (proving P19 was checked).
- A note naming each trap dodged (P15–P19) with its detect signal.
- **Never** the localized page copy itself — that's content authoring (P29).

## Brain citation

`brain/EXPERTISE-MAP.md` JTBD-5 · `brain/OPINIONS.md` O13 (self-ref canonical), O14 (hreflang graph + BCP-47),
O15 (detect-to-suggest) · `brain/KNOWN-PITFALLS.md` P15 (canonical-to-.com), P16 (bad ISO codes), P17
(non-reciprocal), P18 (hard-redirect), P19 (library slug drift) · `brain/BATTLE-TESTED-SCENARIOS.md` S10, S11,
S12 · P29 (the boundary).
