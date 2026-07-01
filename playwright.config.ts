import { defineConfig, devices } from "@playwright/test";

// G2 cockpit E2E config (MASTER-TODOS G2; PLAN §9 E2E). Boots the real stdlib cockpit on :7799 and
// drives it in a real browser. The specs assert the 4 views render real data and that /ar-proof is a
// genuine `<html dir="rtl">` document with a DISTINCT Arabic plural per CLDR category (the RTL coverage
// proof O11/O23 — the one thing an assertion-only eval structurally cannot give).
//
// Chromium-gated → this is the ADDITIVE browser layer. The DETERMINISTIC $0 merge gate is
// scripts/cockpit-smoke.mjs (no browser, runs in CI on every push). Red-blocking wherever chromium is
// available (local + the best-effort CI cockpit-e2e job).
const PORT = Number(process.env.PARROT_COCKPIT_PORT) || 7799;

export default defineConfig({
  testDir: "./test/e2e",
  timeout: 30_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node cockpit/server.mjs --port ${PORT}`,
    url: `http://localhost:${PORT}/api/brain/files`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
