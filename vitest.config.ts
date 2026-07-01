import { defineConfig, configDefaults } from "vitest/config";

// Keep the Playwright browser E2E (test/e2e/**) OUT of the vitest run — those specs use @playwright/test,
// not vitest, and are driven by playwright.config.ts (`pnpm test:e2e`). vitest keeps the unit/integration
// suites; the cockpit's $0 deterministic gate is scripts/cockpit-smoke.mjs (`pnpm cockpit:smoke`).
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "test/e2e/**"],
  },
});
