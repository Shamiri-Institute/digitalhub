import { expect, test } from "@playwright/test";

import { careAdminEmail, operationsAdminEmail, superAdminEmail } from "#/db/seed/fixtures";
import { signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

const fellowsPage = "/admin/reporting/expenses/fellows";
const payoutHistoryPage = "/admin/reporting/expenses/payout-history";

for (const email of [operationsAdminEmail, superAdminEmail]) {
  test(`R-pay-who: ${email} opens the payout pages from the Reporting tab`, async ({
    page,
    context,
  }) => {
    await signInWithEmail(context, email);
    await page.goto(getUrl("/admin/schedule"));
    await page.getByRole("link", { name: "Reporting", exact: true }).click();
    await expect(page).toHaveURL(getUrl(fellowsPage));

    await page.goto(getUrl(payoutHistoryPage));
    await expect(page.getByRole("button", { name: "Manually Trigger Payout" })).toBeVisible();
  });
}

test("R-pay-who: an admin outside the Operations team has no Reporting tab and cannot open payouts", async ({
  page,
  context,
}) => {
  await signInWithEmail(context, careAdminEmail);
  await page.goto(getUrl("/admin/schedule"));
  await expect(page.getByRole("link", { name: "Hubs", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reporting", exact: true })).toHaveCount(0);

  for (const path of [fellowsPage, payoutHistoryPage]) {
    await page.goto(getUrl(path));
    await expect(page).toHaveURL(/\/admin\/schedule$/);
  }
});
