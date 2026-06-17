---
title: "Field Intel: Locale-routing & i18n SEO mistakes (hreflang, URL structure)"
type: source
created: "2026-06-17"
updated: "2026-06-17"
tags: [i18n, field-intelligence, seo, hreflang, locale-routing, url-structure, next-intl]
sources:
  - "https://www.searchenginejournal.com/hreflang-implementation-mistakes/240451/ (SEJ, the 10 misconceptions)"
  - "https://www.stackmatix.com/blog/international-seo-for-global-startups"
  - "https://www.weglot.com/guides/subdirectory-vs-subdomain"
  - "next-intl issues #2334, #2332 (field-01)"
summary: "The concrete locale-routing SEO mistakes that tank international rankings: non-reciprocal hreflang, wrong ISO codes (es-la=Laos, me=Macedonia), canonical-vs-hreflang conflicts, x-default omission, homepage-only hreflang, and the subdir-vs-subdomain-vs-ccTLD decision — cross-referenced with next-intl's own routing bugs."
---

# Field Intel: Locale-routing & SEO mistakes

Source: [Search Engine Journal — Hreflang: The 10 Biggest Misconceptions](https://www.searchenginejournal.com/hreflang-implementation-mistakes/240451/)
+ [Stackmatix — International SEO for startups](https://www.stackmatix.com/blog/international-seo-for-global-startups).
Cross-referenced with next-intl's *own* shipped routing bugs (field-01: #2334 wrong alternate slugs, #2332
static-export locale switching).

## The hreflang mistake list (each tanks rankings silently)

1. **Non-reciprocal / missing return tags.** If page A links to B via hreflang, **B must link back to A** or
   Google ignores the annotation entirely. The #1 hreflang bug. Reciprocity must be machine-verified.
2. **Wrong language/region ISO codes — the deadliest because it "works":**
   - `es-la` → people think "Latin America"; **`la` is Laos.**
   - `me` → people think "Middle East"; **`me` is Montenegro/Macedonia region code, not a language.**
   - `en-uk` is **wrong** — the country code is **`en-GB`** (`uk` is Ukraine).
   Search engines interpret codes *literally* → site associated with the wrong geography. Use BCP-47 correctly:
   `language-REGION` (lowercase lang, uppercase region).
3. **Combining `canonical` + `hreflang` in one tag** — `<link rel="canonical" hreflang="en-IE" ...>` is
   **ignored.** They must be separate elements.
4. **Canonical pointing to the global/.com site** while keeping localized pages → canonical consolidation
   *"will remove your local language pages"* faster than robots.txt. **Each localized page's canonical must point
   to itself.** This is the single most destructive SEO mistake — you delete your own localized pages from the
   index.
5. **Missing self-referencing hreflang** → "non-self-referencing errors" in Search Console; breaks reciprocity.
   Every page must list *itself* in its hreflang set.
6. **Missing `x-default`** → Google guesses which version to show users in unspecified markets. Always include
   `<link rel="alternate" hreflang="x-default" ...>`.
7. **Homepage-only hreflang** — assuming Google extrapolates to subpages. It doesn't; *every* localized page
   needs its own annotation.
8. **Multiple codes in one tag** — `hreflang="es-ES;fr;fr-BE"` → *"No, this does not work."* One element per URL.
9. **Skipping hreflang on ccTLDs** in multilingual markets (Switzerland: de/fr/it; Belgium: nl/fr) — the ccTLD
   alone can't disambiguate *language*.
10. **URL drift between locales** — *"Mismatched URL casing, trailing slashes, or subtle parameter drift between
    locales are tiny inconsistencies that cause hreflang sets to fall apart."* (Exactly next-intl issue #2334:
    `Link` emitting *wrong* alternate slugs, and #2332: locale switch broken under `output: 'export'`. The
    library can introduce drift you didn't write.)

## URL structure decision (subdir vs subdomain vs ccTLD)

- **Default for startups: subdirectories** (`example.com/fr/`) — they **inherit the root domain's authority.**
  ccTLDs (`example.fr`) require *building authority from scratch per country.* Subdomains (`fr.example.com`) sit
  in between and are treated as more separate by Google.
- **Verbatim guidance:** *"Choose subdirectories by default, add an x-default, and keep self-referencing
  canonicals per language to avoid duplicate-content issues."*
- **ccTLDs only when** you have legal/brand/market reasons and the budget to build per-country authority.

## Locale-detection vs locale-routing (the conflation bug)
- **Routing** = which URL serves which locale (the SEO concern above).
- **Detection** = picking a locale for a user with no explicit choice (Accept-Language header, cookie, geo-IP).
- **The bug:** auto-*redirecting* based on geo-IP/Accept-Language hurts SEO (Googlebot crawls from US → only
  sees US content; users can't reach other locales via a shared link). Best practice: **detect to *suggest*
  (banner/cookie), never hard-redirect the crawler.** next-intl only shipped a *configurable* detection pipeline
  (cookie/header/callback) in 2026 (issue #2305) — before that teams hand-rolled middleware and frequently got
  the redirect-vs-suggest distinction wrong.

**SEO meta-lesson:** i18n SEO failure is almost always (a) a *reciprocity/consistency* bug in the hreflang graph
or (b) a *canonical pointing away from the localized page* — both silent, both delete or mis-rank your localized
content. Treat the hreflang set as a graph with a CI check: every node self-references, every edge is
bidirectional, every code is valid BCP-47, exactly one `x-default`.
