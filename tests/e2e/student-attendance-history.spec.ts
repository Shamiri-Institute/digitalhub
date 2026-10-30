import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { student, studentAttendance } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { sessionDisplayName } from "#/lib/utils";
import { expect, test } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { chooseRowAction, getUrl, rowWithCell } from "#/tests/pages/helpers";

test("marking a session twice from an open attendance history starts from the saved value", async ({
  page,
  context,
  undo,
}) => {
  // The last school by visible id: specs that count or edit a school's students take the first.
  const {
    rows: [fixture],
  } = await db.execute<{
    email: string;
    schoolId: string;
    visibleId: string;
    groupId: string;
    leaderId: string;
    sessionId: string;
    sessionName: string;
  }>(sql`
    select u.email, s.id as "schoolId", s.visible_id as "visibleId", g.id as "groupId",
      g.leader_id as "leaderId", i.id as "sessionId", n.session_name as "sessionName"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id
    join schools s on s.hub_id = hc.assigned_hub_id and s.archived_at is null
      and coalesce(s.dropped_out, false) = false
    join intervention_groups g on g.school_id = s.id and g.archived_at is null
    join intervention_sessions i on i.school_id = s.id and i.occurred
      and coalesce(i.status::text, '') <> 'Cancelled'
    join session_names n on n.id = i.session_id
    where ${signableMember()}
    order by s.visible_id desc, u.email, g.id, i.session_date desc
    limit 1`);
  required(fixture, "no coordinator's school with a group and an occurred session");
  const sessionLabel = sessionDisplayName(fixture.sessionName) ?? fixture.sessionName;

  // The history lists a student's attendance rows, so the spec's own student starts with one that
  // is not marked yet.
  const label = `e2e-history-${Date.now()}`;
  const studentId = objectId("stu");
  const studentName = `${label} student`;
  undo(async () => {
    await db.delete(studentAttendance).where(eq(studentAttendance.studentId, studentId));
    await db.delete(student).where(eq(student.id, studentId));
  });
  await db.insert(student).values({
    id: studentId,
    visibleId: label,
    studentName,
    schoolId: fixture.schoolId,
    assignedGroupId: fixture.groupId,
    admissionNumber: "9201",
    gender: "Female",
    form: 2,
    stream: "B",
  });
  await db.insert(studentAttendance).values({
    studentId,
    sessionId: fixture.sessionId,
    groupId: fixture.groupId,
    fellowId: fixture.leaderId,
    attended: null,
  });

  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl(`/hc/schools/${fixture.visibleId}/students`));
  const main = page.getByRole("main");
  const history = page.getByRole("dialog", { name: "Student session attendance history" });
  const sessionRow = history
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: sessionLabel, exact: true }) });
  const mark = page.getByRole("dialog", { name: "Mark student attendance" });
  const attended = mark.getByRole("radio", { name: "Attended" });
  async function openHistory() {
    await chooseRowAction(
      page,
      await rowWithCell(page, main, studentName),
      "View attendance history",
    );
    await expect(history).toBeVisible();
  }

  await openHistory();
  await expect(sessionRow).toContainText("Not marked");
  await chooseRowAction(page, sessionRow, "Mark student attendance");
  await expect(mark.getByRole("radio", { name: "Unmarked" })).toBeChecked();
  await attended.click();
  await mark.getByRole("button", { name: "Submit" }).click();
  await expect(mark).toBeHidden();
  await expect(sessionRow).toContainText("Attended");

  await chooseRowAction(page, sessionRow, "Mark student attendance");
  await expect(attended).toBeChecked();
  // Saving unchanged keeps the attendance the first save recorded.
  await mark.getByRole("button", { name: "Submit" }).click();
  await expect(mark).toBeHidden();

  await page.reload();
  await openHistory();
  await expect(sessionRow).toContainText("Attended");
});
