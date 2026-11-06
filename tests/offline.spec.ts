import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";

test.describe("Offline-first flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clerk.signIn({
      page,
      emailAddress: process.env.CLERK_TEST_USER_EMAIL!,
    });
    await page.goto("/");
  });

  test("add expenses offline, see waiting state, then sync when online", async ({ page, context }) => {
    // Wait for the app shell to load
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible({ timeout: 10000 });

    // Go offline
    await context.setOffline(true);

    // Add three expenses
    for (let i = 1; i <= 3; i++) {
      await page.getByRole("button", { name: /Add Expense/i }).first().click();
      await page.getByLabel("Amount").fill(String(i * 1000));
      await page.getByRole("button", { name: "Save Expense" }).click();
      await expect(page.getByRole("button", { name: "Save Expense" })).not.toBeVisible();
    }

    // Verify the sync pill shows the waiting state. 
    // Using a regex makes this robust against the exact count and "Syncing" flashes.
    const syncPill = page.locator('[aria-live="polite"]').first();
    await expect(syncPill).toContainText(/changes? waiting/i, { timeout: 10000 });

    // Go back online
    await context.setOffline(false);

    // Wait for the sync engine to trigger and verify the pill returns to "Synced"
    await expect(syncPill).toContainText("Synced", { timeout: 15000 });

    // Verify the expenses are now visible in the History page
    await page.getByRole("link", { name: "History" }).click();
    await expect(page.getByText("₦1,000.00")).toBeVisible();
    await expect(page.getByText("₦2,000.00")).toBeVisible();
    await expect(page.getByText("₦3,000.00")).toBeVisible();
  });
});