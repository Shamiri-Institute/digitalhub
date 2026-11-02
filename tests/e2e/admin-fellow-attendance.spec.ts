import { expect, test } from "@playwright/test";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { onlySessionAtSchoolThatWeek, required, signInAs } from "#/tests/helpers";
import { chooseRowAction, scheduleUrl, searchRows } from "#/tests/pages/helpers";

// Two sessions in one list week at schools of different hubs. The first hub has a supervisor with
// a named fellow, so choosing that supervisor fills the table.
async function pickSessionsOfTwoHubsInOneWeek(adminUserId: string, timeZone: string) {
  const {
    rows: [fixture],
  } = await db.execute<{
    sessionDate: string;
    schoolName: string;
    otherHubSchoolName: string;
    supervisorName: string;
    fellowName: string;
  }>(sql`
    with visible as (
      select i.id, i.session_date, i.hub_id, s.school_name
      from implementer_members m
      join hubs h on h.implementer_id = m.implementer_id
      join projects p on p.id = h.project_id and p.is_default
      join schools s on s.hub_id = h.id and s.archived_at is null
        and (select count(*) from schools o where o.school_name = s.school_name) = 1
      join intervention_sessions i on i.school_id = s.id and i.occurred
        and coalesce(i.status::text, '') <> 'Cancelled'
      where m.user_id = ${adminUserId} and m.role = 'ADMIN'
        and ${onlySessionAtSchoolThatWeek()}
    )
    select a.session_date as "sessionDate", a.school_name as "schoolName",
      b.school_name as "otherHubSchoolName", sv.supervisor_name as "supervisorName",
      f.fellow_name as "fellowName"
    from visible a
    join visible b on b.hub_id <> a.hub_id
      -- The list view's week runs Sunday to Saturday in the viewer's time zone.
      and date_trunc('week', (b.session_date at time zone ${timeZone}) + interval '1 day')
        = date_trunc('week', (a.session_date at time zone ${timeZone}) + interval '1 day')
    join supervisors sv on sv.hub_id = a.hub_id and sv.supervisor_name is not null
      and (select count(*) from supervisors o
        where o.hub_id = sv.hub_id and o.supervisor_name = sv.supervisor_name) = 1
    join fellows f on f.supervisor_id = sv.id and f.fellow_name is not null
    order by a.session_date desc, a.id, b.id, sv.id, f.id
    limit 1`);
  required(fixture, "no two occurred sessions of different hubs in one week for the admin");
  return fixture;
}

test("an admin's fellow attendance for another hub's session shows none of the last one's fellows", async ({
  page,
  context,
}) => {
  const admin = await signInAs(context, "ADMIN");
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fixture = await pickSessionsOfTwoHubsInOneWeek(admin.id, timeZone);

  await page.goto(
    await scheduleUrl(context, "/admin/schedule?mode=list", new Date(fixture.sessionDate)),
  );
  const dialog = page.getByRole("dialog", { name: "View fellow attendance" });
  const supervisorSelect = dialog.getByRole("combobox", { name: "Select a supervisor" });

  const firstHubRow = page.getByRole("row").filter({ hasText: fixture.schoolName }).first();
  await chooseRowAction(page, firstHubRow, "View fellow attendance");
  await supervisorSelect.click();
  await page.getByRole("option", { name: fixture.supervisorName, exact: true }).click();
  await expect((await searchRows(page, fixture.fellowName, dialog)).first()).toBeVisible();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();

  const otherHubRow = page.getByRole("row").filter({ hasText: fixture.otherHubSchoolName }).first();
  await chooseRowAction(page, otherHubRow, "View fellow attendance");
  await expect(dialog).toContainText(fixture.otherHubSchoolName);
  await expect(supervisorSelect).toHaveText("Select a supervisor");
  await expect(dialog).toContainText("Please select a supervisor");
  await expect(dialog.getByRole("row").filter({ hasText: fixture.fellowName })).toHaveCount(0);
});
