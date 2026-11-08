import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  attendanceDocuments,
  interventionGroup,
  interventionSession,
  school,
  student,
  studentAttendance,
} from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { deleteObject } from "#/lib/s3/s3.service";
import { sessionDisplayName } from "#/lib/utils";
import { expect, test, type Undo } from "#/tests/fixtures";
import { raceOnRow, required, signableMember, signInWithEmail } from "#/tests/helpers";
import { chooseRowAction, getUrl, rowWithCell } from "#/tests/pages/helpers";

test.skip(!process.env.AWS_ENDPOINT_URL_S3, "needs the local S3 server (scripts/local-s3.sh)");

type Fellow = {
  email: string;
  fellowId: string;
  hubId: string;
  projectId: string;
  sessionNameId: string;
  sessionName: string;
};

async function pickFellow() {
  const {
    rows: [row],
  } = await db.execute<Fellow>(sql`
    select u.email, f.id as "fellowId", f.hub_id as "hubId", h.project_id as "projectId",
      n.id as "sessionNameId", n.session_name as "sessionName"
    from fellows f
    join implementer_members m on m.identifier = f.id and m.role = 'FELLOW'
    join users u on u.id = m.user_id
    join hubs h on h.id = f.hub_id
    join lateral (select n.id, n.session_name from session_names n
      where n.hub_id = f.hub_id and n.session_type = 'INTERVENTION'
      order by n.session_name limit 1) n on true
    where ${signableMember()} and coalesce(f.dropped_out, false) = false
      and h.project_id is not null
    order by u.email
    limit 1`);
  required(row, "a fellow whose hub has an intervention session name");
  return row;
}

/** A held session at a new school, led by the fellow, with two students marked attended. */
async function createMarkedSession(fellow: Fellow, undo: Undo) {
  const schoolId = objectId("sch");
  const visibleId = objectId("sch");
  const groupId = objectId("group");
  const sessionId = objectId("isess");
  const studentIds = [objectId("stu"), objectId("stu")];
  undo(async () => {
    const documents = await db
      .delete(attendanceDocuments)
      .where(eq(attendanceDocuments.groupId, groupId))
      .returning({ link: attendanceDocuments.link });
    await Promise.all(
      documents.map(({ link }) => deleteObject({ Key: link }, "student-attendance")),
    );
    await db.delete(studentAttendance).where(eq(studentAttendance.sessionId, sessionId));
    await db.delete(student).where(eq(student.schoolId, schoolId));
    await db.delete(interventionSession).where(eq(interventionSession.id, sessionId));
    await db.delete(interventionGroup).where(eq(interventionGroup.id, groupId));
    await db.delete(school).where(eq(school.id, schoolId));
  });
  await db.insert(school).values({
    id: schoolId,
    visibleId,
    schoolName: `E2E attendance upload school ${schoolId}`,
    hubId: fellow.hubId,
  });
  await db.insert(interventionGroup).values({
    id: groupId,
    groupName: `E2E attendance upload group ${groupId}`,
    schoolId,
    leaderId: fellow.fellowId,
    projectId: fellow.projectId,
  });
  const sessionDate = new Date(Date.now() - 24 * 3600 * 1000);
  await db.insert(interventionSession).values({
    id: sessionId,
    sessionId: fellow.sessionNameId,
    sessionDate,
    yearOfImplementation: sessionDate.getFullYear(),
    schoolId,
    hubId: fellow.hubId,
    projectId: fellow.projectId,
    occurred: true,
  });
  await db.insert(student).values(
    studentIds.map((id, index) => ({
      id,
      visibleId: id,
      studentName: `E2E attendance upload student ${index + 1}`,
      schoolId,
      assignedGroupId: groupId,
      admissionNumber: `930${index}`,
      gender: "Female",
      form: 2,
      stream: "B",
    })),
  );
  await db.insert(studentAttendance).values(
    studentIds.map((studentId) => ({
      studentId,
      sessionId,
      groupId,
      fellowId: fellow.fellowId,
      attended: true,
    })),
  );
  return { visibleId, groupId };
}

// A 1x1 PNG: the upload turns each photo into a page of the attendance PDF.
const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const photo = (name: string) => ({ name, mimeType: "image/png", buffer: pixel });

test("a photo added while an attendance upload runs stays to be uploaded next", async ({
  page,
  context,
  undo,
}) => {
  const fellow = await pickFellow();
  const { visibleId, groupId } = await createMarkedSession(fellow, undo);
  await signInWithEmail(context, fellow.email);

  await page.goto(getUrl(`/fel/schools/${visibleId}/sessions`));
  const sessionLabel = sessionDisplayName(fellow.sessionName) ?? fellow.sessionName;
  await chooseRowAction(
    page,
    await rowWithCell(page, page.getByRole("main"), sessionLabel),
    "Upload attendance",
  );
  const dialog = page.getByRole("dialog", { name: "Attendance Document" });
  const photos = dialog.getByLabel("Attendance photos");
  await photos.setInputFiles(photo("first-page.png"));

  // Saving the document checks its group, so locking the group holds the upload in flight.
  await raceOnRow("intervention_groups", groupId, async (waitForWaiting) => {
    await dialog.getByRole("button", { name: "Upload", exact: true }).click();
    await waitForWaiting(1);
    await photos.setInputFiles(photo("second-page.png"));
    await expect(dialog.getByRole("button", { name: "Remove second-page.png" })).toBeVisible();
  });
  await expect(page.getByText("File uploaded successfully").first()).toBeVisible();

  await expect(dialog.getByRole("button", { name: "Remove first-page.png" })).toBeHidden();
  await expect(dialog.getByRole("button", { name: "Remove second-page.png" })).toBeVisible();
});
