import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { fellow, interventionGroup } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test } from "#/tests/fixtures";
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

test("a fellow dropped out while their group is unarchived is refused, not left leading it", async ({
  page,
  context,
  undo,
}) => {
  test.slow();
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

  const otherTab = await context.newPage();
  await otherTab.goto(getUrl("/hc/fellows"));
  await chooseRowAction(otherTab, await searchRows(otherTab, fellowName), "Drop-out fellow");
  const dropout = otherTab.getByRole("dialog").filter({ hasText: "Drop out fellow" });
  await dropout.getByRole("combobox", { name: /^Select reason/ }).click();
  await otherTab.getByRole("option").first().click();
  await dropout.getByRole("button", { name: "Submit" }).click();
  const confirmDropout = otherTab
    .getByRole("dialog")
    .filter({ hasText: "Confirm drop out" })
    .getByRole("button", { name: "Confirm" });
  const dropoutAnswer = otherTab.getByText(/successfully dropped out|still assigned/).first();

  await raceOnRow("intervention_groups", groupId, async (waitForWaiting, countWaiting) => {
    await unarchive.click();
    await waitForWaiting(1);
    await confirmDropout.click();
    // The dropout either waits for the unarchive to finish with the fellow, or, when nothing makes
    // it wait, finishes first. Release the unarchive once it has done one or the other.
    await expect
      .poll(async () => (await countWaiting()) === 2 || (await dropoutAnswer.isVisible()))
      .toBe(true);
  });

  await expect(page.getByText("Successfully unarchived group").first()).toBeVisible();
  await expect(dropoutAnswer).toHaveText(/still assigned to 1 active group/);
  await otherTab.reload();
  const fellowRow = await searchRows(otherTab, fellowName);
  await expect(await cellUnder(otherTab, fellowRow, "Status")).toHaveText("Active");
});
