import type { Page } from "@playwright/test";
import { format } from "date-fns";
import { and, eq } from "drizzle-orm";

import { db } from "#/db/client";
import { hubCoordinator, student, studentAttendance } from "#/db/schema";
import { createStudentSchool } from "#/tests/delivery-student-helpers";
import { expect, test } from "#/tests/fixtures";
import { signInWithEmail } from "#/tests/helpers";
import { chooseRowAction, getUrl, rowWithCell } from "#/tests/pages/helpers";

function storedAttendances(studentId: string, sessionId: string) {
  return db
    .select({ attended: studentAttendance.attended, markedBy: studentAttendance.markedBy })
    .from(studentAttendance)
    .where(
      and(eq(studentAttendance.studentId, studentId), eq(studentAttendance.sessionId, sessionId)),
    );
}

async function openStudentMark(page: Page, visibleId: string, studentName: string) {
  await page.goto(getUrl(`/hc/schools/${visibleId}/students`));
  await chooseRowAction(
    page,
    await rowWithCell(page, page.getByRole("main"), studentName),
    "Mark student attendance",
  );
  return page.getByRole("dialog", { name: "Mark student attendance" });
}

/** The fellow's attendance dialog for yesterday's S2 session, from the school's sessions page. */
async function openFellowSessionAttendance(page: Page, visibleId: string) {
  await page.goto(getUrl(`/fel/schools/${visibleId}/sessions`));
  await chooseRowAction(
    page,
    await rowWithCell(page, page.getByRole("main"), "S2"),
    "Mark student attendance",
  );
  return page.getByRole("dialog", { name: "Mark student attendance" }).first();
}

test("a coordinator marks a student once per session, the latest session first, a missed one with a reason", async ({
  page,
  context,
  undo,
}) => {
  const school = await createStudentSchool(undo);
  const { studentId, studentName } = await school.addStudent();
  await signInWithEmail(context, school.coordinatorEmail);

  const mark = await openStudentMark(page, school.visibleId, studentName);
  const sessionSelect = mark.getByRole("combobox", { name: "Select session" });
  await expect(sessionSelect).toContainText(
    new RegExp(`^S2.*${format(school.latestSessionDate, "dd MMM yyyy")}`),
  );
  await sessionSelect.click();
  await expect(page.getByRole("option")).toHaveText([/^S1/, /^S2/]);
  await page.keyboard.press("Escape");

  await mark.getByRole("radio", { name: "Missed" }).click();
  await mark.getByRole("button", { name: "Submit" }).click();
  await expect(mark.getByText("Please select reason for absence.")).toBeVisible();
  await mark.getByRole("combobox", { name: "Select reason for above" }).click();
  await page.getByRole("option", { name: "Sickness" }).click();
  await mark.getByRole("button", { name: "Submit" }).click();
  await expect(mark).toBeHidden();

  const remark = await openStudentMark(page, school.visibleId, studentName);
  await expect(remark.getByRole("radio", { name: "Missed" })).toBeChecked();
  await remark.getByRole("radio", { name: "Attended" }).click();
  await remark.getByRole("button", { name: "Submit" }).click();
  await expect(remark).toBeHidden();

  await page.reload();
  await chooseRowAction(
    page,
    await rowWithCell(page, page.getByRole("main"), studentName),
    "View attendance history",
  );
  const history = page.getByRole("dialog", { name: "Student session attendance history" });
  await expect(
    history.getByRole("row").filter({ has: page.getByRole("cell", { name: "S2", exact: true }) }),
  ).toContainText("Attended");
  // No page shows who marked an attendance.
  const coordinatorMember = await db.query.implementerMember.findFirst({
    where: (m, { eq }) => eq(m.identifier, school.coordinatorId),
    columns: { userId: true },
  });
  expect(await storedAttendances(studentId, school.latestSessionId)).toEqual([
    { attended: true, markedBy: coordinatorMember?.userId },
  ]);
});

test("a coordinator moved to another hub cannot mark their old hub's student", async ({
  page,
  context,
  undo,
}) => {
  const school = await createStudentSchool(undo);
  const { studentId, studentName } = await school.addStudent();
  await signInWithEmail(context, school.coordinatorEmail);

  const mark = await openStudentMark(page, school.visibleId, studentName);
  await db
    .update(hubCoordinator)
    .set({ assignedHubId: school.otherHubId })
    .where(eq(hubCoordinator.id, school.coordinatorId));
  await mark.getByRole("radio", { name: "Attended" }).click();
  await mark.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Student not found").first()).toBeVisible();

  // The coordinator no longer sees the school, so only the database shows nothing was written.
  expect(await storedAttendances(studentId, school.latestSessionId)).toEqual([]);
});

test("a student moved to another school is not marked at the old school's session", async ({
  page,
  context,
  undo,
}) => {
  const school = await createStudentSchool(undo);
  const { studentId, studentName } = await school.addStudent();
  await signInWithEmail(context, school.coordinatorEmail);

  const mark = await openStudentMark(page, school.visibleId, studentName);
  await db
    .update(student)
    .set({ schoolId: school.secondSchoolId })
    .where(eq(student.id, studentId));
  await mark.getByRole("radio", { name: "Attended" }).click();
  await mark.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText(`Student ${studentId} not found`).first()).toBeVisible();

  // The old school's pages no longer list the student, so only the database shows the refusal.
  expect(await storedAttendances(studentId, school.latestSessionId)).toEqual([]);
});

