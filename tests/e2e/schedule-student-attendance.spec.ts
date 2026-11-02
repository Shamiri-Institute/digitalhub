import { expect, test } from "@playwright/test";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { sessionDisplayName } from "#/lib/utils";
import {
  onlySessionAtSchoolThatWeek,
  required,
  signableMember,
  signInAs,
  signInWithEmail,
  uniqueFellowName,
} from "#/tests/helpers";
import { chooseRowAction, getUrl, rowWithCell, scheduleUrl } from "#/tests/pages/helpers";

// Two occurred sessions in one list week at different schools. At each, a fellow of the session's
// hub leads exactly one group there, since the dialog offers each leader with the first group it
// finds, and the student is the group's first, so the table shows it on its first page. One row per
// session keeps the pairing below small; pairing every group of every session took over a minute.
async function pickSessionsWithStudentsInOneWeek(adminUserId: string, timeZone: string) {
  const {
    rows: [fixture],
  } = await db.execute<{
    sessionDate: string;
    schoolName: string;
    leaderOption: string;
    studentName: string;
    otherSchoolName: string;
    otherLeaderOption: string;
    otherStudentName: string;
  }>(sql`
    with visible as (
      select distinct on (i.id) i.id, i.session_date, s.id as school_id, s.school_name,
        f.fellow_name || ' (' || g.group_name || ')' as leader_option, st.student_name
      from implementer_members m
      join hubs h on h.implementer_id = m.implementer_id
      join projects p on p.id = h.project_id and p.is_default
      join schools s on s.hub_id = h.id and s.archived_at is null
        and (select count(*) from schools o where o.school_name = s.school_name) = 1
      join intervention_sessions i on i.school_id = s.id and i.occurred
        and coalesce(i.status::text, '') <> 'Cancelled'
      join intervention_groups g on g.school_id = s.id
      join fellows f on f.id = g.leader_id and f.fellow_name is not null and ${uniqueFellowName()}
        and (select count(*) from intervention_groups o
          where o.school_id = s.id and o.leader_id = f.id) = 1
      join supervisors sv on sv.id = f.supervisor_id and sv.hub_id = i.hub_id
      join lateral (
        select o.student_name from students o
        where o.assigned_group_id = g.id
        order by o.id
        limit 1
      ) st on st.student_name is not null
      where m.user_id = ${adminUserId} and m.role = 'ADMIN'
        and ${onlySessionAtSchoolThatWeek()}
      order by i.id, g.id
    )
    select a.session_date as "sessionDate", a.school_name as "schoolName",
      a.leader_option as "leaderOption", a.student_name as "studentName",
      b.school_name as "otherSchoolName", b.leader_option as "otherLeaderOption",
      b.student_name as "otherStudentName"
    from visible a
    join visible b on b.school_id <> a.school_id
      -- The list view's week runs Sunday to Saturday in the viewer's time zone.
      and date_trunc('week', (b.session_date at time zone ${timeZone}) + interval '1 day')
        = date_trunc('week', (a.session_date at time zone ${timeZone}) + interval '1 day')
      and not exists (select 1 from students o
        where o.school_id = b.school_id
          and strpos(lower(o.student_name), lower(a.student_name)) > 0)
    order by a.session_date desc, a.id, b.id
    limit 1`);
  required(fixture, "no two occurred sessions in one week at schools with a led group's students");
  return fixture;
}

test("student attendance opened from the schedule loads the students of each session", async ({
  page,
  context,
}) => {
  const admin = await signInAs(context, "ADMIN");
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fixture = await pickSessionsWithStudentsInOneWeek(admin.id, timeZone);

  await page.goto(
    await scheduleUrl(context, "/admin/schedule?mode=list", new Date(fixture.sessionDate)),
  );
  const dialog = page.getByRole("dialog", { name: "View student attendance" });
  const leaderSelect = dialog.getByRole("combobox").filter({ hasText: "Select a fellow" });

  const sessionRow = page.getByRole("row").filter({ hasText: fixture.schoolName }).first();
  await chooseRowAction(page, sessionRow, "View student attendance");
  await expect(dialog).toContainText(fixture.schoolName);
  await leaderSelect.click();
  await page.getByRole("option", { name: fixture.leaderOption, exact: true }).click();
  await expect(dialog.getByRole("row").filter({ hasText: fixture.studentName })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  const otherSessionRow = page
    .getByRole("row")
    .filter({ hasText: fixture.otherSchoolName })
    .first();
  await chooseRowAction(page, otherSessionRow, "View student attendance");
  await expect(dialog).toContainText(fixture.otherSchoolName);
  await leaderSelect.click();
  await page.getByRole("option", { name: fixture.otherLeaderOption, exact: true }).click();
  await expect(dialog.getByRole("row").filter({ hasText: fixture.otherStudentName })).toBeVisible();
  await expect(dialog.getByRole("row").filter({ hasText: fixture.studentName })).toHaveCount(0);
});

test("a supervisor's student attendance loads the students of their fellows' groups", async ({
  page,
  context,
}) => {
  const {
    rows: [fixture],
  } = await db.execute<{
    email: string;
    visibleId: string;
    sessionName: string;
    leaderOption: string;
    studentName: string;
  }>(sql`
    select u.email, s.visible_id as "visibleId", sn.session_name as "sessionName",
      f.fellow_name || ' (' || g.group_name || ')' as "leaderOption", st.student_name as "studentName"
    from supervisors sv
    join implementer_members m on m.identifier = sv.id and m.role = 'SUPERVISOR'
    join users u on u.id = m.user_id
    join fellows f on f.supervisor_id = sv.id and f.fellow_name is not null and ${uniqueFellowName()}
    join intervention_groups g on g.leader_id = f.id
      and (select count(*) from intervention_groups o
        where o.school_id = g.school_id and o.leader_id = f.id) = 1
    join schools s on s.id = g.school_id and s.hub_id = sv.hub_id and s.archived_at is null
    join intervention_sessions i on i.school_id = s.id and i.occurred
      and coalesce(i.status::text, '') <> 'Cancelled'
    join session_names sn on sn.id = i.session_id
    join lateral (
      select o.student_name from students o
      where o.assigned_group_id = g.id
      order by o.id
      limit 1
    ) st on st.student_name is not null
    where ${signableMember()}
    order by u.email, s.visible_id, i.id
    limit 1`);
  required(
    fixture,
    "no supervisor whose fellow leads a group with students at an occurred session",
  );
  await signInWithEmail(context, fixture.email);

  await page.goto(getUrl(`/sc/schools/${fixture.visibleId}/sessions`));
  const sessionName = sessionDisplayName(fixture.sessionName) ?? fixture.sessionName;
  const sessionRow = await rowWithCell(page, page.getByRole("main"), sessionName);
  await chooseRowAction(page, sessionRow.first(), "View student attendance");
  const dialog = page.getByRole("dialog", { name: "Mark student attendance" });
  await dialog.getByRole("combobox").filter({ hasText: "Select a fellow" }).click();
  await page.getByRole("option", { name: fixture.leaderOption, exact: true }).click();
  await expect(dialog.getByRole("row").filter({ hasText: fixture.studentName })).toBeVisible();
});
