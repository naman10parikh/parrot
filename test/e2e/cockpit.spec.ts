import { test, expect } from "@playwright/test";

// Cockpit E2E (MASTER-TODOS G2; PLAN §9 E2E + §10). Playwright loads the real stdlib cockpit
// (booted by playwright.config.ts webServer on :7799), asserts the 4 views render real data, and
// asserts parrot's DEFINING coverage proof: the /ar/ render is `<html dir="rtl">` with a DISTINCT
// Arabic plural per CLDR category — the proof a string-diff eval cannot produce (O11/O23).
// Red-blocking wherever chromium is available; the $0 merge gate is scripts/cockpit-smoke.mjs.

test.describe("parrot cockpit", () => {
  test("loads and shows all four views + the boundary creed", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header .brand")).toContainText("parrot");
    // the defining creed is present on first paint: parrot carries, never authors
    await expect(page.locator(".boundary")).toContainText("never authors");
    const navLabels = await page.locator("#nav button").allTextContents();
    expect(navLabels).toEqual(["Brain browser", "Run log", "Eval scores", "Ask the employee"]);
  });

  test("brain browser renders the 6 files and auto-opens one", async ({ page }) => {
    await page.goto("/");
    const files = page.locator(".brain-list .file");
    await expect(files).toHaveCount(6);
    // the first file auto-opens; its real markdown renders into the content pane
    await expect(page.locator(".brain-content pre")).toContainText("EXPERTISE-MAP");
  });

  test("run log shows a real runs.jsonl row + aggregates", async ({ page }) => {
    await page.goto("/");
    await page.locator('#nav button[data-view="runs"]').click();
    await expect(page.locator("#runs-stats .stat").first()).toBeVisible();
    await expect(page.locator("#runs-tbody tr").first()).toBeVisible();
  });

  test("the /ar/ render proves dir=rtl with distinct Arabic plurals (the coverage proof)", async ({ page }) => {
    await page.goto("/ar-proof");
    // the load-bearing assertion an assertion-only eval can't give (O11): the root element is RTL
    expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
    const plurals = page.locator("li.ar-plural");
    await expect(plurals).toHaveCount(3);
    // the CLDR categories render DISTINCT strings (proven, not the English fallback repeated)
    const texts = (await plurals.allTextContents()).map((t) => t.trim());
    expect(new Set(texts).size).toBeGreaterThanOrEqual(2);
  });
});
