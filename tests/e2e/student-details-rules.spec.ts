import type { Page } from "@playwright/test";
import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { hubCoordinator, interventionGroup } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { createStudentSchool } from "#/tests/delivery-student-helpers";
import { expect, test } from "#/tests/fixtures";
import { signInWithEmail } from "#/tests/helpers";
import { cellUnder, chooseRowAction, getUrl, rowWithCell, searchRows } from "#/tests/pages/helpers";

type School = Awaited<ReturnType<typeof createStudentSchool>>;

async function openStudentAction(page: Page, path: string, studentName: string, action: string) {
  await page.goto(getUrl(path));
  await chooseRowAction(page, await rowWithCell(page, page.getByRole("main"), studentName), action);
}

async function openAddStudent(page: Page, school: School) {
  await page.goto(getUrl(`/hc/schools/${school.visibleId}/groups`));
  await chooseRowAction(
    page,
    await rowWithCell(page, page.getByRole("main"), school.groupName),
    "View students in group",
  );
  await page
    .getByRole("dialog", { name: "Students in group" })
    .getByRole("button", { name: "Add Student" })
    .click();
  const form = page.getByRole("dialog", { name: "Add student to group" });
  return form;
}

async function fillNewStudent(page: Page, form: ReturnType<Page["getByRole"]>, name: string) {
  await form.getByLabel("Student name").fill(name);
  await form.getByRole("combobox", { name: /Gender/ }).click();
  await page.getByRole("option", { name: "Female" }).click();
  await form.getByLabel("Admission number").fill(String(Date.now()).slice(-8));
  await form.getByLabel("Grade/Form").fill("2");
  await form.getByLabel("Stream").fill("East");
}

test("a new student must be between 9 and 35 years old", async ({ page, context, undo }) => {
  const school = await createStudentSchool(undo);
  await signInWithEmail(context, school.coordinatorEmail);
  const studentName = `${school.schoolName} new student`;
  const thisYear = new Date().getFullYear();

  const form = await openAddStudent(page, school);
  await fillNewStudent(page, form, studentName);
  for (const yearOfBirth of [thisYear - 8, thisYear - 36]) {
    await form.getByLabel("Year of birth").fill(String(yearOfBirth));
    await form.getByRole("button", { name: "Submit" }).click();
    await expect(form.getByText("Student must be between 9 and 35 years old")).toBeVisible();
  }
  await form.getByLabel("Year of birth").fill(String(thisYear - 9));
  await form.getByRole("button", { name: "Submit" }).click();
  await expect(form).toBeHidden();

  await page.goto(getUrl(`/hc/schools/${school.visibleId}/students`));
  await expect(await rowWithCell(page, page.getByRole("main"), studentName)).toBeVisible();
});

test("a student is added only to a group at the chosen school", async ({ page, context, undo }) => {
  const school = await createStudentSchool(undo);
  await signInWithEmail(context, school.coordinatorEmail);
  const studentName = `${school.schoolName} misplaced student`;

  const form = await openAddStudent(page, school);
  await fillNewStudent(page, form, studentName);
  await form.getByLabel("Year of birth").fill(String(new Date().getFullYear() - 14));
  await db
    .update(interventionGroup)
    .set({ schoolId: school.secondSchoolId })
    .where(eq(interventionGroup.id, school.groupId));
  await form.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText(`Group ${school.groupId} not found`).first()).toBeVisible();

  await page.goto(getUrl(`/hc/schools/${school.secondVisibleId}/students`));
  await expect(await searchRows(page, studentName)).toHaveCount(0);
});

test("only a hub coordinator edits a student's admission number and questionnaire type", async ({
  page,
  context,
  browser,
  undo,
}) => {
  const school = await createStudentSchool(undo);
  const { studentName } = await school.addStudent();
  const edit = page.getByRole("dialog", { name: "Edit student information" });
  const newAdmissionNumber = String(Date.now()).slice(-7);

  await signInWithEmail(context, school.coordinatorEmail);
  const coordinatorPath = `/hc/schools/${school.visibleId}/students`;
  await openStudentAction(page, coordinatorPath, studentName, "Edit information");
  await edit.getByLabel("Admission number").fill(newAdmissionNumber);
  await edit.getByRole("combobox", { name: "Type of questionnaire" }).click();
  await page.getByRole("option", { name: "QA", exact: true }).click();
  await edit.getByRole("button", { name: "Update & save" }).click();
  await expect(edit).toBeHidden();
  await page.reload();
  await openStudentAction(page, coordinatorPath, studentName, "Edit information");
  await expect(edit.getByLabel("Admission number")).toHaveValue(newAdmissionNumber);
  await expect(edit.getByRole("combobox", { name: "Type of questionnaire" })).toHaveText("QA");

  for (const { email, path } of [
    { email: school.supervisorEmail, path: `/sc/schools/${school.visibleId}/students` },
    { email: school.fellowEmail, path: `/fel/schools/${school.visibleId}/students` },
  ]) {
    await test.step(path, async () => {
      const editorContext = await browser.newContext();
      undo(() => editorContext.close());
      await signInWithEmail(editorContext, email);
      const editor = await editorContext.newPage();
      await openStudentAction(editor, path, studentName, "Edit information");
      const editorDialog = editor.getByRole("dialog", { name: "Edit student information" });
      await expect(editorDialog.getByLabel("Admission number")).toHaveValue(newAdmissionNumber);
      await expect(editorDialog.getByLabel("Admission number")).toBeDisabled();
      if (path.startsWith("/fel")) {
        await expect(
          editorDialog.getByRole("combobox", { name: "Type of questionnaire" }),
        ).toBeDisabled();
      }
    });
  }
});

