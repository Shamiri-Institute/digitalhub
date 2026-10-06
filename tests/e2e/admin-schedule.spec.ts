import { expect, test } from "@playwright/test";
import { differenceInCalendarWeeks } from "date-fns";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { signInAs } from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";

/**
 * An admin opens "View fellow attendance" from the schedule. The dialog fills its fellow rows,
 * with each fellow's group at the session's school, from a request made after the page renders,
 * so a page render check does not see them. Those groups were once lost (#849). The test compares
 * the rows with a live query. The database is read only.
 */

// The dev server compiles each page on first use, which can take longer than the default.
test.describe.configure({ timeout: 3 * 60 * 1000 });

test("an admin sees each fellow's group in the fellow attendance dialog", async ({
  page,
  context,
}) => {
  const admin = await signInAs(context, "ADMIN");
  // An occurred session in the admin's organisation, the only one at its school that week, and
  // the school's supervisor with the fellows who lead a named group there.
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
    where m.user_id = ${admin.id} and m.role = 'ADMIN'
      and exists (
        select 1 from intervention_groups g join fellows f on f.id = g.leader_id
        where g.school_id = s.id and f.supervisor_id = sv.id and g.group_name is not null)
      and not exists (
        select 1 from intervention_sessions o where o.school_id = i.school_id and o.id <> i.id
          and abs(extract(epoch from o.session_date - i.session_date)) < 7 * 24 * 3600)
    order by i.session_date desc, i.id
    limit 1`);
  if (!session) throw new Error("seed the database first: no occurred session for the admin");
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

  await page.goto(getUrl("/admin/schedule?mode=list"), { waitUntil: "networkidle" });
  const weeksBack = differenceInCalendarWeeks(new Date(), new Date(session.sessionDate));
  for (let i = 0; i < weeksBack; i++) {
    await page.getByRole("button", { name: "Previous" }).click();
    await page.waitForLoadState("networkidle");
  }
  const sessionRow = page.getByRole("row").filter({ hasText: session.schoolName }).first();
  // The menu can close while the calendar re-renders with data that loads after the page.
  const dialog = page.getByRole("dialog", { name: "View fellow attendance" });
  await expect(async () => {
    await sessionRow.getByRole("cell").last().click();
    await page.getByRole("menuitem", { name: "View fellow attendance" }).click({ timeout: 2000 });
    await expect(dialog).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30_000 });
  await dialog.getByRole("combobox").filter({ hasText: "Select a supervisor" }).click();
  await page.getByRole("option", { name: session.supervisorName, exact: true }).click();

  for (const { fellowName, groupName } of expectedFellowGroups) {
    await expect(await searchRows(page, fellowName)).toContainText(groupName);
  }
});
