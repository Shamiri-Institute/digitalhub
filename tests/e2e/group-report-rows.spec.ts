import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { fellow, interventionGroup } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";

test("a group with no report shows one Not yet submitted row under its current leader", async ({
  page,
  context,
  undo,
}) => {
  const {
    rows: [coordinator],
  } = await db.execute<{
    email: string;
    hubId: string;
    implementerId: string;
    projectId: string;
    schoolId: string;
  }>(sql`
    select u.email, h.id as "hubId", h.implementer_id as "implementerId",
      h.project_id as "projectId", s.id as "schoolId"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id
    join hubs h on h.id = hc.assigned_hub_id and h.project_id is not null
    join schools s on s.hub_id = h.id
    where ${signableMember()}
    order by u.email, s.id
    limit 1`);
  required(coordinator, "a hub coordinator with a school");
  const leaderId = objectId("fellow");
  const leaderName = `E2E report leader ${Date.now()}`;
  const groupId = objectId("group");
  const groupName = `E2E unreported ${Date.now()}`;
  await db.insert(fellow).values({
    id: leaderId,
    fellowName: leaderName,
    hubId: coordinator.hubId,
    implementerId: coordinator.implementerId,
  });
  await db.insert(interventionGroup).values({
    id: groupId,
    groupName,
    schoolId: coordinator.schoolId,
    leaderId,
    projectId: coordinator.projectId,
  });
  undo(async () => {
    await db.delete(interventionGroup).where(eq(interventionGroup.id, groupId));
    await db.delete(fellow).where(eq(fellow.id, leaderId));
  });
  await signInWithEmail(context, coordinator.email);

  await page.goto(getUrl("/hc/reporting/fellow-reports/group-report"));
  await searchRows(page, groupName);
  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText(leaderName);
  await expect(rows.first()).toContainText("Not yet submitted");
});
