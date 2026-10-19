import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// E2E_USER_EMAIL / E2E_USER_PASSWORD (optional) are read from nextjs/.env
dotenv.config({ path: ".env", quiet: true });

// Set PORT when another dev server already owns :3000 (e.g. one running from
// another worktree) — otherwise the tests silently run against that one.
const port = Number(process.env.PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? "github"
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "fi-FI",
    timezoneId: "Europe/Helsinki",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "bun dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
