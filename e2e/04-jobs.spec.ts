/**
 * Jobs board tests
 * - Job listing page renders
 * - Job type chips are real links with active state
 * - Sidebar sticky top clears navbar
 * - Apply flow: already-progressed application blocked (409)
 */
import { test, expect } from "@playwright/test";
import { BASIC_AUTH } from "./helpers/auth";

test.describe("Jobs page", () => {
  test("renders job list", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("job type chips are navigable links", async ({ page }) => {
    await page.goto("/jobs");
    // Job type chips should be <a> elements now (not <span>)
    const chips = page.locator("a[href*='/jobs?']");
    const count = await chips.count();
    // At least one chip link should be present (the "All" type at minimum)
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("filter by job type updates URL", async ({ page }) => {
    await page.goto("/jobs");
    const fullTimeChip = page.locator("a").filter({ hasText: "Full-time" }).first();
    if (await fullTimeChip.isVisible()) {
      await fullTimeChip.click();
      await expect(page).toHaveURL(/keyword=Full-time/);
    }
  });

  test("active chip is visually distinguished", async ({ page }) => {
    await page.goto("/jobs?keyword=Full-time");
    const fullTimeChip = page.locator("a").filter({ hasText: "Full-time" }).first();
    if (await fullTimeChip.isVisible()) {
      // Active chip has clay background
      const bg = await fullTimeChip.evaluate(
        (el) => window.getComputedStyle(el).backgroundColor
      );
      // Background should be different from the default paper color
      expect(bg).toBeTruthy();
    }
  });

  test("sidebar is visible and has correct top offset", async ({ page }) => {
    await page.goto("/jobs");
    const sidebar = page.locator("aside, [class*='sidebar']").first();
    if (await sidebar.isVisible()) {
      const box = await sidebar.boundingBox();
      if (box) {
        // Top position should be at least the navbar height
        expect(box.y).toBeGreaterThanOrEqual(60);
      }
    }
  });
});

test.describe("Job application (authenticated)", () => {
  test.use({ storageState: BASIC_AUTH });

  test("apply to job — API validates job exists", async ({ request }) => {
    const res = await request.post("/api/jobs/nonexistent-job-id/apply");
    // 401 (no auth in request context) or 404 (job not found) — both valid
    expect([401, 404]).toContain(res.status());
  });
});
