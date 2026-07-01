#!/usr/bin/env bash
# scripts/serve.sh — launch the parrot cockpit (G1, the local cockpit; PLAN §10; MASTER-TODOS G1).
#
# The cockpit is a zero-dependency Node stdlib server (cockpit/server.mjs) + a vanilla-JS SPA
# (cockpit/public/index.html + app.js + styles.css). No build step for the SPA. The cockpit is
# READ-MOSTLY — it shells the read-only parrot verbs (`parrot check`/`parrot pick`), searches
# brain/**.md via scripts/brain-search.mjs, reads logs/runs.jsonl, and runs eval/eval.mjs --json.
# It is the CHAIRMAN's eyes (agents use the CLI/MCP); it never mutates. Plus /ar-proof — the real
# dir="rtl" Arabic-plural render that is parrot's load-bearing i18n coverage proof.
#
# Usage: bash scripts/serve.sh             # serves on http://127.0.0.1:7799
#        PARROT_COCKPIT_PORT=8080 bash scripts/serve.sh
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PARROT_COCKPIT_PORT:-7799}"

# The ask-the-employee + L2-eval views shell the compiled CLI (dist/cli/index.js via bin/parrot). Warn
# (don't fail) if dist/ is absent so the chairman knows to build — the server still boots and those
# endpoints return an honest JSON error until then (the SPA shell + brain/runs/L1/ar-proof always serve).
if [ ! -f "$REPO/dist/cli/index.js" ]; then
  echo "parrot: dist/ not built — ask-the-employee + L2 eval views will error until you run: pnpm build" >&2
fi

echo "parrot cockpit → http://127.0.0.1:${PORT}  (Ctrl-C to stop)"
exec node "$REPO/cockpit/server.mjs" --port "$PORT"
