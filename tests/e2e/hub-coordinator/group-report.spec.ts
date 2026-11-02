import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { SupportType } from "#/db/enums";
import { fellowGroupReport, interventionGroup } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail, uniqueFellowName } from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";

test("a group whose leader changed lists each leader's report under its author", async ({
  context,
  page,
  undo,
}) => {
  const {
    rows: [fixture],
  } = await db.execute<{
    email: string;
    schoolId: string;
    projectId: string;
    oldLeaderId: string;
    oldLeaderName: string;
    newLeaderId: string;
    newLeaderName: string;
  }>(sql`
    select u.email, s.id as "schoolId", h.project_id as "projectId",
      f.id as "oldLeaderId", f.fellow_name as "oldLeaderName",
      g.id as "newLeaderId", g.fellow_name as "newLeaderName"
    from users u
    join implementer_members m on m.user_id = u.id and m.role = 'HUB_COORDINATOR'
    join hub_coordinators hc on hc.id = m.identifier
    join hubs h on h.id = hc.assigned_hub_id
    join schools s on s.hub_id = h.id
    join fellows f on f.hub_id = h.id and f.fellow_name is not null
    join fellows g on g.hub_id = h.id and g.fellow_name is not null and g.id <> f.id
    where ${signableMember()} and ${uniqueFellowName("f")} and ${uniqueFellowName("g")}
      and not exists (select 1 from intervention_groups x
        where x.school_id = s.id and x.leader_id = g.id)
    order by u.email, s.id, f.id, g.id
    limit 1`);
  required(fixture, "two fellows in a hub coordinator's hub");

  const groupId = objectId("group");
  const groupName = `E2E ${Date.now()}`;
  await db.insert(interventionGroup).values({
    id: groupId,
    groupName,
    leaderId: fixture.newLeaderId,
    schoolId: fixture.schoolId,
    projectId: fixture.projectId,
  });
  undo(() => db.delete(interventionGroup).where(eq(interventionGroup.id, groupId)));

  const reportBy = (fellowId: string, whatWentWell: string, createdAt: Date) => ({
    id: objectId("fgr"),
    createdAt,
    submittedAt: createdAt,
    fellowId,
    groupId,
    structuralFidelity: 3,
    processFidelity: 3,
    adaptationsMade: false,
    behavioralEngagement: 3,
    reflectiveEngagement: 3,
    psychologicalSafety: 3,
    groupCohesion: 3,
    climateConcerns: false,
    skillComprehension: 3,
    inSessionTransfer: 3,
    homePracticeApplicable: false,
    fellowGroupRelationship: 3,
    externalDisruptions: false,
    facilitatorConfidence: 3,
    hardestAspect: "E2E",
    challengeImpact: 3,
    whatWentWell,
    supportType: SupportType.TRAINING,
  });
  await db
    .insert(fellowGroupReport)
    .values([
      reportBy(fixture.oldLeaderId, "Old leader's report", new Date("2026-01-10")),
      reportBy(fixture.newLeaderId, "New leader's report", new Date("2026-02-10")),
    ]);
  undo(() => db.delete(fellowGroupReport).where(eq(fellowGroupReport.groupId, groupId)));

  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl("/hc/reporting/fellow-reports/group-report"));
  await searchRows(page, groupName);

  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(2);
  for (const { author, whatWentWell } of [
    { author: fixture.oldLeaderName, whatWentWell: "Old leader's report" },
    { author: fixture.newLeaderName, whatWentWell: "New leader's report" },
  ]) {
    const row = rows.filter({ has: page.getByRole("cell", { name: author, exact: true }) });
    await expect(row).toContainText("Submitted");
    await row.getByRole("button", { name: "View report" }).click();
    const dialog = page.getByRole("dialog", { name: "Group Report" });
    await expect(dialog).toContainText(whatWentWell);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  }
});
