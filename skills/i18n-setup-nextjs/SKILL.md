---
name: i18n-setup-nextjs
description: Wire next-intl into a Next.js App-Router app correctly the first time — the four load-bearing files, version-detected middleware (proxy.ts on Next 16), setRequestLocale in every static page, await params, and a deliberate localePrefix. Use when the task is "set up i18n / wire next-intl on this Next app", or when localized pages render in the wrong (default) locale with no error.
---

# i18n-setup-nextjs

> **JTBD-1 — Wire i18n correctly first time.** The setup footguns are silent: they throw no error, they
> just render the wrong locale. This skill encodes the exact files + the version-specific traps so the wiring
> is correct on day one (i18n is "one of the most painful refactors to retrofit late" — `brain/OPINIONS.md` O2).
> **Boundary:** this skill wires the *pipeline*; it never authors the copy (`brain/KNOWN-PITFALLS.md` P29).

## Trigger

- "Wire i18n / set up next-intl on this Next app" / "add localization to this project."
- A symptom report: `/de/...` (or any non-default locale) pages render in **English** with **no build or
  runtime error** — the classic `setRequestLocale` omission (`brain/KNOWN-PITFALLS.md` P1).
- Locale prefixing / redirects do nothing on a Next-16 app (the `middleware.ts`-ignored trap, P2).
- A `params` type error or runtime crash reading `locale` (the un-awaited-Promise trap, P3).

## Steps

1. **Detect the Next.js major version FIRST** (`package.json` / `next --version`). The middleware filename
   depends on it (`brain/KNOWN-PITFALLS.md` P2): **Next 16 → `src/proxy.ts`**; Next 15 and earlier →
   `src/middleware.ts`. A `middleware.ts` on Next 16 is **silently ignored** — routing does nothing. This is
   the single most important branch in the whole setup.
2. **Write the four load-bearing next-intl files** (`brain/BATTLE-TESTED-SCENARIOS.md` S1/S2/S9, the
   `brain/research/raw/ecosystem-03` load-bearing flow):
   - `src/i18n/routing.ts` — `defineRouting({ locales, defaultLocale, localePrefix })`. Choose
     `localePrefix` **deliberately** (`'always'` default; `'as-needed'`; `'never'` for cookie-only
     multi-tenant — S9). Do not accept the silent default without a reason.
   - `src/i18n/request.ts` — `getRequestConfig` loading `messages/${locale}.json`.
   - the middleware file from step 1 (`proxy.ts` **or** `middleware.ts`) — `createMiddleware(routing)`.
   - `src/i18n/navigation.ts` — `createNavigation(routing)` (the locale-aware `Link`/`redirect`).
3. **Codegen `setRequestLocale(locale)` into EVERY static page AND layout** under `app/[locale]/`
   (`brain/KNOWN-PITFALLS.md` P1; `brain/OPINIONS.md` references). Call it **after `await params`, before any
   `useTranslations`/`getMessages`**. Omitting it in even one static page makes that page render
   `defaultLocale` regardless of the URL — invisibly. This is a presence-assertable invariant (the eval and
   `parrot check` both assert it).
4. **`await params` in every `[locale]` page/layout** — on Next 15+, `params` is `Promise<{locale}>`
   (`brain/KNOWN-PITFALLS.md` P3): `const { locale } = await params;`. Using it unawaited is a type error /
   runtime crash.
5. **Set `<html lang={locale} dir={...}>`** in the locale layout so RTL locales (`ar`/`he`) get `dir="rtl"`
   from the start (sets up the RTL work the `rtl-bidi-audit` skill verifies).
6. **Wire per-script font fallback at the same time** (`brain/KNOWN-PITFALLS.md` P27/P28) — do NOT defer it.
   The Energy brand fonts are Latin-only/no-CJK-Arabic; non-Latin locales silently fall back to the OS font.
   Hand off the detail to the `i18n-font-fallback` skill but seed `next/font` `subsets:` now.
7. **Run `parrot check --locales en,<a-many-plural>,<an-rtl>`** to prove the wiring (key-completeness +
   `setRequestLocale`-presence + the version-correct middleware leg). Never declare it done from English alone
   (`brain/OPINIONS.md` O23).

## Output

- A diff that adds the four files (with the **version-correct** middleware filename), `setRequestLocale` in
  every static page, `await params` everywhere, a deliberate `localePrefix`, and `<html lang/dir>`.
- A one-paragraph note stating: the detected Next version, which middleware file it implied, and which
  footguns (P1/P2/P3) were specifically dodged — with their detect signals, so a reviewer can re-check.
- A passing `parrot check` (or the explicit list of remaining failures).
- **Never** translated copy — if the task drifts to "write the German strings," hand off (P29).

## Brain citation

`brain/EXPERTISE-MAP.md` JTBD-1 · `brain/KNOWN-PITFALLS.md` P1 (setRequestLocale), P2 (proxy.ts on Next 16),
P3 (await params), P27/P28 (font fallback) · `brain/BATTLE-TESTED-SCENARIOS.md` S1, S2, S9 ·
`brain/OPINIONS.md` O2 (wire day-1), O23 (never "done" from English) · P29 (the boundary).
