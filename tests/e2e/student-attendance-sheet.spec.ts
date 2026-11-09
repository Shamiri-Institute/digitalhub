import type { Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";

import { db } from "#/db/client";
import { attendanceDocuments, hubCoordinator, studentAttendance } from "#/db/schema";
import { createStudentSchool } from "#/tests/delivery-student-helpers";
import { expect, test } from "#/tests/fixtures";
import { required, signInWithEmail } from "#/tests/helpers";
import { chooseRowAction, getUrl, rowWithCell } from "#/tests/pages/helpers";

test.skip(!process.env.AWS_ENDPOINT_URL_S3, "needs the local S3 server (scripts/local-s3.sh)");

// A 1x1 PNG: the upload turns each photo into a page of the attendance PDF.
const photo = {
  name: "attendance-page.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
};

type School = Awaited<ReturnType<typeof createStudentSchool>>;

async function markStudents(
  school: School,
  sessionId: string,
  marks: { studentId: string; attended: boolean | null }[],
) {
  await db.insert(studentAttendance).values(
    marks.map(({ studentId, attended }) => ({
      studentId,
      sessionId,
      groupId: school.groupId,
      fellowId: school.fellowId,
      attended,
    })),
  );
}

async function setAttended(studentId: string, sessionId: string, attended: boolean | null) {
  await db
    .update(studentAttendance)
    .set({ attended })
    .where(
      and(eq(studentAttendance.studentId, studentId), eq(studentAttendance.sessionId, sessionId)),
    );
}

async function chooseUpload(page: Page, school: School, sessionLabel: string) {
  await page.goto(getUrl(`/fel/schools/${school.visibleId}/sessions`));
  await chooseRowAction(
    page,
    await rowWithCell(page, page.getByRole("main"), sessionLabel),
    "Upload attendance",
  );
  return page.getByRole("dialog", { name: "Attendance Document" });
}

/** An uploaded sheet for the fellow's group at a session, without the photo-to-PDF round trip. */
async function saveSheet(school: School, sessionId: string, groupId = school.groupId) {
  const fellowUser = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, school.fellowEmail),
    columns: { id: true },
  });
  required(fellowUser, "the fellow's user");
  await db.insert(attendanceDocuments).values({
    groupId,
    sessionId,
    uploadedBy: fellowUser.id,
    link: `e2e/${sessionId}/${groupId}.pdf`,
    fileName: `sheet-${groupId}.pdf`,
  });
}

test("a fellow uploads an attendance sheet only once two students are marked", async ({
  page,
  context,
  undo,
}) => {
  const school = await createStudentSchool(undo);
  const marked = await school.addStudent();
  const unmarked = await school.addStudent();
  await markStudents(school, school.latestSessionId, [
    { studentId: marked.studentId, attended: true },
    { studentId: unmarked.studentId, attended: null },
  ]);
  await signInWithEmail(context, school.fellowEmail);

  await chooseUpload(page, school, "S2");
  await expect(
    page.getByText("Mark attendance for at least 2 students before uploading").first(),
  ).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Attendance Document" })).toBeHidden();

  await setAttended(unmarked.studentId, school.latestSessionId, false);
  const dialog = await chooseUpload(page, school, "S2");
  await dialog.getByLabel("Attendance photos").setInputFiles(photo);
  // The second mark is cleared after the dialog opened, so only the server can refuse.
  await setAttended(unmarked.studentId, school.latestSessionId, null);
  await dialog.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(
    page.getByText("At least 2 students must have attendance marked before uploading").first(),
  ).toBeVisible();

  await setAttended(unmarked.studentId, school.latestSessionId, false);
  await dialog.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(page.getByText("File uploaded successfully").first()).toBeVisible();

  await page.reload();
  const reopened = await chooseUpload(page, school, "S2");
  await expect(reopened.getByText("Click to view")).toBeVisible();
});

test("a sheet belongs to one group and one session, and coordinators and supervisors see it", async ({
  page,
  context,
  browser,
  undo,
}) => {
  const school = await createStudentSchool(undo);
  const students = [await school.addStudent(), await school.addStudent()];
  for (const sessionId of [school.olderSessionId, school.latestSessionId]) {
    await markStudents(
      school,
      sessionId,
      students.map(({ studentId }) => ({ studentId, attended: true })),
    );
  }
  await saveSheet(school, school.latestSessionId);

  await signInWithEmail(context, school.fellowEmail);
  await expect((await chooseUpload(page, school, "S2")).getByText("Click to view")).toBeVisible();
  await expect(
    (await chooseUpload(page, school, "S1")).getByText("Upload is not available"),
  ).toBeVisible();

  for (const { email, path } of [
    { email: school.coordinatorEmail, path: "hc" },
    { email: school.supervisorEmail, path: "sc" },
  ]) {
    await test.step(path, async () => {
      const viewerContext = await browser.newContext();
      undo(() => viewerContext.close());
      await signInWithEmail(viewerContext, email);
      const viewer = await viewerContext.newPage();
      await viewer.goto(getUrl(`/${path}/schools/${school.visibleId}/sessions`));
      await chooseRowAction(
        viewer,
        await rowWithCell(viewer, viewer.getByRole("main"), "S2"),
        "View student attendance",
      );
      const dialog = viewer.getByRole("dialog").filter({ hasText: "Select group leader" });
      const leaderSelect = dialog.getByRole("combobox").first();
      await leaderSelect.click();
      await viewer
        .getByRole("option", { name: `${school.fellowName} (${school.groupName})`, exact: true })
        .click();
      await expect(dialog.getByText("Click to view")).toBeVisible();
      await leaderSelect.click();
      await viewer
        .getByRole("option", {
          name: `${school.otherFellowName} (${school.otherGroupName})`,
          exact: true,
        })
        .click();
      await expect(
        dialog.getByText("The fellow did not upload an attendance document."),
      ).toBeVisible();
    });
  }
});

test("a coordinator moved to another hub does not get the sheet of their old hub's group", async ({
  page,
  context,
  undo,
}) => {
  const school = await createStudentSchool(undo);
  await saveSheet(school, school.latestSessionId);
  await signInWithEmail(context, school.coordinatorEmail);

  await page.goto(getUrl(`/hc/schools/${school.visibleId}/sessions`));
  await chooseRowAction(
    page,
    await rowWithCell(page, page.getByRole("main"), "S2"),
    "View student attendance",
  );
  const dialog = page.getByRole("dialog").filter({ hasText: "Select group leader" });
  await dialog.getByRole("combobox").first().click();
  await db
    .update(hubCoordinator)
    .set({ assignedHubId: school.otherHubId })
    .where(eq(hubCoordinator.id, school.coordinatorId));
  await page
    .getByRole("option", { name: `${school.fellowName} (${school.groupName})`, exact: true })
    .click();
  await expect(dialog.getByText("Forbidden")).toBeVisible();
  await expect(dialog.getByText("Click to view")).toHaveCount(0);
});
