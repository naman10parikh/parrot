---
name: mt-tms-governance
description: Drive the machine-translation + TMS pipeline safely — MT for the low-risk ~80%, glossary-gated + Time-to-Edit-aware human review for the high-risk ~20%, per-string context required, ZDR routing, multi-engine routing by language/domain, and MT never shipped unverified. Use when "machine-translate the UI / set up the translation pipeline". NEVER authors or sign-off-approves the copy.
---

# mt-tms-governance

> **JTBD-8 — MT + TMS pipeline safely.** "AI translates everything now" is the 2025 hype that 2026
> invalidated. The 2026-correct stance: **MT for the low-risk 80%, glossary-gated + TTE-aware human review for
> the high-risk 20%, governance over models, never ship MT unverified** (`brain/OPINIONS.md` O16/O18). **HARD
> boundary:** parrot owns the *pipeline + glossary + gate + ZDR routing* (plumbing); the **editorial sign-off
> on the high-stakes 20%** and the EU-AI-Act legal posture are NOT parrot's — they belong to the content
> reviewer / human translator and to `stamp` (compliance). `brain/GAPS-AND-DISPUTES.md` §4; `brain/KNOWN-PITFALLS.md` P29.

## Trigger

- "Machine-translate the UI / auto-translate everything / set up the translation pipeline."
- A symptom: short button/label strings sent to MT with **no context** → verb/adjective ambiguity in the
  output (the microcopy trap, `brain/KNOWN-PITFALLS.md` P23 — `"Open"`, `"fresh water"`).
- MT released straight to prod with **no human gate**, no glossary, or sensitive content through a
  train-on-data provider (the pipe-and-ship trap, `brain/KNOWN-PITFALLS.md` P24 / `brain/BATTLE-TESTED-SCENARIOS.md` S13).
- Choosing MT "by which LLM is best" instead of by the governance layer (`brain/OPINIONS.md` O18).

## Steps

1. **Refuse blanket context-free MT** (`brain/OPINIONS.md` O16, `brain/KNOWN-PITFALLS.md` P23/P24). The 80/20
   "MT-safe" figure is for *content portfolios*, not microcopy — short UI strings are **higher**-risk than the
   average. `parrot mt` refuses to translate strings that lack a `description`/context field.
2. **Require per-string context + a glossary/termbase the MT must honor** (`brain/OPINIONS.md` O10/O16). Every
   string carries a `description` (the same field the `icu-message-authoring` skill adds); the glossary pins
   brand/product terms so MT can't drift them.
3. **Split by risk: MT the low-risk ~80%, gate the high-risk ~20%** (legal/medical/marketing/UGC/creative)
   with **TTE-aware human review** (`brain/OPINIONS.md` O16/O17, `brain/BATTLE-TESTED-SCENARIOS.md` S13).
   Optimize for **Time-to-Edit, not fluency** — fluent-but-subtly-wrong is *more* expensive than obviously-bad
   because reviewers trust it.
4. **Never ship MT to prod unverified** (`brain/KNOWN-PITFALLS.md` P24, `brain/OPINIONS.md` O16): set
   `include_unverified_translations: false`. Unverified segments stay out of the production catalog.
5. **Route sensitive content through ZDR / no-train infra** (`brain/OPINIONS.md` O16, `brain/KNOWN-PITFALLS.md`
   P24). parrot implements the **ZDR/no-train routing**; the *legal posture* (EU-AI-Act) is `stamp`'s, not
   parrot's (`brain/GAPS-AND-DISPUTES.md` §4).
6. **Prefer the governance layer over the model; route multi-engine by language/domain** (`brain/OPINIONS.md`
   O18 — "95% prioritize platforms over models") to reduce risk and avoid lock-in.
7. **Pick provider tooling for the sandbox** (`brain/TOOL-MATRIX.md` Cat TMS, `brain/KNOWN-PITFALLS.md`
   P20/P21): default Tolgee (OSS self-host) + Lingo.dev (AI-CLI, **pin exactly** — `lingo.dev@0.137.0`, 0.x
   releases daily). **Provision a JRE before choosing Crowdin** (it's a Java jar) or prefer Lokalise
   (Go)/Lingo.dev in Node-only sandboxes. For the auto-PR loop grant `contents: write` + `pull-requests:
   write` and handle the forked-PR case (P22). Drive it via `parrot tms <push|pull|status> --provider` and
   `parrot mt --engine`.

## Output

- A governed MT/TMS configuration: glossary wired, per-string context enforced, the 80/20 risk split with a
  human gate on the 20%, `include_unverified_translations: false`, ZDR routing for sensitive content,
  multi-engine routing, the Lingo.dev pin exact.
- A `parrot mt`/`parrot tms` run that returns **verdicts/handles, never provider tokens** (the MCP/CLI HARD
  rule), or a clear "TMS unreachable" verdict if offline (degrade, don't crash).
- A note naming each trap dodged (P20–P24) with its detect signal, and an explicit hand-off line for the
  editorial sign-off (content reviewer) and the legal posture (`stamp`).
- **Never** the authored translation copy nor the acceptability sign-off — that's content authoring / human
  review, not parrot (P29, `brain/GAPS-AND-DISPUTES.md` §4).

## Brain citation

`brain/EXPERTISE-MAP.md` JTBD-8 · `brain/OPINIONS.md` O16 (MT 80/human 20), O17 (TTE not fluency), O18
(governance over models), O10 (context field) · `brain/KNOWN-PITFALLS.md` P20 (Crowdin JRE), P21 (pin
Lingo.dev), P22 (forked-PR perms), P23 (microcopy higher-risk), P24 (never ship unverified) ·
`brain/BATTLE-TESTED-SCENARIOS.md` S13 · `brain/GAPS-AND-DISPUTES.md` §4 (soft seams) · P29 (the boundary).
