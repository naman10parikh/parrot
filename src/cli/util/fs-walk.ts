/**
 * Tiny filesystem helpers for the CLI — recursive file walk with sensible ignores, and a JSON loader that
 * never throws (returns a typed result). Zero deps (Simplicity First). Shared by init/extract/check.
 */

import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  ".turbo",
  ".vercel",
]);

/** Recursively list files under `root` whose extension is in `exts` (e.g. [".tsx", ".jsx"]). */
export function walkFiles(root: string, exts?: readonly string[]): string[] {
  const out: string[] = [];
  if (!existsSync(root)) return out;
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    if (dir === undefined) continue;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue; // unreadable dir — skip, don't crash the gate
    }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (!IGNORE_DIRS.has(e.name)) stack.push(full);
      } else if (e.isFile()) {
        if (!exts || exts.includes(extname(e.name))) out.push(full);
      }
    }
  }
  return out.sort();
}

/** A non-throwing JSON read. `ok:false` carries the error message for the verdict instead of crashing. */
export type JsonReadResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: string };

export function readJsonSafe(path: string): JsonReadResult {
  try {
    const raw = readFileSync(path, "utf8");
    return { ok: true, value: JSON.parse(raw) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Flatten a nested message object to dotted keys (`home.cta.label`) → string. Arrays are treated as leaves. */
export function flattenKeys(obj: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return out;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flattenKeys(v, key));
    } else {
      out[key] = typeof v === "string" ? v : String(v);
    }
  }
  return out;
}
