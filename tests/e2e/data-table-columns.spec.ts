import { expect, test } from "@playwright/test";

import { signInAs } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

test("a table names its columns by their headers, row controls included", async ({
  page,
  context,
}) => {
  await signInAs(context, "SUPERVISOR");
  await page.goto(getUrl("/sc/reporting/expenses/payout-history"));
  const main = page.getByRole("main");

  // The expand and row menu columns show no header text, so it is there for screen readers.
  await expect(main.getByRole("columnheader", { name: "Details", exact: true })).toBeAttached();
  await expect(main.getByRole("columnheader", { name: "Actions", exact: true })).toBeAttached();

  // The columns here are keyed `dateAdded`, `totalPayoutAmount`, ...
  await expect(async () => {
    await main.getByRole("button", { name: "Edit columns" }).click();
    await expect(page.getByRole("menuitemcheckbox", { name: "Date Added" })).toBeVisible({
      timeout: 2000,
    });
  }).toPass();
  await expect(
    page.getByRole("menuitemcheckbox", { name: "Total Payout Amount (KES)" }),
  ).toBeVisible();
  await expect(page.getByRole("menuitemcheckbox", { name: "dateAdded" })).toHaveCount(0);
});
