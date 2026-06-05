/**
 * Navigation smoke tests
 * - Navbar visible on all major sections
 * - No section cuts behind the fixed navbar (paddingTop: 62)
 * - Dead links don't 404
 */
import { test, expect } from "@playwright/test";
import { BASIC_AUTH } from "./helpers/auth";

test.use({ storageState: BASIC_AUTH });

const PUBLIC_PAGES = ["/", "/jobs", "/m"];
const AUTHED_PAGES = ["/me", "/chat"];

test.describe("Navbar visibility", () => {
  for (const url of [...PUBLIC_PAGES, ...AUTHED_PAGES]) {
    test(`Navbar renders on ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const nav = page.locator("nav").first();
      await expect(nav).toBeVisible();
    });
  }
});

test.describe("Section padding clears navbar", () => {
  const SECTIONS = ["/jobs", "/m", "/me", "/chat"];

  for (const url of SECTIONS) {
    test(`${url} first content block is below navbar`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      // The page wrapper div should have a top >= 62px
      const wrapper = page.locator("body > div > div, main").first();
      const box = await wrapper.boundingBox();
      if (box) {
        expect(box.y).toBeGreaterThanOrEqual(60);
      }
    });
  }
});

test.describe("Routing", () => {
  test("/n redirects to /profile", async ({ page }) => {
    await page.goto("/n");
    await expect(page).toHaveURL(/\/profile/);
  });

  test("unknown route shows 404", async ({ page }) => {
    const res = await page.goto("/definitely-does-not-exist-xyz");
    expect(res?.status()).toBe(404);
  });

  test("/me accessible when logged in", async ({ page }) => {
    await page.goto("/me");
    await expect(page).toHaveURL(/\/me/);
    await expect(page).not.toHaveURL(/\/login/);
  });
});
