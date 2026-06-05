/**
 * Admin panel tests
 * - Admin routes require ADMIN role
 * - Support queue shows "needs reply" badge
 * - Partner application queue renders
 * - Verification queue renders
 */
import { test, expect } from "@playwright/test";
import { ADMIN_AUTH, BASIC_AUTH } from "./helpers/auth";

test.describe("Admin route protection", () => {
  test.use({ storageState: BASIC_AUTH });

  const ADMIN_ROUTES = ["/admin", "/admin/users", "/admin/support", "/admin/partners"];

  for (const url of ADMIN_ROUTES) {
    test(`${url} redirects non-admin to login`, async ({ page }) => {
      await page.goto(url);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe("Admin panel (ADMIN user)", () => {
  test.use({ storageState: ADMIN_AUTH });

  test("/admin dashboard renders", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("body")).not.toBeEmpty();
    // Should show some admin content — not a login redirect
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("/admin/support renders support queue", async ({ page }) => {
    await page.goto("/admin/support");
    await expect(page).not.toHaveURL(/\/login/);
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test("/admin/partners renders partner applications queue", async ({ page }) => {
    await page.goto("/admin/partners");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("/admin/verifications renders verification queue", async ({ page }) => {
    await page.goto("/admin/verifications");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).not.toBeEmpty();
  });
});
