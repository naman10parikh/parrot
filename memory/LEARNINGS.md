# parrot — LEARNINGS (append-only)

Every error → root cause → rule. Auto-compressed when >500 lines (memory-compress.sh).

## 2026-06-30 · A linter's expected non-zero exit must not end the step

- **What broke:** the first `parrot acceptance` run went red at the init, extract, check, assert step.
- **Root cause:** `parrot extract` and `parrot check` are linters: they set exit code 1 when they find issues, and the
  acceptance fixture plants a hardcoded string and a Polish plural gap on purpose. Under GitHub's `set -e`, that
  expected exit ended the step before `eval/acceptance/assert.mjs`, the real gate, could read the captured JSON.
- **Rule:** run a linter whose findings are expected with `… --json > out.json || true`, and let one assertion script
  decide pass or fail.

## 2026-06-30 · Never offer a stubbed command in a user interface

- **What broke:** the cockpit's "Ask" view offered `pick`, and choosing it returned "not yet implemented" with exit 2.
- **Root cause:** the CLI `pick` command is a deliberate stub, but the cockpit listed it as a working verb.
- **Rule:** a surface lists only what runs today; a planned command is labelled planned, in the UI and in the docs
  (AGENTS.md now names the eight CLI stubs).

## 2026-06-30 · A browser download in CI is flaky: keep the merge gate deterministic

- **What broke:** the real-browser cockpit test failed intermittently on GitHub's runners while downloading Chromium.
- **Root cause:** the download depends on the network and the runner image, not on parrot.
- **Rule:** the merge gate for the cockpit is `scripts/cockpit-smoke.mjs`, which needs no browser; the Playwright test
  runs with `continue-on-error` and is proven locally.

## 2026-10-19 · In a `"type": "module"` repo, CommonJS hooks crash and guard nothing

- **What broke:** the inherited `protect-secrets.js` hook, wired on every Read, Edit, Write and Bash call, failed with
  "require is not defined in ES module scope", so it never blocked a read of `.env`.
- **Root cause:** `package.json` sets `"type": "module"`, which makes every `.js` file an ES module, and the inherited
  hooks use `require`. A crashed PreToolUse hook does not block the tool call.
- **Rule:** `.claude/hooks/package.json` sets `"type": "commonjs"`; after any change to the package type, run each
  wired hook on a harmless payload and on a payload it must block.

## 2026-10-19 · An npx bin is a symlink: resolve it before a main-module check

- **What broke:** `parrot-mcp` started through a symlink, as npx does from `node_modules/.bin`, exited at once with
  no server.
- **Root cause:** the start check compared `import.meta.url` with `file://` plus the raw `process.argv[1]`, which is
  the symlink, not the module.
- **Rule:** compare `realpathSync(process.argv[1])` with `fileURLToPath(import.meta.url)`, put a shebang on every
  bin target, and prove each bin through `npx -y -p github:naman10parikh/parrot <bin>` from an empty folder.
