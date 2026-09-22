import { expect, test } from "@playwright/test";

import { signInAs } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

/**
 * A supervisor raises a ticket, finds it in the list and opens it. This is the one user flow that
 * writes and then reads its own write back through two different queries (the list and the
 * ticket dialog), so it catches a write that lands in the wrong shape.
 */
test("supervisor creates a ticket and can view it in the list", async ({ page, context }) => {
  test.setTimeout(3 * 60 * 1000);
  await signInAs(context, "SUPERVISOR");
  const subject = `E2E ticket ${Date.now()}`;

  await page.goto(getUrl("/sc/tickets"));
  await page.getByRole("button", { name: "New ticket" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("Enter ticket subject").fill(subject);
  await dialog.getByPlaceholder("Describe the issue").fill("Raised by the Playwright ticket flow.");
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "TECH" }).click();
  await dialog.getByRole("button", { name: "Submit" }).click();
  await expect(dialog).toBeHidden();

  await page.getByPlaceholder("Search...").fill(subject);
  const row = page.getByRole("row").filter({ hasText: subject });
  await expect(row).toBeVisible();
  // The table lowercases these through CSS, so innerText does not match the stored value.
  await expect(row).toContainText(/tech/i);
  await expect(row).toContainText(/medium/i);

  await row.getByRole("cell").last().click();
  await page.getByRole("menuitem", { name: "View ticket" }).click();
  await expect(page.getByRole("dialog")).toContainText(subject);
});
