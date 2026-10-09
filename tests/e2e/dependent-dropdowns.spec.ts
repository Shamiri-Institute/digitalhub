import { expect, test } from "@playwright/test";

import { signInWithEmail } from "#/tests/helpers";

/**
 * Dropdowns that load their options when another dropdown changes. The read starts in the change
 * handler, so these tests pick a value and wait for the next dropdown's options.
 */

test("a hub coordinator picks a school and sees its groups in the move-school form", async ({
  page,
  context,
}) => {
  await signInWithEmail(context, "mikel.arteta@test.com");
  await page.goto("/hc/schools/ARSENAL_SCH/students", { waitUntil: "networkidle" });
  await page.locator("table tbody tr").first().getByRole("cell").last().click();
  await page.getByRole("menuitem", { name: "Move to another school" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option").first().click();
  const groupSelect = dialog.getByRole("combobox").nth(1);
  await expect(groupSelect).toBeEnabled();
  await groupSelect.click();
  await expect(page.getByRole("option").first()).toBeVisible();
});

test("a supervisor picks a fellow and a group and sees the group's sessions", async ({
  page,
  context,
}) => {
  await signInWithEmail(context, "martin.odegaard@test.com");
  await page.goto("/sc/reporting/recordings", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Upload recording" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Select a fellow" }).click();
  await page.getByRole("option").first().click();
  const groupSelect = dialog.getByRole("combobox").nth(0);
  await expect(groupSelect).toBeEnabled();
  await groupSelect.click();
  await page.getByRole("option").first().click();
  const sessionSelect = dialog.getByRole("combobox").nth(1);
  await expect(sessionSelect).toBeEnabled();
  await sessionSelect.click();
  await expect(page.getByRole("option").first()).toBeVisible();
});
