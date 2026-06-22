---
name: icu-message-authoring
description: Author and lint ICU MessageFormat messages (plural / selectordinal / select) so they are correct in many-category languages, never concatenated, and free of the dash + apostrophe traps — reaching for native Intl.* for everything CLDR knows. Use when writing or fixing a plural/select message, or when a string "is wrong in Polish/Arabic/Russian" but looks fine in English.
---

# icu-message-authoring

> **JTBD-2 — Author ICU MessageFormat (the grammar engine).** This is where the bugs that are **invisible in
> English** live: a message with only `one`/`other` renders the *wrong* form silently in Polish (4 categories)
> and Arabic (6). The cardinal rule of the whole corpus: **write the full sentence, never concatenate**
> (`brain/OPINIONS.md` O8). **Boundary:** author the *message structure*; never author the marketing/prose
> copy that fills it (`brain/KNOWN-PITFALLS.md` P29).

## Trigger

- "Write / fix this plural (or select) message" / "make this string work in Polish/Arabic."
- A symptom: plurals look right in English but a `pl`/`ar`/`ru` reviewer reports the **wrong word form** for
  count = 2 or 5 (the missing-category trap, `brain/KNOWN-PITFALLS.md` P6 — Polish is the canary).
- An ICU **parse error** on a `select` whose values are locale codes (the dash trap, P7).
- A FormatJS `INVALID_TAG` on valid English, or apostrophe-heavy languages rendering with missing/extra
  braces (the apostrophe-escape lossiness, P8 / S8).
- A sentence built from `t('a') + count + t('b')` (the #1 anti-pattern, P9 / S14).

## Steps

1. **Resolve the target language's plural categories from CLDR**, not from English. Use native
   `Intl.PluralRules(locale, { type })` (`brain/OPINIONS.md` O9). Polish needs `one/few/many/other`; Arabic
   needs `zero/one/two/few/many/other`; Czech needs 3. Author **a branch for every category the target uses**
   (`brain/KNOWN-PITFALLS.md` P6). `parrot icu "<msg>" --locale pl` warns on missing categories.
2. **Write the full sentence with ICU interpolation — NEVER concatenate fragments** (`brain/OPINIONS.md` O8,
   `brain/KNOWN-PITFALLS.md` P9, `brain/BATTLE-TESTED-SCENARIOS.md` S14). Rewrite
   `t('itemsA') + count + t('itemsB')` into one message:
   `{count, plural, one {# item in cart} few {# items in cart} many {# items in cart} other {# items in cart}}`.
   Fragments break word order, gender agreement, declension, and plural-in-context in most languages.
3. **Dodge the dash trap (P7):** ICU value names and `select` values are **alphanumeric + underscore only**.
   Before putting a locale into a `select`, `locale.replaceAll('-', '_')` (`en-GB` → `en_GB`). A raw dash is an
   ICU parse error.
4. **Dodge the apostrophe trap (P8 / S8):** ICU uses single quotes to escape literal braces, so a normal
   apostrophe (French `l'`, English `it's`) can accidentally open/close an escape. Escape robustly, avoid
   `<...>`-shaped literals (FormatJS round-trips them lossily → `INVALID_TAG`), and **do not delete the
   string** to make the error go away — fix the escaping. Test the round-trip in an apostrophe-heavy locale.
5. **Reach for native `Intl.*` for everything CLDR knows** (`brain/OPINIONS.md` O9): `NumberFormat`,
   `DateTimeFormat`, `ListFormat` (never `arr.join(', ')` — that hardcodes English list grammar, P10),
   `DisplayNames`. Pick **one numbering system per interface** (don't mix ٠١٢ and 012 — P14).
6. **Give every string a `description`/context field** (`brain/OPINIONS.md` O10) — a lone `"Open"` is verb vs
   adjective; short microcopy is *higher*-risk than the portfolio average. This context is also what the
   `mt-tms-governance` pipeline requires before any MT.
7. **Assert distinct strings for count = 0, 1, 2, 5 in `pl`/`ar`/`ru`** (`brain/OPINIONS.md` O7/O23). If
   English collapses two counts to the same form, that is not proof — the eval must show they differ in a
   many-category language.

## Output

- The corrected ICU message(s): one message per **full sentence**, every plural category the target needs, a
  `description`/context field, dashes converted to underscores in any `select`, apostrophes escaped.
- A short note naming which trap was hit (P6/P7/P8/P9) with its detect signal, and the
  `Intl.PluralRules`-derived category list for the target language.
- For a verification claim: the distinct count = 0/1/2/5 strings in at least one many-category language.
- **Never** the authored marketing/prose copy itself — that's content authoring (P29).

## Brain citation

`brain/EXPERTISE-MAP.md` JTBD-2/JTBD-3 · `brain/OPINIONS.md` O7 (test many-plural), O8 (full sentence), O9
(native Intl), O10 (context field) · `brain/KNOWN-PITFALLS.md` P6 (categories), P7 (dash), P8 (apostrophe),
P9 (concatenation), P10 (ListFormat), P14 (one numbering system) · `brain/BATTLE-TESTED-SCENARIOS.md` S3, S8,
S14 · P29 (the boundary).
