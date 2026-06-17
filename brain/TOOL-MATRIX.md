---
title: "parrot TOOL-MATRIX — canonical i18n tools, default vs alts, agent-access surface, required secrets"
type: synthesis
domain: i18n
created: 2026-06-17
updated: 2026-06-17
tags: [tool-matrix, next-intl, i18next, formatjs, lingui, tolgee, crowdin, lokalise, lingo.dev, mcp, cli, secrets, parrot, cp123]
sources: ["brain/research/raw/ecosystem-05-tradeoff-matrix-libraries.md", "brain/research/raw/ecosystem-09-agent-operating-clis-apis-mcp.md", "brain/research/raw/ecosystem-01-versions-and-changelogs.md", "brain/research/raw/ecosystem-02-starter-repos.md", "brain/research/raw/ecosystem-03-docs-deepdive-loadbearing-flows.md", "brain/research/raw/field-02-rtl-bidi-and-mt-quality.md", "brain/research/raw/field-03-at-scale-grammar-migration-hn-taste.md", "brain/research/raw/field-05-disputes-and-2026-shifts.md"]
related: ["[[parrot EXPERTISE-MAP]]", "[[parrot OPINIONS]]", "[[parrot KNOWN-PITFALLS]]", "[[parrot GAPS-AND-DISPUTES]]"]
summary: "The canonical tool per i18n category — DEFAULT vs alternatives, when-to-use-which, the agent-access surface (CLI/MCP/SDK), and the env vars/secrets each needs. The secrets column feeds the Required-Secrets manifest. Decisions, not feature tables — every alt names the honest cost the marketing hides."
---

# parrot TOOL-MATRIX

> Per category: the **DEFAULT**, the **alternatives** (with the honest cost the marketing hides), the **agent
> surface** (can a headless parrot agent drive it — CLI/MCP/SDK?), and the **secrets** it needs. The secrets
> column is the source for the **Required-Secrets manifest** below. Secret names follow the repo's
> `.env.example` conventions (`<VENDOR>_<PURPOSE>`). All versions/downloads are live as of 2026-06-17. For the
> full decision logic see [[parrot OPINIONS]]; for gotchas per tool see [[parrot KNOWN-PITFALLS]].

---

## Category 1 — Runtime i18n library (the message catalog + ICU + routing)

**DEFAULT: next-intl (`^4`, currently 4.13.0)** for a new Next.js product — specifically because it's the most
RSC-mature OSS option. The Energy checklist names it; the RSC reason makes it correct, not inertia. Source:
`ecosystem-05` §verdict; `ecosystem-04` §A.

