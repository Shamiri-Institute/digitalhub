import { addDays, subSeconds } from "date-fns";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionGroup, school, student, supervisor } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test } from "#/tests/fixtures";
import { required, signInAs } from "#/tests/helpers";
import { chooseRowAction, dataRows, getUrl } from "#/tests/pages/helpers";

test("saving a row on page 2 keeps the table on page 2", async ({ page, context, undo }) => {
  const supervisorUser = await signInAs(context, "SUPERVISOR");
  required(supervisorUser.identifier, "the seeded supervisor has no profile");
  // The last school by visible id: specs that count or edit a school's students take the first.
  const [fixture] = await db
    .select({ schoolId: school.id, visibleId: school.visibleId, groupId: interventionGroup.id })
    .from(supervisor)
    .innerJoin(school, and(eq(school.hubId, supervisor.hubId), isNull(school.archivedAt)))
    .innerJoin(
      interventionGroup,
      and(eq(interventionGroup.schoolId, school.id), isNull(interventionGroup.archivedAt)),
    )
    .where(eq(supervisor.id, supervisorUser.identifier))
    .orderBy(desc(school.visibleId), asc(interventionGroup.id))
    .limit(1);
  required(fixture, "no school with a group in the supervisor's hub");

  // The students page lists the most recently updated first. Eleven students dated ahead of every
  // other one fill page 1 and open page 2, so the spec saves its own row rather than a seeded one.
  const label = `e2e-paging-${Date.now()}`;
  const tomorrow = addDays(new Date(), 1);
  const ownStudentAt = (position: number) => ({
    id: objectId("stu"),
    visibleId: `${label}-${position}`,
    studentName: `${label} student ${position}`,
    schoolId: fixture.schoolId,
    assignedGroupId: fixture.groupId,
    admissionNumber: String(9100 + position),
    gender: "Female",
    yearOfBirth: new Date().getFullYear() - 14,
    form: 2,
    stream: "B",
    updatedAt: subSeconds(tomorrow, position),
  });
  const firstStudentOnPageTwo = ownStudentAt(10);
  const ownStudents = [
    ...Array.from({ length: 10 }, (_, position) => ownStudentAt(position)),
    firstStudentOnPageTwo,
  ];
  undo(() =>
    db.delete(student).where(
      inArray(
        student.id,
        ownStudents.map(({ id }) => id),
      ),
    ),
  );
  await db.insert(student).values(ownStudents);

  await page.goto(getUrl(`/sc/schools/${fixture.visibleId}/students`));
  const main = page.getByRole("main");
  const pageStatus = main.getByText(/^\d+ of [\d,]+$/);
  const pageNumber = main.getByLabel("Page number");
  // The table renders on the server first, and a page typed before React hydrates it is lost.
  await expect(async () => {
    await pageNumber.fill("2");
    await expect(pageStatus).toHaveText(/^2 of /, { timeout: 1000 });
  }).toPass();

  await chooseRowAction(page, dataRows(page).first(), "Edit information");
  const dialog = page.getByRole("dialog", { name: "Edit student information" });
  const nameInput = dialog.getByLabel("Student name");
  await expect(nameInput).toHaveValue(firstStudentOnPageTwo.studentName);
  const savedName = `${firstStudentOnPageTwo.studentName} saved`;
  await nameInput.fill(savedName);
  await dialog.getByRole("button", { name: "Update & save" }).click();
  await expect(dialog).toBeHidden();

  // No reload: a reload reads page 2 back from the URL, so only staying on it without one shows
  // the save's refresh kept the table's page. The saved name on the current page shows the
  // refresh has reached the table.
  await expect(dataRows(page).filter({ hasText: savedName })).toBeVisible();
  await expect(pageStatus).toHaveText(/^2 of /);
  await expect(pageNumber).toHaveValue("2");

  // The save itself, read back after a reload, which reopens page 2 from the URL.
  await page.reload();
  await expect(pageStatus).toHaveText(/^2 of /);
  await expect(dataRows(page).filter({ hasText: savedName })).toBeVisible();

  await main.getByRole("button", { name: "1", exact: true }).click();
  await expect(pageStatus).toHaveText(/^1 of /);
  await expect(pageNumber).toHaveValue("1");
});
