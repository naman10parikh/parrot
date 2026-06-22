/**
 * `parrot brain "<query>"` — BM25 search over the expertise brain (brain/**.md), the Memory CLI (PLAN §4,
 * Component 2). REUSES the A4 index: `scripts/brain-search.mjs` is the single source of truth — "one index,
 * three callers" (this CLI command, the MCP `parrot_search_brain` in C1, and `scripts/memory-search.sh`).
 *
 * We dynamic-import the existing zero-dep `.mjs` module rather than re-implementing BM25 (Consolidate, never
 * expand). The module self-rebuilds its index when stale, so this command is always fresh.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** A single ranked, cited brain hit (mirrors brain-search.mjs's searchBrain return shape). */
export interface BrainHit {
  readonly file: string;
  readonly entryId: string | null;
  readonly heading: string;
  readonly score: number;
  readonly snippet: string;
}

/** Resolve the repo-root path of scripts/brain-search.mjs from this compiled module (dist/cli/commands → repo). */
function brainSearchModulePath(): string {
  const here = dirname(fileURLToPath(import.meta.url)); // dist/cli/commands
  return join(here, "..", "..", "..", "scripts", "brain-search.mjs");
}

/** Search the brain. Returns ranked cited hits via the shared A4 index. */
export async function runBrain(query: string, limit = 5): Promise<BrainHit[]> {
  const modPath = brainSearchModulePath();
  const mod = (await import(modPath)) as { searchBrain: (q: string, n?: number) => BrainHit[] };
  return mod.searchBrain(query, limit);
}
