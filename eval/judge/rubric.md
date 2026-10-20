# parrot L3 LLM-judge rubric (Hamel L3 — trajectory, process-graded)

> Used by `parrot eval --level 3` for the **trajectory** golden tasks (GT-11, GT-13, GT-14) — the ones where
> "good" is a reasoning *process*, not a single machine-checkable fact, so a calibrated LLM judge grades the
> agent's full answer against the scenario's Eval-gate. **No self-grading** (dsip rule): the judge is a separate
> model call with a fixed rubric and a **binary** verdict, scored against the scenario gate — never the agent's
> own opinion of its work, never a vibes Likert score.
>
> **DEFERRED execution (D8):** L3 runs only when `CLAUDE_CODE_OAUTH_TOKEN` (or `ANTHROPIC_API_KEY`) is set — it
> is the one eval leg that costs tokens. Its absence is **NOT a gap** (HARNESS-OVERRIDES RSI row): the L1+L2
> deterministic pyramid is the merge gate; L3 is nightly, non-blocking. Until the token is set, `parrot eval
> --level 3` reports each trajectory task as `judge-deferred` and exits 0 (it does not fake a PASS, and it does
> not fail the build).

## The judge contract (binary, calibrated)

For each trajectory task the judge receives: the **scenario** (situation + trap), the **Eval-gate** (the
objective bar), and the **agent's answer**. It returns `{ "verdict": "pass" | "fail", "reasons": [...] }`.

- **PASS** iff the answer satisfies the Eval-gate's REQUIRED moves AND commits none of the REFUSED anti-moves.
- **FAIL** otherwise. A fluent answer that misses a required move or commits a refused anti-move is a FAIL —
  fluency is not credit (mirrors the brain's TTE lesson: fluent-but-wrong is the expensive failure).

The required/refused moves per task are the `mustInclude` / `mustRefuse` arrays in `eval/golden/GT-*.json`
plus the prose `gate`. The judge is told to read them as the rubric, not to invent its own.

## Calibration (avoid the Likert trap, O — eval honesty)

- The judge prompt is **fixed** and versioned with this file; changing it is a tracked change (RSI eval-health).
- The verdict is **binary**, not a 1-5 score — a Likert judge is graded 🟡 in HARNESS-OVERRIDES §9, not ✅.
- Calibration set: each trajectory task ships **one known-good** answer (the `expected` field) that MUST grade
  `pass`, and **one known-bad** answer (an `expected` mutated to commit a `mustRefuse` move) that MUST grade
  `fail`. `parrot eval --level 3 --calibrate` runs both and asserts the judge separates them — if the judge
  passes a known-bad answer, the judge itself is mis-calibrated (a tracked failure, not a silent pass).

## Model routing (D12/D14)

The judge call MUST pass an explicit model: the alias `opus`, max effort, never a bare default and
never a fixed ID (D14: always Opus). The call is the deferred Claude-half cost; the deterministic L1+L2 pyramid is $0.

## Tasks graded here

| GT | Scenario | The trajectory the judge grades |
| --- | --- | --- |
| GT-11 | S5 | typed-keys `TS2590` at scale → selector API + namespace split (not "increase tsc memory"); explains the 2026 invalidation |
| GT-13 | S4 | Lingui macro-not-subscribed-to-context → `useLingui()` + ESLint guard; migration = full-surface refactor |
| GT-14 | S6 | FormatJS NAPI cliff/Alpine → pin the CLI, test on dev OS, extract==build invariant; not "bump to latest" |
