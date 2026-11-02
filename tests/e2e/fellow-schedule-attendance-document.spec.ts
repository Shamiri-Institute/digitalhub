import { expect, test } from "@playwright/test";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  onlySessionAtSchoolThatWeek,
  required,
  signableMember,
  signInWithEmail,
} from "#/tests/helpers";
import { chooseRowAction, scheduleUrl } from "#/tests/pages/helpers";

// "Upload attendance" opens only for an occurred session where the fellow leads a group and has
// marked at least 2 of its students. The school's name is unique and it has no other session that
// week, so its row in the list view is this session's.
async function pickFellowSessionWithTwoMarkedStudents() {
  const {
    rows: [fixture],
  } = await db.execute<{ email: string; schoolName: string; sessionDate: string }>(sql`
    select u.email, s.school_name as "schoolName", i.session_date as "sessionDate"
    from intervention_groups g
    join fellows f on f.id = g.leader_id
    join implementer_members m on m.identifier = g.leader_id and m.role = 'FELLOW'
    join users u on u.id = m.user_id
    join schools s on s.id = g.school_id and s.archived_at is null
      and (select count(*) from schools o where o.school_name = s.school_name) = 1
    join intervention_sessions i on i.school_id = s.id and i.hub_id = f.hub_id and i.occurred
      and i.status is not null and i.status <> 'Cancelled'
    where ${signableMember()}
      and (select count(*) from intervention_groups o
        where o.school_id = s.id and o.leader_id = f.id) = 1
      and (select count(*) from student_attendances a
        where a.session_id = i.id and a.fellow_id = g.leader_id) >= 2
      and ${onlySessionAtSchoolThatWeek()}
    order by u.email, i.session_date, g.id
    limit 1`);
  required(fixture, "no fellow with 2 students marked at an occurred session");
  return fixture;
}

test("a fellow opens a session's attendance document from the schedule", async ({
  page,
  context,
}) => {
  const fixture = await pickFellowSessionWithTwoMarkedStudents();
  await signInWithEmail(context, fixture.email);
  await page.goto(
    await scheduleUrl(context, "/fel/schedule?mode=list", new Date(fixture.sessionDate)),
  );

  const sessionRow = page.getByRole("row").filter({ hasText: fixture.schoolName }).first();
  await chooseRowAction(page, sessionRow, "Upload attendance");
  await expect(page.getByRole("dialog", { name: "Attendance Document" })).toContainText(
    fixture.schoolName,
  );
});
