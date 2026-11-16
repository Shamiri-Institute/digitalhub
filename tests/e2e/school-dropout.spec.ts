import type { Page } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { school, schoolDropoutHistory } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test, type Undo } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { cellUnder, chooseRowAction, getUrl, searchRows } from "#/tests/pages/helpers";

async function pickCoordinator() {
  const {
    rows: [row],
  } = await db.execute<{ email: string; hubId: string }>(sql`
    select u.email, hc.assigned_hub_id as "hubId"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id
    where hc.assigned_hub_id is not null and ${signableMember()}
    order by u.email desc
    limit 1`);
  return row;
}

async function createSchool(
  hubId: string,
  undo: Undo,
  dropout: { droppedOut: boolean; dropoutReason?: string } = { droppedOut: false },
) {
  const schoolId = objectId("sch");
  const schoolName = `E2E dropout school ${Date.now()}`;
  await db.insert(school).values({
    // The edit form saves only a school whose details pass its checks.
    schoolDemographics: "Mixed",
    schoolCounty: "Nairobi",
    schoolSubCounty: "Westlands",
    boardingDay: "Day",
    schoolType: "National",
    id: schoolId,
    visibleId: objectId("sch"),
    schoolName,
    hubId,
    numbersExpected: 40,
    ...dropout,
  });
  undo(async () => {
    await db.delete(schoolDropoutHistory).where(eq(schoolDropoutHistory.schoolId, schoolId));
    await db.delete(school).where(eq(school.id, schoolId));
  });
  return schoolName;
}

async function openSchools(page: Page) {
  await page.goto(getUrl("/hc/schools"));
}

test("a school dropped out in another tab stays dropped when its details are saved", async ({
  page,
  context,
  undo,
}) => {
  const coordinator = await pickCoordinator();
  required(coordinator, "a hub coordinator with a hub");
  const schoolName = await createSchool(coordinator.hubId, undo);
  await signInWithEmail(context, coordinator.email);

  await openSchools(page);
  await chooseRowAction(page, await searchRows(page, schoolName), "Edit school information");
  const edit = page.getByRole("dialog", { name: "Edit school information" });
  await edit.getByLabel("Principal name").fill("E2E Principal");

  const otherTab = await context.newPage();
  await openSchools(otherTab);
  await chooseRowAction(otherTab, await searchRows(otherTab, schoolName), "Dropout school");
  const dropout = otherTab.getByRole("dialog", { name: "Drop out school" });
  await dropout.getByRole("combobox").click();
  await otherTab.getByRole("option").first().click();
  await dropout.getByRole("button", { name: "Submit" }).click();
  await otherTab
    .getByRole("dialog", { name: "Confirm drop out" })
    .getByRole("button", { name: "Confirm" })
    .click();
  await expect(otherTab.getByRole("dialog")).toBeHidden();

  await edit.getByRole("button", { name: "Save Changes" }).click();
  await expect(edit).toBeHidden();

  await page.reload();
  const row = await searchRows(page, schoolName);
  await expect(await cellUnder(page, row, "Active status")).toHaveText("Inactive");
});

test("a school dropped out without a dropout date stays dropped out and offers no edit", async ({
  page,
  context,
  undo,
}) => {
  const coordinator = await pickCoordinator();
  required(coordinator, "a hub coordinator with a hub");
  // Schools dropped out before the dropout date was recorded have none.
  const schoolName = await createSchool(coordinator.hubId, undo, {
    droppedOut: true,
    dropoutReason: "Left the programme",
  });
  await signInWithEmail(context, coordinator.email);

  await openSchools(page);
  const row = await searchRows(page, schoolName);
  await expect(await cellUnder(page, row, "Active status")).toHaveText("Inactive");
  await row.getByRole("button", { name: `Actions for ${schoolName}` }).click();
  await expect(page.getByRole("menuitem")).toHaveText(["View school", "Undo dropout"]);
});
