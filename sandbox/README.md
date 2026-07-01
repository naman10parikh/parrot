# parrot sandbox — the isolated acceptance + `/ar/` render template (Component 11 / E4)

> The **real integration point** for parrot is scaffolding+booting the fixture Next.js app and **rendering a
> non-Latin locale** (`/ar/`) to assert `dir="rtl"` + a correct Arabic plural — a live render, not a toy
> sandbox (brain §11, the wikimem `Sandbox.create` precedent; O11/O23).

## The two paths (D15 + Sandbox OVERRIDE)

| Path | Where | Blocks the merge? | What it proves |
| --- | --- | --- | --- |
| **Merge gate (ubuntu, $0, no creds)** | `.github/workflows/acceptance.yml` on push+PR | **YES — red-blocking** | the §5 acceptance: `parrot init` → `extract` → `check` → `eval/acceptance/assert.mjs` (init wires proxy.ts+setRequestLocale, extract finds the planted string, check catches the pl plural gap, the `ar` round-trips via the layout dir-logic + native `Intl` plural). Offline, deterministic, pass^k. |
| **Live render (E2B, additive)** | `.github/workflows/acceptance-e2b.yml` on `workflow_dispatch` | **NO — additive** | the SAME flow inside an E2B Firecracker microVM when `E2B_API_KEY` is present, plus the **live `next dev` boot + HTTP GET `/ar/`** asserting served `<html dir="rtl">` (`sandbox/render-ar.mjs --mode live`). |

**E2B is NOT a hard CI gate** (Sandbox OVERRIDE / D10): if `E2B_API_KEY` is absent, the **ubuntu runner satisfies
the isolation need** and the merge gate is unaffected. The *Sandbox component ✅* depends on the live render;
the *merge gate* depends only on the ubuntu path (mirrors turbo V2 / hush §11).

## Reproduce locally

```bash
# 1. the $0 merge-gate flow (offline — what acceptance.yml runs)
pnpm install
node bin/parrot init    --dir eval/fixtures/app --lib next-intl
node bin/parrot extract --dir eval/fixtures/app --json > /tmp/extract.json
node bin/parrot check   --dir eval/fixtures/app --locales en,pl,ar --json > /tmp/check.json
node eval/acceptance/assert.mjs /tmp/extract.json /tmp/check.json   # all 5 §5 conditions

# 2. the /ar/ render proof — auto-detects mode (local $0, or live if Next is installed in the fixture)
node sandbox/render-ar.mjs                # MODE=local unless eval/fixtures/app/node_modules/next exists
node sandbox/render-ar.mjs --mode local   # force the $0 grammar-engine round-trip

# 3. the FULL live render (the additive E2B/ubuntu path) — install Next into the fixture first, then:
pnpm --dir eval/fixtures/app install      # pulls next + react (heavy — NOT done on the merge gate)
node sandbox/render-ar.mjs --mode live    # boots `next dev`, GETs /ar/, asserts <html dir="rtl">
```

## E2B notes (cold-start / break-even)

- **E2B template:** the default is the stock Node base image (Firecracker microVM, ~150ms cold start). The
  acceptance-e2b.yml job provisions it, copies the repo, `pnpm install`, then runs the §5 flow + the live render.
- **Cold start:** ~150ms for the microVM, but a `next dev` first boot dominates (~10-60s on a cold install) —
  `render-ar.mjs --mode live` polls `/ar/` for up to 60s before failing. Keep this OFF the merge gate (it would
  add flake + minutes to every push); it runs on-demand via `workflow_dispatch`.
- **Break-even:** the live E2B render is for the Sandbox-component proof + manual confidence, not per-commit CI —
  per-commit isolation is satisfied by the ubuntu runner at $0 (no E2B minutes burned on every push).

## `boot.mjs` — the REAL Firecracker `Sandbox.create` boot (the Sandbox-component ✅)

`sandbox/boot.mjs` is the actual E2B integration point (mirrors `pigeon/sandbox/boot.mjs`). When
`E2B_API_KEY` is present (inherited from energy's `.env`, or a CI secret) it:

1. **boots a real E2B microVM** (`Sandbox.create`) and MEASURES the cold start (≤500ms target),
2. copies the compiled `dist/` + the acceptance fixture (`eval/fixtures/app`) + `render-ar.mjs` + the
   one runtime dep (`commander`, zero transitive deps) INTO the VM — **no in-VM `npm install`** (parrot
   `check` is 1-dep, `render-ar --mode local` is pure stdlib/`Intl`; the whole reason the lib avoids
   FormatJS's NAPI parser, P25),
3. writes a tiny `run.mjs` launcher into the VM (Node 20 — the E2B default template — refuses the
   extensionless `bin/parrot` under `"type":"module"`; `run.mjs` imports `main` and is node-version-agnostic),
4. runs `parrot check` INSIDE the VM asserting the PLANTED `pl` plural gap is caught
   (`pass:false` + `{check:"plural",locale:"pl"}` — S3/P6),
5. runs the `/ar/` render proof INSIDE the VM asserting `<html dir="rtl">` + a distinct Arabic plural
   (O11/O23), then **tears the sandbox down**,
6. appends a `{verb:"sandbox-boot",mode,sandboxId,coldStartMs,pass,plPluralGapCaught,arRenderOk,invariantHeld}`
   row to `logs/runs.jsonl`.

When `E2B_API_KEY` is **absent**, it runs the SAME two proofs on the host (`mode:"local-$0-fallback"`,
exit 0) so the additive CI job never blocks on a cred (D15). Wired as the `sandbox-boot` job in
`.github/workflows/ci.yml` (`push`-only, `continue-on-error:true` → never merge-blocking). Run it directly:

```bash
node sandbox/boot.mjs   # E2B live boot if E2B_API_KEY present, else the $0 host run
```

`Dockerfile` (`node:22-slim` + git) is the portable image for a local `docker run` alt (mirrors
`pigeon`/`hush`); the CI job runs `boot.mjs` directly on ubuntu, so Docker is optional.

## Files

- `boot.mjs` — the real `Sandbox.create` E2B boot: `parrot check` + `/ar/` render IN the VM, cold-start telemetry, $0 host fallback.
- `Dockerfile` — `node:22-slim`+git portable image (local `docker run` alt; CI runs `boot.mjs` directly).
- `render-ar.mjs` — the `/ar/` render proof (auto-detect live/local; asserts `dir="rtl"` + distinct ar plural).
- `README.md` — this file.
