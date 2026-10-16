import { expect, test } from "@playwright/test";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { onlySessionAtSchoolThatWeek, signInAs, required } from "#/tests/helpers";
import { chooseRowAction, scheduleUrl, searchRows } from "#/tests/pages/helpers";

// The school's supervisor must have fellows who lead a named group there.
async function pickLoneOccurredSessionInAdminOrg(adminUserId: string) {
  const {
    rows: [session],
  } = await db.execute<{
    sessionDate: string;
    schoolName: string;
    supervisorName: string;
    supervisorId: string;
    schoolId: string;
  }>(sql`
    select i.session_date as "sessionDate", s.school_name as "schoolName", s.id as "schoolId",
      sv.supervisor_name as "supervisorName", sv.id as "supervisorId"
    from implementer_members m
    join hubs h on h.implementer_id = m.implementer_id
    join projects p on p.id = h.project_id and p.is_default
    join schools s on s.hub_id = h.id and s.archived_at is null
    join supervisors sv on sv.id = s.assigned_supervisor_id and sv.supervisor_name is not null
    join intervention_sessions i on i.school_id = s.id and i.occurred
      and coalesce(i.status::text, '') <> 'Cancelled'
    where m.user_id = ${adminUserId} and m.role = 'ADMIN'
      and exists (
        select 1 from intervention_groups g join fellows f on f.id = g.leader_id
        where g.school_id = s.id and f.supervisor_id = sv.id and g.group_name is not null)
      and ${onlySessionAtSchoolThatWeek()}
    order by i.session_date desc, i.id
    limit 1`);
  required(session, "no occurred session for the admin");
  return session;
}

test("an admin sees each fellow's group in the fellow attendance dialog", async ({
  page,
  context,
}) => {
  const admin = await signInAs(context, "ADMIN");
  const session = await pickLoneOccurredSessionInAdminOrg(admin.id);
  const { rows: expectedFellowGroups } = await db.execute<{
    fellowName: string;
    groupName: string;
  }>(sql`
    select f.fellow_name as "fellowName", min(g.group_name) as "groupName"
    from fellows f
    join intervention_groups g on g.leader_id = f.id and g.school_id = ${session.schoolId}
    where f.supervisor_id = ${session.supervisorId} and f.fellow_name is not null
      and g.group_name is not null
    group by f.id, f.fellow_name
    having count(*) = 1
      and (select count(*) from fellows o
        where o.supervisor_id = f.supervisor_id and o.fellow_name = f.fellow_name) = 1
    order by f.id
    limit 3`);
  if (expectedFellowGroups.length === 0) {
    throw new Error("seed the database first: no fellow with one named group at the school");
  }

  await page.goto(
    await scheduleUrl(context, "/admin/schedule?mode=list", new Date(session.sessionDate)),
  );
  const sessionRow = page.getByRole("row").filter({ hasText: session.schoolName }).first();
  const dialog = page.getByRole("dialog", { name: "View fellow attendance" });
  await chooseRowAction(page, sessionRow, "View fellow attendance");
  await dialog.getByRole("combobox").filter({ hasText: "Select a supervisor" }).click();
  await page.getByRole("option", { name: session.supervisorName, exact: true }).click();

  for (const { fellowName, groupName } of expectedFellowGroups) {
    await expect(await searchRows(page, fellowName)).toContainText(groupName);
  }
});
