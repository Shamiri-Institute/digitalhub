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
    // E2E_PROD=1 serves a prior `npm run build`, to catch bugs that only a production build shows.
    command: process.env.E2E_PROD ? "npm run start" : "npm run dev",
    timeout: 480 * 1000, // 2 minutes
    port: Number(process.env.PORT ?? 3000),
    reuseExistingServer: !isCI,
    stdout: showServerLogs,
    stderr: showServerLogs,
  },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  globalSetup: "./tests/global-setup.ts",
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
