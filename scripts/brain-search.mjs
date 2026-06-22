#!/usr/bin/env node
// brain-search.mjs — BM25 retrieval over the parrot expertise brain (brain/**.md).
//
// ONE index, THREE callers: scripts/memory-search.sh (CLI wrapper), `parrot brain` (the CLI command,
// cluster B), and the MCP `parrot_search_brain` tool (cluster C) all import searchBrain() from here.
//
// Indexes each brain markdown file by SECTION (a heading starts a chunk) so a hit maps to a cited entry
// ID (P-n / S-n / O-n / JTBD-n) + its source file — not a whole-document blob. Pure Node, zero deps
// (Simplicity First). The index is rebuilt on demand if missing/stale, and cached at brain/.brain-index.json.

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const BRAIN_DIR = join(REPO_ROOT, "brain");
const INDEX_PATH = join(BRAIN_DIR, ".brain-index.json");

// BM25 params (Robertson/Spärck-Jones defaults).
const K1 = 1.5;
const B = 0.75;

// English stopwords — keep the query/document terms that carry i18n signal.
const STOP = new Set(
  ("a an and are as at be but by for from has have if in into is it its no not of on or our s so that the " +
    "their then there these they this to was will with you your we").split(" "),
);

/** Tokenize to lowercase alphanumeric word stems (cheap; no stemmer dependency). */
function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length > 1 && !STOP.has(t));
}

/** Recursively collect every *.md under brain/. */
function walkMarkdown(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdown(full));
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

/**
 * Split a markdown file into section-chunks. A chunk begins at any heading line; we capture the entry ID
 * (P12 / S3 / O7 / JTBD-1) from the heading so a hit is citable. Front-matter and pre-heading prose form
 * a leading chunk.
 */
function chunkFile(absPath) {
  const rel = relative(REPO_ROOT, absPath);
  const text = readFileSync(absPath, "utf8");
  const lines = text.split("\n");
  const chunks = [];
  let cur = { heading: "(intro)", entryId: null, lines: [] };
  const flush = () => {
    const body = cur.lines.join("\n").trim();
    if (body.length > 0) chunks.push({ file: rel, heading: cur.heading, entryId: cur.entryId, text: body });
  };
  const idRe = /\b(P\d+|S\d+|O\d+|JTBD-\d+(?:\.\d+)?)\b/;
  for (const line of lines) {
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) {
      flush();
      const heading = h[1].trim();
      const idMatch = heading.match(idRe);
      cur = { heading, entryId: idMatch ? idMatch[1] : null, lines: [line] };
    } else {
      cur.lines.push(line);
    }
  }
  flush();
  return chunks;
}

/** Build the BM25 index over every chunk of every brain/*.md. */
export function buildIndex() {
  const files = walkMarkdown(BRAIN_DIR);
  const docs = [];
  for (const f of files) {
    for (const c of chunkFile(f)) {
      const tokens = tokenize(c.text);
      if (tokens.length === 0) continue;
      const tf = {};
      for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
      docs.push({ file: c.file, heading: c.heading, entryId: c.entryId, length: tokens.length, tf, text: c.text });
    }
  }
  const N = docs.length;
  const df = {};
  for (const d of docs) for (const t of Object.keys(d.tf)) df[t] = (df[t] || 0) + 1;
  const avgdl = N > 0 ? docs.reduce((s, d) => s + d.length, 0) / N : 0;
  const index = { builtAt: new Date().toISOString(), N, avgdl, df, docs };
  writeFileSync(INDEX_PATH, JSON.stringify(index));
  return index;
}

/** Newest mtime across brain/*.md — used to decide if the cached index is stale. */
function newestBrainMtime() {
  let newest = 0;
  for (const f of walkMarkdown(BRAIN_DIR)) {
    const m = statSync(f).mtimeMs;
    if (m > newest) newest = m;
  }
  return newest;
}

/** Load the cached index, rebuilding if missing or older than the newest brain file. */
export function loadIndex() {
  if (existsSync(INDEX_PATH)) {
    const idxMtime = statSync(INDEX_PATH).mtimeMs;
    if (idxMtime >= newestBrainMtime()) {
      try {
        return JSON.parse(readFileSync(INDEX_PATH, "utf8"));
      } catch {
        /* fall through to rebuild */
      }
    }
  }
  return buildIndex();
}

/**
 * Search the brain. Returns ranked hits: { file, entryId, heading, score, snippet }.
 * BM25 scoring per chunk; chunks that carry an explicit entry ID get a small boost (they are the citable
 * synthesis layer — P/S/O/JTBD — vs the raw research prose).
 */
export function searchBrain(query, limit = 5) {
  const index = loadIndex();
  const qTerms = [...new Set(tokenize(query))];
  if (qTerms.length === 0) return [];
  const { N, avgdl, df, docs } = index;
  const scored = [];
  for (const d of docs) {
    let score = 0;
    for (const t of qTerms) {
      const f = d.tf[t];
      if (!f) continue;
      const n = df[t] || 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      const denom = f + K1 * (1 - B + (B * d.length) / (avgdl || 1));
      score += idf * ((f * (K1 + 1)) / denom);
    }
    if (score <= 0) continue;
    if (d.entryId) score *= 1.15; // citable-entry boost
    scored.push({
      file: d.file,
      entryId: d.entryId,
      heading: d.heading,
      score: Number(score.toFixed(4)),
      snippet: snippetFor(d.text, qTerms),
    });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/** Best one-line snippet around the densest query-term line. */
function snippetFor(text, qTerms) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let best = lines[0] || "";
  let bestHits = -1;
  for (const line of lines) {
    const lower = line.toLowerCase();
    const hits = qTerms.reduce((s, t) => s + (lower.includes(t) ? 1 : 0), 0);
    if (hits > bestHits) {
      bestHits = hits;
      best = line;
    }
  }
  return best.length > 240 ? best.slice(0, 237) + "…" : best;
}

// CLI entry: `node scripts/brain-search.mjs "<query>" [--limit N] [--json] [--reindex]`
function mainCli(argv) {
  const args = argv.slice(2);
  if (args.includes("--reindex")) {
    const idx = buildIndex();
    process.stdout.write(`Reindexed brain/: ${idx.N} chunks from brain/**.md\n`);
    return 0;
  }
  let limit = 5;
  let json = false;
  const terms = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit") limit = parseInt(args[++i], 10) || 5;
    else if (args[i] === "--json") json = true;
    else terms.push(args[i]);
  }
  const query = terms.join(" ").trim();
  if (!query) {
    process.stderr.write('Usage: brain-search.mjs "<query>" [--limit N] [--json] [--reindex]\n');
    return 1;
  }
  const hits = searchBrain(query, limit);
  if (json) {
    process.stdout.write(JSON.stringify({ query, hits }, null, 2) + "\n");
    return 0;
  }
  process.stdout.write(`=== Brain search: "${query}" (BM25 over brain/**.md) ===\n\n`);
  if (hits.length === 0) {
    process.stdout.write(`No results found for: ${query}\n`);
    return 0;
  }
  let rank = 0;
  for (const h of hits) {
    rank++;
    const cite = h.entryId ? `${h.file} ${h.entryId}` : h.file;
    process.stdout.write(`[${rank}] ${cite}  (score ${h.score})\n`);
    process.stdout.write(`    ${h.heading}\n`);
    process.stdout.write(`    ${h.snippet}\n\n`);
  }
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(mainCli(process.argv));
}
