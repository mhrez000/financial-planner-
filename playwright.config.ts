import { defineConfig } from "@playwright/test";

/**
 * E2E smoke suite. Runs against a production build (`npm run build` first).
 * The `setup` project signs into the demo account once and saves the session
 * cookie; the main project reuses it via storageState.
 * CHROMIUM_PATH lets environments with a pre-installed Chromium (e.g. this
 * repo's remote dev container: /opt/pw-browsers/chromium) skip the download.
 */
const launchOptions = process.env.CHROMIUM_PATH
  ? { executablePath: process.env.CHROMIUM_PATH }
  : undefined;

export default defineConfig({
  testDir: "tests/e2e",
  // Fresh seeded database per run so mutation flows (imports, sync,
  // registration) are idempotent — the dedupe engine would otherwise
  // correctly flag repeats from previous runs.
  globalSetup: "./tests/e2e/global.setup.ts",
  timeout: 30_000,
  // Tests share one demo database (SQLite locally) — run serially so
  // mutating flows (imports, sync, registration) can't contend.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3211",
    launchOptions,
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      testMatch: /.*\.spec\.ts/,
      dependencies: ["setup"],
      use: { storageState: "test-results/.auth/user.json", launchOptions },
    },
  ],
  webServer: {
    command: "npm run start -- -p 3211",
    url: "http://localhost:3211/login",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
