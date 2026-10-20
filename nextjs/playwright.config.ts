import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// E2E_USER_EMAIL / E2E_USER_PASSWORD (optional) are read from nextjs/.env
dotenv.config({ path: ".env", quiet: true });

// Set PORT when another dev server already owns :3000 (e.g. one running from
// another worktree) — otherwise the tests silently run against that one.
const port = Number(process.env.PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

// CI tests the production build, laid out like the Docker image
const ciServer = [
  "bun run build",
  "cp -r public .next/standalone/",
  "cp -r .next/static .next/standalone/.next/",
  "node .next/standalone/server.js",
].join(" && ");

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
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
        command: process.env.CI ? ciServer : "bun dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: process.env.CI ? 300_000 : 120_000,
        env: {
          // utilities/db.ts creates no pool when CI is set (for image builds
          // without a database); the e2e server needs one
          CI: "",
          // server.js binds to HOSTNAME, which GitHub runners set to the
          // machine name
          HOSTNAME: "localhost",
          PORT: String(port),
          // Features hidden in production are tested too (utilities/features.ts)
          FEATURE_FLIGHT_LOG: "true",
        },
      },
});
