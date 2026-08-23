import { expect, test as setup } from "@playwright/test";

/** Sign into the demo account once; every spec reuses the saved session. */
setup("authenticate as demo user", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Explore the demo/ }).click();
  await expect(page.getByRole("heading", { name: "Financial health" })).toBeVisible();
  await page.context().storageState({ path: "test-results/.auth/user.json" });
});
