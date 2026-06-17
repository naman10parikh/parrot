---
title: "Ecosystem Research — Official Docs Deep-Dive on Load-Bearing Flows (i18n)"
type: source
created: 2026-06-17
tags: [i18n, docs, next-intl, icu, messageformat, routing, middleware, rsc, rich-text, plural]
sources: ["next-intl.dev/docs/getting-started/app-router/with-i18n-routing", "next-intl.dev/docs/usage/messages", "formatjs.github.io/docs/core-concepts/icu-syntax"]
summary: "Crawled the load-bearing official flows: next-intl App-Router wiring (proxy.ts/middleware, routing.ts, [locale] layout + setRequestLocale, createNavigation), the full ICU MessageFormat spec (plural/select/selectordinal/skeletons), and next-intl's rich-text/markup/raw + RTL guidance. Exact code + the warnings that bite."
---

# Official Docs Deep-Dive — The Flows That Bite (June 2026)

> Crawled 2026-06-17 (next-intl docs "Last updated March 13, 2026"). Exact code + file paths.

## A. next-intl App-Router wiring — the 4 load-bearing files

### A1. The middleware — NOTE THE FILE RENAME (Next.js 16)
> **MAJOR 2026 GOTCHA:** next-intl's docs now show the middleware file as **`src/proxy.ts`**, with the note *"(formerly `middleware.ts` in Next.js <16)"*. **Next.js 16 renamed `middleware.ts` → `proxy.ts`.** An agent generating `middleware.ts` on a Next 16 project will produce a file the framework ignores.

```typescript
// src/proxy.ts  (was middleware.ts pre-Next-16)
import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)'
};
```
- `createMiddleware(routing)` matches locales, does prefix-based or domain-based routing, and **attaches an `x-next-intl-locale` header** carrying the negotiated locale. The `matcher` excludes `api`, `_next`, static files (`.*\\..*`).
- The docs did NOT spell out the cookie/header detection *order* on this page — but next-intl's negotiation is: explicit URL prefix → `NEXT_LOCALE` cookie → `Accept-Language` header → `defaultLocale`. (Confirm the exact order per version; it's the standard CLDR/RFC-4647 negotiation, but flag it as version-sensitive.)

