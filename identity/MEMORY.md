# parrot — Memory (bootstrap pointer)

> The canonical, loaded-every-cycle bootstrap spine lives in **`memory/MEMORY.md`** (≤ ~1500 words: the
> one belief, the plumbing↔content-authoring boundary, the default stack, the 12-JTBD index, the 6-brain
> pointers, the provider one-liners). The deep expertise lives in `brain/**.md`, queryable via
> `parrot brain "<q>"` / the MCP `parrot_search_brain` / `scripts/memory-search.sh`. Read those, not this
> file — this is just the format-required pointer so there is one source of truth, not two.

## Bootstrap (the spine, in one line)

**Test the 20% that's invisible in English** (the worst i18n bugs throw no error). parrot is the
**i18n/l10n plumbing** — the pipes + grammar engine + routing + CI gate — and **never authors the words**
(brain P29). Default stack: `next-intl@^4` + ICU MessageFormat 1 + native `Intl.*` + a reciprocal hreflang
graph + Tolgee/Lingo.dev TMS. The library is commoditized; the discipline is the moat.

- **Full bootstrap:** `memory/MEMORY.md`
- **Deep expertise (cite by ID JTBD-n / S-n / P-n / O-n):** `brain/EXPERTISE-MAP.md`,
  `brain/BATTLE-TESTED-SCENARIOS.md`, `brain/KNOWN-PITFALLS.md`, `brain/OPINIONS.md`,
  `brain/GAPS-AND-DISPUTES.md`, `brain/TOOL-MATRIX.md`
- **Operating rules:** `CLAUDE.md` (the operating spine) · `identity/SOUL.md` (the persona)

## Patterns & errors

Long-term learnings, decisions, and error post-mortems are not duplicated here — they accrue in
`brain/**.md` (the expertise that the RSI loop keeps current) and in commit history. The DSIP snapback
granularity is `["component","repo"]` (`dsip.json`); git is the durable memory of every change.
