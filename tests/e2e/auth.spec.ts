import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
  // These tests exercise the unauthenticated experience.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("signed-out users are redirected to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/transactions");
    await expect(page).toHaveURL(/\/login/);
  });

  test("export APIs require a session", async ({ request }) => {
    for (const path of ["/api/export/transactions", "/api/export/data", "/api/export/tax"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(401);
    }
  });

  test("wrong password is rejected with a uniform error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("alex@example.com");
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator('p[role="alert"]')).toContainText("doesn't match");
  });

  test("email/password sign-in works for the seeded user", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("alex@example.com");
    await page.getByLabel("Password").fill("demo1234");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Financial health" })).toBeVisible();
  });

  test("registration creates an isolated account with default categories", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByLabel("Name").fill("E2E Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("supersecret1");
    await page.getByRole("button", { name: "Create account" }).click();

    // Lands on their own empty dashboard — greeted by name, none of Alex's data
    await expect(page.getByText("G’day, E2E")).toBeVisible();
    await page.goto("/transactions");
    await expect(page.getByText("No transactions match.")).toBeVisible();
    // Default categories exist for the add-transaction form
    await expect(
      page.locator('select[name="categoryId"]').first().locator("option", { hasText: "Groceries" }),
    ).toHaveCount(1);

    // Sign out returns to login
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