### A2. The routing config
```typescript
// src/i18n/routing.ts
import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'de'],
  defaultLocale: 'en'
  // localePrefix: 'always' | 'as-needed' | 'never'   (see below)
});
```
- **`localePrefix` options (the strategy knob):**
  - `'always'` — every locale gets a prefix (`/en/about`, `/de/about`). Cleanest, default-locale also prefixed.
  - `'as-needed'` — default locale has NO prefix (`/about` = en, `/de/about` = de). Most common for SEO.
  - `'never'` — no prefix at all; locale via cookie only (the multi-tenant / "no locale in URL" case from issue #366). Pair with the `example-app-router-without-i18n-routing`.
- Per-domain `localePrefix` override exists since v4.10.0 (different strategy per domain).

### A3. The `[locale]` layout — WHERE `setRequestLocale` LIVES (the #1 footgun)
```typescript
// src/app/[locale]/layout.tsx
import {NextIntlClientProvider, hasLocale} from 'next-intl';
import {notFound} from 'next/navigation';
import {setRequestLocale} from 'next-intl/server';
import {routing} from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));   // pre-render every locale
}

export default async function LocaleLayout({children, params}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;   // NOTE: params is a PROMISE in Next 15+
}) {
  const {locale} = await params;          // must await — async params (Next 15 breaking change)
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);               // <-- REQUIRED for static rendering
  return (/* ... NextIntlClientProvider ... */);
}
```
- **THE WARNING (verbatim from docs):** *"setRequestLocale needs to be called before you invoke any functions from next-intl like useTranslations or getMessages,"* and it is required in *"every page and every layout that you intend to enable static rendering for"* because Next.js renders them independently.
- **Two stacked Next-15 breaking changes are visible here:** (1) `params` is now a `Promise` you must `await` (issue #1587), (2) `setRequestLocale` per static page/layout (issue #663). Miss #1 → type error / runtime crash; miss #2 → silently renders the default locale with no error.

### A4. Locale-aware navigation
```typescript
// src/i18n/navigation.ts
import {createNavigation} from 'next-intl/navigation';
import {routing} from './routing';

export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
```
- Always import `Link`/`redirect`/`useRouter` from THIS module, not from `next/link` / `next/navigation`, or you lose locale-prefixing. This is a subtle, easy-to-miss correctness rule for an agent.

## B. ICU MessageFormat — the full spec (the actual i18n "language")
Both next-intl AND react-intl/FormatJS use **ICU MessageFormat** (Unicode standard). Learning ICU once transfers across all three. next-intl resolves plural categories via **native `Intl.PluralRules`** (auto-loads CLDR in evergreen runtimes — this is why modern next-intl avoids the old FormatJS `addLocaleData` plural bug from issue #1013).

### B1. Interpolation
```
"message": "Hello {name}!"
```
- **GOTCHA:** value names must be **alphanumeric + underscore only**. Dashes are NOT allowed. So mapping a *locale* into a `select` requires `locale.replaceAll('-', '_')` first (e.g. `en-GB` → `en_GB`).

### B2. Cardinal plural (the load-bearing one)
```
"message": "You have {count, plural, =0 {no followers yet} =1 {one follower} other {# followers}}."
```
- `#` = the number, auto-formatted (3580 → "3,580").
- `=N` exact match takes precedence over category tags.
- **Category tags: `zero`, `one`, `two`, `few`, `many`, `other`** (`other` is the required fallback).
- **The critical correctness fact (verbatim from docs):** *"English has two forms… Chinese only has one form, while Arabic has six."* The exact range of `few`/`many` varies by locale per the Unicode CLDR. **You must author a translation for every category the target language uses, or the renderer falls to `other` and produces grammatically wrong text** (the silent failure from issue #1013).

### B3. Ordinal plural
```
"message": "It's your {year, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} birthday!"
```
- English: 1st/2nd/3rd/4th (4 forms). Chinese & Arabic: 1 form. `=N` overrides.

### B4. Select (enum → label)
```
"message": "{gender, select, female {She is} male {He is} other {They are}} online."
```
- `other` required. Values alphanumeric+underscore only (same dash caveat as B1).

### B5. Number/date/time skeletons (FormatJS ICU `::` skeleton syntax)
- Number: `{key, number, ::sign-always compact-short currency/GBP}`; precision `{num, number, ::.00}`.
- Date: `{start, date, medium}`. Time: `{expire, time, short}`.
- next-intl also exposes these via `useFormatter()` + named formats in config (recommended over inline skeletons for reuse).

### B6. Escaping
- Wrap literal braces in single quotes: `"Escape with single quotes (e.g. '{name}')"` → renders `{name}` literally. **GOTCHA:** a stray apostrophe in normal prose (e.g. French `l'`) can accidentally start an escape — a classic ICU bug in apostrophe-heavy languages.

## C. Rich text & raw HTML (next-intl `t.rich` / `t.markup` / `t.raw`)
This is the surface that maps to the fragile react-i18next `<Trans>` type pain (issue #1543) — next-intl's `t.rich` is the cleaner equivalent.
```jsonc
// message with tags
{ "message": "Please refer to <guidelines>the guidelines</guidelines>." }
```
```tsx
t.rich('message', { guidelines: (chunks) => <a href="/guidelines">{chunks}</a> });
```
- Tags can nest arbitrarily. **Attributes can only be set at the call site, NOT in the message** — so a translator can't inject an `href`; you pass it in code (good for security, a constraint to know).
- Self-closing needs a closing tag in the message for the ICU parser: `"...<br></br>..."` → `{ br: () => <br/> }`.
- `t.markup` → returns a **string** (chunks are strings), for raw-HTML-string output.
- `t.raw` → bypasses parsing entirely, returns the raw JSON value. **Docs warning (verbatim):** *"You should always sanitize the content that you pass to `dangerouslySetInnerHTML` to avoid cross-site scripting attacks."* — i.e. `t.raw` + `dangerouslySetInnerHTML` is an XSS footgun an agent must guard.

## D. RTL — what the docs say "proper" requires (3 things, not 1)
From next-intl's RTL section (verbatim list):
1. Provide the **`dir` attribute** where relevant (i.e. `<html dir={rtl ? 'rtl' : 'ltr'}>`).
2. **Layout mirroring** via **CSS logical properties** (`margin-inline-start` not `margin-left`, etc.).
3. **Element mirroring** — e.g. flipping directional icons (back-arrows, chevrons).
- **parrot taste finding:** "translate the strings" is the *easy 1/3* of RTL. The hard 2/3 (logical-property CSS + icon mirroring) is exactly what breaks the Energy warm-black/amber bento layout in `ar`/`he`. This is where parrot's domain meets Energy's design rules — see ecosystem-06.

## E. Misc load-bearing next-intl APIs an agent should know
- `getTranslations('ns')` (async) = Server-Component twin of `useTranslations('ns')` (hook, client). Using the wrong one in the wrong environment is a common error.
- **Translations outside React components are deliberately restricted** — only allowed in **Server Actions, Metadata, Route Handlers** (via the `actions-metadata-route-handlers` API). next-intl pushes you to consume translations *inside* components on purpose; an agent fighting this is fighting the library's design.
- `t.has('key')` checks message existence for the current locale (for optional/locale-varying messages).
- Message keys: namespace separator is `.` — keys themselves **cannot contain `.`**. Recommend ID-style keys over human-readable sentences (use VSCode integration to see readable labels).
- **Static validation:** next-intl has a `workflows/messages` validation path (and the ecosystem `@lingual/i18n-check` CLI) to catch missing/unused keys at build — wire it in CI (see ecosystem-02 ixartz pattern).
