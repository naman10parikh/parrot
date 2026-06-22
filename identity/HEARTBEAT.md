# parrot — Heartbeat

> parrot is a **tool-employee**, not an always-on scanning agent — its "heartbeat" is the RSI currency
> watch that keeps the i18n brain from going stale (libraries release daily — Lingo.dev daily, next-intl /
> FormatJS weekly; the 2026-invalidated list is JTBD-12). Cron-like: each row = what to check · how often ·
> the action on anomaly. The deterministic half runs at $0 today; the Claude half is deferred to
> `CLAUDE_CODE_OAUTH_TOKEN` (D8).

## Schedule

| Check                                              | Frequency                          | Action on anomaly                                                                                |
| -------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| Tool-matrix currency (`npm view` on next-intl / i18next / react-intl / @lingui/core / @lingual/i18n-check / lingo.dev) | Weekly (GH Actions `rsi.yml` cron) | A pin drifted vs `brain/TOOL-MATRIX.md` → propose a pin-bump diff; commit only if the eval gate stays green |
| Brain-pin integrity (the version claims in TOOL-MATRIX / KNOWN-PITFALLS) | Weekly (same RSI run)              | A stale version claim → flag it; on a real watchlist delta, the Claude half rewrites the brain file (deferred, D8) |
| Eval health (`parrot eval` L1+L2 stays green, pass^k) | Every RSI run + every CI run       | A golden task regresses → snap back (`["component","repo"]`); never ship a red gate                |
| Plural/RTL coverage (the `en`+`pl`+`ar`+`he`+`ja` matrix stays asserted) | Every CI run                       | Coverage drops below the differentiator bar → the acceptance/`check` legs go red, blocking merge   |
| MF2 TC39 stage trip-wire (Stage-2 → Stage-3)       | Weekly (watch-list)                | MF2 moves to Stage-3 or gains TMS support → re-open the "MF1 default, MF2 watch-list" call (O25/S16) |

## Health indicators

- **Healthy:** every tool-matrix pin matches `brain/TOOL-MATRIX.md`; `parrot eval` L1+L2 green (pass^k); the
  acceptance CI job green; no stale brain pins flagged.
- **Warning:** a pin drifted (a proposal exists, not yet merged) OR a brain pin is flagged stale OR the
  RSI cron skipped its window.
- **Critical:** a CI-blocking golden task is red OR the acceptance test is red OR the plural/RTL coverage
  matrix has a missing locale → the merge gate is closed until fixed.

## Recovery

1. Read the last RSI proposal / failing eval from `logs/runs.jsonl` (model + duration + outcome per run).
2. Check `brain/KNOWN-PITFALLS.md` for the version-specific gotcha behind the failure (the relevant Pn).
3. If fixable deterministically (a pin bump that keeps the eval green): apply, re-run the eval pyramid,
   commit only on a green gate.
4. If it needs a brain rewrite (a real watchlist delta): defer to the Claude half (`CLAUDE_CODE_OAUTH_TOKEN`)
   — never self-grade a brain change; the eval pyramid is the gate (`noSelfGrading:true`).
5. Always snap back rather than ship a red gate (snapback granularity `["component","repo"]`, vcs git).
