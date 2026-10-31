import { format } from "date-fns";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { student, studentAttendance } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { chooseRowAction, getUrl, rowWithCell } from "#/tests/pages/helpers";

async function sessionDateLabel(sessionId: string) {
  const session = await db.query.interventionSession.findFirst({
    where: (s, { eq }) => eq(s.id, sessionId),
    columns: { sessionDate: true },
  });
  required(session, `session ${sessionId}`);
  return format(session.sessionDate, "dd MMM yyyy");
}

test("a session picked in the attendance history is not preselected once the history closes", async ({
  page,
  context,
  undo,
}) => {
  // Mark attendance opens on the school's latest occurred session unless a session was picked,
  // so the student attends an older one to pick from the history.
  const {
    rows: [fixture],
  } = await db.execute<{
    email: string;
    schoolId: string;
    visibleId: string;
    groupId: string;
    olderSessionId: string;
    latestSessionId: string;
  }>(sql`
    select u.email, s.id as "schoolId", s.visible_id as "visibleId", g.id as "groupId",
      oldest.id as "olderSessionId", latest.id as "latestSessionId"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id
    join schools s on s.hub_id = hc.assigned_hub_id and s.archived_at is null
      and coalesce(s.dropped_out, false) = false
    join lateral (select g.id from intervention_groups g
      where g.school_id = s.id and g.archived_at is null order by g.id limit 1) g on true
    join lateral (select i.id, i.session_date from intervention_sessions i
      where i.school_id = s.id and i.occurred order by i.session_date limit 1) oldest on true
    join lateral (select i.id, i.session_date from intervention_sessions i
      where i.school_id = s.id and i.occurred order by i.session_date desc limit 1) latest on true
    where ${signableMember()} and latest.session_date - oldest.session_date > interval '1 day'
    -- The last school: specs that count or edit a school's students take the first.
    order by u.email, s.visible_id desc
    limit 1`);
  required(fixture, "no hub coordinator's school with a group and occurred sessions on two days");
  const olderDate = await sessionDateLabel(fixture.olderSessionId);
  const latestDate = await sessionDateLabel(fixture.latestSessionId);

  const studentId = objectId("stu");
  const studentName = `e2e-history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(student).values({
    id: studentId,
    visibleId: studentName,
    studentName,
    schoolId: fixture.schoolId,
    assignedGroupId: fixture.groupId,
    admissionNumber: "9002",
    gender: "Female",
    form: 2,
    stream: "B",
  });
  undo(() => db.delete(student).where(eq(student.id, studentId)));
  await db.insert(studentAttendance).values({
    studentId,
    sessionId: fixture.olderSessionId,
    groupId: fixture.groupId,
    attended: true,
  });
  undo(() => db.delete(studentAttendance).where(eq(studentAttendance.studentId, studentId)));

  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl(`/hc/schools/${fixture.visibleId}/students`));
  const main = page.getByRole("main");
  const history = page.getByRole("dialog", { name: "Student session attendance history" });
  const mark = page.getByRole("dialog").filter({ hasText: "Select attendance" });
  const markSession = mark.getByRole("combobox", { name: "Select session" });

  const closeHistoryWays = {
    Done: () => history.getByRole("button", { name: "Done" }).click(),
    Escape: () => page.keyboard.press("Escape"),
  };
  for (const [way, closeHistory] of Object.entries(closeHistoryWays)) {
    await test.step(`closed with ${way}`, async () => {
      await chooseRowAction(
        page,
        await rowWithCell(page, main, studentName),
        "View attendance history",
      );
      await chooseRowAction(
        page,
        history.getByRole("row").filter({ hasText: olderDate }),
        "Mark student attendance",
      );
      await expect(markSession).toContainText(olderDate);
      await page.keyboard.press("Escape");
      await expect(mark).toBeHidden();
      await closeHistory();
      await expect(history).toBeHidden();

      await chooseRowAction(
        page,
        await rowWithCell(page, main, studentName),
        "Mark student attendance",
      );
      await expect(markSession).toContainText(latestDate);
      await page.keyboard.press("Escape");
      await expect(mark).toBeHidden();
    });
  }
});
