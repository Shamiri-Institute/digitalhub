import { availableParallelism } from "node:os";

import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const slowMo = process.env.SLOW ? Number.parseInt(process.env.SLOW, 10) : undefined;
const showServerLogs = process.env.LOG ? "pipe" : undefined;
const useHeadless = process.env.CI ? { headless: true } : devices["Desktop Chrome"];

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
  // Stop at the first failure; `--max-failures=0` runs everything.
  maxFailures: 1,
  // A test that needs a retry to pass has a bug; fix it rather than retry it.
  retries: 0,
  // Each worker drives a browser against one shared server and database. Measured on 4 cores, a
  // second worker cut a shard from 164s to 97s, a third only to 89s, and a fourth pushed long tests
  // past their timeout, so CI runs one worker per two cores.
  workers: isCI ? Math.max(1, Math.floor(availableParallelism() / 2)) : undefined,
  // Server actions write to a real database; 5s is short when several workers share one machine.
  // `next dev` also compiles a page on first visit, so a cold dev server needs longer.
  expect: { timeout: process.env.E2E_PROD ? 10_000 : 60_000 },
  use: { trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      testIgnore: /payout-run\.spec\.ts/,
      use: { ...useHeadless, launchOptions: { slowMo } },
    },
    // A payout run executes every eligible statement in the database, so it runs after the rest.
    {
      name: "payout-run",
      testMatch: /payout-run\.spec\.ts/,
      dependencies: ["chromium"],
      use: { ...useHeadless, launchOptions: { slowMo } },
    },
  ],
});
