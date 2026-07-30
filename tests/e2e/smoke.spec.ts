import { expect, test } from "@playwright/test";

test.describe("Sage smoke suite", () => {
  test("dashboard answers 'how am I doing?'", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Financial health" })).toBeVisible();
    await expect(page.getByText("Safe to spend")).toBeVisible();
    await expect(page.getByText("Net worth", { exact: false }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your coach" })).toBeVisible();
    // Score ring is accessible
    await expect(page.getByRole("img", { name: /Financial health score \d+ out of 100/ })).toBeVisible();
  });

  test("coach answers affordability questions from real data", async ({ page }) => {
    await page.goto("/coach");
    await expect(page.getByText(/G'day Alex/)).toBeVisible();
    await page.getByLabel("Ask the coach a question").fill("Can I afford a $200 dinner?");
    await page.getByLabel("Send question").click();
    await expect(page.getByText(/safe-to-spend/).first()).toBeVisible();
    await expect(page.getByText("Cash on hand", { exact: false })).toBeVisible();
    // Second turn: health-score intent
    await page.getByLabel("Ask the coach a question").fill("How do I improve my health score?");
    await page.getByLabel("Send question").click();
    await expect(page.getByText(/\/100/).first()).toBeVisible();
  });

  test("receipt attaches to a transaction and is served back", async ({ page }) => {
    await page.goto("/transactions");
    // 1x1 PNG
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    await page.getByLabel("Attach receipt").first().setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: png });
    const viewLink = page.getByLabel("View receipt").first();
    await expect(viewLink).toBeVisible();
    const href = await viewLink.getAttribute("href");
    const res = await page.request.get(href!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
  });

  test("every feature page renders", async ({ page }) => {
    for (const path of [
      "/transactions",
      "/budgets",
      "/goals",
      "/insights",
      "/subscriptions",
      "/bills",
      "/net-worth",
      "/investments",
      "/debts",
      "/habits",
      "/reports",
      "/tax",
      "/notifications",
      "/import",
      "/settings",
    ]) {
      const res = await page.goto(path);
      expect(res?.status(), `${path} should return 200`).toBe(200);
    }
  });

  test("tax centre marks a deduction and exports EOFY CSV", async ({ page, request }) => {
    await page.goto("/tax");
    const before = await page.getByText("Deductions tracked").locator("..").locator("p").nth(1).textContent();
    const firstSuggestion = page.getByRole("button", { name: /^Mark .* as deductible$/ }).first();
    if (await firstSuggestion.isVisible().catch(() => false)) {
      await firstSuggestion.click();
      await expect(async () => {
        const after = await page.getByText("Deductions tracked").locator("..").locator("p").nth(1).textContent();
        expect(after).not.toBe(before);
      }).toPass();
    }
    const csv = await request.get("/api/export/tax");
    expect(csv.status()).toBe(200);
    expect(await csv.text()).toContain("Sage EOFY deduction export");
  });

  test("challenges can be joined and are evaluated live", async ({ page }) => {
    await page.goto("/habits");
    // Seeded Coffee Challenge is already in flight
    await expect(page.getByRole("heading", { name: "Your challenges" })).toBeVisible();
    await expect(page.getByText(/coffee cap used/)).toBeVisible();
    // Join a new one (No Spend Week) unless already active
    const joinButtons = page.getByRole("button", { name: "Start challenge" });
    if ((await joinButtons.count()) > 0) {
      await joinButtons.first().click();
      await expect(page.getByRole("button", { name: "In progress" }).first()).toBeVisible();
    }
  });

  test("investments page shows portfolio and allocation", async ({ page }) => {
    await page.goto("/investments");
    await expect(page.getByText("Portfolio value")).toBeVisible();
    await expect(page.getByRole("cell", { name: "VAS" })).toBeVisible();
    await expect(page.getByText("Australian shares", { exact: true })).toBeVisible();
  });

  test("manual transaction is added and auto-categorised", async ({ page }) => {
    await page.goto("/transactions");
    const merchant = `E2E CAFE ${Date.now()}`;
    await page.getByLabel("Merchant", { exact: false }).fill(merchant);
    await page.getByLabel("Amount", { exact: false }).fill("7.50");
    await page.getByRole("button", { name: "Add transaction" }).click();

    // Appears in the list, auto-categorised as Coffee via the knowledge base
    const row = page.getByRole("row", { name: /E2e Cafe/i }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText("Coffee");
    await expect(row).toContainText("$7.50");
  });

  test("CSV import previews, flags duplicates, and imports", async ({ page }) => {
    await page.goto("/import");
    const stamp = Date.now();
    const csv = [
      "Date,Amount,Description",
      `15/07/2026,-12.34,E2E IMPORT SHOP ${stamp}`,
      `15/07/2026,-12.34,E2E IMPORT SHOP ${stamp}`, // in-file duplicate
      `16/07/2026,-45.00,E2E FUEL STOP ${stamp}`,
    ].join("\n");

    await page.getByLabel("Choose CSV file").setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });

    await expect(page.getByText("2 new · 1 duplicates will be skipped")).toBeVisible();
    await page.getByRole("button", { name: "Import 2 transactions" }).click();
    await expect(page.getByText(/Imported 2 transactions/)).toBeVisible();
  });

  test("bank sync runs the pipeline and reports results", async ({ page }) => {
    await page.goto("/import");
    await page.getByRole("button", { name: "Sync now" }).click();
    await expect(page.getByText(/imported ·/)).toBeVisible({ timeout: 15_000 });
  });

  test("reports export links serve real files", async ({ page, request }) => {
    await page.goto("/reports");
    const csv = await request.get("/api/export/transactions");
    expect(csv.status()).toBe(200);
    expect(await csv.text()).toContain("Date,Merchant,Category,Account,Amount");
    const json = await request.get("/api/export/data");
    expect(json.status()).toBe(200);
    expect(await json.json()).toHaveProperty("transactions");
  });

  test("dark mode toggle persists", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Switch to dark mode|Switch to light mode/ }).click();
    const wasDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    await page.reload();
    const stillDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(stillDark).toBe(wasDark);
  });
});
