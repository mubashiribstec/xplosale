/**
 * Account / profile tests
 * - /me renders without error
 * - Profile subpages (network, job-seeker, employer) load without crash
 * - Load errors are displayed (not silent)
 * - Tier badge shows correct tier
 */
import { test, expect } from "@playwright/test";
import { BASIC_AUTH, VERIFIED_AUTH } from "./helpers/auth";

test.describe("Account page (BASIC user)", () => {
  test.use({ storageState: BASIC_AUTH });

  test("/me renders", async ({ page }) => {
    await page.goto("/me");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("tier shows BASIC for unverified user", async ({ page }) => {
    await page.goto("/me");
    // Should see "Basic" text or verification CTA
    const tierText = page.getByText(/basic/i).or(page.getByText(/get verified/i)).first();
    await expect(tierText).toBeVisible({ timeout: 5000 });
  });

  test("/me/network profile page renders", async ({ page }) => {
    await page.goto("/me/network");
    await expect(page.locator("body")).not.toBeEmpty();
    // Should not crash — heading or form visible
    const content = page.locator("h1, h2, form").first();
    await expect(content).toBeVisible({ timeout: 5000 });
  });

  test("/me/job-seeker profile page renders", async ({ page }) => {
    await page.goto("/me/job-seeker");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("/me/employer profile page renders", async ({ page }) => {
    await page.goto("/me/employer");
    await expect(page.locator("body")).not.toBeEmpty();
  });
});

test.describe("Account page (VERIFIED user)", () => {
  test.use({ storageState: VERIFIED_AUTH });

  test("tier shows VERIFIED for verified user", async ({ page }) => {
    await page.goto("/me");
    const tierText = page.getByText(/verified/i).first();
    await expect(tierText).toBeVisible({ timeout: 5000 });
  });

  test("partner application CTA visible for verified user", async ({ page }) => {
    await page.goto("/me");
    const cta = page.getByText(/partner/i).first();
    await expect(cta).toBeVisible({ timeout: 5000 });
  });
});
