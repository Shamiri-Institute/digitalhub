import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const slowMo = process.env.SLOW ? Number.parseInt(process.env.SLOW, 10) : undefined;
const showServerLogs = process.env.LOG ? "pipe" : undefined;
const useHeadless = process.env.CI ? { headless: true } : devices["Desktop Chrome"];

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    // CI and `npm run test:prod` set E2E_PROD=1 to serve a production build; `npm test` uses `next dev`.
    command: process.env.E2E_PROD ? "npm run start" : "npm run dev",
    timeout: 480 * 1000,
    port: Number(process.env.PORT ?? 3000),
    reuseExistingServer: !isCI,
    stdout: showServerLogs,
    stderr: showServerLogs,
  },
  // `next dev` compiles each page on first use, which can take longer than the default.
  timeout: process.env.E2E_PROD ? 30_000 : 3 * 60 * 1000,
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  use: { trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      use: {
        ...useHeadless,
        launchOptions: {
          slowMo,
        },
      },
    },
  ],
});
