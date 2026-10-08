import { expect, test } from "@playwright/test";

import { getUrl } from "#/tests/pages/helpers";

const pagesThatCheckTheProfile = [
  "/fel/portal",
  "/hc/schools",
  "/ops/reporting/expenses/payout-history",
];

test.describe("a session cookie with no session in the database", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: "deleted-session-token",
        domain: "localhost",
        path: "/",
      },
    ]);
  });

  for (const route of pagesThatCheckTheProfile) {
    test(`${route} goes to the login page`, async ({ page }) => {
      await page.goto(getUrl(route));
      await expect(page).toHaveURL(new RegExp(`^${getUrl("/login")}`));
    });
  }
});
