import type { Locator, Page } from "@playwright/test";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionGroup, school, supervisor } from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import { createClinicalCase, required, signInAs } from "#/tests/helpers";
import { dataRows, getUrl, searchRows, waitForHydration } from "#/tests/pages/helpers";

async function tabTo(page: Page, from: Locator, target: Locator) {
  await waitForHydration(from);
  await from.focus();
  for (let presses = 0; presses < 60; presses++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  await expect(target).toBeFocused();
}

async function arrowToItem(page: Page, menu: Locator, name: string) {
  const enabledItems = menu.locator('[role="menuitem"]:not([data-disabled])');
  const names = (await enabledItems.allInnerTexts()).map((text) => text.trim());
  expect(names).toContain(name);
  await page.keyboard.press("Home");
  for (const [index, itemName] of names.entries()) {
    await expect(enabledItems.nth(index)).toBeFocused();
    if (itemName === name) return;
    await page.keyboard.press("ArrowDown");
  }
}

test("a hub coordinator opens a school's actions and its edit dialog with the keyboard", async ({
  page,
  context,
}) => {
  await signInAs(context, "HUB_COORDINATOR");
  await page.goto(getUrl("/hc/schools"));
  const firstRow = dataRows(page).first();
  const schoolName = (await firstRow.getByRole("cell").first().innerText()).trim();
  const trigger = firstRow.getByRole("button", { name: `Actions for ${schoolName}` });

  await tabTo(page, page.getByPlaceholder("Search...").first(), trigger);
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.keyboard.press("Enter");
  await arrowToItem(page, menu, "Edit school information");
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Edit school information" });
  await expect(dialog).toBeVisible();
  await expect(menu).toBeHidden();
  await expect.poll(() => dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("a supervisor opens a dialog nested in a clinical case's actions with the keyboard", async ({
  page,
  context,
  undo,
}) => {
  const { identifier: supervisorId } = await signInAs(context, "SUPERVISOR");
  required(supervisorId, "the seeded supervisor has no profile");
  const [caseSchool] = await db
    .select({ id: school.id })
    .from(school)
    .innerJoin(supervisor, eq(supervisor.hubId, school.hubId))
    .innerJoin(
      interventionGroup,
      and(eq(interventionGroup.schoolId, school.id), isNull(interventionGroup.archivedAt)),
    )
    .where(and(eq(supervisor.id, supervisorId), isNull(school.archivedAt)))
    .orderBy(school.id)
    .limit(1);
  required(caseSchool, "the seeded supervisor's hub has no school with a group");
  const clinicalCase = await createClinicalCase({
    schoolId: caseSchool.id,
    currentSupervisorId: supervisorId,
  });
  undo(clinicalCase.remove);

  await page.goto(getUrl("/sc/clinical"));
  const caseRow = (await searchRows(page, clinicalCase.pseudonym)).first();
  const trigger = caseRow.getByRole("button", { name: `Actions for ${clinicalCase.pseudonym}` });
  await tabTo(page, page.getByPlaceholder("Search...").first(), trigger);
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  await arrowToItem(page, menu, "View attendance history");
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Clinical attendance history" });
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);

  // The dialog sits inside the menu, so the menu stays open behind it until a second Escape.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(menu.getByRole("menuitem", { name: "View attendance history" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
});
