#!/bin/bash
# memory-search.sh — Search the parrot EXPERTISE BRAIN (brain/**.md) with BM25 relevance scoring.
# Usage: ./scripts/memory-search.sh "query" [--limit N] [--json] [--reindex]
#
# Searches the queryable brain index built from brain/**.md (the P-/S-/O-/JTBD- entries) — NOT energy's
# memory/, vault/, or .claude/rules/ dirs. Returns ranked, CITED hits naming the source brain file + the
# entry ID. This is the SAME retrieval path `parrot brain` and the MCP `parrot_search_brain` expose:
# one index (scripts/brain-search.mjs → brain/.brain-index.json), three callers.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: memory-search.sh \"query\" [--limit N] [--json] [--reindex]"
  echo ""
  echo "BM25 search over the parrot expertise brain (brain/**.md)."
  echo "Returns ranked, cited hits (source brain file + entry ID: P-n / S-n / O-n / JTBD-n)."
  echo ""
  echo "Options:"
  echo "  --limit N    Return top N results (default: 5)"
  echo "  --json       Emit JSON (for agent consumption)"
  echo "  --reindex    Rebuild the brain index, then exit"
  exit 0
fi

exec node "$PROJECT_DIR/scripts/brain-search.mjs" "$@"
