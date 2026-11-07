import type { BrowserContext, Page } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { fellow, interventionGroup } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test, type Undo } from "#/tests/fixtures";
import { raceOnRow, required, signableMember, signInWithEmail } from "#/tests/helpers";
import { cellUnder, chooseRowAction, getUrl, searchRows } from "#/tests/pages/helpers";

type Fixture = {
  email: string;
  hubId: string;
  implementerId: string;
  projectId: string;
  schoolId: string;
  visibleId: string;
};

async function pickHubSchool() {
  const {
    rows: [row],
  } = await db.execute<Fixture>(sql`
    select u.email, h.id as "hubId", h.implementer_id as "implementerId",
      h.project_id as "projectId", s.id as "schoolId", s.visible_id as "visibleId"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id
    join hubs h on h.id = hc.assigned_hub_id
    join schools s on s.hub_id = h.id and s.archived_at is null
      and coalesce(s.dropped_out, false) = false
    where ${signableMember()}
    order by u.email desc, s.visible_id desc
    limit 1`);
  return row;
}

/**
 * A new active fellow leading an archived group, with one tab ready to unarchive the group and
 * another ready to drop the fellow out: both dialogs are open, waiting for their last click.
 */
async function prepareUnarchiveAndDropout(page: Page, context: BrowserContext, undo: Undo) {
  const fixture = await pickHubSchool();
  required(fixture, "a hub coordinator with a school");
  const fellowId = objectId("fellow");
  const fellowName = `E2E race fellow ${Date.now()}`;
  await db.insert(fellow).values({
    id: fellowId,
    fellowName,
    hubId: fixture.hubId,
    implementerId: fixture.implementerId,
    droppedOut: false,
  });
  undo(() => db.delete(fellow).where(eq(fellow.id, fellowId)));
  const groupId = objectId("group");
  const groupName = `E2E race group ${Date.now()}`;
  await db.insert(interventionGroup).values({
    id: groupId,
    groupName,
    schoolId: fixture.schoolId,
    leaderId: fellowId,
    projectId: fixture.projectId,
    archivedAt: new Date(),
  });
  undo(() => db.delete(interventionGroup).where(eq(interventionGroup.id, groupId)));
  await signInWithEmail(context, fixture.email);

  await page.goto(getUrl(`/hc/schools/${fixture.visibleId}/groups`));
  await chooseRowAction(page, await searchRows(page, groupName), "Unarchive group");
  const unarchive = page
    .getByRole("dialog", { name: "Confirm group unarchive" })
    .getByRole("button", { name: "Unarchive" });

  const dropoutTab = await context.newPage();
  await dropoutTab.goto(getUrl("/hc/fellows"));
  await chooseRowAction(dropoutTab, await searchRows(dropoutTab, fellowName), "Drop-out fellow");
  const dropout = dropoutTab.getByRole("dialog").filter({ hasText: "Drop out fellow" });
  await dropout.getByRole("combobox", { name: /^Select reason/ }).click();
  await dropoutTab.getByRole("option").first().click();
  await dropout.getByRole("button", { name: "Submit" }).click();
  const confirmDropout = dropoutTab
    .getByRole("dialog")
    .filter({ hasText: "Confirm drop out" })
    .getByRole("button", { name: "Confirm" });

  return { fellowId, fellowName, groupId, groupName, unarchive, dropoutTab, confirmDropout };
}

test("a group unarchived while its leader drops out stays archived", async ({
  page,
  context,
  undo,
}) => {
  test.slow();
  const race = await prepareUnarchiveAndDropout(page, context, undo);

  // The unarchive waits on the group row while the fellow drops out.
  await raceOnRow("intervention_groups", race.groupId, async (waitForWaiting) => {
    await race.unarchive.click();
    await waitForWaiting(1);
    await race.confirmDropout.click();
    await expect(race.dropoutTab.getByText("successfully dropped out").first()).toBeVisible();
  });

  await expect(page.getByText("has dropped out").first()).toBeVisible();
  await page.reload();
  const groupRow = await searchRows(page, race.groupName);
  await expect(await cellUnder(page, groupRow, "Active Status")).toHaveText("Inactive");
});

test("a fellow dropped out while their group is unarchived keeps leading it", async ({
  page,
  context,
  undo,
}) => {
  test.slow();
  const race = await prepareUnarchiveAndDropout(page, context, undo);

  // The unarchive has written the group and waits to check its leader when the dropout lands, so
  // the dropout has to wait for the unarchive and count the group it reactivated.
  await raceOnRow("fellows", race.fellowId, async (waitForWaiting) => {
    await race.unarchive.click();
    await waitForWaiting(1);
    await race.confirmDropout.click();
    await waitForWaiting(2);
  });

  await expect(page.getByText("Successfully unarchived group").first()).toBeVisible();
  await expect(race.dropoutTab.getByText(/still assigned to 1 active group/).first()).toBeVisible();
  await race.dropoutTab.reload();
  const fellowRow = await searchRows(race.dropoutTab, race.fellowName);
  await expect(await cellUnder(race.dropoutTab, fellowRow, "Status")).toHaveText("Active");
});
