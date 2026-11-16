import type { Page } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { fellow, interventionGroup, school } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test, type Undo } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { cellUnder, chooseRowAction, getUrl, searchRows } from "#/tests/pages/helpers";

/** A new school of the coordinator's hub with one active group, led by a new fellow. */
async function createHubGroup(undo: Undo) {
  const {
    rows: [coordinator],
  } = await db.execute<{
    email: string;
    hubId: string;
    implementerId: string;
    projectId: string;
    otherHubId: string;
  }>(sql`
    select u.email, h.id as "hubId", h.implementer_id as "implementerId",
      h.project_id as "projectId",
      (select o.id from hubs o where o.id <> h.id order by o.id limit 1) as "otherHubId"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id
    join hubs h on h.id = hc.assigned_hub_id and h.project_id is not null
    where ${signableMember()}
    order by u.email desc
    limit 1`);
  required(coordinator, "a hub coordinator with a hub");
  required(coordinator.otherHubId, "a second hub");
  const schoolId = objectId("sch");
  const visibleId = objectId("sch");
  const fellowId = objectId("fellow");
  const groupId = objectId("group");
  const groupName = `E2E archive scope ${Date.now()}`;
  await db.insert(school).values({
    id: schoolId,
    visibleId,
    schoolName: `E2E archive scope school ${schoolId}`,
    hubId: coordinator.hubId,
  });
  await db.insert(fellow).values({
    id: fellowId,
    fellowName: `E2E archive scope fellow ${Date.now()}`,
    hubId: coordinator.hubId,
    implementerId: coordinator.implementerId,
  });
  await db.insert(interventionGroup).values({
    id: groupId,
    groupName,
    schoolId,
    leaderId: fellowId,
    projectId: coordinator.projectId,
  });
  undo(async () => {
    await db.delete(interventionGroup).where(eq(interventionGroup.id, groupId));
    await db.delete(fellow).where(eq(fellow.id, fellowId));
    await db.delete(school).where(eq(school.id, schoolId));
  });
  return { ...coordinator, schoolId, visibleId, groupId, groupName };
}

async function openArchive(page: Page, visibleId: string, groupName: string) {
  await page.goto(getUrl(`/hc/schools/${visibleId}/groups`));
  await chooseRowAction(page, await searchRows(page, groupName), "Archive group");
  return page.getByRole("dialog", { name: "Confirm group archive" });
}

test("a hub coordinator archives a group of their hub", async ({ page, context, undo }) => {
  const hubGroup = await createHubGroup(undo);
  await signInWithEmail(context, hubGroup.email);

  const confirm = await openArchive(page, hubGroup.visibleId, hubGroup.groupName);
  await confirm.getByRole("button", { name: "Confirm" }).click();
  await expect(confirm).toBeHidden();

  await page.reload();
  const groupRow = await searchRows(page, hubGroup.groupName);
  await expect(await cellUnder(page, groupRow, "Active Status")).toHaveText("Inactive");
});

test("archiving a group whose school moved to another hub is refused", async ({
  page,
  context,
  undo,
}) => {
  const hubGroup = await createHubGroup(undo);
  await signInWithEmail(context, hubGroup.email);

  const confirm = await openArchive(page, hubGroup.visibleId, hubGroup.groupName);
  // The school leaves the coordinator's hub behind the open dialog.
  await db
    .update(school)
    .set({ hubId: hubGroup.otherHubId })
    .where(eq(school.id, hubGroup.schoolId));
  await confirm.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText(/School not found/).first()).toBeVisible();

  // The coordinator can no longer open the school, so only the database shows the group is active.
  const storedGroup = await db.query.interventionGroup.findFirst({
    where: (g, { eq }) => eq(g.id, hubGroup.groupId),
    columns: { archivedAt: true },
  });
  expect(storedGroup?.archivedAt).toBeNull();
});
