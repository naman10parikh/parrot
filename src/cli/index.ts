/**
 * parrot CLI entrypoint (PLAN §4) — the i18n/l10n employee's hands. commander-based; `--help` lists every
 * command; `--version`; exits 0 on success / non-zero on failure. `--json` on the data commands
 * (extract/check/brain) for agent consumption (JTBD-11). Every run appends a line to logs/runs.jsonl via the
 * E3 logger seam (util/log.ts).
 *
 * The ACCEPTANCE PATH (init / extract / check) is fully implemented (B2). The remaining commands
 * (icu/rtl/fonts/seo/mt/tms/pick/explain/eval) are LISTED in --help and stubbed: they print a clear
 * "not yet implemented" line and exit non-zero (so a caller never silently gets a no-op), pending their
 * owning clusters. `brain` is wired (it reuses the A4 index — cheap + already built).
 */

import { Command } from "commander";
import { runInit, type I18nLib } from "./commands/init.js";
import { runExtract } from "./commands/extract.js";
import { runCheck } from "./commands/check.js";
import { runBrain } from "./commands/brain.js";
import { logRun, makeEntry } from "./util/log.js";

const VERSION = "0.1.0";

/** Print structured JSON when --json, else a human summary printer. */
function emit(json: boolean, data: unknown, human: () => void): void {
  if (json) process.stdout.write(JSON.stringify(data, null, 2) + "\n");
  else human();
}

/** Mark a command not-yet-implemented: print to stderr, log, exit non-zero (never a silent no-op). */
async function notImplemented(cmd: string, owningCluster: string): Promise<never> {
  process.stderr.write(
    `parrot ${cmd}: not yet implemented (owned by ${owningCluster}). ` +
      `The acceptance path is init/extract/check; run \`parrot --help\` for the full command tree.\n`,
  );
  await logRun(makeEntry(cmd, null, Date.now(), "error", 0));
  process.exit(2);
}