test("a student drops out only with a reason", async ({ page, context, undo }) => {
  const school = await createStudentSchool(undo);
  const { studentId, studentName } = await school.addStudent();
  await signInWithEmail(context, school.coordinatorEmail);
  const path = `/hc/schools/${school.visibleId}/students`;

  await openStudentAction(page, path, studentName, "Drop-out student");
  const dropout = page.getByRole("dialog", { name: "Drop out student" });
  await dropout.getByRole("button", { name: "Submit" }).click();
  await expect(dropout.getByText("Please select reason for drop out.")).toBeVisible();
  await dropout.getByRole("combobox", { name: /Select reason/ }).click();
  await page.getByRole("option", { name: "Other commitments" }).click();
  await dropout.getByRole("button", { name: "Submit" }).click();
  await page
    .getByRole("dialog", { name: "Confirm drop out" })
    .getByRole("button", { name: "Confirm" })
    .click();
  await expect(page.getByText(/successfully dropped out/).first()).toBeVisible();

  await page.reload();
  const row = await rowWithCell(page, page.getByRole("main"), studentName);
  await expect(await cellUnder(page, row, "Status")).toHaveText("Inactive");
  // No page shows the dropout reason.
  const stored = await db.query.student.findFirst({
    where: (s, { eq }) => eq(s.id, studentId),
    columns: { dropOutReason: true },
  });
  expect(stored?.dropOutReason).toBe("Other commitments");
});

test("a hub coordinator moves a student to another school of the hub, into a group there", async ({
  page,
  context,
  undo,
}) => {
  const school = await createStudentSchool(undo);
  const { studentName } = await school.addStudent();
  const destinationGroupName = `${school.secondSchoolName} group`;
  await db.insert(interventionGroup).values({
    id: objectId("group"),
    groupName: destinationGroupName,
    schoolId: school.secondSchoolId,
    leaderId: school.fellowId,
    projectId: school.projectId,
  });
  await signInWithEmail(context, school.coordinatorEmail);

  await openStudentAction(
    page,
    `/hc/schools/${school.visibleId}/students`,
    studentName,
    "Move to another school",
  );
  const move = page.getByRole("dialog", { name: "Move student to another school" });
  await move.getByRole("combobox", { name: /Destination school/ }).click();
  await page.getByRole("option", { name: school.secondSchoolName, exact: true }).click();
  await move.getByRole("combobox", { name: /Group \/ Fellow/ }).click();
  await page
    .getByRole("option", { name: `${destinationGroupName} · ${school.fellowName}`, exact: true })
    .click();
  await move.getByRole("button", { name: "Move student" }).click();
  await expect(page.getByText(/Successfully moved/).first()).toBeVisible();

  await page.goto(getUrl(`/hc/schools/${school.secondVisibleId}/students`));
  await expect(await rowWithCell(page, page.getByRole("main"), studentName)).toBeVisible();
  await page.goto(getUrl(`/hc/schools/${school.visibleId}/students`));
  await expect(await searchRows(page, studentName)).toHaveCount(0);
});

test("a hub coordinator moved to another hub cannot archive their old hub's student", async ({
  page,
  context,
  undo,
}) => {
  const school = await createStudentSchool(undo);
  const { studentId, studentName } = await school.addStudent();
  await signInWithEmail(context, school.coordinatorEmail);

  await openStudentAction(
    page,
    `/hc/schools/${school.visibleId}/students`,
    studentName,
    "Archive student",
  );
  await db
    .update(hubCoordinator)
    .set({ assignedHubId: school.otherHubId })
    .where(eq(hubCoordinator.id, school.coordinatorId));
  await page
    .getByRole("dialog", { name: "Archive student" })
    .getByRole("button", { name: "Archive student" })
    .click();
  await expect(
    page.getByText("Something went wrong while trying to archive student.").first(),
  ).toBeVisible();

  // The coordinator no longer sees the school, so only the database shows the student is active.
  const stored = await db.query.student.findFirst({
    where: (s, { eq }) => eq(s.id, studentId),
    columns: { archivedAt: true },
  });
  expect(stored?.archivedAt).toBeNull();
});
