import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const slowMo = process.env.SLOW ? parseInt(process.env.SLOW) : undefined;
const showServerLogs = process.env.LOG ? "pipe" : undefined;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: process.env.CI ? "npm start" : "npm run dev",
    timeout: 120000,
    port: 3000,
    stdout: "pipe",
    stderr: "pipe",
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
        ...devices["Desktop Chrome"],
        launchOptions: {
          slowMo,
        },
      },
    },
  ],
});