test("a supervisor marks a student in a group of a fellow they supervise", async ({
  page,
  context,
  undo,
}) => {
  const school = await createStudentSchool(undo);
  const { studentName } = await school.addStudent();
  await signInWithEmail(context, school.supervisorEmail);

  async function openSupervisorAttendance() {
    await page.goto(getUrl(`/sc/schools/${school.visibleId}/sessions`));
    await chooseRowAction(
      page,
      await rowWithCell(page, page.getByRole("main"), "S2"),
      "View student attendance",
    );
    const dialog = page.getByRole("dialog", { name: "Mark student attendance" }).first();
    await dialog.getByRole("combobox").filter({ hasText: "Select a fellow" }).click();
    await page
      .getByRole("option", { name: `${school.fellowName} (${school.groupName})`, exact: true })
      .click();
    return dialog;
  }

  const dialog = await openSupervisorAttendance();
  await chooseRowAction(
    page,
    dialog.getByRole("row").filter({ hasText: studentName }),
    "Mark attendance",
  );
  const mark = page.getByRole("dialog").filter({ hasText: "Select attendance" });
  await mark.getByRole("radio", { name: "Attended" }).click();
  await mark.getByRole("button", { name: "Submit" }).click();
  await expect(mark).toBeHidden();

  const reopened = await openSupervisorAttendance();
  await expect(reopened.getByRole("row").filter({ hasText: studentName })).toContainText(
    "Attended",
  );
});

test("a fellow marks only their group's students, and a bulk mark with a student who left the group writes nothing", async ({
  page,
  context,
  undo,
}) => {
  const school = await createStudentSchool(undo);
  const first = await school.addStudent();
  const second = await school.addStudent();
  const otherGroupStudent = await school.addStudent(school.otherGroupId);
  await signInWithEmail(context, school.fellowEmail);

  const dialog = await openFellowSessionAttendance(page, school.visibleId);
  const firstRow = dialog.getByRole("row").filter({ hasText: first.studentName });
  const secondRow = dialog.getByRole("row").filter({ hasText: second.studentName });
  await expect(firstRow).toBeVisible();
  await expect(secondRow).toBeVisible();
  await expect(
    dialog.getByRole("row").filter({ hasText: otherGroupStudent.studentName }),
  ).toHaveCount(0);

  await firstRow.getByRole("checkbox", { name: "Select row" }).check();
  await secondRow.getByRole("checkbox", { name: "Select row" }).check();
  await db
    .update(student)
    .set({ assignedGroupId: school.otherGroupId })
    .where(eq(student.id, second.studentId));
  await dialog.getByRole("button", { name: "Mark student attendance" }).click();
  const bulkMark = page.getByRole("dialog").filter({ hasText: "Select attendance" });
  await bulkMark.getByRole("radio", { name: "Attended" }).click();
  await bulkMark.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Student not found").first()).toBeVisible();

  await page.reload();
  const reopened = await openFellowSessionAttendance(page, school.visibleId);
  await expect(reopened.getByRole("row").filter({ hasText: first.studentName })).toContainText(
    "Not marked",
  );
  // The moved student left the fellow's list, so only the database shows they were not marked.
  expect(await storedAttendances(second.studentId, school.latestSessionId)).toEqual([]);
});

test("marking students in bulk starts unmarked, not from the student marked last", async ({
  page,
  context,
  undo,
}) => {
  const school = await createStudentSchool(undo);
  const markedAlone = await school.addStudent();
  const markedInBulk = await school.addStudent();
  await signInWithEmail(context, school.fellowEmail);

  const dialog = await openFellowSessionAttendance(page, school.visibleId);
  const mark = page.getByRole("dialog").filter({ hasText: "Select attendance" });
  const markedAloneRow = dialog.getByRole("row").filter({ hasText: markedAlone.studentName });
  await chooseRowAction(page, markedAloneRow, "Mark attendance");
  await mark.getByRole("radio", { name: "Missed" }).click();
  await mark.getByRole("combobox", { name: "Select reason for above" }).click();
  await page.getByRole("option", { name: "Sickness" }).click();
  await mark.getByRole("button", { name: "Submit" }).click();
  await expect(mark).toBeHidden();

  await chooseRowAction(page, markedAloneRow, "Mark attendance");
  await expect(mark.getByRole("radio", { name: "Missed" })).toBeChecked();
  await mark.getByRole("button", { name: "Cancel" }).click();
  // Radix keeps a closing dialog, and its form, mounted until the exit animation ends.
  await expect(mark).toHaveCount(0);

  await dialog
    .getByRole("row")
    .filter({ hasText: markedInBulk.studentName })
    .getByRole("checkbox", { name: "Select row" })
    .check();
  await dialog.getByRole("button", { name: "Mark student attendance" }).click();
  await expect(mark).toContainText("1 students");
  await expect(mark.getByRole("radio", { name: "Unmarked" })).toBeChecked();
  await expect(mark.getByRole("combobox", { name: "Select reason for above" })).toBeHidden();
});
