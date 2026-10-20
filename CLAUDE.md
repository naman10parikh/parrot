@AGENTS.md

# parrot: Claude Code notes

[AGENTS.md](AGENTS.md), imported above, is the one source of instructions for every coding agent. This file adds
only what Claude Code uses. Persona: `identity/SOUL.md`.

## MCP servers

- **`.mcp.json`** is safe for anyone who clones the repository: parrot's own server from GitHub through npx, and
  context7. No secrets, no local paths.
- **`.mcp.dev.json`** holds the maintainer's set: `parrot-local` (the built `dist/mcp/server.js`, so run
  `pnpm build` first), `github` (needs `GITHUB_PERSONAL_ACCESS_TOKEN`), and `memory` and `obsidian` (paths
  relative to this repository). Load it with `claude --mcp-config .mcp.dev.json`; add `--strict-mcp-config` to load
  only that set. parrot's server reads no credentials.

## Hooks

`.claude/settings.json` wires two `PreToolUse` hooks through `$CLAUDE_PROJECT_DIR`:

- `.claude/hooks/i18n-string-gate.js` on `Write|Edit|MultiEdit`: exits 2, which blocks the edit, when it adds a
  hardcoded user-facing string to a `.tsx` or `.jsx` file, or a literal value for a secret-shaped key in `.mcp.json`.
  The plugin ships the same hook through `hooks/hooks.json`.
- `.claude/hooks/protect-secrets.js` on `Read|Edit|Write|Bash` (inherited from the Energy template): denies reading
  or writing key files such as `.env`.

`.claude/hooks/package.json` marks these hooks CommonJS: the repository's `package.json` sets `"type": "module"`,
and the inherited hooks use `require`.

## Sub-agents

- `.claude/agents/i18n-correctness-auditor.md`: audits an implementation for the bugs English hides (plurals in
  `pl` and `ar`, right-to-left layout, hreflang, missing keys).
- `.claude/agents/i18n-migration-planner.md`: plans a library migration, or a first wiring, as a full
  component-surface refactor.

The other files in `.claude/` (generic personas, skills, commands, rules and session hooks) came from the Energy
template; only the two above and `i18n-string-gate.js` are parrot's own.

## Model routing

Always Opus 4.8 (`claude-opus-4-8[1m]`), 1M context, MAX effort (chairman directive 2026-06-17; the
weekly-budget system is OFF as a constraint). `scripts/budget-manager.sh` is inherited and a no-op. The
RSI workflow and any sub-agent spawn pass an **explicit** model — no bare default. Commit trailers name
the model.
