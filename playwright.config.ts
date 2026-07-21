import { defineConfig } from "@playwright/test";

/**
 * E2E smoke suite. Runs against a production build (`npm run build` first).
 * CHROMIUM_PATH lets environments with a pre-installed Chromium (e.g. this
 * repo's remote dev container: /opt/pw-browsers/chromium) skip the download.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3211",
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : undefined,
  },
  webServer: {
    command: "npm run start -- -p 3211",
    url: "http://localhost:3211",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