export async function main(argv: string[]): Promise<void> {
  const program = new Command();

  program
    .name("parrot")
    .description(
      "The i18n/l10n employee — wire next-intl, find hardcoded strings, validate ICU plurals + RTL + hreflang " +
        "in CI. Plumbing, not copywriting.",
    )
    .version(VERSION, "-v, --version", "print parrot's version")
    .configureOutput({ writeErr: (s) => process.stderr.write(s) });

  // ---- ACCEPTANCE PATH (implemented) ----

  program
    .command("init")
    .description("wire the i18n runtime into a (Next.js) app — 4 next-intl files, version-detected middleware (proxy.ts on Next 16), setRequestLocale codegen, await params, deliberate localePrefix [acceptance step 1]")
    .option("--lib <lib>", "runtime library: next-intl | i18next", "next-intl")
    .option("--dir <app>", "target app directory", ".")
    .option("--locales <list>", "comma-separated locales to seed", "en,pl,ar")
    .option("--default-locale <locale>", "default locale", "en")
    .option("--json", "emit JSON", false)
    .action(async (opts: { lib: string; dir: string; locales: string; defaultLocale: string; json: boolean }) => {
      const started = Date.now();
      const locales = opts.locales.split(",").map((s) => s.trim()).filter(Boolean);
      const result = runInit(opts.dir, opts.lib as I18nLib, locales, opts.defaultLocale);
      await logRun(makeEntry("init", 1, started, "pass", result.filesWritten.length));
      emit(opts.json, result, () => {
        process.stdout.write(`parrot init: wired ${result.lib} in ${result.dir} (Next ${result.nextVersion ?? "unknown→16"})\n`);
        process.stdout.write(`  middleware: ${result.middlewareFile}\n`);
        process.stdout.write(`  written:  ${result.filesWritten.length ? result.filesWritten.join(", ") : "(none — already wired)"}\n`);
        if (result.filesSkipped.length) process.stdout.write(`  skipped:  ${result.filesSkipped.join(", ")} (idempotent — left untouched)\n`);
      });
    });

  program
    .command("extract")
    .description("scan source for hardcoded user-facing strings (the catalog-bypass) + used-but-missing / defined-but-unused keys; never builds keys dynamically (O19) [acceptance step 2]")
    .option("--dir <app>", "target app directory", ".")
    .option("--json", "emit JSON", false)
    .action(async (opts: { dir: string; json: boolean }) => {
      const started = Date.now();
      const result = runExtract(opts.dir);
      const findings = result.hardcoded.length + result.missingKeys.length;
      await logRun(makeEntry("extract", 7, started, findings > 0 ? "fail" : "pass", findings));
      emit(opts.json, result, () => {
        process.stdout.write(`parrot extract: ${result.dir}\n`);
        process.stdout.write(`  hardcoded strings: ${result.hardcoded.length}\n`);
        for (const h of result.hardcoded.slice(0, 20)) {
          process.stdout.write(`    ${h.file}:${h.line}:${h.column}  "${h.text}"  [${h.kind}]\n`);
        }
        process.stdout.write(`  missing keys (used, undefined): ${result.missingKeys.length}\n`);
        process.stdout.write(`  unused keys (defined, unreferenced; best-effort): ${result.unusedKeys.length}\n`);
      });
      // extract is informational; non-zero only if hardcoded strings exist (the catalog-bypass is a real defect).
      if (result.hardcoded.length > 0) process.exitCode = 1;
    });

  program
    .command("check")
    .description("the CI correctness gate: key-completeness + many-plural (pl/ar) + RTL + format + font-glyph + hreflang-graph + setRequestLocale-presence + version-correct-middleware; non-zero on any failure [acceptance step 3]")
    .argument("[dir]", "target app directory (alias for --dir)")
    .option("--dir <app>", "target app directory")
    .option("--locales <list>", "comma-separated locales", "")
    .option("--json", "emit JSON", false)
    .action(async (dirArg: string | undefined, opts: { dir?: string; locales: string; json: boolean }) => {
      const started = Date.now();
      const dir = opts.dir ?? dirArg ?? ".";
      const locales = opts.locales.split(",").map((s) => s.trim()).filter(Boolean);
      const result = runCheck(dir, locales);
      await logRun(makeEntry("check", 10, started, result.pass ? "pass" : "fail", result.failures.length));
      emit(opts.json, result, () => {
        process.stdout.write(`parrot check: ${result.dir} [${result.pass ? "PASS" : "FAIL"}]\n`);
        process.stdout.write(`  locales: ${result.locales.join(", ") || "(none found)"}\n`);
        for (const f of result.failures) {
          process.stdout.write(`  ✗ ${f.check}${f.locale ? ` (${f.locale})` : ""}: ${f.detail} [${f.source}]\n`);
        }
        for (const w of result.warnings.slice(0, 20)) process.stdout.write(`  ⚠ ${w}\n`);
        if (result.pass) process.stdout.write(`  all legs green\n`);
      });
      if (!result.pass) process.exitCode = 1;
    });

  // ---- wired (reuses the A4 brain index) ----

  program
    .command("brain")
    .description("BM25 search over brain/**.md → ranked cited hits (the Memory CLI; reuses the A4 index)")
    .argument("<query...>", "the search query")
    .option("--limit <n>", "max hits", "5")
    .option("--json", "emit JSON", false)
    .action(async (queryParts: string[], opts: { limit: string; json: boolean }) => {
      const started = Date.now();
      const query = queryParts.join(" ");
      const hits = await runBrain(query, Number(opts.limit) || 5);
      await logRun(makeEntry("brain", 11, started, "pass", hits.length));
      emit(opts.json, { query, hits }, () => {
        process.stdout.write(`parrot brain: "${query}"\n`);
        if (hits.length === 0) process.stdout.write(`  no results\n`);
        let rank = 0;
        for (const h of hits) {
          rank++;
          const cite = h.entryId ? `${h.file} ${h.entryId}` : h.file;
          process.stdout.write(`  [${rank}] ${cite} (${h.score})\n      ${h.heading}\n      ${h.snippet}\n`);
        }
      });
    });

  // ---- LISTED + stubbed (owned by other clusters; appear in --help; non-zero, never silent) ----

  program.command("icu").description("author/validate an ICU MessageFormat message (plural categories, dash-in-select, apostrophe traps)").allowUnknownOption(true).action(() => notImplemented("icu", "cluster B (icu-message-authoring)"));
  program.command("rtl").description("RTL-as-coverage audit (logical props, selective icon mirror, Arabic-safe CSS)").allowUnknownOption(true).action(() => notImplemented("rtl", "cluster B (rtl-bidi-audit)"));
  program.command("fonts").description("wire next/font per-script subsets + Noto fallback behind brand fonts").allowUnknownOption(true).action(() => notImplemented("fonts", "cluster B"));
  program.command("seo").description("validate/emit the hreflang graph (self-ref, reciprocal, BCP-47, one x-default)").allowUnknownOption(true).action(() => notImplemented("seo", "cluster B (hreflang-seo-graph)"));
  program.command("mt").description("governed machine-translation (glossary-gated, never ships unverified, TTE-aware, ZDR)").allowUnknownOption(true).action(() => notImplemented("mt", "cluster B (mt-tms-governance)"));
  program.command("tms").description("drive the TMS sync (Tolgee / Lingo.dev / Crowdin)").allowUnknownOption(true).action(() => notImplemented("tms", "cluster B (mt-tms-governance)"));
  program.command("pick").description("a library decision with the honest cost (not a feature table — O3)").allowUnknownOption(true).action(() => notImplemented("pick", "cluster B"));
  program.command("explain").description("print a brain entry by id (e.g. parrot explain P1)").allowUnknownOption(true).action(() => notImplemented("explain", "cluster B"));
  program.command("eval").description("run the eval pyramid (L1 assertions / L2 golden / L3 judge)").allowUnknownOption(true).action(() => notImplemented("eval", "cluster E (evals)"));

  await program.parseAsync(argv);
}