| Tool | Pick when | Honest cost / limit | Agent surface | Weekly DL |
|---|---|---|---|---|
| **next-intl** `^4` ★default | greenfield Next.js, RSC, accept bundle+`setRequestLocale` tax | ships ALL messages to client (tree-shaking #1, OPEN); `setRequestLocale` boilerplate (#663); parallel/intercepted-route conflict (#255); Next-16 `cacheComponents` unsettled (#1493/#2074); **single-maintainer** (bus-factor 1) | runtime lib (file-driven); official `examples/` are drift-free | 3.83M |
| **i18next** `^26` + **react-i18next** `^17` | multi-framework / React Native / plugin ecosystem / max stability | `<Trans>`+React-18 typing fragile (#1543, 88c); typed-keys OOM lint on big catalogs (#1883); RSC is DIY; ~6 KB heavier | runtime lib; **`gtrias/i18next-mcp-server`** MCP for code-side | 18.99M / 13.59M |
| **react-intl** (FormatJS) `^10` / `@formatjs/intl` `^4` | linguistically complex (heavy plural/gender/ordinal) or ICU-standard mandate | ~20 KB ("overkill for simple"); native-NAPI `@formatjs/cli` rewrite caused 2026 perf cliffs + dropped platforms; extract-vs-build divergence | runtime lib + `@formatjs/cli` extract/compile | 3.45M |
| **@lingui/core** `^6` + `@lingui/macro` | bundle size paramount + mainstream bundler + will own CI compile step | **build-tool coupling = existential risk** (Babel/SWC plugin REQUIRED, #1224); ESM-only since v6; RSC late+macro-awkward | runtime ~2KB + `@lingui/cli` | 1.35M |
| **Intlayer** `^8` | greenfield, want AI-translate + tree-shaking + types in one, OK being early | opinionated co-located model (restructure a JSON app); single-maintainer; small SO corpus; young | build-time compiler + built-in AI translate | 72K (rising) |
| **next-international** | (borrow the TS-native-locale-files idea only) | **stale — last push 2024-10**, predates Next 15 async params / Next 16 `cacheComponents` | runtime lib | small |
| **typesafe-i18n** | avoid for new work | stale since 2023 + **NON-ICU format = lock-in** | runtime ~1KB | small |

- **The dist-tag trap (both react-i18next + react-intl):** `@next` points to an OLDER alpha than `@latest`
  (`react-i18next@next` = 10.0.0-alpha vs `@latest` 17.x; `react-intl@next` = 5.0.4-alpha vs `@latest` 10.x).
  `npm i pkg@next` to "get newest" *downgrades*. Always resolve the actual semver. Source: `ecosystem-01` §3.
- **Secrets:** none — these are runtime libraries, file-driven. (next-intl ships anonymous telemetry; disable
  it for privacy-sensitive products — a config setting, not a secret.) Source: `ecosystem-09` §E (1).
- **Pitfalls:** P1 (`setRequestLocale` everywhere), P2 (`proxy.ts` on Next 16), P3 (`await params`), P4
  (dist-tag trap), P11 (Lingui bundler coupling). See [[parrot KNOWN-PITFALLS]].

## Category 2 — ICU MessageFormat authoring + the native Intl API

**DEFAULT: ICU MessageFormat 1 (via the chosen library) + native `Intl.*` for all formatting.** ICU MF1 is the
gravitational center; native `Intl` is CLDR-correct and free. **Do NOT adopt MessageFormat 2 yet.** Source:
`ecosystem-03` §B; `field-03` §C.

| Construct | Tool | Pick when | Agent surface |
|---|---|---|---|
| **plural / selectordinal / select** ★ | ICU MF1 (library-native) | always — the standard message grammar | author in JSON/PO; lint with `i18n-check` |
| **plural category resolution** ★ | `Intl.PluralRules` (native) | always — modern next-intl delegates here (avoids #1013) | runtime |
| **number / currency / unit / numbering system** ★ | `Intl.NumberFormat` (native) | all numeric formatting | runtime |
| **date / time / calendar / timezone** ★ | `Intl.DateTimeFormat` (native) | all temporal formatting | runtime |
| **list joining** ★ | `Intl.ListFormat` (native) | NEVER string-join `", "` + `" and "` | runtime |
| **language/region/currency display names** | `Intl.DisplayNames` (next-intl `useFormatter().displayName` ≥v4.11.0) | localized labels for locales/currencies | runtime |
| **MessageFormat 2 (`Intl.MessageFormat`)** | ⚠️ **WATCH-LIST only** | brand-new project with complex gender×plural AND willing to run without mainstream tooling | TC39 Stage 2; `i18next-mf2` ~6-10 DL/wk |

- **parrot rules:** ICU value/`select` names are **alphanumeric+underscore only** (`en-GB`→`en_GB`); escape
  literal braces with single quotes (watch the French `l'` apostrophe trap); prefer `useFormatter()` + named
  formats over inline `::` skeletons for reuse; **MF1 default, MF2 watch-list** (no TMS supports MF2, zero
  production case studies, "Most teams: no, not yet"). Source: `ecosystem-03` §B; `field-03` §C.
- **Secrets:** none (spec + runtime).
- **Pitfalls:** P5 (plural CLDR-data / many-category languages), P6 (dash-in-ICU-value), P7 (apostrophe
  escape), P15 (MF2 premature). See [[parrot KNOWN-PITFALLS]].

## Category 3 — Translation Management System (TMS) sync

**DEFAULT: Crowdin** (Energy checklist names it; 241K/wk CLI, dominant TMS-sync) for a managed TMS —
**but it needs a JRE.** Lokalise if you want a no-JRE Go binary; Tolgee for OSS self-host; Lingo.dev for the
agent-native AI-translate-in-CI flow. Source: `ecosystem-00` §1; `ecosystem-09` §C; `ecosystem-01` §1.

| Tool | Pick when | Honest cost / limit | Agent surface |
|---|---|---|---|
| **Crowdin** (`@crowdin/cli` `^4`, 4.14.3) ★default | managed TMS; largest auditor of the sync space; Energy default | **CLI is a Java jar — needs a JRE** (fails in a bare Node sandbox); config = `crowdin.yml` | CLI (`upload sources`/`download`/`status`); **official MCP** (verify) |
| **Lokalise** (`lokalise2`, Go binary) | want a lighter no-JRE CLI; managed TMS | another vendor; commercial | CLI (Go, no JRE); **official MCP** (verify) |
| **Tolgee** (`@tolgee/react` `^7` + `@tolgee/cli`) | **OSS self-host**, in-context translation (alt-click any string), no lock-in | full platform to run (Spring/Kotlin + React, 193 open issues); MT-provider integrations break on the vendor's clock (DeepL #3400) | CLI (`push`/`pull`/`extract`); **official MCP** (verify) |
| **Lingo.dev** (CLI `0.137.0`) ★agent-native | AI machine-translate in CI + open a PR; most agent-native | **0.x, releases DAILY — pin EXACTLY** (no `^`); auto-PR has GH-Actions-permission failures (#334); engine is paid | CLI (`lingo.dev i18n`); the agent-native MT flow |
| **Phrase / Locize / SimpleLocalize / Smartling** | already standardized on one; enterprise | per-vendor lock-in; verify MCP maturity | **official MCP** (mid-2026, verify per-vendor) |

- **parrot rules:** if hosted-TMS, **prefer the vendor's official MCP over its CLI** for the interactive loop
  (native tool calls, structured results, OAuth) — but use the **CLI in CI** (deterministic, no LLM in the
  loop). Provision a **JRE before choosing Crowdin** in a constrained sandbox, or prefer Lokalise/Lingo.dev.
  **Pin Lingo.dev exactly** (`lingo.dev@0.137.0`, not `^`). MT NEVER ships to prod unverified. Source:
  `ecosystem-09` §B, §C; `field-03` §A.
- **Secrets:** `CROWDIN_API_TOKEN` + `CROWDIN_PROJECT_ID` · `LOKALISE_API_TOKEN` + `LOKALISE_PROJECT_ID` ·
  `TOLGEE_API_KEY` + `TOLGEE_API_URL` (self-host URL) · `LINGODOTDEV_API_KEY` · `<TMS>_API_KEY` per vendor.
- **Pitfalls:** P12 (Crowdin needs JRE), P13 (pin Lingo.dev exactly), P14 (TMS↔MT-provider auth drift), P16
  (Lingo.dev auto-PR permissions). See [[parrot KNOWN-PITFALLS]].

## Category 4 — Machine translation engine + governance

**DEFAULT: MT for the low-risk ~80%, gated by a glossary/termbase + a TTE-aware human review for the high-risk
~20%, with ZDR/privacy-compliant routing.** The 2026 consensus is **platforms over models** + multi-engine
routing — don't hard-pick a single LLM. Source: `field-02` §B; `field-05` §B.

| Lever | What | Pick when | Agent surface |
|---|---|---|---|
| **Glossary / termbase** ★ | terms the MT MUST honor | always for product strings (terminology drift) | TMS config / CI |
| **Per-string `description`/context field** ★ | disambiguates short UI strings (`"Open"` verb vs adj) | always — short strings are higher-risk than the portfolio | ICU metadata / TMS |
| **Human review gate** ★ | `include_unverified_translations: false` | always — MT never reaches prod unverified | TMS workflow |
| **Multi-engine routing** | route by language/domain/context | reduce risk + avoid lock-in (2026 default) | TMS / Lingo.dev engine |
| **TMS-managed MT** (Crowdin/Lokalise MT) | low-risk bulk, inside the governance layer | the 80% bucket | via the TMS |
| **AI-CLI MT** (Lingo.dev) | CI-native gap-fill | the agent-native loop | `lingo.dev i18n` |
| **Hallucination detection** | safety net on MT/LLM output | 2026 stacks add it | TMS / eval |

- **parrot rules:** the metric that matters is **Time-to-Edit (TTE)**, not fluency — fluent-but-wrong is
  *more* expensive than obviously-bad (reviewers trust it). NOT-safe-to-auto categories: **legal/medical/
  compliance, marketing/brand, creative/literary, user-generated.** Route sensitive content through ZDR/no-train
  infra. Source: `field-02` §B.
- **Secrets:** reuse the TMS/engine creds above (`CROWDIN_API_TOKEN`, `LINGODOTDEV_API_KEY`); if calling a
  model directly, the provider key (`ANTHROPIC_API_KEY` — already in `.env.example`) + ZDR is a provider
  *setting*, not a secret.
- **Pitfalls:** P17 (short-string context), P18 (MT-to-prod without a gate), P14 (provider auth drift). See
  [[parrot KNOWN-PITFALLS]].

## Category 5 — CI validation / key-completeness linter (THE differentiator)

**DEFAULT: `@lingual/i18n-check` (`^0.9`, currently 0.9.5)** as the build gate (the ixartz pattern), plus a
plural/RTL/format eval. This is the missing fourth leg of Energy's checklist. Source: `ecosystem-02` §1;
`ecosystem-09` §C, §F.

| Tool | Pick when | Honest cost / limit | Agent surface |
|---|---|---|---|
| **`@lingual/i18n-check`** `^0.9` ★default | fail the build on missing/unused keys | a validator, NOT a TMS; framework flag (`-f next-intl`) must match | CLI (`i18n-check -l src/locales -s en -u src -f next-intl`) |
| **`@formatjs/cli`** (`extract`/`compile`) | FormatJS extraction toolchain | native-NAPI 2026 perf cliffs; **extract==build invariant** to test | CLI (Node) |
| **`@lingui/cli`** (`extract`/`compile`) | Lingui macro extraction | needs the Babel/SWC plugin | CLI (Node) |
| **`@tolgee/cli extract`** | find keys in code against Tolgee | tied to Tolgee | CLI (Node) |
| **custom plural/RTL/format eval** ★ | the differentiator — assert correctness in `pl`/`ar`/`he` | DIY; you own the golden tasks | test runner (Vitest/Playwright) |
| **dup-key + hardcoded-string CI test** | gate sprawl (Doctolib pattern) | DIY | CI / pre-commit hook |

- **parrot play:** the CI gate is what turns "did we forget to translate this?" / "is the Polish plural wrong?"
  from incidents into red checks. **An eval that probes only English ships the broken 20%.** Wire the
  key-linter + a many-plural-language plural check + an RTL check + a format check + a font-glyph-coverage check.
  Source: `ecosystem-02` §1; `ecosystem-04` §G; `field-02` §A.
- **Secrets:** none (local validators).
- **Pitfalls:** P5 (test plurals in `pl`/`ar`), P19 (extract==build for FormatJS), P10 (dup-key gate). See
  [[parrot KNOWN-PITFALLS]].

## Category 6 — Locale routing + hreflang SEO

**DEFAULT: subdirectory routing + self-referencing canonicals + reciprocal hreflang graph + one `x-default`,
machine-verified in CI.** The library generates most of it (next-intl `createNavigation`) but **can introduce
drift** — verify the alternates. Source: `field-04`; `ecosystem-03` §A.

| Lever | What | Pick when | Agent surface |
|---|---|---|---|
| **Subdirectory** (`/fr/`) ★default | inherits root-domain authority | startup default | next-intl `localePrefix` |
| **Subdomain** (`fr.example.com`) | partial separation | rarely; treated as more separate | routing config |
| **ccTLD** (`example.fr`) | legal/brand/market reason + budget to build per-country authority | only with a reason | infra + routing |
| **Cookie-only (no locale in URL)** | multi-tenant / no-`/en/` prefix | issue #366 case | next-intl `localePrefix: 'never'` |
| **hreflang graph check** ★ | reciprocity + self-ref + valid BCP-47 + one x-default | always — treat as a CI-checked graph | CI validator |
| **Detection (suggest, not redirect)** | banner/cookie locale suggestion | undecided users; NEVER hard-redirect the crawler | next-intl detection pipeline (configurable since 2026) |

- **parrot rules:** each localized page's **canonical points to ITSELF** (canonical-to-.com deletes your
  localized pages); canonical + hreflang are **separate elements**; **valid BCP-47** (`en-GB` not `en-uk`,
  beware `la`=Laos / `me`=Montenegro); **detect to suggest, never hard-redirect** Googlebot; **verify the
  generated alternate slugs** (next-intl #2334 emits wrong ones, #2332 breaks under `output: 'export'`). Source:
  `field-04`; `field-01` §C.
- **Secrets:** none.
- **Pitfalls:** P20 (canonical-to-.com), P21 (wrong ISO code), P22 (hard-redirect crawler), P23 (library slug
  drift). See [[parrot KNOWN-PITFALLS]].

## Category 7 — Cross-locale typography / font fallback (the design bridge)

**DEFAULT: `next/font` with per-script subsets declared + Noto Sans/Serif `<script>` fallback stacks paired
with the Energy brand fonts.** Instrument Serif (Latin-only) + Poppins (Devanagari+Latin) do NOT cover CJK/
Arabic/Cyrillic-display/Thai/Hebrew. Source: `ecosystem-00` §2; `field-02` §A.

| Lever | What | Pick when | Agent surface |
|---|---|---|---|
| **`next/font` `subsets:`** ★ | auto-subset per declared script | always — declare EVERY script you render or glyphs ship missing | `next/font` config |
| **Per-script fallback stack** ★ | Noto Sans/Serif `<script>` behind brand fonts | the moment you ship ar/he/ja/ko/zh/th | `next/font` `fallback` + CSS font stack |
| **RTL webfont** | a proper Arabic/Hebrew webfont | RTL locales — don't rely on the OS font | `next/font` |
| **`dir` switching** | `<html dir>` from active locale | RTL locales (wire with fonts + catalogs together) | layout |

- **parrot rule:** font fallback is a **first-class i18n concern, not a design afterthought** — own it as the
  `i18n-font-fallback` skill, wired at the same time as message catalogs + RTL `dir`. It's where parrot's domain
  meets Energy's `design.md`. Source: `ecosystem-00` §2; `ecosystem-09` §F.
- **Secrets:** none.
- **Pitfalls:** P24 (undeclared script = missing glyphs), P25 (brand font silent OS fallback in localized
  markets). See [[parrot KNOWN-PITFALLS]].

## Category 8 — MCP servers + reference repos (the agent surface + what to clone/read)

Drive via MCP for the interactive loop; clone the references to become dangerous. Source: `ecosystem-09` §B;
`ecosystem-02`.

| Repo / MCP | Use | Caveat |
|---|---|---|
| **`gtrias/i18next-mcp-server`** (12★) | code-side i18n MCP — `scan_code_for_missing_keys`, `coverage_report`, `add_translation_key`, `validate_files` | low-star, mid-2025-stale — vendor a fork / verify it runs |
| **`dalisys/i18n-mcp`** (11★) | generic i18n MCP — file-watching, hardcoded-string detection, cross-language consistency | low-star, mid-2025 |
| **`zhangyu1818/xcode-i18n-mcp`** (3★) | iOS/macOS `.xcstrings` automation | tiny; Apple-only |
| **official TMS MCPs** (Crowdin/Lokalise/Phrase/Tolgee/Locize/SimpleLocalize/Smartling) | drive a hosted TMS via native tool calls | **verify per-vendor at adoption** (mid-2026 claim, maturity varies) |
| **`ixartz/Next-js-Boilerplate`** (12,980★) | THE production reference — next-intl + `crowdin.yml` + `i18n-check` CI triad | lift the triad wholesale |
| **`amannn/next-intl` `examples/`** | drift-free next-intl code (`-extracted`/`-migration`/`-without-i18n-routing`) | maintained in lockstep — highest-trust |
| **`i18next/next-app-dir-i18next-example-ts`** (165★) | official i18next App-Router pattern | use `-ts` variant; more DIY than next-intl in RSC |
| ⚠️ **`QuiiBz/next-international`** (1,446★) | borrow the TS-native-locale-files idea | **stale (2024-10)** — verify Next-16 compat before using as-is |

- **parrot rules:** **prefer a TMS's official MCP for the interactive loop, the CLI in CI**; the community
  code-side MCPs have the right *tool surface* but are low-star/stale — borrow the shape, consider parrot owning
  a small i18n MCP itself; **check `pushed_at` not stars** (next-international is 1,446★ but 20 months stale).
  Source: `ecosystem-09` §B; `ecosystem-02` §4.
- **Secrets:** community MCPs need none (local repo); TMS MCPs reuse the Category-3 vendor creds.

---

## The Required-Secrets manifest (consolidated)

> Minimal set a parrot deployment needs, by what's actually wired. Names follow `.env.example` conventions.
> Inherited platform secrets (`ANTHROPIC_API_KEY`, `GITHUB_PERSONAL_ACCESS_TOKEN`, `FIRECRAWL_API_KEY`) are
> already in `.env.example` — reuse, don't redefine. **The runtime libraries, native Intl, ICU authoring, CI
> linters, routing, and font fallback need NO secrets** — i18n is mostly a file pipeline; secrets appear only
> at the TMS/MT seam.

| Secret | Tool / purpose | Tier | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | the agent itself + direct-model MT | **required** | already in `.env.example`; pair with ZDR for sensitive content |
| `CROWDIN_API_TOKEN` / `CROWDIN_PROJECT_ID` | Crowdin TMS sync (CLI/MCP) | optional (default managed TMS) | **CLI needs a JRE** (P12); config = `crowdin.yml` |
| `LOKALISE_API_TOKEN` / `LOKALISE_PROJECT_ID` | Lokalise TMS sync (`lokalise2` Go binary) | optional (if Lokalise) | no JRE — lighter in a sandbox |
| `TOLGEE_API_KEY` / `TOLGEE_API_URL` | Tolgee OSS self-host (CLI/SDK/MCP) | optional (if self-hosting) | `API_URL` = your self-host endpoint |
| `LINGODOTDEV_API_KEY` | Lingo.dev AI-translate engine (CLI) | optional (agent-native MT) | **pin CLI exactly** `lingo.dev@0.137.0` (P13) |
| `<TMS>_API_KEY` | Phrase / Locize / SimpleLocalize / Smartling | optional | if standardized on one; verify MCP maturity |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | the CI PR-translate loop (open translation PRs) | optional (CI dispatch) | already in `.env.example`; wire `permissions: contents: write, pull-requests: write` for the auto-PR (P16) |

- **The agent-operator hygiene the manifest implies:** scope every TMS token tightly; never log API tokens or
  put them in URL query strings; provision a JRE before choosing Crowdin (or prefer Lokalise/Lingo.dev); pin
  Lingo.dev exactly; for the auto-PR loop, grant `contents: write` + `pull-requests: write` and handle the
  forked-PR permission case. Source: `ecosystem-09` §C, §D, §E.

## The meta-decision (parrot's spine, restated as tool choices)

1. **New Next.js → `next-intl@^4`** (RSC-mature). Multi-framework/RN → `i18next@^26`+`react-i18next@^17`.
   ICU-complex → `react-intl@^10`. Bundle-paramount + mainstream bundler → `@lingui/core@^6`. Watch Intlayer.
   (O5, O6)
2. **ICU MessageFormat 1 + native `Intl.*` for everything CLDR knows. MF2 is watch-list, not default.** (O8, O9)
3. **The library matters less than the discipline around it: wire the production triad — runtime lib + CI
   key-check + TMS sync — and a plural/RTL/format eval that fails the build.** (O10, O11)
4. **MT for the 80%, glossary-gated + TTE-aware human review for the 20%, ZDR routing; MT never ships
   unverified.** (O12, O13)
5. **Prefer a TMS's official MCP for the loop, CLI in CI; pin Lingo.dev exactly; provision a JRE before
   Crowdin; check `pushed_at` not stars.** (O14, O15, O16)
