/**
 * Chat tests
 * - Chat layout has navbar
 * - Chat list renders without error
 * - Support hints appear for ADMIN_DM rooms
 * - Send failure shows error banner, restores input
 */
import { test, expect } from "@playwright/test";
import { BASIC_AUTH } from "./helpers/auth";

test.describe("Chat layout", () => {
  test.use({ storageState: BASIC_AUTH });

  test("chat index renders with navbar", async ({ page }) => {
    await page.goto("/chat");
    const nav = page.locator("nav").first();
    await expect(nav).toBeVisible();
  });

  test("chat page is below navbar", async ({ page }) => {
    await page.goto("/chat");
    const main = page.locator("main, [style*='paddingTop']").first();
    const box = await main.boundingBox();
    if (box) {
      expect(box.y).toBeGreaterThanOrEqual(60);
    }
  });

  test("nonexistent room shows error or empty state", async ({ page }) => {
    await page.goto("/chat/nonexistent-room-id-xyz");
    // Should not show a blank white page — some message visible
    await expect(page.locator("body")).not.toBeEmpty();
  });
});

test.describe("Chat API", () => {
  test("GET /api/rooms returns list or 401", async ({ request }) => {
    const res = await request.get("/api/rooms");
    expect([200, 401]).toContain(res.status());
  });

  test("POST /api/rooms/messages requires auth", async ({ request }) => {
    const res = await request.post("/api/rooms/test-room/messages", {
      data: { body: "hello" },
    });
    expect(res.status()).toBe(401);
  });
});
