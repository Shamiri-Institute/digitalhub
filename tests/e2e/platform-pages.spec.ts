import { type ConsoleMessage, expect, type Response, test } from "@playwright/test";

import { signInAs } from "#/tests/helpers";
import { type Role, resolveRoutes } from "#/tests/platform-routes";
import { getUrl } from "#/tests/pages/helpers";

/**
 * Opens every platform page as every role and fails if one does not render.
 *
 * Pages come from the `app/(platform)` tree and users from the database, so a page added without
 * a test is still covered. Assertions are soft: one broken page must not hide the state of the
 * rest, so a run reports every failure at once rather than the first.
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

for (const role of ROLES) {
  test(`${role} pages render without errors`, async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000);
    const { routes } = await resolveRoutes();
    await signInAs(context, role);

    for (const route of routes.filter((r) => r.role === role)) {
      await test.step(route.path, async () => {
        const consoleErrors: string[] = [];
        const onConsole = (message: ConsoleMessage) => {
          if (message.type() === "error") consoleErrors.push(message.text());
        };
        // A server action the page fires on its own (on mount) that throws answers with a 5xx; the
        // page can still render, so check the responses (#844).
        const failedActions: string[] = [];
        const onResponse = (response: Response) => {
          if (response.status() >= 500 && response.request().headers()["next-action"]) {
            failedActions.push(`${response.status()} ${response.url()}`);
          }
        };
        page.on("console", onConsole);
        page.on("response", onResponse);
        await page.goto(getUrl(route.path));
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => null);
        page.off("console", onConsole);
        page.off("response", onResponse);

        const finalPath = new URL(page.url()).pathname;
        expect.soft(finalPath, `${route.path} redirected to login`).not.toContain("/login");
        expect.soft(failedActions, `${route.path} had a failed server action`).toEqual([]);
        const text = await page.getByRole("main").first().innerText();
        for (const errorText of ERROR_TEXTS) {
          expect.soft(text, `${route.path} rendered an error`).not.toContain(errorText);
        }
      });
    }
  });
}
