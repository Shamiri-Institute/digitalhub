import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { type ConsoleMessage, expect, test } from "@playwright/test";

import { type Role, resolveRoutes } from "#/tests/platform-routes";
import { signInAs } from "#/tests/helpers";
import { dataRows, getUrl } from "#/tests/pages/helpers";

/**
 * Renders every platform page as every role and records what each page showed, so two checkouts
 * (for example before and after a data-layer change) can be compared page by page.
 *
 * Pages come from the file system and users from the database, the same way the benchmark picks
 * them (`tests/platform-routes.ts`). Assertions are soft: one
 * broken page must not hide the state of the rest, and the fingerprint file is always written.
 */
const ERROR_TEXTS = ["Oops! Something went wrong!", "Application error", "Internal Server Error"];
const ROLES: Role[] = [
  "ADMIN",
  "CLINICAL_LEAD",
  "CLINICAL_TEAM",
  "FELLOW",
  "HUB_COORDINATOR",
  "OPERATIONS",
  "SUPERVISOR",
];
const label = process.env.FINGERPRINT_LABEL ?? "local";
// Not under test-results: Playwright empties that directory at the start of every run.
const outDir = path.join(process.cwd(), "bench", "fingerprints", label);

type Fingerprint = {
  path: string;
  finalPath: string;
  status: number | null;
  headings: string[];
  tables: number;
  tableRows: number;
  text: string;
  consoleErrors: string[];
};

for (const role of ROLES) {
  test(`${role} pages render without errors`, async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000);
    const { routes } = await resolveRoutes();
    await signInAs(context, role);

    const fingerprints: Fingerprint[] = [];
    try {
      for (const route of routes.filter((r) => r.role === role)) {
        await test.step(route.path, async () => {
          const consoleErrors: string[] = [];
          const onConsole = (message: ConsoleMessage) => {
            if (message.type() === "error") consoleErrors.push(message.text());
          };
          page.on("console", onConsole);
          const response = await page.goto(getUrl(route.path));
          await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => null);
          page.off("console", onConsole);

          const finalPath = new URL(page.url()).pathname;
          expect.soft(finalPath, `${route.path} redirected to login`).not.toContain("/login");
          const text = await page.getByRole("main").first().innerText();
          for (const errorText of ERROR_TEXTS) {
            expect.soft(text, `${route.path} rendered an error`).not.toContain(errorText);
          }
          fingerprints.push({
            path: route.path,
            finalPath,
            status: response?.status() ?? null,
            headings: await page.locator("h1, h2, h3").allInnerTexts(),
            tables: await page.locator("table").count(),
            tableRows: await dataRows(page).count(),
            text,
            consoleErrors,
          });
        });
      }
    } finally {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(
        path.join(outDir, `${role}.json`),
        `${JSON.stringify(fingerprints, null, 2)}\n`,
      );
    }
  });
}
